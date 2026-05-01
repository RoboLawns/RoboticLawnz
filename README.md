# Robotic Lawnz

Customer-facing web app for the **ZippyLawnz** sub-brand **Robotic Lawnz** — helping U.S. homeowners through the full robotic-mower journey: plan → choose → install → own.

> Build spec: [`Robotic_Lawnz_Build_Spec.md`](./Robotic_Lawnz_Build_Spec.md)

## Repo layout

```
roboticlawnz/
├── apps/
│   ├── web/            Next.js 15 (App Router) — customer UI
│   └── api/            FastAPI 3.12 — assessments, recommendations, leads
├── packages/
│   ├── shared-types/   Zod schemas + generated TS types
│   ├── ui/             shared shadcn/ui primitives
│   └── eslint-config/  shared lint config
├── infra/              docker-compose, Railway service configs
└── docs/               ADRs, runbooks
```

## Tech stack

| Layer       | Tech                                                     |
| ----------- | -------------------------------------------------------- |
| Frontend    | Next.js 15, React 19, TypeScript 5+, Tailwind 4, shadcn  |
| Backend     | Python 3.12, FastAPI, Pydantic v2, SQLAlchemy 2.0        |
| Database    | PostgreSQL 16 + PostGIS 3.4                              |
| Cache/Queue | Redis 7                                                  |
| Auth        | Clerk                                                    |
| Maps        | Mapbox GL JS, Google Maps Static (server-proxied)        |
| ML          | Replicate (SAM 2, custom grass classifier)               |
| Email       | Resend                                                   |
| Storage     | Cloudflare R2                                            |
| Hosting     | Railway                                                  |
| Telemetry   | Sentry, PostHog                                          |

## Quick start (local dev)

```bash
# 1. install
pnpm install
cd apps/api && python -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]"

# 2. boot infra
cp .env.example .env
docker compose -f infra/docker-compose.yml up -d

# 3. migrate + seed
cd apps/api && alembic upgrade head && python scripts/seed_mowers.py

# 4. run dev servers (root)
pnpm dev
# web → http://localhost:3000   |   api → http://localhost:8000/docs
```

## Conventions

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …)
- **Branches:** trunk-based; `main` is always deployable
- **TypeScript:** strict, no `any`, Zod for runtime validation at API boundaries
- **Python:** `ruff` + `mypy --strict` in CI, type hints everywhere
- **Naming:** snake_case (Py), camelCase (TS), PascalCase (components), kebab-case (files & routes)

## Phases

1. **MVP — Plan & Choose** (8–12 wks) — assessment flow, recommendation engine, lead capture
2. **Install & Own** (3–6 mo post-MVP) — runtime calculator, ROI, training videos, PDF reports
3. **Mow Less, Live More** (6–12 mo post-MVP) — landscape design, native apps, white-label

See [Sections 6–8 of the build spec](./Robotic_Lawnz_Build_Spec.md#6-phase-1--mvp-plan--choose) for full feature breakdown.
