# Festival Pre-sale Calendar UX Spec v1

> **Roadmap item**: R-Q4-P-007 · **Status**: UX spec authored, engineering pending (depends on R-Q4-E-011 infra) · **Revenue target**: ₹15L MRR via 60-day advance booking window for major festivals (Navratri Sep 22, Karwa Chauth Oct 30, Diwali Nov 8, Janmashtami Aug 26) · **Authored**: 2026-06-12

## Mission

Devotees book festival pujas in advance — not the night-of — so we can match supply to demand and avoid Diwali-night chaos. UX must capture the urgency of festival timing WITHOUT manufacturing artificial scarcity. Pure information transparency: real slot count, real countdown, real waitlist position.

The product wedge is **predictability**: every other temple says "show up at 5 PM Janmashtami". We say "your sankalp slot is locked for 6:42 PM, pandit Ramesh, here is the link to the live stream and your reminder T-2h".

## Non-goals

1. **Not a scarcity-deception engine.** Real inventory only. NO fake "5 slots left!" copy when 50 slots remain.
2. **Not a flash-sale gamification.** No timers that pressure devotees into impulse decisions.
3. **Not full e-commerce festival merchandise.** Prasad delivery is in-scope; gifts/decorations/merchandise = v2.
4. **Not multi-day group bookings.** "Family of 8 attending whole festival across 4 temples" = v2.
5. **Not livestream-only access.** Live darshan is free; this spec is for paid pujas + reservations.

## User Journey

```
[devotee browses /festivals]
   │
   ▼
(a) Calendar view — see next 6 festivals on grid, dates highlighted, slot counts shown
   │
   ▼
(b) Festival page — slot picker (puja × temple × time), real-time availability
   │
   ▼
(c) Booking confirm — pre-pay (Razorpay/Stripe), get booking number, T-2h reminder scheduled
   │
   ▼
(d) Waitlist (if sold out) — show position, opt-in WA notification on cancellation
   │
   ▼
(e) Post-payment — calendar invite (.ics file) + WA confirmation + email w/ pandit name
   │
   ▼
(f) T-24h reminder + T-2h reminder + post-puja video proof
```

## Personas

1. **Priya (32, Bengaluru)** — wants to lock Diwali Lakshmi puja 2 weeks ahead because last year she missed all evening slots. Mobile-first, scrolls calendar with thumb. Time budget: 5 min from open to confirm.
2. **Mr. Patel (58, Mumbai)** — wants to book entire Navratri 9-day Durga puja for his family. Wants ONE confirmation that covers all 9 days, not 9 separate bookings. Time budget: 15 min.
3. **NRI Sneha (38, San Jose)** — wants to book Janmashtami sankalp for her parents in India. Pays in USD via Stripe. Time-zone hassle: wants to see slots in IST AND her local time. Time budget: 10 min.
4. **Karwa Chauth bride (25, Delhi)** — first-time devotee, doesn't know which puja name applies. Needs UX that surfaces "Karwa Chauth Vrat Katha + Moon Darshan" bundle prominently. Time budget: 8 min including research.

## Pre-sale Calendar

7 wireframes. Mobile-first, desktop follows.

### Wireframe 1: /festivals landing (calendar grid)

```
+--------------------------------------------------------------+
|  Upcoming Festivals — Pre-book now                           |
+--------------------------------------------------------------+
|                                                              |
|  ┌──────────────────────────────────────────────────────┐    |
|  │  📅 Janmashtami · Aug 26, 2026 · Wed                 │    |
|  │  T-minus 75 days · 142/300 slots open                │    |
|  │  Across 12 temples (Mumbai, Vrindavan, Mathura...)  │    |
|  │  [ Book your slot →]                                  │    |
|  └──────────────────────────────────────────────────────┘    |
|                                                              |
|  ┌──────────────────────────────────────────────────────┐    |
|  │  📅 Navratri (9 days) · Sep 22 — Oct 1, 2026         │    |
|  │  T-minus 102 days · 1,140/2,400 slots open           │    |
|  │  9-day bundle available · ₹4,500 (₹500/day × 9)     │    |
|  │  [ See temples + tiers →]                            │    |
|  └──────────────────────────────────────────────────────┘    |
|                                                              |
|  📅 Karwa Chauth · Oct 30, 2026                              |
|  📅 Diwali · Nov 8, 2026                                     |
|  📅 Govardhan · Nov 9, 2026                                  |
|  📅 Bhai Dooj · Nov 11, 2026                                 |
|                                                              |
|  Subscribe to festival alerts → [ WA notify me ]             |
+--------------------------------------------------------------+
```

