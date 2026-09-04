# Launch-Readiness Delta — Consolidated Completion Brief

**Date:** 2026-08-20
**Branch:** `feat/recurring-razorpay-planid`
**Method:** pure code-level sweep. Production (`darshya.online`, `api.darshya.online`) has been
HTTP 503 since 2026-08-17 under a Render **billing** suspension (two always-on free services
need ~1,488 instance-hours against a 750-hour cap). The local seeded stack is also down.
**Nothing in this brief was confirmed at runtime.** The 503 is a known billing state and is not
reported as a finding anywhere below.

**Scope:** this document consolidates five newly-swept dimensions — payments-integrity,
auth-session-lifecycle, ops-observability, content-integrity, trust-and-claims — that the
original 7-agent launch-readiness-delta wave lost. No consolidated brief was ever written for
that wave; this is it.

**Evidence standard applied here:** I re-derived the load-bearing claims from source myself
before repeating them. Where I could confirm a claim, it is marked **[verified in source]** with
the file:line I read. Where an agent's claim was imprecise or unverifiable from the repo, I say
so and downgrade it — see §6, *Corrections I made to the incoming reports*. That section exists
because an overstated "ready" is the most expensive thing this document could contain.

---

## 1. Verdict

**Not launch-ready. No-go.**

The five dimensions score 44 / 52 / 28 / 34 / 34. Nothing here is a rewrite: the primitives are
consistently well built and the primary puja-booking rail is genuinely production-grade — the
charged amount is derived server-side and never read from the request body, both webhook HMACs
are timing-safe and fail closed, and capture + confirm + commission + temple payout commit in one
transaction on both the verify and webhook paths. The failure is almost never inside a component.
It is that **one side of a contract shipped and the other was left behind**, over and over: a gate
wired into 2 pages of 27, a fix wired into `/festival` but not its two siblings, a probe that
exists but nothing calls, an entitlement hook with zero call sites, a refund column that one rail
accumulates and another overwrites. Each half type-checks. Each half has passing tests. Every
defect lives in the seam.

**The single thing most likely to hurt the business first is not hypothetical — it already
happened.** Production served 503 for three consecutive days and the repository's own monitoring
recorded it as a green build six times running, because every prod-facing check in CI is
deliberately configured never to fail (`scripts/agents/health-smoke.mjs:48` `process.exit(0)`
with the comment *"Don't fail the workflow on smoke failures"*; `.github/workflows/e2e.yml:32`
`continue-on-error: true` at job level and again at step level) **[verified in source]**. The only
alert transport in the product lives *inside* the API, so it cannot fire when the API is what is
down. Sitting behind that is `OPS-02`: the daily backup is engineered to exit 0 while producing
zero bytes when secrets are absent — `.github/workflows/db-backup.yml:19` states it outright,
*"Until secrets land, both scripts no-op and exit 0 (skipped: missing-env). Workflow stays green
so it doesn't spam the founder with failure emails"* **[verified in source]** — and no restore has
ever been recorded as tested. **A product that cannot detect its own failure and cannot prove it
can recover its data should not take payment from strangers**, and that is the launch-blocking
statement, independent of every other finding.

**The single thing most likely to hurt a real user first, once service is restored, is `PAY-01`.**
`apps/api/src/jobs/consultation-expire.ts:27-32` flips *any* `astrologer_consultations` row still
in `pending_payment` after 30 minutes to `cancelled`, with **no check whatsoever on whether
Razorpay captured the money** **[verified in source]**. A devotee pays for a consultation, closes
the tab before the browser calls `/consultation/verify`, and thirty minutes later the only local
record that money changed hands is marked cancelled. No refund is issued, no notice is sent, and
because the row that held the `razorpay_order_id` is now `cancelled`, the forensic trail the
comment claims to preserve is precisely what makes the loss invisible in every dashboard. There is
**no reconciliation job anywhere in `master-cron`** to catch it afterwards. This is money taken
with nothing behind it, and it is silent on both sides.

Three P0s are legally or financially false public statements (`TC-01`, `TC-02`, `TC-03`), and one
whole class of account — providers, the entire GTM supply motion — cannot reach its own portal
(`AUTH-03`). Fixing the nine P0s is days of wiring, not weeks of engineering. But they must be
fixed, and the runtime checklist in §5 must be executed, before a single real rupee is accepted.

---

## 2. Findings by dimension, with duplicate accounting

**Total reported across five dimensions: 63.**
**Duplicates / reclassified: 4.**
**NET NEW: 59.** — the ledger goes 388 → 447 if all are accepted.
**P0 count: 9 net-new**, plus **1 reopened P0** (`RES-01`), so **10 P0-severity items are live on
the board**.

Duplicate checks were run against all 388 entries in `docs/audit/LEDGER.json` (keyed by `id`) and
against `docs/audit/prod-sweep-raw-2026-08-12.md`. No `PAY-`, `AUTH-`, `OPS-`, `CI-` or `TC-`
prefix exists in the ledger, so every collision below was found by topic, not by id.

### Duplicate / reclassified — do NOT add to the count (4)

| ID | Disposition | Against | Note |
|---|---|---|---|
| `AUTH-12` | **duplicate** | `RES-01` (F349, P0, *fixed*) | `/auth/verify` uses a bare `fetch` with no timeout. Same root cause, same fix. Agent self-declared it. |
| `OPS-12` | **duplicate** | `SCAL-11` (F292, P2, *owner*) | Resend 100 emails/day ≈ 30 signups/day. Ledger entry is verbatim the same cap. Agent self-declared it. |
| `AUTH-01` | **REOPEN, not new** | `RES-01` (F349, P0, *fixed*, commit `c75fb12d`) | Reclassified by me. See below — this is more serious than a new finding, not less. |
| `TC-04` | **duplicate** | `PM-05` (F057, P1, *owner*, still open) | "NRI Premium sells benefits that do not exist." `TC-04` adds real mechanism, but the finding is already on the board and still unfixed. Merge the mechanism into F057 rather than opening a second row. |

