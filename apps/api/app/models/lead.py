"""Lead — captured at end of assessment, fed into ZippyLawnz CRM."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import LeadStatus, PreferredContact
from app.models.mixins import TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from app.models.assessment import Assessment


class Lead(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "leads"
    __table_args__ = (
        Index("ix_leads_status_created", "zippylawnz_status", "created_at"),
    )

    assessment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessments.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # 1:1 with assessment
    )

    email: Mapped[str] = mapped_column(String(320), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(32))
    preferred_contact: Mapped[PreferredContact] = mapped_column(
        Enum(PreferredContact, name="preferred_contact", native_enum=False, length=16),
        nullable=False,
        default=PreferredContact.EMAIL,
        server_default=PreferredContact.EMAIL.value,
    )
    notes: Mapped[str | None] = mapped_column(String(2000))

    zippylawnz_status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status", native_enum=False, length=16),
        nullable=False,
        default=LeadStatus.NEW,
        server_default=LeadStatus.NEW.value,
    )

    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="lead")  # noqa: UP037
