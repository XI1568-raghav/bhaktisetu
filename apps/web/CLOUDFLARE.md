# Cloudflare Pages Deployment

Cloudflare Pages is a Jamstack hosting platform that runs the Poojly Next.js app on Cloudflare's global edge network (static assets + SSR via Workers with `nodejs_compat`).

## Prerequisites
- Cloudflare account with Pages enabled
- `pnpm` installed
- Node.js 20+

## First-time setup

```bash
cd apps/web
npx wrangler login          # OAuth flow — opens browser
```

Create the Pages project once (via Dashboard or CLI):

```bash
npx wrangler pages project create poojly-web --production-branch main
```

## Deploy

```bash
cd apps/web
pnpm run pages:deploy
```

This runs `@cloudflare/next-on-pages` (which transforms Next output into a Workers-compatible bundle via `.vercel/output/static`) and then ships it to Cloudflare via `wrangler pages deploy`.

For a preview build without deploying:
```bash
pnpm run pages:build
```

For local Pages-equivalent dev server (tests the built worker):
```bash
pnpm run pages:dev
```

## Environment variables

Defaults live in `wrangler.toml` under `[vars]` (non-secret, `NEXT_PUBLIC_*` only). For secrets and per-environment overrides, use the Cloudflare dashboard:

1. Cloudflare Dashboard -> Workers & Pages -> `poojly-web` -> Settings -> Environment variables
2. Add per environment (Production / Preview):
   - `NEXT_PUBLIC_API_URL` = `https://api.poojly.com` (production) or Railway preview URL
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_RAZORPAY_KEY_ID`
3. Click "Encrypt" for anything non-public. Redeploy after changes.

All `NEXT_PUBLIC_*` vars are inlined at build time — so Preview and Production need independent builds to get different values.

See `.env.example` for the complete list.

## Custom domain

In the Cloudflare dashboard, go to your Pages project -> Custom domains -> Set up a custom domain. Enter `poojly.com` (or subdomain like `www.poojly.com`). If the domain is on Cloudflare DNS, Cloudflare auto-configures the CNAME. If hosted elsewhere, add a CNAME record pointing to `<project>.pages.dev`. SSL provisions automatically within a few minutes. For apex domains on Cloudflare DNS, Cloudflare uses CNAME flattening.

## Architecture notes

- The API runs on Railway; the web app talks to it via `NEXT_PUBLIC_API_URL`. No API routes live in `apps/web`, so the Cloudflare deployment only needs to handle static pages and SSR-rendered React Server Components.
- `compatibility_flags = ["nodejs_compat"]` in `wrangler.toml` enables Node.js polyfills so Next/React internals that use `Buffer`, `crypto`, etc., work at the edge without switching route handlers to the edge runtime.
- Image optimization is disabled (`images.unoptimized: true` in `next.config.ts`) because Cloudflare Pages doesn't ship Next's default image optimizer. If optimized images become a requirement, add a custom loader pointing to Cloudflare Images.
- Streaming / `reply.hijack()` are Fastify (API) concepts — they do not apply here because there are no API routes in the web app. All backend work goes through Railway.

## Known issue: Windows + Next 15.5 build

`@cloudflare/next-on-pages` currently has an upstream incompatibility with Next.js `15.5.x` on Windows:

- It spawns `pnpm` directly (not `pnpm.cmd`), causing `ENOENT` on Windows. Workaround: run builds in WSL / Linux / macOS, or in a CI runner (Cloudflare Pages CI is Linux).
- The bundled `@vercel/next` builder (4.16.8) fails with `Unable to find lambda for route: ...` for statically pre-rendered client-only pages under Next 15.5. Status: tracked upstream in `cloudflare/next-on-pages`.

Until both issues are fixed upstream, deploy via the Cloudflare Pages GitHub integration (Linux build runners) instead of from a local Windows machine:

1. Cloudflare Dashboard -> Workers & Pages -> Create -> Pages -> Connect to Git
2. Select the repo, set:
   - Build command: `pnpm --filter @poojly/web run pages:build`
   - Build output directory: `apps/web/.vercel/output/static`
   - Root directory: `/` (monorepo root)
   - Env var: `NODE_VERSION=20`
3. Push to `main` -> automatic deploy.

## Scripts reference

| Script | Purpose |
| --- | --- |
| `pnpm run pages:build` | Build `.vercel/output/static` for Cloudflare Pages |
| `pnpm run pages:deploy` | Build + deploy to Cloudflare Pages |
| `pnpm run pages:dev` | Run built output under wrangler locally |
