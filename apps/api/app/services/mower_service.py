"""Mower catalog queries used by the public catalog + admin CRUD."""

from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Mower
from app.schemas.mower import MowerCreate, MowerUpdate


async def list_mowers(
    db: AsyncSession,
    *,
    active_only: bool = True,
    brand: str | None = None,
    nav: str | None = None,
    drive: str | None = None,
    min_area: int | None = None,
    max_price: float | None = None,
    q: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Mower], int]:
    stmt = select(Mower)
    if active_only:
        stmt = stmt.where(Mower.is_active.is_(True))
    if brand:
        stmt = stmt.where(Mower.brand.ilike(brand))
    if nav:
        stmt = stmt.where(Mower.navigation_type == nav)
    if drive:
        stmt = stmt.where(Mower.drive_type == drive)
    if min_area is not None:
        stmt = stmt.where(Mower.max_area_sqft >= min_area)
    if max_price is not None:
        stmt = stmt.where(Mower.price_usd <= max_price)
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(
                func.lower(Mower.brand).like(like),
                func.lower(Mower.model).like(like),
                func.lower(Mower.slug).like(like),
            )
        )

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())

    stmt = stmt.order_by(Mower.brand, Mower.model).limit(limit).offset(offset)
    rows = list((await db.execute(stmt)).scalars().all())
    return rows, total


async def get_by_slug(db: AsyncSession, slug: str) -> Mower | None:
    res = await db.execute(select(Mower).where(Mower.slug == slug))
    return res.scalar_one_or_none()


async def get_by_id(db: AsyncSession, mower_id: uuid.UUID) -> Mower | None:
    return await db.get(Mower, mower_id)


async def create(db: AsyncSession, payload: MowerCreate) -> Mower:
    mower = Mower(**payload.model_dump(mode="python"))
    # AnyHttpUrl → str
    mower.product_url = str(payload.product_url)
    mower.image_url = str(payload.image_url)
    mower.manufacturer_specs_url = str(payload.manufacturer_specs_url)
    mower.affiliate_url = str(payload.affiliate_url) if payload.affiliate_url else None
    db.add(mower)
    await db.flush()
    return mower


async def update(db: AsyncSession, mower_id: uuid.UUID, payload: MowerUpdate) -> Mower | None:
    m = await get_by_id(db, mower_id)
    if not m:
        return None
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        if k.endswith("_url") and v is not None:
            v = str(v)
        setattr(m, k, v)
    await db.flush()
    return m


async def soft_delete(db: AsyncSession, mower_id: uuid.UUID) -> bool:
    m = await get_by_id(db, mower_id)
    if not m:
        return False
    m.is_active = False
    await db.flush()
    return True