**`AUTH-01` deserves special handling and is the most important line in this table.** The ledger
records `RES-01` as **fixed**. It is not. `apps/web/lib/api-config.ts:85-97`:

```ts
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
  return await fetch(input, { credentials: 'include', ...init, signal: controller.signal });
} finally {
  clearTimeout(timer);          // <-- runs when HEADERS arrive, not when the body is read
}
```

**[verified in source]** `await fetch(...)` resolves as soon as response headers arrive. The
`finally` block then disarms the abort timer *before the caller has read the body*. Every
`await res.json()` behind this helper — sign-in, register, refresh, OTP, logout, `/auth/me`, the
Google callback, and every `pandit-api` / `store-admin-api` call that imports it — is therefore
**completely untimed**. A server that flushes headers and stalls the body produces exactly the
permanent spinner `RES-01` was filed for. The fix survived its own bug. **Do not treat `RES-01` as
closed; reopen F349.** The correction is to move the `clearTimeout` after the body is consumed, or
to have callers read the body inside the timed scope.

### payments-integrity — score 44 — 9 findings, **9 net new**

| ID | Sev | Title | Cross-ref |
|---|---|---|---|
| `PAY-01` | **P0** | A paid astrology consultation is auto-cancelled 30 minutes later — money captured, row marked cancelled, no refund, no notice **[verified in source: `apps/api/src/jobs/consultation-expire.ts:27-32`]** | new |
| `PAY-02` | **P0** | The webhook backstop structurally cannot confirm a store order — a paid order stays PENDING forever, no fulfilment, no commission, no invoice **[verified in source: `apps/api/src/services/payment.service.ts:1005-1044` — the lookup `include`s only `booking`, and `shouldConfirm` requires `payment.booking.status === 'pending_payment'`, so a store-order Payment is marked `captured` and then nothing else happens; there is no consultation branch at all]** | new |
| `PAY-03` | **P0** | The two refund rails disagree on whether `Payment.refundAmount` is cumulative — the second partial under-reverses the provider ledger **[verified in source, see below]** | related to `DI-01`/`DI-02` (both *fixed*), **not a duplicate** |
| `PAY-04` | **P0** | Recurring UPI Autopay mandates never activate — the only writer of `recurring_subscriptions.status` hangs off a webhook endpoint never subscribed to subscription events | **OWNER** · new |
| `PAY-05` | P1 | The refund webhook handles an event the runbook never subscribes to, and even when it fires it neither reverses the ledger nor accumulates the refund total **[verified in source]** | **OWNER** · new |
| `PAY-06` | P1 | No reconciliation job exists anywhere — nothing looks for a `Payment` stuck at `initiated`, nothing asks Razorpay what actually settled | new |
| `PAY-07` | P2 | Both webhook endpoints write the idempotency record *before* verifying the signature — the exact reason the Stripe webhook was deleted, left in place on Razorpay | new |
| `PAY-08` | P2 | A late webhook confirms a booking whose slot was already resold — capture is never re-checked against capacity | new |
| `PAY-09` | P3 | Client verify and the webhook racing to confirm the same booking send the devotee two tax invoices | new |

**`PAY-03` is the one I most wanted to disprove and could not.** Three writers touch
`Payment.refundAmount`, with two different semantics:

- `apps/api/src/services/payment.service.ts:1282` — `const newRefundTotal = alreadyRefunded.plus(refundAmount);` → **cumulative**
- `apps/api/src/services/refund.service.ts:311` — `refundAmount: new Prisma.Decimal(refundInr.toFixed(2))` → **last-refund-only**, and the comment at `:309` states it plainly: *"this rail writes `refundAmount` rather than accumulating it"*
- the `refund.created` webhook branch — `refundAmount: refundAmountDecimal` → **last-refund-only**, and it calls neither `reverseBookingLedger` nor `reduceBookingLedgerForPartialRefund`

**[all three verified in source]** `payment.service` computes what is still refundable as
`paid − alreadyRefunded`. If `refund.service` or the webhook wrote a non-cumulative value first,
`alreadyRefunded` is understated, so the second partial over-refunds the devotee **and**
under-reverses the provider ledger — the platform keeps paying the pandit and the temple on
revenue it already handed back. This is the `DI-01`/`DI-02` failure class, but `DI-01` and `DI-02`
were each fixed *inside* their own rail; this defect lives in the seam *between* the rails, which
is exactly why the shared `ledger-reversal.service.ts` module did not prevent it. File it; do not
close it as a duplicate.

### auth-session-lifecycle — score 52 — 13 findings, **11 net new**

`AUTH-01` reclassified as a reopen of `RES-01`; `AUTH-12` duplicate of `RES-01`.

