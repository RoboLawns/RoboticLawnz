"""Deploy preflight — drives a synthetic assessment end-to-end against a
running API and reports a green / red status.

Usage:

    API_BASE_URL=https://api.roboticlawnz.com python scripts/deploy_preflight.py
    API_BASE_URL=http://localhost:8000 python scripts/deploy_preflight.py --verbose

What it does:

  1. GET  /healthz                      → process is up
  2. GET  /readyz                       → DB reachable
  3. GET  /api/v1/mowers                → catalog has rows
  4. POST /api/v1/assessments           → draft created
  5. PATCH /api/v1/assessments/{id}     → address, area, slope, grass, gates
  6. POST /api/v1/assessments/{id}/complete → recommendations computed
  7. GET  /api/v1/assessments/{id}/recommendations → recommendations persisted

Exits non-zero on any failure so it can run in CI / a release-phase hook.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any

import httpx

OK = "\033[32m✓\033[0m"
FAIL = "\033[31m✗\033[0m"
INFO = "\033[36m·\033[0m"


def _log(symbol: str, msg: str, payload: Any = None) -> None:
    print(f"{symbol} {msg}")
    if payload is not None:
        try:
            print("  " + json.dumps(payload, indent=2, default=str)[:600])
        except (TypeError, ValueError):
            print("  " + str(payload)[:600])


def main() -> int:
    parser = argparse.ArgumentParser(description="Deploy preflight for the Robotic Lawnz API")
    parser.add_argument(
        "--base-url",
        default=os.environ.get("API_BASE_URL", "http://localhost:8000"),
        help="API base URL — without /api/v1 (uses API_BASE_URL env var by default)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=20.0,
        help="HTTP timeout per request (seconds)",
    )
    parser.add_argument("--verbose", action="store_true", help="Print each response body")
    parser.add_argument(
        "--keep",
        action="store_true",
        help="Don't auto-delete the synthetic assessment at the end",
    )
    args = parser.parse_args()

    base = args.base_url.rstrip("/")
    api = f"{base}/api/v1"

    started = time.monotonic()
    failures: list[str] = []

    with httpx.Client(timeout=args.timeout, follow_redirects=False) as http:

        def maybe_dump(label: str, response: httpx.Response) -> None:
            if args.verbose:
                try:
                    _log(INFO, f"{label} body", response.json())
                except ValueError:
                    _log(INFO, f"{label} body", response.text[:300])

        # 1. liveness
        try:
            r = http.get(f"{base}/healthz")
            r.raise_for_status()
            _log(OK, f"GET /healthz → {r.status_code}")
            maybe_dump("/healthz", r)
        except httpx.HTTPError as e:
            _log(FAIL, f"GET /healthz failed: {e}")
            failures.append("liveness")

        # 2. readiness (DB reachable)
        try:
            r = http.get(f"{base}/readyz")
            r.raise_for_status()
            body = r.json()
            assert body.get("db") == "ok", f"db not ok: {body}"
            _log(OK, f"GET /readyz → {r.status_code} (db ok)")
        except (httpx.HTTPError, AssertionError) as e:
            _log(FAIL, f"GET /readyz failed: {e}")
            failures.append("readiness")

        # 3. mower catalog
        try:
            r = http.get(f"{api}/mowers", params={"limit": 1})
            r.raise_for_status()
            body = r.json()
            total = int(body["meta"]["total"])
            assert total > 0, "catalog is empty — run scripts/seed_mowers.py"
            _log(OK, f"GET /mowers → {total} active mowers in catalog")
        except (httpx.HTTPError, AssertionError, KeyError) as e:
            _log(FAIL, f"catalog probe failed: {e}")
            failures.append("catalog")
            # Without a catalog, recommendations would all be empty — short-circuit.
            return _summary(failures, started)

        # 4. create draft
        assessment_id: str | None = None
        try:
            r = http.post(f"{api}/assessments", json={})
            r.raise_for_status()
            body = r.json()
            assessment_id = body["id"]
            _log(OK, f"POST /assessments → {assessment_id}")
            maybe_dump("/assessments", r)
        except (httpx.HTTPError, KeyError) as e:
            _log(FAIL, f"create draft failed: {e}")
            failures.append("create_draft")
            return _summary(failures, started)

        # The signed session cookie set by the response must ride along on
        # subsequent calls, otherwise we'll be denied by `_assert_access`.
        # httpx.Client persists cookies automatically.

        # 5. populate fields
        try:
            r = http.patch(
                f"{api}/assessments/{assessment_id}",
                json={
                    "address": "1600 Pennsylvania Ave NW, Washington, DC",
                    "lat": 38.8977,
                    "lng": -77.0365,
                    "lawn_area_sqft": 8500,
                    "max_slope_pct": 12,
                    "avg_slope_pct": 8,
                    "grass_type_guesses": [{"species": "Tall Fescue", "confidence": 0.9}],
                    "gates": [
                        {"width_inches": 36, "lat": 38.8977, "lng": -77.0365, "label": "side"}
                    ],
                    "obstacles": [],
                },
            )
            r.raise_for_status()
            _log(OK, f"PATCH /assessments/{{id}} → {r.status_code}")
        except httpx.HTTPError as e:
            _log(FAIL, f"patch failed: {e}")
            failures.append("patch")

        # 6. complete + 7. recommendations
        try:
            r = http.post(f"{api}/assessments/{assessment_id}/complete")
            r.raise_for_status()
            recs = r.json()
            assert isinstance(recs, list) and len(recs) > 0, "no recommendations returned"
            counts = _count_by_status(recs)
            _log(
                OK,
                f"POST /complete → {len(recs)} recommendations "
                f"(green={counts['green']}, yellow={counts['yellow']}, red={counts['red']})",
            )
            top = recs[0]
            _log(
                INFO,
                f"top match: {top['mower']['brand']} {top['mower']['model']} "
                f"(score {top['fit_score']}, {top['fit_status']})",
            )
        except (httpx.HTTPError, AssertionError, KeyError) as e:
            _log(FAIL, f"complete failed: {e}")
            failures.append("complete")

        try:
            r = http.get(f"{api}/assessments/{assessment_id}/recommendations")
            r.raise_for_status()
            persisted = r.json()
            assert len(persisted) > 0, "recommendations not persisted"
            _log(OK, f"GET /recommendations → {len(persisted)} persisted")
        except (httpx.HTTPError, AssertionError) as e:
            _log(FAIL, f"recommendations fetch failed: {e}")
            failures.append("persisted")

        # 8. cleanup (optional)
        if not args.keep and assessment_id:
            # Only authenticated users can delete via /me/. The synthetic
            # session is anonymous, so we leave the row — operators can purge
            # via SQL if they care. Print the id so it's visible.
            _log(INFO, f"leaving synthetic assessment in place: {assessment_id}")

    return _summary(failures, started)


def _count_by_status(recs: list[dict[str, Any]]) -> dict[str, int]:
    counts = {"green": 0, "yellow": 0, "red": 0}
    for r in recs:
        s = r.get("fit_status")
        if s in counts:
            counts[s] += 1
    return counts


def _summary(failures: list[str], started: float) -> int:
    elapsed = time.monotonic() - started
    print()
    if failures:
        print(f"{FAIL} preflight FAILED in {elapsed:.1f}s — {', '.join(failures)}")
        return 1
    print(f"{OK} preflight PASSED in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
