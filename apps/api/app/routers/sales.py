"""Sales-rep routes (Section 5.3)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import SessionContext, require_user
from app.models.enums import LeadStatus, UserRole
from app.schemas import (
    AssessmentRead,
    LeadRead,
    LeadUpdate,
    Page,
    PageMeta,
    RecommendationWithMower,
)
from app.services import assessment_service as a_svc
from app.services import lead_service

router = APIRouter(prefix="/sales", tags=["sales"])


def _require_sales_rep(session: SessionContext = Depends(require_user)) -> SessionContext:
    if session.role not in {UserRole.SALES_REP.value, UserRole.ADMIN.value}:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="sales rep only")
    return session


@router.get(
    "/leads",
    response_model=Page[LeadRead],
    summary="ZippyLawnz CRM-lite — paginated lead inbox.",
)
async def list_leads(
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_sales_rep),
    status: LeadStatus | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> Page[LeadRead]:
    rows, total = await lead_service.list_leads(db, status=status, limit=limit, offset=offset)
    return Page[LeadRead](
        items=[LeadRead.model_validate(r) for r in rows],
        meta=PageMeta(total=total, limit=limit, offset=offset),
    )


@router.patch(
    "/leads/{lead_id}",
    response_model=LeadRead,
    summary="Update lead status / notes.",
)
async def update_lead(
    lead_id: uuid.UUID,
    payload: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    _: SessionContext = Depends(_require_sales_rep),
) -> LeadRead:
    lead = await lead_service.update_lead(db, lead_id, payload)
    if not lead:
        raise HTTPException(404, detail="lead not found")
    return LeadRead.model_validate(lead)


@router.get(
    "/assessments/{assessment_id}",
    response_model=AssessmentRead,
    summary="Fetch any assessment (for sales context).",
)
async def get_any_assessment(
    assessment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: SessionContext = Depends(_require_sales_rep),
) -> AssessmentRead:
    try:
        a = await a_svc.get_assessment(db, session, assessment_id, require_owner=False)
    except a_svc.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    polygon = await a_svc.hydrate_polygon(db, a)
    return AssessmentRead(
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


@router.get(
    "/assessments/{assessment_id}/recommendations",
    response_model=list[RecommendationWithMower],
    summary="Recommendations for any assessment.",
)
async def get_recommendations(
    assessment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    session: SessionContext = Depends(_require_sales_rep),
) -> list[RecommendationWithMower]:
    try:
        a = await a_svc.get_assessment(db, session, assessment_id, require_owner=False)
    except a_svc.NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    return [
        RecommendationWithMower(
            id=r.id,
            assessment_id=r.assessment_id,
            mower_id=r.mower_id,
            fit_score=r.fit_score,
            fit_status=r.fit_status,
            reasons=r.reasons,
            rank=r.rank,
            created_at=r.created_at,
            mower=r.mower,
        )
        for r in a.recommendations
    ]
