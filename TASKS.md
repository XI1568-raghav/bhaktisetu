# Tasks — Darshya

> Live ledger. History → `docs/handoff.md`. Completed log → `docs/tasks-history.md`. User gates → `docs/activation-gates.md`. Last trimmed: 2026-10-04.

## Archived blocks (moved verbatim to `docs/handoff.md` → "Archived from TASKS.md 2026-10-04")

- Sign-in/sign-up infinite-spinner P0 (2026-08-11): customer testing showed it does not reproduce; `fetchWithTimeout` hardening shipped. Archived.
- Launch-Readiness Audit + Fix (2026-08-05, EPIC #223): 20 fixed + live; archived. Still-open owner items are under "Open owner/runtime items" below.
- Role-by-Role Revamp "What's DONE" (PRs #225-#235) and key-report links: archived.
- Graft code-graph wiring (2026-08-06, PR #234): archived.
- GTM Phase-0 deliverables narrative and verify cheatsheet (2026-08-07): archived; open items kept below.
- ARE Autonomous Roadmap Engine (2026-06-10): archived.
- 43 older blocks (2026-05-19 → 2026-06-08): archived 2026-08-10.

## HANDOFF Full Audit + Fix Engagement — ✅ COMPLETE 2026-08-11

> Shipped: merged `1715d4d6`, deployed to Render, live-verified. Full detail archived in
> `docs/handoff.md`; master record is [`AUDIT.md`](AUDIT.md) + `docs/audit/`.

**Result:** 57 of 58 findings fixed (the 58th was deploy-only), plus 14 further defects found by an
adversarial review of the fixes themselves — including a P0 that the RV-04 fix had *created* (a second
payout rail live for money the legacy rail already paid) and an ~83x NRI overcharge still live on the
temple booking path. Stripe removed entirely; password reset shipped.

**Baseline that must not regress:** API/web/mobile/api-client `tsc` clean · 1066/1066 API tests (83 files)
· 265/265 web tests (35 files).

**Two load-bearing invariants — do not break:**
1. `Commission.amount` = the PROVIDER's earning, `Commission.percentage` = the PLATFORM's take rate.
   One column, one meaning; derive everything else via `apps/api/src/lib/commission-math.ts`.
2. The two payout rails stay mutually exclusive — `createPriestPayout` refuses when a `Commission`
   already owns the booking. Removing that guard double-pays every pandit.

**Open owner/config actions (outside the repo):**
- **Supabase → Auth → URL Configuration**: add `https://darshya.online/auth/reset-password`. Without it
  Supabase silently substitutes `SITE_URL` and the reset email lands on the homepage.
- **Supabase → Auth → SMTP**: point at Resend. Built-in mailer is 2 emails/hour project-wide, and sign-in/reset
  emails depend on it.
- **Stripe dashboard**: delete the webhook endpoint for `/payments/webhook/stripe` (now 404s).

## Open owner/runtime items (from the 2026-08-05 launch audit; none are code)
- **#196 phone-OTP** — Supabase SMS provider unconfigured (MSG91/Twilio) or hide the Mobile tab.
- **#211 admin panels** — needs a real admin account to click-verify (add owner email to API `ADMIN_EMAILS`).
- **#205 Razorpay live key** — set in Render (currently `rzp_test_demo` fallback).
- **#203/#204 image optimization** — hotlinked Wikimedia/Unsplash images broken, 11–15MB pages; needs self-host vs CDN decision.
- **#216 blog stub**, **#222 UX friction**, **#210 redirect regression** (needs multi-role session).
- QA artifacts to purge from Supabase Users/DB: `qa-audit-probe@gmail.com`, `qa-audit-probe2@outlook.com`, `qa-live-session@gmail.com`, `qa-admin-probe@gmail.com`, `qa-become-probe@example.com`, booking `BS-20260805-T9CHE`, a few `/leads/self-onboard` probes.
- Cautions: concurrent agents write to the repo (run `git status` before `git add -A`); the auto-format PostToolUse hook is disabled on purpose (legacy 1-space files).

## HANDOFF Role-by-Role Revamp + Cross-Cutting Phase 2 (added 2026-08-06)

> The full marketplace revamp: all 7 roles revamped + the #1 cross-cutting item (provider payouts) + Phase-2 batch 2. **All shipped to prod, live-verified.** Read this block FIRST on resume for marketplace/booking/payout work.


### Deploy/migrate procedure (the proven pattern)
1. PR → CI green → `gh pr merge <n> --squash`.
2. Deploy: `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID>`. **API sid = `srv-d7mc2n8sfn5c73dfce0g`, web sid = `srv-d970l2ks728c738fc33g`.**
   The old `branch` input is deprecated and ignored by Render — it selects nothing. To pin a specific
   commit, or to roll back, pass `-f commit=<SHA>` instead.
3. **Migrations do NOT apply on deploy — MEASURED. Apply them by hand, every time.** The repo config says they should: `render.yaml:21` → `pnpm --filter @poojly/api start`; `apps/api/package.json:10` → `prisma migrate deploy && node dist/server.js`. The deployed service does not behave that way. Measured 2026-09-08, twice — the second run pinned with `-f commit=<SHA>` to rule out a branch mismatch: Render polled to **live**, `/health` returned `{"status":"ok","db":"ok"}`, and the same 3 migrations were **still pending afterwards**. Re-measured 2026-09-09 straight from `_prisma_migrations`: those 3 carry `finished_at` 11:43:39–42Z in one ~1 s burst — the timestamps of the MANUAL run, not of either deploy; every applied migration in that table clusters the same way. **Why: PINNED 2026-09-12 by measurement** (`render-diag.yml` in `detail` mode, sampled 2026-09-09 and 2026-09-12). The Render dashboard Start Command for the API is `pnpm --filter @poojly/api exec tsx src/server.ts`. It overrides `render.yaml`, so the start script above is never called and `prisma migrate deploy` never runs (`OPS-19` in `docs/audit/LEDGER.json`). The dashboard also differs from `render.yaml` on region (`singapore`) and, until 2026-10-04, on the Auto-Deploy setting (`OPS-18`: the owner switched the API's off at 06:36Z that day, verified from Render), so treat `render.yaml` as descriptive for this service, not authoritative. Ruled OUT by measurement: a different database (the live API returns exactly the 20 temples in the `DIRECT_URL` DB), a missing migrations directory (all 44 are tracked), and `migrate deploy` failing — `&&` only proceeds on exit 0, and the API is up. **Consequence — the OPPOSITE of a crash-loop: a silent no-op.** A pending migration does not take the API down; the deploy reports green, the schema never moves, and the new code 500s at runtime on columns that were never created. Never infer "migration applied" from a green deploy. **Pre-flight:** `prisma migrate status` (from `apps/api`, `DATABASE_URL=$DIRECT_URL`) is the ONLY authority on what is pending. `apps/api/scripts/verify-migration-objects.mjs --unexecuted` is **not** a pending check — it lists ledger rows with `applied_steps_count = 0`, most of which are fully applied; measured 2026-09-09 it reported 6 and exited 1 while genuinely-pending was 0. Use it only to ask whether specific objects already exist (42P07/42701 "already exists" is the usual killer).
4. **Apply, then redeploy — both, every time.** From `apps/api`: `set -a && . ./.env.production && set +a`, then `DATABASE_URL="$DIRECT_URL" npx prisma migrate deploy` (`prisma migrate resolve --rolled-back <name>` first to unstick a phantom ledger row). Confirm with `migrate status` → "Database schema is up to date!" — never from the deploy’s green tick — then dispatch the API deploy so it boots against the new schema.
5. Verify live: curl prod endpoint (401 = live/auth-gated, not 404); web page 200.

### PENDING (Phase 2 — the "make it fully real" deep builds, in priority order)
1. **Razorpay Subscriptions mandate + webhooks** — turn recurring intent into actual charges (activate on `subscription.authenticated`, charge on `.charged`, T+3 dunning, ≥24h RBI pre-debit notify, `.halted` recovery). recurring_subscriptions table exists (intent layer live).
2. **Astrologer booking-flow swap** — bind booking to real AstrologerProfile (slug↔UUID map, astrologer-resolver.ts exists but unwired). `/live` directory is read-only; booking still uses mock fixture.
3. **Store PDP + buy-flow** for owner products (`/store/[id]` page + cart wiring).
4. **TemplePriest roster management** — add/remove/list priests (still seed-only).
5. **RazorpayX/Cashfree payout rails** — real money transfer on admin process (currently manual); penny-drop bank verify + PAN; TDS decision (194-O 0.1% vs 194J 10% — CA call).
6. **Weekly settlement cron** — auto-create PayoutRequests (guaranteed payout day).

### Founder-gated (only he can do)
- **WhatsApp booking templates** (`docs/company/whatsapp-templates-booking-2026-08-04.md`) — create + approve 11 templates in Meta Manager; booking-notify no-ops until then.
- **E2E_DEMO_EMAIL/PASSWORD** — seed a demo devotee (rashi + booking + reading progress) so the authed-tier E2E (booking-tiers.spec.ts) runs green instead of skipping.
- **RazorpayX/Cashfree account + CA** for the payout money rails + TDS.


## HANDOFF GTM — Pandit-Booking Marketplace Phase 0 (2026-08-07) — open items

> Deliverables live outside the repo (`E:\NewClaude\deliverables\`); narrative archived. Muhurat layer code status: verify with `git log -- apps/api/src/lib/puja-muhurat.ts` (it was UNCOMMITTED at 2026-08-07).

### PENDING (next session, in order)
1. **Founder decision: commit the muhurat layer** → branch + PR (`git checkout -b feat/puja-muhurat-layer`), then merge.
2. **Web wiring** — `apps/web/app/pujas/book/page.tsx` `DateInput` is muhurat-blind; fetch `/panchang/puja-muhurat?pujaType=…` → badge shubh days green, disable `avoid` days, render `windows[]` as slot chips, grey `rahuKaal`. Also wire WhatsApp flow F2 ("I need muhurat help") to the same endpoint.
3. **Known gap**: no Adhik Maas/Shraadh (lunar masa not computed) — mitigated by eclipse proxy + month notes + pandit confirms final muhurat. Multi-city persistence blocked by `DailyPanchang.date @unique` (schema change only if persisting per-city).
4. **Razorpay/PhonePe sandbox** — not started; gates on founder's PG account (founder-owned in split).

### Founder-gated (unchanged — only he can do)
- Confirm launch micro-zone + approve ~₹3–5L budget.
- Legal entity / Razorpay PG / GST for the marketplace (gates escrow + WhatsApp BSP + sandbox).
- Recruit Supply Lead #1 (JD ready at `deliverables/supply-lead-jd-and-pitch.md`).
- In-person temple/sabha meetings (carry kit ready at `deliverables/temple-sabha-partnership-kit.md`).

## Standing operator facts (kept live)

- **Roadmap orchestrator is PAUSED** (`orchestratorPaused: true` in `docs/roadmap/_budget-snapshot.json`; the cron exits 0 at the pause check). Resume only after the Anthropic/Supabase/PostHog/Render secrets exist: `node scripts/agents/roadmap/orchestrator-pause.mjs false`. Full ARE history is archived in `docs/handoff.md`.
- **Prod table check:** `apps/api/scripts/check-prod-tables.mjs` (read-only) after a manual migration.
- **Guards to run before a docs/deploy-wording change:** `pnpm exec vitest run scripts/test/ops-runbook-honesty.test.mjs scripts/test/secret-scan.test.mjs`; the secret scan itself is `scripts/secret-scan.mjs` (pre-commit hook).

## Older HANDOFF blocks -> archived

43 HANDOFF blocks covering 2026-05-19 -> 2026-06-08 were moved to docs/handoff.md on
2026-08-10. TASKS.md is @-imported by CLAUDE.md and loaded every session, so it must stay
a LIVE ledger only. When a HANDOFF block stops being actionable, move it to
docs/handoff.md instead of leaving it here.
