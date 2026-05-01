"""Assessment lifecycle service.

Wraps the SQLAlchemy `Assessment` model with the operations the routers need:
create, get-with-access-check, partial-update, complete (which fans out to the
recommendation engine), and slope-sample append.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import SessionContext
from app.models import Assessment, Mower, Recommendation
from app.models.enums import AssessmentStatus
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    SlopeSample,
    SlopeSampleCreate,
)
from app.schemas.common import PolygonGeoJSON
from app.services.geo import polygon_area_sqft, polygon_to_wkt, wkt_to_polygon
from app.services.recommendations import (
    AssessmentInput,
    MowerInput,
    compute_recommendations,
    min_gate_width,
)


class AccessDenied(Exception):
    """Raised when a session is not allowed to view / mutate the assessment."""


class NotFound(Exception):
    """Raised when an assessment id can't be resolved."""


# --- Helpers --------------------------------------------------------------- #


def _assert_access(assessment: Assessment, session: SessionContext) -> None:
    if assessment.user_id and session.user_id == str(assessment.user_id):
        return
    if assessment.session_id == session.session_id:
        return
    raise AccessDenied(f"session {session.session_id!r} cannot access assessment {assessment.id}")


async def _load_polygon_geojson(db: AsyncSession, assessment_id: uuid.UUID) -> PolygonGeoJSON | None:
    """Read the polygon column back out as GeoJSON.

    SQLAlchemy + GeoAlchemy returns a `WKBElement` — easiest is to ask Postgres
    for the WKT directly so we can hand the frontend a standard GeoJSON shape.
    """
    result = await db.execute(
        select(func.ST_AsText(Assessment.lawn_polygon)).where(Assessment.id == assessment_id)
    )
    wkt = result.scalar_one_or_none()
    if not wkt:
        return None
    return wkt_to_polygon(wkt)


def _to_jsonable_samples(samples: list[SlopeSample]) -> list[dict]:
    return [s.model_dump(mode="json") for s in samples]


# --- Public service surface ----------------------------------------------- #


async def create_assessment(
    db: AsyncSession,
    session: SessionContext,
    payload: AssessmentCreate,
) -> Assessment:
    assessment = Assessment(
        session_id=session.session_id,
        user_id=uuid.UUID(session.user_id) if session.user_id else None,
        status=AssessmentStatus.DRAFT,
        address=payload.address,
        lat=payload.lat,
        lng=payload.lng,
    )
    db.add(assessment)
    await db.flush()
    return assessment


async def get_assessment(
    db: AsyncSession,
    session: SessionContext,
    assessment_id: uuid.UUID,
    *,
    require_owner: bool = True,
) -> Assessment:
    a = await db.get(Assessment, assessment_id)
    if not a:
        raise NotFound(str(assessment_id))
    if require_owner:
        _assert_access(a, session)
    return a


async def update_assessment(
    db: AsyncSession,
    session: SessionContext,
    assessment_id: uuid.UUID,
    payload: AssessmentUpdate,
) -> Assessment:
    a = await get_assessment(db, session, assessment_id)
    data = payload.model_dump(exclude_unset=True)

    polygon: PolygonGeoJSON | None = data.pop("lawn_polygon", None)
    if polygon is not None:
        # Cast through PostGIS so we get a real GEOGRAPHY value + indexable.
        wkt = polygon_to_wkt(polygon)
        a.lawn_polygon = func.ST_GeogFromText(f"SRID=4326;{wkt}")
        # Auto-compute area unless caller explicitly set it.
        if "lawn_area_sqft" not in data:
            data["lawn_area_sqft"] = await polygon_area_sqft(db, polygon)

    if "slope_samples" in data and data["slope_samples"] is not None:
        data["slope_samples"] = [
            SlopeSample.model_validate(s).model_dump(mode="json") for s in data["slope_samples"]
        ]
        # Recompute aggregates if the caller didn't supply them.
        angles_pct = [
            abs(SlopeSample.model_validate(s).angle_deg) for s in data["slope_samples"]
        ]
        if angles_pct:
            from app.services.geo import angle_to_slope_pct

            slopes = [angle_to_slope_pct(a) for a in angles_pct]
            data.setdefault("max_slope_pct", round(max(slopes), 2))
            data.setdefault("avg_slope_pct", round(sum(slopes) / len(slopes), 2))

    if "obstacles" in data and data["obstacles"] is not None:
        data["obstacles"] = list(data["obstacles"])
    if "gates" in data and data["gates"] is not None:
        data["gates"] = list(data["gates"])
    if "grass_type_guesses" in data and data["grass_type_guesses"] is not None:
        data["grass_type_guesses"] = list(data["grass_type_guesses"])

    for key, value in data.items():
        setattr(a, key, value)

    await db.flush()
    return a


