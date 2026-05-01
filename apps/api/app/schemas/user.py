"""User-facing schemas. The full user object is internal; clients only see
identity-level info."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import EmailStr

from app.models.enums import UserRole
from app.schemas.common import APIModel


class UserRead(APIModel):
    id: uuid.UUID
    email: EmailStr | None
    role: UserRole
    created_at: datetime
