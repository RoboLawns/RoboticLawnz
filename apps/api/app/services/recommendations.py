"""Mower recommendation engine.

Pure-function implementation of the rules in Section 6.2.8 of the build spec.
The function takes plain dataclasses (`AssessmentInput`, `MowerInput`) so it
can run in tests without touching the database — the router layer adapts ORM
rows to / from these.

Sort order: `fit_score desc, price_usd asc`. We persist the top 10 as
`Recommendation` rows.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from app.models.enums import DriveType, FitStatus, NavigationType
from app.schemas.recommendation import Reason


# --- Inputs ---------------------------------------------------------------- #


@dataclass(frozen=True, slots=True)
class AssessmentInput:
    """The subset of an assessment relevant to recommendations."""

    lawn_area_sqft: float
    max_slope_pct: float
    min_gate_width_inches: float | None = None  # None when no gates tagged
    grass_type: str | None = None
    multi_zone_count: int = 1


@dataclass(frozen=True, slots=True)
class MowerInput:
    id: str  # str-UUID; opaque to the engine
    brand: str
    model: str
    price_usd: float
    max_area_sqft: int
    max_slope_pct: int
    min_passage_inches: float
    navigation_type: NavigationType
    drive_type: DriveType


# --- Output ---------------------------------------------------------------- #


@dataclass(slots=True)
class ScoredRecommendation:
    mower_id: str
    fit_score: int
    fit_status: FitStatus
    reasons: list[Reason] = field(default_factory=list)
    rank: int = 0


# --- Engine ---------------------------------------------------------------- #


# Tunables — keep here so they're easy to A/B test later without touching
# call sites. Each constant is referenced directly in the rule below.
HARD_AREA_FACTOR = 1.00     # > capacity → red
HARD_SLOPE_FACTOR = 1.00
NEAR_AREA_FACTOR = 0.85
NEAR_SLOPE_FACTOR = 0.85
AREA_PENALTY = 15
SLOPE_PENALTY = 15
AWD_SLOPE_THRESHOLD = 25.0
AWD_BONUS = 5
RTK_NAV_TYPES: frozenset[NavigationType] = frozenset({NavigationType.RTK, NavigationType.HYBRID})

YELLOW_THRESHOLD = 70
TOP_N = 10


def _msg_area_too_large(area: float, max_area: int, brand: str, model: str) -> str:
    return (
        f"Your {area:,.0f} sq ft yard exceeds the {brand} {model}'s "
        f"{max_area:,} sq ft capacity."
    )


def _msg_slope_too_steep(slope: float, max_slope: int, brand: str, model: str) -> str:
    return (
        f"Your {slope:.0f}% max slope exceeds the {brand} {model}'s "
        f"{max_slope}% rated maximum."
    )


def _msg_gate_too_narrow(gate: float, min_passage: float, brand: str, model: str) -> str:
    return (
        f"Your narrowest gate ({gate:.1f}\") is below the {brand} {model}'s "
        f"{min_passage:.1f}\" passage width."
    )


def _msg_area_near_limit(area: float, max_area: int) -> str:
    return f"Yard at {area:,.0f} sq ft is close to this mower's {max_area:,} sq ft capacity."


def _msg_slope_near_limit(slope: float, max_slope: int) -> str:
    return f"{slope:.0f}% max slope is close to this mower's {max_slope}% rated maximum."


def _msg_awd_advantage(slope: float) -> str:
    return f"All-wheel-drive handles your {slope:.0f}% slope with margin to spare."


def _msg_ideal() -> str:
    return "Comfortably handles your yard's area, slope, and gates."


def _msg_rtk_required() -> str:
    return "RTK navigation requires clear sky view — verify before installing."


def _msg_narrow_passage_match() -> str:
    return "Compact chassis fits your narrowest gate cleanly."


def score_mower(assessment: AssessmentInput, mower: MowerInput) -> ScoredRecommendation:
    """Score a single mower against an assessment per Section 6.2.8."""
    fit_score = 100
    reasons: list[Reason] = []
    hard_fail = False

    # ---------- Hard gates (any single failure → 0) ---------- #
    if assessment.lawn_area_sqft > mower.max_area_sqft * HARD_AREA_FACTOR:
        hard_fail = True
        reasons.append(
            Reason(
                type="area_too_large",
                severity=FitStatus.RED,
                message=_msg_area_too_large(
                    assessment.lawn_area_sqft, mower.max_area_sqft, mower.brand, mower.model
                ),
            )
        )

    if assessment.max_slope_pct > mower.max_slope_pct * HARD_SLOPE_FACTOR:
        hard_fail = True
        reasons.append(
            Reason(
                type="slope_too_steep",
                severity=FitStatus.RED,
                message=_msg_slope_too_steep(
                    assessment.max_slope_pct, mower.max_slope_pct, mower.brand, mower.model
                ),
            )
        )

    if (
        assessment.min_gate_width_inches is not None
        and assessment.min_gate_width_inches < mower.min_passage_inches
    ):
        hard_fail = True
        reasons.append(
            Reason(
                type="gate_too_narrow",
                severity=FitStatus.RED,
                message=_msg_gate_too_narrow(
                    assessment.min_gate_width_inches,
                    mower.min_passage_inches,
                    mower.brand,
                    mower.model,
                ),
            )
        )

    if hard_fail:
        return ScoredRecommendation(
            mower_id=mower.id,
            fit_score=0,
            fit_status=FitStatus.RED,
            reasons=reasons,
        )

    # ---------- Soft factors (yellow) ---------- #
    if assessment.lawn_area_sqft > mower.max_area_sqft * NEAR_AREA_FACTOR:
        fit_score -= AREA_PENALTY
        reasons.append(
            Reason(
                type="area_near_limit",
                severity=FitStatus.YELLOW,
                message=_msg_area_near_limit(assessment.lawn_area_sqft, mower.max_area_sqft),
            )
        )

    if assessment.max_slope_pct > mower.max_slope_pct * NEAR_SLOPE_FACTOR:
        fit_score -= SLOPE_PENALTY
        reasons.append(
            Reason(
                type="slope_near_limit",
                severity=FitStatus.YELLOW,
                message=_msg_slope_near_limit(assessment.max_slope_pct, mower.max_slope_pct),
            )
        )

    # ---------- Bonuses (green) ---------- #
    if (
        mower.drive_type == DriveType.AWD
        and assessment.max_slope_pct > AWD_SLOPE_THRESHOLD
    ):
        fit_score += AWD_BONUS
        reasons.append(
            Reason(
                type="awd_advantage",
                severity=FitStatus.GREEN,
                message=_msg_awd_advantage(assessment.max_slope_pct),
            )
        )

    if (
        assessment.min_gate_width_inches is not None
        and mower.min_passage_inches <= assessment.min_gate_width_inches - 4
    ):
        reasons.append(
            Reason(
                type="narrow_passage_match",
                severity=FitStatus.GREEN,
                message=_msg_narrow_passage_match(),
            )
        )

    # ---------- Informational (kept neutral on score) ---------- #
    if mower.navigation_type in RTK_NAV_TYPES:
        reasons.append(
            Reason(
                type="rtk_required_clear_sky",
                severity=FitStatus.YELLOW,
                message=_msg_rtk_required(),
            )
        )

    fit_score = max(0, min(100, fit_score))

    if not reasons or all(r.severity == FitStatus.GREEN for r in reasons):
        reasons.insert(
            0,
            Reason(type="ideal_match", severity=FitStatus.GREEN, message=_msg_ideal()),
        )

    if fit_score == 0:
        status = FitStatus.RED
    elif fit_score < YELLOW_THRESHOLD:
        status = FitStatus.YELLOW
    else:
        status = FitStatus.GREEN

    return ScoredRecommendation(
        mower_id=mower.id,
        fit_score=fit_score,
        fit_status=status,
        reasons=reasons,
    )


def compute_recommendations(
    assessment: AssessmentInput,
    mowers: list[MowerInput],
    *,
    top_n: int = TOP_N,
) -> list[ScoredRecommendation]:
    """Score every mower and return the top `top_n` by fit_score desc, price_usd asc."""
    scored = [score_mower(assessment, m) for m in mowers]

    # Pull mower price into a sort key — mowers are in the same order as
    # `scored`, so we zip and use price as tiebreaker.
    paired = list(zip(scored, mowers, strict=True))
    paired.sort(key=lambda pair: (-pair[0].fit_score, pair[1].price_usd))

    ranked: list[ScoredRecommendation] = []
    for i, (rec, _mower) in enumerate(paired[:top_n], start=1):
        rec.rank = i
        ranked.append(rec)
    return ranked


def min_gate_width(gates: list[dict]) -> float | None:
    """Helper: derive the narrowest gate width from an assessment's gate list."""
    widths = [g.get("width_inches") for g in gates if g.get("width_inches") is not None]
    return float(min(widths)) if widths else None


__all__ = [
    "AssessmentInput",
    "MowerInput",
    "ScoredRecommendation",
    "compute_recommendations",
    "min_gate_width",
    "score_mower",
]