| ID | Sev | Title |
|---|---|---|
| `AUTH-02` | P1 | Sign-in parses the response body before checking `res.ok`, so a non-JSON error page tells a user with the **correct** password that their password is wrong |
| `AUTH-03` | P1 | Magic-link sign-in returns no `role`, so every provider provisioned through the partnerships pipeline is stored as a devotee and permanently bounced out of their own portal |
| `AUTH-04` | P1 | Nothing in the product can request a sign-in link — a provider whose 72-hour onboarding link lapses is locked out permanently, and forgot-password promises a reset email that can never arrive |
| `AUTH-05` | P2 | Magic-link tokens are stateless with no single-use ledger — the 72-hour provider link can be replayed without limit and cannot be revoked |
| `AUTH-06` | P2 | Every 401 handler computes a `reauth` flag that nothing reads — a mid-action expiry shows "sign in again" beside a Retry button and no sign-in link |
| `AUTH-07` | P2 | A failed proactive token refresh is silent **and** terminal — no `else`, empty `catch`, and the effect cannot re-arm because no state changed |
| `AUTH-08` | P2 | Neither `POST /login` nor `POST /auth/google/sync` checks `User.blocked` — a suspended account signs in, then loops between "session expired" and a working login |
| `AUTH-09` | P2 | Signing out on one device signs the user out of every device, with no indication anywhere that it will |
| `AUTH-10` | P2 | All seven `/auth/*` routes are fully static with no `Cache-Control` override — sign-in HTML may land in a shared cache | **OWNER** · *see §6, downgraded* |
| `AUTH-11` | P2 | Password reset says "You've been signed out everywhere" while never calling the API's logout — the API session cookies survive the reset |
| `AUTH-13` | P3 | The Google callback never reads the OAuth error parameters, so a user who declines consent waits three seconds and is then told the wrong thing |

`AUTH-03` + `AUTH-04` together are the launch blocker for the supply side: **an approved temple
manager or pandit cannot reach their portal, and once their link lapses there is no route back in
at all.** No amount of GTM effort converts against that.

### ops-observability — score 28 — 12 findings, **11 net new**

`OPS-12` duplicate of `SCAL-11`.

| ID | Sev | Title |
|---|---|---|
| `OPS-01` | **P0** | Every production check in CI is configured never to fail — prod was 100% down for three days and the monitor logged it green **[verified in source: `scripts/agents/health-smoke.mjs:48`, `.github/workflows/e2e.yml:32` + `:54`]** |
| `OPS-02` | **P0** | The daily backup is engineered to exit 0 while producing zero bytes, and no restore has ever been recorded as tested **[verified in source: `.github/workflows/db-backup.yml:19`]** | **OWNER** |
| `OPS-03` | P1 | Backups are uploaded into the same Supabase project they insure — one account suspension takes the database and every backup together | **OWNER** |
| `OPS-04` | P1 | Render's health check points at a stub that returns 200 with the database unreachable, while the DB-aware `/ready` probe goes unused **[verified in source: `render.yaml:22` `healthCheckPath: /health`]** |
| `OPS-05` | P1 | No durable audit trail for money events — a disputed booking or refund cannot be reconstructed **[verified in source: 66 `model` declarations in `apps/api/prisma/schema.prisma`, zero named `AuditLog` or `*Audit`]** |
| `OPS-06` | P1 | The written rollback procedure cannot work — it says push a revert, but both services are `autoDeploy: false` and no workflow deploys from main **[verified in source: `render.yaml:28` and `:60`]** |
| `OPS-07` | P1 | Two schema-application mechanisms contradict each other, and the boot-time one logs DDL failures and starts serving anyway | **OWNER** |
| `OPS-08` | P2 | The new Render suspension guard lives only on a feature branch, so its schedule will never fire — *confirmed by context: `render-hours-guard.yml` arrived in HEAD commit `853b4cbc` on `feat/recurring-razorpay-planid`, and GitHub only runs `schedule:` triggers from the default branch* |
| `OPS-09` | P2 | All production monitoring depends on the same GitHub Actions quota that has already been exhausted once |
| `OPS-10` | P2 | The DR runbook describes a Mumbai region, a Singapore standby and Cloudflare Pages — none of which exist |
| `OPS-11` | P1 | Production database passwords remain in three commits of git history; untracking the file did not remove them | **OWNER** · related to `S-12` (F172, *owner*) — different artifact (`docs/chat-archive` vs `apps/api/.env`), **same rotation action**, so merge the owner step |

### content-integrity — score 34 — 16 findings, **16 net new**

The prose is the strongest asset in the product — ~1,000 pages of dense, specific, non-placeholder
editorial with genuinely defensive null handling and correctly registered Wikimedia licensing. On
content quality alone this scores ~80. Every point is lost in the wiring between the content and
the commerce.

| ID | Sev | Title | Cross-ref |
|---|---|---|---|
| `CI-01` | P1 | 502 of 517 "book this puja" links on `/aarti` and `/chalisa` 404 — `DF-02`'s fix was wired into `/festival` and `/calendar` only | extends `DF-02` (*fixed*) |
| `CI-02` | P1 | 48 duplicate slugs across 10 encyclopedia datasets — the second record is unreachable, index pages render twin cards to one URL with contradictory facts | `SEO-07` (*fixed*) deduped the **sitemap exit point only** and explicitly declined the sources — **not a duplicate** |
| `CI-03` | P1 | Hartalika Teej published on two different 2026 dates at two live URLs; Narasimha Jayanti twice in May, 11 days apart | new |
| `CI-04` | P1 | `/content/<any-slug>` returns 200 forever with "Content is loading" under Hanuman Chalisa's deity and 12.5M view count — 14 of 27 prerendered slugs have no row behind them | related to `HN-07` (*fixed*, different defect) |
| `CI-05` | P1 | 37 of 64 detail routes — at least 455 pages including all 84 pilgrimage-site pages — offer no path to anything bookable; `/tirth` prints "✓ Online booking available" with nothing to click | new |
| `CI-06` | P2 | 29 encyclopedia links into `/deity/<slug>` hard-404 — 20 referenced deities have no page | new |
| `CI-07` | P2 | `/tirth` ships 13 near-duplicate pages for one temple, each self-canonical | `SEO-06` (*fixed*) normaliser covers `/temples` only — **not a duplicate** |
| `CI-08` | P2 | Same subjects published across two or three competing route families — 14 Upanishads, all 6 darshanas, the 4 Vedas — every URL self-canonical | new |
| `CI-09` | P2 | Internal roadmap ticket IDs and the retired brand name "Bhaktisetu" render in published prose | new |
| `CI-10` | P2 | `/pilgrimage` announces "the 8 canonical circuits" above a grid of 19, two of which are the same URL at two prices and two scriptural attributions | new |
| `CI-11` | P2 | Maha Kumbh Mela dated 2027-01-14 renders inside "Hindu Festivals in January 2026" as upcoming | new |
| `CI-12` | P3 | `/jyotirlinga` states all twelve are swayambhu while its own badges mark nine; `/tirth` says Mahakaleshwar is the only one | new |
| `CI-13` | P3 | `/tirth` prints "Nearby tirthas" as raw hyphenated slugs and does not link them, on all 84 pages | new |
| `CI-14` | P3 | `/upanishads` titled and described as a guide to 10 Upanishads while listing 48 | new |
| `CI-15` | P3 | 45 published articles cite Wikipedia with no CC BY-SA notice anywhere; `/credits` covers images only | **OWNER** · new |
| `CI-16` | P3 | 5 of 16 temple links on pilgrimage-circuit pages point at slugs with no curated temple entry | new |

