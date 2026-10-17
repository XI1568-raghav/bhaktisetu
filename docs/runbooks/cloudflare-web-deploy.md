# Cloudflare Workers web deploy (apps/web) - PREPARED, NOT DEPLOYED

Status 2026-10-17: tooling and config are in the repo; nothing has been deployed and DNS still points at Render.
Render Docker (`apps/web/Dockerfile`, `next.config.ts`, `build`) is untouched and stays the production path until the DNS switch below.

## What is in the repo
- `apps/web/open-next.config.ts` - OpenNext config; incremental cache = Workers static assets (free, read-only, no ISR revalidation; content changes need a redeploy).
- `apps/web/wrangler.jsonc` - Worker `darshya-web`, assets binding, `nodejs_compat`.
- Scripts (apps/web): `build:cf`, `preview:cf`, `deploy:cf` (the last one uploads to Cloudflare; owner runs it).
- Root `package.json` override `@opennextjs/aws>cookie: ^1.0.2` (the repo-wide `cookie@2` override breaks the OpenNext bundler).
- `generateStaticParams` added to 11 static-data `[slug]` pages (masa, tithi, chakras, hindu-philosophies, hindu-symbols, pancha-bhoota, rudraksha, sacred-mountains/rivers/trees, shakti-peeth) so they prerender instead of rendering per request.

## Measured 2026-10-17 (local `pnpm build:cf`, `wrangler deploy --dry-run`)
- Worker: 46.5 MiB uncompressed (worker.js 45 MiB + resvg/yoga wasm 1.4 MiB), 8.2 MiB gzip. Under the 64 MiB free limit (headroom ~17 MiB).
- Static assets: 24 MB / 993 files in `.open-next/assets`, plus the prerender cache `.open-next/cache` (488 MB, ~2000 files) which `deploy:cf` copies into assets as `cdn-cgi/_next_cache`. File counts are far below the 20,000-per-version cap; the upload is large and slow. Verify with `preview:cf` first.
- Build takes about 4 min. Close any `.open-next` output before running vitest (two suites scan apps/web and fail on the copied public/ tree). Delete `.open-next` after measuring.

## Env vars
Baked at BUILD time (must be set in the shell/CI that runs `build:cf`; they are inlined into client JS and cannot be changed by Worker vars):
`NEXT_PUBLIC_API_URL` (https://api.darshya.online), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ENV` (Dockerfile ARGs; required),
optional: `NEXT_PUBLIC_RAZORPAY_KEY_ID`, `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_FB_PIXEL_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT`, `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_RELEASE`, `NEXT_PUBLIC_UPTIME_STATUS_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_ONBOARDING_V1`, `NEXT_PUBLIC_ALLOW_DEMO_PAYMENTS` (keep unset in prod), `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN`, `NEXT_PUBLIC_{GSC,BING,YANDEX}_VERIFICATION`, `NEXT_PUBLIC_MEDUSA_*`, `NEXT_PUBLIC_API_BASE_URL`.
Note: the CSP in next.config.ts also derives from `NEXT_PUBLIC_API_URL` at build.
Runtime (Worker vars/secrets; all optional, each has a fallback): `API_URL` (server-side API base, falls back to NEXT_PUBLIC_API_URL), `GITHUB_TOKEN` (secret; /api/orchestrator-status), `INDEXNOW_KEY` (secret-ish), `IVS_REPLAY_BUCKET_BASE`, `ENABLE_CSR_MATCH` (keep unset until 80G). The web app holds no other secrets.

## CPU risk (free plan: 10 ms CPU per request)
Static/prerendered pages served from assets cost ~0 CPU. Risks:
1. `/og/puja/[slug]`, `/og/temple/[slug]`, `/og/shloka` (next/og, resvg wasm, fetches a Devanagari font from jsdelivr per cold isolate) - almost certainly >10 ms. Mitigation: pre-render PNGs at build for top puja/temple slugs, or point `og:image` at static images; not implemented (needs a decision on output).
2. Per-request SSR (build output marks them dynamic): `/pujas`, `/pujas/[slug]` (+book, temples), `/store`, `/astrology/[id]`, `/blog/[slug]`, `/panchang`, `/content`, `/deity/[slug]/mantras`, `/consultation/[id]`, `/donations`, `/wellness/classes/[id]`, `/yatra-packages/[slug]`, remaining `[slug]` pages without generateStaticParams. They fetch the API then render large trees; each is a candidate for 10 ms overruns. Mitigation: `generateStaticParams` + static data (done for 11), Cloudflare Cache Rules (edge cache on public GET pages, `s-maxage` is already set for /temples, /pujas, /yatra), or the Workers Paid plan ($5/mo, 30 s CPU) as the real fix.
3. `middleware.ts` runs on every page request (locale cookie + portal gate): small but it counts toward every request's CPU.
4. Free plan 100k requests/day applies to Worker invocations; assets served without the Worker do not count when `run_worker_first` is off (it is off in `wrangler.jsonc`).
Measure before cutover: Workers dashboard > Metrics > CPU time p99, using a `*.workers.dev` URL first.

## Owner steps
1. Cloudflare dashboard > My Profile > API Tokens > Create Token > template "Edit Cloudflare Workers" (account scope = your account, zone scope = darshya.online). Copy the token. Account ID: dashboard > Workers & Pages sidebar (right panel) or the URL.
2. Locally (never commit these): `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...`, plus the NEXT_PUBLIC_* values from the Render `darshya-web` env.
3. `cd apps/web && pnpm build:cf && pnpm preview:cf` - smoke `/`, `/jyotirlinga/somnath`, `/kundli` (308), `/robots.txt`.
4. Secrets: `cd apps/web && npx wrangler secret put GITHUB_TOKEN` (repeat per secret), or Dashboard > Workers > darshya-web > Settings > Variables and Secrets.
5. `pnpm deploy:cf` (first deploy creates the Worker at `darshya-web.<subdomain>.workers.dev`). Test it there fully (login, booking page, Razorpay checkout).
6. Custom domain: Dashboard > Workers > darshya-web > Settings > Domains & Routes > Add > Custom domain `darshya.online`, then `www.darshya.online`. Cloudflare replaces the existing proxied CNAME to `darshya-web.onrender.com` automatically; if it refuses, delete those two CNAME records first (this is the cutover moment, a few seconds of DNS change).
7. Verify prod, Search Console sitemap fetch, API CORS (API must allow the origin; unchanged host so no change expected).
8. Keep Render service `darshya-web` running for 48 h, then suspend.

## Rollback
Dashboard > Workers > darshya-web > Domains & Routes > remove both custom domains, then re-create DNS: `CNAME @ darshya-web.onrender.com` and `CNAME www darshya-web.onrender.com` (proxied, as in `docs/render-web-cutover-runbook.md`). Render was never stopped, so rollback is DNS-only. For a bad Worker version: `npx wrangler rollback` (or Dashboard > Deployments).
