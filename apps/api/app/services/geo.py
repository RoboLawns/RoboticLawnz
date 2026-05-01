"""GeoJSON ↔ PostGIS helpers + simple area math."""

from __future__ import annotations

import math

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.common import PolygonGeoJSON

EARTH_RADIUS_M = 6_371_008.8  # WGS84 mean radius
SQM_TO_SQFT = 10.7639


def polygon_to_wkt(polygon: PolygonGeoJSON) -> str:
    """Convert a GeoJSON polygon to OGC WKT (lng lat order — matches GeoJSON)."""
    rings = []
    for ring in polygon.coordinates:
        coords = ", ".join(f"{lng:.7f} {lat:.7f}" for lng, lat in ring)
        rings.append(f"({coords})")
    return f"POLYGON({', '.join(rings)})"


def wkt_to_polygon(wkt: str) -> PolygonGeoJSON:
    """Parse a single-ring POLYGON(...) WKT string into a PolygonGeoJSON.

    Robust enough for our writes / reads — falls back to round-tripping via
    PostGIS `ST_AsGeoJSON` on the read path if anything fancier appears.
    """
    cleaned = wkt.strip()
    prefix = "POLYGON"
    if not cleaned.upper().startswith(prefix):
        raise ValueError(f"unsupported WKT geometry: {cleaned[:40]!r}")
    body = cleaned[len(prefix):].strip().lstrip("(").rstrip(")")
    rings_raw = [r.strip().strip("()") for r in body.split("),")]
    rings: list[list[tuple[float, float]]] = []
    for r in rings_raw:
        pts = [tuple(float(n) for n in pair.strip().split()) for pair in r.split(",")]
        rings.append([(lng, lat) for lng, lat in pts])
    return PolygonGeoJSON(coordinates=rings)


async def polygon_area_sqft(db: AsyncSession, polygon: PolygonGeoJSON) -> float:
    """Compute square-foot area of a GeoJSON polygon via PostGIS.

    Uses `ST_Area` on a GEOGRAPHY cast which returns square metres on the WGS84
    spheroid; we convert to sq ft for the U.S. audience.
    """
    wkt = polygon_to_wkt(polygon)
    stmt = select(func.ST_Area(func.ST_GeogFromText(f"SRID=4326;{wkt}")))
    result = await db.execute(stmt)
    sqm = float(result.scalar_one())
    return sqm * SQM_TO_SQFT


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance in metres — used for slope-sample sanity checks."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_M * math.asin(math.sqrt(a))


def angle_to_slope_pct(angle_deg: float) -> float:
    """Convert tilt angle (degrees) to slope percent (rise/run x 100)."""
    return math.tan(math.radians(angle_deg)) * 100.0


__all__ = [
    "polygon_to_wkt",
    "wkt_to_polygon",
    "polygon_area_sqft",
    "haversine_distance_m",
    "angle_to_slope_pct",
    "SQM_TO_SQFT",
]
