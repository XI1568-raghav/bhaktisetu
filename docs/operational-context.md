# Operational Context — Darshya

> Single doc for every external service, credential location, deploy mechanism, cron, storage, domain, and account.
> Goal: post-`/clear` "continue" works without re-asking. Last updated 2026-05-21.
>
> Authoritative sources still:
> - **`docs/runbooks/prod-rollback.md` — how production is deployed AND rolled back. Read it
>   before you touch a deploy.** Corrected 2026-09-01 (`OPS-06`): several lines in this file
>   used to say the Render services auto-build on push and that the rollback is a Cloudflare
>   DNS repoint. Neither is true and both have been rewritten below.
> - `docs/env-vars.md` — every env var + behavior when absent
> - `docs/deploy-runbook-2026-04-28.md` — Render dashboard steps
> - `docs/cf-pages-env-wiring-2026-05-13.md` — Sentry+PostHog CF Pages wiring
> - `docs/activation-gates.md` — U1-U15 user-action blockers
> - `docs/auth-model.md` — token formats + demo accounts
> - `docs/caveats.md` — architectural gotchas
>
> This doc = consolidated index. When in doubt, read source.

---

## 1. Git + GitHub

| Item | Value |
|---|---|
| Remote | `https://github.com/XI1568-raghav/bhaktisetu.git` |
| Branches | `main` (prod) + `rebrand/darshya` (force-synced mirror) |
| Render watches (web + API) | `main` |
| CF Pages auto-deploys | **KILLED 2026-07-08** (zombie disabled via `cf-kill-zombie.yml`; last deploy frozen — **not** a usable rollback, see §3) |
| HEAD (verified 2026-05-21) | `a5e9542` |

**Push policy**: agents don't push. Main thread commits + pushes.

**Pushing to `main` deploys NOTHING** (corrected 2026-09-01, `OPS-06` — this line previously
said both Render services auto-build on push). `render.yaml` sets `autoDeploy: false` on the
API (`:28`) and the web (`:60`), and there is no deploy-on-main workflow: `deploy-web-render.yml`
is a Docker smoke build that never touches a Render service, and `render-cutover.yml` is a
one-shot July migration. The only thing that changes what production runs is a
`workflow_dispatch` on `.github/workflows/render-diag.yml`:

```bash
gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f branch=main   # deploy HEAD
gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f commit=<SHA>  # ROLL BACK
```

`branch` is accepted but **Render ignores it** (its create-deploy API takes `commitId`, not a
branch), so the first form redeploys whatever the service's tracked branch already points at —
which is what you want for "ship what just merged" and is useless for a rollback. `-f commit=<SHA>`
is the rollback lever. Full procedure, including the API-vs-web decision table and the
suspension case that is *not* a code fault: **`docs/runbooks/prod-rollback.md`**.

Consequence worth internalising: `git revert && git push` leaves the exact same bytes serving
traffic. Reverting is still correct for the repo's history — it is simply not a deploy.

---

## 2. Render (API host)

