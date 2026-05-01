"""Recommendation + reason schemas."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import Field

from app.models.enums import FitStatus
from app.schemas.common import APIModel
from app.schemas.mower import MowerRead

ReasonType = Literal[
    "area_too_large",
    "slope_too_steep",
    "gate_too_narrow",
    "area_near_limit",
    "slope_near_limit",
    "awd_advantage",
    "ideal_match",
    "rtk_required_clear_sky",
    "wire_install_required",
    "narrow_passage_match",
]


class Reason(APIModel):
    type: ReasonType
    severity: FitStatus
    message: str = Field(max_length=240)


class RecommendationRead(APIModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    mower_id: uuid.UUID
    fit_score: int = Field(ge=0, le=100)
    fit_status: FitStatus
    reasons: list[Reason]
    rank: int
    created_at: datetime


class RecommendationWithMower(RecommendationRead):
    mower: MowerRead
