# Wedding Planner v1 — Product Spec

> **Roadmap item**: R-Q4-P-003 · **Status**: spec authored, engineering pending (blocks R-Q4-E-010) · **Revenue target**: ₹2,00,000 first year via 8-12% take-rate on weddings facilitated · **Authored**: 2026-06-12

## Mission

Make Bhaktisetu the **first platform where the muhurat calculation and the pandit booking are the same flow**. Couples (and parents-in-charge) decide the date based on the panchang, not on WedMeGood's vendor calendars. The wedding then assembles around that anchor.

We win because no other India wedding platform owns the muhurat layer. WedMeGood + ShaadiSaga + BookMyPandit treat dharma as an afterthought.

## Non-goals

1. **Not a generic event-planning tool.** No birthdays, anniversaries, corporate offsites. Wedding-only.
2. **Not destination-wedding booking.** No flights/hotels — partner with MakeMyTrip/Booking.com via affiliate, do not own.
3. **Not photographer/decor marketplace from day one.** Curated vendor list this version; full marketplace in v3.
4. **Not court marriage paperwork.** Legal registration assistance is out of scope (legal exposure too high without counsel).
5. **Not interfaith muhurat negotiation.** We serve Hindu rites only this version. Sikh/Jain in v2.

## User Journey

Linear narrative. Five anchored steps. Each step has a single primary action; nothing optional in MVP.

```
[couple/parent enters wedding date + city]
   │
   ▼
(a) Muhurat calc — auto-suggest top 3 dates within ±15 days using existing panchang
    engine. Show shubh/ashubh badges + reasoning (tithi, nakshatra, yoga).
   │
   ▼
(b) Venue suggestions — filter by city, capacity (50/200/500/1000+), budget bracket,
    veg-only kitchen yes/no, parking, AC, in-house decor. Show 5-8 per query.
   │
   ▼
(c) Pandit dispatch — match pandit by sampradaya (Smarta/Vaishnava/Arya Samaj/regional),
    language, fee bracket. Book slot for the muhurat from step (a).
   │
   ▼
(d) Vendor checklist — catering (per-plate ₹400-₹2500), photographer (₹50K-₹5L bracket),
    mehndi artist (₹5K-₹50K), decor, baraat band, makeup, invitations.
   │
   ▼
(e) Progress dashboard — couple sees % complete, T-minus countdown, payment timeline.
```

### Sub-flow: muhurat re-pick

After step (a), couple can swap their muhurat at any time before T-30 days. Re-pick triggers:

1. Pandit auto-reconfirm (if pandit not available on new date → re-dispatch with same sampradaya filter).
2. Venue check (most venues hold cancellation policy at T-30; re-pick after this date may forfeit deposit).
3. Vendor cascade (catering + photographer notified; they reconfirm or release).

### Sub-flow: couple → parent handover

