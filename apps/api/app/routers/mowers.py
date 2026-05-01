"""Public mower catalog (Section 5.1)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas import MowerRead, Page, PageMeta
from app.services import mower_service

router = APIRouter(prefix="/mowers", tags=["mowers"])


@router.get(
    "",
    response_model=Page[MowerRead],
    summary="Public mower catalog with filters.",
)
async def list_mowers(
    db: AsyncSession = Depends(get_db),
    brand: str | None = Query(default=None),
    nav: str | None = Query(default=None, description="navigation_type filter"),
    drive: str | None = Query(default=None, description="drive_type filter"),
    min_area: int | None = Query(default=None, ge=0),
    max_price: float | None = Query(default=None, ge=0),
    q: str | None = Query(default=None, description="free-text search across brand/model/slug"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> Page[MowerRead]:
    rows, total = await mower_service.list_mowers(
        db,
        brand=brand,
        nav=nav,
        drive=drive,
        min_area=min_area,
        max_price=max_price,
        q=q,
        limit=limit,
        offset=offset,
    )
    return Page[MowerRead](
        items=[MowerRead.model_validate(r) for r in rows],
        meta=PageMeta(total=total, limit=limit, offset=offset),
    )


@router.get(
    "/{slug}",
    response_model=MowerRead,
    summary="Mower detail by slug.",
)
async def get_mower(slug: str, db: AsyncSession = Depends(get_db)) -> MowerRead:
    m = await mower_service.get_by_slug(db, slug)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"mower {slug!r} not found")
    return MowerRead.model_validate(m)
