"""SQLAlchemy ORM models.

Importing this package registers every model on the shared `Base.metadata`,
which Alembic autogenerate relies on. Always add new models here.
"""

from __future__ import annotations

from app.models.assessment import Assessment
from app.models.enums import (
    AssessmentStatus,
    DriveType,
    FitStatus,
    LeadStatus,
    NavigationType,
    PreferredContact,
    UserRole,
)
from app.models.lead import Lead
from app.models.mower import Mower
from app.models.recommendation import Recommendation
from app.models.user import User

__all__ = [
    "Assessment",
    "AssessmentStatus",
    "DriveType",
    "FitStatus",
    "Lead",
    "LeadStatus",
    "Mower",
    "NavigationType",
    "PreferredContact",
    "Recommendation",
    "User",
    "UserRole",
]
