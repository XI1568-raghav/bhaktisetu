# Sweep remediation — live session state

**Read this file first on any resume.** It is the single narrative record of the
388-finding remediation. The machine-readable tally lives beside it in
`LEDGER.json`; this file explains *why* things are where they are.

- Tally: `node docs/audit/ledger.mjs` (summary) · `node docs/audit/ledger.mjs md` (writes LEDGER.md)
- Mark an item: `node docs/audit/ledger.mjs set <ID|Fnnn> <fixed|partial|open|owner|wontfix> <commit|-> "note"`
- Findings source of record: `docs/audit/prod-sweep-raw-2026-08-12.md` (388 findings, 32 agents, 4 workflows)

---

## Where the numbers came from

Four workflows, 38 agents dispatched, 32 reported. Real logged-in browser
sessions across 8 roles against a fully seeded local stack — not a code read.

| Workflow | Agents | Findings | P0s |
|---|---:|---:|---:|
| `authenticated-deep` | 12 | 166 | 24 |
| `scale-mindset` | 9 | 127 | 28 |
| `launch-readiness-delta` | 7 | 62 | 11 |
| `prod-clickthrough` | 3 | 33 | 2 |
| **Total** | **38** | **388** | **65** |

Severity split: **P0 65 · P1 155 · P2 120 · P3 48**.

Headline scores at sweep time: **authenticated product 36/100 (NO-GO)**,
**scale & mindset 33/100**. A prior code-level audit had scored 74/100 — that
was honest for what it measured (tsc clean, 1059 tests green, no console
errors). The 38-point gap is entirely UI↔API seam defects, invisible to every
form of verification except a logged-in click.

Per-area scores (worst first): app-web-parity 10 · pandit-fulfilment 14 ·
astro-wellness 14 · store-temple-gaushala 15 · notifications 15 · i18n 16/18 ·
legal-content 18 · seo-perf-budget 18 · admin-ops 24 · customer-mindset 34 ·
list-controls 34 · scalability 34 · pricing-market 38/43 ·
commerce-temple-gaushala 39 · design-uniformity 41 · accessibility 42 ·
responsive 42 · resilience 45 · provider-journeys 46 · data-integrity 55 ·
devotee-funnel 60.5 · devotee-booking 62 · **security 79**.

---

## The recurring root cause

Nearly every finding is the same shape: **one side of a contract shipped while
the other was left behind.**

- API accepted `causeKind`; the donation form never sent it.
- The constant moved to 0.8; the schema default stayed 0.70.
- The booking wizard existed; no route reached it.
- The error state was set; nothing rendered it.
- One refund rail reversed the ledger; the other never learned to.
- The shim forwarded `?tier=`; the wizard hardcoded `'standard'`.

Each half type-checks. Each half has passing tests. The defect lives in the
seam. **When fixing anything here, check both sides of the contract.**

---

## Load-bearing invariants — do not break

1. `Commission.amount` = the PROVIDER's earning. `Commission.percentage` = the
   PLATFORM's take rate. One column, one meaning. Derive everything else via
   `apps/api/src/lib/commission-math.ts`.
2. The two payout rails stay mutually exclusive: `createPriestPayout` refuses
   when a `Commission` already owns the booking. Removing that guard double-pays
   every pandit.
2b. Both refund rails call `reverseBookingLedger` from
   `services/ledger-reversal.service.ts`. **Do not re-inline it.** The original
   DI-01 fix left `refund.service` on a duplicate inline copy while only
   `payment.service` imported the module — a half-finished unification found on
   2026-08-13 by an agent correcting my brief, and closed the same day. Two
   copies of a money-reversal rule is the exact drift that module exists to
   prevent. Verify with:
   `grep -rn reverseBookingLedger apps/api/src --include=*.ts` — both services
   must appear.
3. Never `CREATE INDEX CONCURRENTLY` inside a Prisma migration — `migrate deploy`
   wraps each in a transaction, CONCURRENTLY fails 25001, and it then blocks
   every later migration.
4. Never reassign a method on the shared Prisma mock
   (`apps/api/src/lib/__mocks__/prisma.ts`) — alias it. Reassigning once broke
   26 unrelated tests.
5. Web deploy is **Render**, not Cloudflare Pages. No `runtime='edge'`.
6. Do not run `prisma format` — it realigns the whole 4,068-line schema into
   diff churn. Add index lines by hand.
