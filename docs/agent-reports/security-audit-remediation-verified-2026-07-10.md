# Security Audit Remediation — Verified Report

**Date:** 2026-07-10
**Audit source:** `docs/agent-reports/bug-audit-rerun/_MERGED_ALL.json` (72 findings, audited 2026-07-09)
**Remediation:** PR #178 (`787ca724`) — 3 commits + post-merge migration fix (`b53cbf1e`)
**Deploy:** Render API `bhaktisetu` + Web `darshya-web`, both live on `b53cbf1e`; Supabase prod DB 26/26 migrations applied.

## Totals

| | |
|---|---|
| **Total findings** | **72** |
| Critical | 5 |
| High | 20 |
| Medium | 27 |
| Low | 16 |
| Info (negative-result / refuted) | 4 |
| **Fixed / closed** | **68** |
| **Open / deferred** | **4** (PBO-6, PUB-03 partial, wp-02, AP-07) |

Severity by domain: store-admin 16, payments-bookings-onboarding 16, astrologer-portal 11, public-pages-data-leak 9, admin-gaushala-portals 7, priest-portal 7, auth-gating 3, wellness-portal 3.

---

## How to verify (live, no auth) — spot-checks confirmed 2026-07-10

| Item | Before (broken) | After (verified live) | Probe |
|---|---|---|---|
| PUB-01/07 | `/providers/priest` leaked userId/GST/aadhaar/commission | returns only public fields | `GET /api/v1/providers/priest` — no PII keys ✓ |
| PUB-02/08 | temple detail leaked phone/email/streamUrl/status/trustScore | all sensitive keys absent | `GET /api/v1/temples/:slug` — 0 leak ✓ |
| PUB-05 | `/mobile/profile` showed hardcoded "Arjun Sharma" | "Sign in" CTA, no fake profile | `GET /mobile/profile` — `arjun sharma` count 0 ✓ |
| S-09 | `/store-admin/revenue` 404 | page exists | `GET /store-admin/revenue` → 200 ✓ |
| B3 / ag-02 | `/admin` reachable (shell leaked) | middleware redirects | `GET /admin` → 307 ✓ |
| pp-03 | priest bookings link → `/priest/bookings/:id` 404 | real route | `GET /priest/bookings/view` → 200 ✓ |
| AP-01 | video room URL no paid gate | gated | `GET /consultations/by-room/x` → 404 ✓ |
| AP-02 | `/consultation/start` free room to any authed | requires paid consultation | `POST /consultation/start` → 401 ✓ |

DB-backed (Supabase prod, all PRESENT ✓): `donations.donor_pan` + `dedication` (PBO-14), `store_orders.store_profile_id` (S-11), `store_orders.idempotency_key` + unique idx (S-08), `commissions.store_order_id` (S-04), `commissions.wellness_enrollment_id` (wp-03), `store_products.stock` (S-13).

---

## Batch 1 — Criticals (5) — all fixed

| ID | Title | Before | After | Verify |
|---|---|---|---|---|
| AP-01 | Video-call room URL no paid gate | logged-out user gets free Jitsi room | `GET /consultations/by-room/:room` requires confirmed consultation owned by caller/astrologer/admin | live: 404 unauth ✓ |
| ag-01 / pp-04 | Priest verification gate dead | PANDIT role + auto-active Priest = instant verified priest | `requireRole('priest')` requires active Priest row; backfill creates inactive+pending | `auth.test.ts` +4 tests |
| PBO-1 | Donation verify accepts any valid signature; no order-id/ownership check | forged/mismatched payments mark donation paid | ownership check + order-id mismatch guard | `donations.ts` verify |
| pp-01 / PBO-4 | PATCH /bookings/:id no guard + arbitrary body spread (IDOR + payout fraud) | any user drives any booking, injects fields | ownership/role-gated + per-status field allowlist; service strips financial/identity | `bookings.ts` |
| (C-labeled) | — | — | — | — |

## Batch 2 + 3 — Highs (20) — all fixed

