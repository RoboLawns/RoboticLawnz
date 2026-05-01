"""Mower catalog."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Float, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import DriveType, NavigationType
from app.models.mixins import UUIDPKMixin

if TYPE_CHECKING:
    from app.models.recommendation import Recommendation


class Mower(UUIDPKMixin, Base):
    __tablename__ = "mowers"
    __table_args__ = (
        Index("ix_mowers_brand_model", "brand", "model"),
        Index("ix_mowers_active_max_area", "is_active", "max_area_sqft"),
    )

    brand: Mapped[str] = mapped_column(String(64), nullable=False)
    model: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)

    price_usd: Mapped[float] = mapped_column(Float, nullable=False)
    max_area_sqft: Mapped[int] = mapped_column(Integer, nullable=False)
    max_slope_pct: Mapped[int] = mapped_column(Integer, nullable=False)
    min_passage_inches: Mapped[float] = mapped_column(Float, nullable=False)

    navigation_type: Mapped[NavigationType] = mapped_column(
        Enum(NavigationType, name="navigation_type", native_enum=False, length=16),
        nullable=False,
    )
    drive_type: Mapped[DriveType] = mapped_column(
        Enum(DriveType, name="drive_type", native_enum=False, length=16),
        nullable=False,
    )
    cutting_width_inches: Mapped[float] = mapped_column(Float, nullable=False)
    cutting_height_min: Mapped[float] = mapped_column(Float, nullable=False)
    cutting_height_max: Mapped[float] = mapped_column(Float, nullable=False)
    battery_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    noise_db: Mapped[int | None] = mapped_column(Integer)

    rain_handling: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    has_gps_theft_protection: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    product_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    affiliate_url: Mapped[str | None] = mapped_column(String(1024))
    image_url: Mapped[str] = mapped_column(String(1024), nullable=False)
    manufacturer_specs_url: Mapped[str] = mapped_column(String(1024), nullable=False)

    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    data_updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    recommendations: Mapped[list["Recommendation"]] = relationship(  # noqa: UP037
        "Recommendation",
        back_populates="mower",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Mower {self.brand} {self.model}>"
