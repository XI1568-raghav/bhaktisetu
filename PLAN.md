# Plan: Deploy darshya web to Render (Node free tier) — abandon Cloudflare Workers

## Context / why this path

The OpenNext→Cloudflare Workers migration built green on Linux CI (type-check 0 errors, 186/186 tests, `handler.mjs` produced) but **deploy is blocked**: the OpenNext server-function bundle is **5.3 MiB gzip**, over the **free-tier Workers 3 MiB limit**. Root-caused via the esbuild metafile (`handler.mjs.meta.json`): the bloat is the Next.js server runtime + all 38 dynamic route handlers inlined into one `handler.mjs` (31 MiB raw / 754 modules) — **not** a fixable heavy dep (bundled node_modules is ~1 MiB; `lib/*.ts` data is 2.4 MiB). It's an architecture mismatch: free Workers can't host a 359-page Next app. Paid $5/mo would deploy (5.3 < 10 MiB) but is user-refused. **User chose: Render Node free tier.**

**Key simplification:** On Render Node, **OpenNext is unnecessary** — it only existed to adapt Next for Cloudflare Workers. Render runs Next's native `output: 'standalone'` server (`node server.js`), the standard self-host path. Verified the app uses **zero Cloudflare bindings in production** (no `getRequestContext()`/`cloudflare:` imports in app code — only the dev-only `initOpenNextCloudflareForDev()` helper, which no-ops in prod). So the OpenNext/wrangler files become inert but harmless; no binding migration needed. The API already deploys to Render (`apps/api/Dockerfile` + root `render.yaml`), so this unifies infra on one provider.

## Goal

Get `apps/web` (Next 15, 359 pages) deployed on Render free tier as a Node web service, then cutover `darshya.online` DNS from the existing Cloudflare Pages project to the Render service. End-to-end: a working prod URL serving the real app, verified by curl.

## Facts gathered (all verified)

- **next.config.ts**: `transpilePackages: ['@poojly/ui','@poojly/shared','@poojly/api-client']`, `images.unoptimized: true`, webpack `extensionAlias` (.js→.ts) for workspace pkg NodeNext imports, `typescript.ignoreBuildErrors: true` (real type-check gates via turbo), `productionBrowserSourceMaps: false`, custom `headers()`/`redirects()` (work on Node). **No `output` mode set** → will add `output: 'standalone'`.
- **workspace packages are source-only** (no build scripts, `main: ./src/index.ts`) — handled by `transpilePackages` + `extensionAlias` at web build time. No pre-build needed.
- **Runtime env (server-side)**: `API_URL`, `GITHUB_TOKEN`, `IVS_REPLAY_BUCKET_BASE`. Plus ~18 `NEXT_PUBLIC_*` build-time vars (API_URL, SUPABASE_*, RAZORPAY_KEY_ID, GA_ID, POSTHOG_*, SENTRY_DSN, etc.).
- **Proven Render pattern** (`apps/api/Dockerfile`): `node:20-alpine`, `corepack prepare pnpm@10.33.0`, `pnpm install --frozen-lockfile`, run from workspace dir.
- **root `render.yaml`**: Blueprint v1, currently API-only, `plan: free`, `region: oregon`, path-filtered (`renderBuildFilter`) for free-tier quota.
- **public/ is 27M** — standalone does NOT auto-include it; Dockerfile must copy it into the standalone dir.
- Standalone output: `.next/standalone/apps/web/server.js` + `.next/static` + `public/` (copied). Reads `PORT` env (Render sets it).

## Implementation steps

### Step 1 — `apps/web/Dockerfile` (new, mirrors api pattern + standalone)
Single-stage `node:20-alpine`. Copy workspace root files + `apps/web` + `packages` + `tooling`. `pnpm install --frozen-lockfile`. Run `prebuild` (search-index) + `next build` (standalone) in the web dir with `NEXT_PUBLIC_*` baked from build env. Copy `.next/static` + `public/` into `.next/standalone/apps/web/`. Set `NODE_ENV=production`, `WORKDIR /app/apps/web`, `CMD ["node", "server.js"]`. Render injects `PORT`; standalone server binds to it.

### Step 2 — `apps/web/.dockerignore` (new)
Exclude `node_modules`, `.next`, `.open-next`, `.git`, tests, `wrangler`/`.dev.vars` so the build context stays small and no CF secrets leak into the image.

### Step 3 — `next.config.ts`: add `output: 'standalone'`
One-line change. No removal of the OpenNext dev helper / wrangler coupling yet (inert on Render; removing is Step 8 cleanup, post-verify, to keep this change minimal and reversible).