7. **Never add a VALUE import of `@poojly/shared` (or `@poojly/api-client`) to
   apps/web without checking Turbopack can resolve it.** Those packages' barrels
   use NodeNext `./foo.js` specifiers pointing at `.ts` sources, which apps/api
   needs at runtime under Node ESM. `next.config` maps `.js` → `.ts` via
   `resolve.extensionAlias` — but that hook is under the `webpack:` key and
   Turbopack never sees it, and this app runs `next dev --turbopack`. Every
   historical web import was `import type` (erased before resolution), so the
   gap was invisible until CM-06 added the first value import and EVERY page
   500'd with `Can't resolve './constants/index.js'`. tsc and vitest both
   resolve it fine, so neither catches this. Fix used: a barrel-free subpath
   export (`"./delivery-address": "./src/validators/delivery-address.ts"`) that
   imports only zod. Do the same for any future shared value import, or give
   Turbopack a real extension alias.

---

## Testing discipline (learned the hard way, twice)

**A test that passes against the old code is worthless.** Every fix must ship a
test verified to FAIL before the change. Two real examples from this engagement:

- The rate-limit test "proved" per-user partitioning by closing the app and
  building a new one — a fresh limiter store, so it passed even though every
  user on the platform shared one bucket. It was green throughout the outage.
- My own SCAL-03 verification script split SQL on `;` then dropped chunks
  starting with `--`, silently skipping 3 of 9 statements while printing
  "applied". Caught only because the after-state still showed no index.

The harness lies more often than the code does. Verify the verifier.

---

## Live local stack (needed for verification; do not kill)

| Service | Where | Notes |
|---|---|---|
| Postgres | `127.0.0.1:55432` user `darshya` pw `darshya` db `darshya_utf8` | pid varies; seeded: 8 demo users, 20 temples, 97 bookings, 15 commissions, 3 priests |
| API | `http://127.0.0.1:4000` | `/health` → `{"status":"ok"}` |
| Web | `http://localhost:3000` | must be `next dev --turbopack`; plain webpack dev serves stale chunks and hides CSS edits |

Demo logins (all password `demo123`, dev-only, short-circuited before Supabase):
`devotee@ · pandit@ · admin@ · astro@ · store@ · temple@ · gaushala@ · wellness@` + `demo.com`.

`pg` module reachable via
`createRequire('C:/Users/DELL/AppData/Local/Temp/claude/E--NewClaude/782d31c6-4c3d-473b-8b0f-c8361dcce923/scratchpad/pgstack/index.js')`.

Rebuilding this stack costs ~40 minutes. `embedded-postgres`' supervisor node
process lives in the same PID cluster as an old dead API shell — do **not**
blind-kill that cluster.

---

## Commits so far (branch `feat/recurring-razorpay-planid`, NOT pushed)

| Commit | What |
|---|---|
| `1645e4da` | 13 P0s from the 38-agent sweep — refund double-payout, 70%→80% pandit share, temple/gaushala donation misrouting, pandit portal 400s, video-proof payout, provider KYC writer, admin block/revenue, at-home funnel 404s, trust-score scale, store checkout |
| `4f90d0b9` | SCAL-01 — rate limiter partitioned per caller instead of one global bucket |
| `376153d5` | RESP-01 partial — consent banner reserves its height; Sign In still occluded |
| *(uncommitted)* | PF-01 tier param · SCAL-03 indexes · NOTIF-01 scheduler · A11Y-01/02/05 · AO-02 |

Baseline that must not regress: **API tsc clean · web tsc clean · 1229/1229 API
tests (90 files) · 328/328 web tests (41 files)**.
(An earlier commit message claimed "1197/1197 (86 files)" — that was wrong; the
true baseline at `1645e4da` was 1220/1220 across 90.)

---

## What is closed

Run `node docs/audit/ledger.mjs md` for the authoritative list. Summary as of
the last update: **21 fixed · 7 partial · 1 owner-gated · 359 open** of 388.

### Partial — explicitly not finished

| ID | What shipped | What remains |
|---|---|---|
| COM-01 | Checkout fails honestly instead of 500ing | Catalogue split (StoreProduct empty vs live catalogue) — owner |
| COM-02 / LEG-02 | Donor PAN now transmitted | Donee 80G registration number + PAN — owner |
| PM-03 | Schema default 0.80 + migration | Admin override path for a negotiated rate |
| RES-01 | Auth fetches have a 20s timeout | Every other fetch still hangs forever |
| RESP-01 | Banner reserves height, 347→321px, tab bar lifted | Card is 632px vs 321px banner in 844px viewport — needs a compact mobile notice (owner: compliance presentation) or a shorter card |
| HN-01 | `wikiThumb`/`snapToLadder` landed | Gap narrower than the sweep implies; re-measure |

---

## Blocked on the owner (nothing here can be closed in code)