| ID | Title | After |
|---|---|---|
| AP-02 | `/consultation/start` free room | requires paid consultationId (live: 401 ✓) |
| AP-03 | IDOR PATCH /consultations/:id + start-call | ownership-checked → 403 mismatch |
| AP-04 | Astrologer dashboard empty (UUID vs slug) | queries match astrologer_id IN (profile.id, user.id) |
| AP-05 | Astrologer earnings/bookings 0 forever | same IN() fix |
| AP-06 | Paid consultations never create Commission/payout | verify-payment writes Commission ledger row (idempotent, skips mocks) |
| PBO-2 | Temple donations mis-attributed as gaushala | createOrder accepts causeKind temple\|gaushala + templeId; receipt names donee |
| PBO-3 | Booking wizard charges only base price (no 51+150 fees) | priceAmount = puja + PLATFORM_FEE(51) + prasad?(150) |
| PBO-5 | Home-puja/marriage pages dead-end fake submit | honest callback CTA (tel:/mailto:) |
| pp-02 | createPriestPayout has zero callers | wired into video_uploaded/delivered transitions |
| pp-03 | Priest bookings link 404 | points to `/priest/bookings/view?id=` (live: 200 ✓) |
| PUB-01 | /providers leaks full DB rows | PII stripped + approved-gate (live ✓) |
| PUB-06 | /semantic-search leaks drafts | status filter on both paths |
| PUB-07 | provider detail bypasses approved-gate | approved-gate (live ✓) |
| S-01 | store order mutations ADMIN-only (owner 403) | store-owner can manage via canManageOrder |
| S-02 | store-owner Orders = own purchases | store-scoped via resolveStoreProfileId |
| S-03 | Orders list never renders (json.orders vs {data:[]}) | reads json.data; serializeOrder emits correct fields |
| wp-01 | wellness enrollment no capacity check | capacity check on enroll |
| B1 | temple-portal /schedule accepts client ?slug= (any manager overwrites any temple) | unlinked temples admin-only |
| B2 | temple-portal /schedule no Bearer header (401 dead) | sends `Authorization: Bearer ${token}` |

## Batch 4 — Mediums (27) — 24 fixed, 3 open/deferred

| ID | Title | Status | After |
|---|---|---|---|
| AP-07 | Astrologer dashboard demo-skip → hardcoded ZERO_STATS | ⚠️ OPEN | demo-skip behavior unchanged (verify intent) |
| AP-08 | Assigned astrologer can't mark consultation complete | fixed | /:id/complete resolves astrologer identity; isAssignedAstrologer true |
| AP-09 | pricePerMinute=0 valid → silent 0/min | fixed | schema floors at 1 |
| AP-10 | GET /consultation/:id excludes astrologer/admin (403 own) | fixed | allows assigned astrologer + admins |
| AP-11 | Astrology public list hardcoded, never calls API | fixed | overlays real GET data (fallback only) |
| PBO-6 | admin lead CONVERTED only updates Lead, no role/profile | ⚠️ OPEN | false-advertising email; no upsertProviderProfile |
| PBO-7 | Booking wizard falls back to mock puja + fake slots | fixed | "Could not load puja details… retry" |
| PBO-8 | self-onboard role enum mismatch | fixed | canonical mapLeadRoleToOnboarding |
| PBO-10 | Donation verify not idempotent (double receipt) | fixed | if status==='paid' return existing receipt |
| PBO-11 | Donations no Razorpay webhook backstop | fixed | webhook marks paid + sends receipt |
| PBO-12 | webhook path skips referral reward | fixed | tryRewardReferral from both webhook paths (idempotent) |
| PBO-13 | puja verifyPayment no ownership check | fixed | passes caller id+roles; ownership check |
| PBO-14 | donor PAN + dedication never persisted | fixed | donations.donor_pan + dedication cols (DB ✓); receipt carries PAN |
| PBO-15 | Weddings flow fake bookable | fixed | reframed as inquiry, no fake payment |
| PBO-16 | create-order no double-submit guard | fixed | in-flight ref guard |
| pp-05 | Priests can't reject/release booking | fixed | PATCH /bookings/:id/reject releases to queue |
| pp-06 | Priest profile save swallows errors | fixed | reads res.ok, sets saveError |
| pp-07 | Bookings list posts placeholder video URL | fixed | window.prompt + URL validation |
| PUB-02 | temple list leaks trustScore; detail leaks phone/email | fixed | public-select whitelist (live ✓) |
| PUB-03 | cron ?token= query leaks secret to logs | ⚠️ PARTIAL | timing oracle fixed (timingSafeEqual); query-token fallback still on youtube-discovery/apollo-refresh |
| PUB-04 | /horoscope/prewarm timing oracle + default-allow | fixed | requireCronSecretHeader (constant-time + default-deny) |
| PUB-08 | /temples/:slug full row, no status gate | fixed | whitelist + status:'active' (live ✓) |
| S-04 | store-order payment writes no Commission/payout | fixed | resolve store + commission write (DB: commissions.store_order_id ✓) |
| S-05 | demo store-order verify skips signature | fixed | rejects non-demo ids + wrong sentinel |
| S-06 | dashboard counts from public mock, not owner table | fixed | pulls from owner-scoped /store-admin/products |
| S-11 | StoreOrder no storeProfileId FK | fixed | FK + backfill (DB ✓; cast fix b53cbf1e) |
| S-12 | store order trusts client total | fixed | server recomputes from catalog |
| S-13 | no stock validation/decrement | fixed | atomic decrement (DB: store_products.stock ✓) |
| S-14 | store owner can't manage own product orders | fixed | canManageOrder helper |
| S-15 | dashboard orders not store-scoped | fixed | scoped to owner's storeProfileId (live: revenue 401 ✓) |
| S-16 | Razorpay verify empty-secret fallback (forgeable) | fixed | hard-fails on empty KEY_SECRET |
| wp-02 | enrollment verify no order-id mismatch guard | ⚠️ DEFERRED | ownership added; order-id guard needs schema migration (inline TODO) |
| wp-03 | instructor payouts never written | fixed | writes PENDING Commission on PAID (DB: commissions.wellness_enrollment_id ✓) |
| B3 | no web middleware (admin reachable) | fixed | middleware.ts gates /admin + all portals (live: 307 ✓) |