### Wireframe 2: Festival detail (slot picker)

```
+--------------------------------------------------------------+
|  Janmashtami · Aug 26, 2026 (Wed)                            |
+--------------------------------------------------------------+
|  ⏱ T-minus 75d · 8h · 14min                                  |
|                                                              |
|  Choose temple:                                              |
|  ○ ISKCON Mumbai (Chowpatty) · 18/40 slots left              |
|  ● ISKCON Vrindavan · 31/60 slots left                       |
|  ○ Banke Bihari Vrindavan · WAITLIST ONLY                    |
|  ○ Sri Krishna Math Udupi · 12/40 slots left                 |
|                                                              |
|  Choose puja:                                                |
|  ● Madhyahna Sankalp (12:00-13:00 IST) · ₹501                |
|    └ Your local (PST): 11:30 PM Aug 25                       |
|  ○ Sandhya Aarti Sankalp (18:00-19:00 IST) · ₹751            |
|    └ Your local (PST): 5:30 AM Aug 26                        |
|  ○ Midnight Janmashtami (00:00 Aug 27 IST) · ₹1,101         |
|    └ Your local (PST): 11:30 AM Aug 26                       |
|                                                              |
|  ─────────────────────────────────────────────────────       |
|  Total: ₹501                                                 |
|  Includes: video proof within 24h · 80G receipt · WA + email |
|                                                              |
|  [ Confirm & pay → ]                                         |
+--------------------------------------------------------------+
```

### Wireframe 3: Bundle picker (Navratri 9-day)

```
+--------------------------------------------------------------+
|  Navratri 9-day bundle · Sep 22 — Oct 1                      |
+--------------------------------------------------------------+
|                                                              |
|  Choose level:                                               |
|                                                              |
|  ○ Day-of darshan only — ₹0 (free livestream all 9 days)     |
|                                                              |
|  ● Daily sankalp (your name read every day) — ₹4,500         |
|     (₹500/day × 9 · 18% lower than ad-hoc 9 bookings)        |
|                                                              |
|  ○ Daily sankalp + prasad delivery — ₹6,750                  |
|     (₹4,500 sankalp + ₹2,250 prasad to your address)         |
|                                                              |
|  ○ Daily sankalp + family video call w/ pandit Day 9 — ₹8,500|
|     (Adds 30-min call · Day 9 Dussehra)                      |
|                                                              |
|  Temple: ● Maa Vaishno Devi Katra · ○ Kamakhya Guwahati      |
|                                                              |
|  [ Confirm bundle → ]                                        |
+--------------------------------------------------------------+
```

### Wireframe 4: Waitlist UX (sold-out flow)

```
+--------------------------------------------------------------+
|  Banke Bihari Vrindavan · Janmashtami midnight slot          |
+--------------------------------------------------------------+
|                                                              |
|  This slot is full.                                          |
|                                                              |
|  Join waitlist? You're #4 in line. If anyone cancels in next |
|  75 days, you'll get a WhatsApp notification w/ a 2-hour     |
|  first-claim window.                                         |
|                                                              |
|  [ Join waitlist (free, no payment) ]                        |
|                                                              |
|  ─────────────────────────────────────────────────────       |
|  Or try alternative slots:                                   |
|  ○ ISKCON Vrindavan midnight · 8/30 left · same time         |
|  ○ Govindji Temple Vrindavan · 14/40 left · 15min later      |
|                                                              |
|  Or different temple, same time:                             |
|  ○ ISKCON Mumbai · 12/40 left · same time slot               |
+--------------------------------------------------------------+
```

### Wireframe 5: Booking confirm + post-payment

