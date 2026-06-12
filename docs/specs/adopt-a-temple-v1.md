# Adopt-a-Temple Subscription Spec v1

> **Roadmap item**: R-Q4-P-002 · **Status**: spec authored, engineering pending (unblocks R-Q4-E-012) · **Revenue target**: ₹1,20,000 MRR (recurring) · **Authored**: 2026-06-12

## Goal

Recurring monthly subscription for devotees + corporate sponsors who "adopt" a specific Bhaktisetu-verified temple. Subscription funds flow to temple monthly via 80G-eligible donation rails. Subscriber gets monthly impact PDF, branded co-mention on temple page, public adoption ranking.

This is the **compounding revenue line** vs one-shot puja bookings — the platform's first true recurring product.

## Why this matters

- ₹1.2L MRR target = highest-impact subscription play in current roadmap.
- Blocks R-Q4-E-012 engineering item (can't build without spec lock).
- Recurring revenue → predictable cash flow → unblocks all hires + infra investments.
- Anchor of CSR campaign (`docs/marketing/csr-match-campaign.md` ties to this — corporate match = 2x adopt-a-temple subscriptions during festival window).

## Non-goals

1. **Not a one-time temple donation tool.** Existing `Donation` model handles that. This is recurring only.
2. **Not a temple-management SaaS.** Temple-side dashboard for receiving funds is out of scope v1 (manual disbursement by Foundation).
3. **Not gift subscriptions.** "Adopt a temple for your father" → v2.
4. **Not group adoptions.** "Our community of 50 adopts together" → v3 (needs split-billing).

## Personas

1. **Priya (32, Bengaluru, IT)** — wants ₹500/month auto-debit to a Krishna temple in Mathura she visited. Pain: today she sends ₹2000 ad-hoc via UPI to temple, no receipt, no impact visibility. Time budget: 5 min signup.
2. **Mr. Patel (58, Mumbai, business)** — wants ₹5000/month to a Tamil Nadu Murugan temple. Pain: needs 80G receipts monthly for tax + audit trail. Time budget: 10 min signup + reviews monthly PDF.
3. **Acme Corp CSR head** — wants to commit ₹50K/month across 5 temples for employee-engagement program. Pain: needs MoU + monthly impact PDF + audit-ready. Time budget: 30-day procurement cycle.
4. **NRI Sneha (38, San Jose)** — wants $50/month to her ancestral village temple. Pain: USD billing, FX clarity, 80G eligibility (donor-only deductible in some US states).

## Pricing tiers (v1 — founder must confirm)

| Tier | Monthly INR | Monthly USD (NRI) | What temple gets | What subscriber gets |
|---|---|---|---|---|
| **Bronze** | ₹500 | $10 | ₹400 disbursed (₹100 platform fee) | Monthly impact PDF + name on temple "supporters" list |
| **Silver** | ₹2,000 | $30 | ₹1,700 disbursed (₹300 platform fee, 15%) | Bronze + monthly video update from temple (1-2 min priest greeting) |
| **Gold** | ₹5,000 | $75 | ₹4,250 disbursed (₹750 platform fee, 15%) | Silver + quarterly puja sankalp in subscriber's name + branded co-mention on temple landing page |
| **Corporate** | ₹25,000+ | $300+ | 85% disbursed | Gold + monthly Foundation-issued PDF impact report + custom MoU + co-branded landing page section |

**Platform fee transparency**: every tier discloses upfront. 15% cap because Razorpay subscription fee (~2.5%) + bank rails + Foundation admin must come from somewhere; rest funds engineering of the platform.

## User journey

```
[devotee browses temple page] → [click "Adopt this temple — ₹500/mo"]
   │
   ▼
[Subscription checkout — Razorpay subscription mandate (recurring UPI/card)]
   │
   ▼
[Confirmation screen + first impact PDF preview]
   │
   ▼
[Day 30: auto-debit + email: monthly impact PDF + receipt]
   │
   ▼
[Day 90: video update from temple priest (Silver+)]
   │
   ▼
[Day 365: annual summary + tax-ready consolidated 80G receipt]
```

## Data model deltas

Three new tables. Reuse existing `temples`, `users`, `subscriptions` schemas.

### Table: temple_subscription

```sql
CREATE TABLE temple_subscription (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  temple_id uuid NOT NULL REFERENCES temples(id),
  -- Razorpay subscription id (or Stripe for NRI)
  gateway_subscription_id text UNIQUE,
  gateway_provider text NOT NULL,
  tier text NOT NULL,
  monthly_amount_inr int NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_temple_sub_user ON temple_subscription(user_id);
CREATE INDEX idx_temple_sub_temple ON temple_subscription(temple_id);
CREATE INDEX idx_temple_sub_status ON temple_subscription(status);
```

`tier` enum (text constraint): `bronze`, `silver`, `gold`, `corporate`.
`status` enum: `active`, `paused`, `cancelled`, `payment_failed`.
`gateway_provider` enum: `razorpay`, `stripe`.

### Table: temple_subscription_charge

```sql
CREATE TABLE temple_subscription_charge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_subscription_id uuid NOT NULL REFERENCES temple_subscription(id) ON DELETE CASCADE,
  charge_period_start date NOT NULL,
  charge_period_end date NOT NULL,
  amount_inr int NOT NULL,
  platform_fee_inr int NOT NULL,
  disbursed_to_temple_inr int NOT NULL,
  gateway_charge_id text UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  receipt_pdf_url text,
  receipt_eighty_g_number text,
  charged_at timestamptz,
  disbursed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tsc_subscription ON temple_subscription_charge(temple_subscription_id);
CREATE INDEX idx_tsc_status ON temple_subscription_charge(status);
CREATE INDEX idx_tsc_period ON temple_subscription_charge(charge_period_start);
```

`status` enum: `pending`, `charged`, `disbursed`, `failed`, `refunded`.

### Table: temple_impact_report

```sql
CREATE TABLE temple_impact_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  temple_subscription_id uuid NOT NULL REFERENCES temple_subscription(id) ON DELETE CASCADE,
  report_period_start date NOT NULL,
  report_period_end date NOT NULL,
  pdf_url text NOT NULL,
  video_url text,
  funds_used_for jsonb,
  sent_to_subscriber_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tir_subscription_period ON temple_impact_report(temple_subscription_id, report_period_start);
```

`funds_used_for` JSON shape: `[{ "category": "priest_stipend", "amount_inr": 5000 }, { "category": "samagri", "amount_inr": 1500 }, ...]`. Categories enum: `priest_stipend`, `daily_pujas`, `samagri`, `electricity`, `repairs`, `prasad_distribution`, `community_event`, `other`.

## API surface

10 endpoints + 1 webhook handler. All under `/api/v1/temples/:templeId/subscribe/*` and `/api/v1/me/temple-subscriptions/*` namespaces.

- `POST /api/v1/temples/:templeId/subscribe` — create subscription. Body: `{ tier, currency?, paymentMethodId? }`. Returns `{ subscriptionId, gatewayCheckoutUrl }`.
- `GET /api/v1/me/temple-subscriptions` — list my active subscriptions. Returns `[{ id, templeName, templeCity, tier, monthlyAmountInr, startedAt, nextChargeAt, lastImpactReportUrl }]`.
- `GET /api/v1/me/temple-subscriptions/:id` — full subscription detail w/ charge history + impact reports.
- `PATCH /api/v1/me/temple-subscriptions/:id` — pause/resume/change tier. Body: `{ action: 'pause'|'resume'|'change_tier', newTier? }`.
- `DELETE /api/v1/me/temple-subscriptions/:id` — cancel. Body: `{ reason?: string }`. Sets `cancelled_at`, `gateway_subscription_id` cancellation cascades to Razorpay.
- `GET /api/v1/me/temple-subscriptions/:id/charges` — paginated charge history.
- `GET /api/v1/me/temple-subscriptions/:id/receipts/:chargeId.pdf` — download single 80G receipt PDF.
- `GET /api/v1/me/temple-subscriptions/:id/annual-receipt/:fyYear.pdf` — consolidated annual 80G receipt (e.g. FY-2026-27).
- `GET /api/v1/temples/:templeId/supporters` — public list of names of active supporters (Bronze+, opt-out available). Cache 1h.
- `POST /api/v1/admin/temple-subscriptions/:id/disburse` — admin-only. Mark a charge as disbursed to temple (manual workflow v1; auto v2).
- `POST /api/v1/webhooks/razorpay/subscription` — handles `subscription.charged`, `subscription.cancelled`, `subscription.payment_failed` events. Creates `temple_subscription_charge` rows. Generates receipt PDF + emails subscriber.

## UI screens

7 wireframes.

### Wireframe 1: Temple page adopt-CTA

```
+--------------------------------------------------------------+
|  ISKCON Bangalore — Krishna Janmabhoomi Temple              |
+--------------------------------------------------------------+
|  [hero image]                                                |
|  📍 Bangalore · Verified · 80G eligible · 12 supporters      |
|                                                              |
|  Adopt this temple monthly                                   |
|  ┌──────────────────────────────────────────────────────┐    |
|  │  Bronze ₹500/mo   →  Funds 1 day of priest stipend  │    |
|  │  Silver ₹2,000/mo →  Funds 4 days + samagri budget  │    |
|  │  Gold ₹5,000/mo   →  Funds 1 week + your sankalp    │    |
|  │  [ Subscribe →]                                       │    |
|  └──────────────────────────────────────────────────────┘    |
|                                                              |
|  ─────────────────────────────────────────────────────       |
|  Active supporters (anonymized opt-in):                      |
|  • Priya S. (Bengaluru) · Silver · since 2026-04             |
|  • Mr. Patel (Mumbai) · Gold · since 2026-02                 |
|  • + 10 more                                                 |
+--------------------------------------------------------------+
```

### Wireframe 2: Tier picker + checkout

```
+--------------------------------------------------------------+
|  Subscribe to ISKCON Bangalore                               |
+--------------------------------------------------------------+
|                                                              |
|  Tier:  ○ Bronze ₹500/mo   ● Silver ₹2,000/mo   ○ Gold ₹5,000/mo
|                                                              |
|  What temple receives: ₹1,700/mo (85%)                       |
|  Platform fee:         ₹300/mo (15% — Razorpay + Foundation) |
|                                                              |
|  Payment method: ● UPI auto-debit   ○ Card auto-debit       |
|                                                              |
|  Next charge: today + monthly thereafter                     |
|  Cancel anytime via dashboard                                |
|  80G receipt issued monthly + annual consolidated receipt    |
|                                                              |
|  [ Subscribe ₹2,000/mo →]                                    |
+--------------------------------------------------------------+
```

### Wireframe 3: Subscriber dashboard

```
+--------------------------------------------------------------+
|  My temple subscriptions (3 active)                          |
+--------------------------------------------------------------+
|                                                              |
|  ┌────────────────────────────────────────────────────────┐  |
|  │ ISKCON Bangalore · Silver · ₹2,000/mo                  │  |
|  │ Started: 2026-04-12 · Next charge: 2026-07-12          │  |
|  │ Last impact: [June PDF · view ↗] [July video · play ▶] │  |
|  │ [ Manage ] [ Download receipts ] [ Cancel ]            │  |
|  └────────────────────────────────────────────────────────┘  |
|                                                              |
|  (2 more cards follow)                                       |
|                                                              |
|  Annual 80G receipt FY-2026-27: [Download PDF ↓]            |
+--------------------------------------------------------------+
```

### Wireframe 4: Monthly impact PDF (layout sketch)

```
+--------------------------------------------------------------+
|  BHAKTISETU FOUNDATION                                       |
|  Monthly Temple Impact Report                                |
|  Period: June 2026                                           |
+--------------------------------------------------------------+
|  Subscriber: Priya Sharma · Silver tier                      |
|  Temple: ISKCON Bangalore                                    |
|  Amount disbursed this month: ₹1,700                         |
|                                                              |
|  How your funds were used:                                   |
|   • Priest stipend (4 days): ₹1,200                          |
|   • Samagri (incense, oil, prasad): ₹400                     |
|   • Repair (water inlet pipe): ₹100                          |
|                                                              |
|  Temple snapshot this month:                                 |
|   • 18 pujas conducted · 4 festivals observed                |
|   • 240 devotees attended Sunday darshan (avg)               |
|                                                              |
|  Next month focus: Janmashtami preparation (Aug 26)          |
|                                                              |
|  80G Receipt:                                                |
|   Receipt #: DR-20260630-1247                                |
|   PAN of donor: [auto-filled from profile]                   |
|   Total deductible: ₹1,700 (Section 80G(5))                  |
|                                                              |
|  --- signed by Foundation auditor ---                        |
+--------------------------------------------------------------+
```

### Wireframe 5: Temple-side disbursement admin

```
+--------------------------------------------------------------+
|  Admin · Pending disbursements (Foundation only)             |
+--------------------------------------------------------------+
|                                                              |
|  Temple                  | Subs | Pending  | Last disbursed |
|  ISKCON Bangalore        |   12 | ₹14,200  | 2026-06-01    |
|  Sri Murugan, Chennai    |    5 |  ₹6,400  | 2026-06-01    |
|  Krishna Mandir, Mathura |    8 |  ₹9,800  | 2026-05-28    |
|                                                              |
|  [ Disburse all → bank transfer batch] (Foundation auditor)  |
+--------------------------------------------------------------+
```

### Wireframe 6: Cancel-flow w/ retention copy

```
+--------------------------------------------------------------+
|  Cancel your subscription to ISKCON Bangalore?               |
+--------------------------------------------------------------+
|                                                              |
|  Before you go — would one of these help?                    |
|                                                              |
|  ○ Pause for 1 month (resume auto next month)               |
|  ○ Switch to Bronze (₹500/mo, lighter)                       |
|  ○ Continue                                                  |
|                                                              |
|  Or cancel:                                                  |
|   Reason (optional, helps us improve):                       |
|   [_______________________________]                          |
|   [ Cancel subscription ]                                    |
|                                                              |
|  Note: temple will be notified of the cancellation w/ no     |
|  blame copy — just gratitude for the months of support.      |
+--------------------------------------------------------------+
```

### Wireframe 7: Annual receipt download

```
+--------------------------------------------------------------+
|  Your 80G annual receipt — FY 2026-27                        |
+--------------------------------------------------------------+
|                                                              |
|  Subscriber: Priya Sharma                                    |
|  PAN: ABCDE1234F · Email: priya@example.com                  |
|                                                              |
|  Total deductible donations to Bhaktisetu Foundation:        |
|   ₹24,000 across 12 monthly charges                          |
|                                                              |
|  Breakdown by temple:                                        |
|   • ISKCON Bangalore: ₹20,400 (12 × ₹1,700)                 |
|   • Sri Murugan Chennai: ₹3,600 (3 × ₹1,200)                |
|                                                              |
|  This receipt is auto-generated + signed by Foundation       |
|  auditor. Acceptable as primary tax document.                |
|                                                              |
|  [ Download PDF ↓]                                           |
+--------------------------------------------------------------+
```

## Test Plan

Engineering MUST write these RED first per superpowers TDD doctrine.

### API integration tests (`apps/api/src/routes/__tests__/temple-subscriptions.test.ts`)

1. `POST /temples/:id/subscribe` w/ valid tier → creates `temple_subscription` row, returns Razorpay checkout URL.
2. `POST /temples/:id/subscribe` w/ unauthenticated user → 401.
3. `POST /temples/:id/subscribe` w/ unknown templeId → 404.
4. `POST /temples/:id/subscribe` w/ invalid tier → 400.
5. `GET /me/temple-subscriptions` returns only my own subscriptions.
6. `PATCH /me/temple-subscriptions/:id` pause → status flips to `paused`, no new charges scheduled.
7. `PATCH /me/temple-subscriptions/:id` resume → status back to `active`, next charge scheduled.
8. `DELETE /me/temple-subscriptions/:id` → status `cancelled`, Razorpay subscription cancellation API called.
9. `POST /webhooks/razorpay/subscription` `subscription.charged` event → creates `temple_subscription_charge` row, generates PDF receipt URL.
10. `POST /webhooks/razorpay/subscription` `subscription.payment_failed` → status `payment_failed`, no retry blast (Razorpay handles retries).
11. Idempotency: same Razorpay charge webhook delivered twice → second call returns existing charge row, no double row.

### Service-level tests (`apps/api/src/services/__tests__/temple-subscription.service.test.ts`)

12. `computePlatformFee({ amountInr: 2000 })` → returns 300 (15%).
13. `computePlatformFee({ amountInr: 500 })` → returns 100 (20% — flat minimum applies for Bronze tier).
14. `computeDisbursementSchedule({ subscriptionId })` returns next 12 monthly schedule entries.

### PDF generation test (`apps/api/src/lib/__tests__/temple-impact-pdf.test.ts`)

15. `generateMonthlyImpactPdf({ subscriptionId, periodStart })` returns valid PDF buffer w/ subscriber name + temple name + amount + 80G receipt # embedded.

### Frontend test (`apps/web/__tests__/adopt-temple-checkout.test.tsx`)

16. Tier picker renders 3 tiers w/ correct amounts.
17. Selecting Silver fetches `POST /temples/:id/subscribe` w/ `{ tier: 'silver' }`.
18. After checkout success, dashboard `/me/temple-subscriptions` shows new subscription.

## MVP cut-line

| Capability | v1 (ship Q4 2026) | v2 (ship Q2 2027) |
|---|---|---|
| 3 tiers (Bronze/Silver/Gold) | ✓ | — |
| Razorpay subscription (INR) | ✓ | — |
| Stripe subscription (USD, NRI) | ✓ | — |
| Monthly impact PDF auto-generated | ✓ | — |
| Annual consolidated 80G receipt | ✓ | — |
| Pause / resume / cancel from dashboard | ✓ | — |
| Public supporters list (opt-in) | ✓ | — |
| Manual admin disbursement workflow | ✓ | — |
| Auto disbursement via bank rails | — | ✓ |
| Corporate tier + custom MoU | — | ✓ |
| Gift subscriptions ("adopt for father") | — | ✓ |
| Temple-side dashboard (view incoming) | — | ✓ |
| Monthly video update from priest (Silver+) | manual upload v1 | priest app v2 |
| Group adoption / split billing | — | v3 |

## Open questions

1. **Foundation disbursement cadence**: monthly batch on 1st of every month, or real-time per charge? (Recommend monthly batch — lower bank rail overhead.)
2. **Razorpay subscription mandate vs Stripe**: NRI uses Stripe; do we route INR-NRI thru Stripe too, or insist on Razorpay-NRI (less mature)? (Recommend Stripe NRI.)
3. **80G receipt timing**: issue monthly per-charge OR consolidate quarterly to save Foundation auditor time? (Recommend monthly per-charge for tax timing convenience; auditor stamps via batch.)
4. **Cancel reason taxonomy**: free-text only, or controlled enum? (Recommend enum for analytics: `too_expensive`, `temple_quality`, `personal_finance`, `temple_no_longer_relevant`, `other` w/ free-text.)
5. **Pause max duration**: forever, or max 90 days then auto-cancel? (Recommend 90 days max.)
6. **Tier-change billing proration**: prorate mid-cycle (complex), or change applies next cycle (simple)? (Recommend next-cycle.)
7. **Video update SLA for Silver+**: monthly hard requirement, or "we try"? (Recommend hard — set explicit founder expectation w/ priest network.)
8. **Failed-payment retry policy**: Razorpay default (3 retries over 7 days), or custom? (Recommend default; mark `payment_failed` after Razorpay exhausts retries.)
9. **Supporters list opt-in default**: opt-in (privacy-default) or opt-out (growth-default)? (Recommend opt-IN — adopt-a-temple is sensitive trust act; don't surprise.)
10. **Refund policy on first month**: 7-day money-back or no-refund-once-charged? (Recommend 7-day refund window — softens commitment friction.)

## Closes

Q-C-20260612T0001-R-Q4-P-002 — spec authored. Engineering build (R-Q4-E-012) unblocked.
