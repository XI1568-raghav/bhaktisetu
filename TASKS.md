# Tasks — Darshya

> Live ledger. History → `docs/handoff.md`. Completed log → `docs/tasks-history.md`. User gates → `docs/activation-gates.md`. Last: 2026-08-07 (GTM Phase-0 deliverables shipped; muhurat layer coded, UNCOMMITTED).

## HANDOFF Full Audit + Fix Engagement (2026-08-10) — ACTIVE, READ FIRST

> **Single source of truth: [`AUDIT.md`](AUDIT.md) (repo root).** Start at its `▶ RESUME HERE` block.
> This entry is only a pointer so a compacted/fresh session finds it. Do not duplicate detail here.

**Engagement:** full E2E audit of every role + fix pass. 58 findings tracked in `AUDIT.md` §12.
**State 2026-08-10:** **50 of 58 fixed** (all 4 P0s; every P3 done). 4 open + 1 owner-gated — all recorded in `AUDIT.md`, none blocking.
**Nothing committed, nothing deployed** (owner batching the push).
**Baseline that must not regress:** API `tsc` clean · web `tsc` clean · **1059/1059 API tests, 84 files**.

**Durable artefacts (all in-repo — nothing lives only in chat):**
| File | What |
|---|---|
| `AUDIT.md` | Master findings table, per-finding prose, fix log (Batches 1-5), resume block |
| `docs/audit/stage2-money-path-raw.md` | Money-path finder output, verbatim |
| `docs/audit/stage2-reverify-results.md` | 22 confirmed / 6 refuted / 5 owner questions, with worked rupee numbers |
| `docs/audit/stage2-reverify-worklist.json` | Machine-readable re-verify list |
| `docs/audit/batch5-agent-fixes.md` | Batch-5 agent fix reports + cross-file/owner items |
| `docs/audit/batch5-review.md` | Adversarial review of Batch 5 — **found 4 blocking issues tests missed** |
| `docs/audit/batch6-agent-fixes.md` | Batch-6 agent fix reports (25 findings) |
| `docs/audit/open-worklist.json` | Open findings with file:line, for agent partitioning |

**The four P0s (all fixed, none deployed):** A-001 `public/` served one level deep (Dockerfile `cp -r` nesting; proven live) · A-005 auth bypass (forge `email-<uuid>-<hex>` → any account incl. admin) · RV-01 NRI billed rupees as dollars (83.5×) · S2C-01 NRI checkout dead-end.

**Load-bearing decisions made during this engagement:**
- **Stripe REMOVED** entirely (owner directive; PayPal-via-Razorpay replaces it). Razorpay is the only gateway, INR the only currency. Never reintroduce Stripe/USD. `gift-puja.ts`, `subscriptions.ts`, `/webhook/stripe` + ~20 legal pages still reference it — content pass owed.
- **`lib/slot-time.ts`** is the ONLY correct way to compare a booking date+slot. `scheduledDate` is a DATE (midnight); the time is in `scheduledTimeSlot` (IST).
- **Migrations `20260810000000` + `20260810000100`** are written but NOT applied — additive enum values + a `priestId` index. Deliberately split so an `ALTER TYPE` failure cannot block the index (the failure class that cost this repo 2 months).

## HANDOFF Launch-Readiness Audit + Fix (added 2026-08-05)

