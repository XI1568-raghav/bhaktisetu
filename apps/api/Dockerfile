# Multi-stage build — compiles TS to dist/ then runs node (matches render.yaml:
# `pnpm --filter @poojly/api build` = `tsc` → `pnpm --filter @poojly/api start`
# = `node dist/server.js`). The previous single-stage image ran `npx tsx
# src/server.ts` in prod, dragging the TS compiler + tsx into the runtime image
# and diverging from the Render path that ships `dist/server.js`.
FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace files
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY tooling ./tooling
COPY docs ./docs

# Install deps + generate Prisma client + compile TS → dist/
RUN pnpm install --frozen-lockfile --prod=false
RUN cd apps/api && npx prisma generate
RUN pnpm --filter @poojly/api build

# ── Runtime stage: only what's needed to run compiled JS ────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app

# wget is present on alpine (BusyBox) — used by HEALTHCHECK below. HEALTHCHECK
# hits the liveness probe (/health) which is intentionally cheap + static so it
# never false-negatives under DB/Redis pressure.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages
COPY tooling ./tooling
COPY docs ./docs

# Install deps + generate Prisma client. NOTE: the `prisma` CLI is a
# devDependency (needed for `migrate deploy` at boot), so we can't use
# --prod=true here or `npx prisma migrate deploy` in CMD would have no binary.
# The original image used --prod=false for the same reason. Multi-stage still
# shrinks the image (no tsx/typescript/vitest pulled into runtime because the
# runtime stage reinstalls fresh from the lockfile — but devDeps come along
# with --prod=false; the trade-off is accepted to keep migrate-deploy working).
RUN pnpm install --frozen-lockfile --prod=false
RUN cd apps/api && npx prisma generate

# Copy the compiled output from the build stage
COPY --from=build /app/apps/api/dist ./apps/api/dist

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

# Run as the non-root `node` user (uid 1000, built into node:alpine). The
# previous image ran as root inside the container.
USER node

WORKDIR /app/apps/api
# Apply migrations then serve compiled JS. Matches render.yaml startCommand
# (`prisma migrate deploy && node dist/server.js`). The old image swallowed
# migrate failures with `|| echo 'migrations skipped'` — this path fails hard,
# consistent with the Render start script. A failed migrate must stop the boot,
# not silently serve against a stale schema.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-4000}/health || exit 1
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
