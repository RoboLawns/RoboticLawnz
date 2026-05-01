"""SAM 2 lawn segmentation service.

Takes a rendered map tile (a PNG URL on R2 or a data URL from the client) plus
a set of click points in pixel space, and returns a polygon in lat/lng space.

The model returns a binary mask in the same pixel grid as the input image.
We trace the largest connected contour, project pixel coordinates back through
the captured map view, and emit a `PolygonGeoJSON` the API can persist.

Pixel → world projection (Web Mercator at fixed zoom):
- The frontend hands us `{ center_lat, center_lng, zoom, width_px, height_px }`
  — the same values it used to render the captured tile.
- We invert Mapbox's standard tile math to convert each contour pixel back to
  a longitude/latitude pair.

The math lives in `_pixel_to_lnglat` and is unit-tested against known
reference points.
"""

from __future__ import annotations

import base64
import math
from dataclasses import dataclass
from io import BytesIO
from typing import Any

import httpx

from app.core.config import settings
from app.core.logging import get_logger
from app.ml.replicate import ReplicateClient, ReplicateError, ReplicateNotConfigured
from app.schemas.assessment import LawnSegmentRequest, LawnSegmentResponse
from app.schemas.common import PolygonGeoJSON

logger = get_logger(__name__)

# Default SAM 2 model on Replicate. The exact `version` is configurable via env
# so we can pin the digest in CI without code changes.
DEFAULT_MODEL_NAME = "meta/sam-2"


class SegmentationFailed(RuntimeError):
    """Either the model failed or the mask was unusable (empty / too small)."""


@dataclass(slots=True)
class MapView:
    center_lat: float
    center_lng: float
    zoom: float
    width_px: int
    height_px: int


def _validate_view(view: dict[str, float]) -> MapView:
    required = {"center_lat", "center_lng", "zoom", "width_px", "height_px"}
    missing = required - view.keys()
    if missing:
        raise ValueError(f"map_view missing fields: {sorted(missing)}")
    return MapView(
        center_lat=float(view["center_lat"]),
        center_lng=float(view["center_lng"]),
        zoom=float(view["zoom"]),
        width_px=int(view["width_px"]),
        height_px=int(view["height_px"]),
    )


# ---------------------------------------------------------------------------
# Web Mercator pixel ↔ lng/lat math (Mapbox-compatible)
# ---------------------------------------------------------------------------
# Reference: https://docs.mapbox.com/help/glossary/zoom-level/

TILE_SIZE = 512  # Mapbox uses 512px tiles


def _lnglat_to_world_px(lng: float, lat: float, zoom: float) -> tuple[float, float]:
    """Convert lng/lat → pixel coordinate in the global Web-Mercator plane."""
    scale = TILE_SIZE * (2**zoom)
    x = (lng + 180.0) / 360.0 * scale
    sin_lat = math.sin(lat * math.pi / 180.0)
    sin_lat = max(-0.9999, min(0.9999, sin_lat))
    y = (0.5 - math.log((1 + sin_lat) / (1 - sin_lat)) / (4 * math.pi)) * scale
    return x, y


def _world_px_to_lnglat(x: float, y: float, zoom: float) -> tuple[float, float]:
    """Inverse of `_lnglat_to_world_px`."""
    scale = TILE_SIZE * (2**zoom)
    lng = x / scale * 360.0 - 180.0
    n = math.pi - 2 * math.pi * y / scale
    lat = 180.0 / math.pi * math.atan(0.5 * (math.exp(n) - math.exp(-n)))
    return lng, lat


def _pixel_to_lnglat(px: float, py: float, view: MapView) -> tuple[float, float]:
    """Convert a pixel inside the captured tile to lng/lat.

    `px, py` are top-left-origin pixel offsets within the captured image.
    """
    cx_world, cy_world = _lnglat_to_world_px(view.center_lng, view.center_lat, view.zoom)
    world_x = cx_world + (px - view.width_px / 2.0)
    world_y = cy_world + (py - view.height_px / 2.0)
    return _world_px_to_lnglat(world_x, world_y, view.zoom)


