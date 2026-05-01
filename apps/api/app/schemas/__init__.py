"""Pydantic v2 schemas, organised by domain.

Re-exports the common types so callers can `from app.schemas import X` for the
high-frequency ones; deeper types should be imported from their submodule.
"""

from __future__ import annotations

from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentRead,
    AssessmentUpdate,
    GeocodeRequest,
    GeocodeResponse,
    GrassGuess,
    GrassPhotoResponse,
    LawnSegmentRequest,
    LawnSegmentResponse,
    Gate,
    Obstacle,
    SlopeSample,
    SlopeSampleCreate,
)
from app.schemas.common import APIModel, Page, PageMeta, PolygonGeoJSON
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate
from app.schemas.mower import MowerCreate, MowerRead, MowerUpdate
from app.schemas.recommendation import (
    Reason,
    ReasonType,
    RecommendationRead,
    RecommendationWithMower,
)
from app.schemas.user import UserRead

__all__ = [
    "APIModel",
    "AssessmentCreate",
    "AssessmentRead",
    "AssessmentUpdate",
    "Gate",
    "GeocodeRequest",
    "GeocodeResponse",
    "GrassGuess",
    "GrassPhotoResponse",
    "LawnSegmentRequest",
    "LawnSegmentResponse",
    "LeadCreate",
    "LeadRead",
    "LeadUpdate",
    "MowerCreate",
    "MowerRead",
    "MowerUpdate",
    "Obstacle",
    "Page",
    "PageMeta",
    "PolygonGeoJSON",
    "Reason",
    "ReasonType",
    "RecommendationRead",
    "RecommendationWithMower",
    "SlopeSample",
    "SlopeSampleCreate",
    "UserRead",
]
