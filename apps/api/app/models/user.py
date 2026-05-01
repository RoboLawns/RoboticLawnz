"""User model — backed by Clerk for auth, mirrored locally for FK + audit."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin, UUIDPKMixin

if TYPE_CHECKING:
    from app.models.assessment import Assessment


class User(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    clerk_id: Mapped[str | None] = mapped_column(String(64), unique=True, index=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, index=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False, length=32),
        nullable=False,
        default=UserRole.HOMEOWNER,
        server_default=UserRole.HOMEOWNER.value,
    )

    assessments: Mapped[list["Assessment"]] = relationship(  # noqa: UP037
        "Assessment",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<User id={self.id} role={self.role.value}>"
