# Robotic Lawnz API

FastAPI backend for the Robotic Lawnz assessment flow, mower catalog, recommendation engine, and lead capture.

## Run locally

```bash
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"

# infra (from repo root)
docker compose -f ../../infra/docker-compose.yml up -d

# migrate + seed
alembic upgrade head
python scripts/seed_mowers.py

# dev server
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs: http://localhost:8000/docs

## Layout

```
app/
├── main.py            FastAPI app factory + lifespan
├── core/              config, db engine, logging, security, deps
├── models/            SQLAlchemy 2.0 ORM models
├── schemas/           Pydantic v2 schemas
├── routers/           FastAPI routers per domain
├── services/          business logic (recommendations, geocoding, etc.)
└── ml/                Replicate clients (SAM 2, grass classifier)
alembic/               migrations
scripts/               one-off seed/import scripts
tests/                 pytest
```

## Quality gates

```bash
ruff check .
ruff format --check .
mypy .
pytest --cov=app
```
