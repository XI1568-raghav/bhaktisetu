# ▶ AUDIT RESUME — read this first, then AUDIT.md

> Single entry point for continuing the Darshya full-audit + fix engagement after a `/clear` or new session.
> Everything below is reconstructable from files in this repo — **nothing needed lives only in chat.**
> Last updated: 2026-08-11.

## One-paragraph state

Full E2E audit of darshya.online (all roles) + fix pass. **58 original findings, 56 fixed**, plus **14 further
defects found on 2026-08-11 by an adversarial review of the fixes themselves — all fixed.** Remaining open:
**1** (M-002, deploy-only, not a code defect). Stripe is now removed from the platform entirely (owner
directive) and a password-reset flow exists (A-002). Baseline that must not regress:
**API `tsc` clean · web `tsc` clean · mobile `tsc` clean · packages/api-client `tsc` clean ·
1066/1066 API tests across 83 files · 265/265 web tests across 35 files.**

**The single most important lesson of 2026-08-11:** the RV-04 commission fix was correct in isolation and
*created a P0 in integration* — repairing the ledger key made a second payout rail live for money the legacy
rail already paid. Type-checking and 1,059 passing tests caught none of it, because `packages/api-client`
types the commissions payload as `unknown[]`. **Money-model changes must be reviewed across every reader in
every app, not just the writer.**

## First 4 commands on resume

```bash
cd /e/NewClaude/bhaktisetu/apps/api && npx tsc --noEmit && npx vitest run --exclude '**/scripts/leads/**' 2>&1 | tail -3
cd ../web && npx tsc --noEmit && npx vitest run 2>&1 | tail -3
cd ../mobile && npx tsc --noEmit
cd /e/NewClaude/bhaktisetu && git log --oneline -3
```
If API tests ≠ 1066 or web ≠ 265 or tsc ≠ clean, something regressed since 2026-08-11 — read the fix log in AUDIT.md first.

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

## What is left

**Code: nothing.** Every finding from the original 58 except M-002 is fixed, and every defect the
2026-08-11 adversarial review raised is fixed.

- **M-002** — muhurat layer is built and wired (`apps/web/app/pujas/book/page.tsx:655` calls
  `/panchang/puja-muhurat`); it resolves on deploy. Verified, not a code defect.

**Owner/config actions, outside the repo — the password-reset flow does not work until both are done:**

1. **Supabase Redirect URLs** — add `https://darshya.online/auth/reset-password` and
   `http://localhost:3000/auth/reset-password` under Authentication → URL Configuration. Supabase
   *silently* substitutes `SITE_URL` for a non-allow-listed `redirectTo`, so the email would land on
   the homepage and the reset page would never be reached.
2. **Supabase Auth SMTP** — the built-in mailer is capped at **2 emails/hour project-wide**. Point it at
   Resend and raise the limit, or reset emails effectively never arrive and two requests deny auth email
   to every user for an hour.
3. **Stripe dashboard** — delete the webhook endpoint pointing at `/payments/webhook/stripe`; that route
   no longer exists and Stripe will retry a 404 for days.
4. **Before deploy, confirm the historical-Stripe row count** (expected 0 — no live Stripe key was ever
   set on Render):
   `SELECT count(*) FROM payments WHERE payment_gateway='stripe' AND status IN ('captured','partially_refunded');`

## Hard constraints — do not violate

- **Deploy = Render, NOT Cloudflare.** No `runtime='edge'`, no `next-on-pages`.
- **Stripe REMOVED — completely, 2026-08-11.** Razorpay only, INR only. The rail is gone from gift-puja,
  subscriptions and the webhook; `lib/stripe.ts` and the orphaned `apps/api/src/lib/pricing.ts` (which held
  the `83.5` constant behind RV-01) are deleted, the npm deps are dropped, and the legal/marketing content
  pass is done. Never reintroduce Stripe or USD billing.
- **Commission ledger — one column, one meaning** (`apps/api/src/lib/commission-math.ts`):
  `amount` = the **provider's** earning (what `getPayoutBalance` pays out), `percentage` = the **platform's**
  take rate. Three of five writers used to disagree; every dashboard built on top was wrong by a different
  factor. Derive gross/platform-cut through that module — never back-solve inline.
- **Two payout rails exist and must stay mutually exclusive.** `Commission → PayoutRequest` is the unified
  rail (all roles); `PriestPayout` is the legacy pandit-only one. `createPriestPayout` refuses when a
  Commission already owns the booking. Removing that guard double-pays every pandit.
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
