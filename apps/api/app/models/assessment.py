"""Assessment — the core artefact a homeowner produces."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from geoalchemy2 import Geography
from sqlalchemy import DateTime, Enum, Float, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import AssessmentStatus
from app.models.mixins import TimestampMixin, UUIDPKMixin, empty_jsonb_list

if TYPE_CHECKING:
    from app.models.lead import Lead
    from app.models.recommendation import Recommendation
    from app.models.user import User


class Assessment(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "assessments"
    __table_args__ = (
        Index("ix_assessments_user_created", "user_id", "created_at"),
        Index("ix_assessments_session_id", "session_id"),
        Index(
            "ix_assessments_lawn_polygon",
            "lawn_polygon",
            postgresql_using="gist",
        ),
    )

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    session_id: Mapped[str] = mapped_column(String(64), nullable=False)

    status: Mapped[AssessmentStatus] = mapped_column(
        Enum(AssessmentStatus, name="assessment_status", native_enum=False, length=32),
        nullable=False,
        default=AssessmentStatus.DRAFT,
        server_default=AssessmentStatus.DRAFT.value,
    )

    address: Mapped[str | None] = mapped_column(String(512))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)

    # PostGIS — WGS84, polygon. Multi-zone yards stored as MultiPolygon via
    # repeated rings; for MVP we accept a single polygon and treat additional
    # zones as obstacles-of-grass elsewhere.
    lawn_polygon: Mapped[Any | None] = mapped_column(
        Geography(geometry_type="POLYGON", srid=4326, spatial_index=False),
        nullable=True,
    )
    lawn_area_sqft: Mapped[float | None] = mapped_column(Float)

    max_slope_pct: Mapped[float | None] = mapped_column(Float)
    avg_slope_pct: Mapped[float | None] = mapped_column(Float)

    # JSONB blobs — typed by Pydantic schemas at the API edge.
    slope_samples: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=empty_jsonb_list,
        server_default="[]",
    )
    grass_type_guesses: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=empty_jsonb_list,
        server_default="[]",
    )
    grass_photo_url: Mapped[str | None] = mapped_column(String(1024))
    obstacles: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=empty_jsonb_list,
        server_default="[]",
    )
    gates: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=empty_jsonb_list,
        server_default="[]",
    )

    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    user: Mapped["User | None"] = relationship("User", back_populates="assessments")
    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation",
        back_populates="assessment",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="Recommendation.rank",
    )
    lead: Mapped["Lead | None"] = relationship(
        "Lead",
        back_populates="assessment",
        uselist=False,
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Assessment id={self.id} status={self.status.value}>"
