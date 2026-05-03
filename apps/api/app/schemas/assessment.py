"""Assessment schemas — captures the homeowner's yard."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, Field

from app.models.enums import AssessmentStatus
from app.schemas.common import APIModel, PolygonGeoJSON


# --- Value objects (also stored on JSONB columns) -------------------------- #


class Obstacle(APIModel):
    type: Literal[
        "tree",
        "flower_bed",
        "pool",
        "sprinkler_head",
        "slope_too_steep",
        "other",
    ]
    lat: float
    lng: float
    notes: str | None = Field(default=None, max_length=500)


class Gate(APIModel):
    width_inches: float = Field(gt=0)
    lat: float
    lng: float
    label: str | None = Field(default=None, max_length=64)


class SlopeSample(APIModel):
    lat: float
    lng: float
    angle_deg: float = Field(ge=-90, le=90)
    accuracy: float | None = None
    recorded_at: datetime


class GrassGuess(APIModel):
    species: str
    confidence: float = Field(ge=0, le=1)


# --- Request bodies -------------------------------------------------------- #


class AssessmentCreate(APIModel):
    """Initial draft. Address optional — the rep flow may start with raw lat/lng."""

    address: str | None = Field(default=None, max_length=512)
    lat: float | None = None
    lng: float | None = None


class AssessmentUpdate(APIModel):
    """Incremental save. Any subset of these fields may be sent at any step."""

    address: str | None = Field(default=None, max_length=512)
    lat: float | None = None
    lng: float | None = None
    lawn_polygon: PolygonGeoJSON | None = None
    lawn_area_sqft: float | None = Field(default=None, ge=0)
    max_slope_pct: float | None = Field(default=None, ge=0, le=200)
    avg_slope_pct: float | None = Field(default=None, ge=0, le=200)
    slope_samples: list[SlopeSample] | None = None
    grass_type_guesses: list[GrassGuess] | None = None
    grass_photo_url: AnyHttpUrl | None = None
    obstacles: list[Obstacle] | None = None
    gates: list[Gate] | None = None
    status: AssessmentStatus | None = None


class GeocodeRequest(APIModel):
    address: str = Field(min_length=3, max_length=512)


class GeocodeResponse(APIModel):
    lat: float
    lng: float
    suggested_zoom: int = Field(default=19, ge=1, le=22)
    formatted_address: str


class LawnSegmentRequest(APIModel):
    map_image_url: AnyHttpUrl
    click_points: list[tuple[float, float]] = Field(min_length=1, max_length=10)
    map_view: dict[str, float]  # {center_lat, center_lng, zoom, bearing, width_px, height_px}


class LawnSegmentResponse(APIModel):
    polygon: PolygonGeoJSON
    area_sqft: float
    fallback_to_manual: bool = False


class SlopeSampleCreate(APIModel):
    lat: float
    lng: float
    angle_deg: float = Field(ge=-90, le=90)
    accuracy: float | None = None


class GrassPhotoResponse(APIModel):
    photo_url: AnyHttpUrl | None = None
    guesses: list[GrassGuess]


# --- Response ------------------------------------------------------------- #


class AssessmentRead(APIModel):
    id: uuid.UUID
    user_id: uuid.UUID | None
    session_id: str
    status: AssessmentStatus

    address: str | None
    lat: float | None
    lng: float | None

    lawn_polygon: PolygonGeoJSON | None
    lawn_area_sqft: float | None
    max_slope_pct: float | None
    avg_slope_pct: float | None

    slope_samples: list[SlopeSample]
    grass_type_guesses: list[GrassGuess]
    grass_photo_url: AnyHttpUrl | None
    obstacles: list[Obstacle]
    gates: list[Gate]

    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