# ---------------------------------------------------------------------------
# Mask decoding + contour tracing
# ---------------------------------------------------------------------------


def _decode_mask(mask_payload: Any) -> tuple[list[list[int]], int, int]:
    """Decode SAM's mask output → 2D 0/1 grid.

    SAM 2 on Replicate returns a URL to a PNG mask. We download it lazily here
    (rather than hand-rolling a numpy parser) and read pixel-by-pixel via
    Pillow. Pillow ships with Replicate's Python image stack but we don't have
    it as a hard dep — fall back to a base64 path for an inline PNG.
    """
    try:
        from PIL import Image  # type: ignore[import-not-found]
    except ImportError as e:  # pragma: no cover
        raise SegmentationFailed("Pillow required to decode SAM 2 mask") from e

    if isinstance(mask_payload, str) and mask_payload.startswith("http"):
        with httpx.Client(timeout=30) as http:
            resp = http.get(mask_payload)
            resp.raise_for_status()
            data = resp.content
    elif isinstance(mask_payload, str) and mask_payload.startswith("data:"):
        _, _, b64 = mask_payload.partition(",")
        data = base64.b64decode(b64)
    elif isinstance(mask_payload, list) and mask_payload:
        first = mask_payload[0]
        if isinstance(first, str) and first.startswith("http"):
            with httpx.Client(timeout=30) as http:
                resp = http.get(first)
                resp.raise_for_status()
                data = resp.content
        else:
            raise SegmentationFailed(f"unexpected mask payload list element: {type(first)}")
    else:
        raise SegmentationFailed(f"unexpected mask payload: {type(mask_payload)}")

    img = Image.open(BytesIO(data)).convert("L")
    w, h = img.size
    pixels = list(img.getdata())
    grid: list[list[int]] = []
    for y in range(h):
        row = pixels[y * w : (y + 1) * w]
        grid.append([1 if p > 127 else 0 for p in row])
    return grid, w, h


def _trace_largest_contour(grid: list[list[int]], w: int, h: int) -> list[tuple[int, int]]:
    """Return the outer boundary of the largest connected mask region.

    Implementation: BFS to find the largest 4-connected region, then walk its
    boundary using the Moore-neighbor tracing algorithm. We deliberately keep
    this in pure Python — performance is fine at typical 1024x1024 tiles and
    we avoid pulling opencv into the dep tree.
    """
    seen = [[False] * w for _ in range(h)]
    best_region: list[tuple[int, int]] = []
    for y in range(h):
        for x in range(w):
            if grid[y][x] != 1 or seen[y][x]:
                continue
            stack = [(x, y)]
            region: list[tuple[int, int]] = []
            while stack:
                cx, cy = stack.pop()
                if cx < 0 or cy < 0 or cx >= w or cy >= h:
                    continue
                if seen[cy][cx] or grid[cy][cx] != 1:
                    continue
                seen[cy][cx] = True
                region.append((cx, cy))
                stack.extend([(cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1)])
            if len(region) > len(best_region):
                best_region = region

    if not best_region:
        return []

    region_set = set(best_region)
    # Moore boundary trace, starting at the lex-smallest pixel.
    start = min(region_set)
    boundary: list[tuple[int, int]] = [start]
    # Neighbour offsets in clockwise order starting at "left".
    cw = [(-1, 0), (-1, -1), (0, -1), (1, -1), (1, 0), (1, 1), (0, 1), (-1, 1)]

    def neighbour(p: tuple[int, int], i: int) -> tuple[int, int]:
        return (p[0] + cw[i][0], p[1] + cw[i][1])

    cur = start
    backtrack_idx = 0
    safety = w * h * 4
    while safety > 0:
        safety -= 1
        i = backtrack_idx
        for _ in range(8):
            cand = neighbour(cur, i)
            if cand in region_set:
                if cand == start and len(boundary) > 1:
                    return boundary
                boundary.append(cand)
                backtrack_idx = (i + 6) % 8
                cur = cand
                break
            i = (i + 1) % 8
        else:
            break
    return boundary