`CI-01` and `CI-05` together are the commercially decisive pair: **a devotee landing on a random
encyclopedia page has roughly a 1-in-3 chance of seeing a booking CTA at all, and about a 2.5%
chance the link resolves.** As an acquisition funnel, 1,000 pages of excellent content is not
degraded — it is inoperative. This is also the cheapest large win in the whole brief: no content
needs writing, only wiring.

### trust-and-claims — score 34 — 13 findings, **12 net new**

`TC-04` duplicate of `PM-05` (F057).

| ID | Sev | Title | Cross-ref |
|---|---|---|---|
| `TC-01` | **P0** | The 80G tax-deduction promise survives on ~25 surfaces after the honesty gate was wired into two pages | **OWNER** · **partially overlaps** `COM-02` (F024) + `LEG-02` (F222), both *owner*/open — those cover the **receipt PDF**; the **coverage gap across ~25 surfaces is new** **[verified in shape: 45 non-test files under `apps/web` mention 80G; only 7 reference `HAS_80G_VERIFIED`]** |
| `TC-02` | **P0** | `/become-astrologer` promises daily bank payouts and an Aadhaar-verified badge — the identical claim was found and fixed on `/become-priest` and left standing one file away | extends `PJ-02` (*fixed*) — **not a duplicate**, different file |
| `TC-03` | **P0** | NRI Premium publishes an unconditional 14-day "no questions asked" refund and a 90-day pro-rata refund — `subscriptionService.cancel()` moves no money, and the only refund queue cannot see a subscription | new (distinct from `PM-05`/`LEG-08`, which are about *benefits*, not *refund terms*) |
| `TC-05` | P1 | Fabricated five-star reviews rendered as real on 17 temple pages and the wedding page, several claiming to have booked through Darshya | related to `DF-03` (F012, *owner*) — that is the **astrologer** surface; these are **temple + wedding** — not a duplicate |
| `TC-06` | P1 | `/yatra/companion` sells twelve named elderly-care escorts who do not exist, with hardcoded Aadhaar, police-verification and medical flags | new |
| `TC-07` | P1 | The temple "Trust score" is a hand-typed seed literal, and the comparison page publishes a four-factor methodology for it — and ranks temples by it | related to `CM-02` (*fixed* — that was the "4.9/100" **display** bug); the **value being fabricated** is new |
| `TC-08` | P1 | The published pandit vetting process — credential checks, two temple references, 30-day probation, per-pandit trust score — has no implementation; a static "Vedic certified" badge is printed with nothing behind it | new |
| `TC-09` | P1 | `PATCH /providers/:type/:id` accepts an unvalidated body and strips only four fields — a provider can self-award the verified badge, their own rating, review count, and the Aadhaar flag that unlocks payout | new |
| `TC-10` | P1 | The Privacy Policy's Data Security section claims Supabase row-level security as a safeguard | new · *see §6 — direction confirmed, the specific "2 of 66" count is **not** verifiable from this repo* |
| `TC-11` | P2 | `/gaushala` asserts every listed gaushala is personally verified with complete financial transparency, over three hardcoded fixtures that award real third-party organisations badges typed into the source | new |
| `TC-12` | P2 | Supply-acquisition pages promise a 10,000-devotee audience, 7-day settlements, and a ₹500/month cow-seva tier that does not exist — and the guard test forbidding that tier checks only two homepage components | new |
| `TC-13` | P2 | `/faqs` sells a ₹199/month Premium plan with an aarti download library and multi-camera angles — no such plan, no such features — and claims live darshan from 30+ temples against a 20-temple catalogue | new |

`TC-01`, `TC-02` and `TC-03` are the three P0s in this dimension because each is a **statement a
regulator or a court would read as false**: a promised income-tax deduction the donor cannot
claim, a promised payout schedule no rail can honour, and a promised refund the code cannot
issue. They are also, mercifully, the cheapest class to fix — the truth-gating machinery
(`lib/company.ts`, `lib/platform-stats.ts`, `lib/social-proof.ts`, `lib/cancellation-policy.ts`,
`is80GEligible()`) is already correct and disciplined. **This is a copy-and-wiring job, not new
engineering.**

### Net-new tally

