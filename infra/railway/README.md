# Railway deployment

This is the canonical runbook for deploying ZippyLawnz to Railway. The
project is a pnpm monorepo with two services (`api`, `web`), backed by
Postgres + PostGIS and Redis.

## TL;DR

1. Create the project in Railway from this GitHub repo.
2. Add four services: **db** (Postgres + PostGIS), **redis**, **api**, **web**.
3. Configure each service per the tables below.
4. Push to `main` — Railway builds + deploys both services automatically.
5. From `railway run` (API service) seed the catalog once: `python scripts/seed_mowers.py`.

---

## 1. Prerequisites

- Railway CLI: `npm i -g @railway/cli && railway login`
- A GitHub repo with this code pushed
- Accounts ready (or skip the matching env vars and accept reduced functionality):
  - **Clerk** publishable + secret keys
  - **Mapbox** public token
  - **Google Maps** API key (server-side proxy only)
  - **Replicate** API token + SAM 2 model version digest
  - **Resend** API key + verified `from_email` domain
  - **Cloudflare R2** access keys + bucket
  - **Sentry** DSN (separate for `web` and `api`)
  - **PostHog** project key

---

## 2. Provision services

### 2a. Database (Postgres + PostGIS)

In the Railway dashboard:

1. **+ New** → Database → **Postgres**.
2. Once provisioned: _Settings_ → **Networking** → enable private networking.
3. Open the **Data** tab and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS pgcrypto;
   ```
   The Alembic migration also runs `CREATE EXTENSION IF NOT EXISTS` so this
   is belt-and-braces, but it makes first-deploy diagnostics easier.
4. Note the service name; you'll reference its `DATABASE_URL` from the API.

> _Why not the postgis/postgis Docker image?_ Railway's Postgres template gives
> you backups, point-in-time recovery, and automatic upgrades. The `postgis`
> + `pgcrypto` extensions ship with their image — you just need to enable them.

### 2b. Redis

**+ New** → Database → **Redis**. No further config — copy `REDIS_URL` from its
Variables tab when you wire the API.

### 2c. API service

**+ New** → **GitHub Repo** → pick this repo. Then:

| Setting           | Value                                  |
| ----------------- | -------------------------------------- |
| Root Directory    | `apps/api`                             |
| Builder           | Dockerfile (auto-detected)             |
| Dockerfile Path   | `Dockerfile`                           |
| Start Command     | `./scripts/start.sh` (from railway.json) |
| Healthcheck Path  | `/healthz` (from railway.json)         |
| Watch Paths       | `apps/api/**`, `infra/**` (optional)   |

The image runs `alembic upgrade head` on every boot, so migrations apply
automatically.

### 2d. Web service

**+ New** → **GitHub Repo** → same repo (Railway lets one repo back multiple
services). Then:

| Setting           | Value                                                   |
| ----------------- | ------------------------------------------------------- |
| Root Directory    | `/` (repo root — the Dockerfile needs the workspace)   |
| Builder           | Dockerfile                                              |
| Dockerfile Path   | `apps/web/Dockerfile`                                   |
| Start Command     | `node apps/web/server.js` (from railway.json)           |
| Healthcheck Path  | `/`                                                     |
| Watch Paths       | `apps/web/**`, `packages/**`                            |

> _Why repo root?_ The web Dockerfile needs to copy `pnpm-workspace.yaml` and
> the `packages/` directory to resolve `@zippylawnz/ui` and
> `@zippylawnz/shared-types`. The API Dockerfile, by contrast, only needs
> `apps/api`.

---

## 3. Environment variables

Set these in each service's Variables tab. **Public** vars (`NEXT_PUBLIC_*`)
ship to the browser; treat everything else as a secret.

### API service

| Variable                          | Value / source                                                |
| --------------------------------- | ------------------------------------------------------------- |
| `APP_ENV`                         | `prod`                                                        |
| `DATABASE_URL`                    | Railway reference: `${{db.DATABASE_URL}}`<br/>**Append `+psycopg`** if Railway's value starts with `postgresql://` — set to `postgresql+psycopg://...` |
| `REDIS_URL`                       | Railway reference: `${{redis.REDIS_URL}}`                     |
| `SESSION_COOKIE_SECRET`           | 32+ random bytes — `openssl rand -hex 32`                     |
| `API_CORS_ORIGINS`                | `https://app.zippylawnz.com` (your web service domain)      |
| `PUBLIC_APP_URL`                  | `https://app.zippylawnz.com`                                |
| `CLERK_SECRET_KEY`                | from Clerk dashboard                                          |
| `CLERK_JWKS_URL`                  | (optional, defaults to `https://api.clerk.com/v1/jwks`)       |
| `CLERK_WEBHOOK_SECRET`            | from Clerk webhooks settings                                  |
| `GOOGLE_MAPS_API_KEY`             | from Google Cloud — restrict to server IPs                    |
| `REPLICATE_API_TOKEN`             | from Replicate                                                |
| `SAM2_MODEL_VERSION`              | pinned digest, e.g. `meta/sam-2:fe97b453a6...`                |
| `GRASS_CLASSIFIER_MODEL_VERSION`  | (optional) pinned classifier digest                           |
| `RESEND_API_KEY`                  | from Resend                                                   |
| `SALES_INBOX_EMAIL`               | `sales@zippylawnz.com`                                        |
| `FROM_EMAIL`                      | `hello@zippylawnz.com` (must be verified in Resend)         |
| `R2_ACCOUNT_ID`                   | Cloudflare R2                                                 |
| `R2_ACCESS_KEY_ID`                | Cloudflare R2                                                 |
| `R2_SECRET_ACCESS_KEY`            | Cloudflare R2                                                 |
| `R2_BUCKET`                       | `zippylawnz-uploads`                                        |
| `R2_PUBLIC_BASE_URL`              | `https://images.zippylawnz.com`                             |
| `SENTRY_DSN`                      | from Sentry — API project                                     |
| `LOG_LEVEL`                       | `INFO`                                                        |
| `UVICORN_WORKERS`                 | `2` (Railway hobby) up to `4` (paid)                          |

### Web service

| Variable                                    | Value / source                                                  |
| ------------------------------------------- | --------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`                       | `https://app.zippylawnz.com`                                  |
| `NEXT_PUBLIC_API_BASE_URL`                  | `https://api.zippylawnz.com/api/v1`                           |
| `NEXT_PUBLIC_MAPBOX_TOKEN`                  | from Mapbox — public token, restrict referrer to your domain    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`         | from Clerk                                                      |
| `CLERK_SECRET_KEY`                          | from Clerk (used by `auth()` server helpers in route handlers)  |
| `NEXT_PUBLIC_POSTHOG_KEY`                   | from PostHog                                                    |
| `NEXT_PUBLIC_POSTHOG_HOST`                  | `https://us.i.posthog.com` (default)                            |
| `SENTRY_DSN`                                | from Sentry — web project                                       |
| `NODE_ENV`                                  | `production` (set by the Dockerfile, override only if needed)   |

---

## 4. First deploy

```bash
git push origin main
```

Railway will build both services in parallel. When the API turns green:

```bash
# Connect the CLI to the project + API service
railway link
railway environment production
railway service api

# Seed the catalog (one-off — `start.sh` only runs migrations on boot)
railway run python scripts/seed_mowers.py
```

Verify:

```bash
curl -fsS https://api.zippylawnz.com/healthz
curl -fsS https://api.zippylawnz.com/readyz
curl -fsS https://api.zippylawnz.com/api/v1/mowers | jq '.meta.total'
# → 15 (or however many rows are in scripts/data/mowers.csv)
```

Then hit `https://app.zippylawnz.com` and click through the assessment flow.

The deploy preflight script (see `apps/api/scripts/deploy_preflight.py`) does
all of this in one command:

```bash
API_BASE_URL=https://api.zippylawnz.com python apps/api/scripts/deploy_preflight.py
```

---

## 5. Custom domains

In Railway, _Settings_ → **Networking** → **Custom Domain** for each service:

- `api.zippylawnz.com` → API service
- `app.zippylawnz.com` → web service (or apex `zippylawnz.com`)

Add the DNS CNAMEs Railway tells you to. Then update:

- `NEXT_PUBLIC_API_BASE_URL` (web)
- `API_CORS_ORIGINS` (api)
- `PUBLIC_APP_URL` (api)
- Clerk dashboard → **Authorized origins** + **Redirect URLs**:
  - `https://app.zippylawnz.com`
  - `https://app.zippylawnz.com/sign-in`
  - `https://app.zippylawnz.com/sign-up`
  - `https://app.zippylawnz.com/me`
  - `https://app.zippylawnz.com/sales/leads`
  - `https://app.zippylawnz.com/admin/mowers`

---

## 6. Auto-deploy + previews

Railway auto-deploys on every push to `main`. To enable PR previews:

- _Settings_ → **Environments** → **+ Add Environment** → **Pull Request**.
- Configure the PR-environment variables (typically: same Clerk dev keys,
  separate Postgres branch, separate Sentry environment).
- Each PR gets its own URL like `web-pr-42.up.railway.app` for E2E checks.

---

## 7. Rollback

In the API or web service: _Deployments_ tab → click an older deployment →
**Redeploy**. The DB migration is forward-only; if a rollback requires a
schema undo, run `alembic downgrade -1` from the API shell **before**
redeploying the older code.

---

## 8. Common issues

| Symptom                                   | Likely cause / fix                                              |
| ----------------------------------------- | --------------------------------------------------------------- |
| API boot fails: `psycopg.OperationalError` | `DATABASE_URL` doesn't start with `postgresql+psycopg://` — Railway's Postgres URL is `postgresql://`, prepend the driver |
| Web boot fails: `ENOENT server.js`        | Dockerfile build context wrong — must be repo root, not `apps/web` |
| Lawn-segment endpoint always returns `fallback_to_manual: true` | `REPLICATE_API_TOKEN` or `SAM2_MODEL_VERSION` unset |
| Email never arrives                        | `RESEND_API_KEY` unset or `from_email` domain not verified      |
| Clerk redirects to `/sign-in` loop         | Authorized origins / redirect URLs not set in Clerk dashboard   |
| 503 from `/readyz` after deploy            | Migration failed on boot — check API logs for the alembic error |

---

## 9. Production checklist (before announcing)

- [ ] All env vars set in both services
- [ ] Custom domains wired with valid SSL
- [ ] `/readyz` returns 200 with `db: ok`
- [ ] `/api/v1/mowers` returns the seeded catalog
- [ ] Clerk sign-in works on the deployed URL
- [ ] An end-to-end assessment completes and creates a lead
- [ ] The sales advisor inbox receives the notification email
- [ ] Sentry shows zero unresolved issues
- [ ] PostHog shows the funnel events firing after cookie consent
- [ ] Lighthouse mobile ≥ 90 on the deployed landing page
