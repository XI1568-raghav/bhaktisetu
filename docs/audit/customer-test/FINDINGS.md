# Customer Test — Findings

## STATUS 2026-09-09 — closed and verified on production

| # | Finding | State |
|---|---|---|
| CT-MONEY-1 | `ALLOW_DEMO_PAYMENTS=true` on prod | **CLOSED** — flag deleted (Render API `204`), guard verified firing: `payment-confirm` now answers **403** |
| CT-SUPPLY-1 | Approved pandit never became bookable | **FIXED + DEPLOYED** (PR #254) |
| Rate limits | Every per-prefix policy dead | **FIXED + VERIFIED LIVE** — `/admin` 60, `/digest` 10, others on the 100 global |
| CT-API-1 | Malformed ids 500 (gaushala, cows, admin, store-admin) | **FIXED + DEPLOYED** (PR #255) |
| CT-CONSENT-1 | Digest opt-out unsigned + irreversible | **FIXED + DEPLOYED** — ⚠️ unsigned links expire **2026-10-21** |
| astro-portal | `/online` no role gate + 500 on bad input | **FIXED + DEPLOYED** |
| store-admin | Soft-deleted product resurrectable; lowStock miscount | **FIXED + DEPLOYED** |
| CT-ADMIN-2 | Uncollected money labelled revenue | **FIXED + DEPLOYED** — split by captured-payment evidence |
| wellness | Two pages published fabricated supply + dead CTAs | **FIXED + DEPLOYED** |
| CT-SEO-1 | Soft-404 on 7 dynamic patterns | fixed by a concurrent agent, on main |
| CT-TRUST-1 | Junk cause on `/donations` under a "verified" badge | **OPEN — owner decision.** Record belongs to a real user; unapproving is moderation, not a code fix |
| CT-DOC-1 | Razorpay doc points KYC at four 404 URLs | **OPEN** — doc edit |
| CT-UI-1 | `, · Temple management dashboard` empty interpolation | OPEN (P3) |

### The money path — exercised end to end against prod, 11/11

Ran with `RAZORPAY_KEY_ID` swapped to the test key, then restored. Live key is back:
`/payments/config` → `rzp_live_*` re-verified.

- past date **400** · invalid slot **409** · anonymous **401**
- booking created **201** `BS-20260909-YLZM7`
- **real Razorpay order minted: `order_TZtAYjsxQf74nr`**
- **a FORGED signature was REFUSED (400)** — the single most important assertion on this
  surface: money cannot be confirmed without a valid signature
- owner sees the booking; another role **403**
- cancel-quote correct · cancel **200** · double cancel **409**

### Regression check after all seven fixes

Role matrix re-run on prod: **53 x 200 own-surface, 51 x 403 cross-role, 7 x 401 anonymous,
0 findings.** API 3134/3134 · web 4276/4276.


Base: `https://darshya.online` · Deployed commit at test time: web `fc84b155`, API `cd9d0b1a`.
Phase: deterministic coverage floor complete. Interactive (CTA/form/role) testing pending on blockers.

## Coverage

| Surface | Count | Result |
|---|---|---|
| Static routes | 293 | 292 correct, 1 deliberate compliance gate. **0 defects.** |
| Dynamic route patterns | 98 | 58 PASS, 7 FAIL (soft-404), 33 UNRESOLVED (no sitemap sample) |
| Total app routes | 391 | 358 probed, 33 need real ids |

Of the 293 static: 217 → 200, 65 → correct `307 /auth/login?redirect=…` auth gate,
1 → correct `308 /live → /darshan`, 1 → `404 /csr-match` (intentional, see below).

## Confirmed findings

### CT-MONEY-1 · P0 · `ALLOW_DEMO_PAYMENTS=true` is set on the production API

The documented "staging only" escape hatch is live in production. Proven from outside,
three independent facts:

1. **`NODE_ENV` is production.** `GET /auth/me` with a demo bearer answers
   `401 {"message":"Demo tokens not accepted in production."}` — that string is emitted
   only when `NODE_ENV === 'production'` (`middlewares/auth.ts`).
2. **The payment guard does not fire.** `POST /api/v1/store/orders/not-a-uuid/payment-confirm`
   with a store-owner token returns **`400 {"error":"Invalid order id"}`**. The guard is the
   FIRST statement of that handler (`routes/store-orders.ts:496-503`) and would return 403;
   reaching the id parser proves execution passed it. A malformed id was used deliberately
   so nothing could be acted on.
3. The guard condition is `NODE_ENV === 'production' && ALLOW_DEMO_PAYMENTS !== 'true'`.

(1) and (2) together leave only one value for the flag.

**Blast radius — it gates three separate protections:**

| Where | What it disables |
|---|---|
| `lib/payment-mode.ts:26` | `assertNotProductionDemo()` — the platform-wide refusal to run demo payment paths in prod |
| `services/payment.service.ts:583` | the boot-time crash on demo Razorpay credentials |
| `routes/store-orders.ts:498` | the manual `payment-confirm` override |

**The exploitable chain.** `POST /store/orders/:id/payment-confirm` flips a `PENDING`
order to `CONFIRMED` with **no Razorpay signature**, and `store-orders.ts:478` mints a
`Commission` row on exactly that transition (`writeStoreOrderCommission`). Commission is
what the payout rail pays out. So a store owner can confirm their own unpaid order and
create withdrawable balance from nothing. `canManageOrder` admits STORE_OWNER for their
own store's orders, so this needs no admin.

**What is NOT wrong:** the live Razorpay key is set, so `isRazorpayDemoMode()` is false
and the `order_demo_*` path is not being taken today. Revenue is Rs 0, so nothing appears
to have been exploited. The mechanics of the real Razorpay verify path are intact.

**Action:** unset `ALLOW_DEMO_PAYMENTS` on the Render API service (`srv-d7mc2n8sfn5c73dfce0g`)
and redeploy. It is a one-variable change and needs no code. Verify the fix by re-running
step 2 above and expecting **403**.

Credit: surfaced by the `store` agent as an inference from a wrong status code; the flag
value itself was then proven independently here.


### CT-SUPPLY-1 · P0 · an approved pandit never becomes bookable — FIXED

Reproduced end to end on prod, 2026-09-08:

1. `ct+pandit` onboarded via `POST /onboarding/provider` → `Priest` row created,
   `status: 'active'`, `isVerified: false`.
2. Appeared in `GET /admin/pending-approvals` and in the admin UI at `/admin/approvals`.
3. Admin clicked **Approve**. `PATCH /admin/users/:id` answered
   `200 {"message":"User updated"}`; the queue rendered **"All caught up!"**.
4. `PanditProfile.approved` → `true` (`approvedAt 12:11:43Z`).
5. `Priest.isVerified` → **still `false`**. `GET /priests` still returned the same
   3 pandits — *Pandit Ramesh Shastri, Pandit Suresh Trivedi, Demo Pandit* — all
   seeded straight into the DB. The approved pandit was absent.

**Root cause.** A pandit lives in two tables. `routes/priests-public.ts` lists on
`Priest {isVerified: true, status: 'active'}` (lines 146, 228, 260); the admin
queue reads `PanditProfile.approved`. Nothing in the API ever wrote
`Priest.isVerified` — `POST/PATCH/DELETE /admin/priests` are `notImplemented`
stubs and `provider-kyc.ts` never touches `prisma.priest`. The two were never bridged.

**Why it is P0.** The supply funnel — recruit → onboard → approve — terminates in
a pandit no devotee can find or book, and the operator is shown a green success
with no error anywhere. Only hand-seeded pandits were ever bookable. The GTM plan
is to recruit 25–50 Gurugram pandits; every one of them would have landed here.

**Fix** (`1a041677`): `admin.service.updateUser` now mirrors the approval onto
`Priest.isVerified`. `updateMany`, not `update` — a pandit who has not completed
onboarding has no `Priest` row and that must no-op rather than throw and roll back
the approval. Rejection sets it false so a revoked pandit leaves the directory.
3 new tests; 64/64 `admin.service` tests green. Awaiting deploy to re-verify on prod.


### CT-SEO-1 · P2 · soft-404 on 7 dynamic route patterns

A nonexistent slug returns **HTTP 200** instead of 404, with a broken `<title>`.

| Pattern | Bogus-slug status |
|---|---|
| `/temples/[slug]` | 200 |
| `/temples/[slug]/pujas` | 200 |
| `/pujas/[slug]` | 200 |
| `/pujas/[slug]/temples` | 200 |
| `/astrology/[id]` | 200 |
| `/astrology/pancha-pakshi/[slug]` | 200 |

Repro: `curl -sI https://darshya.online/temples/__ct_does_not_exist_zzz` → `200`, 115,279 bytes,
`<title>Temple — , | Darshya</title>`.

**Scope correction from first read.** The rendered page is *not* broken for a human: it shows a proper
"Page not found" screen with a search box and popular puja/temple links (confirmed visually in-browser).
Saved response body: `shots/soft-404-temples.html`. The defect is confined to two machine-facing things:

1. **Status code.** Google treats 200 as "this page exists", so unlimited fabricated URLs are indexable
   as valid pages — the textbook soft-404 duplicate/thin-content problem. `next/navigation`'s `notFound()`
   would emit a real 404.
2. **Title tag.** `Temple — , ` is unguarded interpolation over an empty record — the comma and dash
   separators survive with nothing between them. This is what shows in a SERP and a browser tab.

Not a UX-blocking bug. It is an indexing bug, and it silently inflates the indexed surface.

### CT-DOC-1 · P2 · Razorpay activation doc points at 404 URLs

`docs/razorpay-live-activation.md` §2 instructs the owner to give Razorpay's KYC reviewer:
`/legal/privacy`, `/legal/terms`, `/legal/refund`, `/legal/shipping`. **All four 404.**
The live pages are `/privacy`, `/terms`, `/refund`, `/shipping` (all 200, verified).

The doc says the reviewer opens each URL manually and that a bad URL adds 1–3 days or a rejection.
Anyone following this doc submits four dead links.

## Non-findings (verified, deliberately correct)

- **`/csr-match` 404 is intentional.** Gated behind `ENABLE_CSR_MATCH`, because the page told corporate
  CSR buyers in writing that the platform is "80G certified + CSR-1 registered" while `lib/company.ts`
  has `HAS_80G_VERIFIED false`, `pan null`, `eightyGNumber null`. The gate is the fix (LEG-14). Working.
- **The 9 apparent 5xx failures in the first sweep were self-inflicted.** `/te`, `/te/hyderabad` and 7
  `/temple-portal/*` returned 502/503 because the API service was mid-restart from the deploy I had just
  triggered. Re-probed after: `/te` and `/te/hyderabad` → 200, all 7 temple-portal → correct 307. Zero real
  failures. Recorded so a future run does not re-file them.
- **429s at concurrency 6.** The edge throttles a 6-way parallel sweep. Not a product defect; the sweep
  now paces at conc=2 + 400ms with exponential backoff on 429.

## Blocked — not yet tested

| Area | Routes | Blocker |
|---|---|---|
| Admin portal | 24 | No ADMIN account. Demo tokens hard-rejected in prod (`auth.ts:21`), no self-serve path, no promote script. |
| Temple portal | 9 | TEMPLE_MANAGER not in `ONBOARDING_ROLES`. |
| Money paths | booking→pay→commission→payout→refund | Razorpay test keys not yet set on the API service. |
| 33 dynamic patterns | 33 | Need real ids; most are auth-gated so they need B1 resolved first. |
| Every CTA / form / interaction | all | Deterministic sweep proves reachability only. Click-level testing is the next phase. |

### CT-UI-1 · P3 · empty interpolation in portal headings

`/temple-portal` renders its subheading as `, · Temple management dashboard` for an
account with no temple profile yet — a leading comma and separator with nothing
between them. Same class as the soft-404 `<title>Temple — , ` in CT-SEO-1: a template
string joining fields that are empty, with no guard.

Cosmetic, and the rest of the page is correct (it shows the right "Complete your Temple
profile" onboarding CTA and honest zero states). Worth a single guard where the parts
are joined, since the pattern has now shown up twice.

### CT-TRUST-1 · P1 · a junk record passed "verification" onto a live money path

Found by the `gaushala-donations` agent, independently re-verified against prod.

`/donations` renders a donation card for gaushala `03edd2ff-4479-48f3-9ad1-6940e5558a4d`
with `name: "saharanpur"`, `description: "skkss"`, `address: "ssdwdqe"` — obvious
keyboard-mash test data. It is `approved: true`, carries a stock ISKCON photograph and a
"1+ cows" badge, and its Donate CTA is live:

```
?causeId=03edd2ff-4479-48f3-9ad1-6940e5558a4d&causeKind=gaushala&causeName=saharanpur
```

The same page states **"Support verified temples and gaushalas across India"** under a
badge reading **"Every cause verified by our team"**.

Verified independently: `curl https://darshya.online/donations` returns 200 / 177,838
bytes containing `saharanpur`, `skkss` and the record id, next to the verification claim.
The junk record is NOT in the public `/api/v1/gaushala` list (that returns the 5 clean
seeded gaushalas), so this surfaces only through the donations aggregation.

The payment mechanics are not broken. The **claim** is: money can be routed to a record
that says `skkss`, on a page promising every cause is vetted. That is a trust and
compliance exposure on a money path, not a data-quality nit. Two fixes are needed — purge
the record, and add a quality gate so approval cannot pass a cause with no real
description or address.

### CT-API-1 · P2 · a malformed id returns 500 instead of 404

`GET /api/v1/gaushala/:id` with a non-uuid path segment throws instead of 404ing.
Re-verified: `not-a-uuid`, `123`, `__ct_zzz`, `abc-def` all → **500**, while a
well-formed but nonexistent uuid (`00000000-0000-4000-8000-000000000000`) correctly
→ **404**. That isolates it to id *format*: there is no uuid guard before the Prisma
lookup (`apps/api/src/routes/gaushala.ts:29-31`). Same shape on the authenticated
`/gaushala-portal/cows/:id`. Publicly reachable, so any crawler following a malformed
link generates 500s.

### CT-CONSENT-1 · P2 · digest opt-out is unsigned and irreversible

Found by the `devotee` agent as "missing authentication". Verification refined it — the
agent's framing was wrong, the underlying defect is real.

**Not a missing auth gate.** `routes/digest.ts:10` documents the choice: *"It's
intentionally unauthenticated (the link lands from an email, possibly signed out)."*
That is correct and expected for an unsubscribe link; requiring login to unsubscribe
would be the worse bug.

**The actual defect is the identifier and the one-way door.** The body is
`{userId: <raw uuid>}` — not an HMAC-signed token. That id is returned verbatim by
`/auth/me` and embedded in every digest email link (`weekly-digest.ts:471`). And the
opt-out cannot be undone through the product: `WeeklyDigestOptOut` is only ever
`INSERT`ed or `SELECT`ed (no `DELETE`, no `UPDATE`), and `digest.ts` exposes only
`POST /unsubscribe` — there is no resubscribe route.

So anyone who obtains a user id can permanently suppress that user's digest, and the
victim has no in-product way to reverse it. There is also no rate limit on the route.

Verified: unauthenticated POST with a malformed body returns **400** (validation, so the
handler was reached) where the control `/bookings/my` returns **401**. Proven with a
malformed id — nothing was written against a real user.

Fix is the standard one: sign the unsubscribe parameter (HMAC over the user id, as the
List-Unsubscribe convention expects) and add a resubscribe path.

## Verified working on prod (authenticated, real accounts)

All 8 roles provisioned as real Supabase accounts (`ct+<role>@darshya.online`) and
exercised against the live API. Full matrix in `LEDGER-roles.json`.

### Authorization — clean

| Check | Result |
|---|---|
| Each role on its own portal endpoints | **53 x 200** |
| Every role against every other role's endpoints | **51 x 403** |
| Anonymous against gated endpoints | **7 x 401** |
| **Cross-role data leaks** | **0** |

### Booking journey (booking `BS-20260908-LPI98`, Rs 1152)

- Past date -> **400** `Cannot book a past date.`
- Slot `99:99` -> **409** `SLOT_UNAVAILABLE`
- Unauthenticated booking -> **401**
- Create booking -> **201**, `status: pending_payment`, booking number matches the
  documented `BS-YYYYMMDD-XXXXX` contract
- Devotee sees own booking in `/bookings/my`; `store_owner` -> **403**,
  `pandit` -> **403**, anonymous -> **401**. No leak.
- `cancel-quote` -> tier `50% refund (4-24h before)`, `refundAmountInr 576` on a
  Rs 1152 booking — an exact half, no float drift, matching the documented
  100/75/50/25/0 ladder. `hoursUntilSlot 13.1`.
- Cancel -> **200**, `requiresRefund:false` (correct, nothing was captured)
- Double cancel -> **409** `Booking cannot be cancelled in its current status "cancelled".`

### Admin portal — now click-verified (closes the long-open `#211`)

Dashboard (45 users / 29 providers / 1 pending approval), Users, Approvals,
Commissions, Payouts and Refunds all render with correct data and honest empty
states. The payouts page even self-documents the missing settle endpoint.

### Auth unhappy path

Wrong password on `/auth/login` renders **"Invalid email or password."**, the button
returns to "Sign In", no infinite spinner. The LIVE P0 recorded in `TASKS.md`
(2026-08-11) **does not reproduce on prod**.

## Still to run

Payment capture and refund-with-money require the Razorpay test key. Prod is on
a live `rzp_live_*` key, so `journey-booking.mjs` refuses to run and creates no
orders — that guard is deliberate. Blocked on PR #253 merging so the
`razorpay-test-mode` workflow is dispatchable from main.