| Dimension | Score | Reported | Dup/reclass | **Net new** | P0 |
|---|---|---|---|---|---|
| payments-integrity | 44 | 9 | 0 | **9** | 4 |
| auth-session-lifecycle | 52 | 13 | 2 | **11** | 0 |
| ops-observability | 28 | 12 | 1 | **11** | 2 |
| content-integrity | 34 | 16 | 0 | **16** | 0 |
| trust-and-claims | 34 | 13 | 1 | **12** | 3 |
| **Total** | — | **63** | **4** | **59** | **9** |

Plus **1 reopened P0** (`RES-01`, F349) — ledger state must change from *fixed* back to *open*.

---

## 3. Owner actions

Non-engineer steps. Numbered in the order I would do them. Items 1–4 are prerequisites for
everything else in the brief, because until service is restored nothing in §5 can be executed.

**Restore service and stop the bleeding**

1. **Resolve the Render billing suspension.** Log in to Render, settle the outstanding balance,
   and reactivate services `srv-d7mc2n8sfn5c73dfce0g` (API) and `srv-d970l2ks728c738fc33g` (web).
   Then fix the *cause*: two always-on free services need ~1,488 instance-hours against a 750-hour
   cap, so free tier can never fit both. Either upgrade one service to a paid instance, or
   consolidate to a single always-on service. **This will recur next month otherwise.**
2. **Rotate every credential that has been in git history.** (`OPS-11`, and merge with the
   existing `S-12`.) Untracking the file did **not** remove the secrets — they remain in three
   commits. Rotate, in the Supabase dashboard and Render environment: the Postgres database
   password, the `service_role` key, `JWT_SECRET`, and the Groq and Cohere API keys. Do this
   before the services come back up, not after.
3. **Confirm `RAZORPAY_WEBHOOK_SECRET` is set on the Render API service.** Render → apps/api →
   Environment. If it is missing, **both** webhook handlers fail closed and every webhook returns
   400 — which silently escalates `PAY-01`, `PAY-02` and `PAY-06` from "sometimes" to "always",
   because the puja and donation rails would lose their only backstop too.
4. **Pull the Razorpay captured-payments list for 2026-08-17 through today** and compare it
   against the `payments` table. The webhook endpoint returned 503 for the entire outage and
   Razorpay's retry budget may have expired. Any Razorpay-side capture with no matching local row
   is **money already taken with nothing behind it**, right now. Do this first among the data
   tasks.

**Razorpay configuration (`PAY-04`, `PAY-05`)**

5. **Audit the webhook registrations.** Razorpay Dashboard → Account & Settings → Webhooks. List
   every registered URL and the events each is subscribed to, and compare against
   `docs/razorpay-live-activation.md:104-105`. Report back which of `subscription.activated`,
   `subscription.charged`, `subscription.halted`, `refund.created` and `refund.processed` are
   actually subscribed on which URL.
6. **Subscribe the subscription events** to the endpoint that owns the recurring-mandate status
   writer. Until this is done, UPI Autopay mandates never activate and the recurring product does
   not work at all — the code is fine, the subscription is missing.
7. **Decide `refund.created` vs `refund.processed`.** The handler listens for `refund.created`;
   confirm which event the account actually emits and subscribe it. (The engineering half of
   `PAY-05` — ledger reversal and cumulative totals — is a code fix, not yours.)
8. **Request Razorpay Route and RazorpayX** if not already granted. Provider payouts are manual
   until these are live, which is what makes `TC-02`'s "daily bank payouts" claim false.

**Legal and compliance (`TC-01`, `CI-15`)**

9. **Decide the 80G position, then say only that.** Either (a) obtain the Section 80G(5)
   registration and the donee PAN, then set `HAS_80G_VERIFIED`, `eightyGNumber` and `pan` in
   `apps/web/lib/company.ts` — or (b) instruct engineering to strip the deduction promise from all
   ~25 surfaces. **Option (b) is the only one available before launch**, because (a) is a
   months-long registration. Do not launch with the promise standing: a donor who claims a
   deduction on an invalid receipt is exposed, and so are you.
10. **Approve a CC BY-SA attribution block** for the 45 articles that cite Wikipedia. `/credits`
    currently covers images only. This is a short standard notice; engineering can draft it, but
    you should confirm you are content to publish it.
11. **Decide the fate of the fabricated-identity surfaces** (`TC-05`, `TC-06`, `TC-07`, `TC-08`,
    `TC-11`, `TC-12`, `TC-13`). Every one is invented people, invented plans or invented badges
    rendered as real. The engineering fix is deletion; the decision of *what replaces them* — an
    honest empty state, or real supply you go and sign — is yours and is on the critical path for
    launch messaging.

**Operations (`OPS-02`, `OPS-03`, `OPS-07`)**

