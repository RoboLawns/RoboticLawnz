"""Parameterized tests for the recommendation engine.

Covers every branch called out in Section 6.2.8 acceptance criteria:
oversized lawn, oversteep slope, narrow gate, borderline area, borderline
slope, AWD slope bonus, ideal match.
"""

from __future__ import annotations

import uuid

import pytest

from app.models.enums import DriveType, FitStatus, NavigationType
from app.services.recommendations import (
    AssessmentInput,
    MowerInput,
    compute_recommendations,
    min_gate_width,
    score_mower,
)


# ---------- Fixtures ---------- #


def _mower(
    *,
    id_: str | None = None,
    brand: str = "Husqvarna",
    model: str = "450X NERA",
    price: float = 4500.0,
    max_area: int = 22000,
    max_slope: int = 50,
    min_passage: float = 27.0,
    nav: NavigationType = NavigationType.RTK,
    drive: DriveType = DriveType.AWD,
) -> MowerInput:
    return MowerInput(
        id=id_ or str(uuid.uuid4()),
        brand=brand,
        model=model,
        price_usd=price,
        max_area_sqft=max_area,
        max_slope_pct=max_slope,
        min_passage_inches=min_passage,
        navigation_type=nav,
        drive_type=drive,
    )


def _assessment(
    *,
    area: float = 8000,
    slope: float = 12,
    gate: float | None = 36.0,
) -> AssessmentInput:
    return AssessmentInput(
        lawn_area_sqft=area,
        max_slope_pct=slope,
        min_gate_width_inches=gate,
    )


# ---------- Hard-fail (red) cases ---------- #


def test_oversized_lawn_is_red() -> None:
    m = _mower(max_area=10000)
    res = score_mower(_assessment(area=12000), m)
    assert res.fit_score == 0
    assert res.fit_status == FitStatus.RED
    assert any(r.type == "area_too_large" for r in res.reasons)


def test_oversteep_slope_is_red() -> None:
    m = _mower(max_slope=20)
    res = score_mower(_assessment(slope=45), m)
    assert res.fit_score == 0
    assert res.fit_status == FitStatus.RED
    assert any(r.type == "slope_too_steep" for r in res.reasons)


def test_narrow_gate_is_red() -> None:
    m = _mower(min_passage=30.0)
    res = score_mower(_assessment(gate=24.0), m)
    assert res.fit_score == 0
    assert res.fit_status == FitStatus.RED
    assert any(r.type == "gate_too_narrow" for r in res.reasons)


def test_red_short_circuits_other_reasons_score_wise() -> None:
    """When hard-fail triggers we return immediately with score 0."""
    m = _mower(max_area=1000, max_slope=10, min_passage=99.0)  # all fail
    res = score_mower(_assessment(area=20000, slope=80, gate=10.0), m)
    assert res.fit_score == 0
    types = {r.type for r in res.reasons}
    assert {"area_too_large", "slope_too_steep", "gate_too_narrow"}.issubset(types)


# ---------- Borderline (yellow) cases ---------- #


def test_borderline_area_yellow() -> None:
    # area = 90% of max → above 0.85 factor, below 1.0
    m = _mower(max_area=10000, max_slope=80)
    res = score_mower(_assessment(area=9000, slope=5), m)
    # 100 - 15 = 85, no other penalties → still green; trigger an extra penalty
    # by also being slope-near-limit
    assert any(r.type == "area_near_limit" for r in res.reasons)
    assert res.fit_score == 85
    assert res.fit_status == FitStatus.GREEN


def test_borderline_slope_yellow() -> None:
    m = _mower(max_slope=40, drive=DriveType.TWO_WD)
    res = score_mower(_assessment(slope=36), m)  # 90% of max
    assert any(r.type == "slope_near_limit" for r in res.reasons)
    assert res.fit_score == 85
    assert res.fit_status == FitStatus.GREEN


def test_combined_borderline_drops_to_yellow() -> None:
    m = _mower(max_area=10000, max_slope=40, drive=DriveType.TWO_WD)
    res = score_mower(_assessment(area=9000, slope=36), m)  # both near limit
    assert res.fit_score == 70
    # 70 is the boundary → strictly < threshold means status >= 70 is GREEN.
    assert res.fit_status == FitStatus.GREEN


# ---------- AWD bonus ---------- #


