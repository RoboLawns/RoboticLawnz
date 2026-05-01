"""Lead capture (public)."""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.rate_limit import CAPTURE_LEAD_LIMIT, limiter
from app.models import Assessment
from app.schemas import LeadCreate, LeadRead
from app.services import lead_service
from app.services.email import send_lead_emails
from app.services.lead_service import DuplicateLead

router = APIRouter(prefix="/leads", tags=["leads"])


@router.post(
    "",
    response_model=LeadRead,
    status_code=status.HTTP_201_CREATED,
    summary="Capture a homeowner lead from the results page.",
)
@limiter.limit(CAPTURE_LEAD_LIMIT)
async def create_lead(
    request: Request,
    payload: LeadCreate,
    background: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> LeadRead:
    try:
        lead = await lead_service.create_lead(db, payload)
    except DuplicateLead:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            detail="this assessment already has a lead attached",
        ) from None
    except ValueError as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e

    # Snapshot the assessment now (inside the request session) and pass plain
    # attribute access to the background task. Hitting the DB inside a
    # background task would race with the closing of the request session.
    assessment = await db.get(Assessment, lead.assessment_id)
    background.add_task(send_lead_emails, lead, assessment)

    return LeadRead.model_validate(lead)
