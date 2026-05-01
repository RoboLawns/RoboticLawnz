"""Geo helper tests — polygon ↔ WKT round-trip + slope-angle math.

PostGIS-backed area math is covered by integration tests; these are unit tests
for the pure-Python helpers.
"""

from __future__ import annotations

import math

import pytest

from app.schemas.common import PolygonGeoJSON
from app.services.geo import angle_to_slope_pct, polygon_to_wkt, wkt_to_polygon


def test_polygon_to_wkt_single_ring() -> None:
    poly = PolygonGeoJSON(
        coordinates=[
            [(-77.04, 38.90), (-77.03, 38.90), (-77.03, 38.91), (-77.04, 38.91), (-77.04, 38.90)],
        ]
    )
    wkt = polygon_to_wkt(poly)
    assert wkt.startswith("POLYGON((")
    assert "-77.0400000 38.9000000" in wkt


def test_polygon_wkt_roundtrip_preserves_coords() -> None:
    original = PolygonGeoJSON(
        coordinates=[
            [(0.0, 0.0), (1.0, 0.0), (1.0, 1.0), (0.0, 1.0), (0.0, 0.0)],
        ]
    )
    wkt = polygon_to_wkt(original)
    parsed = wkt_to_polygon(wkt)
    assert parsed.type == "Polygon"
    assert len(parsed.coordinates) == 1
    assert parsed.coordinates[0] == original.coordinates[0]


def test_wkt_to_polygon_rejects_non_polygon() -> None:
    with pytest.raises(ValueError, match="unsupported"):
        wkt_to_polygon("POINT(0 0)")


@pytest.mark.parametrize(
    "deg, expected_pct",
    [
        (0, 0.0),
        (45, 100.0),  # tan(45°) = 1
        (5, math.tan(math.radians(5)) * 100),
        (30, math.tan(math.radians(30)) * 100),
    ],
)
def test_angle_to_slope_pct(deg: float, expected_pct: float) -> None:
    assert angle_to_slope_pct(deg) == pytest.approx(expected_pct, rel=1e-9)