async def append_slope_sample(
    db: AsyncSession,
    session: SessionContext,
    assessment_id: uuid.UUID,
    sample: SlopeSampleCreate,
) -> Assessment:
    a = await get_assessment(db, session, assessment_id)
    samples = list(a.slope_samples or [])
    samples.append(
        SlopeSample(
            lat=sample.lat,
            lng=sample.lng,
            angle_deg=sample.angle_deg,
            accuracy=sample.accuracy,
            recorded_at=datetime.now(timezone.utc),
        ).model_dump(mode="json")
    )
    a.slope_samples = samples

    from app.services.geo import angle_to_slope_pct

    slopes = [angle_to_slope_pct(abs(s["angle_deg"])) for s in samples]
    a.max_slope_pct = round(max(slopes), 2)
    a.avg_slope_pct = round(sum(slopes) / len(slopes), 2)
    await db.flush()
    return a


async def complete_assessment(
    db: AsyncSession,
    session: SessionContext,
    assessment_id: uuid.UUID,
) -> tuple[Assessment, list[Recommendation]]:
    a = await get_assessment(db, session, assessment_id)

    # Minimum required fields. Any missing → 422 at the router layer.
    missing: list[str] = []
    if a.lawn_area_sqft is None:
        missing.append("lawn_area_sqft")
    if a.max_slope_pct is None:
        missing.append("max_slope_pct")
    if missing:
        raise ValueError(f"cannot complete: missing fields {missing}")

    # Pull active mowers + score them.
    rows = await db.execute(select(Mower).where(Mower.is_active.is_(True)))
    mowers = list(rows.scalars().all())

    inp = AssessmentInput(
        lawn_area_sqft=float(a.lawn_area_sqft),
        max_slope_pct=float(a.max_slope_pct),
        min_gate_width_inches=min_gate_width(list(a.gates or [])),
        grass_type=(a.grass_type_guesses or [{}])[0].get("species") if a.grass_type_guesses else None,
        multi_zone_count=1,
    )
    candidates = [
        MowerInput(
            id=str(m.id),
            brand=m.brand,
            model=m.model,
            price_usd=float(m.price_usd),
            max_area_sqft=int(m.max_area_sqft),
            max_slope_pct=int(m.max_slope_pct),
            min_passage_inches=float(m.min_passage_inches),
            navigation_type=m.navigation_type,
            drive_type=m.drive_type,
        )
        for m in mowers
    ]
    ranked = compute_recommendations(inp, candidates)

    # Wipe + re-insert recs (assessment can be re-completed after edits).
    await db.execute(
        Recommendation.__table__.delete().where(Recommendation.assessment_id == a.id)
    )
    rec_rows: list[Recommendation] = []
    for sr in ranked:
        rec_rows.append(
            Recommendation(
                assessment_id=a.id,
                mower_id=uuid.UUID(sr.mower_id),
                fit_score=sr.fit_score,
                fit_status=sr.fit_status,
                reasons=[r.model_dump(mode="json") for r in sr.reasons],
                rank=sr.rank,
            )
        )
    db.add_all(rec_rows)

    a.status = AssessmentStatus.COMPLETED
    a.completed_at = datetime.now(timezone.utc)

    await db.flush()
    return a, rec_rows


async def hydrate_polygon(db: AsyncSession, a: Assessment) -> PolygonGeoJSON | None:
    return await _load_polygon_geojson(db, a.id)
