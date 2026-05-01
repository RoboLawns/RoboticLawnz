"""Unit tests for the SAM 2 segmentation helpers.

The Replicate call itself isn't tested here (it needs network + a real model);
we verify the pixel ↔ lng/lat projection math, which is the part most likely
to drift silently and produce wrong areas.
"""

from __future__ import annotations

import math

import pytest

from app.ml.segmentation import MapView, _pixel_to_lnglat


def _make_view(lat: float = 38.8977, lng: float = -77.0365, zoom: float = 19) -> MapView:
    return MapView(center_lat=lat, center_lng=lng, zoom=zoom, width_px=1024, height_px=768)


def test_center_pixel_round_trips_to_center_lnglat() -> None:
    view = _make_view()
    lng, lat = _pixel_to_lnglat(view.width_px / 2, view.height_px / 2, view)
    assert lng == pytest.approx(view.center_lng, abs=1e-9)
    assert lat == pytest.approx(view.center_lat, abs=1e-9)


def test_offset_pixel_moves_in_correct_direction() -> None:
    view = _make_view()
    # +x → east (greater lng), +y → south (smaller lat)
    east_lng, _ = _pixel_to_lnglat(view.width_px / 2 + 100, view.height_px / 2, view)
    _, south_lat = _pixel_to_lnglat(view.width_px / 2, view.height_px / 2 + 100, view)
    assert east_lng > view.center_lng
    assert south_lat < view.center_lat


def test_pixel_step_at_z19_is_roughly_residential_scale() -> None:
    """At zoom 19 each pixel should be on the order of decimetres, not kilometres."""
    view = _make_view()
    lng_a, lat_a = _pixel_to_lnglat(view.width_px / 2, view.height_px / 2, view)
    lng_b, lat_b = _pixel_to_lnglat(view.width_px / 2 + 1, view.height_px / 2, view)
    # Convert lng delta to metres at this latitude.
    metres_per_deg_lng = 111_320 * math.cos(math.radians(lat_a))
    delta_m = abs(lng_b - lng_a) * metres_per_deg_lng
    # 1 px @ z19 with 512px tiles ≈ 0.15 m at the equator.
    assert 0.05 < delta_m < 1.0
    # Latitude should be within a few cm.
    assert abs(lat_b - lat_a) * 111_320 < 1.0


@pytest.mark.parametrize("zoom", [16, 18, 19, 20])
def test_round_trip_through_center_at_various_zooms(zoom: float) -> None:
    view = _make_view(zoom=zoom)
    lng, lat = _pixel_to_lnglat(view.width_px / 2, view.height_px / 2, view)
    assert lng == pytest.approx(view.center_lng, abs=1e-9)
    assert lat == pytest.approx(view.center_lat, abs=1e-9)
