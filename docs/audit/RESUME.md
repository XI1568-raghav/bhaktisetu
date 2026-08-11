# ▶ AUDIT RESUME — read this first, then AUDIT.md

> Single entry point for continuing the Darshya full-audit + fix engagement after a `/clear` or new session.
> Everything below is reconstructable from files in this repo — **nothing needed lives only in chat.**
> Last updated: 2026-08-10.

## One-paragraph state

Full E2E audit of darshya.online (all roles) + fix pass. **58 findings; 50 fixed** (P0 4/4, P1 18, P2 17, P3 11/11).
Remaining: **2 open** (A-002 product call, M-002 deploy-only) · **1 partial** (RV-17) · **2 owner-gated** (S2C-15 + its duplicate RV-04) · 3 verified-healthy.
All 4 P0s fixed. **Nothing committed, nothing deployed** — owner is batching the push. Baseline that must
not regress: **API `tsc` clean · web `tsc` clean · 1059/1059 API tests across 84 files** (started at 893).

## First 3 commands on resume

```bash
cd /e/NewClaude/bhaktisetu/apps/api && npx tsc --noEmit && npx vitest run --exclude '**/scripts/leads/**' 2>&1 | tail -3
cd ../web && npx tsc --noEmit
cd /e/NewClaude/bhaktisetu && git status --porcelain | wc -l   # expect ~66 uncommitted (intended)
```
If tests ≠ 1059 pass or tsc ≠ clean, something regressed since 2026-08-10 — read the fix log in AUDIT.md before proceeding.

## Where everything is

| File | Role |
|---|---|
| `AUDIT.md` (repo root, ~176 KB) | **Master.** §12 findings table (status per finding), per-finding prose, fix log Batches 1-7, `▶ RESUME HERE` block, remaining-work table |
| `docs/audit/stage2-money-path-raw.md` | Money-path finder output, verbatim |
| `docs/audit/stage2-reverify-results.md` | Money-path re-verify: 22 confirmed / 6 refuted / 5 owner questions, worked rupee numbers |
| `docs/audit/batch5-review.md` | Adversarial review that caught 4 blocking issues tsc+tests missed |
| `docs/audit/batch6-agent-fixes.md` | 25 fixes across notifications/auth/web |
| `docs/audit/open-worklist.json` | Machine-readable open findings w/ file:line |
| `TASKS.md` top block | Pointer for a fresh/compacted session |

## The 5 things still to do (none blocks the owner)

1. **RV-17** (P1, code) — `routes/bookings.ts`: admin priest reassignment COMMITS then returns `409 Invalid status transition` on 3 of 4 statuses. Fix: align the reassign path's allowed-status set with `VALID_TRANSITIONS`.
2. **RV-04 / S2C-15** (P1, **OWNER-GATED**) — `payment.service.ts:232` Commission writes the platform's 20% into the provider's field AND keys on `Priest.id` where reads pass `User.id`. Nobody mispaid (rows orphaned). **Both halves must change in ONE commit** or every pandit gets underpaid 75%. Backfill optional (analysis in AUDIT.md).
3. **A-002** (P1) — no password-reset path. Product decision: Supabase reset email vs magic-link only.
4. **M-002** — muhurat layer built but undeployed; resolves on deploy, not a code defect.
5. **4 non-blocking review concerns** in `batch5-review.md`: processPayout can complete a rejected request; runWeeklySettlement duplicate-request suppression; getPayoutBalance float-sum (cosmetic); runWeeklySettlement hardcodes 'PANDIT' role.

## Hard constraints — do not violate

- **Deploy = Render, NOT Cloudflare.** No `runtime='edge'`, no `next-on-pages`.
- **Stripe REMOVED.** Razorpay only, INR only. Never reintroduce Stripe/USD. (Content pass owed: `gift-puja.ts`, `subscriptions.ts`, `/webhook/stripe`, ~20 legal pages still name Stripe.)
- **Money is `Prisma.Decimal`** — never JS float arithmetic.
- **`lib/slot-time.ts`** is the ONLY correct way to compare a booking date+slot. `scheduledDate` is a DATE (midnight); time is in `scheduledTimeSlot` (IST).
- **2 migrations written, NOT applied:** `20260810000000` (enum values REVERSED/reversed) + `20260810000100` (priestId index). Split on purpose — `ALTER TYPE ADD VALUE` in a Prisma tx is the failure class that once blocked 22 migrations.
- **Parallel fix agents MUST own disjoint files** — the whole workflow method depends on it. Reviewers are read-only so they can overlap.
- Legacy `apps/web` files use ONE-SPACE indent. Match the file; never reformat.

## How this engagement runs (the method that worked)

Fix in batches by subsystem → 1 disjoint-file agent per file cluster → **adversarial reviewer per money-critical file** (this caught 2 findings that were marked "fixed" but weren't) → integration verify (tsc both apps + full suite) → record in AUDIT.md → next batch. Keep big agent outputs on disk; pull only digests into context.

## Deploy (when owner says go)

Render `autoDeploy:false`. API sid `srv-d7mc2n8sfn5c73dfce0g`, web sid `srv-d970l2ks728c738fc33g`.
Migrations do NOT auto-apply — after deploy, `cd apps/api` + `npx prisma migrate deploy` against `.env.production` DIRECT_URL, then redeploy API. Post-deploy smoke: `/sw.js` → 200 (A-001), `/auth/me` with a forged `email-` token → 401 (A-005).
