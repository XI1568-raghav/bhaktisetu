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
# or the server serves 404s for JS/CSS/images. Copy them in.
RUN cp -r .next/static .next/standalone/apps/web/.next/static \
 && cp -r public .next/standalone/apps/web/public

# Runtime: Render injects PORT (the standalone server binds to it).
ENV NODE_ENV=production
EXPOSE 3000
WORKDIR /app/apps/web/.next/standalone/apps/web
CMD ["node", "server.js"]
