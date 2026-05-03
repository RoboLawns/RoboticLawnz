# syntax=docker/dockerfile:1.7
#
# Combined production image — Next.js web app + FastAPI backend.
#
# Builds both services into a single container. The Next.js server handles all
# external traffic on $PORT (default 3000) and proxies /api/v1/* requests to
# the internal FastAPI server on port 8000.
#
# Local dev still uses separate `pnpm dev` + `uvicorn` processes. This
# Dockerfile is for the single Railway deployment.
#
# Cache busting: bump CACHE_BUST in railway.json build args to force a
# fresh build when Railway's remote cache gets stale.

# ──────────── web builder (Next.js standalone) ────────────
# Must use a glibc-based image (not Alpine) because the runtime stage
# runs on Debian. Native Node modules compiled for musl will not link
# on glibc.
FROM node:20.18-slim AS web-builder

ARG PNPM_VERSION=9.12.0
ARG CACHE_BUST=5

# NEXT_PUBLIC_* vars must be declared as ARG so Next.js can inline them
# during `next build`. Railway env vars are only available at build time
# when declared as ARG in the Dockerfile.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ARG NEXT_PUBLIC_GOOGLE_PLACES_KEY
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_POSTHOG_KEY
ARG NEXT_PUBLIC_POSTHOG_HOST
ARG NEXT_PUBLIC_APP_URL
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Workspace manifests first for best layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

RUN pnpm fetch --prod=false
RUN pnpm install --frozen-lockfile --prefer-offline

# Full source + build.
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    CI=true \
    API_INTERNAL_URL=http://localhost:8000 \
    NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
    NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN \
    NEXT_PUBLIC_GOOGLE_PLACES_KEY=$NEXT_PUBLIC_GOOGLE_PLACES_KEY \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_POSTHOG_KEY=$NEXT_PUBLIC_POSTHOG_KEY \
    NEXT_PUBLIC_POSTHOG_HOST=$NEXT_PUBLIC_POSTHOG_HOST \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

RUN echo "cache bust ${CACHE_BUST}" && pnpm --filter @zippylawnz/web build

# ──────────── api builder ────────────
FROM python:3.12-slim AS api-builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libgeos-dev \
    && rm -rf /var/lib/apt/lists/*

COPY apps/api/ .
RUN pip install --upgrade pip wheel && pip install --prefix=/install --ignore-installed ".[dev]" packaging

# ──────────── runtime ────────────
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PATH="/install/bin:$PATH" \
    PYTHONPATH="/install/lib/python3.12/site-packages"

WORKDIR /app

# System deps: Postgres client lib, GEOS, Node.js (for the web server).
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        libpq5 \
        libgeos-c1v5 \
        tini \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --uid 10001 app

# ── Python API ──
COPY --from=api-builder /install /install
COPY --chown=app:app apps/api/alembic ./apps/api/alembic
COPY --chown=app:app apps/api/alembic.ini ./apps/api/alembic.ini
COPY --chown=app:app apps/api/scripts ./apps/api/scripts
RUN chmod +x /app/apps/api/scripts/start.sh

# ── Next.js standalone output ──
COPY --from=web-builder --chown=app:app /repo/apps/web/.next/standalone ./
COPY --from=web-builder --chown=app:app /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=web-builder --chown=app:app /repo/apps/web/public ./apps/web/public

# ── Start script ──
COPY --chown=app:app scripts/docker-start.sh /app/scripts/docker-start.sh
RUN chmod +x /app/scripts/docker-start.sh

USER app

EXPOSE 3000

CMD ["/app/scripts/docker-start.sh"]