### Step 4 — root `render.yaml`: add the web service
Add a second `- type: web` service (`name: darshya-web`, `env: docker`, `plan: free`, `region: oregon`, `dockerContext: apps/web`, `dockerfilePath: apps/web/Dockerfile`) with its own `renderBuildFilter` (paths: `apps/web/**`, `packages/**`, `package.json`, `pnpm-lock.yaml`, `apps/web/next.config.ts`) so web-only changes don't trigger API rebuilds and vice-versa. Set build-time `NEXT_PUBLIC_*` env from Render dashboard/secrets (these are public/publishable values, not secrets — set as plain env vars; the few secrets like `GITHUB_TOKEN` set as Render secret env at runtime). Keep the API service block as-is.

### Step 5 — CI: add a build-smoke workflow (verify before cutover)
Add `.github/workflows/deploy-web-render.yml` (or extend) that runs on push to the migration branch: build the Docker image (`docker build apps/web`) with the same `NEXT_PUBLIC_*` env CI uses, and smoke-test `node server.js` responds on `/` with 200 + expected HTML. This proves the standalone build boots and serves before any Render push. (Render itself will also build, but CI smoke catches failures faster and gives a log.)

### Step 6 — Create the Render web service + first deploy
Via Render dashboard (manual — I can't create Render services from here without a Render API token): create a web service from the repo/branch using the Blueprint (or the `apps/web` Dockerfile), free plan, oregon. First build + deploy produces a `*.onrender.com` URL. I'll capture that URL and verify it (curl `/`, `/aarti/[a-slug]`, `/api/orchestrator-status`, `/sitemap.xml`, the `/kundli`→`/astrology/kundli` redirect).

### Step 7 — Verify the `*.onrender.com` deploy end-to-end
Curl the Render URL: home 200, a content/[slug] SSG page 200, the orchestrator-status API route 200, sitemap.xml/feed.xml/robots.txt 200, `/kundli` → 301/302 to `/astrology/kundli`, static assets (`/_next/static/*`, `/public` images) 200. Confirm cold-start behavior (free tier sleeps after 15 min idle). This is the Stage-A equivalent — proving the artifact works before touching prod.

### Step 8 — DNS cutover `darshya.online` → Render (Stage B)
`darshya.online` is currently proxied through Cloudflare pointing at the CF Pages project (`poojly-web.pages.dev`). Cutover = repoint the `darshya.online` A/AAAA (or CNAME) record from the Pages project to the Render service (`*.onrender.com`). On Cloudflare this is a DNS edit (dashboard, since no local CF token) — set the apex + www to the Render hostname, keep orange-cloud proxy off initially (Render needs to terminate TLS / prove domain ownership via a CNAME or added domain), then enable Render's custom domain (`darshya.online` + `www.darshya.online`) which issues the cert. Verify prod: curl `https://darshya.online` serves the Render app (different `Server:` header than the old CF Pages), re-check the routes above on the real domain. This is the one outward-facing/irreversible step — sequence it after Step 7 is green, and it's reversible (repoinit DNS back to Pages).

### Step 9 — Post-verify cleanup + docs
Once prod is verified on Render: remove the now-dead OpenNext coupling from `next.config.ts` (`initOpenNextCloudflareForDev` import + call), decide whether to delete `apps/web/wrangler.jsonc`/`open-next.config.ts`/`cloudflare-env.d.ts`/`cf:*` scripts (keep for one cycle in case of rollback, then remove). Update `docs/cf-worker-budget.md` + `docs/cloudflare-pages-migration.md` to record the Render cutover and the OpenNext-free-limit finding. Update memory. Retire the old `deploy-web.yml` (CF Pages) workflow or mark it disabled.

## What I can do autonomously vs. needs you

- **I do (autonomous):** Steps 1–5 (Dockerfile, .dockerignore, next.config standalone, render.yaml, CI smoke workflow) + commit/push + run CI smoke + verify the `*.onrender.com` URL once it exists.
- **Needs you (manual, no Render/CF token here):** Step 6 creating the Render web service (dashboard — or give me a `RENDER_API_KEY` to do it via API), and Step 8 the DNS cutover on Cloudflare (dashboard — or give me the `CLOUDFLARE_API_TOKEN` locally to do it via API). I'll give exact click-by-click for both, and verify immediately after you act.

## Verification / done criteria (no summary-field claims)

- CI smoke workflow green: Docker image builds + `node server.js` returns 200 on `/`.
- `*.onrender.com` URL: home + a [slug] SSG page + the API route + sitemap/feed/robots + the redirect all return expected status codes (curl, real output).
- After cutover: `curl -sI https://darshya.online` shows the Render origin (not CF Pages), and the same route set passes on the real domain.
- Type-check + 186 tests still green on CI.