| Type | Need | Blocks |
|---|---|---|
| Credential | Supabase → Auth → URL Configuration: add `https://darshya.online/auth/reset-password` | Password reset silently lands on the homepage |
| Credential | Supabase → Auth → SMTP → Resend | Built-in mailer is 2 emails/hour project-wide |
| Legal fact | 80G registration number + donee PAN | COM-02, LEG-02 — every receipt currently asserts eligibility with neither |
| Decision | Which refund ladder is real (badge vs written 100/50/0 vs code 100/75/50/25) | LEG-01, LEG-03, CM-04 |
| Decision | Proportional ledger reversal on partial refunds (~₹550 per mid-ladder cancellation) | Partial-refund correctness |
| Decision | Store catalogue: unify StoreProduct with the shopper catalogue | COM-01, S-02 |
| Decision | How the cookie notice is layered on mobile | RESP-01 |
| External | RazorpayX / Cashfree + a CA on TDS | PJ-02 — /become-priest promises Monday bank credit; no transfer rail exists |
| External | Resend + WhatsApp BSP + push credentials | NOTIF-03 — all four channels unconfigured |
| External | Delete the Stripe webhook for `/payments/webhook/stripe` | Stripe removed; endpoint 404s and retries |
| External | External pinger (cron-job.org / Upstash) | NOTIF-01 hardened in-process, but Render free spins down when idle |
| Decision | Self-host vs CDN for images | HN-01, PERF-01 — 20.85 MB on /pujas at 375px |
| Supply | Real astrologers | AW-02 — the funnel now REFUSES to sell anyone unapproved (409), so only the 3 real approved profiles are bookable and all 3 read `isOnline:false`. More supply needs recruiting and onboarding real people. |
| Money | **Refund ₹750 on consultation `AC-20260812-3F1C15`** | Taken against fictional astrologer `astro_001` before the funnel was closed. No Commission row was ever written, so nobody can be paid for it. Code now surfaces this class via `commissionMissing`; the refund itself is a money movement only you can make. |

---

## Defects found DURING remediation (not in the 388)

Agents fixing catalogued findings kept surfacing worse ones next door. All fixed
unless marked.

| Found while fixing | Defect |
|---|---|
| PM-02b | **Shown ₹0, charged ₹999.** `SubscriptionPanel` rendered `plan.priceMonthly`; the API sends `price`. Nothing translated, so `undefined > 0` was false and EVERY paid plan displayed the literal word "Free" while Razorpay was asked for the real amount. |
| PM-02b | `listPlans('priest')` sent `?role=priest`; the API filters the enum `PANDIT`. Live: `?role=priest` → 0 plans, `?role=PANDIT` → 3. Every subscription panel in the app was empty. |
| PM-02b | `/settings/subscription` was 100% fabricated — `MOCK_CURRENT_PLAN`, six invented invoices `inv_001…006` all marked Paid, and `handleChangePlan()` was local state with the comment "In production, this would call the API". It was `/pricing`'s paid-CTA target. |
| AO-02 | The "Pay Now" button rendered **Commission** rows, but the process endpoint resolves **PayoutRequest** ids — wiring it as specified would have 404'd every click. A pending Commission is money *owed*; only a PayoutRequest is settleable. |
| NOTIF-02 | `ensure-schema.ts` creates `WeeklyDigestOptOut` WITHOUT the FK its own migration declares. Any env bootstrapped that way accepts opt-outs for nonexistent users. *(Spun off to a separate session.)* |
| DB-01 | `orderBy: { scheduledDate: 'desc' }` is not a total order — walking all 5 pages returned 80 distinct rows of 81. One booking was permanently invisible. Now `[scheduledDate, createdAt, id]`. |
| NOTIF-04 | The two refund rails were NOT both on `reverseBookingLedger` as this doc claimed — `refund.service` still had an inline duplicate. Closed 2026-08-13; see invariant 2b. |
| CM-03 | `checkout/offering/page.tsx` kept a hand-copied `PLATFORM_FEE_INR = 51` whose comment claimed it was synced "as the temple wizard already does" — no longer true after CM-03 moved the wizard onto `lib/puja-pricing`. |
| PJ-02 | `/become-priest` claimed "Join 200+ verified pandits". The database has **3**, all seed rows. Same fabricated-proof class as "500+ pujas completed". |

**A sweep claim that was wrong:** CM-05 says "6 uploaded proof videos sit unused".
There are 9 rows with a non-null `video_proof_url` and **zero are playable** — five
are literal junk (`"not a url at all"`, `"   "`) and four are `cdn.example.com`
placeholders. The finding's suggested "embed one real proof video" cannot be done
honestly today.

---

