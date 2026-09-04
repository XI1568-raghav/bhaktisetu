# CTO audit — Darshya

> Author: CTO. Date: 2026-04-27. Honest engineering snapshot for the founder.
> No fabrication. Every claim cites file:line; gaps are marked `[UNKNOWN]`.

> **Correction 2026-09-02 (`OPS-10`).** §1, headed "System architecture (verified)", stated that the web front end **"is deployed to Cloudflare Pages and serves `darshya.online`"**, and §4 cited a missing **"CF Pages perf snapshot"**. Cloudflare Pages has not served the web tier since the **2026-07-08 cutover**: the web tier is the Render Docker service **`darshya-web`, region `oregon`**, running Next standalone on Node (`render.yaml:52-60`), and Cloudflare is **DNS + edge proxy only** — no Pages project, no `next-on-pages`, no edge-runtime constraint. Both Render services are `region: oregon` and `autoDeploy: false`. Note also that the Stripe rail referenced elsewhere in this repo was **deleted from the codebase on 2026-08-11** (`apps/api/src/lib/env.ts:45-46`); Razorpay is the only live gateway and settles **INR only**, with no replacement international processor chosen.

---

## 1. System architecture (verified)

Single Turborepo monorepo (`pnpm-workspace.yaml`, `turbo.json`). The web
front end (`apps/web`, Next.js 15 / React 19) runs as the **Render Docker
service `darshya-web`, region `oregon`, Next standalone on Node**
(`render.yaml:52-60`) and serves `darshya.online`; **Cloudflare is DNS +
edge proxy only** — there is no Pages project, no `next-on-pages` build and
no edge-runtime constraint. *(Corrected 2026-09-02, `OPS-10`: this paragraph
used to read "is deployed to Cloudflare Pages and serves `darshya.online`".
Pages stopped serving the web tier at the 2026-07-08 cutover —
`docs/render-web-cutover-runbook.md`, `.github/workflows/cf-kill-zombie.yml`.)*
The API (`apps/api`, Fastify 5) is
deployed to Render free tier at `api.darshya.online`, also region `oregon`
(`render.yaml:15`); both services carry `autoDeploy: false` (`render.yaml:28`,
`:60`), so a git push deploys nothing. It boots through `apps/api/src/server.ts:55`,
registering 31 route groups under `/api/v1/*`, with helmet (CSP off,
`server.ts:57-60`), CORS allowlist from `CORS_ORIGIN` (`server.ts:61-70`),
global rate-limit 100/min (`server.ts:71-74`), and per-route `rawBody`
opt-in (`server.ts:80-85`). Postgres + pgvector are on Supabase (pooler,
port 6543); Prisma is the only ORM (`prisma/schema.prisma:1-8`).
Object storage swapped from Cloudflare R2 to Supabase Storage but the
adapter is still named `lib/r2.ts` (`docs/launch-state.md:84`). AI is
Groq (Llama 3.3 70B); embeddings are Cohere; daily cron runs from
GitHub Actions because Render free has no scheduler. Two declared
"apps" are not real: `apps/admin` is an empty shell whose build script
literally echoes `"build: ok (empty shell)"`
(`apps/admin/package.json:9`), and `apps/mobile` is mock-only per
`CLAUDE.md:19`.

## 2. Launch blockers

