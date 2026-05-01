"""Admin routes — mower catalog CRUD (Section 5.4)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import SessionContext, require_user
from app.models.enums import UserRole
from app.schemas import MowerCreate, MowerRead, MowerUpdate, Page, PageMeta
from app.services import mower_service

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(session: SessionContext = Depends(require_user)) -> SessionContext:
    if session.role != UserRole.ADMIN.value:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="admin only")
    return session


@router.get(
    "/mowers",
    response_model=Page[MowerRead],
    summary="Admin catalog list — includes inactive mowers.",
)
async def list_mowers(
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_admin),
    q: str | None = Query(default=None, description="free-text search"),
    include_inactive: bool = Query(default=True),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
) -> Page[MowerRead]:
    rows, total = await mower_service.list_mowers(
        db,
        active_only=not include_inactive,
        q=q,
        limit=limit,
        offset=offset,
    )
    return Page[MowerRead](
        items=[MowerRead.model_validate(r) for r in rows],
        meta=PageMeta(total=total, limit=limit, offset=offset),
    )


@router.get(
    "/mowers/{mower_id}",
    response_model=MowerRead,
    summary="Fetch a single mower by id (admin context — includes inactive).",
)
async def get_mower(
    mower_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_admin),
) -> MowerRead:
    m = await mower_service.get_by_id(db, mower_id)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="mower not found")
    return MowerRead.model_validate(m)


@router.post(
    "/mowers",
    response_model=MowerRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a new mower to the catalog.",
)
async def create_mower(
    payload: MowerCreate,
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_admin),
) -> MowerRead:
    m = await mower_service.create(db, payload)
    return MowerRead.model_validate(m)


@router.put(
    "/mowers/{mower_id}",
    response_model=MowerRead,
    summary="Replace mower fields.",
)
async def update_mower(
    mower_id: uuid.UUID,
    payload: MowerUpdate,
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_admin),
) -> MowerRead:
    m = await mower_service.update(db, mower_id, payload)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="mower not found")
    return MowerRead.model_validate(m)


@router.delete(
    "/mowers/{mower_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Soft-delete (sets is_active=false).",
)
async def delete_mower(
    mower_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_admin),
) -> None:
    deleted = await mower_service.soft_delete(db, mower_id)
    if not deleted:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="mower not found")
