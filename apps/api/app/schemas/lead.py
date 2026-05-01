"""Lead capture + sales-rep CRM schemas."""

from __future__ import annotations

import re
import uuid
from datetime import datetime

from pydantic import EmailStr, Field, field_validator

from app.models.enums import LeadStatus, PreferredContact
from app.schemas.common import APIModel

# Loose digits-and-formatting check; full E.164 validation is out of scope at
# capture time — sales reps verify manually before dialing.
_PHONE_RE = re.compile(r"^[+()\d\-\s.]{7,32}$")


class LeadCreate(APIModel):
    assessment_id: uuid.UUID
    email: EmailStr
    phone: str | None = None
    preferred_contact: PreferredContact = PreferredContact.EMAIL
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("phone")
    @classmethod
    def _phone_format(cls, v: str | None) -> str | None:
        if v is None or v.strip() == "":
            return None
        v = v.strip()
        if not _PHONE_RE.match(v):
            raise ValueError("phone must contain only digits, spaces, +, -, (), .")
        return v


class LeadUpdate(APIModel):
    """Sales-rep status / notes updates."""

    zippylawnz_status: LeadStatus | None = None
    notes: str | None = Field(default=None, max_length=1000)


class LeadRead(APIModel):
    id: uuid.UUID
    assessment_id: uuid.UUID
    email: EmailStr
    phone: str | None
    preferred_contact: PreferredContact
    notes: str | None
    zippylawnz_status: LeadStatus
    created_at: datetime
    updated_at: datetime
