"""Domain enums shared across models."""

from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    HOMEOWNER = "homeowner"
    SALES_REP = "sales_rep"
    ADMIN = "admin"


class AssessmentStatus(str, enum.Enum):
    DRAFT = "draft"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class NavigationType(str, enum.Enum):
    WIRE = "wire"
    RTK = "rtk"
    VISION = "vision"
    LIDAR = "lidar"
    HYBRID = "hybrid"


class DriveType(str, enum.Enum):
    TWO_WD = "2wd"
    AWD = "awd"
    TRACKS = "tracks"


class FitStatus(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class PreferredContact(str, enum.Enum):
    EMAIL = "email"
    PHONE = "phone"
    EITHER = "either"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    SOLD = "sold"
    LOST = "lost"