## ▶ STATUS 2026-08-14 — 223 of 388 closed

| Severity | Total | Fixed | Partial | Owner | Open |
|---|---:|---:|---:|---:|---:|
| P0 | 65 | 50 | 7 | 3 | 5 |
| P1 | 155 | 108 | 41 | 6 | **0** |
| P2 | 120 | 49 | 27 | 8 | 36 |
| P3 | 48 | 16 | 1 | 0 | 31 |
| **All** | **388** | **223** | **76** | **17** | **72** |

Suites at last full run: **API 1615 · web 1438 · mobile 78**, all three tsc clean.
Committed through **`97fbd58c`** (734 files, 67,303 insertions).

**Deploy path, branch divergence and the sweep coverage gap are documented in
[`DEPLOY-PLAN.md`](DEPLOY-PLAN.md) — read it before merging or deploying.**

### Method that produced these numbers

Four fix waves, each followed by an **adversarial verify pass** whose job is to
find over-claims. It has repeatedly earned its cost:

- **20 claims downgraded** from fixed to partial for scope over-claim.
- **3 vacuous tests caught** — one asserted precisely what the OLD buggy code
  did (`AO-05`: `href === '/admin/users/<id>'`, which was the bug).
- Verifiers are required to **revert the change and prove the test goes red**.
  ⚠ Do NOT use `git stash` for that while other agents are writing — it stashes
  their in-flight work too. Copy the file to a scratch dir, restore HEAD's
  version with `git show`, run, then put the copy back.

**Read-only triage before fixing is extremely high value.** Three triage agents
over the 48 P3s found **13 already dead** (one was an *environment artifact* —
the sweep hit an unseeded local DB) and flagged **3 whose instructions would
cause damage if executed literally**:

- `DF-12` — deleting the "mock" astrologer array breaks every REAL astrologer;
  the API overlay only *merges onto* it (reviews/badges/specializations exist
  only there).
- `TD-08` — "44 nameless footer links" is `innerText` reading `''` through a
  deliberately collapsed `<details>`. Acting on it un-collapses a footer trimmed
  on purpose.
- `PF-10` — a `'use client'` page can return 404 *content* but not a 404
  *status*, and its fix is gated on `PF-01` landing first.

---

## ▶ RESUME HERE

**Standing instruction from the owner:** keep going until all 388 are worked.
If the session hits a usage limit, resume from this file when it lifts — do not
wait to be asked, and do not restart from scratch. Ask nothing; read the ledger
and continue.

**First three commands on resume:**
```
node docs/audit/ledger.mjs          # the tally — this is the truth
node docs/audit/ledger.mjs md       # regenerates LEDGER.md
git -C . status --short             # what is mid-edit
```

**Then:** pick the next `open` findings, prefer P0 → P1 → P2 → P3, batch
file-disjoint work across parallel agents, single-agent anything sharing a file.
Every fix needs a test proven to FAIL first. Update the ledger as each lands.

**Agents that were in flight when this was written** — check whether their work
is in the tree before redoing it (`git status`, then look for their test files):

| Owns | Findings | Files |
|---|---|---|
| bookings pagination | DB-01 | bookings-my API + `apps/web/app/bookings/page.tsx` |
| mobile cluster | PAR-01…07 | `apps/mobile/**` |
| refund + video-proof comms | NOTIF-04, NOTIF-05 | apps/api notification + ledger-reversal paths |
| keyboard nav | A11Y-03, A11Y-04 + the `inert` bug | site nav / mobile drawer |
| locale layer | I-01, I-02, I18N-01 | i18n lib + switcher |

Spun off to a separate session: the `ensure-schema.ts` missing
`WeeklyDigestOptOut_user_id_fkey` (found in passing during NOTIF-02, not one of
the 388).

**Known-good P0 candidates not yet started:** DF-01, AO-03, AW-01, CM-03, CM-05,
CM-06, PM-01b, PM-02b, RES-01 (finish it), CWV-01.

**Before any commit:** `git add --renormalize .` — a `.gitattributes` with
`* text=auto eol=lf` now exists, but ~2,592 worktree files are still CRLF and
agent writes keep flipping more. Check `git diff --numstat` looks sane (a
one-line change must not read as 677/661) and `git diff --ignore-cr-at-eol
--numstat` to see the real size.