| Tier | Issue | File:line | Why it embarrasses us |
|---|---|---|---|
| **P0** | Razorpay webhook still uses non-cryptographic `JSON.stringify` HMAC by default; raw-body path is opt-in behind `RAZORPAY_VERIFY_RAW=true`. | `apps/api/src/routes/payments.ts:125-139` | Webhook signature is forgeable in pathological JSON cases. Already in `docs/security-pass-2026-04-27.md` row 1, gated. Flip the flag after a Razorpay test-mode webhook ack. |
| **P0** | Donations persist in an in-memory `Map<string, DonationStore>`. When Render's worker restarts (it does, daily on free tier) every in-flight donation row vanishes — including 80G receipt traceability. | `apps/api/src/routes/donations.ts:46` | Tax-receipted money tracked in RAM. Promote to a Prisma `Donation` table. |
| **P0** | `apps/admin` is a phantom — no `app/` folder, no real build. The "admin dashboard" surface listed in `CLAUDE.md:21` does not exist. | `apps/admin/package.json:9`; no `apps/admin/app/` | Internal ops cannot moderate temples / approve priests / refund bookings without it. |
| **P1** | Eight portal pages render hardcoded mock arrays as if they were real data. | `apps/web/app/admin/users/page.tsx:32`; `astrologer-portal/consultations/page.tsx:37`; `wellness-portal/students/page.tsx:32`; `temple-portal/donations/page.tsx:32`; `store-admin/reviews/page.tsx:23`; `settings/subscription/page.tsx:23-35`; `settings/earnings/page.tsx:27-47`; `priest/reviews/page.tsx:23` | A signed-in temple manager visiting their donations page sees fake names. Either wire to API or hide behind a "Coming soon" state. |
| **P1** | `pujas/[slug]/book` builds slot availability from a `mockSlots` array. | `apps/web/app/pujas/[slug]/book/page.tsx:411` | Devotee can "book" a fictional slot. Drives an immediate refund event. |
| **P1** | Demo-pay endpoint can mint real `PujaBooking` rows; gate is correct (`ENABLE_DEMO_PAY` + 10/10min bucket) but only if Render env var is set. | `apps/api/src/routes/demo-pay.ts:34-74` | If env var unset on next redeploy, free bookings flow back open. Set `ENABLE_DEMO_PAY=false` explicitly today. |
| **P1** | CSP entirely disabled. | `apps/api/src/server.ts:58` | Any reflected-XSS becomes account takeover. Real fix needs script-source inventory (PostHog, CF, Razorpay, Jitsi). |
| **P2** | Chat send and demo-pay rate limits are in-memory `Map`s — single-instance only. | `apps/api/src/routes/conversations.ts:49`; `demo-pay.ts:45` | Free-tier Render is single-instance today, so this works. The day we scale to two workers, both limits silently double. Move to Upstash Redis. |
| **P2** | `pnpm audit --prod` reports 23 vulns (6 high `tar`, 5 high `xmldom`, 1 critical `protobufjs`) — all in expo build chain only, not deployed. | `docs/security-pass-2026-04-27.md:22-38` | Add `pnpm audit --prod --audit-level high` to CI to catch a regression that crosses into runtime. |

## 3. Tech debt accruing interest

| Debt | Cost it pays |
|---|---|
| `apps/api/src/lib/r2.ts` is now a Supabase Storage adapter but keeps its R2 name (`docs/launch-state.md:84`). | Every new contributor needs the lore. |
| Demo accounts ship as real seeded UUIDs in production DB. Map lives in `apps/api/src/middlewares/auth.ts` DEMO_ROLE_MAP. | Anyone who learns `demo123` can authenticate as ADMIN. The chip-hiding gate is UX only. Demo branch is now gated by `NODE_ENV !== 'production' \|\| ALLOW_DEMO_TOKENS=true`. |
| Prisma migrations are run manually from a laptop with prod `DATABASE_URL` exported. | One missed `migrate deploy` and we ship a build whose code expects columns the DB doesn't have. |
| Daily cron lives in `.github/workflows/daily-cron.yml`. | If GitHub Actions has an outage on a launch day, panchang push and any scheduled puja reminders silently miss. No alerting. |
| Synthetic IDs (`demo-*`, `anon-*`) are special-cased throughout `services/ai.service.ts` and `middlewares/auth.ts` because Prisma `@db.Uuid` rejects them. | Every new persisted entity needs the same special-case branch or we get random 500s for demo/anon users. |
| `helmet({ contentSecurityPolicy: false })` (`server.ts:58`). | Permanent XSS multiplier until inventoried. |