```
+--------------------------------------------------------------+
|  ✅ Your slot is locked                                       |
+--------------------------------------------------------------+
|                                                              |
|  Booking BS-20260820-3KFR9                                   |
|  ISKCON Vrindavan · Janmashtami Madhyahna Sankalp            |
|  Wed Aug 26, 2026 · 12:00-13:00 IST                          |
|  Pandit: Vrajesh das (assigned)                              |
|                                                              |
|  [Download calendar invite (.ics)]  [Add to Google Cal]      |
|                                                              |
|  What happens next:                                          |
|  ✓ T-24h: WhatsApp reminder + final pandit confirmation      |
|  ✓ T-2h: WhatsApp + email final reminder                     |
|  ✓ Day-of: live stream link active 30 min before puja        |
|  ✓ T+24h: video proof delivered to WhatsApp + email          |
|  ✓ T+72h: 80G receipt PDF in your account                    |
|                                                              |
|  [ View booking →]   [ Share w/ family →]                    |
+--------------------------------------------------------------+
```

### Wireframe 6: T-24h reminder (WhatsApp message)

```
🪔 Janmashtami reminder

Pranam {name} ji,

Your sankalp puja is tomorrow:
  Aug 26 · 12:00 IST (11:30 PM PST today)
  ISKCON Vrindavan · Pandit Vrajesh das
  Booking BS-20260820-3KFR9

Pandit ji has confirmed. Live stream link goes
active 30 min before puja:
  https://darshya.online/live/{liveId}

Devotee names for sankalp (recite-aloud list):
  {name} (you)
  {family members from booking form}

Anything to change? Reply to this message within
6 hours, we'll adjust.

Bhakti ke saath,
Bhaktisetu CS
```

### Wireframe 7: Pre-sale capacity dashboard (founder/admin view)

```
+--------------------------------------------------------------+
|  Pre-sale dashboard · Janmashtami (Aug 26, T-minus 75d)      |
+--------------------------------------------------------------+
|                                                              |
|  Capacity utilisation:                                       |
|   ISKCON Mumbai:     22/40 (55%)                             |
|   ISKCON Vrindavan:  29/60 (48%)                             |
|   Banke Bihari:      40/40 (100% — waitlist #4)              |
|   Sri Krishna Udupi: 28/40 (70%)                             |
|                                                              |
|  Revenue pre-booked: ₹73,500 (cleared)                       |
|  Revenue pending payment: ₹4,500                             |
|                                                              |
|  Growth rate (last 7d): +18 bookings (₹9,200)                |
|  Projection at current rate: 78% sell-through by festival    |
|                                                              |
|  Actions:                                                    |
|  [ Increase Banke Bihari capacity (talk to TP) ]             |
|  [ Promote Udupi (lowest fill — under-marketed?) ]           |
|  [ Add second pandit slot at peak times ]                    |
+--------------------------------------------------------------+
```

## Data Model Deltas

Two new tables. Reuses `temples`, `puja_types`, existing `puja_bookings`.

### Table: festival

```sql
CREATE TABLE festival (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  observance_date date NOT NULL,
  pre_sale_window_days int NOT NULL DEFAULT 60,
  bundle_enabled boolean DEFAULT false,
  bundle_days int,
  description_md text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_festival_date ON festival(observance_date);
```

### Table: festival_temple_slot

```sql
CREATE TABLE festival_temple_slot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  festival_id uuid NOT NULL REFERENCES festival(id),
  temple_id uuid NOT NULL REFERENCES temples(id),
  puja_type_id uuid NOT NULL REFERENCES puja_types(id),
  slot_label text NOT NULL,
  slot_start_ts_ist timestamptz NOT NULL,
  slot_end_ts_ist timestamptz NOT NULL,
  total_capacity int NOT NULL,
  booked_count int NOT NULL DEFAULT 0,
  waitlist_count int NOT NULL DEFAULT 0,
  price_inr int NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (festival_id, temple_id, puja_type_id, slot_start_ts_ist)
);
CREATE INDEX idx_fts_festival_temple ON festival_temple_slot(festival_id, temple_id);
CREATE INDEX idx_fts_status ON festival_temple_slot(status);
```

`status` enum: `open`, `low_stock` (<20% remaining), `sold_out`, `cancelled`.

## API Surface

8 endpoints under `/api/v1/festivals/*`.