**Wave 2 (owner's sequencing):** re-run `prod-clickthrough` and
`launch-readiness-delta` against the fixed tree ONLY once the code-fixable set
is exhausted and just owner-gated items remain. Then produce the final table
with then-vs-now scores. Running it earlier measures a moving target.

---

## Not yet started

- **P1 (155), P2 (120), P3 (48)** — untouched. All still `open` in the ledger.
- **Wave 2 re-verification** — re-run `prod-clickthrough` and
  `launch-readiness-delta` against the fixed tree to measure the delta and catch
  regressions. Owner's instruction: run this *after* the 388 are worked, or once
  only owner-gated items remain.
- Push the branch. Four commits are unpushed; batching to avoid burning Render
  pipeline minutes (every push = 1 web + 1 API build).

---

## Free-tier constraints that shape fixes

GH Actions 2000 min/mo with ~1,616 already spent on 9 scheduled workflows, and
this repo is **private** so minutes are billed with per-job rounding. That is why
NOTIF-01 became an in-process timer rather than the `*/10` workflow the finding
recommended — `*/10` alone is 4,320 min/month. Read
`docs/free-tier-budgets.md` before adding any workflow, cron, or SDK.

---

## ▶ NEXT SESSION STARTS HERE (2026-08-16, wave stopped early)

**312 of 388 closed. COMMITTED, NOT PUSHED, NOT DEPLOYED.** Branch
`feat/recurring-razorpay-planid` @ `50c0c0a9`. Production is still running
`ca044898` (307 fixed) — everything since is local only.

| Sev | Total | Fixed | Partial | Owner | Open |
|---|---:|---:|---:|---:|---:|
| P0 | 65 | 54 | 1 | 8 | **0** |
| P1 | 155 | 131 | 7 | 16 | 1 |
| P2 | 120 | 87 | 12 | 20 | **0** |
| P3 | 48 | 40 | 2 | 6 | **0** |
| **All** | **388** | **312** | **22** | **50** | **1** |

Suites: api **2006** · web **2317** · mobile **200** · all three `tsc` clean.

### ⚠ SEVEN CLAIMS ARE UNVERIFIED — do not treat this tally as settled

The wave was stopped on request partway through. All 11 fix lanes reported, but
2 verifiers were killed, so only 10 of ~30 claims were adversarially checked.
These seven carry a fixer's word alone and are tagged in LEDGER.json:

`SEO-09` · `CM-10` · `PF-04` · `DU-12` · `DF-12` · `SCAL-04` · `DI-05`

Calibration: in the PREVIOUS wave verifiers refuted 11 of 34 claims, and three
of those had **no code change at all**. An unverified claim here is materially
weaker evidence. **`DI-05` deserves the most scrutiny** — it sits next to
commission math the lane was forbidden to touch, and it self-reports `fixed`.

Re-run verification for those seven before quoting 312 as a real number.

### What IS solid

- **I-04 / I18N-03 (localized API errors)** — the claim that slipped through last
  wave with passing unit tests while production answered English. Now wired at
  the GLOBAL error handler (`plugins/error-localization.ts`, registered
  `server.ts:176`), not per call site, which is why it can cover 756 responses.
  The lane added `error-localization.wiring.test.ts` guarding the registration
  itself — the exact failure mode from last round — plus probes for both paths.
  19 tests green. **STILL NEEDS A LIVE PROBE:** after deploy, confirm
  `curl -H "Accept-Language: hi" https://api.darshya.online/api/v1/temples/__no_such__`
  returns Hindi. Until then it is verified locally only.
- **I-03 was DOWNGRADED** partial → open by its verifier. Recorded as refuted,
  not as claimed.
- **DU-12 refused twice.** Two different agents independently disputed the
  2,128-utility cool-gray codemod with their own reasoning. Two refusals means
  the finding is probably wrong — treat as wontfix, not outstanding work.

### Next steps, in order

1. Re-verify the seven unverified claims (a read-only verifier wave is enough).
2. Push → PR → CI → merge → deploy both Render services (no migration pending).
3. Live-probe I-04 as above, plus the standard set in DEPLOY-PLAN.md.
4. **50 owner-gated** remain — 80G registration number, WhatsApp BSP templates,
   FCM keys, Razorpay Route, Supabase SMTP, `images.darshya.online` DNS, legal
   entity/GSTIN, pricing decisions.
5. **`launch-readiness-delta` is still incomplete** (7 agents dispatched, 5 area
   blocks returned, no consolidated brief). **388 is a floor, not the true
   defect count.**

### Recurring hazards — both bit again this session

- A guard that scans source text matches **its own comments**. Five instances so
  far, one self-caught.
- A `-RESIDUE` / `-count` sub-claim id collapses onto its base finding and
  overwrites the base state. Hit `COM-02` last wave and `I18N-09` this wave —
  both corrected by hand. Strip suffixes carefully when reconciling.
- `-X ours` merges apply blocks **additively** where they do not textually
  conflict. Always run the full suite after a strategy merge.