- **Service**: `bhaktisetu` (older runbook calls it `darshya-api` — same service)
- **URL**: `https://api.darshya.online`
- **Port**: 10000
- **Build**: `pnpm install && pnpm --filter @poojly/api build`
- **Start**: `pnpm --filter @poojly/api start`
- **Env vars set via**: Render Dashboard → service → Environment tab → Save → service auto-redeploys
- **Deploy / roll back**: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d7mc2n8sfn5c73dfce0g -f branch=main`
  (add `-f commit=<SHA>` to roll back to a specific commit). A push to `main` deploys nothing —
  `autoDeploy: false` at `render.yaml:28`. Procedure: `docs/runbooks/prod-rollback.md`.
- **Manual deploy (dashboard alternative)**: Dashboard → Manual Deploy → Deploy latest commit.
  Equivalent to the `branch=main` form above; needs dashboard access, which CI and agents do not have.
- **Smoke endpoints**: `/health`, `/api/v1/providers/pandit`
- **Free-tier cron disabled** — use external pingers (§9)

---

## 3. Web host — Render (`darshya-web`) — cutover 2026-07-08

- **Service**: `darshya-web` (`srv-d970l2ks728c738fc33g`) — docker, free, oregon
- **URL**: `https://darshya-web.onrender.com` → custom domains `darshya.online` + `www.darshya.online` (CNAME, CF DNS proxied)
- **Origin**: Next standalone `apps/web/Dockerfile` (`ENV HOSTNAME=0.0.0.0` — Render port scan needs 0.0.0.0, not pod hostname, else 502)
- **Deploy**: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g -f branch=main`.
  **Not** on push — `autoDeploy: false` at `render.yaml:60`. (This line previously said Render
  auto-deploys on main push; corrected 2026-09-01, `OPS-06`.)
- **Env vars baked at build**: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ENV`, `API_URL` (set in `render-cutover.yml` Step A1 + `render.yaml`)
- **Apply env changes**: Render dashboard → darshya-web → Environment → Save (triggers rebuild); or re-fire `render-cutover.yml` (idempotent — reuses service)
- **Cold start**: free tier sleeps after 15 min idle, ~30–50s first hit — B3 smoke + `render-diag` warm-retry handle this
- **CI smoke**: `.github/workflows/deploy-web-render.yml` (9 checks incl. 2 `[slug]` prerendered body-marker)
- **Operational telescope**: `.github/workflows/render-diag.yml` — modes `deploy` | `logs2` | `cftoken`
- **Runbook**: `docs/render-web-cutover-runbook.md`
- **Rollback**: `gh workflow run render-diag.yml -f mode=deploy -f sid=srv-d970l2ks728c738fc33g -f commit=<SHA>`
  — see `docs/runbooks/prod-rollback.md`. **Do NOT repoint DNS to `darshya.pages.dev`.** That was
  this line's instruction until 2026-09-01 (`OPS-06`) and it was only ever valid during the July
  cutover window: the Cloudflare Pages build behind it has been frozen since 2026-07-08, so it is
  months of missing pages against the current API contract, and the project may already have been
  deleted in post-cutover cleanup. `docs/render-web-cutover-runbook.md:30` retracted the same
  instruction on 2026-08-20; this file was the copy that survived.

### 3b. Cloudflare — DNS + edge proxy only (NOT a build host)
- **Role post-cutover**: DNS for `darshya.online` zone + orange-cloud edge proxy on apex/www (`server: cloudflare` + `x-render-origin-server: Render` in prod headers). CF provisions the edge cert.
- **CF Pages project `darshya`**: auto-deploy DISABLED 2026-07-08 (`cf-kill-zombie.yml`). Last deploy frozen. **It is not a rollback target** — see §3. **No build pipeline, no 500/mo quota, no `next-on-pages`, no edge-runtime constraints.**
- **CF API token in GH secret `CLOUDFLARE_API_TOKEN`**: must have **Account·Pages·Edit** + **Zone·Zone·Read** + **Zone·DNS·Edit** on `darshya.online`. Verify via `render-diag.yml` `cftoken` mode (prints token ID + DNS GET 200 vs 403). Current token ID: `a890cf5fe88921d35a270fe46e05be09`. Old token `f5fbb661c60a9767c8f45d9c2cef07fb` unused → revoke in dashboard.
- **WebFetch returns 403 on `darshya.online`** (CF edge blocks bot UAs) — use `curl` from CI/`render-diag`, not WebFetch.

---

## 4. Supabase (DB + Auth + Storage)

| Item | Value |
|---|---|
| Project ref | `hlkvfarvfblhzhhnhtbp` (name: `poojly`) |
| Dashboard | `https://hlkvfarvfblhzhhnhtbp.supabase.co` |
| Region | `aws-1-ap-northeast-1` (Tokyo) |
| Pooler | `aws-1-ap-northeast-1.pooler.supabase.com:5432` |
| `DATABASE_URL` | pooled (pgBouncer) — runtime |
| `DIRECT_URL` | direct (no pooler) — migrations only |
| Storage bucket | `darshya-media` |
| Storage adapter | `apps/api/src/lib/r2.ts` (name legacy; it IS Supabase Storage) |
| Browser keys | `poojly_session`, `poojly_user` (immutable — rename = mass logout) |

**Dashboard "Last migration: No migrations" is cosmetic** — we use `prisma db execute` which bypasses `_prisma_migrations` tracker. Verify schema via `apps/api/scripts/check-prod-tables.mjs`, not the dashboard.

### Migration workflow

```bash
set -a; . ./.env.production; set +a
npx prisma db execute --url "$DIRECT_URL" --file prisma/migrations/<dir>/migration.sql
node apps/api/scripts/check-prod-tables.mjs   # verify
```

Migrations MUST be idempotent (`IF NOT EXISTS`, `DO $$ ... $$`). If "relation X already exists" → tables on prod via direct DDL → skip. Detail in memory `reference_prisma_db_execute_prod_migrations`.

---

## 5. Domains + email