- `GET /api/v1/festivals` — list upcoming festivals (next 6 months). Returns calendar grid data.
- `GET /api/v1/festivals/:slug` — festival detail w/ all temple+slot inventory.
- `GET /api/v1/festivals/:slug/slots/:slotId` — single slot detail (capacity + price).
- `POST /api/v1/festivals/:slug/slots/:slotId/book` — book slot. Body: `{ devoteeNames, specialInstructions?, prasadDelivery? }`. Returns booking + Razorpay/Stripe checkout URL.
- `POST /api/v1/festivals/:slug/slots/:slotId/waitlist` — join waitlist. Body: `{ contactChannel: 'wa'|'email' }`.
- `DELETE /api/v1/me/festival-bookings/:id` — cancel pre-festival booking (cutoff: T-48h). Triggers refund per existing policy.
- `GET /api/v1/admin/festivals/:slug/dashboard` — admin only. Capacity + revenue + growth-rate data.
- `POST /api/v1/admin/festivals/:slug/slots/:slotId/expand-capacity` — admin only. Bump capacity after TP confirms.

## Copy guidelines (NO scarcity deception)

| Allowed | Forbidden |
|---|---|
| "18/40 slots left" (real count) | "Only 5 left!" when 50 exist |
| "T-minus 75 days · 8 hours · 14 minutes" (real countdown) | Timer that resets to "ENDS IN 2 HOURS" every refresh |
| "Sold out — join waitlist" (real status) | "Limited time festival pricing" when price is flat |
| "Booking growth +18/week" (real growth) | "1,247 people viewing this slot right now" (FOMO fake) |
| Email subject: "Janmashtami slots opening Aug 1" | "🚨 LAST CHANCE - book Janmashtami 🚨" |

Founder commitment: any scarcity copy that hits production WITHOUT real-data backing = automatic incident report + revert.

## Cut-line (v1 vs v2)

| Capability | v1 (ship Q3 2026 pre Janmashtami) | v2 (Q1 2027 pre Holi) |
|---|---|---|
| Calendar grid w/ next 6 festivals | ✓ | — |
| Single-slot booking | ✓ | — |
| Bundle booking (Navratri 9-day) | ✓ | — |
| Waitlist + WA notify on cancel | ✓ | — |
| Capacity dashboard (admin) | ✓ | — |
| Pre-sale window: fixed 60 days | ✓ | configurable per festival |
| Single-temple bookings | ✓ | — |
| Multi-day multi-temple group | — | ✓ |
| Festival merchandise / decor | — | ✓ |
| Live FOMO copy A/B test (real-data only) | — | ✓ |
| Auto-capacity scaling (talk-to-TP workflow) | manual v1 | semi-auto v2 |

## Open questions

1. **Capacity caps**: who sets per-temple cap? TP-self-serve or founder-imposed? (Recommend TP-self-serve via admin UI; founder approves above 100/slot.)
2. **Refund-on-cancel-pre-festival window**: T-48h vs T-7d? (Recommend T-48h — long enough for ops to refill from waitlist, short enough that devotee hasn't committed.)
3. **Bundle proration on partial-day cancel**: pro-rate refund (₹500 × days remaining) or no-refund-on-bundle? (Recommend pro-rate.)
4. **Waitlist priority**: FIFO order or weighted by past devotee bookings? (Recommend FIFO — fair + simple.)
5. **WhatsApp Business approval for festival reminders**: requires U7 activation (`docs/activation-gates.md`). Without WA, fall back to email-only? (Recommend yes, document UX degradation.)
6. **Festival-specific copy localisation**: do we ship same English/Hindi for Karwa Chauth as for Janmashtami, or per-festival custom? (Recommend per-festival for top 6; generic for tail.)
7. **NRI time-zone display**: auto-detect via browser timezone, or always show in both IST + local? (Recommend: detect by default, allow override; ALWAYS show IST as primary because pandit-side is IST.)
8. **Pre-sale email teasers (60d, 30d, 14d before)**: who is the email list? All past devotees or opted-in only? (Recommend opted-in only per DPDPA hygiene.)

## Closes

Q-C-20260612T0001-R-Q4-P-007 — UX spec authored. Engineering build (R-Q4-E-011) depends on this.
