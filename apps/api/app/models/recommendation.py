"""Per-assessment ranked mower recommendations."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, ForeignKey, Index, Integer, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import FitStatus
from app.models.mixins import TimestampMixin, UUIDPKMixin, empty_jsonb_list

if TYPE_CHECKING:
    from app.models.assessment import Assessment
    from app.models.mower import Mower


class Recommendation(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "recommendations"
    __table_args__ = (
        Index("ix_recommendations_assessment_rank", "assessment_id", "rank"),
        UniqueConstraint("assessment_id", "mower_id", name="uq_recommendation_per_mower"),
    )

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
    )
    mower_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("mowers.id", ondelete="CASCADE"),
        nullable=False,
    )

    fit_score: Mapped[int] = mapped_column(Integer, nullable=False)
    fit_status: Mapped[FitStatus] = mapped_column(
        Enum(FitStatus, name="fit_status", native_enum=False, length=16),
        nullable=False,
    )
    reasons: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=empty_jsonb_list,
        server_default="[]",
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)

    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="recommendations")
    mower: Mapped["Mower"] = relationship("Mower", back_populates="recommendations")