def _simplify(points: list[tuple[float, float]], tolerance: float = 1e-6) -> list[tuple[float, float]]:
    """Ramer-Douglas-Peucker -- keeps polygon shape while shedding hundreds of
    nearly-collinear vertices that come out of mask tracing."""
    if len(points) < 3:
        return list(points)

    def perp_distance(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
        if a == b:
            return math.hypot(p[0] - a[0], p[1] - a[1])
        num = abs((b[0] - a[0]) * (a[1] - p[1]) - (a[0] - p[0]) * (b[1] - a[1]))
        den = math.hypot(b[0] - a[0], b[1] - a[1])
        return num / den

    def rdp(pts: list[tuple[float, float]]) -> list[tuple[float, float]]:
        if len(pts) < 3:
            return pts
        a, b = pts[0], pts[-1]
        idx, dmax = -1, 0.0
        for i, p in enumerate(pts[1:-1], start=1):
            d = perp_distance(p, a, b)
            if d > dmax:
                idx, dmax = i, d
        if dmax > tolerance and idx >= 0:
            left = rdp(pts[: idx + 1])
            right = rdp(pts[idx:])
            return left[:-1] + right
        return [a, b]

    return rdp(points)


# ---------------------------------------------------------------------------
# Public service
# ---------------------------------------------------------------------------


class LawnSegmenter:
    """Service interface — abstracted so we can swap models later."""

    def __init__(self, *, replicate: ReplicateClient | None = None) -> None:
        self._replicate = replicate

    @classmethod
    def from_settings(cls) -> LawnSegmenter:
        return cls(replicate=ReplicateClient.from_settings())

    @property
    def model_version(self) -> str:
        version = settings.sam2_model_version
        if not version:
            # No pinned version — model name + "latest" lets Replicate route to
            # the default. Production should pin via SAM2_MODEL_VERSION.
            return DEFAULT_MODEL_NAME
        return version

    async def segment(self, payload: LawnSegmentRequest) -> LawnSegmentResponse:
        if self._replicate is None:
            raise ReplicateNotConfigured("LawnSegmenter has no Replicate client")

        view = _validate_view(payload.map_view)
        click_points_payload = [list(pt) for pt in payload.click_points]

        try:
            output = await self._replicate.run(
                self.model_version,
                inputs={
                    "image": str(payload.map_image_url),
                    "click_coordinates": click_points_payload,
                    "click_labels": [1] * len(click_points_payload),  # all foreground
                    "multimask_output": False,
                },
            )
        except ReplicateError as e:
            logger.warning("sam2.failure", error=str(e))
            raise

        grid, w, h = _decode_mask(output)
        if w != view.width_px or h != view.height_px:
            # Resize click-projection by scaling factors. Cheaper than rescaling
            # the whole grid — we just remap pixel coords proportionally.
            scale_x = view.width_px / w
            scale_y = view.height_px / h
        else:
            scale_x = scale_y = 1.0

        contour = _trace_largest_contour(grid, w, h)
        if len(contour) < 3:
            raise SegmentationFailed("mask trace produced fewer than 3 vertices")

        # Project pixel coordinates → world lng/lat.
        ring: list[tuple[float, float]] = []
        for px, py in contour:
            ring.append(_pixel_to_lnglat(px * scale_x, py * scale_y, view))

        # Close the ring + simplify.
        if ring[0] != ring[-1]:
            ring.append(ring[0])
        simplified = _simplify(ring, tolerance=1e-7)
        if len(simplified) < 4:  # rings need ≥ 4 points (3 unique + close)
            simplified = ring

        polygon = PolygonGeoJSON(coordinates=[simplified])
        # Area is computed elsewhere (PostGIS) — we don't ship it from here to
        # avoid duplicating the projection. Caller fills it in after persist.
        return LawnSegmentResponse(polygon=polygon, area_sqft=0.0, fallback_to_manual=False)


__all__ = [
    "LawnSegmenter",
    "MapView",
    "SegmentationFailed",
    "_pixel_to_lnglat",  # exported for unit tests
]