> Full E2E audit of darshya.online (8 roles + 5 cross-cutting tracks, live Playwright) → **159 raw findings** → grouped into **29 GitHub issues (EPIC #223)**. **20 FIXED + merged to main + live-verified**; **13 open = owner/runtime/content only (NOT code)**. Read this block on resume for any launch/auth/payment work. Full report: `docs/agent-reports/DARSHYA_LAUNCH_READINESS_2026-08-03.md`.

### FIXED + live on prod (verified, not summary fields)
- **#202 temple sitemap 404s (19/20)** — 4 root causes fixed: `dynamicParams=false` blocked api-seeded slugs; SSR routes hit `localhost` (API_URL unset → now `API_URL || NEXT_PUBLIC_API_URL || prod` fallback); api `images` is `string[]` not `{url,alt}[]` (500 crash); null `longDescription/benefits/samagriList` crashed render. Full sitemap sweep: 58/58 temple+puja deep links 200.
- **#198 demo creds stripped** — 9 demo accounts (incl. admin@demo.com/demo123) + token generator were in the prod client bundle. Gated behind a compile-time-dead `NODE_ENV` branch so Terser drops them. Verified: no cred objects in live login chunks.
- **#199** plaintext password no longer persisted to localStorage (signup draft + profile).
- **#195** signup handles `session:null` (email-confirm on) with a verify-email screen; removed fake demo-session fallback.
- **#197 session→API** / **#201 payments create-order 201+razorpayOrderId** / **#200 httpOnly cookie** (`@fastify/cookie` registered; `darshya_session` set + accepted as auth) — ALL unblocked when the **owner disabled Supabase "Confirm email"** (Authentication → Sign In/Providers → Email). Real sessions now work end-to-end.
- **Build incident**: registering @fastify/cookie crashed login to 500 — root `pnpm.overrides` pinned `cookie@^0.7`, @fastify/cookie v11 needs `^2` (stringifySetCookie). Bumped override → green.
- Routing/UX batch: `/auth/logout` route, `/festivals`→`/festival` redirect, gaushala `gs_*`→cow links, dashboard "View Plans"→`/pricing`, onboarding CTA→`/onboarding/view?role=`, temples dup-merge count, `lib/friendly-error.ts` helper, Inbox 401 poll-storm stop, catalog edge-cache headers, store add-product + wellness add-session fixes.

### PENDING — owner/runtime only (NOT code)
- **#196 phone-OTP** — "Unsupported phone provider" (Supabase SMS not configured). Needs MSG91/Twilio config OR hide Mobile tab.
- **#211 admin panels** — root cause fixed (#197); needs a **real admin account** to click-verify (add owner email to API `ADMIN_EMAILS` env + sign up).
- **#205 Razorpay live key** — set live key in Render (currently `rzp_test_demo` fallback; test payments work, real charges need live key).
- **#203/#204 image optimization** — 13/15 homepage images broken (Wikimedia/Unsplash hotlinks) + 11–15MB pages. Needs self-host vs CDN decision.
- **#216 blog stub** · **#222 UX friction** — content/design. **#210 redirect final regression** — needs multi-role session (now possible).
- **#190–#194, #232 funnel-drop monitors** — auto-filed; symptom of the auth cluster; auto-resolve once real signups/payments flow.

### QA artifacts to clean up (Supabase Users + DB)
Accounts: `qa-audit-probe@gmail.com`, `qa-audit-probe2@outlook.com`, `qa-live-session@gmail.com`, `qa-admin-probe@gmail.com`, `qa-become-probe@example.com`. Booking `BS-20260805-T9CHE`. A few `/leads/self-onboard` probes.

### Cautions for the next session
- Web (srv-d970l2ks728c738fc33g) + API (srv-d7mc2n8sfn5c73dfce0g) are **Render autoDeploy:false** — deploy via `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID>`.
- **Concurrent agents** write to the repo (booking #225, devotee #226, astrologer #227, etc.) — `git add -A` sweeps their WIP; always `git status` first and stash/pop carefully.
- **Auto-format PostToolUse hook DISABLED** (was reformatting legacy 1-space files → huge diff churn). Re-enable only after a one-time repo-wide prettier normalization.

### Final rating post-fixes
**41/100 (NO-GO) → ~74/100.** Public/content site ~85; authenticated product now functional (login/session/payments/portals/secure authz). Remaining = config keys + 1 SMS provider + admin test account + image/content polish.

## HANDOFF Role-by-Role Revamp + Cross-Cutting Phase 2 (added 2026-08-06)

> The full marketplace revamp: all 7 roles revamped + the #1 cross-cutting item (provider payouts) + Phase-2 batch 2. **All shipped to prod, live-verified.** Read this block FIRST on resume for marketplace/booking/payout work.

### What's DONE (live on prod, deployed + verified — not summary fields)

**7 role PRs (all merged → deployed → live):**
- **#225 Pandit booking** — tiered dispatch engine (T1 instant/T2 1-hr/T3 senior/T4 scheduled), cancellation policy (refund ladder 100/75/50/25/0 beating SmartPuja/Harivara), 7 dead things fixed (dead Cancel btn, broken /profile/bookings link, missing Reject btn, escalation cron wired, notify on accept/reject, reschedule endpoint+UI), WhatsApp booking notifications (booking-notify.service). Migration `20260805000000_booking_dispatch_engine` applied.
- **#226 Devotee** — killed 4 hardcoded mock dashboard widgets → live DevoteeTodaySection (Today Panchang / rashi Horoscope / Continue Reading / real Orders); digest unsubscribe loop closed (was 404 + never recorded); AddressManager on /profile.
- **#227 Astrologer** — take rate 30%→20% (80% to astrologer, best-in-India vs AstroTalk 50%); go-online toggle (/astrologer-portal/online); fixed dead Earnings page (was 403 from admin-only route); consult notifications.
- **#228 Store owner** — COD+manual commission leak fixed (store-commission.service); real checkout addresses (was fake Koramangala/Whitefield); tracking-number input on SHIPPED; dead Load-More removed.
- **#229 Wellness** — live-room editor (was curl-only, classes undeliverable); free-satsang enroll (price-0 instant PAID); instructor-share earnings (was gross).
- **#230 Gau Seva** — wired dead adoption CTAs into real /donations flow with planId prefill (₹51/₹3,000/₹30,000/₹2,25,000) + 80G.
- **#231 Temple manager** — availableSlots editor (offerings were unbookable — form never collected slots); GET /temple-portal/bookings + Bookings page.

**Cross-cutting (the deep items):**
- **#233 Provider payouts (ALL roles)** — unified `PayoutRequest` lifecycle over Commission ledger. Only priests had payouts before; astrologer/wellness/store/temple/gaushala sat PENDING forever. `payout.service.ts` + `GET/POST /payouts/balance|request|my` + admin process. `/payouts` web page. Migration `20260806000000_provider_payout_requests` applied. **Take-rate doctrine: uniform 20% platform / 80% provider across all roles.**
- **#235 Phase-2 batch 2** — Temple revenue share (TemplePayout, default 5% `TEMPLE_SHARE_RATE`, closes Harvard donation-bypass); Panchang push revival (PushSubscription persisted table — was in-memory, blast no-opped); recurring subscriptions (recurring.service + /recurring/plans|subscribe|my, all ≤₹15,000 UPI-Autopay no-PIN); live directories (`/astrology/astrologers/live` = 3 real astrologers, `/store/products/live`). Migration `20260806010000_temple_payouts_push_subs` applied.

### Deploy/migrate procedure (the proven pattern)
1. PR → CI green → `gh pr merge <n> --squash`.
2. Deploy: `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f branch=main`. **API sid = `srv-d7mc2n8sfn5c73dfce0g`, web sid = `srv-d970l2ks728c738fc33g`.**
3. **Migration does NOT auto-apply on deploy.** Apply manually: `cd apps/api`, load `.env.production` DIRECT_URL, run `npx prisma migrate deploy`. If a phantom ledger row blocks it (migration recorded but not applied), `prisma migrate resolve --rolled-back <name>` then `migrate deploy` again. Verify tables via information_schema.
4. **Redeploy API after migration** so it boots against the new schema (client regen).
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

### Key reports (full research + numbers)
- Per-role plans: `docs/company/{pandit-booking,devotee-role,astrologer-role,store-owner-role,wellness-instructor-role,gau-seva,temple-manager-role}-revamp-plan-2026-08-*.md`
- Consolidated: `docs/company/role-revamp-consolidated-report-2026-08-05.md`
- Payouts: `docs/company/provider-payouts-phase2-plan-2026-08-06.md`
- Batch-2: `docs/company/cross-cutting-phase2-batch2-2026-08-06.md`

## HANDOFF Graft code-graph (added 2026-08-06)

> The repo is indexed by **Graft** (NanoNets `@nanonets/graft@0.8.2`) — a code knowledge graph (nodes = files/symbols, edges = calls/imports) so the agent starts oriented instead of grepping from cold. Structural graph is tree-sitter (deterministic, **$0, no LLM key**). Use graft **before** Grep/Read for find/understand/trace/scope.

- **Wiring (committed):** PR **#234** (`chore/graft-code-graph`, commit `3350de45`) — `.mcp.json` (6 tools: `find_code`/`file_api`/`trace_calls`/`find_all`/`repo_map`/`check_freshness`), `.claude/settings.json` statusline + 5 hooks, `.claude/skills/graft/SKILL.md`, `.claude/helpers/graft-*.cjs`, `.gitignore` (`/graft/` anchored + shareable `.claude` re-included), `.ignore` (graph cards stay greppable). **Action: merge PR #234.**
- **Windows fix (load-bearing):** hook/statusline commands use `$CLAUDE_PROJECT_DIR`, NOT the `${CLAUDE_PROJECT_DIR:-.}` form `graft init` emits — the `:-` default-expansion literal-corrupts under Git-Bash on win32. If you re-run `graft init`, re-apply this strip.
- **Graph (local, gitignored — NOT committed):** `graft/` = **7,132 nodes / 14,365 edges / 1,437 cards** (tsx/ts/py). Deep (LLM) layer via local Blackbox proxy `http://127.0.0.1:8787/v1` + model `z-ai/glm-5.2` (`GRAFT_PROVIDER=openai GRAFT_BASE_URL=… GRAFT_API_KEY=proxy GRAFT_MODEL=… graft build --deep -j 6`). Built 2026-08-06; ~955 concept nodes computed; per-symbol summary tail resumed to fill remaining pending. **Rebuild any time:** `graft build` (structural) / `--deep` (LLM, optional). Graph auto-refreshes structurally before each query.
- **Pending:** (1) merge PR #234; (2) restart Claude Code to load the graft MCP server; (3) `graft build --deep` re-run fills any remaining per-symbol summaries (cached, cheap).
- **Detail:** `docs/engineering/graft-code-graph-2026-08-06.md`.

## HANDOFF GTM — Pandit-Booking Marketplace Phase 0 (2026-08-07)

> Plan/research: `E:\NewClaude\darshya-gtm-master-plan.md` + `C:\Users\DELL\.claude\projects\E--NewClaude\darshya-gtm\` (18 reports) + `E:\NewClaude\darshya-gtm-execution-split.md`.
> Started: 2026-08-06 (research). Status: **Phase-0 "I own" items ALL SHIPPED. Founder-gated items + commit pending.**
> Read FIRST on resume: this block + `E:\NewClaude\darshya-gtm-execution-split.md`. Deliverables at `E:\NewClaude\deliverables\` (outside repo — do not commit those .md files; only the apps/api code).

### Session outcome (2026-08-07)

Resumed from the 2026-08-06 GTM research + execution split. Executed all six Phase-0 "I own" items.

**6 deliverables → `E:\NewClaude\deliverables\`:**
1. `supply-lead-jd-and-pitch.md` — JD + comp table (≤₹60k/mo) + 2-min verbal pitch + WhatsApp pitch + 10-Q interview scorecard (pass gates Q1/Q2/Q5/Q8 ≥4, total ≥38/50) + 30-60-90 metrics.
2. `temple-sabha-partnership-kit.md` — print one-pager + plain-English MoU (non-exclusive, no-poach, ₹5–10k sponsorship, 30-day exit) + meeting playbook (small temples first per Sri Mandir lesson).
3. `pandit-vetting-rubric.md` — 100-pt instrument: shastra test (Atharvashirsha/Purusha Suktam, 10-step Satyanarayan vidhi, 5-element sankalp), language tags (Hindi/Maithil/Bengali), reference-call script, 8-point attestation. Pass ≥70 / shadow 55–69 / reject <55. 4 instant-reject conditions.
4. `launch-catalog-2sku-pricing.md` — GP ₹3,499/₹6,999/₹8,499 · SN ₹2,099/₹4,199/₹5,199; kit COGS ~₹650/~₹480; margins 43–59%; ₹501-shagun bundle ₹10,697; policies incl. "pandit by muhurat or free + ₹501". Founder sign-off line at bottom.
5. `whatsapp-booking-flow.md` — v1 no-app product: 8 templates (T1–T8), F1–F10 script, dispatcher SOP, opt-in hygiene, weekly metrics gating automation. Founder-gated: BSP + Razorpay need legal entity/PG.
6. `muhurat-data-layer.md` — build doc for the code below.

**Code (UNCOMMITTED — pending founder review):**
- `apps/api/src/lib/puja-muhurat.ts` — per-puja-type scoring (GP + Satyanarayan), grade shubh/neutral/avoid, bookable windows with Rahukaal subtracted (grey-out), eclipse-season proxy. Built on `lib/muhurat.ts` astronomy (no dup).
- `apps/api/src/services/panchang.service.ts` — added `getPujaMuhurats()` + `CITY_TIMES.Gurugram` row (was missing; silent Delhi fallback).
- `apps/api/src/routes/panchang.ts` — `GET /panchang/puja-muhurat?pujaType=&from=&days=&city=` (registered before `/muhurat` + `/:date`).
- Tests: `src/lib/puja-muhurat.test.ts` (9) + `src/lib/puja-muhurat.integration.test.ts` (4). **31/31 green** (13 new + 18 existing panchang/muhurat). `tsc --noEmit` clean.

### Verify cheatsheet
```
cd apps/api
npx vitest run src/lib/puja-muhurat.test.ts src/lib/puja-muhurat.integration.test.ts  # 13/13
npx tsc --noEmit                                                                       # clean
curl "http://localhost:4000/panchang/puja-muhurat?pujaType=SATYANARAYAN&days=30"       # needs API up
```

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

---

## HANDOFF ARE — Autonomous Roadmap Engine (Sub-project 1 of 5)

> Spec: `docs/superpowers/specs/2026-06-10-bhaktisetu-autonomous-roadmap-engine-design.md`
> Plan: `docs/superpowers/plans/2026-06-10-bhaktisetu-autonomous-roadmap-engine-plan.md`
> Started: 2026-06-10. Status: **Phases 0-5 + autonomous extensions A-J ALL SHIPPED. Only Phase 6 (14d soak) remains.**

### Phase progress (24/24 ARE code tasks + 10 autonomous extension tasks = 34/34 shipped, PUSHED to origin)

#### Original ARE plan (24 tasks)

- Phase 0 ✅ scaffold + README + 10 tripwires + 5 seeds + 3 samples + validator + index-builder + _lib.mjs (8 commits)
- Phase 1 ✅ 286 items (Q1 73 / Q2 75 / Q3 70 / Q4 68) + _bulk-create hardened RFC-4180 + TBD warnings (7 commits)
- Phase 2 ✅ Anthropic client + 6 KPI scrapers + cache + tripwire sandbox eval (10 commits, 46 vitest tests)
- Phase 3 ✅ orchestrator + Decision Agent + sub-agent runner + cron yml + 7d dry-run gate (11 commits, 71 vitest tests)
- Phase 4 ✅ queue-pop PS1 + UserPromptSubmit hook docs + finalize workflow + 5 slash commands + e2e smoke (6 commits)
- Phase 5 ✅ API endpoint /admin/roadmap + Next.js dashboard 6 panels — VERIFIED LIVE
- Phase 6 ⏳ 14-day soak protocol (process, not code — docs/roadmap/README.md)

#### Autonomous extensions (founder directive "do best 3hrs", no code review gates)

- Phase A ✅ Populate 55 high-impact TBD items (Q1 P0/P1 13 + Q2 15 + Q3 partial+10 + Q4 10) — warnings 849→686
- Phase B ✅ Push all ARE commits + verify CF deploy state
- Phase C ✅ Sub-project 2: 10 CXO advisory agents (cto/cfo/cmo/cpo/sales/talent/cs/legal/it/hr) — weekly cron, deterministic, $0 LLM cost
- Phase D ✅ Preflight check script — single GO/NO-GO for founder before unpausing
- Phase E ✅ Agent fleet summary scraper — 28 daily agents × 9 sectors → Decision Agent context
- Phase F ✅ Wire 10 weekly CXO advisory excerpts into signal-context cxoAdvisory field
- Phase G ✅ Sub-project 4: 7 supply onboarding drip agents (pundit/temple/astrologer/gaushala/gurukul/wellness/store) — daily cron, deterministic templates, founder reviews + sends
- Phase H ✅ Populate 20 more Q1 P2 items — warnings 686→626
- Phase I ✅ Sub-project 5: A/B experiment tracker + 3 seed experiments + orchestrator wiring
- Phase J ✅ Final HANDOFF + push (this commit)

### TBD warnings reduction

- Start: 849 (3 placeholders × 283 bulk-imported items)
- After 75+ items populated across Q1/Q2/Q3/Q4: **626**
- Reduction: 26% (223 placeholders cleared)
- Founder/Decision Agent can populate remaining 626 in soak as cycles emit prompts

### New artifacts (Phases C-I) — beyond original ARE spec

```
scripts/agents/roadmap/cxo/
  _cxo-lib.mjs            shared loaders
  cto.mjs cfo.mjs cmo.mjs cpo.mjs sales.mjs talent.mjs cs.mjs legal.mjs it.mjs hr.mjs
  run-all.mjs

scripts/agents/roadmap/
  _agent-fleet-summary.mjs    NEW — 28 agents → 9 sectors + 10 CXO advisory excerpts
  _experiment-tracker.mjs     NEW — A/B tracker (Sub-project 5 foundation)
  preflight.mjs               NEW — GO/NO-GO before founder unpauses

scripts/agents/onboarding-v2/
  _onboard-lib.mjs templates.mjs
  pundit.mjs temple.mjs astrologer.mjs gaushala.mjs gurukul.mjs wellness.mjs store.mjs
  run-all.mjs

.github/workflows/
  cxo-advisory.yml         NEW — Monday 08:07 UTC weekly
  onboarding-fleet-v2.yml  NEW — daily 09:23 UTC

docs/roadmap/
  _experiments.yml         NEW — 3 seed A/B experiments
  _experiments-state.json  NEW — tracker output
  advisory/2026-W24/       NEW — 10 CXO advisory MDs + index
  setup/supabase-readonly-role.sql  NEW — read-only role DDL founder runs once
```

### Free-tier impact

| Resource | New monthly cost | Cap | Headroom |
|---|---|---|---|
| GH Actions: cxo-advisory (Monday weekly) | 5 min × 4 = 20 min | 2000 | 1980 free |
| GH Actions: onboarding-fleet-v2 (daily) | 5 min × 30 = 150 min | 2000 | 1830 free |
| Combined w/ existing 846/mo baseline + 600 roadmap-loop = ~1616/mo | within 1900 cap user set |
| CF Pages builds | 0 (all extensions [skip ci]) | 500 | 500 free |
| Anthropic tokens | 0 added (all extensions deterministic) | n/a | unchanged |

### Pre-commit hook ACTIVE

`.githooks/pre-commit` (commit 8fcbfe3) gates docs/roadmap/items/* changes via validator. Auto-stages `_index.json`. Don't bypass.

### Founder session-pickup hook INSTALLED

`C:\Users\DELL\.claude\settings.json` has UserPromptSubmit hook firing on bare `/goal` → `queue-pop.ps1`.

### Orchestrator currently PAUSED (commit 48c71a1)

`docs/roadmap/_budget-snapshot.json` has `orchestratorPaused: true`. Cron fires every 6h but exits 0 immediately at pause check — no Anthropic call, no alerts, no GH minute burn.

**To resume after secrets set**: `node scripts/agents/roadmap/orchestrator-pause.mjs false` + commit + push.

### Founder action items before Phase 6 soak

1. Set GH Actions secrets (orchestrator-loop workflow won't fire useful results until set):
   - `ANTHROPIC_API_KEY_BLACKBOX_PROXY` — Blackbox proxy key from existing CLAUDE_CODE env
   - `ANTHROPIC_BASE_URL` — Blackbox proxy base URL
   - `SUPABASE_DIRECT_URL` (or new `DATABASE_URL_READONLY` w/ read-only role)
   - `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID`
   - `RENDER_API_KEY`
   - `CF_ANALYTICS_TOKEN`
2. Manually trigger first dry-run: `gh workflow run roadmap-loop.yml -f dry_run=true`
3. Inspect `docs/roadmap/_dryrun/queue/` after first cycle. Review reasoning quality.
4. Daily review for 7 days per soak protocol in docs/roadmap/README.md
5. After 7d clean: `gh variable set ROADMAP_DRY_RUN --body false` → engine goes live
6. Day 8-14 live observation, then retro

### Hook setup (founder workstation, one-time)

Per docs/roadmap/README.md "Session pickup setup" — add to `C:\Users\DELL\.claude\settings.json` so `/goal` auto-injects queue prompts.

### Commits since plan (18 total, ALL `[skip ci]` = 0 CF burn)

Plan: `5784df7` spec + `661b9ce` plan

Phase 0:
- `243de91` scaffold + README
- `cf387b5` README fixes (queue ordering + Phase tags + PAUSE_ALL)
- `28c661e` 10 tripwires yaml
- `a8372fe` manual KPI + JSON seeds
- `0caed7b` 3 samples + validator
- `27b6180` _lib.mjs + validator fixes
- `b59ba29` index builder + TDD
- `b80a1e7` retro fixes (root vitest + id-collision + posix + tmpdir)

Phase 1:
- `8313067` Q1 eng 15 + _bulk-create
- `82f0037` bulk-create hardening (RFC-4180 + dup-id + id-format + YAML-quote + BOM + ENOENT)
- `022d258` Q1 supply 10 + marketing 10 + sales 5
- `9063f8e` Q1 remaining 30 (finance/legal/hr/cs/it/geo/product)
- `064360b` Q2 75 items
- `cc17457` Q3 70 items
- `bfa2f53` Q4 68 items
- `42eb913` validator TBD warnings

Phase 2:
- `5462e0b` RED — callOpus47 test (stub fails 3/3)
- `720dda6` GREEN — Anthropic client w/ ModelRejectedError + 3x retry + no-silent-swap

### Next task: Phase 2 Task 2.2 — Supabase KPI scraper (TDD)

File: `scripts/agents/roadmap/_kpi-supabase.mjs` + `.test.mjs`
Behavior: SELECT-only regex guard, 5s statement timeout via pg, stale fallback on error, returns `[{metric, value, stale, fetchedAt}]`
Pattern: import from `./_lib.mjs` (extend lib if helpful)
TDD ritual: RED commit (stub) → GREEN commit (impl + pg lockfile)

### Phase 2 remaining tasks

- 2.2 Supabase scraper (TDD)
- 2.3 PostHog/Render/CF/GH/manual scrapers (5 files, TDD each)
- 2.4 KPI scraper orchestrator + cache layer (Promise.allSettled + TTL by source)
- 2.5 Tripwire engine (sandboxed Function evaluator, blocks process.exit/require)

### Free-tier state (ARE work session)

- CF builds: 32/500 (6.4%) — all ARE commits `[skip ci]`
- GH min: 0/2000 (0%) — no workflow runs yet (Phase 3 only)
- Render: unchanged
- Supabase: unchanged
- Anthropic Blackbox proxy: ~2.5M tokens consumed across sub-agent dispatches (free)

### Pending founder decisions (no blockers — defaults locked)

1. Supabase read-only role hardening (Phase 2 recommendation) — defaulted to existing `SUPABASE_DIRECT_URL` for now
2. PostHog insight IDs — TBD per-KPI until insights created in PostHog UI
3. `ROADMAP_DRY_RUN` GH repo variable — default true, flip after 7d soak
4. Push 18 ARE commits to origin — waiting until Phase 2 ships
5. Anthropic proxy reliability — single dependency; if 403 long-term founder upgrades Vercel AI Gateway paid tier

### Tools in scripts/agents/roadmap/ (current state)

- `_lib.mjs` — walk + parseFrontmatter + ITEMS_ROOT (shared)
- `_validate-items.mjs` — 20 required + 4 enums + id regex + id-collision + ENOENT + null-tolerant + TBD warnings (849 known warnings on bulk-imports)
- `_index-build.mjs` — compact + posix paths + parse-warn + Windows-safe CLI (vitest 1/1 green)
- `_bulk-create.mjs` — RFC-4180 + dup-id + id-format + category-letter + YAML-quote + BOM + ENOENT (6 edge-case tests passed)
- `_anthropic-client.mjs` — no-silent-swap + Opus 4.7 forced + ModelRejectedError + 3x retry (vitest 3/3 green)
- 22 CSV bulk-input files
- 286 item .md files across 44 category/quarter dirs

### Item counts

- Q1: 73 items (40 bulk + 3 samples + 30 categorical remainder)
- Q2: 75 items (all 11 categories)
- Q3: 70 items (all 11 categories)
- Q4: 68 items (all 11 categories)
- **Total: 286 items** (1.1% over plan 283 target — within tolerance)
- All validate clean (0 errors). 849 TBD placeholder warnings (3 per bulk-created item) — Phase 3 dry-run gate populates before live.

### Sub-projects 2-5 deferred (post 14d ARE soak)

2. CXO advisory layer (10 sector agents: CTO/CFO/CMO/CPO/Sales/Talent/CS/Legal/IT/HR weekly)
3. Year-1 content — FOLDED INTO ARE Phase 1 ✅
4. Supply onboarding agent fleet v2 (per-role drip + KYC + activation per pundit/temple/astrologer/gaushala/gurukul/wellness/store)
5. Closed-loop KPI feedback / A/B orchestration / auto-experiment

### Plan confidence (overall: ★★★★☆ HIGH-MEDIUM)

High: schema correctness, tool correctness, free-tier safety
Medium: Anthropic proxy reliability, Decision Agent reasoning quality (untested until 7d soak), 283 TBD population at scale, sub-agent paste-ready output quality
Low-medium: year-1 revenue targets (₹9 Cr base / ₹25 Cr stretch — tripwires force pivot)
Low: solo founder bandwidth for queue consumption + supply onboarding scaling (sub-project 4 addresses)

Top risks:
1. Blackbox proxy permanently blocks Opus 4.7 (no silent swap = workflow halts, founder must upgrade or approve model change)
2. Decision Agent emits low-quality prompts (7d soak gate exists to catch + tune)
3. Supply onboarding can't scale solo (sub-project 4 + first hire trigger)

---


---

## Older HANDOFF blocks -> archived

43 HANDOFF blocks covering 2026-05-19 -> 2026-06-08 were moved to docs/handoff.md on
2026-08-10. TASKS.md is @-imported by CLAUDE.md and loaded every session, so it must stay
a LIVE ledger only. When a HANDOFF block stops being actionable, move it to
docs/handoff.md instead of leaving it here.
