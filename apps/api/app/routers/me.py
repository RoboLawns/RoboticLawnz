"""Authenticated homeowner routes (Section 5.2)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import SessionContext, require_user
from app.models import Assessment
from app.models.user import User
from app.schemas import AssessmentRead
from app.schemas.user import UserRead
from app.services import assessment_service as svc

router = APIRouter(prefix="/me", tags=["me"])


async def _upsert_user(clerk_sub: str, db: AsyncSession) -> User:
    """Return the local User row for clerk_sub, creating it if absent."""
    result = await db.execute(select(User).where(User.clerk_id == clerk_sub))
    user = result.scalar_one_or_none()
    if user is None:
        user = User(clerk_id=clerk_sub)
        db.add(user)
        await db.flush()  # assign PK without committing
    return user


@router.get(
    "",
    response_model=UserRead,
    summary="Return the current authenticated user, creating a local row on first login.",
)
async def get_me(
    session: SessionContext = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> UserRead:
    assert session.user_id is not None
    user = await _upsert_user(session.user_id, db)
    return UserRead(
        id=user.id,
        email=user.email,
        role=user.role,
        created_at=user.created_at,
    )


@router.get(
    "/assessments",
    response_model=list[AssessmentRead],
    summary="List the current user's saved assessments.",
)
async def list_my_assessments(
    session: SessionContext = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> list[AssessmentRead]:
    assert session.user_id is not None
    # Ensure a local user row exists before querying their assessments.
    user = await _upsert_user(session.user_id, db)
    rows = await db.execute(
        select(Assessment)
        .where(Assessment.user_id == user.id)
        .order_by(Assessment.created_at.desc())
    )
    items = list(rows.scalars().all())
    out: list[AssessmentRead] = []
    for a in items:
        polygon = await svc.hydrate_polygon(db, a)
        out.append(
            AssessmentRead(
                id=a.id,
                user_id=a.user_id,
                session_id=a.session_id,
                status=a.status,
                address=a.address,
                lat=a.lat,
                lng=a.lng,
                lawn_polygon=polygon,
                lawn_area_sqft=a.lawn_area_sqft,
                max_slope_pct=a.max_slope_pct,
                avg_slope_pct=a.avg_slope_pct,
                slope_samples=a.slope_samples or [],
                grass_type_guesses=a.grass_type_guesses or [],
                grass_photo_url=a.grass_photo_url,
                obstacles=a.obstacles or [],
                gates=a.gates or [],
                created_at=a.created_at,
                updated_at=a.updated_at,
                completed_at=a.completed_at,
            )
        )
    return out


@router.delete(
    "/assessments/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one of the current user's assessments.",
)
async def delete_my_assessment(
    assessment_id: uuid.UUID,
    session: SessionContext = Depends(require_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    assert session.user_id is not None
    user = await _upsert_user(session.user_id, db)
    a = await db.get(Assessment, assessment_id)
    if not a or (a.user_id and a.user_id != user.id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="not found")
    await db.delete(a)
