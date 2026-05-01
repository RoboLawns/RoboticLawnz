"""Domain enums shared across models."""

from __future__ import annotations

import enum


class UserRole(enum.StrEnum):
    HOMEOWNER = "homeowner"
    SALES_REP = "sales_rep"
    ADMIN = "admin"


class AssessmentStatus(enum.StrEnum):
    DRAFT = "draft"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class NavigationType(enum.StrEnum):
    WIRE = "wire"
    RTK = "rtk"
    VISION = "vision"
    LIDAR = "lidar"
    HYBRID = "hybrid"


class DriveType(enum.StrEnum):
    TWO_WD = "2wd"
    AWD = "awd"
    TRACKS = "tracks"


class FitStatus(enum.StrEnum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"


class PreferredContact(enum.StrEnum):
    EMAIL = "email"
    PHONE = "phone"
    EITHER = "either"


class LeadStatus(enum.StrEnum):
    NEW = "new"
    CONTACTED = "contacted"
    QUALIFIED = "qualified"
    SOLD = "sold"
    LOST = "lost"
