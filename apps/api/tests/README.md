# API tests

```bash
cd apps/api
. .venv/bin/activate
pytest                              # full suite
pytest tests/test_recommendations.py -v
pytest --cov=app --cov-report=term-missing
```

## What's covered

| File                       | Scope                                                            |
| -------------------------- | ---------------------------------------------------------------- |
| `test_recommendations.py`  | Engine math (red gates, yellow penalties, AWD bonus, ranking)    |
| `test_schemas.py`          | Pydantic validation — phone, slug, cutting-height range, enums   |
| `test_geo.py`              | Polygon ↔ WKT round-trip, angle → slope % conversion             |
| `test_settings.py`         | Env parsing, CORS list, dev/prod flag                            |
| `test_health.py`           | `/healthz` + `/` smoke tests via FastAPI ASGI client             |

## What's NOT covered (yet)

- **DB-backed integration tests** — assessment lifecycle, lead persistence, recommendation upsert. These need a Postgres+PostGIS test container; add a `tests/integration/` suite with `pytest-postgresql` or testcontainers when the team is ready.
- **ML mocks** — Replicate calls aren't mocked because the calls themselves aren't wired yet. Add fixtures under `tests/fixtures/replicate.py` when SAM 2 / grass classifier integrations land.
- **Frontend E2E** — see `apps/web/tests/` for a Playwright happy-path test (TODO).

## Adding tests

- Pure logic: drop a `test_*.py` next to existing files. Use the `_mower()` / `_assessment()` helpers from `test_recommendations.py` as a model.
- Integration: prefer testcontainers + `httpx.AsyncClient` over mocking the DB.
- Always write the failing case first, especially around the recommendation rules — those drive a sales conversation.