## 4. Performance posture

| Metric | Value | Source |
|---|---|---|
| API cold start | ~30 s on Render free | known Render free-tier behavior |
| API p50 / p95 latency | `[UNKNOWN]` | No APM dashboard wired; Sentry tracks errors only |
| Web TTFB | `[UNKNOWN]` | No perf snapshot recorded for the Render web service `darshya-web` *(corrected 2026-09-02, `OPS-10`: this cell said "No CF Pages perf snapshot recorded"; Cloudflare Pages has not served the web tier since the 2026-07-08 cutover, so a Pages snapshot would measure nothing — `render.yaml:52-60`)* |
| DB p95 query time | `[UNKNOWN]` | Supabase observability not in `docs/` |
| Embeddings hit-rate vs LIKE-fallback | `[UNKNOWN]` | `routes/semantic-search.ts` logs mode but no aggregate |

**Cheap measurement to run this week**: add a 3-line preHandler hook in
`server.ts` that logs `{ route, duration_ms }` to `request.log.info`,
push 24 h to Logflare/Better Stack free tier (or grep Render logs),
plot p50/p95 per route. Fifteen minutes of work; tells us which routes
need indexing before a launch surge.

## 5. Engineering throughput risk (solo dev)

| Failure | Mitigation today | Gap |
|---|---|---|
| Laptop dies | Code on GitHub | Prod `DATABASE_URL`, Razorpay live secret, VAPID private key live in `.env` files on the laptop. Rotate to a 1Password vault + recovery list before Day 7. |
| DB pwned / dropped | Supabase nightly backups (default) | We have not tested a restore. Run a dry-run restore into a staging Supabase project. |
| Render free-tier hibernation | Health check 200 within 60 s | First request after sleep is the 30 s cold start. A user who clicks a magic-link email at 3 a.m. waits half a minute. Mitigation: `cron-keepalive` ping every 14 min from the same GitHub Actions runner that already runs daily. |
| Founder hit by a bus | None | No second engineer has push access; no ops runbook beyond `docs/`. |
| Razorpay webhook secret rotates | Manual re-paste on Render env. | One missed paste = silent payment failures. Add a heartbeat job that fires a self-test webhook weekly. |

## 6. Top 3 things to do this week

1. **Promote donations from `Map` to Prisma table.** `apps/api/src/routes/donations.ts:46`. Money in RAM is unacceptable; one Render restart corrupts the 80G audit trail.
2. **Flip `RAZORPAY_VERIFY_RAW=true` after a Razorpay test webhook validates the new path.** `apps/api/src/routes/payments.ts:125`. Until then we have a payment HMAC that is technically forgeable.
3. **Hide or wire the eight mock-data portal pages.** Start with `apps/web/app/admin/users/page.tsx:32` and `apps/web/app/temple-portal/donations/page.tsx:32` — the two surfaces where a non-technical operator is most likely to log in and screenshot a bug onto Twitter.

## Confidence

Two lowest-confidence claims and what would raise that confidence:

1. **"23 dependency vulns are all build-time only, none deployed."** Source is the security pass doc; I did not re-run `pnpm audit --prod` and trace each `tar`/`protobufjs` advisory to its consumer. Adding `pnpm why <pkg>` output for each high/critical row to `docs/security-pass-2026-04-27.md` would close it.
2. **"`apps/admin` is fully phantom, no real surface."** I confirmed `package.json` is an empty-shell stub and there is no `apps/admin/app/` directory, but I did not grep the rest of the repo for an alternative admin surface (e.g. an `/admin/*` segment under `apps/web`). A repo-wide `grep -R "admin-portal\|/admin/"` plus a list of admin-only routes in `apps/api/src/routes/admin.ts` would either confirm the gap or surface that admin lives inside `apps/web` after all.