| Surface | Domain | Host |
|---|---|---|
| Web | `darshya.online` + `www.darshya.online` | Render `darshya-web` (CF DNS proxy edge) |
| API | `api.darshya.online` | Render `bhaktisetu-api` |
| Admin | path on web | `darshya_admin_session` cookie + `ADMIN_DASHBOARD_TOKEN` env |

**Email**:
- Inbound: Hostinger root MX → `support@darshya.online`
- Outbound: Resend on `send.darshya.online` SUBDOMAIN (separate SPF/DKIM)
- **DO NOT touch root MX** when configuring Resend records

---

## 6. Payments

### Razorpay (domestic)
- Live keys: Render env `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`
- Web fallback: `rzp_test_demo` when unset
- **KYC pending — gate U1**. Until U1: keep `ALLOW_DEMO_PAYMENTS=true` on Render (gate U15)
- HMAC verify uses `|` separator
- `RAZORPAY_VERIFY_RAW` default `true` → needs `fastify-raw-body` plugin
- **Do not touch live keys** without explicit user instruction

### Stripe (NRI)
- Keys: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Render; `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` on CF Pages
- **KYC pending — gate U2** (US/UK/CA/AU)
- Current flow: Stripe Checkout URL redirect (works)
- TODO E9: embedded Stripe Elements for clientSecret-only fallback

---

## 7. Push notifications

| Channel | Env var | Where | Gate |
|---|---|---|---|
| FCM (native) | `FCM_SERVER_KEY` | Render | U5 — user paste from Firebase |
| Web push | `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | Render | already wired |
| APNs (iOS native) | inside FCM | — | blocked by U3 Apple Dev Program |

Env-or-noop: missing key → push silently skipped, no crash.

---

## 8. Observability

| Service | Env var | Where |
|---|---|---|
| Sentry API | `SENTRY_DSN` | Render |
| Sentry web | `NEXT_PUBLIC_SENTRY_DSN` | Render web `darshya-web` (build-time bake) |
| PostHog | `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com` | Render web `darshya-web` (build-time bake) |
| CF Web Analytics | `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN` | n/a — CF beacon was CF-Pages-injected; verify post-Render or drop |

DSN/key paste = gates U6 (Sentry) + U8 (PostHog). Verify via DevTools network tab post-deploy.

---

## 9. Cron + scheduled jobs

Render free tier = no native cron. External pingers:

| Service | Path | Token |
|---|---|---|
| HetrixTools (primary) | `GET /api/v1/admin/cron/tick?token=<CRON_AUTH_TOKEN>` | `CRON_AUTH_TOKEN` env (Render) |
| HetrixTools regions | Mumbai + Singapore + Frankfurt | 1-min interval |
| cron-job.org (fallback) | `POST /api/v1/admin/jobs/daily-ops` | same token |

---

## 10. Other integrations

| Service | Env var | Purpose | Behavior if absent |
|---|---|---|---|
| Resend | `RESEND_API_KEY` | transactional email | dev fallback log only |
| Groq | `GROQ_API_KEY` | AI Pandit chat | endpoint 503 |
| Cohere | `COHERE_API_KEY` | semantic search rerank | falls back to keyword |
| WhatsApp Meta Cloud | `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` | WA blasts | gate U7 (verification) |
| Reddit | `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | community ingest | feature off |
| Redis | `REDIS_URL` | cache | gate U14 — Upstash free tier paste |
| Magic-link | `MAGIC_LINK_SECRET` | HMAC for `email-*` tokens | links 500 |
| Medusa | `MEDUSA_BACKEND_URL` + `MEDUSA_PUBLISHABLE_KEY` | e-commerce | store endpoints 503 |

**Required (no fallback)**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Missing → API boot fails.

---

## 11. Auth model (summary)

Full detail in `docs/auth-model.md`. 3 token formats handled by `apps/api/src/middlewares/auth.ts` (order matters):

1. `email-<uuid>-<32hex>` → magic-link session
2. `demo-*` → 8 hardcoded demo accounts (password `demo123`)
3. else → Supabase JWT verify

Web stores session in cookies + `poojly_session` localStorage. Mobile uses `expo-secure-store`.

### Demo accounts (all password `demo123`)

`devotee@demo.com` · `pandit@demo.com` · `store@demo.com` · `astro@demo.com` · `wellness@demo.com` · `gaushala@demo.com` · `temple@demo.com` · `admin@demo.com`

