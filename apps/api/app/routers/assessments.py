"""Public + anonymous assessment routes (Sections 5.1, 6.2.2 - 6.2.7)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, Response, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.rate_limit import (
    COMPLETE_ASSESSMENT_LIMIT,
    CREATE_ASSESSMENT_LIMIT,
    ML_INFERENCE_LIMIT,
    SLOPE_SAMPLE_LIMIT,
    limiter,
)
from app.core.security import SessionDep
from app.schemas import (
    AssessmentCreate,
    AssessmentRead,
    AssessmentUpdate,
    GeocodeRequest,
    GeocodeResponse,
    GrassPhotoResponse,
    LawnSegmentRequest,
    LawnSegmentResponse,
    PolygonGeoJSON,
    RecommendationWithMower,
    SlopeSampleCreate,
)
from app.services import assessment_service as svc
from app.services.assessment_service import AccessDenied, NotFound

router = APIRouter(prefix="/assessments", tags=["assessments"])


def _to_read_model(a, polygon) -> AssessmentRead:
    """Hydrate an ORM Assessment into the response model with a real polygon."""
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


@router.post(
    "",
    response_model=AssessmentRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create a draft assessment for the current session.",
)
@limiter.limit(CREATE_ASSESSMENT_LIMIT)
async def create_assessment(
    request: Request,
    payload: AssessmentCreate,
    response: Response,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> AssessmentRead:
    a = await svc.create_assessment(db, session, payload)
    polygon = await svc.hydrate_polygon(db, a)
    return _to_read_model(a, polygon)


@router.get(
    "/{assessment_id}",
    response_model=AssessmentRead,
    summary="Fetch an assessment (must match session or auth).",
)
async def get_assessment(
    assessment_id: uuid.UUID,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> AssessmentRead:
    try:
        a = await svc.get_assessment(db, session, assessment_id)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None
    polygon = await svc.hydrate_polygon(db, a)
    return _to_read_model(a, polygon)


@router.patch(
    "/{assessment_id}",
    response_model=AssessmentRead,
    summary="Incremental update — any subset of fields.",
)
async def patch_assessment(
    assessment_id: uuid.UUID,
    payload: AssessmentUpdate,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> AssessmentRead:
    try:
        a = await svc.update_assessment(db, session, assessment_id, payload)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None
    polygon = await svc.hydrate_polygon(db, a)
    return _to_read_model(a, polygon)


@router.post(
    "/{assessment_id}/geocode",
    response_model=GeocodeResponse,
    summary="Geocode an address via Google Geocoding API and persist the result.",
)
async def geocode(
    assessment_id: uuid.UUID,
    payload: GeocodeRequest,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> GeocodeResponse:
    """Resolves the supplied address to lat/lng via Google Geocoding and
    updates the assessment record so the map step opens centered on the home.
    Falls back to manual lat/lng entry when the Google Maps key is absent."""
    from app.services.geo import GeocodingError, geocode_address

    try:
        a = await svc.get_assessment(db, session, assessment_id)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None

    try:
        result = await geocode_address(payload.address)
    except GeocodingError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    if result is None:
        if a.lat is None or a.lng is None:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="geocoder not configured; please supply lat/lng directly",
            )
        return GeocodeResponse(
            lat=a.lat,
            lng=a.lng,
            suggested_zoom=19,
            formatted_address=payload.address,
        )

    a.address = result.formatted_address
    a.lat = result.lat
    a.lng = result.lng
    await db.flush()

    return GeocodeResponse(
        lat=result.lat,
        lng=result.lng,
        suggested_zoom=19,
        formatted_address=result.formatted_address,
    )


@router.post(
    "/{assessment_id}/lawn-segment",
    response_model=LawnSegmentResponse,
    summary="Run SAM 2 segmentation against a captured map tile.",
)
@limiter.limit(ML_INFERENCE_LIMIT)
async def lawn_segment(
    request: Request,
    assessment_id: uuid.UUID,
    payload: LawnSegmentRequest,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> LawnSegmentResponse:
    """Section 6.2.4 — calls SAM 2 via Replicate, returns the lawn polygon in
    lat/lng. When Replicate isn't configured we return a 200 with
    `fallback_to_manual=True` so the UI degrades gracefully (the user keeps
    drawing the polygon by hand on the Mapbox canvas)."""
    try:
        await svc.get_assessment(db, session, assessment_id)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None

    from app.ml.segmentation import LawnSegmenter, SegmentationFailed
    from app.ml.replicate import ReplicateError, ReplicateNotConfigured

    try:
        segmenter = LawnSegmenter.from_settings()
    except ReplicateNotConfigured:
        # Frontend handles this exact shape and falls back to manual drawing.
        return LawnSegmentResponse(
            polygon=PolygonGeoJSON(coordinates=[[(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)]]),
            area_sqft=0.0,
            fallback_to_manual=True,
        )

    try:
        result = await segmenter.segment(payload)
    except (ReplicateError, SegmentationFailed):
        return LawnSegmentResponse(
            polygon=PolygonGeoJSON(coordinates=[[(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)]]),
            area_sqft=0.0,
            fallback_to_manual=True,
        )

    # Project area sq ft via PostGIS now that we have a real polygon.
    from app.services.geo import polygon_area_sqft

    result_area = await polygon_area_sqft(db, result.polygon)
    return LawnSegmentResponse(
        polygon=result.polygon,
        area_sqft=result_area,
        fallback_to_manual=False,
    )


@router.post(
    "/{assessment_id}/slope-sample",
    response_model=AssessmentRead,
    summary="Append a single slope sample.",
)
@limiter.limit(SLOPE_SAMPLE_LIMIT)
async def slope_sample(
    request: Request,
    assessment_id: uuid.UUID,
    payload: SlopeSampleCreate,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> AssessmentRead:
    try:
        a = await svc.append_slope_sample(db, session, assessment_id, payload)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None
    polygon = await svc.hydrate_polygon(db, a)
    return _to_read_model(a, polygon)


@router.post(
    "/{assessment_id}/grass-photo",
    response_model=GrassPhotoResponse,
    summary="Upload a grass photo and return classifier guesses.",
)
@limiter.limit(ML_INFERENCE_LIMIT)
async def grass_photo(
    request: Request,
    assessment_id: uuid.UUID,
    file: UploadFile,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> GrassPhotoResponse:
    """Photo upload + grass classifier — stubbed until R2 + Replicate are wired.
    See Section 6.2.6 — MVP shortcut allows manual species selection only.
    """
    try:
        await svc.get_assessment(db, session, assessment_id)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e

    raise HTTPException(
        status.HTTP_503_SERVICE_UNAVAILABLE,
        detail={
            "message": "Grass photo classifier not configured. "
            "Use manual selection from the UI dropdown.",
        },
    )


@router.post(
    "/{assessment_id}/complete",
    response_model=list[RecommendationWithMower],
    summary="Finalize the assessment and compute recommendations.",
)
@limiter.limit(COMPLETE_ASSESSMENT_LIMIT)
async def complete_assessment(
    request: Request,
    assessment_id: uuid.UUID,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> list[RecommendationWithMower]:
    try:
        _a, recs = await svc.complete_assessment(db, session, assessment_id)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None
    except ValueError as e:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)) from e

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
        for r in recs
    ]


@router.get(
    "/{assessment_id}/recommendations",
    response_model=list[RecommendationWithMower],
    summary="Fetch the persisted recommendations for an assessment.",
)
async def get_recommendations(
    assessment_id: uuid.UUID,
    session: SessionDep,
    db: AsyncSession = Depends(get_db),
) -> list[RecommendationWithMower]:
    try:
        a = await svc.get_assessment(db, session, assessment_id)
    except NotFound as e:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=str(e)) from e
    except AccessDenied:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="forbidden") from None

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