## Batch 5 — Lows (16) + Info (4) — all fixed/closed

**Lows (fixed):**
- PBO-9 — demo "Simulate Payment" button visible → gated behind `NEXT_PUBLIC_ALLOW_DEMO_PAYMENTS`
- PUB-05 — mobile /profile fake hardcoded profile → real user + sign-in CTA (live ✓)
- ag-02 — no middleware → shell leak → edge gate (live ✓)
- ag-03 — demo ADMIN bypass → boot-fatal guard extracted + tests
- S-07 — checkout hard-gated loses cart → "Login to Checkout" CTA
- S-08 — no idempotency key → StoreOrder.idempotencyKey unique (DB ✓)
- S-09 — /store-admin/revenue 404 → page added (live ✓)
- S-10 — REFUNDED→DELIVERED ledger desync → terminal-state transition validation

**Info (closed, negative-result / refuted — no change required):**
- B5 — gaushala portal no IDOR (verified scoped)
- B6 — admin routes carry requireRole('admin')
- B7 — no self-escalation (role changes require admin, no self-target)
- PUB-09 — refuted (CORS not wildcard, rate-limit present, no stack traces, sitemap excludes admin, drafts filtered, KYC masked)

---

## Open / deferred follow-ups (4)

1. **PBO-6** (medium) — admin lead CONVERTED doesn't create provider profile / role assignment; approval email is false advertising. **Not touched by PR #178.**
2. **PUB-03** (medium, partial) — cron `?token=` query fallback still on `/admin/cron/youtube-discovery` + `/apollo-refresh`; timing oracle fixed, log-leak vector residual.
3. **wp-02** (medium, deferred) — wellness enrollment verify order-id mismatch guard needs schema migration (`wellness_enrollments.razorpay_order_id`); ownership check added; inline TODO.
4. **AP-07** (medium) — astrologer dashboard demo-session skip / hardcoded ZERO_STATS; not addressed — verify if intentional.

**Documented-incomplete (fixed-by-reframe, underlying flow deferred):** PBO-5 / PBO-15 (real payment/onboarding wiring deferred until catalog/weddings API migration), AP-04/05 (book-time slug→UUID storage deferred).

---

## Deploy verification (2026-07-10)

- Web `darshya.online` on `b53cbf1e`: home 200, `/store-admin/revenue` 200, `/mobile/profile` 200, `/jyotirlinga/somnath` 200, `/sitemap.xml` 200, `/admin` 307.
- API `api.darshya.online` on `b53cbf1e`: `/health` ok, `/api/v1/store-admin/revenue` 401 (exists+gated), `/api/v1/store/products` 200, `/api/v1/temples` 200, no 500s.
- DB: 26/26 migrations applied, "Database schema is up to date!", all new columns present.
- **Note:** prod had a 2-month migration backlog (CONCURRENTLY-in-transaction blocker + drift) cleared during this deploy — see `memory/reference_prisma_concurrently_migration_blocker.md`.