70% of Indian weddings are parent-led for bookings (per Wedmegood's own user research, 2024). Allow primary-user delegation: couple invites parent via WA OTP, parent inherits full booking authority but couple stays in approval-loop for any payment ≥ ₹50,000.

## Personas

1. **Sneha (28, Mumbai, bride)** — wants the muhurat to be her grandfather's preferred ekadashi date, plus a venue her in-laws approve of. Friction point: tradition + ease must coexist. Time budget: 4-6 weeks.
2. **Arvind (54, Pune, bride's father)** — primary payer (40-60% of total ₹15-25L budget). Wants pandit and venue locked first, vendors later. Friction point: doesn't trust online vendor reviews; needs WA + phone, not email. Time budget: 3 months.
3. **Rohit (32, Bangalore, groom)** — pays jointly with parents (30% of total). Tech-forward, wants Stripe-style UX. Friction point: parents reject any app they can't see/touch. Time budget: 2 months.
4. **Mrs. Iyer (60, Chennai, groom's mother)** — final ritual authority. Insists on Smarta pandit, Tamil ceremony script. Friction point: app is in English; she needs Tamil voice-prompt fallback. Time budget: 6+ months (early planner).

## Data Model Deltas

Three new tables. Foreign keys to existing `users`, `priests`, `temple_puja_offerings` schemas (verify schema before migration; do not rename existing tables).

### Table: wedding_event

```sql
CREATE TABLE wedding_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_primary_user_id uuid NOT NULL REFERENCES users(id),
  couple_partner_user_id uuid REFERENCES users(id),
  delegated_planner_user_id uuid REFERENCES users(id),
  primary_city text NOT NULL,
  selected_muhurat_at timestamptz,
  muhurat_alternatives jsonb,
  total_budget_inr int,
  expected_guest_count int,
  veg_only boolean DEFAULT true,
  sampradaya text,
  status text NOT NULL DEFAULT 'planning',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wedding_event_primary_city ON wedding_event(primary_city);
CREATE INDEX idx_wedding_event_muhurat ON wedding_event(selected_muhurat_at);
```

`status` enum (text constraint): `planning`, `muhurat_locked`, `vendors_booking`, `T_minus_30`, `completed`, `cancelled`.

### Table: wedding_vendor_booking

```sql
CREATE TABLE wedding_vendor_booking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_event_id uuid NOT NULL REFERENCES wedding_event(id) ON DELETE CASCADE,
  vendor_type text NOT NULL,
  vendor_name text NOT NULL,
  vendor_contact_phone text,
  vendor_contact_email text,
  quoted_amount_inr int NOT NULL,
  advance_paid_inr int DEFAULT 0,
  status text NOT NULL DEFAULT 'quoted',
  booked_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wvb_event ON wedding_vendor_booking(wedding_event_id);
CREATE INDEX idx_wvb_type_status ON wedding_vendor_booking(vendor_type, status);
```

`vendor_type` enum: `catering`, `photographer`, `videographer`, `mehndi`, `decor`, `band`, `makeup`, `invitations`, `venue`, `pandit`.

`status` enum: `quoted`, `confirmed`, `cancelled`, `completed`.

### Table: muhurat_request

```sql
CREATE TABLE muhurat_request (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_event_id uuid REFERENCES wedding_event(id) ON DELETE SET NULL,
  earliest_acceptable_date date NOT NULL,
  latest_acceptable_date date NOT NULL,
  must_match_tithi text,
  must_match_nakshatra text,
  exclude_dates jsonb,
  computed_top_3 jsonb,
  selected_muhurat_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_muhurat_request_wedding ON muhurat_request(wedding_event_id);
```

`computed_top_3` JSON shape: `[{ "ts": "2026-11-25T05:32:00+05:30", "tithi": "Dwadashi", "nakshatra": "Revati", "yoga": "Siddha", "score": 0.94, "reasoning": "..." }, ...]`.

## API Surface

12 endpoints. All under `/api/v1/weddings/*` namespace. Auth required except where noted.

- `POST /api/v1/weddings` — create a new wedding_event. Body: `{ primaryCity, totalBudgetInr?, sampradaya?, expectedGuestCount? }`. Returns `{ id, status: 'planning' }`.
- `GET /api/v1/weddings/me` — list wedding_events the auth user is primary/partner/planner on. Returns `[{ id, primaryCity, selectedMuhuratAt, status, completionPct }]`.
- `GET /api/v1/weddings/:id` — full wedding detail including vendor bookings + muhurat requests. 403 if not authorized.
- `PATCH /api/v1/weddings/:id` — update mutable fields (totalBudget, sampradaya, expectedGuestCount, vegOnly). Cannot change `selectedMuhuratAt` here — use `/muhurat/select`.
- `POST /api/v1/weddings/:id/muhurat` — request muhurat computation. Body: `{ earliestAcceptableDate, latestAcceptableDate, mustMatchTithi?, mustMatchNakshatra?, excludeDates? }`. Returns `computed_top_3` from panchang engine.
- `POST /api/v1/weddings/:id/muhurat/select` — lock chosen muhurat. Body: `{ muhuratRequestId, selectedTs }`. Triggers pandit re-dispatch cascade. Returns updated `wedding_event` row.
- `GET /api/v1/weddings/:id/vendors` — list `wedding_vendor_booking` rows for this event.
- `POST /api/v1/weddings/:id/vendors` — add a vendor booking (quoted state). Body: `{ vendorType, vendorName, vendorContactPhone?, vendorContactEmail?, quotedAmountInr, notes? }`.
- `PATCH /api/v1/weddings/:id/vendors/:vendorId` — update vendor booking (confirm/cancel/advance-paid). Triggers wallet ledger entry if `advancePaidInr > 0`.
- `GET /api/v1/weddings/:id/checklist` — server-rendered progress dashboard data: % complete by category, T-minus countdown, missing-vendor flags, payment timeline.
- `POST /api/v1/weddings/:id/delegate` — couple primary user delegates planner role. Body: `{ delegateUserId }`. Sends WA OTP to delegate phone, delegate confirms, role assigned.
- `POST /api/v1/weddings/:id/handover` — partner accepts join-invite. Body: `{ acceptToken }` (token from WA invite link). Adds partner to `couple_partner_user_id`.

Public (unauth) endpoints — for landing-page muhurat preview teaser:

- `POST /api/v1/muhurat/preview` — compute top 3 muhurats for a date range. Body: `{ primaryCity, earliestDate, latestDate, sampradaya? }`. No persistence; rate-limited to 5/IP/day. Lead-capture follow-up via email-gate. (counts toward 12-endpoint total above)

## UI Screens

12 wireframes. ASCII layout for clarity (mermaid versions optional in v2).

### Wireframe 1: Wedding onboarding (Sneha-flow entry)

```
+--------------------------------------------------------------+
|  Bhaktisetu Wedding Planner                                  |
+--------------------------------------------------------------+
|                                                              |
|  When are you planning to get married?                       |
|                                                              |
|  Primary city: [Mumbai          ▼]                           |
|  Earliest acceptable date: [Nov 15, 2026]                    |
|  Latest acceptable date:   [Dec 30, 2026]                    |
|  Sampradaya (optional):    [Smarta          ▼]               |
|                                                              |
|  [ Get my 3 best muhurat dates →]                            |
|                                                              |
|  ────────────────────────────────────────────────────────    |
|  Why 3? Hindu astrology weighs tithi + nakshatra + yoga.     |
|  We score every day in your range; top 3 surface here.       |
+--------------------------------------------------------------+
```

### Wireframe 2: Top-3 muhurat suggestions

```
+--------------------------------------------------------------+
|  Best dates for you (Nov 15 — Dec 30, 2026)                  |
+--------------------------------------------------------------+
|                                                              |
|  ┌────────────────────┐  ┌────────────────────┐              |
|  │   ★ Best           │  │   2nd best         │              |
|  │  Nov 25, 2026     │  │  Dec 8, 2026       │              |
|  │  Wed · 5:32 AM    │  │  Mon · 11:14 AM    │              |
|  │  Score 0.94       │  │  Score 0.89        │              |
|  │  Tithi: Dwadashi  │  │  Tithi: Panchami   │              |
|  │  Nakshatra: Revati│  │  Nakshatra: Mrigshira             |
|  │  Yoga: Siddha     │  │  Yoga: Shobhana    │              |
|  │  [Lock this →]    │  │  [Lock this →]     │              |
|  └────────────────────┘  └────────────────────┘              |
|                                                              |
|  ┌────────────────────┐                                      |
|  │   3rd best         │   Why these?                         |
|  │  Dec 19, 2026     │   - Tithi avoids amavasya / krishna   |
|  │  Sat · 6:48 AM    │   - Nakshatra in shubh list           |
|  │  Score 0.85       │   - No yoga clash                     |
|  │  [Lock this →]    │   - Pandit availability checked       |
|  └────────────────────┘                                      |
|                                                              |
|  [ Show all 47 dates we considered]  [ Talk to a pandit]     |
+--------------------------------------------------------------+
```

### Wireframe 3: Venue suggestions

```
+--------------------------------------------------------------+
|  Venues in Mumbai · Nov 25, 2026 · 300 guests · veg-only    |
+--------------------------------------------------------------+
|                                                              |
|  Filters: [Capacity 200-500 ▼] [Budget ₹3-6L ▼] [AC ✓]      |
|           [In-house decor ✓]   [Parking ✓]                   |
|                                                              |
|  ┌─────────────────────────────────────────────────────┐    |
|  │  🏛  Shanmukhananda Hall, Sion                       │    |
|  │  Capacity: 1500 · Veg-only kitchen ✓                │    |
|  │  ₹3.5L (full day) · AC · 200-car parking            │    |
|  │  Available Nov 25 morning slot                       │    |
|  │  [View details →]  [Add to shortlist]               │    |
|  └─────────────────────────────────────────────────────┘    |
|                                                              |
|  (4 more venue cards follow same layout)                     |
+--------------------------------------------------------------+
```

### Wireframe 4: Pandit dispatch confirmation

```
+--------------------------------------------------------------+
|  Pandit booked for Nov 25, 2026 · 5:32 AM                    |
+--------------------------------------------------------------+
|                                                              |
|  Pandit Ramesh Iyer                                          |
|  Smarta tradition · Tamil + Sanskrit fluent                  |
|  18 yrs experience · 142 weddings on Bhaktisetu              |
|  Rating: ★ 4.9 (89 reviews)                                  |
|  Fee: ₹35,000 (full ceremony incl. samagri)                  |
|                                                              |
|  ──────────────────────────────────────────────────────      |
|  Sankalp draft (English):                                    |
|  "On 25 Nov 2026, in the city of Mumbai, the marriage of    |
|  [groom name], gotra [...], with [bride name], gotra [...]" |
|  [Edit sankalp →]                                            |
|                                                              |
|  [ Pay ₹10,000 advance (lock pandit) →]                      |
+--------------------------------------------------------------+
```

### Wireframe 5: Vendor checklist dashboard

```
+--------------------------------------------------------------+
|  Wedding checklist — 67% complete (T-minus 142 days)         |
+--------------------------------------------------------------+
|                                                              |
|  ✓ Muhurat locked (Nov 25, 2026, 5:32 AM)                    |
|  ✓ Pandit booked (Ramesh Iyer, ₹35K, ₹10K advance paid)      |
|  ✓ Venue booked (Shanmukhananda, ₹3.5L, ₹1L advance paid)   |
|  ✓ Catering booked (Shri Krishna, ₹1.8L for 300 plates)     |
|  ○ Photographer — 3 quotes in, awaiting decision             |
|  ○ Decor — needs RFQ sent                                    |
|  ○ Mehndi artist — needs RFQ sent                            |
|  ○ Baraat band — booked but advance pending                  |
|  ○ Invitations — DRAFT, needs printer quote                  |
|  ○ Makeup artist — not started                               |
|                                                              |
|  Total committed: ₹5.45L · Total budget: ₹18L · Remaining ₹12.55L
|                                                              |
|  [Next: pick photographer →]                                 |
+--------------------------------------------------------------+
```

### Wireframe 6: T-minus countdown banner

```
+--------------------------------------------------------------+
|  ⏱  142 days · 3 hours · 24 minutes until your wedding       |
|     Nov 25, 2026 · 5:32 AM · Mumbai                          |
+--------------------------------------------------------------+
```

### Wireframe 7: Couple → parent delegation

```
+--------------------------------------------------------------+
|  Add a planner                                               |
+--------------------------------------------------------------+
|                                                              |
|  Many weddings are parent-led. Invite your parent or         |
|  partner to plan with you.                                   |
|                                                              |
|  Phone (WhatsApp): [+91 98765 43210     ]                    |
|  Name (optional): [Arvind, dad          ]                    |
|                                                              |
|  [ Send WA invite →]                                         |
|                                                              |
|  When they accept, they'll see everything you see — but      |
|  any payment over ₹50,000 will still need your tap-to-       |
|  approve.                                                    |
+--------------------------------------------------------------+
```

### Wireframe 8: Mobile detail card (responsive)

```
+--------------------+
|  Nov 25 muhurat    |
|  ────────────      |
|  ★ Best · 0.94     |
|  Wed · 5:32 AM     |
|  Tithi Dwadashi    |
|  Nakshatra Revati  |
|  Yoga Siddha       |
|                    |
|  [ Lock this → ]   |
+--------------------+
```

### Wireframe 9: Public landing-page muhurat preview teaser

```
+--------------------------------------------------------------+
|  Wedding in 2026? Find your shubh muhurat in 60 seconds.    |
+--------------------------------------------------------------+
|                                                              |
|  City: [Bengaluru     ]   Window: [Sep — Dec 2026         ]  |
|  Sampradaya: [Vaishnava        ▼]                            |
|                                                              |
|  [ Show my top 3 dates → ]                                   |
|                                                              |
|  (Free preview · No login. After: enter email to save +      |
|  unlock pandit booking.)                                     |
+--------------------------------------------------------------+
```

### Wireframe 10: Vendor RFQ flow

```
+--------------------------------------------------------------+
|  Request quotes from 5 photographers                         |
+--------------------------------------------------------------+
|                                                              |
|  Your shortlist (we picked based on city + budget bracket):  |
|                                                              |
|  ○ Krishna Photography  ★ 4.8  ₹1.2L  3 days                 |
|  ○ Wedaa Studios        ★ 4.9  ₹2.4L  same-day-edit          |
|  ○ Frame Wala           ★ 4.6  ₹85K   budget option          |
|  ○ Capture Collective   ★ 4.7  ₹1.6L  cinematic              |
|  ○ Anonymous lens       ★ 4.5  ₹1.4L  candid focus           |
|                                                              |
|  We'll send a common brief to all 5. You get quotes in       |
|  48 hours.                                                   |
|                                                              |
|  [ Send brief to 5 → ]                                       |
+--------------------------------------------------------------+
```

### Wireframe 11: Payment timeline

```
+--------------------------------------------------------------+
|  Payment plan — ₹18L total                                   |
+--------------------------------------------------------------+
|                                                              |
|  Today      ──○──  Pandit advance ₹10K   ✓ paid             |
|  Today + 1d ──○──  Venue advance  ₹1L    ✓ paid             |
|  T-90 days  ──○──  Catering 25%   ₹45K   pending             |
|  T-60 days  ──○──  Photographer   ₹40K   pending             |
|  T-30 days  ──○──  Venue balance  ₹2.5L  pending             |
|  T-15 days  ──○──  All vendors balance   pending             |
|  T-3 days   ──○──  Pandit balance ₹25K   pending             |
|                                                              |
|  Total committed: ₹3.55L  ·  Outstanding: ₹14.45L            |
+--------------------------------------------------------------+
```

### Wireframe 12: Confirmation email layout

```
+--------------------------------------------------------------+
|  Subject: Your wedding date is locked — Nov 25, 2026         |
+--------------------------------------------------------------+
|                                                              |
|  Dear Sneha + Rohit,                                         |
|                                                              |
|  Your muhurat is locked for Nov 25, 2026 at 5:32 AM.         |
|                                                              |
|  - Tithi: Dwadashi                                           |
|  - Nakshatra: Revati                                         |
|  - Yoga: Siddha                                              |
|  - Score: 0.94/1.0                                           |
|                                                              |
|  Pandit Ramesh Iyer will conduct the ceremony.               |
|  Venue: Shanmukhananda Hall (booked).                        |
|                                                              |
|  Next steps:                                                 |
|  1. Confirm guest count by Aug 1                             |
|  2. Lock catering by Sep 15                                  |
|  3. Send invitations by Oct 5                                |
|                                                              |
|  Open your dashboard: https://darshya.online/weddings/<id>   |
|                                                              |
|  — Bhaktisetu Wedding Team                                   |
+--------------------------------------------------------------+
```

## Revenue Model

Three pricing tiers. Take-rate range 8%-12% of total wedding spend channeled through platform.

| Tier | Total wedding spend | Platform fee | Take-rate | Estimated count Y1 |
|---|---|---|---|---|
| **Lite** | ₹15,000 (pandit + sankalp only, no venue/vendors) | ₹1,200 to ₹1,800 | 8-12% | ~20 weddings |
| **Standard** | ₹50,000 to ₹3,00,000 (pandit + 2-3 vendors) | ₹4,000 to ₹36,000 | 8-12% | ~15 weddings |
| **Premium** | ₹2,00,000 to ₹25,00,000 (full-service) | ₹16,000 to ₹3,00,000 | 8-12% | ~5 weddings |

Y1 revenue projection: **₹2,00,000** (consistent with R-Q4-P-003 roadmap line). Conservative: assumes 40 weddings closed, average platform fee ~₹5,000.

Take-rate split:
- **Pandit fee**: 12% (we provide the customer + sankalp draft + payment rails)
- **Venue + catering**: 8% (we provide qualified-couple intro, less ongoing service)
- **Other vendors (photog/decor/etc)**: 10% (we provide curated shortlist + RFQ + tracking)

Pricing levers we will NOT pull in v1:
- No subscription / SaaS model (one-time, transaction-based)
- No commission on third-party affiliate flights/hotels (out of scope)
- No paid-tier "concierge" upgrade — every couple gets same UX

## MVP Cut-line

| Capability | v1 (ship Q4 2026) | v2 (ship Q2 2027) |
|---|---|---|
| Muhurat top-3 compute | ✓ | — |
| Muhurat re-pick with cascade | ✓ | — |
| Pandit dispatch + booking | ✓ | — |
| Venue suggestions (curated 5-8) | ✓ | — |
| Vendor RFQ flow | ✓ | — |
| Progress dashboard | ✓ | — |
| Couple → parent delegation | ✓ | — |
| Public muhurat preview teaser (unauth) | ✓ | — |
| Mobile-responsive web | ✓ | — |
| Native mobile app screens | — | ✓ |
| Vendor marketplace (open registration, full reviews) | — | ✓ |
| Decor 3D preview | — | ✓ |
| Sikh / Jain muhurat rules | — | ✓ |
| Destination-wedding affiliate (MMT, Booking.com) | — | ✓ |
| Multi-event support (sangeet + haldi + reception) | — | ✓ |
| Interfaith muhurat negotiation | — | ✓ |

## Competitor Diff

| Capability | Bhaktisetu | WedMeGood | ShaadiSaga | BookMyPandit |
|---|---|---|---|---|
| Muhurat compute integrated with booking | **✓** | ✗ | ✗ | ✗ (separate astrologer panel) |
| Pandit dispatch (verified, rated) | ✓ | ✗ | ✗ | ✓ |
| Vendor shortlist + RFQ | ✓ | ✓ (paid listings bias) | ✓ | ✗ |
| Public free muhurat preview (lead capture) | **✓** | ✗ | ✗ | ✗ |
| Couple ↔ parent delegation w/ approval-loop | **✓** | ✗ | ✗ | ✗ |
| Sankalp draft auto-generation | **✓** | ✗ | ✗ | ✗ |
| Take-rate transparency (8-12% disclosed upfront) | **✓** | ✗ (listings + commission, undisclosed) | ✗ | ✗ |
| Mobile-responsive web | ✓ | ✓ | ✓ | ✓ |
| Native mobile app | v2 | ✓ | ✓ | ✗ |
| Vendor marketplace size | curated (v1) | 10K+ | 5K+ | <500 |

**Moat**: muhurat-as-anchor is our wedge. WedMeGood/ShaadiSaga can't add it without admitting their entire UX assumes a customer-chosen date — our entire UX flows from a pandit-computed date.

## Open Questions

1. **Pandit availability concurrency** — what if same pandit gets locked by two couples for the same muhurat ts within seconds? (Optimistic lock at API layer? Soft-hold for 10min while couple completes advance payment?)
2. **Venue commitment refund policy** — if couple re-picks muhurat after T-30, venue may forfeit advance. Do we mediate or pass-through? (Affects trust + take-rate.)
3. **Vendor RFQ response time SLA** — what if 3 of 5 photographers don't respond in 48h? Do we auto-re-dispatch from a backup shortlist?
4. **Parent-paying vs couple-paying KYC** — Razorpay KYC tied to UPI account holder. If father pays from his UPI but couple is registered, do we register the father as secondary account or accept the discrepancy?
5. **Interfaith / non-Hindu inquiries** — landing page muhurat tool will be used by non-Hindu users (curiosity). Polite redirect copy + lead-capture? Or hard-block at sampradaya field?
6. **Sankalp i18n** — sankalp draft is English in v1. Tamil/Marathi/Telugu/Bengali/Gujarati needed for personas like Mrs. Iyer. Translation cost? Native pandit-author each language script?
7. **Wedding postponement / cancellation** — if entire wedding is cancelled (rare but happens), what's the refund policy? Pandit advance? Venue advance? Vendor advances?
8. **Booking concurrency at scale** — wedding season (Nov-Feb) sees 80% of bookings. Will current Render free-tier API handle the load? When do we promote to paid tier?

## Closes

Q-C-20260612T0503-R-Q4-P-003 — spec authored. Engineering build (R-Q4-E-010) unblocked.
