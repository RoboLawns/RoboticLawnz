"""Lead capture + sales-rep CRM."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Assessment, Lead
from app.models.enums import LeadStatus
from app.schemas.lead import LeadCreate, LeadUpdate


class DuplicateLead(Exception):
    """An assessment already has a lead attached (1:1)."""


async def create_lead(db: AsyncSession, payload: LeadCreate) -> Lead:
    # Confirm the assessment exists; the FK would catch it, but a friendly
    # 404 is nicer than a 500 from the integrity error.
    a = await db.get(Assessment, payload.assessment_id)
    if not a:
        raise ValueError(f"assessment {payload.assessment_id} not found")

    lead = Lead(
        assessment_id=payload.assessment_id,
        email=str(payload.email),
        phone=payload.phone,
        preferred_contact=payload.preferred_contact,
        notes=payload.notes,
        zippylawnz_status=LeadStatus.NEW,
    )
    db.add(lead)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        raise DuplicateLead(str(payload.assessment_id)) from e
    return lead


async def list_leads(
    db: AsyncSession,
    *,
    status: LeadStatus | None = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[Lead], int]:
    stmt = select(Lead)
    if status is not None:
        stmt = stmt.where(Lead.zippylawnz_status == status)
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = int((await db.execute(count_stmt)).scalar_one())
    stmt = stmt.order_by(Lead.created_at.desc()).limit(limit).offset(offset)
    rows = list((await db.execute(stmt)).scalars().all())
    return rows, total


async def update_lead(db: AsyncSession, lead_id: uuid.UUID, payload: LeadUpdate) -> Lead | None:
    lead = await db.get(Lead, lead_id)
    if not lead:
        return None
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(lead, k, v)
    await db.flush()
    return lead
