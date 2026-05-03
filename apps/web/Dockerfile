# syntax=docker/dockerfile:1.7
#
# Production image for the ZippyLawnz web app.
#
# Build context MUST be the repo root (so pnpm can resolve the workspace
# packages @roboticlawnz/ui and @roboticlawnz/shared-types). Railway service
# config:
#   - Root Directory: /  (repo root)
#   - Dockerfile Path: apps/web/Dockerfile
#
# The build runs `next build` with `output: "standalone"`; the runtime image
# only carries the standalone server + static assets.

ARG NODE_VERSION=20.18
ARG PNPM_VERSION=9.12.0

# ───────── deps ─────────
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Workspace manifests first — best layer cache.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json

RUN pnpm fetch --prod=false
RUN pnpm install --frozen-lockfile --prefer-offline

# ───────── builder ─────────
FROM node:${NODE_VERSION}-alpine AS builder
ARG PNPM_VERSION
RUN apk add --no-cache libc6-compat \
    && corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

WORKDIR /repo

# Bring in installed node_modules from `deps`, then full source.
COPY --from=deps /repo /repo
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Build only the web app (turbo prunes the dep graph).
RUN pnpm --filter @roboticlawnz/web build

# ───────── runtime ─────────
FROM node:${NODE_VERSION}-alpine AS runtime

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy standalone server (includes traced node_modules), public assets, and
# the prebuilt static `.next/static` directory.
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# `outputFileTracingRoot` puts the standalone server at apps/web/server.js
# relative to the WORKDIR.
CMD ["node", "apps/web/server.js"]
