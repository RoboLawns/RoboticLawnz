"""Mower catalog schemas — used by public catalog endpoints + admin CRUD."""

from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import AnyHttpUrl, Field, field_validator, model_validator

from app.models.enums import DriveType, NavigationType
from app.schemas.common import APIModel

_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class MowerBase(APIModel):
    brand: str = Field(min_length=1, max_length=64)
    model: str = Field(min_length=1, max_length=128)
    slug: str = Field(min_length=1, max_length=160)

    price_usd: float = Field(ge=0)
    max_area_sqft: int = Field(gt=0)
    max_slope_pct: int = Field(ge=0, le=200)  # tracked models can exceed 100%
    min_passage_inches: float = Field(gt=0)

    navigation_type: NavigationType
    drive_type: DriveType

    cutting_width_inches: float = Field(gt=0)
    cutting_height_min: float = Field(ge=0)
    cutting_height_max: float = Field(ge=0)
    battery_minutes: int = Field(gt=0)
    noise_db: int | None = Field(default=None, ge=0, le=200)

    rain_handling: bool = False
    has_gps_theft_protection: bool = False

    product_url: AnyHttpUrl
    affiliate_url: AnyHttpUrl | None = None
    image_url: AnyHttpUrl
    manufacturer_specs_url: AnyHttpUrl

    is_active: bool = True

    @field_validator("slug")
    @classmethod
    def _slug_is_kebab(cls, v: str) -> str:
        if not _SLUG_RE.match(v):
            raise ValueError("slug must be kebab-case (lowercase a-z, 0-9, hyphens)")
        return v

    @model_validator(mode="after")
    def _cutting_height_range(self) -> "MowerBase":
        if self.cutting_height_max < self.cutting_height_min:
            raise ValueError("cutting_height_max must be >= cutting_height_min")
        return self


class MowerCreate(MowerBase):
    pass


class MowerUpdate(APIModel):
    """All fields optional — partial update."""

    brand: str | None = None
    model: str | None = None
    slug: str | None = None
    price_usd: float | None = Field(default=None, ge=0)
    max_area_sqft: int | None = Field(default=None, gt=0)
    max_slope_pct: int | None = Field(default=None, ge=0, le=200)
    min_passage_inches: float | None = Field(default=None, gt=0)
    navigation_type: NavigationType | None = None
    drive_type: DriveType | None = None
    cutting_width_inches: float | None = Field(default=None, gt=0)
    cutting_height_min: float | None = Field(default=None, ge=0)
    cutting_height_max: float | None = Field(default=None, ge=0)
    battery_minutes: int | None = Field(default=None, gt=0)
    noise_db: int | None = Field(default=None, ge=0, le=200)
    rain_handling: bool | None = None
    has_gps_theft_protection: bool | None = None
    product_url: AnyHttpUrl | None = None
    affiliate_url: AnyHttpUrl | None = None
    image_url: AnyHttpUrl | None = None
    manufacturer_specs_url: AnyHttpUrl | None = None
    is_active: bool | None = None


class MowerRead(MowerBase):
    id: uuid.UUID
    data_updated_at: datetime