12. **Set the four backup secrets** in GitHub Actions: `SUPABASE_DB_URL` (use `DIRECT_URL`, not
    the pooled URL), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BACKUP_BUCKET`. Until
    these exist, the daily backup produces nothing and reports success.
13. **Move backup storage off Supabase.** (`OPS-03`.) Backups currently land in the same Supabase
    project they are meant to insure — a single account suspension takes the database and every
    backup together, which is precisely the failure mode you just lived through on Render. Create
    a Cloudflare R2 or Backblaze B2 bucket and point the workflow at it. The original design chose
    R2 for exactly this reason and the property was dropped silently.
14. **Commission one restore drill and record the elapsed time.** Nothing in the repo contains a
    real RTO number. Until a restore has succeeded once, you do not have backups, you have files.
15. **Report the Render Start Command** for `srv-d7mc2n8sfn5c73dfce0g` (Render → Settings → Start
    Command) and compare it against `pnpm --filter @poojly/api start`. This decides whether
    `OPS-07`'s crash-safe path or its serve-anyway path is the live one.
16. **Confirm whether the four UptimeRobot monitors were ever created** and paste their IDs into
    `docs/it/uptime-monitors.md`. If they exist, **repoint them from `/health` to `/ready`** —
    monitors on `/health` cannot detect a database failure (`OPS-04`).
17. **Confirm `SENTRY_DSN` is set** on the Render API service, and that `NEXT_PUBLIC_SENTRY_DSN`
    was present at web build time. The code is correct on both sides but no-ops silently without a
    DSN.

**Security header configuration (`AUTH-10`, merges with `SEC-01`)**

18. **Check Cloudflare's caching rules for `/auth/*`** in the Cloudflare dashboard (this repo
    contains no CF config, so it cannot be answered from source). Confirm that sign-in HTML is not
    being cached at the edge, and add a bypass rule for `/auth/*` if it is.

---

## 4. What this sweep could not check

**Plainly: nothing was confirmed at runtime.** Production is suspended under a billing hold and
the local seeded stack is down. Every finding in this brief is derived from reading source,
schema, workflow YAML and seed data. That has two consequences the reader must hold onto:

- **Findings may be more severe than stated.** A defect that looks like "sometimes" in source can
  be "always" in production. `PAY-01`, `PAY-02` and `PAY-06` all escalate to universal if
  `RAZORPAY_WEBHOOK_SECRET` turns out to be unset (owner action 3).
- **A code-level sweep systematically over-credits.** The code's *intent* is visible; what the
  *user receives* is not. This is discussed in §7.

Specifically **not** established: whether any backup file has ever existed; whether any restore has
ever succeeded; whether Sentry is receiving events; whether the UptimeRobot monitors exist; which
Razorpay webhook events are subscribed; how many `Payment` rows are currently stuck at `initiated`;
how many consultations were cancelled while holding a real `razorpay_order_id`; the live size of
the puja catalogue; whether Googlebot has indexed the duplicate route families; the real RLS state
of the production database; and whether Razorpay captured money during the three-day outage that
has no local record.

---

## 5. Runtime confirmation checklist — execute on restore

Run these in order. Items 1–6 are the money questions and should be run before the site accepts
another payment.

### Money — run first

1. **Quantify existing exposure** (`PAY-01`, `PAY-06`). No code change needed; run as soon as the
   DB is reachable.
   ```sql
   SELECT count(*) FROM payments WHERE status = 'initiated';
   SELECT count(*) FROM astrologer_consultations
     WHERE status = 'cancelled' AND razorpay_order_id IS NOT NULL;
   ```
   Any non-zero second figure is money captured against a destroyed record.

2. **Outage reconciliation** (owner action 4). Pull Razorpay's captured-payments list for
   2026-08-17 → restore date and left-join against `payments` on `gateway_payment_id`. Any
   Razorpay capture with no matching row is unbacked money.

3. **`PAY-01` end-to-end.** Create a consultation via `POST /api/v1/astrology/.../book` to obtain a
   `razorpay_order_id`; pay it in Razorpay test mode; **do not** call `POST /consultation/verify`;
   wait for one master-cron tick past 30 minutes; then
   `SELECT status, razorpay_order_id FROM astrologer_consultations WHERE reference = '<ref>';`
   → expect `cancelled` against a captured Razorpay order.

4. **`PAY-02` end-to-end.** Place a store order, complete the Razorpay payment, and kill the tab
   before the `/payments/store-orders/:id/verify` request completes (or block that URL in
   devtools). Then check `SELECT status FROM "StoreOrder" WHERE id = '<id>';` and the matching
   `Payment` row → expect `Payment.status = 'captured'` with `StoreOrder.status` still `PENDING`
   and no `Commission` row.

5. **`PAY-03` arithmetic.** On a confirmed ₹1,100 booking with a PENDING pandit Commission, call
   `POST /api/v1/admin/bookings/refunds/:id/approve` twice — `{refundType:'partial',
   amountInr:550}` then `{refundType:'partial', amountInr:275}` — then read `Payment.refundAmount`
   (**expect the bug: 275, not 825**) and `Commission.amount` (**expect ~330 where the correct
   figure is ~220**).

6. **`PAY-04`/`PAY-05` webhook registration.** Razorpay Dashboard → Account & Settings → Webhooks;
   list each URL and its subscribed events; compare against
   `docs/razorpay-live-activation.md:104-105`. Then use Razorpay's "Send Test Webhook" and confirm
   a 200 in the Render log — which simultaneously verifies `RAZORPAY_WEBHOOK_SECRET`.

### Auth

7. **`AUTH-01` headers-then-stall.** The code hole is proven from source (see §2). To see the
   symptom: run a local proxy on `127.0.0.1` that writes a 200 header, flushes, and never ends the
   body; point `NEXT_PUBLIC_API_URL` at it; load `/auth/login`, submit any credentials, and confirm
   the spinner never stops and no error text appears. Repeat against `/auth/callback`.

8. **`AUTH-02` gateway-HTML case.** Point `NEXT_PUBLIC_API_URL` at any host returning an HTML
   502/503 for `POST /auth/login`, then sign in with **correct** credentials and confirm the page
   reads "Invalid email or password." *(The current suspension page is itself a valid fixture —
   this one can be tested before restore.)*

9. **`AUTH-03` provider role.** As admin, `POST /api/v1/admin/leads/<id>` with
   `{status:'CONVERTED', sendEmail:true}` for a TEMPLE lead; open the emailed link; in DevTools run
   `JSON.parse(localStorage.poojly_user)` and confirm there is no `role` key; navigate to
   `/temple-portal` and confirm the immediate redirect back to `/dashboard`.

10. **`AUTH-08` suspended-user loop.** Block a seeded user via the admin users screen, then
    `POST /api/v1/auth/login` with that user's credentials and confirm HTTP 200 with a session
    (expected: 403). Then `GET /api/v1/auth/me` with that token and confirm 403 "Account
    suspended".

11. **`AUTH-09` multi-device logout.** Log in as one user from two browsers, capture both refresh
    tokens, `POST /api/v1/auth/logout` from browser A only, then `POST /api/v1/auth/refresh` with
    browser B's token and confirm it 401s.

12. **`AUTH-10` edge caching.** `curl -sI https://darshya.online/auth/login` and read the
    `Cache-Control` / `CF-Cache-Status` headers. See §6 — this finding is currently unproven.

### Operations

13. **`OPS-02` backup reality.** `gh workflow run db-backup.yml`, then
    `gh run view --log | grep -m1 '{'`. A skipped run prints
    `{"ok":true,"skipped":true,"reason":"missing-env","missing":[...]}`; a real run prints
    `{"ok":true,"bucket":...,"key":...,"sizeBytes":...,"sha256":...}`. Then list the bucket in
    Supabase Storage and confirm objects exist under `backups/YYYY/MM/DD/`.

14. **`OPS-02` restore drill.** Create a throwaway Supabase project;
    `pg_restore -d $STAGING_DATABASE_URL --no-owner --no-privileges <latest.dump>`; then run
    `node apps/api/scripts/check-prod-tables.mjs` against it and compare row counts against
    production. **Record the elapsed time — that number is the real RTO and nothing in the repo
    currently contains it.**

15. **`OPS-04` probe divergence.** With the DB deliberately unreachable, `curl -s -o /dev/null -w
    '%{http_code}\n'` against both `/health` and `/ready`. Expect 200 and non-200 respectively —
    which is the finding.

16. **Sentry.** Confirm `SENTRY_DSN` on the Render API service; for the web, load any page and
    confirm a request to `browser.sentry-cdn.com` in devtools, or throw from `/debug` and check the
    Sentry issue stream.

17. **Render Start Command** for `srv-d7mc2n8sfn5c73dfce0g` — decides which `OPS-07` path is live.

18. **Render log retention** on the free plan — open the service Logs tab, scroll to the oldest
    line, record its age. That is the outer bound on `OPS-05`'s dispute-reconstruction window.

### Content

19. **`CI-16` circuit temple slugs.**
    ```
    curl -s -o /dev/null -w '%{http_code} %{url_effective}\n' -L \
      https://darshya.online/temples/{ayodhya-ram-mandir,dwarka,dwarka-jagat-mandir,mathura-krishna-janmabhoomi,vrindavan-banke-bihari}
    ```
    Anything not 200 confirms it.

20. **`CI-01` live catalogue size.**
    `curl -s 'https://api.darshya.online/api/v1/pujas/types?limit=100' | jq -r '.pujaTypes[].slug' | sort > live.txt`,
    then diff against the `relatedPujas` slugs in `apps/web/lib/aartis.ts` and `lib/chalisas.ts`.
    Extra production rows lower the dead-link count; the structural defect (no catalogue
    intersection on those two routes) is unaffected.

21. **`CI-04` soft-404 farm.**
    `curl -s https://darshya.online/content/this-page-does-not-exist | grep -E 'Content is loading|12.5M|Lord Hanuman'`
    — all three strings on a 200 response confirms it. Then check the 14 named slugs, e.g.
    `/content/durga-saptashati`.

22. **`CI-02` build warnings.** `pnpm --filter web build` and grep for duplicate-param or
    duplicate-key warnings. *(Can be run now — does not need production.)*

23. **`CI-07`/`CI-08` index state.** `site:` queries for `darshya.online isha upanishad`,
    `darshya.online nyaya darshana`, `darshya.online kedarnath`, plus the Search Console
    duplicate-content and "Alternate page with proper canonical tag" reports.

### Trust

24. **`TC-01` donee data.**
    `psql $DIRECT_URL -c "SELECT user_id, gaushala_name, pan, regn_80g FROM gaushala_profiles;"` —
    every row with a NULL in either column produces a non-80G receipt.

25. **`TC-04`/`PM-05` entitlement.** Activate `nri_premium_yearly` for a test user, then
    `POST /api/v1/ai/chat` six times with that bearer token; the sixth should return the free-tier
    `limit_reached` payload if the paywall does not recognise the plan.

26. **`TC-09` privilege escalation.** As a `GAUSHALA_MANAGER`,
    `curl -X PATCH $API/providers/gaushala/<own profile id> -H 'Authorization: Bearer <token>' -d '{"verified":true}'`,
    then `GET /providers/gaushala/<id>` and check the stored row. Same shape for pandit with
    `{"aadhaarVerified":true,"rating":5,"totalPujas":250}`.

27. **`TC-10` real RLS state.** `psql $DIRECT_URL -c "SELECT relname, relrowsecurity FROM pg_class
    WHERE relkind='r' AND relnamespace='public'::regnamespace ORDER BY relrowsecurity DESC;"` and
    `SELECT * FROM pg_policies;`. **This is the only way to settle `TC-10`** — see §6.

28. **`TC-13` stream host.** `curl -I https://stream.darshya.online/dagdusheth-pune`.
    `images.darshya.online` is already known dead (`PF-04`); if the stream host is dead too, every
    live-darshan claim is worse than stated.

---

## 6. Corrections I made to the incoming reports

Recorded so the ledger inherits calibrated claims rather than confident ones.

**`TC-04` — "`useIsPremium()` has zero call sites" is imprecise.** There are **two** hooks with
that name. `apps/web/lib/use-premium.ts:10` — the server-truth hook whose own comment says it is
*"Used by AQ ad-gate, NRI surcharge bypass, priority-booking gating, and the M3 AI astro paywall
waiver"* — genuinely has **zero call sites** **[verified]**. But
`apps/web/components/useIsPremium.ts:9` has one: `components/AdSlot.tsx:44`. So ads *are* gated —
by a different hook that trusts a client-side `subscriptionTier` string rather than asking the
server. The finding's substance survives and actually strengthens: that client hook matches only
`['pro','premium','bhakti_pass','annual_ratna']`, so a subscriber created as `ENTERPRISE` fails
even the ad gate. Restate as "5 of 6 benefits ungated; the 6th is gated by a client-trusting
hook against a tier string the plan is never assigned." Also note `lib/use-premium.ts:24` uses a
**bare `fetch` with no timeout** — the same `RES-01` class as `AUTH-12`.

**`TC-10` — the "2 of 66 tables" count is not verifiable from this repository.** I searched all of
`apps/api` (migrations and source) for `ROW LEVEL SECURITY`, `CREATE POLICY` and `rowsecurity` and
found **zero matches** **[verified]**. RLS therefore is not defined in the repo at all; whatever
exists was enabled by hand in the Supabase dashboard. The finding's *direction* is confirmed and
arguably worse than stated — the codebase asserts a safeguard it does not implement — but the
specific figure must not enter the ledger as fact. Settle it with checklist item 27 before
quoting any number.

**`AUTH-10` — downgraded to unproven.** `apps/web/next.config.ts:133-138` shows `headers()`
deliberately not enumerating HTML pages (*"HTML pages — fall through to per-route Next revalidate
config"*) **[verified]**, so the premise that no explicit `Cache-Control` is set on `/auth/*` is
correct. But whether a long shared-cache header actually reaches the browser depends on Next's
static-route defaults and on Cloudflare rules that **do not exist anywhere in this repo**. Keep
the finding, mark it unproven, and settle it with a single `curl -I` (item 12).

**`AUTH-01` — promoted in importance, demoted in novelty.** Reclassified from a new finding to a
**reopen of `RES-01`** (F349, ledger state *fixed*). It does not add to the net-new count, and it
matters more than any single item that does: a P0 the ledger considers closed is open.

**`PAY-03` — I tried to break this one and could not.** Three writers, two semantics, with the
non-accumulating rail's own source comment admitting it. Confirmed.

---

## 7. How this compares to the 36/100 logged-in score

**It does not, and the two numbers must never be averaged, compared, or plotted on the same axis.**

A prior code-level audit scored this product **74/100**. A logged-in sweep — a human or agent
actually using the product with a session — scored it **36/100**. This sweep is a code-level pass,
which means it is structurally at risk of repeating the 74: the code's intent is legible from
source, but what a user *receives* is not. A page can be perfectly written and never render. A
handler can be correct and never be called. A gate can be sound and be wired into two pages of
twenty-seven. **Reading source over-credits, systematically and in one direction.**

The scores in this brief — 44 / 52 / 28 / 34 / 34, mean ≈ 38 — are lower than 74 because each
agent was explicitly instructed to trace what the user receives across the whole path rather than
what the code intends at one layer, and because the recurring defect shape in this product is the
seam between two correct halves. The dimensions that scored lowest are the ones where that
tracing was most possible from source: `ops-observability` at 28 could be graded almost entirely
from workflow YAML, because a workflow that says `continue-on-error: true` cannot behave otherwise
at runtime. The dimension that scored highest, `auth-session-lifecycle` at 52, is the one whose
primitives are most inspectable in isolation — and it is exactly where I found the sharpest
over-credit in the incoming reports.

**The mean of ≈38 landing near 36 is a coincidence and should be read as one.** It is not
corroboration. These five dimensions are not the same dimensions the logged-in sweep scored; they
are weighted differently, five in number rather than whatever that sweep covered, and graded
against a rubric that did not exist then. Treating the proximity as agreement would be the single
most misleading inference available from this document.

**The only honest statement about the relationship is this:** a code-level sweep can prove a defect
exists and can never prove one does not. Every "could not check" in §4 is a place where the real
score can only fall. **When production is restored, the §5 checklist is the measurement — not
this brief.** Re-run a logged-in sweep before making a final go/no-go, and expect it to find
things no amount of reading could.

---

## 8. Recommended sequence

1. **Owner actions 1–4** — restore service, rotate secrets, verify the webhook secret, reconcile
   the outage. Nothing else can start.
2. **Run §5 items 1–6** — the money questions. Do not accept another payment until item 1 returns
   zeros or the exposure is quantified and covered.
3. **Fix the 9 P0s + reopened `RES-01`.** Four are payments, two are ops, three are false public
   statements, one is the timeout helper. Estimated days, not weeks — nearly all are wiring.
4. **Fix `AUTH-03` + `AUTH-04`** before any provider outreach resumes. The supply motion is
   currently locked out of its own product.
5. **Fix `CI-01` + `CI-05`** before any acquisition spend. 1,000 pages of excellent content
   currently converts at approximately nothing, and this is the cheapest large win in the brief.
6. **Re-run a logged-in sweep** and compare against the 36. That, not this document, is the
   launch gate.

---

*Written 2026-08-20 against `feat/recurring-razorpay-planid`. Source was read, not modified; no
commit was made. Production was not contacted — the 503 is a known billing state, deliberately not
probed and deliberately not reported as a finding.*
