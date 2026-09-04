# Single-stage build — Next.js standalone output, runs `node server.js`.
# Migrated from @opennextjs/cloudflare (Workers) 2026-07-07: the OpenNext
# server-function bundle (5.3 MiB gzip) exceeded the free Workers 3 MiB limit;
# the app uses no Cloudflare bindings in production, so it self-hosts on Render
# Node free tier via Next's native `output: 'standalone'`. Mirrors the proven
# apps/api/Dockerfile pattern (node:20-alpine + corepack pnpm).
FROM node:20-alpine
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy workspace root + web + shared packages + tooling.
# Workspace packages (@poojly/ui, shared, api-client) are source-only — Next's
# transpilePackages + webpack extensionAlias build them into the web bundle, so
# no per-package build step is needed.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY apps/web ./apps/web
COPY packages ./packages
COPY tooling ./tooling

# The root `prepare` script (package.json) runs on every `pnpm install`, this one
# included, and it is `node scripts/install-git-hooks.mjs`. Without this COPY the
# install dies with `Cannot find module '/app/scripts/install-git-hooks.mjs'` and
# the image never builds.
#
# The script itself was written for exactly this context — its header says "THIS
# SCRIPT MUST NEVER FAIL AN INSTALL... includes the Render Docker build, where
# there is no .git directory at all. Every path exits 0." That is true and it is
# not enough: every path INSIDE it exits 0, and the failing path never reaches it.
# The safety was one layer too deep.
#
# Copying the single file rather than `scripts/` keeps the build context small —
# scripts/ also holds the agent fleet and roadmap tooling, none of which the image
# needs. With it present the script does what it was designed to do here: find no
# .git, print a note, exit 0.
COPY scripts/install-git-hooks.mjs ./scripts/install-git-hooks.mjs

# Install all workspace deps (devDeps needed for the build toolchain).
RUN pnpm install --frozen-lockfile --prod=false

# Build the search index (prebuild) then Next in standalone mode.
# NEXT_PUBLIC_* vars are baked into the client bundle at build time and MUST be
# present when `next build` runs. They come in as build args (docker --build-arg
# or Render build env) and are promoted to ENV so the RUN sees them. Only the
# publishable values needed for the client bundle are declared here; real
# secrets are runtime-only and never baked.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_ENV
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_ENV=$NEXT_PUBLIC_ENV
WORKDIR /app/apps/web
RUN pnpm run prebuild && pnpm run build

# Next standalone emits a self-contained server.js at .next/standalone/apps/web
# but does NOT copy static assets or /public — both must be placed next to it
# or the server serves 404s for JS/CSS/images.
#
# A-001 (fixed 2026-08-10): the previous form was
#     cp -r public .next/standalone/apps/web/public
# `cp -r SRC DEST` copies SRC *into* DEST when DEST already exists. Next's
# standalone output already contains a `public/` directory, so every asset
# landed at `public/public/*` — i.e. the whole directory was served one level
# deep. Proven live on prod: `/sw.js` -> 404 while `/public/sw.js` -> 200.
# `.next/static` was unaffected only because that destination does NOT
# pre-exist, which is why JS chunks worked and favicon/manifest/sw/og did not.
#
# Consequences while broken: the service worker never registered (offline page
# and web-push both dead), the PWA manifest 404'd (no install prompt), and every
# OG/social preview image was missing.
#
# `cp -a SRC/. DEST/` copies the CONTENTS of SRC into DEST and is correct
# whether or not DEST exists, so this cannot silently re-nest. mkdir -p makes
# the destination explicit. The post-copy assertion checks a known sentinel file
# at its FINAL served path, so a regression fails the BUILD instead of shipping
# a 404-serving image again.
RUN set -eux; \
    test -d .next/static; \
    test -d public; \
    test -f public/manifest.json; \
    mkdir -p .next/standalone/apps/web/.next/static .next/standalone/apps/web/public; \
    cp -a .next/static/. .next/standalone/apps/web/.next/static/; \
    cp -a public/. .next/standalone/apps/web/public/; \
    test -f .next/standalone/apps/web/server.js; \
    test -f .next/standalone/apps/web/public/manifest.json; \
    test -f .next/standalone/apps/web/public/sw.js; \
    test ! -e .next/standalone/apps/web/public/public

# Runtime: Render injects PORT (the standalone server binds to it) AND sets
# HOSTNAME to the pod's hostname (e.g. srv-...-hibernate-...). Next.js
# standalone server.js reads process.env.HOSTNAME and, if set, binds ONLY to
# that interface — so Render's proxy, which scans 0.0.0.0 for the open port,
# sees "No open HTTP ports detected on 0.0.0.0" and returns 502 Bad Gateway
# even though the app is "Ready" (diagnosed via /v1/logs on darshya-web,
# 2026-07-08). Force HOSTNAME=0.0.0.0 so Next binds all interfaces and
# Render's port scan succeeds.
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
EXPOSE 10000
WORKDIR /app/apps/web/.next/standalone/apps/web
CMD ["node", "server.js"]
