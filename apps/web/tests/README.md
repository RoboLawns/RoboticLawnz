# Web tests

| Layer     | Tool       | Status                                           |
| --------- | ---------- | ------------------------------------------------ |
| E2E       | Playwright | ✅ Happy path (`tests/e2e/happy-path.spec.ts`)   |
| Component | RTL        | TODO                                             |
| Unit      | Vitest     | TODO                                             |

## Running E2E locally

The Playwright suite drives the assessment flow against the real API. Boot
infra and the API first, then let Playwright start the web app for you:

```bash
# from repo root
make infra-up        # Postgres + PostGIS + Redis
make migrate         # alembic upgrade head
make seed            # load the 15-mower catalog
make api-dev         # FastAPI on :8000

# in another shell — runs `pnpm dev` for you via webServer config
cd apps/web
pnpm test:e2e        # headless
pnpm test:e2e --ui   # interactive
```

The config disables Mapbox + Clerk so the test exercises the always-available
fallback paths (manual area / manual slope / anonymous session). When those
services are mocked we can layer in an "interactive" project that covers the
polygon-draw and signed-in flows.

## What the happy path covers

`tests/e2e/happy-path.spec.ts`:

1. Landing → "Start your assessment"
2. Address entry
3. Map step (manual area fallback)
4. Slope step (manual slope fallback)
5. Grass step (species dropdown)
6. Obstacles step (skip)
7. Review screen — verifies the saved values render
8. Results page — confirms a mower appears under "Will work"
9. Lead capture — submits and checks the success state

## CI

A GitHub Actions workflow at `.github/workflows/e2e.yml` is the obvious next
step. It should:

1. Boot Postgres + PostGIS + Redis services.
2. `pip install -e ".[dev]"` and `alembic upgrade head` and `python scripts/seed_mowers.py`.
3. `uvicorn app.main:app &`
4. `pnpm install --frozen-lockfile && pnpm exec playwright install --with-deps`
5. `pnpm --filter @zippylawnz/web test:e2e`
