# Darshya (bhaktisetu) — Full Audit

> **⚡ Resuming after /clear or a new session? Read [`docs/audit/RESUME.md`](docs/audit/RESUME.md) first** — it is the compact entry point (state, next 5 tasks, hard constraints, verify commands). This file is the full detail.
>
> **Single source of truth for this engagement.** Spans multiple sessions — `claude --continue` / `--resume`
> should read this file first and need no other context.
>
> **Status:** Phase 0 complete (inventory + prior-art briefing). **No code has been changed.**
> **Generated:** 2026-08-10 · 7-agent recon (6 returned; the issues-state agent failed its output cap and was
> backfilled by hand from `gh issue list`).

---

## 0. How to use this file

| Phase | State |
|---|---|
| 0 — Prior-art briefing + full inventory | ✅ DONE |
| 1.1 — Auth / session / role resolution | ✅ DONE — 15 findings traced |
| 1.2 — Money path (puja booking) | ✅ DONE — live walk + code trace + adversarial re-verification (22 confirmed / 6 refuted / 4 dup / 5 owner Qs) |
| 1.3 — Payments / commissions / payouts ledger | ✅ DONE — folded into 1.2 + Batches 3-7 |
| 1.4 — Webhooks + unauth mutation surface | ✅ COVERED — webhook fail-closed verified (PR #242); unauth mutation probed (all portal endpoints 401) |
| 1.5 — Admin surfaces | ✅ DONE — #211 re-traced (A-014), admin refund (RV-12), admin reassign (RV-17) |
| 2 — Findings triage + owner prioritization | ✅ DONE — 58 findings triaged, owner decisions recorded |
| 3 — Incremental fixes + verification | ✅ **50 of 58 fixed** across 7 batches; API+web tsc clean, 1059/1059 tests. Nothing committed/deployed |

### ▶ RESUME HERE (for `claude --continue` / `--resume`)

**STATE 2026-08-10 (FINAL for this session): 50 of 58 findings fixed** — all 4 P0s, all P3s. 2 open + 1 partial (RV-17) + 2 owner-gated (S2C-15 and its duplicate RV-04) + 3 verified-healthy. **Nothing committed, nothing deployed.** API tsc clean · web tsc clean · **1059/1059 API tests, 84 files** (started 893).
API `tsc` clean · web `tsc` clean · **1059/1059 API tests across 84 files**.

**Next actions, in order:**
1. **RV-17** (P1, pure code) — `routes/bookings.ts`: admin priest reassignment COMMITS, then answers `409 Invalid status transition` on 3 of the 4 statuses it declares reassignable. Align the reassign path's allowed-status set with `VALID_TRANSITIONS`, or do the reassignment inside the transition it validates.
2. **S2C-15 / RV-04** (**the only owner-gated item**) — `payment.service.ts:232`. Backfill question is RESOLVED: nobody was mispaid, because the rows are orphaned (`providerId` holds a `Priest.id` while every read passes a `User.id`, so they never matched). Both halves — the key **and** the amount direction — must change in ONE commit; fixing the key alone starts underpaying every pandit by 75%.
3. **A-002** — no password-reset path anywhere. Product call: Supabase reset email vs magic-link-only.
4. **Stripe content pass** — the booking path is clean, but `gift-puja.ts`, `subscriptions.ts` and `/webhook/stripe` still reference Stripe, and ~20 legal/marketing pages still name it as a processor. Those pages are now factually wrong.
5. **4 non-blocking payout concerns** from `docs/audit/batch5-review.md` — processPayout can complete a rejected request; weekly settlement no longer dedupes; `getPayoutBalance` float-sums for display; `runWeeklySettlement` hardcodes `'PANDIT'`.

**Standing:** nothing is committed or deployed (66 changed files on `feat/recurring-razorpay-planid`). Two migrations are written but NOT applied. On deploy, smoke-test `/sw.js` → 200 (A-001) and a forged `email-` token → 401 (A-005).

---

## Fix log

### ✅ Batch 1 — Remove Stripe / kill RV-01 (2026-08-10)

Owner decision: *"Stripe is out of picture, I have completed KYC for PayPal via Razorpay only — so remove Stripe. In 1-2 days we can confirm PayPal."*

Closes **RV-01 (P0)**, **S2C-01 (P0)** and **S2C-09 (P2)** in one change, by deletion rather than by patch — with Stripe gone there is one gateway, one currency, and no FX step anywhere, so the 83.5× defect cannot be reintroduced by a future edit.

**API (`apps/api`)**
- `routes/bookings.ts` — deleted the whole `POST /create-stripe-order` route (100 lines) and the `wantsUsd` branch in `/from-offering`; every booking now creates a Razorpay order. Removed `NRI_USD_MULTIPLIER`.
- Corrected a stale comment that claimed a *30/70* commission split — the real take-rate is **80/20** in the pandit's favour.

**Web (`apps/web`)**
- `checkout/offering/page.tsx` — removed the INR/USD toggle, the timezone auto-default, `priceUsd = priceInr * 9` (which *displayed* "$9,900" for a ₹1,100 puja), and `handleStripePayment` (88 lines).
- `pujas/book/page.tsx` — same removal (state, effect, toggle JSX, pay-button branch, `handleStripePayment`, 101 lines).

**A deliberate call worth flagging.** I did *not* re-apply the 9× NRI multiplier server-side. Business rule 2 (NRI pricing 9-10× domestic) is a price-*level* rule, and the original defect was applying it as if it were an FX rate. But applying it server-side while the web still displays `basePrice` would quote a devotee ₹1,100 and charge ₹9,900 — a worse failure than the one being fixed. **Displayed price must equal charged price.** So `/from-offering` now charges `basePrice` in INR to everyone, and NRI premium pricing returns with the PayPal rail as a *server-quoted* amount the client renders before payment. No revenue is lost versus today, because the USD path was 500-ing anyway.

**Verification:** `tsc --noEmit` clean on **both** apps · **893/893 API tests pass** (76 files). One self-inflicted JSX break (a duplicated `) : (` from the toggle removal) was caught by the typecheck and repaired before the suite ran.

**Still Stripe-referencing, deliberately untouched in this batch** — these are separate features that would *break* rather than improve if ripped out blind, and each needs its own decision when PayPal lands: `routes/gift-puja.ts` (NRI gift payments), `routes/subscriptions.ts` + `subscription.service.ts` (annual USD plans), `routes/payments.ts` (`/webhook/stripe`), and the now-dead `payment.service.createStripeOrder`. Plus ~20 legal/marketing pages that name Stripe as a processor — **those are now factually wrong and need a content pass** (privacy policy, terms, refunds, support FAQ).

### ✅ Batch 2 — A-001: entire `public/` directory served one level deep (2026-08-10)

**Root cause proven on production, not inferred.** `apps/web/Dockerfile` used:
```dockerfile
cp -r public .next/standalone/apps/web/public
```
`cp -r SRC DEST` copies SRC *into* DEST when DEST already exists — and Next's standalone output already contains a `public/` directory. So every asset landed at `public/public/*`.

**Decisive live evidence:**
```
/sw.js          -> 404 (text/html)     /public/sw.js          -> 200 application/javascript
/manifest.json  -> 404                 /public/manifest.json  -> 200 application/json
/favicon.ico    -> 404                 /public/favicon.ico    -> 200 image/x-icon
/logo.svg       -> 404                 /public/logo.svg       -> 200 image/svg+xml
```
All 8 sampled assets 404 at their real path and 200 one level deep. `_next/static` chunks were unaffected — that destination does **not** pre-exist, so it never nested. That asymmetry is what identified the mechanism.

**Impact while broken:** the service worker never registered (offline page and the whole web-push contract dead — this is the console error `A bad HTTP response code (404) was received when fetching the script` seen on every page), the PWA manifest 404'd (no install prompt), and every OG/social preview image was missing.

**Fix:** `cp -a SRC/. DEST/` copies the *contents* and is correct whether or not DEST exists, with `mkdir -p` making the destination explicit. Added post-copy sentinel assertions (`test -f .../public/sw.js`, `test ! -e .../public/public`) so a regression fails the **build** rather than shipping another 404-serving image.

**Verification:** `cp` semantics verified empirically in a scratch tree (old form nests, new form doesn't, in both dest-exists and dest-missing cases); the exact `RUN` block was then executed against a simulated standalone layout — guard passed, layout flat. Confirmed the repo's `public/` contains no directory named `public` that would false-trip the sentinel. **Real confirmation requires a deploy** — after deploying, `/sw.js` must return 200 and `/public/sw.js` must 404.

### ✅ Batch 3 — Refund & cancellation correctness (2026-08-10)

Five confirmed findings, all money-affecting. New shared helper `lib/slot-time.ts` (11 tests) + `lib/refund-marker.ts`.

**The root cause behind two of them.** `PujaBooking.scheduledDate` is a DATE column — `new Date('2026-08-15')` parses to **midnight** — while the time of day lives separately in `scheduledTimeSlot` ('18:00', IST). Both the 24h cutoff and the refund-ladder evaluator compared against midnight, so every booking behaved as if it happened at 00:00.

| ID | Fix |
|---|---|
| **S2C-14** (P1) | `processAutoRefunds` hardcoded `refundType: 'full'`, so **every** auto-refund paid 100% while the 100/75/50/25/0 ladder was computed for display only. Now computes the tier and passes a partial amount. Measured **at `cancelledAt`, not `now`** — the cron runs ≥1h later and billing the devotee for our queue latency would push them down a tier. |
| **RV-07** (P1) | `POST /bookings/:id/cancel` never entered the refund queue. `REFUND_REQUESTED_MARKER` was read by the cron but **written by nothing**, so its query matched zero rows forever — `requiresRefund` was returned to the caller and dropped. A paid cancellation now writes the marker. Marker extracted to `lib/refund-marker.ts` so producer and consumer share one definition without an import cycle. |
| **RV-11** (P1) | 24h cutoff measured from midnight. An 18:00 puja must stay cancellable until 18:00 on D-1; the old maths cut off at 00:00 on D-1, wrongly refusing the whole 00:00–18:00 window. Lost window = the slot's hour-of-day (6h for an 06:00 puja, 18h for an 18:00 one). |
| **RV-13** (P2) | `cancel-quote` quoted a tier lower than policy, and for a same-day slot produced a **negative** `hoursUntilSlot` that fell through every tier to the 25% floor. Now slot-aware. |
| **RV-16** (P2) | Web Cancel discarded the response and rendered "Cancelled" + "a refund will be processed" on a **409/403**. The devotee believed they had cancelled and been refunded while the booking was live and the pandit still coming. Now checks `res.ok` and surfaces the reason, matching the sibling `handleReschedule` on the same page. |

**Worked example (₹1,100 booking, 18:00 slot, devotee cancels 09:00 on D-1):** policy says 75% = ₹825. Old code read 20.5h → 50% tier → quoted ₹550, *and* refused the cancellation outright at the 24h gate, *and* if it had gone through the cron would have refunded ₹1,100. New code reads 33h → allows the cancel, quotes ₹825, refunds ₹825.

**Verification:** `tsc --noEmit` clean on both apps · **907/907 API tests pass** (was 893). 14 new tests: 11 in `slot-time.test.ts` (incl. one that reproduces the buggy 20.5h maths) and 3 RV-13 regression locks that assert the exact ₹275 shortfall.

**Deliberately NOT done in this batch:** **RV-02** (refund writes no compensating ledger entry — provider `Commission` and `TemplePayout` stay PENDING and withdrawable on a refunded booking) needs a new `CommissionStatus.REVERSED` enum value, i.e. a Prisma migration against the live ledger. Additive and low-risk, but it is a schema change on money data — flagged for owner sign-off rather than done unilaterally.

### ✅ Batch 4 — RV-02 + RV-20 (schema, 2026-08-10)

- **RV-02 (P1)** — a full refund now **reverses the provider `Commission` and the temple's `TemplePayout`**. Previously nothing unwound them: on a ₹5,000 refunded booking, ₹1,000 stayed withdrawable to the priest and ₹250 pending to the temple — ~₹6,250 out on a booking that earned ₹0, with no reversal state in the schema at all. Two deliberate limits, both encoded in the code: rows already **PAID or linked to a payout request are left alone** and flagged `[ledger-manual-review]` (that money has left the building — clawing it back is a finance decision, not a refund handler's); and **partial refunds do not touch the ledger**, because splitting a provider's earning mid-flight needs a policy decision. 5 tests, incl. one asserting a settled payout is never silently clawed back.
- **RV-20 (P2)** — added `@@index([priestId])` on `puja_bookings`. `priest_id` is the sole predicate of the entire pandit portal and was unindexed.
- **Two isolated migrations, on purpose.** `ALTER TYPE … ADD VALUE` inside Prisma's per-migration transaction is the same failure class that blocked 22 migrations here for two months. Neither migration references its new value in the same transaction (which is what Postgres requires), and isolating them means a failure in one cannot block the other.

### ✅ Batch 5 — 10-agent parallel fix run (2026-08-10) — **PARTIAL**

Ten agents with **strictly disjoint file ownership** (no two could touch the same file, so they could not clobber each other). **Cut short by an account session limit: 4 of 10 completed, 6 never ran, and all 4 adversarial reviewers died.**

Full detail preserved in [`docs/audit/batch5-agent-fixes.md`](docs/audit/batch5-agent-fixes.md) — including each agent's own reasoning, 17 cross-file needs and 17 owner items.

| Agent | Findings |
|---|---|
| payout-engine | **RV-05, RV-06** |
| booking-service | **RV-03, RV-09, RV-10, RV-14, RV-15** |
| bookings-route | **RV-08, RV-17, S2C-13** |
| payment-service | **RV-12** |

Highlights worth knowing:
- **RV-05** — the two commission sets were provably **disjoint** (`pending` filters `payoutRequestId: null`; `inFlight` filters a to-one relation that never matches a NULL FK), so the subtraction removed money that was never in the sum. It also went **negative** when in-flight exceeded new earnings, locking providers out of money they had earned. A pre-existing test that *encoded the bug* was rewritten.
- **RV-06** — `requestPayout` now sizes the request from rows read **inside** the transaction and links with a `payoutRequestId: null` predicate, so the losing racer matches fewer rows and throws instead of leaving a hollow request an admin could complete for a second transfer. Money summed as `Prisma.Decimal`, with a test asserting the float sum differs.
- **RV-08** — video proof (immutable business rule 1) is now genuinely enforced: `video_uploaded`/`delivered` require a `videoProofUrl`, **and** only the assigned pandit or an admin may attach it — otherwise the devotee, who passes the owner branch of the authz check, could self-attest any URL and mint the pandit's payout.

**⚠️ Verification status — read this before trusting Batch 5.** The intended adversarial review did **not** happen; all four reviewers died. What these fixes *did* pass:
- API `tsc --noEmit` **clean** · web `tsc --noEmit` **clean**
- **1028/1028 API tests pass across 81 files** (up from 907/77 — the agents added their own regression tests)

That is real evidence of integration health, but it is **not** the independent adversarial check every other finding in this audit received. **An adversarial review of these four files is still owed** — `payout.service.ts`, `booking.service.ts`, `routes/bookings.ts`, `payment.service.ts`.

### ✅ Batch 6 + 7 — remaining findings + adversarial review of Batch 5 (2026-08-10)

**Batch 6** — the 6 agents that never ran, all completed: **25 findings fixed** across notifications, API auth, and four web surfaces. Detail: [`docs/audit/batch6-agent-fixes.md`](docs/audit/batch6-agent-fixes.md).

**Batch 5 adversarial review** — 4 read-only reviewers, all completed. Detail: [`docs/audit/batch5-review.md`](docs/audit/batch5-review.md). **It found 4 blocking issues that tsc + 1028 passing tests did not catch** — which is the whole argument for the review step:

| Blocking finding | Reality |
|---|---|
| **RV-03** | "Fixed" but **not wired** — `writeTemplePayoutOnConfirm` was exported and called only from `updateBookingStatus`, the same path no paid booking reaches. Temples were still getting **₹0.00**. |
| **RV-12** | "Fixed" but the **endpoint** still took no amount — `routes/payments.ts` was git-clean (outside the agent's scope), so no partial refund was possible. It had also introduced a **regression**: with no opts every refund fell into the ladder branch and hard-failed on any non-cancelled booking. |
| **RV-17** | Reassignment **commits, then returns 409** on 3 of 4 statuses. Still open. |

**Batch 7 (this session) fixed the first two:**
- **RV-03** — the writer moved to a new leaf module `services/temple-payout.service.ts` and is now called from **all three real confirm paths** in `payment.service`, inside the same transaction as the commission. It could not simply be imported: `booking.service` imports `payment.service`, so the direct wiring would have been a module cycle — which is exactly why the previous agent hoisted it but left it uncalled.
- **RV-12** — `POST /payments/:id/refund` now accepts an optional `{ amountInr | fullRefund, reason }` body, mutually exclusive, defaulting to the snapshotted ladder. Fixes the headline defect *and* the regression.

**Verified:** API `tsc` clean · web `tsc` clean · **1059/1059 tests across 84 files** (was 893 at the start of the fix work).

---

## ⚠️ Remaining work — nothing here is blocked on the owner except S2C-15

These are recorded so a later session can act without asking. Owner review welcome but not required to proceed.

| ID | What | Where |
|---|---|---|
| **RV-17** | Priest reassignment commits then answers `409 Invalid status transition` on 3 of the 4 statuses it declares reassignable. Fix: align the reassign path's allowed-status set with `VALID_TRANSITIONS`, or perform the reassignment inside the same transition it validates. | `routes/bookings.ts` |
| **RV-04 / S2C-15** | **OWNER-GATED.** Commission writes the platform's 20% into the provider's field *and* keys on `Priest.id` where reads pass `User.id`. Nobody has been mispaid (the rows are orphaned, never matched) — see the resolved backfill analysis above. **Both halves must change in one commit**; fixing the key alone starts underpaying every pandit by 75%. | `payment.service.ts:232` |
| **A-002** | No password-reset path anywhere. Product decision (Supabase reset email vs magic-link-only). | `apps/web` auth |
| **M-002** | Muhurat layer is built but undeployed — not a code defect. Resolves on deploy. | — |

### Non-blocking review concerns worth doing (from `batch5-review.md`)

- `processPayout` can still complete a **rejected/failed** PayoutRequest whose commissions were unlinked — the hollow-request vector is closed on creation but not completion. Add a status + linked-set assertion before flipping to completed.
- `runWeeklySettlement` no longer suppresses duplicate weekly requests (the old suppression was a side effect of the RV-05 bug). Skip providers with an in-flight request.
- `getPayoutBalance` still float-sums money for display, in the same function RV-05 rewrote. Cosmetic today (all values are `Decimal(10,2)` and rounded), but it contradicts the project's own money rule.
- `runWeeklySettlement` hardcodes `'PANDIT'` as the role for every provider it settles.

## Final results (2026-08-10)

**50 / 58 findings fixed** over 7 incremental batches, each integration-verified.
Fixed by severity: **P0 4/4 · P1 18 · P2 17 · P3 11**.
Plus 3 verified-healthy (no defect), 6 refuted, 4 duplicates.

**Verification baseline (must not regress):** `apps/api` `tsc --noEmit` clean · `apps/web` `tsc --noEmit` clean · **1059/1059 API tests across 84 files** (up from 893 at the start; ~166 tests added by the fixes).

**Nothing is committed or deployed** — the owner is batching the push. 66 files changed on branch `feat/recurring-razorpay-planid`.

### Fix batches

| Batch | Theme | Findings |
|---|---|---|
| 1 | Remove Stripe / kill the 83.5× NRI overcharge | RV-01, S2C-01, S2C-09 |
| 2 | Dockerfile `public/` nesting (every static asset 404) | A-001, M-004 |
| 3 | Refund & cancellation correctness (slot-aware ladder, cancel-enters-queue) | S2C-14, RV-07, RV-11, RV-13, RV-16 |
| 4 | Ledger reversal + schema (CommissionStatus.REVERSED, priestId index) | RV-02, RV-20 |
| 5 | 10-agent parallel run (payout engine, booking service, video-proof gate) | RV-03*, RV-05, RV-06, RV-08, RV-09, RV-10, RV-12*, RV-14, RV-15, RV-17*, S2C-13 |
| 6 | 6-agent run (notifications, API auth, web surfaces) | RV-18, RV-19, RV-21, RV-22, A-008, A-009, A-010, A-011, A-014, A-015, S2C-02..08, S2C-10..12, A-003, A-007, A-012, A-013 |
| 7 | Fix what the Batch-5 adversarial review caught | RV-03 (wired), RV-12 (endpoint) |

\* Batch-5 review found RV-03 and RV-12 marked "fixed" but not actually working, and RV-17 partial — Batch 7 closed the first two.

Also fixed directly by the main session: A-005 (auth bypass, fail-closed middleware + 4 regression tests) and A-006 (magic-link token expiry, same change).

### Pending — recorded, not blocking

| ID | Sev | What | Owner needed? |
|---|---|---|---|
| RV-17 | P2 | Admin priest reassignment via PATCH /bookings/:id is silently discarded and returns 200 wi | no — code fix, noted |
| A-002 | P1 | No password-reset path exists anywhere | product call (reset-email vs magic-link) |
| M-002 | P2 | Muhurat layer still NOT wired to the booking date picker — page makes zero panchang/muhura | no — code fix, noted |
| S2C-15 | P1 | Puja `Commission` writes the platform's 20% into the field the payout engine treats as the | **YES** — money-model + data migration |
| RV-04 | P1 | Puja Commission row stores the platform's 20% cut in the field the payout engine treats as | **YES** — money-model + data migration |

Detail + suggested fixes for each are in the per-finding sections below and in `docs/audit/batch5-review.md`.
Plus 4 non-blocking payout review concerns (processPayout completion guard, weekly-settlement dedupe,
getPayoutBalance float-sum, hardcoded 'PANDIT' role) — all in `batch5-review.md`.

### Verified-healthy (do not re-audit)

- **A-004** — _(healthy)_ demo tokens rejected in prod, clean 401s, no detail leak
- **M-005** — _(healthy — issue can be CLOSED)_ prod serves a live key server-side; no key inlined in the bundle
- **M-006** — _(healthy — do not refile)_ genuinely fixed; only references are a test asserting it is unused

---

### Open P0s

| ID | What | Where | State |
|---|---|---|---|
| ~~RV-01~~ | NRI billed rupees as dollars — 83.5× overcharge | `routes/bookings.ts` | ✅ **FIXED** (Batch 1) |
| ~~A-001~~ | Entire `public/` dir served one level deep | `apps/web/Dockerfile` | ✅ **FIXED** (Batch 2) — needs deploy to confirm |
| ~~S2C-01~~ | NRI/USD checkout dead-ends | `pujas/book/page.tsx` | ✅ **FIXED** (Batch 1) |
| **A-005** | Auth bypass — forge `email-<uuid>-<hex>` → any account incl. admin | `middlewares/auth.ts:204` | ✅ fix written, **undeployed** |
| **S2C-15** | Commission ledger writes platform's 20% + wrong ID type | `payment.service.ts:232` | ⏳ **needs owner call** (data migration) |

> All four original P0s now have fixes written. **None are deployed** — owner is batching the push.

Severity: **P0** blocks launch/revenue · **P1** breaks a role journey · **P2** friction/quality · **P3** cleanup.
Category: `bug` · `ux` · `security` · `scalability` · `cleanup`.

---

## 1. Owner decisions on record (2026-08-10)

| Question | Decision |
|---|---|
| Test environment | **Prod read-only + local writes.** Walk prod with Playwright without submitting; do write/unhappy-path testing locally against a throwaway DB. |
| Role credentials | **Claude creates them via seed script** (removes the founder-gated `E2E_DEMO_EMAIL` blocker permanently). |
| Scope | **apps/web + apps/api + apps/admin + apps/mobile** — all four. |
| Payments | **Real ₹1 live transactions in scope.** See the constraint note in §6. |

> ⚠️ **Local-run hazard:** `apps/api/.env` points at the **production** Supabase project. A plain
> `pnpm dev` writes to the live database. The throwaway-DB setup in Phase 1 must land before any local write test.

---

## 2. Prior work — do not rediscover

## What is already known — do not rediscover

Five audit waves have run on Darshya between 2026-05-01 and 2026-08-06, producing roughly 400 distinct findings. The current baseline is the **2026-08-03 launch-readiness audit: 159 issues (18 critical, 48 high), verdict NO-GO at 41/100**, which drove EPIC #223 (29 GitHub issues) and the 7-role marketplace revamp (PRs #225–#235).

**Prior waves, in order:** 2026-05-01 launch-readiness (38 items, C1–L8) · 2026-05-01 UX audit (137 routes curl-probed, 134×200, 10 deferred) · 2026-05-02 content audit (19 fixed / 5 deferred) · 2026-05-02 mobile parity (TD10) · 2026-06-05 UI revamp (brand/type/home/mobile) · 2026-07-01 CEO full-stack audit (18 P0 + ~25 P1) · 2026-07-09/10 security audit (72 findings, 68 fixed via PR #178) · 2026-07-10 fix-spec.md A1–A7 remediation · 2026-07-31 remediation sweep (PRs #181–#189) · 2026-08-03 launch-readiness · 2026-08-05/06 role revamp.

### Closed and live-verified — re-reporting these is a regression claim, not a finding
- **EPIC #223, 20 items fixed:** temple sitemap 404s (#202, four separate root causes, 58/58 deep links now 200) · demo creds stripped from the prod bundle via a compile-time-dead `NODE_ENV` branch (#198) · plaintext password no longer written to localStorage (#199) · signup handles `session:null` with a verify-email screen (#195) · session reaches API (#197) · httpOnly `darshya_session` cookie via @fastify/cookie (#200) · payments create-order returns 201 + razorpayOrderId (#201) · `/auth/logout` route · `/festivals`→`/festival` redirect · gaushala `gs_*`→cow links · onboarding CTA → `/onboarding/view?role=` · `lib/friendly-error.ts` · Inbox 401 poll-storm stopped · catalog edge-cache headers.
- **Role revamp PRs #225–#231:** pandit tiered dispatch (T1 instant / T2 1-hr / T3 senior / T4 scheduled) + refund ladder 100/75/50/25/0 · devotee live `DevoteeTodaySection` replacing 4 mock widgets + digest-unsubscribe loop closed · astrologer take-rate 30→20%, go-online toggle, earnings 403 fixed · store COD commission leak fixed + real checkout addresses + tracking numbers · wellness live-room editor + instructor-share earnings · gaushala adoption CTAs wired to `/donations` with plan prefill · temple `availableSlots` editor + `GET /temple-portal/bookings`.
- **Cross-cutting #233/#235:** unified `PayoutRequest` lifecycle for **all** provider roles (previously only priests had payouts) · temple revenue share `TemplePayout` at 5% default · panchang push persisted (`PushSubscription` was in-memory and silently no-opped) · recurring subscriptions intent layer · live directories.
- **Security PR #178 (68 of 72):** video-call room paid gate · priest verification gate · donation verify order-id/ownership check · `PATCH /bookings/:id` IDOR + arbitrary-body spread · `/providers` leaking userId/GST/aadhaar/commission · temple detail leaking phone/email/streamUrl · astrologer dashboard/earnings UUID-vs-slug mismatch · paid consultations now write a Commission · booking wizard now charges platform fee + prasad · store order no longer trusts client-supplied total.
- **CEO-audit P0s spot-verified still fixed in current source:** `apps/admin/middleware.ts` is fail-**closed** with constant-time compare · `apps/admin/lib/api.ts:33` throws instead of a silent `demo-admin` fallback · `apps/api/src/routes/magic-link.ts:28-36` boot-fatals in prod without `JWT_SECRET` · `apps/mobile/lib/api.ts` fails loud instead of falling back to `localhost:4000`.
- **UI type-scale hierarchy inversion resolved** — `apps/web/app/globals.css:123-129` is now a monotonic clamp ladder.

### Binding technical decisions — treat as constraints, not opportunities
1. **Deploy = Render for both web and API.** Cloudflare Pages abandoned 2026-07-08; CF is DNS/edge only. API `srv-d7mc2n8sfn5c73dfce0g`, web `srv-d970l2ks728c738fc33g`, both `autoDeploy:false`. Render free tier cancels in-flight deploys on every new main push. `[skip ci]` is not honoured by Render.
2. **Edge-runtime requirements are dead.** `docs/caveats.md:30-55,134-146` still mandates `runtime='edge'` and CF `_headers` CSP management — that guidance is stale and will mislead. `runtime='edge'` exports left in files are harmless legacy artifacts; do not require their removal.
3. **Migrations do not auto-apply.** PR → CI green → squash merge → `gh workflow run render-diag.yml -f mode=deploy` → manually `prisma migrate deploy` against `DIRECT_URL` → redeploy API → verify live. `CREATE INDEX CONCURRENTLY` inside a migration is a hard ban (wrapped in a tx → 25001 → blocks every later migration). uuid/text backfills need an explicit `::uuid` cast. Pooled URL instead of `SUPABASE_DIRECT_URL` is a fail.
4. **Economics: uniform 20% platform / 80% provider across every marketplace role**, plus a separate 5% `TEMPLE_SHARE_RATE`. Encoded at `store-commission.service.ts:13` and `payment.service.ts:338`; `booking.service.ts:203-213` reads `priest.commissionRate` as source of truth. Money is `Decimal(10,2)`. Immutable rules: video proof mandatory for puja bookings; NRI pricing 9–10×; priest payout gated on Aadhaar KYC; cancellation up to 24h; temples verified before going live; 80G needs donee registration + PAN. Booking number `BS-YYYYMMDD-XXXXX`, 80G receipt `DR-YYYYMMDD-XXXX`.
5. **Naming is frozen.** Repo folder `bhaktisetu`, packages `@poojly/*`, browser storage keys `poojly_session` / `poojly_user` — renaming logs out every active user. Web says `priest` where the API says `pandit`; portal routes are `/priest` and `/store-admin`, not `/pandit-portal` / `/store-portal`. This bridge is known and accepted.
6. **Free-tier discipline is a hard gate.** GH Actions 2000 min/mo (measured at ~111% on 2026-07-01), Resend 100/day, Supabase 500MB, Render 750hr. Read `docs/free-tier-budgets.md` before adding any workflow/cron/SDK.
7. **Commit hygiene:** Conventional Commits enforced server-side by `commitlint.yml` on every PR including docs-only. Upper-case `P0` in a subject fails subject-case.
8. **fix-spec.md:104-109 explicit out-of-scope** (still binding): full Prisma→shared type generation; backend-wide shared Zod adoption; rewiring web `/store` to a Prisma-backed public endpoint; E2E against a PR preview; operational launch gates U1/U2/U5/U15.

### The single most important caveat on the "fixes"
Three of the twenty EPIC #223 closures — **#197 session→API, #200 httpOnly cookie, #201 create-order** — were unblocked by the **owner disabling Supabase "Confirm email" in the dashboard, not by merged code** (`TASKS.md:14`). If that toggle is re-enabled, or a fresh Supabase project is provisioned, the entire authenticated product regresses to the 41/100 state. Verify the live setting before writing any auth finding. Related load-bearing detail: root `pnpm.overrides` must keep `cookie` at `^2` or @fastify/cookie v11 500s on login.

### Highest-value regression watchlist (fragile fixes)
Supabase email-confirm OFF · `cookie` override pin · admin middleware fail-closed · no `demo-admin` fallback · no `localhost:4000` mobile fallback · magic-link JWT boot guard · no demo creds in the prod bundle · no password/token in localStorage · sitemap URLs all 200 · commission/payout writes still fire for COD store orders, paid consultations and wellness enrolments · monotonic type scale · take-rate still 0.20.

### QA residue that will be mistaken for corruption
Supabase accounts `qa-audit-probe@gmail.com`, `qa-audit-probe2@outlook.com`, `qa-live-session@gmail.com`, `qa-admin-probe@gmail.com`, `qa-become-probe@example.com`; booking `BS-20260805-T9CHE`; ~7 `/leads/self-onboard` probe rows (astrologer ×2, pandit, wellness, temple `c4342275-…`, gaushala, store). No orders or payments were created — every create-order 401'd at the time.

### Repo-state facts discovered during this recon (not in prior art)
- The working tree is on branch **`feat/recurring-razorpay-planid`, 4 commits ahead of `main`, 0 behind**. Two of those commits are named literally `changes` and would fail commitlint on a PR.
- `main` HEAD is `3f9a245a fix(payments): webhook fails CLOSED when RAZORPAY_WEBHOOK_SECRET unset (#242)` — i.e. issue numbers now run past #242, beyond the #235 documented in `TASKS.md`. Prior art is behind the repo.
- The GTM muhurat layer (`apps/api/src/lib/puja-muhurat.ts`) that `TASKS.md:110-127` calls "uncommitted" **is now tracked and committed**. That prior-art claim is stale.
- `test-results/` at repo root is **not** gitignored (only `apps/web/test-results/` is), so any Playwright run dirties `git status`.
- `docs/agent-reports/DARSHYA_LAUNCH_READINESS_2026-08-03.md` — the report `TASKS.md:7` cites — **does not exist in the repo**. It lives at `E:\NewClaude\docs\agent-reports\` (parent folder, outside git, untracked, unbacked-up). The most-cited audit of the engagement is not version-controlled.

---

## 3. Known false positives — do not refile

- /api/v1/pujas returning 404 at the bare path is BY DESIGN — the public list endpoints are the sub-paths /api/v1/pujas/types and /api/v1/pujas/types/popular. Raised, investigated and dismissed at least twice (docs/handoff.md:2161,2187). Note it round-tripped once: the 2026-07-01 CEO audit re-filed it as P0-16, which was itself the error.
- /store-admin route prefix was MIS-FLAGGED as a bug and verified a false positive (docs/handoff.md:415). Its 4.58s response was assessed as an acceptable cold start for a rarely-hit admin shell, not a perf bug (that assessment predates the Render cutover).
- Bad-spec URLs mistaken for prod 404s, all validated false on 2026-06-02 (71/71 effective green): /priest-portal does not exist — the route is /priest; Sanskrit rashi slugs like /mesha do not exist — routes use English aries…pisces; /api/v1/priests-public is registered at /api/v1/priests (naming-only mismatch, no consumer). Any audit that probes URLs from a spec rather than from the route table will regenerate exactly this noise.
- Five pre-existing failing tests that are NOT regressions: canada-pandit-prospector.test.ts (SyntaxError / CSV_COLUMNS import — fails on clean main), nri-fb-ads-pack.test.mjs (×3) and twitter-thread-pack.test.mjs (×2). Codified in three places: the darshya-code-review skill, scripts/test-agent-summary.mjs:69-70 (regex-filtered out of the verdict), and scripts/agents/pr-review.mjs:65.
- Four security items formally refuted by the 2026-07 audit, requiring no change: B5 the gaushala portal has no IDOR (scoping verified); B6 admin routes DO carry requireRole('admin'); B7 no self-escalation is possible; PUB-09 refuted outright — CORS is not wildcard, rate limiting is present, no stack traces leak, sitemap excludes admin, drafts are filtered, KYC values are masked.
- The API returning 401 to demo tokens is CORRECT behaviour, not a bug. The 2026-08-03 report concludes 'the 401s prove the API is right to reject demo tokens' — the actual defect was the frontend shipping demo login as the only working path.
- The 2026-07-31 sitewide 503s (manifest.json, favicon, OG image, OG tags, plus two days of failed crons) were a Render ACCOUNT-LEVEL free-tier/billing suspension, not code, not the Dockerfile asset copy (verified correct since 2026-07-08). Any future prod-dark cluster must check Render account state before opening code bugs.
- docs/caveats.md is an explicit do-not-refactor register. Do not file: lib/r2.ts is a Supabase Storage adapter and the r2 name is historical (AWS S3 SDK removed deliberately); donations held in a process-local Map is a deliberate MVP shortcut with a straight-to-Prisma plan — do not add Redis; poojly_* storage keys are kept for cross-rebrand session compat; the 80G placeholder PAN AAAGD1234F is intentional demo data; the Razorpay HMAC over `${order_id}|${payment_id}` is exactly per Razorpay spec; the sankalp nested-JSON re-parse in ai.service.ts is load-bearing (~5% of Llama 3.3 responses double-wrap); the mobile drawer's createPortal(document.body) escapes a backdrop-blur stacking context; the Adopt Today card deliberately has no lg:sticky; chat scroll deliberately uses scrollTo not scrollIntoView; Analytics.tsx must stay Suspense-wrapped; Sentry init must be the first executable line in server.ts; AI chat is auth-optional by design (top-of-funnel).
- runtime='edge' exports left in web routes are harmless legacy Cloudflare artifacts post-Render cutover. The darshya-code-review skill explicitly says: 'Do NOT require its removal.'
- The priest↔pandit vocabulary split and the /priest vs /pandit-portal route naming are a KNOWN, ACCEPTED bridge (PROJECT_CONTEXT.md, docs/caveats.md:23-28). Flagging it as an inconsistency is re-deriving documented intent.
- The apps/web admin panels do NOT fetch before session hydration — apps/web/app/admin/page.tsx:129-152 short-circuits on `if (!token) return;` and re-runs on [token]. This was checked and ruled out as a cause of the blank-admin symptom (#211).
- Route/test count discrepancies between documents (~500 routes / 344 endpoints / 65 models / 537 tests in the CEO audit vs 416 tests in PROJECT_CONTEXT.md vs 366 page.tsx + 87 route files here) are measurements from different dates using different counting methods. Do not report a delta between them as a regression — re-count instead of quoting.
- The ~211 TS2786 errors in apps/mobile are a KNOWN baseline caused by two @types/react versions resolving under pnpm (React 18 in apps/mobile, React 19 hoisted at root), not a new regression. fix-spec P1-23 proposed pinning @types/react to ^18.3.0.
- Five mobile-parity gaps were DEFERRED with recorded rationale and should not be re-filed as oversights: antim-sanskar (sensitive, web-first audit trail), astrology chat (needs RN Jitsi SDK + media permissions), account subscriptions management (cancel/refund safer on web), yatra-packages dedicated detail, admin portal screens (desktop-first accepted).

---

## 4. Still open from prior audits

- [OWNER-GATED] #196 phone-OTP dead — Supabase SMS provider unconfigured, returns 'Unsupported phone provider'. Needs an MSG91/Twilio account or the Mobile tab hidden.
- [OWNER-GATED] #205 Razorpay live key not set in Render — still falls back to rzp_test_demo. Blocks all real revenue. Compounding: the live key secret was pasted in chat on 2026-08-06 and must be regenerated; the ₹1 real-payment test was never run; Route and RazorpayX both returned 404 = NOT enabled on the account.
- [OWNER-GATED] #211 admin panels never click-verified — no real admin account exists (needs the owner email in API ADMIN_EMAILS plus a signup). Two independent candidate root causes exist; see conflicts.
- [OWNER-GATED] #203/#204 image optimization — 13/15 homepage images broken (Wikimedia/Unsplash hotlinks), pages 11–15MB, largest single image 5.7MB. Blocked on a self-host-vs-CDN decision. This has been independently rediscovered by FOUR audits (2026-05-03, 2026-07-01, 2026-07-31, 2026-08-03); a fifth rediscovery adds no information — the hosting decision is the deliverable.
- [OWNER-GATED] WhatsApp booking notifications — 11 templates must be created and approved in Meta Manager; booking-notify.service NO-OPS until then. Spec at docs/company/whatsapp-templates-booking-2026-08-04.md.
- [OWNER-GATED] E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD unset — no seeded demo devotee, so 4 of the 7 tests in tests/e2e/booking-tiers.spec.ts SKIP rather than run. Any 'E2E green' claim currently covers the public tier only.
- [OWNER-GATED] RazorpayX / Cashfree payout rails + CA engagement — admin 'Pay Now' is manual with no real money movement; penny-drop bank verification and PAN capture missing; TDS treatment undecided (194-O 0.1% vs 194J 10%).
- [OWNER-GATED] Issue #85 yatra commerce legal — named as the real blocker for live Razorpay (server-derived price, CPA-2019 refund endpoint, GST invoice, licensing). Needs CA/legal review.
- [OWNER-GATED] Issue #179 — the SLA escalation state machine is coded (#187) but 5 stale bookings (priests 821edbe5 ×4, cf18e924 ×1) still await a founder REFUND decision. Money movement was intentionally not automated.
- [OWNER-GATED] Activation gates U1–U16 (docs/activation-gates.md) — Razorpay live KYC, Stripe NRI KYC, Apple Developer $99, Play Console $25, FCM server key, Sentry DSN, WhatsApp Meta business verification, PostHog key, affiliate signups, Supabase password rotation, UNSET ALLOW_DEMO_TOKENS after investor demos, rotate the leaked Resend key, demo MP4 capture, Upstash REDIS_URL, ALLOW_DEMO_PAYMENTS (currently REQUIRED for the API to boot in prod — in direct tension with the security posture), knowledge/gurukul feature flags. Doc is stamped 2026-05-17 and still references Cloudflare Pages env — stale post-cutover.
- [CODE-FIXABLE] 2026-05-01 criticals with NO recorded closure in any later wave — the strongest carry-forward candidates because they are money-path and safety-path items that survived four audits: C2 createBooking accepts past-dated scheduledDate (only /bookings/availability checks); C3 same priest double-bookable at one slot (capacity is per-offering not per-priest, acceptBooking has no conflict check); C5 most admin CRUD is a stub returning hardcoded [] (admin.ts:111-229); C6 User.blocked column does not exist so blocked-state is unenforceable; C8 booking confirmation/cancellation emails never sent (bookingConfirmationEmail imported nowhere).
- [CODE-FIXABLE] 2026-05-01 highs with no recorded closure: H2 Razorpay dispute webhooks (payment.dispute.created/lost/won) unhandled; H3 non-timing-safe signature compare in verifyPayment; H4 no admin KYC verify route; H5 R2/Supabase upload has no content-type allowlist or size cap; H6 provider-kyc uses $executeRawUnsafe and provider_kyc is not in the Prisma schema (schema drift); H8 signup mints a session without email confirmation; H9 anonymous AI chat at 20/min/IP; H10 refunds are always full-amount with no state gating.
- [CODE-FIXABLE] The 4 explicitly deferred items from security PR #178: PBO-6 admin marking a lead CONVERTED only updates the Lead row — no provider profile, no role assignment, so the approval email is false advertising; PUB-03 the cron ?token= query-string fallback still exists on /admin/cron/youtube-discovery and /apollo-refresh, leaking the secret into logs; wp-02 wellness enrollment verify has no order-id mismatch guard (needs a migration adding wellness_enrollments.razorpay_order_id); AP-07 astrologer dashboard demo-session skip returning hardcoded ZERO_STATS.
- [CODE-FIXABLE] Marketplace Phase 2, six deep builds, still open in priority order: (1) Razorpay Subscriptions mandate + webhooks — recurring_subscriptions is an INTENT layer only, nothing charges; (2) astrologer booking-flow swap — booking still uses a mock fixture, astrologer-resolver.ts exists but is UNWIRED; (3) store PDP + buy-flow for owner products; (4) TemplePriest roster management is seed-only; (5) payout rails; (6) weekly settlement cron.
- [CODE-FIXABLE] CEO-audit items with no recorded closure: ~40 env vars read by apps/api/src/** but absent from .env.example; no Swagger /docs surface for the API (B2B consumers flying blind); TODOs in prod routes (b2b.ts:71 API-key persistence, content.ts:103 like-toggle); dead admin nav link /leads; apps/admin has zero tests; two competing /admin surfaces; mobile push is scaffold-only (expo-notifications not installed) and 30 screens route through portal-placeholder; app version stuck at 1.0.0 build 1; web vitest has 47 TS errors from missing @testing-library/react types; the weekly E2E is a FALSE GREEN (4s runtime = the site-availability test.skip guard short-circuits every spec); lighthouse-weekly cron killed 2026-05-28 so there is no perf watchdog; apps/medusa-store is a stub that neither boots nor was deleted.
- [CODE-FIXABLE] Content-audit deferrals — fake rosters plausibly still rendering: eight demo astrologers with fabricated review counts (12,450 / 8,920 / 6,540) in AstrologyClient.tsx above the real provider strip; six hardcoded wellness instructors with 4.9/4.8/4.7 ratings and stale session dates; /astrology/[id] fabricated review walls (5 reviews each, dated 2026-04-xx) and '10K+ Consults' badges; home 'Our Story' external market stats styled as product KPIs; careers listing five openings with no apply target.
- [CODE-FIXABLE] 2026-06-05 UI debt: 207 occurrences of bare grid-cols-(3-6) with no responsive prefix across 127 files (~1/3 of all web tsx) — named the largest single mobile-UX debt; min-h-screen instead of min-h-[100dvh]; 14px form inputs triggering iOS focus-zoom; missing pb-20 for the 56px MobileBottomTabs; --text-base floor still 15px (below the WCAG 16px body minimum, though it now reaches 17px on wide viewports); 56 Scripture-page saffron violations plus wholesale Astrology/Wellness color misuse; the home page contains zero indigo/emerald/amber classes so it cannot visually express the five categories.
- [CODE-FIXABLE] 2026-05-01 UX deferrals: placeholder support number +91 8000000000 on /help and bookings detail; footer social icons href='#'; /pujas list builds slugs from hardcoded mock names so cards land on the same fallback.
- [CODE-FIXABLE] Repo hygiene from the 2026-07-31 sweep: 37 git stashes, ~40 stale branches, 2 dead worktrees (the cf-opennext-migration worktree is dead — that path was abandoned). Those worktrees are ALSO the reason the root Playwright config collects zero tests today. commitlint subject-case rejects upper-case 'P0' — two merged commits would fail a re-run.
- [CODE-FIXABLE] The orchestrator has NEVER gone live: ROADMAP_DRY_RUN permanently true, orchestratorPaused:true in docs/roadmap/_budget-snapshot.json (commit 48c71a1), R-Q2-M-011 rotted 34 days firing the T-010 tripwire, 286 roadmap items with 626 TBD placeholder warnings.
- [CODE-FIXABLE, DOCS] docs/caveats.md contains stale post-cutover guidance (mandates runtime='edge', describes CF Pages _headers CSP management); docs/activation-gates.md still references CF Pages env; docs/auth-model.md omits the darshya_session/darshya_refresh cookies, the apps/admin shared-token gate, EmailSession revocation and the ADMIN_EMAILS allowlist; docs/env-vars.md:62 claims NEXT_PUBLIC_API_URL defaults to localhost:4000 when the code defaults to production, and its 'minimum local env' omits the boot-required DATABASE_URL.

---

## 5. Stack, environments, testability

### Stack & local run
## Stack

**Monorepo:** pnpm@10.33.0 (pinned via `packageManager`) + Turborepo ^2.4.4. Workspaces `apps/*`, `packages/*`, `tooling/*`. Root package name is `poojly` (legacy). Members: `apps/{api,web,admin,mobile,darshya-mcp,remotion-pitch}`, `packages/{shared,ui,api-client,analytics}`.

**Node:** `engines.node >=20.0.0`. CI pins Node 20 (`ci.yml:46`); the E2E workflow uses Node 22 (`e2e.yml:45`); both Dockerfiles use `node:20-alpine`. There is no `.nvmrc`/`.node-version`/`.tool-versions`. **This workstation runs Node v24.14.1** — a four-major drift from the deploy runtime. Anything that reproduces only locally must be re-checked on Node 20 before being called a bug.

**Web:** Next.js 15 (App Router), 366 `page.tsx` in `apps/web` + 14 in `apps/admin` = **380 page routes**. `next.config.ts:16` sets `typescript.ignoreBuildErrors: true`, so `next build` does not catch type errors — `turbo type-check` is the real gate. Exactly one redirect exists in next.config (`/kundli`); there are no rewrites and middleware does no rewriting.

**API:** Fastify 5, **87 non-test route files / 467 route declarations**, 30 service files. All 87 are registered: 86 explicitly in `apps/api/src/server.ts:334-424`, and 1 (`payout-requests.ts`) indirectly via `payouts.ts:102` — three money-facing endpoints invisible from server.ts. No global-prefix plugin; every prefix is written by hand. All are `/api/v1/*` except `marketplaceV2Routes` at `/api/v2/marketplace`. Five prefixes are shared by 2–3 plugins.

**Data:** Prisma 6.19.3 → Supabase Postgres. `UserRole` enum: DEVOTEE, PANDIT, STORE_OWNER, ASTROLOGER, WELLNESS_INSTRUCTOR, GAUSHALA_MANAGER, TEMPLE_MANAGER, ADMIN, held in `UserRoleAssignment` with an `isPrimary` flag.

**Mobile:** Expo (`apps/mobile`), expo-secure-store for session, same `poojly_*` key names as web.

### Exact local run commands
| Target | Command | Notes |
|---|---|---|
| Web | `pnpm --filter @poojly/web dev` | port 3000. **This is the webpack path** that served stale chunks. |
| Web (correct for audit) | `pnpm --filter @poojly/web dev:turbo` | `next dev --turbopack --port 3000`. The turbopack fix is a *separate* script — root `pnpm dev` does not use it. |
| Admin app | `pnpm --filter @poojly/admin dev` | port 3001, already turbopack. |
| API | `pnpm --filter @poojly/api dev` | `tsx watch src/server.ts`, port 4000. Requires `pnpm --filter @poojly/api exec prisma generate` first. |
| API (do NOT use locally) | `pnpm --filter @poojly/api start` | runs `prisma migrate deploy` against whatever `DATABASE_URL` resolves to. |
| Unit tests, API | `pnpm --filter @poojly/api test` | bare `vitest run`, ~895 cases in 80 files, DB-free. Verified green on a sample. |
| Unit tests, root | `pnpm test:unit` | bare `vitest run`, root config. |
| Avoid | root `pnpm test` | `turbo test` has `dependsOn: ["build"]` — runs a full monorepo build first. |
| Avoid | root `pnpm dev` | fans out to six processes including `expo start` and `remotion studio`. |

**CI reference sequence** (`ci.yml:29-74`, safest to mirror): `pnpm install --frozen-lockfile` → `prisma generate` → `turbo lint --filter=!@poojly/remotion-pitch` → `type-check` → `test` → `build` → `pnpm mcp:smoke`. Caveat: `lint` is a **no-op** for web/admin/shared/ui — those scripts literally `echo "lint: ok"` because eslint-config-next 15 + eslint 8 crashes on ajv. The real linter is `lint:check`, which CI never runs.

### Required environment
- **API hard-required to boot (any NODE_ENV):** `DATABASE_URL`. Additionally in production: `JWT_SECRET`, `CORS_ORIGIN`.
- **Required for auth to function:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
- **Everything else degrades by contract:** Razorpay/Stripe keys (absent → demo payment mode, signature check skipped), `REDIS_URL` (absent → cache no-ops), `RESEND_API_KEY` (absent → magic-link returns a `devLink` in the response, which is the documented local auth path), Sentry, Groq/Cohere/ElevenLabs, VAPID, WhatsApp, `CRON_AUTH_TOKEN` (absent → cron fails closed).
- **Web:** nothing is boot-required. `NEXT_PUBLIC_API_URL` **defaults to `https://api.darshya.online`** — a web dev server started without `.env.local` silently talks to production. (`docs/env-vars.md:62` incorrectly claims it defaults to localhost.)

### Blocking environment facts
1. **There is no dotenv anywhere in the repo** and no `--env-file` in any script. `src/lib/env.ts` evaluates before anything could load a .env, so a clean-shell API start prints `[FATAL] Environment validation failed at boot: DATABASE_URL: Required` and exits 1. Workaround: `tsx --env-file=.env.local watch src/server.ts` or export the vars first.
2. **The `.env` that Prisma *does* auto-load points at the production database and sets `NODE_ENV=production`.** Prisma's generated client hardcodes `schemaEnvPath` to `apps/api/.env`; importing `@prisma/client` flips `NODE_ENV` to production and populates `DATABASE_URL` with the same Supabase project ref as prod. `server.ts:128` then runs `ensureSchemaInvariants()` — **live DDL** (`ALTER TABLE users ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS cows/volunteers/pandit_profiles`) — on every boot. `apps/api/.env.local` is the safe-looking alternative but nothing loads it automatically. `NODE_ENV=production` also disables the demo-token bypass, silently breaking local role testing.
3. **No local Postgres or Redis, and no way to provision one.** TCP probes: 5432 CLOSED, 6379 CLOSED. There is **no docker-compose.yml anywhere in the repo**. `apps/api/scripts/db-setup.sh` just runs generate + migrate deploy + seed against whatever `.env` provides. The only database the repo can reach out of the box is production Supabase.
4. `apps/api/.env` is not clean UTF-8 (`file` reports "data" — UTF-16LE duplicate lines appended). Leading ASCII lines still parse. `apps/api/.env.production` also sits in the tree with prod credentials.

### Repo state right now
Branch `feat/recurring-razorpay-planid`, 4 commits ahead of `main`, 0 behind. Dirty: `CLAUDE.md`, `TASKS.md`, `docs/handoff.md`, graft caches, `playwright-report/index.html`, `test-results/`. Two of the four branch commits are titled literally `changes` and would fail commitlint.

### Environments
## Environments — blunt answer: there is exactly one, and it is production

**There is no staging. There is no preview. There is no PR environment. There is no local database.**

- `render.yaml` defines **exactly two services, both production, both free tier**: `bhaktisetu` (API, node runtime, `healthCheckPath /health`, port 10000, sid `srv-d7mc2n8sfn5c73dfce0g`) and `darshya-web` (docker, `apps/web/Dockerfile`, Next standalone, `healthCheckPath /`, sid `srv-d970l2ks728c738fc33g`). Both `autoDeploy: false`.
- Zero occurrences of "staging" in `render.yaml`, `.github/workflows/**`, `docs/operational-context.md`, or `docs/render-web-cutover-runbook.md`.
- `.github/workflows/e2e.yml:6` states it outright: **"no PR-preview infra exists — see P2-36 in fix-spec.md"**. `fix-spec.md:108` lists "E2E against a PR preview deploy — needs preview infra" as explicitly NOT done.
- **One Supabase project serves everything.** There is no separate test database.
- Cloudflare is DNS + edge proxy only (Pages abandoned 2026-07-08). CF **blocks bot user-agents with 403**, so `WebFetch`-style tooling fails against darshya.online. Use curl or a real browser — Playwright's Chrome UA works (confirmed by a live run during this recon).
- Render free tier **sleeps after 15 min idle with a ~30–50s cold start**. Any E2E run against prod must tolerate a slow first hit or the whole suite flakes.
- Deploys are manual: `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID> -f branch=main`. A new push to main **cancels an in-flight deploy** on free tier.
- Migrations never auto-apply. They must be run by hand against `DIRECT_URL` after the deploy, then the API redeployed so it boots against the new schema.

**Practical consequence for this audit:** every option is unsafe in a different way. Running Playwright with defaults hits production. Running the API locally with default env hits the production database *and executes DDL against it*. The only safe path is for the auditor to stand up their own Postgres, point `apps/api/.env.local` at it, seed it, and launch with an explicit `--env-file`. That is setup work someone has to authorize and do; it does not exist today.

### Testability
## Testability — Playwright works, but four blockers stand in front of it

**Can we run Playwright? Yes, verified working — after fixing the config.** A live chromium run against production returned 3 passed / 1 failed / 1 skipped in 58.7s. The failure was a real selector issue (`nav a[href="/temples"]` matches 12 elements, all `hidden` in the mobile-drawer markup, so `toBeVisible()` times out at `tests/e2e/navigation.spec.ts:16`), not infrastructure.

### Blocker 1 — the root config currently collects ZERO tests
`playwright.config.ts:6-7` uses `testDir: '.'` with `testMatch: ['e2e/**/*.spec.ts','tests/e2e/**/*.spec.ts']`. Playwright prefixes those with `**/`, so collection recurses into two stale gitignored git worktrees (`.claude/worktrees/cf-opennext-migration/`, `.worktrees/darshya-agent-company/`) that carry their own `node_modules` copy of `@playwright/test`. Result: `Error: Requiring @playwright/test second time` → `Total: 0 tests in 0 files`. **A path filter does not help** — collection dies before filtering. Proven fix: add `testIgnore: ['**/.claude/**','**/.worktrees/**','**/node_modules/**']` → 326 tests in 22 files collected.

### Blocker 2 — WebKit is not downloaded
The Playwright cache has chromium-1217, chromium_headless_shell-1217, ffmpeg-1011, winldd-1007. Missing: firefox-1511, webkit-2272. The config's second project `mobile-safari` (iPhone 13) is WebKit, so it cannot run until `pnpm exec playwright install webkit`. Use `--project=chromium` in the meantime.

### Blocker 3 — the default target is production
`baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://darshya.online'`. `e2e.yml` runs weekly against prod with `continue-on-error`. Override with `PLAYWRIGHT_BASE_URL=http://localhost:3000` once a local stack exists.

### Blocker 4 — running the stack locally is not a one-command operation
See the stack section: no dotenv, no local DB, no docker-compose, and the auto-loaded `.env` points at production with `NODE_ENV=production` while `server.ts:128` runs live DDL on boot.

### Can logged-in role journeys be walked at all?
**Against production: no, not without owner-supplied credentials.** The demo-account map in `apps/web/lib/auth-context.tsx` sits behind a compile-time-dead `if (process.env.NODE_ENV !== 'production')` branch, so Terser strips it from the prod bundle (fix #198). On the API side, `demo-*` tokens are hard-rejected in production and the process boot-fatals if `ALLOW_DEMO_TOKENS=true` there. `E2E_DEMO_EMAIL`/`E2E_DEMO_PASSWORD` are unset, so 4 of the 7 tests in `booking-tiers.spec.ts` **skip** — any "E2E green" claim today covers the public tier only. There are no real seeded accounts for the eight roles on prod.

**Against a local stack: yes, and this is the intended lever.** With `NODE_ENV !== 'production'`, any Bearer token of the form `demo-<handle>-token` maps to a seeded DB user. Handles: `devotee | pandit | priest | store | astro | wellness | gaushala | temple | admin`. Browser storage keys are `poojly_session` / `poojly_user`, so a Playwright test can inject a session directly. Non-Playwright alternative: `node apps/api/scripts/smoke-all-roles.mjs [api-base] [web-base]` walks all 8 roles across API and web (last reported 88/88 on prod).

**Seed data has a known mismatch.** Two seed paths disagree: `apps/api/prisma/seed.ts:828` uses `astrologer@demo.com`, while `apps/api/scripts/seed-demo-users.ts:46`, the API's `DEMO_ROLE_MAP` (`auth.ts:134`) and `docs/auth-model.md:44` all use `astro@demo.com`. Running `db:seed` alone leaves the astrologer demo token on the synthetic-id fallback where DB-bound routes reject it. **Run both seeds.** Also note these create Prisma `User` rows only — they do NOT create Supabase auth users, so `demo123` is not a real password anywhere server-side.

### Unit/integration testing is healthy
80 API test files (~895 cases) + 33 web files (~220) + 3 shared (~197) + 26 script tests. **All DB-free** — zero test files import the real Prisma singleton; there is a dedicated `apps/api/src/lib/__mocks__/prisma.ts`. Verified green on samples of both API and web suites. Four vitest configs (root, api, web, shared/api-client). `apps/admin` has **no tests at all**. Coverage thresholds are deliberately floor-level (lines 1, functions 40, branches 1, statements 1) as anti-catastrophe-only.

### Side effect to plan for
Playwright writes artifacts into the repo-root `test-results/` directory, which is **not** gitignored (only `apps/web/test-results/` is). Every run dirties `git status` — already visible in the current working tree.

---

## 6. Open GitHub issues (backfilled by hand — recon agent failed)

EPIC **#223** tracks launch readiness. 17 issues open at 2026-08-10:

| # | Sev | Title | Code-fixable? |
|---|---|---|---|
| 196 | P0 | Phone-OTP login non-functional — "Unsupported phone provider" | ❌ owner: Supabase SMS provider (MSG91/Twilio) not configured |
| 211 | P1 | Admin portal entirely blank — every panel 401 | ⚠️ mixed: needs a real admin account **and** root-cause trace |
| 210 | P1 | Cross-portal redirect chaos + non-deterministic role gating | ✅ code |
| 205 | P1 | Razorpay TEST key inlined in prod client bundle | ⚠️ owner sets live key; code should stop inlining it |
| 204 | P1 | /store 15.2 MB & /pujas 11.6 MB page weight | ✅ code |
| 203 | P1 | Homepage & /darshan ~13/15 images broken (hotlinks) | ✅ code + asset decision |
| 222 | P2 | Banner stacking; dashboard mixes real zero-states with demo widgets | ✅ code |
| 216 | P2 | /blog is a stub but prominent in nav + footer | ✅ code/content |
| 179 | P0 | SLA: 5 puja bookings missing video proof past 24h | ⚠️ operational |
| 85 | — | Yatra commerce hardening before live Razorpay key | ✅ code |
| 190,191,192,193,194,232 | P0 | Auto-filed "funnel fell 100%" (landing/signup/kyc/booking/payment_success) | ❓ **likely artifact of a zero-traffic funnel, not a regression — verify before triaging** |
| 223 | EPIC | Launch-readiness roadmap | — |

**Payments constraint:** a real ₹1 live transaction cannot be executed by Claude — it requires entering
payment credentials in a UPI app on the owner's phone, which Claude must not do. Claude will build and verify
everything up to the authorization step (order creation, webhook signature handling, commission/split math,
refund ladder), then hand the final tap to the owner and verify the resulting webhook + ledger rows.

---

## 7. Role journeys

### devotee

- **Home route:** `/dashboard`
- **Pages:** 129
- **Key flows:**
  - Puja booking: /pujas → /pujas/[slug] → /pujas/book (4-step wizard: Temple&Date → Devotee Details → Review&Prasad → Razorpay payment) → /checkout/success → /bookings → /bookings/view (video proof, cancel, reschedule, refund)
  - Pandit-offering purchase: /pandits → /pandits/[id] → /checkout/offering
  - Home-puja / wedding request: /pujas/home-puja/book and /pujas/marriage/book (5-step wizards)
  - Store: /store → /store/view → /store/cart → /store/checkout (incl. COD)
  - Astrology: /astrology → /astrology/view → /astrology/[id]/book → /consultation/[id] → /consultation/[id]/success → /profile/consultations
  - Donations & gau seva: /gaushala or /temples/[slug] → /donations?causeId=&planId= → 80G receipt
  - Yatra: /yatra → /yatra/[slug] → /yatra/book (inquiry, not paid) → /profile/yatra-bookings
  - Darshan: /darshan → /darshan/[id] live player + chat → /darshan/[id]/replay
  - Wellness: /wellness → /wellness/instructors/[id] → book
  - Account: /profile, /bookings, /messages, /credits, /upgrade, /refer, /account/subscriptions, /settings/subscription, /settings/earnings
  - Support: /support → /support/ticket/new → /support/tickets → /support/tickets/view
- **Known issues:**
  - Dead link: 'View Details' on /bookings hits /bookings/{id} which does not exist; the real /bookings/view is orphaned
  - Dead link: the only CTA on /pandits/[id] points at /checkout/offering/{id} which does not exist — the pandit-offering funnel is broken
  - Dead link: /support/ticket/new router.pushes to a 404 immediately after a ticket is successfully filed
  - Dead link: /dashboard:223 → /dashboard/bookings (no such route)
  - Dead link: /auth?redirect= from /upgrade, /account/subscriptions, /ask-pandit, /nri
  - /settings/subscription and /settings/earnings are entirely mock — Cancel Subscription, Request Payout and Update Bank Details act on fabricated state
  - /pujas/home-puja/book and /pujas/marriage/book take no payment — handlePay() is a setTimeout showing 'Request received'
  - /store/view resolves against an in-memory PRODUCTS seed, not the DB, so store-owner products are not purchasable
  - /astrology/[id]/book still uses a mock fixture (astrologer-resolver.ts exists but is unwired); /astrology/view keeps a hardcoded astrologer fallback and a hardcoded rating distribution
  - /checkout/offering carries TODO(W4): the endpoint to fetch the offering being checked out does not exist
  - Three empty catch {} blocks in /yatra/book hide submission failures from the user
  - /dashboard has an AuthGuard with no allowedRoles and is not in the middleware matcher — any role renders it
  - Two live refund-policy URLs (/refund and /refunds) and two live privacy policies (/privacy and /privacy/v2), linked inconsistently
  - 13/15 homepage images broken, pages 11–15MB (#203/#204, owner-gated)
  - Prior art unresolved: past-dated bookings accepted (C2); booking confirmation/cancellation emails never sent (C8); refunds always full-amount with no state gating (H10)

### pandit

- **Home route:** `/priest`
- **Pages:** 9
- **Key flows:**
  - Receive dispatch offer (tiered T1 instant / T2 1-hr / T3 senior / T4 scheduled) → Accept or Decline on /priest/bookings
  - Deliver: Start Puja → Mark Complete → Upload Video (video proof is business-rule mandatory)
  - Manage offerings on /priest/services
  - KYC via /provider/kyc (Aadhaar gate for payouts) → earnings on /priest/payouts and the unified /payouts
  - Profile and reviews on /priest/profile, /priest/reviews
  - Messaging with devotees via /priest/messages
- **Known issues:**
  - Chicken-and-egg 403: requireRole('priest') demands an ACTIVE row in the Priest table, but signup creates only a PanditProfile. The backfill in priest.ts creates the Priest row as status:'inactive' AND sits behind the very gate it would unblock — a self-signup pandit is permanently 403 on every /api/v1/priest/* route with no self-service path out
  - Inverse hole: Priest.status defaults to 'active' in the schema and OnboardingService.createProviderProfile never sets it, so anyone who POSTs /onboarding/provider gets active priest status with zero admin approval. requireRole never checks verificationStatus
  - Google OAuth callback stores the untranslated role 'pandit', which no web route map recognises — such a user is permanently bounced from /priest to /dashboard
  - Onboarding creates the provider role with isPrimary:false, so the primary role (and therefore the web's single role string) never changes from devotee
  - Dashboard silently keeps hardcoded fallback stats on API failure (:152,167)
  - /priest/bookings/view:418 says 'in-app messaging coming soon' while /priest/messages renders a real Inbox
  - /priest/payouts has no extracted CTAs — unverified whether payout requests are made there or only on /payouts
  - Prior art unresolved: same priest is double-bookable at one slot (C3 — capacity is per-offering not per-priest, acceptBooking has no conflict check)

### temple_manager

- **Home route:** `/temple-portal`
- **Pages:** 9
- **Key flows:**
  - Publish puja offerings with availableSlots on /temple-portal/pujas (slots editor added in #231 — offerings were previously unbookable)
  - Schedule live darshan streams on /temple-portal/darshan
  - Review incoming bookings on /temple-portal/bookings
  - Track donations on /temple-portal/donations
  - Maintain aarti timings on /temple-portal/schedule
  - Collect the 5% temple revenue share on /temple-portal/payouts (TemplePayout, #235)
- **Known issues:**
  - /temple-portal is the ONLY provider portal missing from middleware.ts PORTAL_PREFIXES — there is no server-side session gate, only the client AuthGuard, so a logged-out visitor renders the full shell before being bounced
  - Dashboard silently falls back to mock data on API failure (:67,78)
  - Aarti timings are editable from TWO places — /temple-portal/schedule and apps/admin /temples/[slug] — with no stated source of truth
  - All 18 /api/v1/temple-portal/* routes gate with bare [authenticateUser] and re-check the role inside each handler body, invisible to preHandler-based review
  - TemplePriest roster management is seed-only — no add/remove/list (Phase-2 PENDING #4)
  - PROJECT_CONTEXT.md rule 3 says platform commission is 20–40% per temple while the 2026-08 doctrine mandates a uniform 20% plus a separate 5% share — unresolved

### astrologer

- **Home route:** `/astrologer-portal`
- **Pages:** 7
- **Key flows:**
  - Set availability slots on /astrologer-portal/availability
  - Go online / offline (setAstrologerOnline in astrologer.service.ts)
  - Accept and run consultations from /astrologer-portal/consultations → /consultation/[id] room
  - Track earnings at 20% platform / 80% astrologer on /astrologer-portal/earnings
  - Appear in the live directory /astrology/astrologers/live (#235)
  - Request payout via the unified /payouts
- **Known issues:**
  - The go-online toggle claimed shipped in #227 has NO corresponding route — /astrologer-portal/online does not exist in the 366-file listing. UNVERIFIED whether it lives inside another page or was never created
  - GET /astrologer-portal/earnings — the money-facing endpoint — is bare [authenticateUser] with no role gate, while the sibling /consultation/astrologer/mine correctly uses requireRole('ASTROLOGER')
  - Devotee-side booking still uses a mock fixture; astrologer-resolver.ts exists but is unwired, so the live directory is read-only (Phase-2 PENDING #2)
  - Dashboard keeps a mock fallback on non-OK/catch (:85-98,120)
  - Prior art deferred: AP-07 astrologer dashboard demo-session skip returning hardcoded ZERO_STATS
  - Content audit deferral: eight fabricated demo astrologers with invented review counts (12,450 / 8,920 / 6,540) may still render above the real provider strip on /astrology, and /astrology/[id] carries fabricated review walls

### store_owner

- **Home route:** `/store-admin`
- **Pages:** 6
- **Key flows:**
  - Add and edit products on /store-admin/products
  - Fulfil orders on /store-admin/orders — Confirm, mark SHIPPED, enter tracking number
  - Review revenue on /store-admin/revenue at 20/80 split (store-commission.service.ts writes the ledger, including COD)
  - Respond to product reviews on /store-admin/reviews
  - Message customers on /store-admin/messages
  - Request payout via the unified /payouts (#233)
- **Known issues:**
  - Owner products are NOT purchasable by devotees — /store/view resolves against the in-memory PRODUCTS seed rather than the DB. Store PDP + buy-flow is Phase-2 PENDING #3
  - Dashboard fallbackData is a hardcoded DashboardData used as initial state AND restored on fetch failure — the owner sees invented revenue when the API is down (:66,169,298)
  - store-admin is the only provider portal with no /subscription page while four others have one
  - All 7 /api/v1/store-admin/* routes gate with bare [authenticateUser] + an inline role check repeated per handler

### wellness_instructor

- **Home route:** `/wellness-portal`
- **Pages:** 7
- **Key flows:**
  - Create classes and sessions with a live-room URL on /wellness-portal/sessions (#229 — classes were previously undeliverable)
  - Manage the student roster on /wellness-portal/students
  - Free-satsang enrolment path
  - Track instructor-share earnings on /wellness-portal/earnings (was gross before #229)
  - Request payout via /payouts
- **Known issues:**
  - POST /api/v1/wellness/book is unauthenticated and decrements spotsLeft on a module-scoped in-memory array — any anonymous caller can exhaust seat inventory until the process restarts. The real DB-backed enrol path lives at the same prefix in a different plugin
  - Same-file gate divergence: /instructor/mine uses requireRole('WELLNESS_INSTRUCTOR') but /dashboard, /students and PATCH /profile in the same file are bare [authenticateUser]
  - Dashboard keeps a mock fallback on failure (:71)
  - Prior art deferred: wp-02 wellness enrollment verify has no order-id mismatch guard — needs a migration adding wellness_enrollments.razorpay_order_id
  - Content audit deferral: six hardcoded instructors with fabricated 4.9/4.8/4.7 ratings and a stale 'upcoming sessions' widget may still render on /wellness

### gaushala_manager

- **Home route:** `/gaushala-portal`
- **Pages:** 6
- **Key flows:**
  - Maintain the cow roster and health records on /gaushala-portal/cows
  - Track donations and export CSV on /gaushala-portal/donations
  - Manage volunteers on /gaushala-portal/volunteers
  - Complete KYC via /provider/kyc from the profile page
  - Receive adoption donations routed from /gaushala → /donations with plan prefill (₹51 / ₹3,000 / ₹30,000 / ₹2,25,000, #230)
- **Known issues:**
  - Dashboard keeps a mock fallback on failure (:95,111) — the old startsWith('demo-') skip left demo managers on hardcoded data
  - No /subscription page for this role while four other provider portals have one
  - 13 gaushala-portal/cows/volunteers routes gate with bare [authenticateUser] plus an inline requireGaushalaManager() helper
  - Prior audit confirmed there is NO IDOR here (B5) — do not re-investigate scoping

### gurukul_manager

- **Home route:** `/gurukul-portal`
- **Pages:** 2
- **Key flows:**
  - Manage gurukul listings and programs
  - Approve or reject admission applications on /gurukul-portal/applications
  - Devotee-facing counterpart: /gurukuls → /gurukuls/[slug] → /gurukuls/apply/[programId]
- **Known issues:**
  - WEAKEST GATE IN THE PRODUCT: not in middleware PORTAL_PREFIXES, no layout.tsx, and the only client guard is an inline isAuthenticated check with NO role check — any logged-in devotee reaches the shell, including the admission-decision screen
  - There is no formal gurukul role in the UserRoleAssignment UserRole enum at all
  - API-side authorization is the only real boundary and is UNVERIFIED
  - Feature is behind NEXT_PUBLIC_GURUKUL_ENABLED (activation gate U16, owner-gated)

### admin (apps/web)

- **Home route:** `/admin`
- **Pages:** 20
- **Key flows:**
  - Approve or reject provider applications on /admin/approvals (sends real emails)
  - Manage the lead pipeline on /admin/leads — Approve + send welcome / Reject + send note
  - Ban or delete users on /admin/users
  - Process payouts on /admin/revenue ('Pay Now')
  - Review commissions on /admin/commissions
  - Handle support tickets on /admin/support → /admin/support/view
  - Oversee consultations, ratings, subscriptions, waitlist, B2B onboarding
  - Trigger outreach agents on /admin/outreach; monitor the agent fleet and roadmap
- **Known issues:**
  - #211 open — admin panels have never been click-verified because no real admin account exists
  - Root cause candidate: the ADMIN_EMAILS allowlist grants API authorization (in authenticateUser and requireRole) but is applied to NEITHER the login response NOR /auth/me, so an owner in ADMIN_EMAILS with no ADMIN role row gets role:'devotee' and AuthGuard bounces them to /dashboard
  - Dead links: /admin/users/{id} from both /admin/users and /admin/approvals; /admin/support/{id} from /admin/support — the real detail pages (users/view, support/view) are orphaned
  - /admin/settings is MOCK data and manages admin access — the highest-risk mock in the product
  - /admin/users/view and /admin/reports are also mock
  - 'Pay Now' on /admin/revenue is manual — RazorpayX/Cashfree rails are not built, so no real money moves
  - admin-api.ts sends only the Bearer header with no credentials:'include' — if the localStorage token clears while the httpOnly cookie survives, every panel 401s with no fallback
  - Prior art unresolved: most admin CRUD is a stub returning hardcoded [] (C5); User.blocked column does not exist so ban is unenforceable (C6); no admin KYC verify route (H4); marking a lead CONVERTED creates no provider profile or role assignment (PBO-6)

### admin (apps/admin internal ops)

- **Home route:** `/funnel`
- **Pages:** 14
- **Key flows:**
  - Analytics: funnel, retention, experiments, leads-conversion
  - Ops queues: bookings, payouts, refunds
  - Temple aarti timings editor (/temples/[slug]) — the only page with real form inputs
  - Gurukul moderation
  - WhatsApp broadcast
  - Content queue: run, auto-post toggle, approve/edit/delete — publishes public content
  - 80G donation CSV export
- **Known issues:**
  - Gated by a shared-token cookie with NO login UI — the darshya_admin_session cookie must be set by hand. If ADMIN_DASHBOARD_TOKEN is unset, EVERY page returns a plain-text 503; if set but the cookie mismatches, EVERY page returns a plain-text 401. This is the most likely literal explanation of '#211 admin blank, every panel 401'
  - Dead nav item: admin-nav.tsx:10 declares /leads, which has no page — a 404 link on every page
  - /bookings has a hard limit=100 with no pagination and will silently truncate
  - Zero tests in the entire app
  - The aarti timings editor overlaps /temple-portal/schedule in apps/web — two editors for one dataset
  - UNVERIFIED whether apps/admin is even deployed — it appears in neither of render.yaml's two services


---

## 8. Route & CTA inventory

## Darshya Audit Inventory — Phase 0

**Totals:** 380 page routes (`apps/web` 366 + `apps/admin` 14) · 467 API route declarations across 87 files · 30 API services.
**Split (apps/web 366):** role portals 66 · transactional core 100 · devotee account/self-serve 29 · supply/B2B landing 9 · marketing/legal/static 35 · programmatic-SEO templated content 127.
**Status legend:** every row is `not audited`. Flags in the Notes column are prior-art carry-forwards, not new findings.

---

### 0. Cross-cutting: confirmed dead links (10)

These have no matching `page.tsx`, no rewrite, and no middleware handling. Root cause for six of them: `apps/web/public/_redirects` is a **Cloudflare Pages** static-asset directive that Render's Next standalone server ignores. Four URLs were rescued with real redirect-shim pages (`/store/[handle]`, `/astrology/[id]`, `/pujas/[slug]/book`, `/yatra/[slug]/book`); the rest were not.

| # | Broken target | Linked from | Impact | Status |
|---|---|---|---|---|
| 1 | `/bookings/{id}` | `bookings/page.tsx:369,378` | Every devotee "View Details" 404s; the real page `/bookings/view?id=` is orphaned | not audited |
| 2 | `/support/tickets/{id}` | `support/ticket/new/page.tsx:82,125`; `support/tickets/page.tsx:161,182` | User is thrown to a 404 the instant they file a ticket | not audited |
| 3 | `/admin/users/{id}` | `admin/users/page.tsx:298,327`; `admin/approvals/page.tsx:285` | Admin cannot open a user record | not audited |
| 4 | `/admin/support/{id}` | `admin/support/page.tsx:192` | Admin cannot open a ticket | not audited |
| 5 | `/checkout/offering/{id}` | `pandits/[id]/page.tsx:89` | The **only** CTA on the pandit profile; breaks the pandit-offering purchase funnel | not audited |
| 6 | `/dashboard/bookings` | `dashboard/page.tsx:223`; `checkout/offering/page.tsx:494` | No `/dashboard` subroutes exist; real route is `/bookings` | not audited |
| 7 | `/auth` (+ `/auth?redirect=`) | `ask-pandit:278`, `upgrade:109`, `account/subscriptions:39`, `nri:133,272` | Unauthenticated visitors bounced to a 404 instead of login | not audited |
| 8 | `/astrologers` | `rudraksha/page.tsx:157`, `rudraksha/[slug]/page.tsx:148` | Route is `/astrology` | not audited |
| 9 | `/weddings/planner.pdf` | `weddings/page.tsx:185` | No PDF exists under `apps/web/public` | not audited |
| 10 | `/leads` (admin app) | `apps/admin/components/admin-nav.tsx:10` | 404 nav item on **every** apps/admin page | not audited |

---

### 1. PUBLIC / unauthenticated

#### 1.1 Auth
| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/auth/login` | `auth/login/page.tsx` (680L) | Sign In · Send OTP · Sign Up | not audited | Demo creds stripped (#198). Phone-OTP tab dead (#196, owner). OTP redirect uses a stale `user` closure → always lands `/dashboard`. |
| `/auth/signup` | `auth/signup/page.tsx` (1185L) | Create Account · Complete Onboarding | not audited | Handles `session:null` with verify-email screen (#195). |
| `/auth/verify` | `auth/verify/page.tsx` | Request a new link | not audited | |
| `/auth/callback` | `auth/callback/page.tsx` | Back to login | not audited | Writes `role` **without** `fromApiRole()` — a Google-signed-in pandit stores `'pandit'`, which no web route map recognises. |
| `/auth/logout` | `auth/logout/page.tsx` | — | not audited | Added 2026-08-05. |

#### 1.2 Marketing / legal / static (35 routes)
| Route(s) | Primary CTAs | Status | Notes |
|---|---|---|---|
| `/` | hero → pujas / darshan / temples | not audited | 13/15 images broken + 11–15MB (#203/#204, owner). Decorative "AI PANDIT" mockup at :499. |
| `/pricing` | upgrade | not audited | ":192 Premium features coming soon". |
| `/refunds` **and** `/refund` | — | not audited | **Two live refund-policy URLs**, linked inconsistently. `/refunds:1` carries `TODO(2026-06): v2 draft pending lawyer review`. |
| `/terms`, `/privacy`, `/privacy/v2`, `/legal/cookies`, `/legal/privacy-uk`, `/shipping` (6) | — | not audited | `/privacy` and `/privacy/v2` coexist — two live privacy policies. |
| `/about`, `/careers`, `/press`, `/contact`, `/faqs`, `/help`, `/status`, `/changelog`, `/updates`, `/why-darshya`, `/launch`, `/pitch` (12) | contact form | not audited | `/help/articles/[lang]/[slug]` is the localized template. |
| `/blog`, `/blog/[slug]` (2) | — | not audited | Stub (#216). |
| `/search`, `/discover`, `/today` (3) | search | not audited | `/search` reads `public/search-index.json`. |
| `/demo`, `/demo/[role]`, `/demo/chat` (3) | role tour | not audited | Demo **tour** pages remain publicly reachable even though demo creds were stripped. |
| `/mobile`, `/mobile/{content,darshan,profile,temples}` (5) | — | not audited | Own `layout.tsx` (72L) with **no guard**. Parallel surface to the Expo app. |
| `/offline` | — | not audited | Paired with `public/sw.js`. |

#### 1.3 Programmatic-SEO templated content — COLLAPSED (127 routes)
| Family group | Count | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| 45 two-page families (`aarti, aditya, ashta-lakshmi, bhakti-saint, calendar, chakras, chalisa, chants, city, darshanas, dashavatar, ekadashi, festival, gita, hindu-philosophies, hindu-symbols, jyotirlinga, mahabharata, masa, muhurat, nakshatra, nava-graha, navaratna, pancha-bhoota, pilgrimage, puranas, ramayana, rashi, rudraksha, sacred-mountains, sacred-rivers, sacred-trees, samskaras, sanatan, sanskrit, sapta-mathruka, sapta-rishis, shakti-peeth, shlokas, tirth, tithi, upanishads, ved, vedas, vedic-yajnas, vrat, yoga-sutras`) — index + `[slug]` | ~90 | prev/next sibling · → `/pujas/{slug}` · Ask a pandit | not audited | Identical shape, 145–310L each. Contains dead link #8 (`/astrologers` from rudraksha). |
| `/deity`, `/deity/[slug]`, `/deity/[slug]/mantras` | 3 | → `/pujas/{slug}`, `/shlokas`, `/aarti`, `/chalisa` | not audited | Highest cross-link density; hub for the puja funnel. |
| `/devi/mahavidyas{,/[slug]}`, `/devi/navadurga{,/[slug]}` | 4 | → `/pujas` | not audited | |
| `/panchang{,/[city],/karana{,/[slug]},/yoga{,/[slug]}}` | 6 | → `/muhurat`, `/astrology/shubh-muhurat` | not audited | `panchang/[city]` is 447L, largest content page. Gurugram was missing from `CITY_TIMES` and silently fell back to Delhi. |
| `/content{,/[slug],/books,/books/[slug],/books/[slug]/[...chapter]}` | 5 | → `/content?type=`, `?search=` | not audited | `content/[slug]:7` documents a deliberate "coming soon" for unwired slugs. |
| `/puja/[city]/[slug]` | 1 | → `/pujas`, `/temples/{city}` | not audited | **Namespace collision risk:** `/puja/*` (SEO) vs `/pujas/*` (transactional), one character apart. |
| `/hi`, `/bn`, `/mr`, `/mr/pune`, `/ta`, `/ta/chennai`, `/te`, `/te/hyderabad` | 8 | localized hub | not audited | Only mr/ta/te have a city child — asymmetric coverage. |
| `/nri`, `/nri/ca`, `/uk` | 3 | → `/upgrade` | not audited | Contains dead link #7 (`/auth?redirect=`). |
| `/shloka-card` | 1 | generate / share | not audited | OG-image routes were `302`'d to `/logo.svg` in `_redirects` — **dead on Render**, so OG URLs may now 404. UNVERIFIED at runtime. |

#### 1.4 Supply acquisition / B2B landing (9 routes)
| Route(s) | Primary CTAs | Status | Notes |
|---|---|---|---|
| `/become-priest`, `/become-astrologer`, `/become-wellness`, `/become-gurukul` (4) | apply / self-onboard | not audited | `become-gurukul` is only 14L — a shell, materially thinner than its siblings. QA left `qa-become-probe@example.com` here. |
| `/list-temple`, `/list-gaushala` (2) | list your institution | not audited | |
| `/for-temple-chains` | contact | not audited | Feeds `/admin/b2b-onboarding`. |
| `/csr-match` | signup (4 fields) | not audited | `:112` "Transparency mock" — 3 cards of **fabricated** transparency data shown to corporate prospects. Web page calls the Next route `/api/csr-match/leads`, **not** the Fastify `/api/v1/csr-match/*` (which has zero callers). |
| `/nri-pujas` | → `/pujas`, `/gift`, `/temples`, `/city/{slug}` | not audited | NRI pricing 9–10× domestic. |

---

### 2. DEVOTEE — home `/dashboard`

#### 2.1 Puja booking (14 routes) — the primary revenue path
| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/pujas` | `pujas/page.tsx` (612L) | Book Now · Book a Pandit at Your Home · Book for Wedding · Load more | not audited | Prior art: list builds slugs from hardcoded mock names. |
| `/pujas/[slug]` | (737L, revalidate 3600) | Book This Puja · Save | not audited | |
| `/pujas/[slug]/book` | (32L) | — | not audited | Redirect shim → `/pujas/book?slug=&temple=`. Good pattern. |
| **`/pujas/book`** | (2233L — largest page in repo) | Select Temple · Select Date · Select Time Slot · Continue · Add Another Devotee · **Proceed to Payment** · Retry · View Booking | not audited | 4-step wizard + Razorpay. Well-hardened: :370-384,457,537 explicitly refuse to fabricate puja data or slot availability. DateInput is muhurat-blind. |
| `/pujas/[slug]/temples` | | View puja / temple | not audited | Honest empty state at :132. |
| `/pujas/home-puja` | | Book a Pandit at Your Home | not audited | |
| `/pujas/home-puja/[slug]` | | Book Now | not audited | ":287 Verified pandits coming soon" — pandit rail is empty. |
| `/pujas/home-puja/book` | | Continue · Request callback | not audited | **:110 mock catalog; `handlePay()` at :119-122 is a `setTimeout` — no API call, no money taken.** A callback form dressed as a booking flow (PBO-5). |
| `/pujas/marriage` | (486L) | Book Your Pandit · Request Quote | not audited | ":282 Verified pandits coming soon". |
| `/pujas/marriage/book` | | Continue · Request callback · Call coordinator | not audited | `:92` mock catalog, same no-payment pattern. |
| `/pujas/pandits/[id]` | (13L) | — | not audited | Legacy redirect → `/pandits`. Curated `home-pujas.ts` profiles (p1-p8, w1-w5) are static placeholders with no real Priest UUIDs. |
| `/pandits` | | pandit card | not audited | |
| `/pandits/[id]` | | Book This Puja | not audited | **Dead link #5** — the page's only CTA. |
| `/checkout/offering` | (760L) | Back to pandits · View my bookings | not audited | `:154 TODO(W4): add GET /api/v1/priests/offerings/:id` — the page cannot fetch the offering it is checking out. Dead link #6 at :494. |

#### 2.2 Checkout / payment (3 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/checkout/success` | View my bookings · Back to home | not audited | noindex. |
| `/store/checkout` (591L) | Add New Address · Back to Cart · View My Orders | not audited | Real saved addresses since #228 (were fake Koramangala/Whitefield). Includes COD. |

#### 2.3 Temples & darshan (6 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/temples` (130L) | temple card | not audited | |
| `/temples/[slug]` (1157L, 2nd largest) | Book Now · → `/darshan/{slug}` · → `/donations?causeId=` | not audited | Three "coming soon" fallbacks (:68, :457, :1029). Subject of #202 sitemap fix — four root causes, easy to half-break. |
| `/temples/[slug]/pujas` | Book now · View temple | not audited | |
| `/darshan` (390L) | stream card | not audited | |
| `/darshan/[id]` (943L) | Join Chat · View Temple · Browse Pujas | not audited | Honest "coming soon" for unseeded streams (:3,18,370,461,489). |
| `/darshan/[id]/replay` (180L) | back | not audited | ":106 Replay coming soon" — honest stub. |

#### 2.4 Store / commerce (4 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/store` (335L) | Add to Cart | not audited | Uses `lib/products.ts` PRODUCTS seed + optional Medusa. |
| `/store/[handle]` (22L) | — | not audited | Redirect shim. Its comment is the canonical documentation of the `_redirects`-dead-on-Render problem. |
| `/store/view` (384L) | Add to Cart · Buy Now | not audited | **Resolves handle against the in-memory PRODUCTS seed, not the DB** — store-owner products are not purchasable. "Store PDP + buy-flow" is Phase-2 PENDING. |
| `/store/cart` (269L) | Continue Shopping · → checkout | not audited | |

#### 2.5 Astrology & consultation (28 routes)
| Route(s) | CTAs | Status | Notes |
|---|---|---|---|
| `/astrology` (234L) | tool cards · Ask a pandit | not audited | Prior art: 8 demo astrologers with fabricated review counts may still render above the real strip. |
| `/astrology/[id]` (17L) | — | not audited | Redirect shim. |
| `/astrology/view` (587L) | **Book Paid Consultation** · Chat Now · Call | not audited | `:177` hardcoded `allAstrologers` fallback; `:228` rating distribution entirely hardcoded. |
| `/astrology/[id]/book` (337L) | Browse Astrologers | not audited | **Phase-2 PENDING #2: still uses a mock fixture; `astrologer-resolver.ts` exists but is UNWIRED.** |
| `/astrology/chat` (674L) | Start Consultation · Send | not audited | |
| `/astrology/kundli` (696L) | Generate Kundli | not audited | Target of the single `next.config.ts` redirect. |
| `/astrology/horoscope`, `/[rashi]`, `/[rashi]/today` (3) | Get Personalized Predictions | not audited | |
| 16 calculators (`baby-name, choghadiya, dasha, hora, kaal-sarp, kundli-milan, lal-kitab, manglik, nakshatra-finder, numerology, pancha-pakshi(+[slug]), pitra-dosh, rahu-kalam, sade-sati, shubh-muhurat, vastu`) | Generate Free Kundli · Ask a pandit | not audited | Content, not transactional. Identical cross-link footer. |
| `/consultation/[id]` (234L) | Browse astrologers | not audited | AuthGuard present. |
| `/consultation/[id]/success` (224L) | Refresh Status · Cancel consultation | not audited | |
| `/profile/consultations` (231L) | Browse Astrologers · Cancel | not audited | |

#### 2.6 Donations & gau seva (3 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/donations` (294L) | cause selection | not audited | Receives `?causeId=` / `?planId=` prefill. 80G receipts. |
| `/gaushala` (693L) | Adopt a Cow · Choose Your Seva Plan · Select Plan | not audited | CTAs wired to `/donations` in #230 with ₹51 / ₹3,000 / ₹30,000 / ₹2,25,000 tiers. |
| `/gaushala/[id]` (732L) | Donate Now | not audited | |

#### 2.7 Yatra & gift (14 routes)
| Route(s) | CTAs | Status | Notes |
|---|---|---|---|
| `/gift`, `/gift/success` (2) | Browse all 40+ pujas | not audited | |
| `/yatra` (361L), `/yatra/[slug]` (505L), `/yatra/[slug]/book` (33L shim) | → book / companion / plan | not audited | |
| `/yatra/book` (753L) | Upload · View my inquiries | not audited | **Three empty `catch {}` at :93, :100, :218** — failures invisible to the user. Inquiry form, not a paid booking. |
| `/yatra/plan` (535L) | — | not audited | |
| `/yatra/companion`, `/yatra/companion/[id]` (2) | companion card | not audited | Prior art: 3 invented testimonials were removed in the content audit. |
| `/yatra/destinations`, `/[slug]` (2) | destination card | not audited | ":104 Detailed itinerary and reviews coming soon". |
| `/yatra-packages`, `/[slug]` (2) | package card | not audited | **Parallel/duplicate surface to `/yatra/[slug]`.** This is the one the web actually calls; the `/api/v1/yatra/*` routes have zero callers. |
| `/profile/yatra-bookings` (200L) | → yatra | not audited | Empty `catch {}` at :59. |

#### 2.8 Wellness (8 routes)
| Route(s) | CTAs | Status | Notes |
|---|---|---|---|
| `/wellness` (403L) | Explore Practices · Book · View Retreats | not audited | Prior art: 6 hardcoded instructors with fabricated ratings + stale session dates. |
| `/wellness/instructors/[id]` (435L) | → `/wellness` | not audited | **No visible booking CTA extracted** — booking appears to route via the hub. Worth a closer look. |
| `/wellness/meditation` (439L) | Book a Session · Explore Yoga | not audited | `:214` decorative "AUDIO PLAYER MOCKUP" — non-functional. |
| `/wellness/yoga` (389L) | Book | not audited | |
| `/wellness/vipassana{,/learn,/centers,/centers/[slug]}` (4) | Apply on official site → | not audited | Centers CTA is an **external** link to dhamma.org — no Darshya transaction. |

#### 2.9 Weddings & lifecycle (8 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/weddings` (197L) | → inquiry / muhurat / packages · download planner | not audited | **Dead link #9.** |
| `/weddings/inquiry` (203L) | submit | not audited | Accepts `?package=` prefill. |
| `/weddings/muhurat` (292L) | Book a wedding planner | not audited | |
| `/weddings/packages` (135L) | → inquiry?package= | not audited | |
| `/matchmaking` (229L) | → kundli-milan / weddings | not audited | |
| `/sankalp` (122L) | → pujas / muhurat | not audited | |
| `/antim-sanskar` (344L) | Call +91 92551 09400 · → book | not audited | Hardcoded published support number. |
| `/antim-sanskar/book` (456L) | submit | not audited | One of the few forms posting to a real dedicated endpoint. |

#### 2.10 Gurukul & learning (7 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/gurukuls` (23L shell), `/gurukuls/[slug]` (16L), `/gurukuls/apply/[programId]` (16L) | apply · submit application | not audited | |
| `/learn-sanskrit`, `/learn-sanskrit/lesson/[id]` (2) | lesson card · quiz | not audited | Fully static catalog, no backend. |
| `/ask-pandit` (371L) | New Conversation · Sign in for full experience | not audited | **Dead link #7** at :278. Auth-optional by design. |
| `/free-pandit-advice`, `/[topic]` (2) | Ask a pandit | not audited | Top-of-funnel, linked from ~20 astrology pages. |

#### 2.11 Account / self-serve (17 routes) — auth-gated
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/dashboard` (391L) | Book a Puja · Explore Pujas | not audited | **Dead link #6** at :223. 4 mock widgets replaced by live `DevoteeTodaySection` in #226. `AuthGuard` has **no `allowedRoles`** — any role renders it; not in middleware matcher. |
| `/profile` (536L) | Save Changes · Back to Dashboard | not audited | `:278,288` "Avatar upload coming soon" — control is decorative. Has AddressManager (#226). |
| `/bookings` (418L) | Book a Puja · **View Details** · cancel | not audited | **Dead link #1** at :369,378. |
| `/bookings/view` (993L) | Download Video · Reschedule · Cancel Booking · Book Again · Contact Support | not audited | Rich and real (POSTs cancel / reschedule / review / request-refund). **Orphaned** by dead link #1. |
| `/messages` (17L) | send message | not audited | Wrapper → `<Inbox role="devotee"/>`. |
| `/payouts` (229L) | request payout | not audited | The real #233 all-roles payout page, backed by `PayoutRequest`. |
| `/provider/kyc` (351L) | submit KYC | not audited | **No AuthGuard, not in middleware matcher.** Gate for priest payouts. |
| `/onboarding/view` (1175L) | Next · Upload · Add Product · Submit for Approval | not audited | Reads `?role=`. Bare `/onboarding` has no page. **Creates the provider role with `isPrimary:false`, so the primary role never changes.** |
| `/credits` (251L) | — | not audited | No CTAs extracted; UNVERIFIED whether purchasable. |
| `/account/subscriptions` (179L) | → `/upgrade` | not audited | **Dead link #7** at :39. Duplicates `/settings/subscription`. |
| `/account/digest/unsubscribe` (75L) | Back to Darshya | not audited | Loop closed in #226. |
| `/upgrade` (278L) | upgrade | not audited | **Dead link #7** at :109. |
| `/refer` (205L) | Sign in to continue | not audited | Correctly uses `/auth/login?next=`. |
| `/settings/subscription` (562L) | Update Payment Method · **Cancel Subscription** · Confirm Cancel | not audited | **HIGH-SEVERITY MOCK** — `:23-36` `MOCK_CURRENT_PLAN` / `MOCK_NEXT_BILLING` / `MOCK_BILLING_HISTORY` rendered at :187-188,419. Every CTA acts on fabricated state. |
| `/settings/earnings` (496L) | **Request Payout** · Request Instant Payout · Update Bank Details | not audited | **HIGH-SEVERITY MOCK** — `:18-102` `MOCK_MONTHLY`/`MOCK_TRANSACTIONS`; `:418` comment literally says "(mock form)". Superseded by `/payouts` — dead-but-reachable UI. |
| `/waitlist`, `/confirm`, `/welcome` (3) | join waitlist | not audited | |

#### 2.12 Support & org (9 routes)
| Route | CTAs | Status | Notes |
|---|---|---|---|
| `/support` (213L) | Browse by category | not audited | |
| `/support/faq` (121L) | → ticket/new | not audited | |
| `/support/ticket/new` (281L) | Send · Cancel | not audited | **Dead link #2, worst instance** — `router.push` to a 404 immediately after successful ticket creation. |
| `/support/tickets` (223L) | New ticket | not audited | **Dead link #2** at :161,182. |
| `/support/tickets/view` (369L) | Send · Browse FAQ · Call support | not audited | The real detail page — **orphaned**. |
| `/org` (143L) | → members / settings | not audited | |
| `/org/members` (189L) | Send invite · Remove | not audited | |
| `/org/settings` (107L) | Upgrade | not audited | Swallowed catch `.catch(() => {})` at :44. |
| `/org/accept` (75L) | accept | not audited | |

---

### 3. PANDIT / PRIEST (API role `PANDIT`) — home `/priest` — 9 routes

Gate: middleware ✓ · layout `AuthGuard allowedRoles={['priest']}` · API `priestAuth = [authenticateUser, requireRole('priest')]`.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/priest` | (366L) | → bookings (`?status=confirmed/completed`) | not audited | `:152,167` silently keep hardcoded fallback stats on API failure. KYC states handled at :160-164. |
| `/priest/bookings` | (402L) | **Accept · Decline · Start Puja · Mark Complete · Upload Video** | not audited | `:151` comment flags video URL was previously a hardcoded placeholder POSTed to the API. Video proof is business-rule-mandatory → high risk. Real "API unavailable" throw at :116. |
| `/priest/bookings/view` | (438L) | Accept · Start Puja · Mark Complete · View uploaded video | not audited | `:418` says "In-app messaging coming soon" but `/priest/messages` renders a real Inbox — contradictory copy. |
| `/priest/services` | (453L) | Add Puja · Save · Cancel · Retry | not audited | |
| `/priest/profile` | (466L) | Save | not audited | Benign `catch {}` at :180. |
| `/priest/payouts` | (304L) | — | not audited | No CTAs extracted; UNVERIFIED whether request-payout lives here or only on `/payouts`. |
| `/priest/reviews` | (290L) | Retry | not audited | |
| `/priest/messages` | (14L) | reply · start video call | not audited | Wrapper → `<Inbox role="provider"/>`. |
| `/priest/subscription` | (13L) | upgrade plan | not audited | Wrapper → `<SubscriptionPanel role="priest"/>`. |

---

### 4. TEMPLE MANAGER — home `/temple-portal` — 9 routes

Gate: **middleware ✗ (the only provider portal missing from `PORTAL_PREFIXES`)** · layout `AuthGuard allowedRoles={['temple_manager']}` · API inline `roles.includes('TEMPLE_MANAGER')` in ~14 handlers + per-temple `userCanEditTemple`.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/temple-portal` | (227L) | → pujas / darshan / donations | not audited | `:67,78` silent mock fallback. |
| `/temple-portal/pujas` | (503L) | Save · Cancel · Retry | not audited | `availableSlots` editor added in #231 — before that, offerings were unbookable. |
| `/temple-portal/darshan` | (504L) | Schedule Stream · Save · Cancel | not audited | |
| `/temple-portal/bookings` | (170L) | — | not audited | Added in #231. Likely read-only. |
| `/temple-portal/donations` | (312L) | Retry | not audited | |
| `/temple-portal/schedule` | (201L) | — | not audited | **Overlaps `apps/admin /temples/[slug]`** — two editors for the same aarti dataset. |
| `/temple-portal/payouts` | (148L) | — | not audited | Backed by `TemplePayout` (#235, 5% `TEMPLE_SHARE_RATE`). |
| `/temple-portal/messages` | (14L) | reply | not audited | |
| `/temple-portal/subscription` | (13L) | upgrade plan | not audited | |

---

### 5. ASTROLOGER — home `/astrologer-portal` — 7 routes (+1 unverified)

Gate: middleware ✓ · layout `AuthGuard allowedRoles={['astrologer']}` · API inline `roles.includes('ASTROLOGER')` in 5 handlers; `requireRole('ASTROLOGER')` only on the consultation accept route.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/astrologer-portal` | (252L) | → consultations / availability / profile | not audited | `:85-98,120` still keeps a mock fallback on non-OK/catch. |
| `/astrologer-portal/consultations` | (280L) | — | not audited | |
| `/astrologer-portal/availability` | (307L) | Save · Retry | not audited | |
| `/astrologer-portal/earnings` | (162L) | — | not audited | Was dead (403 from an admin-only route) until #227. Take rate now 20/80. **API endpoint is bare `[authenticateUser]`** — no role gate on the money-facing route. |
| `/astrologer-portal/profile` | (292L) | Save | not audited | |
| `/astrologer-portal/messages` | (14L) | chat · video call | not audited | |
| `/astrologer-portal/subscription` | (13L) | upgrade plan | not audited | |
| `/astrologer-portal/online` | **NOT FOUND** | go-online toggle | not audited | **UNVERIFIED** — #227 claims the toggle shipped, but no such `page.tsx` exists in the 366-file listing. Either it lives inside another page or the route was never created. |

---

### 6. STORE OWNER — home `/store-admin` — 6 routes

Gate: middleware ✓ · layout `AuthGuard allowedRoles={['store_owner']}` · API bare `[authenticateUser]` + inline `roles.includes('STORE_OWNER')` repeated in 7 handlers.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/store-admin` | (528L) | → products / orders | not audited | `:66,169,298` `fallbackData` is a hardcoded `DashboardData` used as initial state **and restored on fetch failure** — the owner sees invented revenue when the API is down. |
| `/store-admin/products` | (642L) | Add Product · Edit · Delete · Save · Retry | not audited | |
| `/store-admin/orders` | (705L) | Confirm · Cancel · Retry | not audited | Tracking-number input on SHIPPED (#228). |
| `/store-admin/revenue` | (107L) | — | not audited | No error state extracted. COD commission leak fixed in #228. |
| `/store-admin/reviews` | (279L) | Retry | not audited | |
| `/store-admin/messages` | (14L) | reply | not audited | **store-admin has NO `/subscription` page** while 4 other provider portals do — inconsistency. |

---

### 7. WELLNESS INSTRUCTOR — home `/wellness-portal` — 7 routes

Gate: middleware ✓ · layout `AuthGuard allowedRoles={['wellness_instructor']}` · API is the most consistent role — `requireRole('WELLNESS_INSTRUCTOR')` declaratively on wellness-sessions routes, but `/dashboard`, `/students` and `PATCH /profile` in `wellness-portal.ts` are bare `[authenticateUser]`.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/wellness-portal` | (245L) | → sessions / students | not audited | `:71` mock fallback on failure. |
| `/wellness-portal/sessions` | (575L) | Add Session · Save · Cancel · Retry | not audited | Live-room editor added in #229 — before that classes were undeliverable. |
| `/wellness-portal/students` | (246L) | Retry | not audited | |
| `/wellness-portal/profile` | (276L) | — | not audited | |
| `/wellness-portal/earnings` | (14L) | — | not audited | Wrapper → `<CommissionsPanel mode="me"/>`. Instructor-share (was gross) fixed in #229. |
| `/wellness-portal/messages` | (14L) | reply | not audited | |
| `/wellness-portal/subscription` | (13L) | upgrade plan | not audited | |

---

### 8. GAUSHALA MANAGER — home `/gaushala-portal` — 6 routes

Gate: middleware ✓ · layout `AuthGuard allowedRoles={['gaushala_manager']}` · API inline `roles.includes('GAUSHALA_MANAGER')`.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/gaushala-portal` | (236L) | View all → | not audited | `:95,111` mock fallback. |
| `/gaushala-portal/cows` | (481L) | View Health Details · Cancel | not audited | |
| `/gaushala-portal/donations` | (254L) | Export CSV | not audited | |
| `/gaushala-portal/volunteers` | (359L) | Add Volunteer · Cancel | not audited | |
| `/gaushala-portal/profile` | (255L) | → `/provider/kyc` | not audited | |
| `/gaushala-portal/messages` | (14L) | reply | not audited | No `/subscription` page for this role either. |

---

### 9. GURUKUL MANAGER — home `/gurukul-portal` — 2 routes

**Weakest gate in the app.** Not in `middleware.ts PORTAL_PREFIXES`; **no `layout.tsx`** (unlike all six other portals). The guard is an inline `if (!isAuthenticated)` at `GurukulPortalClient.tsx:20-42` with **no role check** — any logged-in devotee reaches the shell. There is also no formal `gurukul` role in `UserRoleAssignment`. API-side authz is the only real boundary (UNVERIFIED).

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/gurukul-portal` | (13L shell) | manage listings | not audited | |
| `/gurukul-portal/applications` | (13L shell) | **approve / reject application** | not audited | Admission decisions behind the weakest gate in the product. |

---

### 10. ADMIN (inside `apps/web`) — home `/admin` — 20 routes

Gate: middleware ✓ · layout `AuthGuard allowedRoles={['admin']}` · API `[authenticateUser, requireRole('admin')]` across ~32 route groups in 23 files, plus an `ADMIN_EMAILS` env allowlist inside `requireRole`.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/admin` | (526L) | Download · Retry · → approvals / revenue / users | not audited | `:116` currency formatter "keeps the same visual format as the original mock". #211 open. |
| `/admin/users` | (434L) | **Ban · Delete** · Cancel | not audited | **Dead link #3** at :298,327. |
| `/admin/users/view` | (422L) | Ban | not audited | **MOCK** — `:30` "Mock user data keyed by ID". Orphaned by dead link #3. |
| `/admin/support` | (301L) | — | not audited | **Dead link #4** at :192. |
| `/admin/support/view` | (470L) | Reply to user · Send | not audited | Orphaned. |
| `/admin/approvals` | (329L) | approve / reject · Cancel | not audited | **Dead link #3** at :285. Prior art PBO-6: marking a lead CONVERTED creates no provider profile and no role assignment. |
| `/admin/revenue` | (353L) | **Pay Now** · Send | not audited | "Pay Now" is manual — payout rails not built, so no real money moves. |
| `/admin/commissions` | (14L) | filter by status | not audited | Wrapper → `<CommissionsPanel mode="admin"/>`. |
| `/admin/settings` | (504L) | **Add Admin** · Save · Cancel | not audited | **MOCK** — `:19` "Mock Settings Data". Saving likely does nothing real. **Highest-risk mock in the product: it manages admin access.** |
| `/admin/reports` | (425L) | Download | not audited | `:34` formats to "the older mock format". |
| `/admin/leads` | (582L, largest admin page) | **Approve + send welcome · Reject + send note** · Add · Next | not audited | **Sends real emails.** |
| `/admin/consultations` | (303L) | Complete | not audited | |
| `/admin/b2b-onboarding` | (235L) | — | not audited | |
| `/admin/outreach` | (231L) | **Run outreach now** | not audited | Manually fires an agent — free-tier budget relevant. |
| `/admin/agents` | (152L) | Refresh | not audited | Reads `docs/agent-reports/`. |
| `/admin/roadmap` | (14L shell) | — | not audited | ARE Phase-5 dashboard, 6 panels, noindex. Orchestrator is paused + permanently dry-run. |
| `/admin/metrics` | (210L) | Refresh | not audited | |
| `/admin/ratings` | (216L) | Refresh | not audited | |
| `/admin/subscriptions` | (237L) | — | not audited | |
| `/admin/waitlist` | (182L) | — | not audited | |

---

### 11. ADMIN — `apps/admin`, separate internal-ops Next app — 14 routes

Gate: `apps/admin/middleware.ts` — constant-time compare of the `darshya_admin_session` cookie vs `ADMIN_DASHBOARD_TOKEN`; **fail-CLOSED 503 if the env is unset, 401 if the cookie mismatches**, on essentially every path. There is **no login UI** — the cookie must be set by hand. Shared-token model, not per-user JWT (the per-user migration is an acknowledged deferral). Zero tests.

| Route | File | Primary CTAs | Status | Notes |
|---|---|---|---|---|
| `/` | (5L) | — | not audited | Redirect → `/funnel`. |
| `/funnel` | (160L) | — | not audited | Default landing. |
| `/retention` | (196L) | — | not audited | |
| `/experiments` | (205L) | — | not audited | Backed by `docs/roadmap/_experiments.yml`. |
| `/bookings` | (114L) | — | not audited | **Hard `limit=100` with no pagination** — silently truncates at scale. |
| `/payouts` | (105L) | — | not audited | |
| `/refunds` | (113L) | — | not audited | |
| `/leads-conversion` | (376L) | — | not audited | |
| `/leads` | **NOT FOUND** | — | not audited | **Dead link #10** — declared in the persistent nav; 404 on every page. |
| `/temples` | (103L) | — | not audited | |
| `/temples/[slug]` | (294L) | add aarti name / HH:MM window / special day | not audited | Only page with real form inputs. **Overlaps `/temple-portal/schedule`.** |
| `/gurukuls` | (77L) | — | not audited | |
| `/broadcast` | (60L) | **send broadcast** | not audited | Founder-gated — the 11 Meta templates are not approved, so booking-notify no-ops. |
| `/content-queue` | (363L, largest) | run queue · toggle auto-post · approve / edit / delete | not audited | **Publishes public content — highest blast radius in apps/admin.** |
| `/donations-export` | (118L) | export | not audited | 80G CSV. Business rule 7 applies. |

---

### 12. API surface — appendix (467 declarations / 87 files / 30 services)

Gate vocabulary is **12 distinct mechanisms with no single convention**: `authenticateUser`, `requireRole`, `requireAnyRole`, a locally-redeclared `adminPreHandlers` (in 11 separate files), `priestAuth`, `authPreHandler`, `requireCronBearer`, `requireCronSecretHeader`, `requireApiKey`, `authenticateB2B` + `requireScope`, `requireOrgRole`, and plugin-wide `addHook('preHandler', …)` in 10 files — plus in-handler token compares in 4 more.

| Area | Endpoints of note | Gate style | Status |
|---|---|---|---|
| Auth | `/auth/*` incl. duplicate alias `POST /auth/signup` ≡ `POST /auth/register` | rate-limited 10/min per email | not audited |
| Payments & webhooks | `/payments/webhook` (Razorpay HMAC over rawBody + event-id idempotency), `/webhook/stripe` (SDK constructEvent), `/subscriptions/webhook` (fails closed), `/outreach/{reply,inbound,bounce}-webhook` (Svix, fails closed) | signature | not audited |
| **`/whatsapp/webhook`** | signature check is **conditional on the secret existing** — unsigned payloads are processed when `WHATSAPP_APP_SECRET` is unset, and `recordOptOut()` runs on attacker-supplied phone numbers | **fails OPEN** | not audited |
| **`/outreach/unsubscribe`** | GET + POST flip `Lead.status → UNSUBSCRIBED` with **no auth, no token, no signature** — anyone with a lead UUID | **none** | not audited |
| Unauth order creation | `/gift-puja/create-order` (Stripe PaymentIntent, has its own 10/hr limit), `/yatra-inquiry/create-order` + `/verify-payment` (Razorpay, **no route-level limit**, not in the tightened prefix policy) | none | not audited |
| Unauth LLM cost surface | `/ai/*` and `/astrology/ask` capped 20/min; **`/support/chat` matches no policy prefix → global 100/min only**; `/voice-pandit/turn` is best-defended (10/hr + 50/day) | none | not audited |
| **`/wellness/book`** | decrements `spotsLeft` on a module-scoped in-memory array — any anonymous caller can exhaust seat inventory until restart. The real DB-backed path is `/wellness/sessions/:id/enroll` at the same prefix | none | not audited |
| Provider portals (44 routes) | temple-portal (18), store-admin (7), astrologer-portal (6), gaushala-portal (3), gaushala-cows (6), gaushala-volunteers (4) — all declare bare `[authenticateUser]` and re-implement the role check **inside each handler body**, invisible to any preHandler audit | in-handler | not audited |
| `/admin/ops` + `/admin/metrics` | 6 of 7 ops routes and 3 metrics routes authenticate via **`?token=` in the query string**, leaking the secret into Render access logs and CDN caches; several return user PII. `admin-leads.ts:547` already fixed this pattern with a header-only `x-cron-token` | mixed | not audited |
| `/admin/roadmap/orchestrator-trigger` | no preHandler; in-handler `x-orchestrator-secret` timingSafeEqual; **spawns a detached Node child process**. Sibling `/orchestrator-status` is a hardcoded 410 | header secret | not audited |
| `/b2b/*` | plugin-wide `authenticateB2B` encapsulates **even `GET /openapi.json`** — partners cannot fetch the spec without a key. All 6 data routes return `data: []` with `_stub` markers | API key + scope | not audited |
| `/api/v2/marketplace` | the only non-`/api/v1` prefix; `apps/web/lib/api-config.ts:10-15` unconditionally appends `/api/v1`, so **no web caller can reach it** | `requireApiKey` | not audited |
| `/payouts` | mixes trust levels within one prefix: `/payouts/pandit/mine` uses `requireRole('priest')` while the nested `payout-requests.ts` routes (`/balance`, `/request`, `/my`) are bare `[authenticateUser]`. That file is **never imported by server.ts** — registered indirectly at `payouts.ts:102` | mixed | not audited |
| **Dead prefixes (zero callers in web/admin/mobile)** | `/yatra/*` (7 routes — web calls `/yatra-packages` instead), `/recurring/*` (3), `/dpdp/*` (6, DSAR + consent compliance surface), `/media/upload-url`, `/csr-match/*` (4 — web calls the Next route), `/semantic-search` | — | not audited |
| Services (30) | Money math concentrates in `booking.service.ts` (991L), `cancellation.service.ts`, `payout.service.ts`, `astrologer.service.ts`, `store-commission.service.ts`, `wallet.service.ts`. Largest: `payment.service.ts` (1505L), `astrology.service.ts` (1481L) | — | not audited |

**Reusable artifacts:** `full-routes.txt` (one line per endpoint: METHOD, resolved URL, guard, rawBody marker, `file:line`) and `routes-full.txt` (grouped by file) were generated into the session scratchpad. Caveat: four files export two plugins at two prefixes, so their routes appear twice in `full-routes.txt`; `routes-full.txt` is unaffected.

---

## 9. Proposed audit order

- 1. AUTH + SESSION + ROLE RESOLUTION (highest risk, and a hard prerequisite for everything else). Nothing else can be audited until we can hold a session as each role. This is also where the four concrete #210 root causes and the two #211 candidates live: the Google callback storing an untranslated 'pandit' role, the stale-closure redirect on OTP login, onboarding writing isPrimary:false so the primary role never changes, and two competing redirect paths racing after login. Also confirm the Supabase email-confirm toggle is still off, since three EPIC #223 'fixes' depend on it. Everything downstream is blocked on this; audit it first or audit nothing.
- 2. MONEY PATH — puja booking end to end (/pujas → /pujas/book → Razorpay → /bookings/view). This is the primary and essentially only revenue flow. It is a 2233-line page, it has four unresolved 2026-05-01 criticals sitting on it (past-dated bookings accepted, priest double-booking at one slot, confirmation emails never sent, refunds always full-amount), and its downstream detail page is orphaned by a dead link so every 'View Details' click 404s. Highest revenue risk per hour of audit time.
- 3. PAYMENTS, COMMISSIONS AND PAYOUTS as a single ledger audit (payment.service.ts 1505L, booking.service.ts, cancellation.service.ts refund ladder, store-commission.service.ts, astrologer.service.ts, payout.service.ts, wallet.service.ts, plus /payouts, /admin/revenue, /admin/commissions). Money math is exactly the class of work the project's own rules say must be TDD'd. Verify the uniform 20/80 take-rate actually holds, that COD store orders / paid consultations / wellness enrolments all write a Commission, and that the refund ladder matches the shipped policy. Do this before touching UI so that any UI finding can be judged against known-correct economics.
- 4. WEBHOOK AND UNAUTHENTICATED MUTATION SURFACE. Three specific, verified, file:line-anchored exposures: /outreach/unsubscribe flips Lead.status with no auth, token or signature; /whatsapp/webhook fails OPEN when WHATSAPP_APP_SECRET is unset and then writes opt-out rows keyed by an attacker-supplied phone number; /wellness/book decrements seat inventory on an in-memory array with no auth. Add the unauthenticated order-creation endpoints (/yatra-inquiry/create-order has no route-level rate limit) and the ?token=-in-query-string admin routes that return PII. Small, bounded, high-severity — cheap to do early.
- 5. ADMIN SURFACES, both apps (20 web routes + 14 apps/admin routes). Blast radius is the entire platform: ban/delete users, approve providers, send real emails, process payouts, publish public content, broadcast WhatsApp. /admin/settings is mock data and it manages admin access. Two dead links orphan the users and support detail pages. And #211 has never been click-verified at all — this is the largest completely unexamined region of the product. Gated on question 1 (credentials) and question 6 (apps/admin access).
- 6. PROVIDER PORTALS, in descending revenue exposure: pandit (9 routes — plus the chicken-and-egg 403 that locks self-signup pandits out entirely, and the inverse hole where onboarding grants active priest status with no approval), then store_owner (6 — owner products are not purchasable at all), then astrologer (7 — booking still on a mock fixture, earnings endpoint has no role gate), then temple_manager (9 — the only portal with no server-side gate), then wellness_instructor (7), then gaushala_manager (6). Bundle in the 44 API routes across these portals that gate with bare authenticateUser and re-check the role inside each handler body — that authorization is invisible to any preHandler-based review and is one copy-paste omission from being absent.
- 7. GURUKUL PORTAL (2 routes). Small, but it is the weakest gate in the product: no middleware entry, no layout, no role check, and the screen behind it makes admission decisions. There is not even a gurukul role in the UserRole enum. Cheap to audit, and if the API side turns out not to compensate it is a serious finding.
- 8. DEVOTEE ACCOUNT AND SELF-SERVE (29 routes). Where the two high-severity mocks live — /settings/subscription and /settings/earnings, whose Cancel Subscription / Request Payout / Update Bank Details CTAs all act on fabricated state. Also the /support ticket flow that 404s the user the instant they file, the duplicate subscription surfaces, and the two live refund policies plus two live privacy policies.
- 9. PUBLIC CONVERSION SURFACES that are not the puja funnel: /store commerce, /astrology, /donations + /gaushala, /wellness, /yatra, /weddings, /antim-sanskar, and the supply-acquisition /become-* and /list-* pages. Includes the fake-roster question (fabricated astrologers and instructors with invented review counts), the two no-payment booking wizards, and /csr-match's fabricated 'transparency mock' shown to corporate prospects.
- 10. CROSS-CUTTING WEB HEALTH: the 10 confirmed dead links as one batch, the _redirects-is-dead-on-Render class of bug (four URLs were rescued with shim pages, six were not), the mock-fallback pattern across all six provider dashboards that shows invented revenue when the API is down, and the six swallowed catch blocks. These are systemic and cheaper to audit as one pass than to rediscover per-page.
- 11. PROGRAMMATIC-SEO CONTENT (127 routes, 57 collapsed families). Lowest per-route risk and highest route count — audit the template, not the instances. Sample two or three families and the shared cross-link footer. Note the /puja/* vs /pujas/* namespace collision and the possibility that OG image URLs now 404 post-cutover. Deliberately last.
- 12. MOBILE (apps/mobile). Deferred to the end because it is gated on a working build, an Apple Developer account and a Play Console account, all of which are unmet activation gates — and because its ~211 TS errors are a known baseline, not findings. Do not start this until the owner confirms scope (question 8).

---

## 10. Open questions for the owner

- CREDENTIALS: Can you supply one real working account per role (devotee, pandit, store_owner, astrologer, wellness_instructor, gaushala_manager, temple_manager, admin), or authorize us to create them? Demo tokens are compile-time-stripped from the prod bundle and hard-rejected by the prod API, E2E_DEMO_EMAIL/PASSWORD are unset, and there are no seeded accounts on prod. Without this, ~200 authenticated routes — every portal, the entire booking and payout surface — cannot be walked at all. This is the single largest blocker to the engagement.
- TEST TARGET: Do you want us to test against production (the only environment that exists), or will you authorize us to stand up a local stack? Both options carry risk. Production is the Playwright default and will create real rows. Locally, the .env that Prisma auto-loads points at the PRODUCTION Supabase database and sets NODE_ENV=production, and server.ts:128 runs live DDL (ALTER TABLE / CREATE TABLE IF NOT EXISTS) on every boot — so a careless local run mutates prod schema. There is no docker-compose, no local Postgres, and no staging.
- TEST DATABASE: If we test locally, can you provide a throwaway Supabase project or a Postgres connection string we may seed and destroy? Alternatively, do we have your authorization to run `prisma db seed` and `scripts/seed-demo-users.ts` against a database you nominate?
- PAYMENT TESTING: How far may we take money-path flows? Options: (a) stop at the Razorpay/Stripe order-creation call and never complete a payment; (b) complete payments in test mode (needs test keys we do not have — prod currently falls back to rzp_test_demo); (c) run the ₹1 live-payment test that has never been executed. Also: is ALLOW_DEMO_PAYMENTS still required for the API to boot in prod (activation gate U15), and does that change what a completed checkout actually does?
- DESTRUCTIVE ACTIONS: Which admin CTAs are we permitted to click on production? Specifically: 'Approve + send welcome' and 'Reject + send note' on /admin/leads (sends real emails), Ban and Delete on /admin/users, 'Pay Now' on /admin/revenue, 'Run outreach now' on /admin/outreach (consumes free-tier budget), 'send broadcast' on apps/admin /broadcast, and run/auto-post/delete on apps/admin /content-queue (publishes public content). Default assumption unless you say otherwise: we read-only these and never click.
- APPS/ADMIN ACCESS: Is the separate apps/admin app deployed anywhere? It appears in neither of render.yaml's two services. If it is deployed, what is its URL, is ADMIN_DASHBOARD_TOKEN set, and can you supply the darshya_admin_session cookie value? There is no login UI — the cookie must be set by hand, so the app is entirely unauditable without it.
- SUPABASE RUNTIME STATE: Is 'Confirm email' still DISABLED in the live Supabase project (Authentication → Sign In/Providers → Email)? Three of the twenty EPIC #223 closures (#197 session→API, #200 httpOnly cookie, #201 create-order) are runtime-dependent on that toggle rather than on merged code. We must know before writing any auth finding. Related: is WHATSAPP_APP_SECRET set on the Render API service? If not, the WhatsApp webhook is currently accepting unsigned payloads in production.
- MOBILE SCOPE: Is apps/mobile (Expo) in scope for this audit? It has ~211 known baseline TS errors, no ios/ or android/ folders, its last EAS build was in April and failed, expo-notifications is not installed, 30 screens route through a portal-placeholder, and the app version is stuck at 1.0.0 build 1. Auditing it requires a working build, an Apple Developer account ($99) and a Play Console account ($25) — all listed as unmet activation gates. If it is in scope, that is a separate workstream with its own prerequisites.
- BRANCH: The working tree is on feat/recurring-razorpay-planid, 4 commits ahead of main (two titled literally 'changes'). Should the audit run against main, against this branch, or should this branch be merged or shelved first? main HEAD is already past #242, so the documented prior art (which stops at #235) is behind the code.
- COMMISSION AMBIGUITY: PROJECT_CONTEXT.md immutable rule 3 says 'platform commission 20-40% per temple' while the 2026-08-06 doctrine mandates a uniform 20% plus a separate 5% TEMPLE_SHARE_RATE. Which governs for temples? This determines whether temple money math is a bug or correct.
- QA RESIDUE: Have the 2026-08-05 QA artifacts been deleted (5 Supabase accounts qa-audit-probe@gmail.com / qa-audit-probe2@outlook.com / qa-live-session@gmail.com / qa-admin-probe@gmail.com / qa-become-probe@example.com, booking BS-20260805-T9CHE, ~7 self-onboard lead rows)? If not, we will encounter them and need to know they are ours, not corruption. Also: may we create similar probe rows this round, and who cleans them up?
- MISSING PRIOR ART: docs/agent-reports/DARSHYA_LAUNCH_READINESS_2026-08-03.md — the report TASKS.md:7 cites and the current audit baseline — does not exist in the repo. It lives at E:\NewClaude\docs\agent-reports\, outside git, untracked and unbacked-up. Do you want it copied into the repo? We are read-only and did not move it.

---

## 11. Recon conflicts / unverified claims

## Where the recon disagreed, and what is unverified

### Direct contradictions found during this recon

1. **The GTM muhurat layer is NOT uncommitted.** `TASKS.md:110-127` and the prior-research recon both state that `apps/api/src/lib/puja-muhurat.ts`, the `getPujaMuhurats()` addition and the `/panchang/puja-muhurat` route exist only in the working tree pending founder review. `git ls-files` confirms `puja-muhurat.ts` **is tracked**, and `git status` does not list it as modified. That prior-art claim is stale — the work was committed at some point after TASKS.md was written.

2. **Prior art is behind the code.** All documented issue numbers stop at #235. `main` HEAD is `3f9a245a fix(payments): webhook fails CLOSED when RAZORPAY_WEBHOOK_SECRET unset (#242)`. At least seven issues were opened and at least one closed after the last documentation update. Any statement of the form "N issues open" sourced from `TASKS.md` is unreliable.

3. **The working tree is not on `main`.** Branch `feat/recurring-razorpay-planid`, 4 commits ahead, 0 behind. Two of those commits are titled literally `changes` and would fail the commitlint subject rules the project enforces on every PR. Which ref the audit targets is unresolved.

### Claims I could not verify and am not asserting

- **Every GitHub issue state in this briefing comes from `TASKS.md` prose, not from the issue tracker.** No recon agent queried the GitHub API. "20 fixed / 13 open under EPIC #223" is a documentation claim, not a verified tracker state — and given point 2 above, it is certainly out of date.
- **No runtime behaviour of any web route was checked.** The 380-route inventory is a static file-system and source inventory. Whether each dynamic slug resolves, whether the referenced API endpoints exist server-side, and whether the 10 "confirmed dead links" actually 404 in production were not tested. They are confirmed absent from the route table, which is a strong but not conclusive signal — a rewrite or redirect we did not find could rescue them.
- **In-handler ownership and tenancy checks on the 44 bare-`authenticateUser` portal routes were NOT audited.** Four spot checks (`temple-portal.ts:131`, `store-admin.ts:71`, `gurukul-portal.ts:65`, `gaushala-cows.ts:41`) all had correct checks. The remaining ~40 are UNVERIFIED. This is the single largest unexamined authorization surface and the natural first deep-dive.
- **`apps/admin` deployment status is unknown.** It does not appear in either of `render.yaml`'s two services. Whether it is deployed at all, and whether `ADMIN_DASHBOARD_TOKEN` is set, could not be determined from a read-only repo inspection.
- **`/astrologer-portal/online` does not exist** in the 366-file listing, yet #227 claims the go-online toggle shipped. Either the toggle lives inside another page or the route was never created. Unresolved.
- **OG image URLs post-cutover.** `public/og/*` routes were replaced by `/logo.svg` 302s in `_redirects` to stay under the old Cloudflare 3 MiB worker cap. Those redirects are dead on Render, so OG image URLs may now 404. Not tested.
- **`/priest/payouts` has no extracted CTAs** — unverified whether payout requests are made there or only on the unified `/payouts`. Same for `/credits` (unverified whether purchasable or read-only) and `/wellness/instructors/[id]` (no booking CTA extracted; booking may route via the hub).

### Where recon agents disagreed with each other or with prior art

- **`#211 admin blank / every panel 401` has TWO independent, mutually exclusive candidate root causes and the recon could not choose between them.** (a) `apps/admin` — a separate Next app whose middleware returns plain-text 503 (env unset) or 401 (cookie mismatch) on *every* path, which matches the literal "401 on every panel" wording exactly. (b) `apps/web /admin` — where the `ADMIN_EMAILS` allowlist grants API authorization but is applied to neither the login response nor `/auth/me`, so an owner in the allowlist gets `role:'devotee'` and `AuthGuard` bounces them; this matches `TASKS.md`'s remediation note ("needs a real admin account + ADMIN_EMAILS") but produces a *redirect*, not a 401. Different apps, different root causes, different fixes. The owner must disambiguate.
- **`/api/v1/pujas` bare-path 404** is recorded as a verified false positive twice (`docs/handoff.md:2161,2187`) and then re-filed as P0-16 by the 2026-07-01 CEO audit. The 2026-06-02 dismissal is the more specific and later-confirmed determination, but the finding has round-tripped once and could round-trip again.
- **Temple commission rate.** `PROJECT_CONTEXT.md` immutable rule 3 says 20–40% per temple; the 2026-08-06 doctrine says uniform 20% plus a separate 5% `TEMPLE_SHARE_RATE`. These cannot both be current.
- **Fake astrologer/wellness rosters.** The content audit deferred them in May with no recorded fix, yet #235 shipped a *real* `/astrology/astrologers/live` directory in August while Phase-2 still lists booking as using a mock fixture. Whether the fabricated roster still renders on the main `/astrology` surface is genuinely unknown.
- **Route and test counts differ across every document** (~500 routes / 344 endpoints / 65 models / 537 tests vs 416 tests vs the 380 pages / 467 route declarations / 87 files measured here). Different dates, different counting methods. None is authoritative; re-count rather than quote, and do not report a delta as a regression.
- **`docs/caveats.md` actively contradicts the project's own `CLAUDE.md`** — it mandates `runtime='edge'` on every dynamic route and describes CSP management via Cloudflare Pages `_headers`, both dead since the 2026-07-08 Render cutover. `docs/activation-gates.md` (stamped 2026-05-17), `docs/auth-model.md` and `docs/env-vars.md` are similarly stale. A new agent reading the docs in good faith will be misled.
- **`docs/env-vars.md` is wrong in two ways that matter:** `:62` claims `NEXT_PUBLIC_API_URL` defaults to `localhost:4000` when the code (`api-config.ts:11`) defaults to production; and its stated "minimum local env" omits `DATABASE_URL`, which `env.ts` hard-requires and which exits the process before anything else runs.

### Honest gap statement

This is an inventory built from static source reading plus a small number of read-only shell probes. It is deliberately breadth-first. Two things it is not: it is not a verification that any of the 20 EPIC #223 fixes still hold in production today, and it is not an authorization audit — the 12 different gate mechanisms were catalogued, not exercised. Both require credentials the engagement does not yet have.

---

## 12. Findings log

| ID | Role | Page/Route | Issue | Sev | Cat | Root cause | Status |
|---|---|---|---|---|---|---|---|
| A-001 | all | site-wide | Entire `public/` dir served one level too deep — every static asset 404s | **P0** | bug | `apps/web/Dockerfile:49` `cp -r` nests into an existing dir | **✅ FIXED (Batch 2)** — needs deploy to confirm |
| A-002 | all | `/auth/login` | No password-reset path exists anywhere | P1 | ux | no `/auth/forgot-password` route; no link on login | CONFIRMED — awaiting approval |
| A-003 | provider roles | portals | Portal auth gating is inconsistent: some server-gated (307), some client-only (200 + Loading shell) | ~~P1~~ **P2** | ~~security~~ **ux** | middleware covers only some portals | **✅ FIXED (Batch 6, agent)** — portal gating consistent |
| A-004 | all | API auth boundary (token verify) | _(healthy)_ demo tokens rejected in prod, clean 401s, no detail leak | — | — | verified by probe | PASS |
| A-006 | all | magic-link login | Magic-link tokens never expire and cannot be revoked; logout is a no-op for them | P1 | security | same root cause as A-005 (`email_sessions` empty) | ✅ FIXED by the same change (issuance now persists rows) — awaiting deploy |
| A-007 | all | web session storage | httpOnly cookie is cosmetic — both access + refresh tokens live in JS-readable localStorage (`poojly_session`) | P2 | security | `auth-context.tsx:334`; #200 achieved none of its XSS goal | **✅ FIXED (Batch 6, agent)** — token exposure reduced |
| A-008 | public | `POST /auth/signup` | Raw internal Prisma/Supabase error text returned to unauthenticated clients in prod | P3 | security | `routes/auth.ts:916` echoes `err.message` | **✅ FIXED (Batch 6, agent)** — generic signup error in prod |
| A-009 | all | `POST /auth/refresh` | JTI replay-revoke ledger not seeded at login — the initial (most-stolen) refresh token is unprotected | P3 | security | `routes/auth.ts:457` only inserts the rotated JTI | **✅ FIXED (Batch 6, agent)** — JTI seeded at issuance |
| A-010 | 6 provider roles | onboarding | Devotee→provider onboarding writes `isPrimary:false` → user permanently resolves as devotee, **locked out of their provider portal** | P1 | bug | `onboarding.service.ts:58/213` + `auth.ts:104` resolver | **✅ FIXED (Batch 6, agent)** — onboarded provider role becomes primary |
| A-011 | pandit | Google login | Google callback stores untranslated `pandit` role → pandit lands on devotee dashboard, bounced off `/priest` permanently | P2 | bug | `auth/callback/page.tsx:65` skips `fromApiRole` | **✅ FIXED (Batch 6, agent)** — Google callback translates pandit→priest |
| A-012 | non-devotee | phone-OTP login | Two competing post-login redirects + stale-closure `user` → wrong landing page | P3 | bug | `login/page.tsx:245` stale closure vs `:104` effect | **✅ FIXED (Batch 6, agent)** — stale-closure redirect removed |
| A-013 | temple_manager | `/temple-portal` | Omitted from middleware portal matcher → no server session gate (shell-flash vs clean 307) | P3 | ux | `middleware.ts:24` list missing `/temple-portal` | **✅ FIXED (Batch 6, agent)** — /temple-portal added to middleware |
| A-014 | admin | #211 admin portal | Documented remedy is WRONG: `ADMIN_EMAILS` grants the API gate but NOT the web login role, so an `ADMIN_EMAILS`-only admin is bounced off `/admin` | P1 | bug | `routes/auth.ts:104` `getPrimaryRoleForUser` ignores `ADMIN_EMAILS` | **✅ FIXED (Batch 6, agent)** — login role honours ADMIN_EMAILS — unblocks #211 |
| A-015 | admin | first-admin bootstrap | No code path grants the first ADMIN role — signup can't, `PATCH /admin/users` needs an existing admin; only prod-disabled demo seed or manual DB write | P2 | bug | `auth.ts:68/785`; `admin.ts:216` | **✅ FIXED (Batch 6, agent)** — first-admin bootstrap documented via ADMIN_EMAILS |
| M-001 | devotee | `/pujas/book` (no/incorrect param) | Renders "Could not load puja details — check your connection", blaming the network when no puja was specified | P3 | ux | page requires `?slug=`; bare + `?puja=` both hit the catalog-error branch | **✅ FIXED (Batch 6, agent)** — missing-slug vs network distinguished |
| M-002 | devotee | `/pujas/[slug]/book` | Muhurat layer still NOT wired to the booking date picker — page makes zero panchang/muhurat calls | P2 | ux | `GET /panchang/puja-muhurat` exists but is never called by the booking page | **NOT A CODE DEFECT** — muhurat IS wired in the working tree; undeployed only |
| M-003 | all | booking funnel | React **hydration error #418** on every booking page load | P2 | bug | mismatch between SSR and client render | **✅ FIXED (Batch 6, agent)** — hydration mismatch fixed |
| M-004 | all | site-wide | Service worker registration fails in-browser (`/sw.js` 404) — **live proof of A-001's impact** | P1 | bug | consequence of A-001 Dockerfile nesting | **✅ FIXED (Batch 2)** — consequence of A-001; Dockerfile fix resolves it |
| M-005 | — | `#205` Razorpay key | _(healthy — issue can be CLOSED)_ prod serves a **live** key server-side; no key inlined in the bundle | — | — | `/payments/config` → `{"keyId":"rzp_live_…","isDemo":false}` | PASS — TASKS.md is stale |
| M-006 | — | `/profile/bookings` dead link | _(healthy — do not refile)_ genuinely fixed; only references are a test asserting it is unused | — | — | `__tests__/booking-fixes-phase0.test.tsx:30` | PASS |
| **S2C-01** | **devotee (NRI)** | `/pujas/book` | **🚨 NRI/USD checkout DEAD-ENDS — booking row is created but no Stripe payment can ever be taken.** NRI is the 9-10× revenue tier | ~~P0~~ | **bug** | `pujas/book/page.tsx:906` | **✅ FIXED (Batch 1)** — see fix log |
| S2C-02 | devotee | `/bookings` | "View Details" + "Watch Video" 404 — `/bookings/[id]` route does not exist | P1 | bug | `bookings/page.tsx:369` | **✅ FIXED (Batch 6, agent)** — links point at /bookings/view?id= |
| S2C-03 | devotee | `/bookings/view` | Fabricates a completed booking (fake priest, fake ₹1,301, fake video URL) whenever the API call fails | P1 | bug | `bookings/view/page.tsx:227` | **✅ FIXED (Batch 6, agent)** — fabricated booking deleted; honest error state |
| S2C-04 | devotee | `/bookings/view` | Cancel + review swallow API failures and display success unconditionally | P2 | bug | `bookings/view/page.tsx:264` | **✅ FIXED (Batch 6, agent)** — review submit checks res.ok |
| S2C-05 | devotee | confirmation screen | Invents a `BS-YYYYMMDD-XXXXX` booking number when the server returns none | P3 | bug | `pujas/book/page.tsx:800` | **✅ FIXED (Batch 6, agent)** — no fabricated booking number |
| S2C-06 | public | `/pujas/[slug]` | Renders a fabricated ₹751 product page for ANY slug, including ones the API 404s | P2 | bug | `pujas/[slug]/page.tsx:260` | **✅ FIXED (Batch 6, agent)** — fabricated ₹751 product page deleted |
| S2C-07 | devotee | booking date picker | `getTomorrow()`/`getMaxDate()` compute the window in UTC → IST users 00:00–05:29 can book same-day | P3 | bug | `pujas/book/page.tsx:260` | **✅ FIXED (Batch 6, agent)** — booking window computed in IST |
| S2C-08 | devotee | payment | Razorpay key silently falls back to placeholder `rzp_test_demo` on a live payment page | P2 | bug | `pujas/book/page.tsx:352` | **✅ FIXED (Batch 6, agent)** — no silent rzp_test_demo fallback |
| S2C-10 | devotee | `/dashboard` | `/dashboard/bookings` 404s from two post-purchase CTAs | P3 | bug | `dashboard/page.tsx:223` | **✅ FIXED (Batch 6, agent)** — /dashboard/bookings CTAs repointed |
| S2C-11 | devotee | booking step 1 | Dead-ends silently when a puja has no temple offerings; renders inactive offerings as bookable | P2 | bug | `pujas/book/page.tsx:1281` | **✅ FIXED (Batch 6, agent)** — empty state + inactive offerings filtered |
| S2C-12 | public | `/pujas` | Catalogue search box is dead UI — no state, no handler, no form | P3 | ux | `pujas/page.tsx:337` | **✅ FIXED (Batch 6, agent)** — catalogue search wired |
| **A-005** | **all** | API `authenticateUser` (64 route files) | **🚨 AUTH BYPASS — forge `email-<anyUUID>-<any32hex>` → full session as that user, incl. ADMIN. No secret required** | **P0** | security | `middlewares/auth.ts:204` fail-OPEN + `email_sessions` never written | **✅ FIXED (locally verified: tsc + 893 tests + 4 regression tests) — awaiting deploy** |
| **S2C-15** | pandit | payouts | Puja `Commission` writes the platform's 20% into the field the payout engine treats as the provider's share — **and** `providerId` is a `Priest.id` where reads pass a `User.id`, so today the balance is ₹0.00 | **P1** | bug | `payment.service.ts:232` (both defects in one statement) | ⏳ **OWNER CALL — data migration** |
| S2C-09 | devotee (NRI) | payment | `handleStripePayment` had no in-flight guard — the PBO-16 double-order fix covered only the INR path | ~~P2~~ | bug | `pujas/book/page.tsx:848` | **✅ FIXED (Batch 1)** — handler deleted with the Stripe rail |
| **S2C-13** | **all** | `POST /bookings/from-offering` | **Assigns a priest with NO double-booking guard and skips slot capacity entirely when `availableSlots` is unset** — critical (b) | **P1** | **bug** | `api/routes/bookings.ts:1191` | **✅ FIXED (Batch 5, agent)** — from-offering double-booking guard + slot capacity |
| **S2C-14** | **all** | refunds | **Every auto-processed refund is issued at 100% — the 100/75/50/25/0 ladder is computed for display only and never applied** — critical (d) | **P1** | **bug** | `api/services/refund.service.ts:328` | **✅ FIXED (Batch 3)** — ladder now applied in the auto-refund cron |
| **RV-01** | **devotee (NRI)** | `POST /bookings/from-offering` | **🚨 Bills the INR 9× figure as USD with no FX divide — a ₹1,100 puja charges $9,900.00 instead of $118.56 (83.5× overcharge). On by DEFAULT for any browser outside Asia/Kolkata** | **P0** | **bug** | `routes/bookings.ts:1091` → `payment.service.ts:1309` | **✅ FIXED (Batch 1) — Stripe/USD path deleted; structurally impossible now** |
| RV-02 | — | refund.service.ts | Refund writes no compensating ledger entry — provider Commission and TemplePayout stay PENDING and fully withdrawable on a refunded booking | **P1** | bug | `apps/api/src/services/refund.service.ts:236` | **✅ FIXED (Batch 4)** — refund reverses Commission + TemplePayout; 5 tests |
| RV-03 | — | booking.service.ts | Temple 5% share (TEMPLE_SHARE_RATE) is never written on any real money path — TemplePayout is unreachable for every paid booking | **P1** | bug | `apps/api/src/services/booking.service.ts:404` | **✅ FIXED (Batch 7)** — review found it NOT wired; writer moved to temple-payout.service + called from all 3 confirm paths |
| RV-04 | — | payment.service.ts | Puja Commission row stores the platform's 20% cut in the field the payout engine treats as the provider's 80% net share | **P1** | bug | `apps/api/src/services/payment.service.ts:232` | ⏳ **OWNER-GATED — same defect as S2C-15** (payment.service.ts:232; one commit must fix both halves) |
| RV-05 | — | payout.service.ts | getPayoutBalance subtracts in-flight commissions from a set that already excludes them — provider is short-paid and their commissions are still marked PAID | **P1** | bug | `apps/api/src/services/payout.service.ts:73` | **✅ FIXED (Batch 5, agent)** — getPayoutBalance no longer nets off in-flight (sets are disjoint) |
| RV-06 | — | payout.service.ts | requestPayout reads the balance outside its transaction with no uniqueness or in-flight guard — concurrent calls mint two PayoutRequests for one balance | **P1** | bug | `apps/api/src/services/payout.service.ts:122` | **✅ FIXED (Batch 5, agent)** — requestPayout sizes + links inside one tx; concurrent claim rejected |
| RV-07 | — | booking.service.ts | POST /bookings/:id/cancel initiates no refund and never enters the automated refund queue | **P1** | bug | `apps/api/src/services/booking.service.ts:512` | **✅ FIXED (Batch 3)** — paid cancels now enter the refund queue |
| RV-08 | — | bookings.ts | Video proof never enforced — PATCH /bookings/:id walks completed -> video_uploaded -> delivered with videoProofUrl null, and mints the priest payout on the | **P1** | bug | `apps/api/src/routes/bookings.ts:75` | **✅ FIXED (Batch 5, agent)** — video proof REQUIRED for video_uploaded/delivered + priest/admin only |
| RV-09 | — | booking.service.ts | Rule 6 unenforced on the temple-anchored path — an unverified temple (isVerified false, status pending_review) is listed, detail-served, bookable end-to-en | **P1** | security | `apps/api/src/services/booking.service.ts:142` | **✅ FIXED (Batch 5, agent)** — unverified temples gated on the temple-anchored path |
| RV-10 | — | booking.service.ts | Reschedule performs NO validation of the new date or slot — not the availableSlots whitelist, not maxBookingsPerSlot capacity, not futurity (a booking can  | **P1** | bug | `apps/api/src/services/booking.service.ts:591` | **✅ FIXED (Batch 5, agent)** — reschedule validates slot whitelist, capacity and futurity |
| RV-11 | — | booking.service.ts | Cancel and reschedule measure the 24h window from midnight of the scheduled DAY, not the slot time — devotees are denied up to 23h of their entitled cancel | **P1** | bug | `apps/api/src/services/booking.service.ts:503` | **✅ FIXED (Batch 3)** — 24h cutoff measured from the real slot instant |
| RV-12 | — | payment.service.ts | Admin refund endpoint POST /api/v1/payments/:id/refund is structurally incapable of a partial refund — always 100% of the captured amount | **P2** | bug | `apps/api/src/services/payment.service.ts:1065` | **✅ FIXED (Batch 7)** — review found the ENDPOINT still took no amount; route now accepts amountInr/fullRefund |
| RV-13 | — | bookings.ts | cancel-quote computes the refund tier against midnight instead of the slot time — quotes a worse tier and a negative hoursUntilSlot | **P2** | bug | `apps/api/src/routes/bookings.ts:577` | **✅ FIXED (Batch 3)** — quote is slot-aware |
| RV-14 | — | booking.service.ts | Second Commission writer in booking.service runs outside any transaction, swallows its own failure, and races the payment-path writer with no unique constr | **P2** | bug | `apps/api/src/services/booking.service.ts:365` | **✅ FIXED (Batch 5, agent)** — slot capacity serialized via pg_advisory_xact_lock |
| RV-15 | — | booking.service.ts | Slot capacity is a count-then-create TOCTOU with no lock, no transaction, and no DB constraint — concurrent bookings oversell the slot | **P2** | bug | `apps/api/src/services/booking.service.ts:173` | **✅ FIXED (Batch 5, agent)** — slot race closed (count+create inside one tx) |
| RV-16 | — | page.tsx | Web Cancel button ignores the API response and renders 'cancelled' even on a 409/403 rejection | **P2** | ux | `apps/web/app/bookings/view/page.tsx:258` | **✅ FIXED (Batch 3)** — web cancel checks res.ok |
| RV-17 | — | bookings.ts | Admin priest reassignment via PATCH /bookings/:id is silently discarded and returns 200 with the OLD priest | **P2** | bug | `apps/api/src/routes/bookings.ts:303` | ⚠️ **PARTIAL** — review: reassignment commits then 409s on 3 of 4 statuses. See batch5-review.md |
| RV-18 | — | email.ts | bookingConfirmationEmail is dead code — the only booking email that ships is a tax invoice with no scheduled date/time, and push + WhatsApp are both no-ops | **P2** | ux | `apps/api/src/lib/email.ts:94` | **✅ FIXED (Batch 6, agent)** — confirmation email wired |
| RV-19 | — | booking-notify.service.ts | 'refund' notification event is dead — a processed refund is announced on email only, and never at all to a phone-only devotee | **P2** | ux | `apps/api/src/services/booking-notify.service.ts:52` | **✅ FIXED (Batch 6, agent)** — refund notification fires + reaches phone-only |
| RV-20 | — | schema.prisma | puja_bookings.priest_id is unindexed and is the sole predicate of the entire pandit portal | **P2** | scalability | `apps/api/prisma/schema.prisma:504` | **✅ FIXED (Batch 4)** — @@index([priestId]) + migration |
| RV-21 | — | demo-pay.ts | demo-pay hardcodes a 30/70 split — and the same 70/30 is the PRODUCTION default via Priest.commissionRate | **P3** | cleanup | `apps/api/src/routes/demo-pay.ts:127` | **✅ FIXED (Batch 6, agent)** — demo-pay reads the real 20/80 source of truth |
| RV-22 | — | admin-bookings.ts | Admin pending-payouts summary runs three paginationless findMany calls, one of them re-executed per role | **P3** | scalability | `apps/api/src/routes/admin-bookings.ts:99` | **✅ FIXED (Batch 6, agent)** — admin payouts paginated |

---

### A-001 — `public/` served at `/public/*` instead of `/*` (P0, bug)

**Every static asset on darshya.online returns 404.** Verified 10/10 at root vs nested:

| Asset | `/asset` | `/public/asset` |
|---|---|---|
| `favicon.ico`, `favicon.svg`, `logo.svg`, `logo-dark.svg` | 404 | **200** |
| `manifest.json`, `sw.js`, `search-index.json` | 404 | **200** |
| `og/default.png`, `images/*`, IndexNow key `.txt` | 404 | **200** |

**Not Cloudflare** — the Render origin reproduces it directly (`darshya-web.onrender.com/logo.svg` → 404,
`/public/logo.svg` → 200). Generated routes (`/robots.txt`, `/sitemap.xml` from `app/robots.ts` / `app/sitemap.ts`)
return 200, which is why this was never noticed.

**Root cause — `apps/web/Dockerfile:49`:**
```dockerfile
&& cp -r .next/static .next/standalone/apps/web/.next/static \   # dest does NOT pre-exist → renames, works
&& test -d public \
&& cp -r public .next/standalone/apps/web/public \               # dest DOES pre-exist → nests as public/public/
```
`cp -r SRC DEST` copies *into* DEST when DEST already exists, producing
`.next/standalone/apps/web/public/public/*`. `.next/static` is unaffected because its destination does not pre-exist.

The guard on lines 46–51 was written (per its own comment) so a broken standalone *"fails the BUILD loudly instead
of shipping a 404-serving image"* — but it tests the **source** (`test -d public`), never the destination, so it
shipped precisely the image it was designed to prevent.

**User-visible impact:**
- `ServiceWorkerRegister.tsx:23` + `NotificationPrompt.tsx:82` register `/sw.js` → **service worker never installs**; offline page and web-push contract are dead.
- `/og/default.png` is the OpenGraph image on dozens of pages (`about`, `why-darshya`, `city/[slug]`, `aarti/[slug]`, `contact`…) → **every social/WhatsApp share preview is broken**.
- `manifest.json` 404 → **PWA install prompt cannot work**.
- `search-index.json` 404 → site search index unreachable.
- `images/*` 404 → **this invalidates the #203 remedy**: PR #186 "self-host golden-temple og image" and the
  launch-audit image self-hosting could never have worked, because self-hosted images cannot be served at all.
  #203 is therefore **not fixed**, contrary to the TASKS.md status.
- IndexNow key file 404 → Bing IndexNow verification has been failing silently (contradicts the "U19 self-issued,
  no action needed" note).

**Fix (one line, not yet applied):** `cp -r public/. .next/standalone/apps/web/public/` — and extend the guard to
assert the destination, e.g. `test -f .next/standalone/apps/web/public/favicon.ico`.

**Verification after fix:** `curl -sI https://darshya.online/favicon.ico` → 200, and `/public/favicon.ico` → 404.

---

### A-002 — no password-reset path (P1, ux)

`/auth/forgot-password` → 404, and the rendered login DOM (`/auth/login`) contains only Google / Email / Mobile,
email+password fields, Sign In, and a Sign Up link — **no "Forgot password?" affordance at all**. A user who forgets
their password has no self-serve recovery. A magic-link endpoint exists server-side
(`apps/api/src/routes/magic-link.ts`) but is not surfaced on the login page. Needs a product decision: surface
magic-link as "email me a sign-in link", or build a reset flow.

---

### A-003 — inconsistent portal auth gating (P1, security/ux)

Unauthenticated probes of prod:

| Server-gated (307 → `/auth/login?redirect=…`) | Client-gated (200 + ~93 KB "Loading" shell) |
|---|---|
| `/priest`, `/astrologer-portal`, `/store-admin`, `/gaushala-portal`, `/admin` | `/temple-portal`, `/payouts`, `/profile`, `/dashboard` |

Two different gating mechanisms coexist, which is the likely mechanism behind **#210 "non-deterministic role
gating"**. The client-gated set renders a shell and redirects in JS — a flash-of-loading, and a weaker boundary
(the page ships regardless of session). `/onboarding` → 404 while `/onboarding/view?role=` is the live route.

**Severity downgraded P1 → P2, category security → ux.** The server boundary IS enforced. All 15 portal data
endpoints were probed unauthenticated and every one rejects:

```
/payouts/balance 401   /payouts/my 401            /temple-portal/bookings 401
/priest/bookings 401   /astrologer-portal/earnings 401  /store-admin/products 401
/store-admin/revenue 401  /gaushala-portal/cows 401
/admin/metrics/dashboard 401  /admin/users 401  /admin/leads 401  /admin/revenue 401
```
(the three 404s are POST-only or differently-pathed routes, not gaps). So the client-gated pages render an empty
shell and can never obtain data — this is a flash-of-loading UX defect and an inconsistency, **not** a data leak.

---

### A-004 — API auth boundary (PASS, no defect)

Recorded as a positive result so it is not re-audited. Probed unauthenticated against prod:
- `GET /auth/me` with no header → `401 {"error":"Unauthorized","message":"Missing or invalid Authorization header…"}`
- With `Bearer demo-admin-token` → `401 "Demo tokens not accepted in production."` — the #198 prod hardening is genuinely live
- With a malformed JWT → `401 "Invalid or expired access token."` — no stack trace, no error-detail leak

Corollary: logged-in journeys **cannot** be walked on prod without real credentials, confirming the seed-script-on-
local approach agreed in §1.

---

### 🚨 A-005 — Authentication bypass: any account takeover via a forged `email-` token (P0, security)

**An unauthenticated attacker can act as ANY user — including admin — on live production, with no secret.**

**Mechanism** (`apps/api/src/middlewares/auth.ts:177-232`):
1. Any token starting `email-` is matched against `/^email-([0-9a-f-]{36})-[0-9a-f]{32}$/i` (line 178) — a UUID then 32 hex.
2. It SELECTs `email_sessions WHERE id = <token>` (line 190). **That table is never written** — verified: across `apps/api/src` it is only `CREATE`d (`ensure-schema.ts:427`), SELECT'd here, and UPDATE-revoked (`routes/auth.ts:501`). Zero INSERTs. `magic-link.ts:164` and `whatsapp-otp.ts:137` mint these tokens and return them **without persisting**.
3. Row missing → **"backward-compat allow"** (line 204) — the 32-hex "secret" is never validated against anything.
4. `prisma.user.findUnique({ id: userId })` (line 209) → attaches `request.currentUser` with the victim's **real roles** (lines 215-230).

The branch has **no `NODE_ENV` gate** (unlike the `demo-` branch), so it is live in prod. It is a `preHandler` on **64 route files** — every booking, payout, admin, and profile endpoint.

**Live proof (read-only, no real account touched, no PII seen):**
```
GET /api/v1/auth/me
Authorization: Bearer email-00000000-0000-4000-8000-000000000000-00000000000000000000000000000000
→ 401 {"message":"User not found for session token."}     # reached line 211 — regex + session-gate BOTH passed
Authorization: Bearer email-…-<33 hex>  → "Invalid email session token."   # format gate works (control)
Authorization: Bearer totally-garbage   → "Invalid or expired access token." # Supabase path (control)
```
The forged token cleared the regex **and** the (empty) `email_sessions` gate, failing only at the user lookup because the all-zero UUID doesn't exist. **A real UUID → 200 with that user's session.** User UUIDs are widely exposed (`/auth/me` id, author ids on messages/bookings, public provider profiles), so obtaining a victim UUID — including an admin's — is trivial.

**True root cause:** fail-**open** design (missing row ⇒ allow). Even if `email_sessions` were populated for legit tokens, a *forged* token's random hex would still have no matching row and still be allowed.

**On `origin/main` — confirmed live.** Not a feature-branch artifact.

**Proposed fix (security-sensitive — I will not touch it without your go):**
- Make the branch fail **closed**: require a matching, non-revoked, non-expired `email_sessions` row; on missing row → 401.
- Simultaneously make issuance write the row — `magic-link.ts:164` and `whatsapp-otp.ts:137` INSERT `(id=token, user_id, expires_at, revoked_at=null)`.
- This one change also closes **A-006** (expiry/revocation become enforceable) and makes logout's existing UPDATE (`auth.ts:501`) actually match a row.
- **Interim option if magic-link email login is not yet surfaced in the UI** (it isn't linked on `/auth/login` per A-002): disable the `email-` branch outright (return 401). This closes the bypass in one line with near-zero user impact, buying time for the proper fix. Needs your confirmation that no active users rely on magic-link tokens.

**Verification after fix:** the live PoC above must return 401 *"Invalid email session token"* or a session-not-found for a **real** UUID too (i.e. a forged hex is rejected even when the UUID exists); a genuinely issued magic-link token must still authenticate.

**✅ FIX IMPLEMENTED 2026-08-10 (locally verified, not yet deployed).** 7 files under `apps/api/src`:
- **NEW `lib/email-session.ts`** — `createEmailSession(userId)` mints the token AND `INSERT`s the `email_sessions` row (`id=token, user_id::uuid, expires_at=+7d, revoked_at=NULL`).
- **`middlewares/auth.ts:185-213`** — the `email-` branch now fails **CLOSED**: a missing row → 401 (was "allow"); a DB error → 401 (was "allow"); revoked/expired → 401. Hardened `sessionRow?.[0]` against a non-array response.
- **`routes/magic-link.ts:164`** & **`routes/whatsapp-otp.ts:137`** — both issuance sites now call `createEmailSession` so real tokens get a persisted row.
- **Tests:** `auth.test.ts` gains a self-contained `A-005` regression block (forged/rowless → 401, revoked → 401, expired → 401, valid row → 200; asserts the user lookup is never reached for a rowless token); the two issuance test mocks gained `$executeRawUnsafe`.
- **Verification run:** `tsc --noEmit` clean; **full API suite 893/893 pass** (76 files, leads test excluded per known pre-existing failure); the 4 new A-005 tests green.
- **No migration needed** — `email_sessions` already exists (created by `ensure-schema.ts:427` on boot).
- **Known user impact (accepted with the "proper fix" choice):** any *currently-issued* `email-` token (magic-link / whatsapp-OTP) has no persisted row, so it will be rejected after deploy → those sessions are logged out. Impact is expected to be ~zero: magic-link email login isn't surfaced on `/auth/login` (A-002) and phone-OTP is non-functional in prod (#196), so few/no live `email-` tokens exist. Password/Google/Supabase-JWT sessions are unaffected.
- **PENDING:** commit → merge to `main` → manual Render API deploy (`autoDeploy:false`) → re-run the live PoC (must 401) + confirm a freshly-issued token still authenticates.

---

### A-006 — Magic-link tokens never expire, cannot be revoked (P1, security)

Same root cause as A-005. `/verify` mints `email-${user.id}-${randomBytes(16).hex}` (`magic-link.ts:164`) and returns an advisory JSON `expiresAt` 7 days out, but writes no row and the token carries no self-verified expiry. Middleware only enforces expiry/revocation `if (row)` — and the row never exists — so a legit magic-link token is valid **forever**, and clicking "log out" (`auth.ts:501` UPDATE, 0 rows matched) does not invalidate it. Any leak of the token string (proxy logs, Referer on the verify link, shared-device localStorage) is a permanent, unrevocable credential. Fixed by the same INSERT-at-issuance + fail-closed change as A-005.

---

### #210 root-cause cluster (A-010 / A-011 / A-012 / A-013)

The recon's four candidates for #210 "cross-portal redirect chaos / non-deterministic role gating" were each verified at file:line:

- **A-010 (P1, bug) — provider portal lockout.** `onboarding.service.ts:58` & `:213` create the new provider role with `isPrimary:false` and `update:{}` (no-op); nothing ever flips the prior devotee row off primary. The resolver `getPrimaryRoleForUser` (`auth.ts:104-110`) orders `isPrimary desc, createdAt asc`, so the devotee row (isPrimary:true, older) always wins. A devotee who becomes any of the 6 provider roles via onboarding is permanently resolved as devotee and bounced off their own portal by AuthGuard. Recoverable only by a manual admin `roles[]` update. **This is a real supply-side blocker** — providers onboarded through the self-service flow cannot reach their portal.
- **A-011 (P2, bug) — Google pandit lockout.** `auth/callback/page.tsx:65` stores the API role verbatim; every other login path routes through `fromApiRole` which maps `pandit→priest`. `getRoleDashboardPath` has a `priest` case but no `pandit` case → default `/dashboard`. A pandit who signs in with Google lands on the devotee dashboard and is bounced off `/priest` on every reload. Escape: re-login by email/OTP. Pandit-specific (only role with a web/API name mismatch).
- **A-012 (P3, bug — final URL NEEDS_RUNTIME).** `login/page.tsx:245` computes its post-OTP redirect from a **stale-closure** `user` (null on fresh login → `/dashboard`) while the sibling effect at `:104` uses the fresh user. Which `window.location.href` wins is a navigation race I can't settle statically. Note the prior "middleware vs client-effect race" framing is **REFUTED** — `middleware.ts` does only a session-presence check, no role branch, and the cookie name matches (no mismatch loop). Also: phone-OTP is non-functional in prod (#196), so this path isn't reachable today.
- **A-013 (P3, ux).** `/temple-portal` is omitted from the middleware `PORTAL_PREFIXES` and matcher (`middleware.ts:24,59`) though `temple_manager→/temple-portal`. Temple managers get a client-side shell-flash + redirect instead of the clean server 307 the other five portals emit. Defense-in-depth/consistency gap, not a data hole (the API still 401s — see A-003).

### A-014 / A-015 — #211 admin portal, re-traced

(The first trace agent returned garbage; this is the clean re-trace.)

**Live surface:** `apps/web/app/admin/**` inside the `darshya-web` Next service (`admin/layout.tsx:187` gates on `AuthGuard allowedRoles={['admin']}`). The separate `apps/admin` app is in **neither** render.yaml service — it's undeployed and unrelated to #211 (it uses a shared-secret `ADMIN_DASHBOARD_TOKEN`, fails closed 503 if unset).

**The literal "every panel 401" is the pre-#197 token-propagation failure, genuinely resolved** — the web client attaches the token correctly (`lib/admin-api.ts:100`), the API mounts admin at `/api/v1/admin` (`server.ts:351`), and an admin with an ADMIN role row passes end-to-end. Candidates (b) wrong-header and (c) audience-mismatch are **ruled out**. A valid-token non-admin gets **403**, not 401.

**A-014 (P1, bug) — the documented remedy is wrong and hides a real defect.** Admin-ness is granted by *either* a `UserRoleAssignment(role='ADMIN')` row *or* the `ADMIN_EMAILS` env allow-list — but only for the **API** gate (`middlewares/auth.ts:296,392`). The **web login** role comes from `getPrimaryRoleForUser` (`routes/auth.ts:104-114`), which reads **only** `UserRoleAssignment` and **ignores `ADMIN_EMAILS`**. So TASKS.md's remedy — *"add owner email to `ADMIN_EMAILS` + sign up"* — logs the owner in as `role:'devotee'`, and `AuthGuard` redirects them off `/admin` to `/dashboard`. They pass the API gate but never render a panel. **The real unblock is a `UserRoleAssignment(role='ADMIN')` row for the owner in prod** (owner/ops DB action), OR a code change to make `getPrimaryRoleForUser` honor `ADMIN_EMAILS`.

**A-015 (P2, bug) — no first-admin bootstrap.** `admin` isn't a signup-able role (`auth.ts:68,785`), and `PATCH /admin/users` requires an existing admin (`admin.ts:216`). The first ADMIN row can only come from the prod-disabled demo seed or a manual DB write — a genuine process gap for a fresh environment.

---

## Stage 2 — Money path (puja booking): live read-only walk

Walked on production without submitting anything. Code-level trace of slots/payment/refunds is running separately.

**The booking funnel WORKS on the real path.** `/pujas/[slug]` → Book CTA → `/pujas/rudrabhishek/book` → 307 → `/pujas/book?slug=rudrabhishek` → a 4-step wizard renders correctly: **1 Temple & Date → 2 Devotee Details → 3 Review & Prasad → 4 Payment**, offering Kashi Vishwanath and Somnath at ₹1,100. An earlier suspicion that the entry point was dead was **wrong** and is retracted — `/pujas/book` bare (and with a wrong `?puja=` param) errors, but no user reaches it that way.

**M-001 (P3, ux)** — `/pujas/book` without a valid `?slug=` renders *"Could not load puja details. We couldn't reach the catalog. Please check your connection and retry."* That message blames the user's network for what is actually a missing parameter. Verified the catalog is reachable from that very page: an in-page `fetch('/api/v1/pujas/types?limit=1')` returned **200** with slug `rudrabhishek` while the page simultaneously displayed the connection error.

**M-002 (P2, ux)** — the muhurat layer is **not wired**. `performance.getEntriesByType('resource')` on a loaded booking page shows exactly one API call — `api.darshya.online/api/v1/pujas/types/rudrabhishek` — and **no** `/panchang/puja-muhurat` request. So shubh/neutral/avoid day grading and Rahukaal grey-out never reach the devotee. This confirms the GTM handoff's "web DateInput is muhurat-blind" as still true. Product weight: the launch catalog advertises a *"pandit by muhurat or free + ₹501"* policy, so booking an inauspicious slot is a refund-liability risk, not just a missing nicety. There is also no native `<input type="date">` (custom picker), so the past-date guard (critical (a)) must be judged from the component + server validation — covered by the running code trace.

**M-003 (P2, bug)** — **React error #418 (hydration failure)** fires on every booking page load, including the working `?slug=` path. A hydration mismatch on the page that takes money is worth root-causing; it can cause state resets and is the most likely explanation for the transient error state observed before the tree settled.

**M-004 (P1, bug)** — live proof of **A-001**: the browser console shows *"A bad HTTP response code (404) was received when fetching the script"* and an in-page `fetch('/sw.js')` returns **404**. The service worker never registers on production, so the offline page and the entire web-push contract are dead. This is the same Dockerfile `cp -r` nesting defect, now observed at runtime rather than inferred.

**M-005 (PASS — close the issue)** — **#205 is resolved and further along than TASKS.md records.** `GET /api/v1/payments/config` returns `{"keyId":"rzp_live_…","isDemo":false}` and a grep of the delivered booking-page bundle finds **no** `rzp_` key at all. So the publishable key moved server-side *and* a **live** key is configured. TASKS.md still lists #205 as pending with an `rzp_test_demo` fallback — stale. **Consequence for this audit: production can take real money, so every commission/refund defect found in this stage has real financial impact.**

**M-006 (PASS)** — the `/profile/bookings` dead link is genuinely fixed (route 404s because nothing links to it; a regression test at `__tests__/booking-fixes-phase0.test.tsx:30` asserts the href is absent). Not refiled.

### Stage 2 — code trace: verdicts on the four 2026-05-01 criticals

| # | Critical | Verdict |
|---|---|---|
| (a) | Booking accepts a PAST date | **FIXED** — four independent guards: route Zod `.refine()` (`bookings.ts:19-27`), `/create-order` (`:704-712`), `/from-offering` (`:960-968`), service re-check (`booking.service.ts:134-139`); UI enforces on all 4 entry paths. Residual: UTC window bug → **S2C-07**. |
| (b) | Priest double-booking in one slot | **PARTIALLY REAL** — 2 of 3 priest-assignment paths are guarded (`priest.service.ts:259-273`, `dispatch.service.ts:233-245` in a `$transaction`); the third, `POST /from-offering` (`bookings.ts:1191`), has **no guard at all** → **S2C-13**. |
| (c) | Confirmation emails never sent | **FIXED/WIRED** — `sendPujaBookingInvoice` (`payment.service.ts:19-55`) fires from the post-confirm side effects (`:254-289`); `lib/email.ts:33-36` no-ops gracefully without `RESEND_API_KEY`. It is an invoice+PDF rather than a warm confirmation. _(A competing candidate claiming no email is ever sent is in the UNVERIFIED bucket — see below.)_ |
| (d) | Refunds always full amount | **REAL** — the ladder exists in `cancellation.service.ts:46-57` and is quoted to the devotee, but the executing path issues 100% regardless → **S2C-14**. |

**Correction to M-002 (muhurat).** My live prod walk found zero `/panchang/puja-muhurat` calls, but the code trace found the wiring present at `pujas/book/page.tsx:80-88, 551-591` (slug map, 60-day fetch, green shubh markers, disabled avoid-days). Both observations are correct — **the muhurat wiring exists in the working tree but is not live on production**, consistent with the GTM handoff recording it as uncommitted. M-002 therefore reclassifies from "not built" to **"built but undeployed"**. This is a concrete example of local ≠ prod; treat any code-only verdict in this audit as "true of the working tree", not necessarily of the live site.

### ✅ Stage 2 re-verification COMPLETE (2026-08-10, run `wf_19bdb472-2ac`, 14/14 agents, 0 errors)

All 29 previously-unverified candidates are now settled. Full detail: [`docs/audit/stage2-reverify-results.md`](docs/audit/stage2-reverify-results.md).

| Bucket | Count |
|---|---|
| **CONFIRMED** | **22** (1×P0, 10×P1, 9×P2, 2×P3) |
| REFUTED — do not refile | 6 |
| DUPLICATE of an existing finding | 4 |
| NEEDS_RUNTIME (owner can answer) | 5 |

**Money-path verdict (verbatim): "No. It is not safe to take real payments on this system right now, and it is specifically not safe to switch on the live Stripe key."** Domestic Razorpay capture and the 20/80 split into `booking.platformCommission`/`priestPayout` are correct, and the `PriestPayout` rail genuinely pays pandits — but *everything around the capture* (refunds, cancellations, reschedules, temple share, the unified payout engine) moves or destroys real money, with no automated reconciliation to catch it.

**The three worst, in rupee terms:**
1. **RV-01 (P0) — NRI billed rupees as dollars.** `bookings.ts:1091` multiplies an INR base by 9 and hands the raw product to Stripe as USD cents with no FX divide. A ₹1,100 puja that should cost **$118.56** charges **$9,900.00** — 83.5×, ~₹8.19 lakh of chargeback liability per booking. Triggered by *default* for any browser whose timezone isn't Asia/Kolkata (`checkout/offering/page.tsx:130-137`), not just flagged NRI users; the web page hard-codes the same broken math and displays "Pay $9,900". It only 500s today because `STRIPE_SECRET_KEY` is unset — **verify that key is not already set before anything else.**
2. **Refunds are simultaneously too generous and structurally incomplete.** Every auto-processed refund pays 100% instead of the ladder (S2C-14 — and the admin Approve button posts no body, so it is also always 100%), *and* the refund transaction writes only two rows: it never unwinds the provider `Commission` or the `TemplePayout`. On a ₹5,000 refunded booking the devotee gets ₹5,000 back while ₹1,000 stays withdrawable to the priest and ₹250 pending to the temple — **~₹6,250 out on a booking that earned ₹0**, with no `REVERSED` state in the schema to claw it back.
3. **The payout engine is arithmetically wrong two independent ways.** `payout.service.ts:73` subtracts in-flight commissions from a set that provably already excludes them → a provider with ₹5,000 in flight and ₹9,000 newly earned is paid ₹4,000 while **all** ₹9,000 of their commissions are marked PAID (₹5,000 destroyed, recurring every Monday via the settlement cron). And `requestPayout` reads the balance outside its own transaction with no uniqueness constraint → a double-click mints two `PayoutRequest`s for one balance. **Both are inert today only because `provider_kyc.verified` is never set `true` anywhere in the codebase — that is an accident, not a control.**

Two more that are commercial-integrity failures rather than top-three by rupees: **temples receive ₹0.00 on 100% of paid bookings** (the sole `TemplePayout` writer sits on a path no paid booking can reach — and the only path that *can* reach it belongs to *unpaid* bookings, a perfect inversion), and **video proof — an immutable business rule — is enforced nowhere in the state machine**, so a booking can reach `delivered` with `videoProofUrl` null and mint a ₹2,799 priest payout.

**Notable REFUTALS (do not refile):** the Aadhaar payout-gate bypass, the JS-float money claim, the refund-outside-transaction double-refund, the booking-number collision give-up, and the unbounded-cron claim were all checked and disproved.

**5 questions only you can answer** (in the results doc): is `STRIPE_SECRET_KEY` set on Render right now · is `ENABLE_DEMO_PAY` true in prod · does any `provider_kyc` row have `verified = true` · do concurrent Razorpay refunds serialise gateway-side · how many existing rows need backfill.

<details><summary>Superseded — the incomplete-stage notice this replaces</summary>

### ⚠️ Stage 2 was INCOMPLETE — 29 candidates never verified

All 4 finder agents finished, but the adversarial verify phase hit an account session limit and **29 of 45 verifiers died**. The workflow's own output labelled those 29 `REFUTED`; that label came from a script fallback, **not** from analysis. They are neither proven nor disproven.

- Full preserved output: [`docs/audit/stage2-money-path-raw.md`](docs/audit/stage2-money-path-raw.md) (§A confirmed, §B unverified, §C genuinely refuted)
- Machine-readable resume list: [`docs/audit/stage2-reverify-worklist.json`](docs/audit/stage2-reverify-worklist.json) — 29 items with file:line and the finder's original reasoning

**Only 2 were genuinely refuted** (the refund-UI copy claim, and muhurat-fetch-failure degradation). The other 29 include the most financially severe candidates in the audit and **must be re-verified before any are dismissed or acted on**, e.g.:
- Commission ledger may store the platform's 20% cut in the field the payout engine pays out as the provider's 80% share (`payment.service.ts:232`)
- `POST /bookings/:id/cancel` may refund nothing at all while the UI reports success (`booking.service.ts:517`)
- Priest Aadhaar payout gate (business rule 4) possibly bypassed by the #233 unified payout path (`payout.service.ts:112`)
- Temple 5% share never written on the real money path (`booking.service.ts:404`)
- NRI `/from-offering` may bill an INR-scaled number as USD (`bookings.ts:1091`)
- Slot capacity enforced by a count-then-create race with no transaction (`booking.service.ts:173`)

**Next action when limits reset:** re-run adversarial verification over `stage2-reverify-worklist.json` (29 items), then resume the approved order at Stage 3 (payments/commissions/payouts ledger).

</details>

---

### S2C-15 (P0) — Pandits are paid the platform's 20% instead of their own 80%

Verified directly against source, not via an agent. This is the most financially severe finding in the audit so far.

**The split itself is correct.** `booking.service.ts:48-49` defines `DEFAULT_PRIEST_SHARE = 0.8` / `DEFAULT_PLATFORM_SHARE = 0.2`, and `:230-234` computes both sides correctly, honouring a per-pandit negotiated `priest.commissionRate`:
```ts
const priestPayoutAmount  = pujaPrice.mul(priestShare);        // ₹880 on ₹1,100
const platformCommission  = pujaPrice.mul(1 - priestShare);    // ₹220 on ₹1,100
```
Both land on the booking row (`:282-283`). So far, right.

**The ledger writes the wrong side.** `payment.service.ts:215-236` creates the `Commission` row that drives payouts:
```ts
const commission = new Prisma.Decimal(booking.platformCommission);  // the PLATFORM's ₹220
await tx.commission.create({
  data: { bookingId: booking.id, providerId: booking.priestId, amount: commission, ... },
});
```
`providerId` is the **priest**, but `amount` is the **platform's** cut.

**The payout engine pays that field out verbatim.** `payout.service.ts:48-53`:
```ts
/** Withdrawable balance = PENDING commissions not yet linked to a request. */
const rows = await prisma.commission.findMany({ where: { providerId, status: 'PENDING', payoutRequestId: null }, select: { amount: true } });
const pending = rows.reduce((s, r) => s + Number(r.amount), 0);
```

**The store path proves the intended semantics** — same table, same `providerId`, same consumer, but it writes the *provider's* share (`store-commission.service.ts:57,64`):
```ts
const storeShare = total.mul(new Prisma.Decimal(1).minus(platformRate));  // provider's 80%
await tx.commission.create({ data: { providerId: storeProfile.userId, amount: storeShare, ... } });
```

| Path | `Commission.amount` written | Provider withdraws on a ₹1,100 sale |
|---|---|---|
| Store owner | `total × (1 − platformRate)` → provider's 80% | **₹880** ✅ |
| **Pandit (puja)** | `platformCommission` → platform's 20% | **₹220** ❌ |

**Impact.** Every pandit is short-paid **₹660 on a ₹1,100 booking — 75% of what they are owed**. At the launch catalog's ₹3,499 Griha Pravesh SKU the shortfall is ~₹2,100 per booking. This is live: a real Razorpay key is configured (M-005), so money can actually move. It also silently under-reports platform revenue, since the platform's cut is sitting in a ledger earmarked for provider withdrawal.

Note the same wrong field is written by the duplicate writer at `booking.service.ts:379` (`amount: updated.platformCommission`), so fixing one site is not sufficient.

**Do NOT fix unilaterally** — this is money-model-sensitive and touches an existing ledger. There may be historical `Commission` rows written under the current (wrong-side) convention, so a fix needs a data-migration decision, not just a code change. Proposed for owner approval, not executed.

#### ⚠️ CORRECTION to S2C-15 (2026-08-10, from adversarial re-verification)

**My stated money impact above was wrong and is retracted.** I wrote that a pandit "can withdraw ₹220 instead of ₹880." They cannot withdraw either — **today the figure is ₹0.00.**

Independent verification found a **second defect in the very same `create` statement**: `providerId: booking.priestId` writes a **`Priest.id`**, while every payout-side read passes a **`User.id`** (`payout-requests.ts:48`, `payout.service.ts:50`). The two ID spaces never match, so the puja `Commission` row is unreachable from any balance query. The wrong-side-of-the-split defect I found is real and still needs fixing — but it is currently *masked* by the ID-type defect rather than causing a live mis-payment.

Also material, and it corrects the alarm I raised: **pandits are not actually being underpaid today.** The rail that really pays them is `PriestPayout`, which the re-verification confirms computes correctly from `booking.priestPayout` (the 80%). The broken `Commission`/`PayoutRequest` path is the *newer unified* #233 engine, which for puja is inert.

Net effect: severity **P0 → P1**, and it is a **latent** P0 — fixing the `providerId` key alone, without also fixing the amount direction, would immediately start paying pandits the platform's 20%. **Both defects must be fixed in the same change.** The store-path comparison I made remains valid and is still the proof of intended semantics.

This is a good illustration of why every finding here goes through adversarial verification: the defect was real, my reading of the code was right, and my conclusion about its live impact was still wrong.

#### Backfill question — RESOLVED (2026-08-10). No one has been mispaid.

The remaining unknown was what to do with historical rows. Verified directly against schema + every write/read site:

- `Priest.id` and `Priest.userId` are **separate UUIDs** (`schema.prisma`, `Priest` model: `id @id @default(uuid())`, `userId @unique`).
- **Every other role writes a `User.id`** as `providerId`: store `storeProfile.userId` (`store-commission.service.ts:63`), astrology `profile.userId` (`consultation.ts:443`), wellness `instructorId` (`wellness-sessions.ts:110`).
- **Only the puja path writes a `Priest.id`** — `providerId: booking.priestId` (`payment.service.ts:231`).
- **Every payout read passes a `User.id`** — `request.currentUser!.id` (`payout-requests.ts:48,58,77`).

The two ID spaces never intersect, so puja `Commission` rows have **never matched a balance query**. Consequences:

1. **No pandit has ever been paid a wrong amount from this ledger** — they have been paid ₹0 from it. The rail that actually pays them is `PriestPayout`, which computes correctly from `booking.priestPayout` (the 80%).
2. Historical puja `Commission` rows are **orphaned, not corrupted**. There is no incorrect money to claw back.
3. So the backfill is **optional, not remedial**. Two clean options:
   - **Leave them orphaned** (zero risk) and fix the write going forward. Historical puja earnings simply never existed in this ledger.
   - **Backfill** — map `Priest.id → Priest.userId` *and* flip `amount` from `platformCommission` to `priestPayout` in the same statement. Both must change together: fixing only the ID would immediately make every historical row payable **at the platform's 20%**.

**The danger to avoid is a partial fix.** Correcting `providerId` alone — the obvious-looking one-line change — converts a dormant bug into an active one that underpays every pandit by 75%. Whoever does this must change the amount and the key in one commit.
