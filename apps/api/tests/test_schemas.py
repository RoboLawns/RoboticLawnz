"""Schema-level validation tests.

Catch the most-likely-to-break invariants on the data we accept from the
frontend without standing up a DB.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.lead import LeadCreate
from app.schemas.mower import MowerCreate
from app.schemas.assessment import AssessmentUpdate, Gate, Obstacle, SlopeSample
from app.schemas.common import PolygonGeoJSON


# ---------- Lead ---------- #


def test_lead_create_normalises_blank_phone() -> None:
    payload = LeadCreate(
        assessment_id="00000000-0000-0000-0000-000000000000",
        email="user@example.com",
        phone="   ",
    )
    assert payload.phone is None


def test_lead_create_rejects_non_phone_chars() -> None:
    with pytest.raises(ValidationError):
        LeadCreate(
            assessment_id="00000000-0000-0000-0000-000000000000",
            email="user@example.com",
            phone="not a phone",
        )


def test_lead_create_accepts_us_format() -> None:
    payload = LeadCreate(
        assessment_id="00000000-0000-0000-0000-000000000000",
        email="user@example.com",
        phone="(555) 123-4567",
    )
    assert payload.phone == "(555) 123-4567"


def test_lead_email_required() -> None:
    with pytest.raises(ValidationError):
        LeadCreate(assessment_id="00000000-0000-0000-0000-000000000000")  # type: ignore[call-arg]


# ---------- Mower ---------- #


def _valid_mower_payload(**overrides):  # type: ignore[no-untyped-def]
    base = dict(
        brand="Test",
        model="Model X",
        slug="test-model-x",
        price_usd=999.0,
        max_area_sqft=10000,
        max_slope_pct=30,
        min_passage_inches=24.0,
        navigation_type="rtk",
        drive_type="awd",
        cutting_width_inches=8.0,
        cutting_height_min=1.0,
        cutting_height_max=3.0,
        battery_minutes=120,
        rain_handling=True,
        has_gps_theft_protection=True,
        product_url="https://example.com/m",
        image_url="https://example.com/m.jpg",
        manufacturer_specs_url="https://example.com/m/specs",
    )
    base.update(overrides)
    return base


def test_mower_create_happy_path() -> None:
    m = MowerCreate(**_valid_mower_payload())
    assert m.slug == "test-model-x"


def test_mower_slug_must_be_kebab() -> None:
    with pytest.raises(ValidationError, match="kebab-case"):
        MowerCreate(**_valid_mower_payload(slug="Bad Slug!"))


def test_mower_cutting_height_range_enforced() -> None:
    with pytest.raises(ValidationError, match="cutting_height_max"):
        MowerCreate(**_valid_mower_payload(cutting_height_min=3.0, cutting_height_max=1.0))


def test_mower_negative_price_rejected() -> None:
    with pytest.raises(ValidationError):
        MowerCreate(**_valid_mower_payload(price_usd=-1))


# ---------- Assessment ---------- #


def test_assessment_update_partial_is_valid() -> None:
    a = AssessmentUpdate(address="123 Main St")
    assert a.model_dump(exclude_unset=True) == {"address": "123 Main St"}


def test_polygon_geojson_roundtrip() -> None:
    p = PolygonGeoJSON(
        coordinates=[
            [(-77.04, 38.90), (-77.03, 38.90), (-77.03, 38.91), (-77.04, 38.91), (-77.04, 38.90)],
        ]
    )
    assert p.type == "Polygon"
    # Coordinates preserved exactly.
    assert p.coordinates[0][0] == (-77.04, 38.90)


def test_obstacle_type_enum_enforced() -> None:
    with pytest.raises(ValidationError):
        Obstacle(type="not_a_real_type", lat=0, lng=0)  # type: ignore[arg-type]


def test_gate_width_must_be_positive() -> None:
    with pytest.raises(ValidationError):
        Gate(width_inches=0, lat=0, lng=0)


def test_slope_angle_clamped_to_legal_range() -> None:
    with pytest.raises(ValidationError):
        SlopeSample(lat=0, lng=0, angle_deg=120, recorded_at="2026-05-01T00:00:00Z")