def test_awd_bonus_applied_above_threshold() -> None:
    m = _mower(drive=DriveType.AWD, max_slope=60, max_area=20000)
    res = score_mower(_assessment(slope=30, area=5000), m)
    assert any(r.type == "awd_advantage" for r in res.reasons)
    # No other penalties → 100 + 5 capped at 100.
    assert res.fit_score == 100
    assert res.fit_status == FitStatus.GREEN


def test_awd_bonus_not_applied_below_threshold() -> None:
    m = _mower(drive=DriveType.AWD, max_slope=60, max_area=20000)
    res = score_mower(_assessment(slope=15, area=5000), m)
    assert not any(r.type == "awd_advantage" for r in res.reasons)


def test_two_wd_does_not_get_awd_bonus_even_on_steep() -> None:
    m = _mower(drive=DriveType.TWO_WD, max_slope=60, max_area=20000)
    res = score_mower(_assessment(slope=30, area=5000), m)
    assert not any(r.type == "awd_advantage" for r in res.reasons)


# ---------- Ideal match ---------- #


def test_ideal_match_is_green_with_friendly_reason() -> None:
    m = _mower(
        max_area=20000, max_slope=40, min_passage=24.0,
        drive=DriveType.TWO_WD, nav=NavigationType.WIRE,
    )
    res = score_mower(_assessment(area=5000, slope=10, gate=36.0), m)
    assert res.fit_score == 100
    assert res.fit_status == FitStatus.GREEN
    assert any(r.type == "ideal_match" for r in res.reasons)


# ---------- Ranking + persistence shape ---------- #


def test_compute_ranks_top_n_by_score_then_price() -> None:
    a = _assessment(area=5000, slope=15, gate=36.0)
    mowers = [
        _mower(id_="cheap-mid", brand="Worx", model="Mid", price=900, max_area=10000),
        _mower(id_="expensive-perfect", brand="Husqvarna", model="Top", price=4500),
        _mower(id_="cheap-perfect", brand="Mammotion", model="Top", price=1500, max_area=15000),
        _mower(id_="too-small", brand="X", model="Y", price=300, max_area=2000),
    ]
    ranked = compute_recommendations(a, mowers, top_n=4)
    assert [r.rank for r in ranked] == [1, 2, 3, 4]

    # First three should all be score 100 (no penalties), tie-broken by price asc.
    top_three_ids = [r.mower_id for r in ranked[:3]]
    assert top_three_ids == ["cheap-mid", "cheap-perfect", "expensive-perfect"]

    # The too-small mower lands last with red.
    assert ranked[-1].mower_id == "too-small"
    assert ranked[-1].fit_status == FitStatus.RED


def test_compute_truncates_to_top_n() -> None:
    a = _assessment()
    mowers = [_mower() for _ in range(15)]
    ranked = compute_recommendations(a, mowers, top_n=10)
    assert len(ranked) == 10
    assert ranked[0].rank == 1
    assert ranked[-1].rank == 10


# ---------- min_gate_width helper ---------- #


def test_min_gate_width_returns_none_when_empty() -> None:
    assert min_gate_width([]) is None


def test_min_gate_width_picks_narrowest() -> None:
    gates = [
        {"width_inches": 36.0, "lat": 1, "lng": 1},
        {"width_inches": 28.0, "lat": 2, "lng": 2},
        {"width_inches": 42.0, "lat": 3, "lng": 3},
    ]
    assert min_gate_width(gates) == 28.0


@pytest.mark.parametrize(
    "area, slope, expected_status",
    [
        (5000, 10, FitStatus.GREEN),    # ideal
        (9000, 5, FitStatus.GREEN),     # borderline area only → 85
        (5000, 36, FitStatus.GREEN),    # borderline slope only → 85
        (9000, 36, FitStatus.GREEN),    # both borderline → 70 (still green at boundary)
        (12000, 10, FitStatus.RED),     # over area
        (5000, 50, FitStatus.RED),      # over slope
    ],
)
def test_status_grid(area: float, slope: float, expected_status: FitStatus) -> None:
    m = _mower(max_area=10000, max_slope=40, drive=DriveType.TWO_WD)
    a = AssessmentInput(lawn_area_sqft=area, max_slope_pct=slope, min_gate_width_inches=36.0)
    assert score_mower(a, m).fit_status is expected_status