Demo-token branch gated by `NODE_ENV !== 'production' || ALLOW_DEMO_TOKENS === 'true'`. Gate U11: unset `ALLOW_DEMO_TOKENS` on Render after demo period.

---

## 12. Mobile (Expo 50)

- Pkg name: `@poojly/mobile`
- Env: `EXPO_PUBLIC_API_URL` (LAN IP for Expo Go testing)
- iOS native build: blocked by U3 (Apple Dev Program $99/yr)
- Play Store APK: blocked by U4 (Google Play Console $25)
- Push: needs U5 (FCM key)
- Real payments: need U1/U2 (currently mocks success)
- Deep linking `poojly://` scheme: Phase 5 stretch, not started

Phase 1-5 of `docs/mobile-plan.md` substantially shipped (verified 2026-05-13). Detail in `docs/future-plans.md`.

---

## 13. Standing constraints (verbatim — carry across sessions)

- **Resend key `re_***REMOVED***` LEAKED** — user must rotate. Runbook `docs/security-rotation-2026-05-13.md`.
- **Do not rename** `poojly_*` storage keys, `package.json name`, package names (`@poojly/api|web|admin|mobile`). (CF project `darshya` is post-cutover frozen — not renamed, not deployed.)
- **Do not WebFetch** `darshya.online` (CF edge 403 on bot UA — use `curl` from CI / `render-diag`).
- **Do not touch** Razorpay/Stripe live keys without explicit instruction.
- **Do not enable** `ALLOW_DEMO_PAYMENTS` or any test/skip-payment branch beyond gate U15.
- **Do not change** Prisma schema in agent runs unless absolutely necessary — prefer `Json?` + raw SQL `CREATE TABLE IF NOT EXISTS`.
- **Agents don't run** `pnpm install`, don't push to git. Main thread owns verify + commit + push.
- **`useSearchParams()`** consumers in static-prerender pages MUST be wrapped in `<Suspense>` at parent (Next 15 prerender bails otherwise).

---

## 13b. Monitoring + paging (UptimeRobot)

| Item | Value |
|---|---|
| Provider | UptimeRobot (free tier, 50 monitors, 5min interval) |
| Account owner | Founder |
| Monitors | 4 (api-health, www-root, www-pujas, api-health-keyword) |
| Public status page | `<PASTE_AFTER_SETUP>` (founder fills after Step 5 of checklist) |
| Escalation | Email always; SMS after 3 failures (15min down) |
| Runbook | [docs/it/uptime-monitors.md](./it/uptime-monitors.md) |
| Setup checklist | [docs/it/uptime-setup-checklist.md](./it/uptime-setup-checklist.md) |
| KPI tracked | `uptime_monitors_active` in `docs/roadmap/_manual-kpis.yml` (target 4) |

---

## 14. Test state (verified 2026-05-21)

| Surface | Tests |
|---|---|
| API | 476/476 green across 35 files |
| Web | 0 app tests; pre-existing tsc errors in `__tests__/*` + `vitest.setup.ts` (missing `@testing-library/react` types) |
| Admin | 0 tests |
| Mobile | 0 tests |

Web test-dep fix when convenient:
```bash
pnpm --filter @poojly/web add -D @testing-library/react @testing-library/jest-dom
```

---

## 15. Post-`/clear` "continue" checklist

After clear, in order:

1. `CLAUDE.md` auto-loads → pulls `PROJECT_CONTEXT.md` + `ROADMAP.md` + `TASKS.md`
2. Glance `TASKS.md` → In progress (empty 2026-05-21) + Recently completed top row (`c9d9288`)
3. Glance `docs/handoff.md` top block (2026-05-21)
4. Lazy-load this doc (`docs/operational-context.md`) when user asks about deploy/keys/services
5. Lazy-load `docs/future-plans.md` when user asks "what's next"
6. Lazy-load `docs/activation-gates.md` when user asks "what's blocking launch"
7. Memory `reference_prisma_db_execute_prod_migrations` autoloads — covers prod migration pattern

**Good-to-go signal**: HEAD `a5e9542`, 476/476 API green, 4 prod migrations applied, no pending engineering claimable without user-paste/KYC.

---

## Public Status Page

- URL: https://darshya.online/status (SSR, revalidates every 60s)
- Source: UptimeRobot free-tier public JSON (`NEXT_PUBLIC_UPTIME_STATUS_URL`)
- Monitors: api-health, web-root, api-temples, web-panchang (4 HTTPS, 5-min interval)
- Runbook: docs/it/uptime-setup.md
- Alert channel: SMS + email to founder phone (UptimeRobot free tier)
