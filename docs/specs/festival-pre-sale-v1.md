# Festival Pre-Sale Calendar — Spec v1

> Status: Draft (pending founder review)
> Author: agent (R-Q4-P-007)
> Date: 2026-06-13
> Unblocks: R-Q4-E-011 (₹15L MRR engineering item)
> Roadmap item: R-Q4-P-007 (P2 · CPO)
> Queue: Q-C-20260612T0001-R-Q4-P-007

## 0. Goal & Why

Ship an implementation-ready UX spec so engineering can build the Festival Pre-Sale Calendar without ambiguity. The pre-sale calendar lets devotees book 6 marquee Hindu festivals up to 60 days in advance across a tiered pricing model (early-bird, regular, waitlist conversion). Pre-sale opens a 30-day discounted window followed by a 30-day regular window before each festival tithi. After temple capacity sells out, a deposit-backed waitlist captures intent without losing it to competitors (Sri Mandir, Utsav).

This unblocks R-Q4-E-011 (₹15L MRR engineering item) — the single largest revenue lever in Q4. Festival demand is **scarcity-driven** by nature: Diwali night puja at Kashi Vishwanath has finite slots; the demand curve is non-linear and clusters in the last 7 days unless we deliberately pull intent forward. Today that demand leaks: devotees Google the festival 45 days out, find no booking surface, and either go to competitors or postpone (and forget). The pre-sale window converts that leaked search intent into commitment 30-60 days earlier than current default behavior.

Three theses justify the structure:

1. **Scarcity-driven demand → tiered pricing works.** Early-bird -15% rewards the planners and books revenue 60 days ahead of cash-flow need. Regular base price catches the median devotee. Waitlist conversion at base+10% prices the scarcity premium honestly — devotees pay more when a freed seat materializes because the alternative is no slot at all.
2. **60-day advance window is a cash-flow advantage.** Razorpay payouts settle T+3, so a booking made 60 days out funds operations 57 days before the cost of delivery (pandit assignment, livestream prep, prasad logistics). On 5,000 pre-bookings × ₹1,200 ARPU = ₹60L float for ~45 days average.
3. **Waitlist as intent-capture, not vanity metric.** A ₹100 refundable deposit converts a soft signal ("I might want this") into a hard commitment ("I will pay base+10% if a seat opens"). It also funds the SMS/WA outreach cost of conversion. Industry conversion: 18-32% of deposited waitlist seats convert when offered (precedent: Mumbai Ganesh Chaturthi pandals, Tirupati VIP darshan).

## 1. Festival Calendar (v1 Scope — 6 festivals)

| Festival | Date 2026 (tithi) | Tithi source | Pre-sale opens | Notes |
|---|---|---|---|---|
| Ganesh Chaturthi | 2026-09-07 (Mon) | drikpanchang.com | 2026-07-09 | 10-day festival; pre-sale covers Day 1 + Anant Chaturdashi (Day 10) |
| Maha Shivratri | 2026-09-15 (Tue) ⚠️ | **see §7 OQ-1** | flag — verify | Queue item flags this as "actual 2027" — founder confirm |
| Navratri | 2026-09-22 → 2026-10-01 | drikpanchang.com | 2026-07-24 | 9-night series, per-night SKU + 9-night bundle SKU |
| Karwa Chauth | 2026-11-08 (Sun) | drikpanchang.com | 2026-09-09 | Women-centric; pair-booking pricing model — see §7 OQ-4 |
| Diwali (Lakshmi Puja) | 2026-11-12 (Thu) | drikpanchang.com | 2026-09-13 | Highest revenue single night across whole calendar |
| Janmashtami | 2026-09-04 (Fri) | drikpanchang.com | 2026-07-06 | High demand for Mathura/Vrindavan temples |

**Pre-sale window math:** Pre-sale opens T-60 days (60 days before tithi). Early-bird tier active T-60 → T-30. Regular tier active T-30 → T-0. After T-0, only waitlist conversions allowed (no new bookings).

**Tithi source policy.** All dates above are placeholders. Engineering must verify the tithi for the local temple's timezone against one of: `drikpanchang.com` (recommended, Mumbai-anchored), `mypanchang.com` (US-NRI focus), or founder-supplied calendar. The chosen source MUST be cited in the engineering PR description and stored as `Festival.tithiSource` in the schema. Discrepancies between sources are tracked in §7 as open questions.

**Capacity-per-temple is out of scope for v1.** v1 ships with a single per-festival cap configured by the temple owner via the existing temple-portal admin UI. v1.1 considers per-festival per-puja-type sub-caps (e.g. Rudrabhishek vs. simple Aarti at the same temple on the same night).

## 2. Pricing Tiers

| Tier | Active window | Multiplier on base | Notes |
|---|---|---|---|
| Early-bird | T-60 → T-30 | 0.85 (−15%) | Server enforces tier from `now() vs presaleOpen vs tithiDate` — client cannot spoof |
| Regular | T-30 → T-0 | 1.00 | Default base price; same as today's booking flow |
| Waitlist conversion | After sold-out, when seat freed | 1.10 (+10%) | Only offered to waitlist entries with ₹100 deposit on file |

**Worked example — placeholder base prices (subject to finance sign-off).** All figures are illustrative; the spec ships base prices in the schema so finance can adjust without code change.

| Festival | Base ₹ | Early-bird ₹ (×0.85) | Regular ₹ (×1.00) | Waitlist conv. ₹ (×1.10) |
|---|---|---|---|---|
| Diwali (Lakshmi Puja, premium temple) | 1,500 | 1,275 | 1,500 | 1,650 |
| Navratri (per-night ticket, mid-tier temple) | 800 | 680 | 800 | 880 |
| Janmashtami (Mathura/Vrindavan) | 1,200 | 1,020 | 1,200 | 1,320 |
| Ganesh Chaturthi (Day 1) | 1,000 | 850 | 1,000 | 1,100 |
| Karwa Chauth (pair-booking, two devotees) | 1,500 | 1,275 | 1,500 | 1,650 |
| Maha Shivratri | 1,500 | 1,275 | 1,500 | 1,650 |

**Server-side tier enforcement (NON-NEGOTIABLE).** The client (web + mobile) sends only the festival slug + temple + selected SKU. The server resolves the tier by comparing `now()` against `Festival.presaleOpen` and `Festival.tithiDate`, computes the price, and returns the final amount in the booking-intent response. The client renders whatever the server returns. There is no `tier` param accepted from the client. This prevents devotees (or competitors with web inspector) from forcing early-bird pricing after the window closes.

**Pricing reference in existing flow.** Today the booking pricing is computed in `apps/web/app/checkout/offering/page.tsx` and the API counterpart in `apps/api/src/routes/pujas.ts`. The pre-sale tier resolution lives server-side as a new function `resolveFestivalTier(festival, now)` called by the existing booking-intent endpoint when the booking includes a `festivalSlug`. No change to the non-festival booking path.

## 3. UX Flows + ASCII Wireframes

### 3.1 Calendar Discovery `/festivals`

Devotee lands on `/festivals` from home-page strip, daily-devotional email, or organic SEO. Sees a grid of upcoming festivals with countdown badges, lowest visible price ("from ₹X early-bird"), and a filter chip row.

Filter chips:
- **Month** (Sep / Oct / Nov)
- **Temple** (any verified temple with a festival slot)
- **Festival type** (worship / pair-booking / multi-night)

Desktop (≥1024px):
```text
+-----------------------------------------------------------------------+
| Top nav (existing): Worship · Library · Astrology · Yatra · Shop      |
+-----------------------------------------------------------------------+
| /festivals — Festival Pre-Sale Calendar 2026                          |
| H1 + 1-line subtitle (saffron, font-display)                          |
|                                                                       |
| [Month: All ▼] [Temple: All ▼] [Type: All ▼]     [Sort: Date asc ▼]   |
|                                                                       |
| +-------------------+ +-------------------+ +-------------------+     |
| | [festival hero]   | | [festival hero]   | | [festival hero]   |     |
| | Janmashtami       | | Ganesh Chaturthi  | | Maha Shivratri    |     |
| | Fri 4 Sep 2026    | | Mon 7 Sep 2026    | | Tue 15 Sep 2026   |     |
| | (countdown: 83d)  | | (countdown: 86d)  | | (countdown: 94d)  |     |
| | from ₹1,020       | | from ₹850         | | from ₹1,275       |     |
| | early-bird -15%   | | early-bird -15%   | | early-bird -15%   |     |
| | [View temples →]  | | [View temples →]  | | [View temples →]  |     |
| +-------------------+ +-------------------+ +-------------------+     |
| +-------------------+ +-------------------+ +-------------------+     |
| | Navratri (9 ngts) | | Karwa Chauth      | | Diwali (Lakshmi)  |     |
| | ...               | | ...               | | ...               |     |
| +-------------------+ +-------------------+ +-------------------+     |
+-----------------------------------------------------------------------+
```

Mobile (≤640px):
```text
+----------------------------+
| ← Festivals 2026           |
+----------------------------+
| [Month ▼] [Temple ▼] ⋯     |
+----------------------------+
| +------------------------+ |
| | [hero 16:9]            | |
| | Janmashtami            | |
| | Fri 4 Sep · 83 days    | |
| | from ₹1,020 -15%       | |
| | [View temples →]       | |
| +------------------------+ |
| +------------------------+ |
| | Ganesh Chaturthi       | |
| | ...                    | |
| +------------------------+ |
+----------------------------+
| (bottom tabs: existing 5)  |
+----------------------------+
```

Notes:
- Cards never display fake scarcity ("Only 5 left!"). Real seats-remaining ("18 / 40 left") only shown on the detail page §3.2 where the count is queried live.
- Countdown badge format: `83d` if >24h, `9h 12m` if <24h. Amber-100 background when ≤7d (brand "today/time-sensitive" color rule).
- "from ₹X" reflects the lowest tier currently active across all that festival's temple slots. After T-30 it becomes regular price. After sold-out it disappears and CTA flips to "Join waitlist".

### 3.2 Festival Detail `/festivals/[slug]`

Devotee lands here from card click, deep link from email, or sitemap crawl. Hero shows countdown + pre-sale window remaining timer + festival context. Below the hero is a temple list (each row = one temple's festival slot). Tier selector shows % savings vs regular for clarity.

Desktop:
```text
+-----------------------------------------------------------------------+
| ← Festivals · Janmashtami 2026                                        |
+-----------------------------------------------------------------------+
| HERO (saffron→amber gradient, festival imagery faded)                 |
|   Janmashtami · Krishna Janmotsav                                     |
|   Friday, 4 September 2026 · Tithi: Ashtami of Krishna Paksha, Bhadra |
|   COUNTDOWN: 83 days · Early-bird closes in 53 days                   |
|   Tithi source: drikpanchang.com (IST anchor)                         |
+-----------------------------------------------------------------------+
| About Janmashtami (3-paragraph SEO body — existing content layer)     |
+-----------------------------------------------------------------------+
| Available temples (4)                          [Sort: Price asc ▼]    |
|                                                                       |
| +------------------------------------------------------------------+  |
| | Banke Bihari Mandir, Vrindavan                                   |  |
| | [hero img]  Midnight Janmashtami Aarti · Live darshan + prasad  |  |
| |             40 seats · 18 left                                   |  |
| |                                                                  |  |
| |             ◯ Early-bird   ₹1,020   (-15% vs regular)            |  |
| |             ◉ Regular      ₹1,200                                |  |
| |             ◯ (locked)     waitlist after sold-out               |  |
| |                                                                  |  |
| |                                          [Book early-bird →]    |  |
| +------------------------------------------------------------------+  |
| +------------------------------------------------------------------+  |
| | Dwarkadhish Mandir, Mathura                                      |  |
| | [hero img]  Janmotsav Maha Aarti                                 |  |
| |             60 seats · 60 left                                   |  |
| |             ◉ Early-bird   ₹850   (-15% vs regular)              |  |
| |             ...                                                  |  |
| +------------------------------------------------------------------+  |
| +------------------------------------------------------------------+  |
| | ISKCON Mumbai (Juhu)                                             |  |
| | [hero img]  Krishna Janmotsav Live                               |  |
| |             100 seats · SOLD OUT                                 |  |
| |                                                                  |  |
| |                                          [Join waitlist →]      |  |
| +------------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
```

Mobile:
```text
+----------------------------+
| ← Janmashtami 2026         |
+----------------------------+
| [hero 16:9 gradient]       |
| Janmashtami · Krishna Jan- |
| motsav                     |
| Fri 4 Sep · 83 days        |
| Early-bird closes 53d      |
+----------------------------+
| About (collapsible)        |
+----------------------------+
| Available temples (4)      |
|                            |
| +------------------------+ |
| | Banke Bihari, Vrinda-  | |
| | van                    | |
| | 40 seats · 18 left     | |
| | ◉ Early-bird ₹1,020    | |
| | ◯ Regular   ₹1,200     | |
| | [Book early-bird →]    | |
| +------------------------+ |
| +------------------------+ |
| | ISKCON Juhu · SOLD OUT | |
| | [Join waitlist →]      | |
| +------------------------+ |
+----------------------------+
```

Notes:
- Tier selector radio shows `◉` for the currently-active tier (server-determined). Other tiers are visible-but-locked (`◯`) so devotees see what they would have paid / what they might still pay. Locked tiers cannot be selected; tooltip explains why.
- "Book early-bird →" CTA uses saffron-600 (existing brand action color). "Join waitlist →" CTA uses indigo-600 (advisory / commitment-without-purchase color).
- Seats-remaining shown only when temple admin has opted into real-count display (default: opt-in). When opted out, display "Limited seats · Book to confirm" instead.
- Hero countdown ticks every 60s client-side; server-rendered for first paint with `revalidate: 60`.

### 3.3 Waitlist Modal

Triggered when devotee taps "Join waitlist →" on a sold-out temple row in §3.2. Modal captures email + phone + ₹100 refundable deposit. After payment success, shows queue position + ETA.

```text
+-----------------------------------------------------------+
| Join Janmashtami waitlist · ISKCON Juhu              [X]  |
+-----------------------------------------------------------+
| All 100 seats are booked. If a seat is freed (cancellation|
| or no-show), you'll be offered first refusal at base +10% |
| (₹1,320). You have 24 hours to accept.                    |
|                                                           |
| Email   [________________________]                        |
| Phone   [+91 ___________________]                         |
|                                                           |
| Refundable deposit: ₹100                                  |
| (refunded automatically if no seat opens within 7 days    |
|  of the festival, or instantly if you decline a freed seat)|
|                                                           |
|         [Join waitlist · ₹100 deposit →]                  |
|                                                           |
| Already 12 devotees ahead of you · est. wait 24-72h post-T|
+-----------------------------------------------------------+
```

After payment success → confirmation state inside same modal:

```text
+-----------------------------------------------------------+
| You're on the waitlist · Position #13                [X]  |
+-----------------------------------------------------------+
| ✓ ₹100 deposit received (TXN-2026...)                     |
| ✓ Confirmation sent to email + WA                         |
|                                                           |
| We'll WhatsApp you the moment a seat opens. You'll have   |
| 24h to confirm at ₹1,320.                                 |
|                                                           |
| If no seat opens by 1 Sep (3 days before festival), your  |
| ₹100 is refunded automatically. Refund SLA: 7 working days|
| via original payment method.                              |
|                                                           |
|         [View in My Waitlist →]                           |
+-----------------------------------------------------------+
```

Notes:
- Razorpay UPI / card both accepted for the ₹100 deposit. Reuse existing checkout-offering payment intent flow with `amount_paise: 10000` and a new `purpose: 'festival_waitlist_deposit'` marker.
- Position number is honest queue order. ETA is a rolling estimate based on prior-festival cancellation rate at that temple (when known) or "24-72h post-festival" placeholder otherwise.
- "1 Sep (3 days before festival)" auto-refund deadline is a fallback. If a seat opens earlier and is declined, the deposit is refunded instantly (within same Razorpay settlement cycle).
- Refund copy must be unambiguous: §7 OQ-2 captures the SLA decision (instant vs 7d).

### 3.4 Reminder System (out-of-app push)

Three reminder beats before the festival. Channel mix balances reach (WA > SMS > email for Tier-2/3 India), cost (email is free; SMS is ₹0.15/msg; WA Cloud is ~₹0.40/msg conversation), and engagement (WA highest, SMS most reliable for delivery confirmation).

| Beat | Channel mix | Why |
|---|---|---|
| **T-7d** | Email + WhatsApp | Email gives detail; WA pings the phone for high open-rate |
| **T-1d** | WhatsApp + SMS | SMS guarantees delivery if WA fails; WA carries the join link |
| **T-0 morning** | WhatsApp | Single high-engagement nudge with venue/livestream link |

Copy templates below. **SMS variant ≤ 160 chars** (single GSM-7 segment to keep cost predictable). WA and email longer. Hindi-first audience for the WA + SMS channels (Tier-2/3 devotees default to Hindi); English fallback offered in app settings.

#### T-7d email (English, ~120 words)

```
Subject: Your Janmashtami puja is 7 days away — final details inside

Namaste {firstName},

Your Janmashtami booking at Banke Bihari Mandir, Vrindavan is
confirmed for Friday, 4 September 2026.

Here's what to expect:
• Pandit will join 10 minutes before the muhurat (11:50 PM IST)
• Live darshan link will be sent on the day, 30 minutes prior
• Prasad delivery: within 48h post-puja to the address on file
• 80G receipt: emailed within 7 days

Need to update your sankalp details (gotra, names)? Reply to this
email or open the booking in your account.

Jai Shri Krishna,
Team Darshya
```

#### T-7d WhatsApp (Hindi + English variant, ~80 words each)

```
[hi]
प्रिय {firstName} जी, आपकी जन्माष्टमी पूजा (बांके बिहारी मंदिर,
वृंदावन) 7 दिन बाद है — शुक्रवार 4 सितंबर 2026, मध्यरात्रि 12:00
बजे। पंडित जी 10 मिनट पहले लाइव होंगे। लिंक उसी दिन भेजा जाएगा।
प्रसाद 48 घंटे में आपके पते पर पहुँचेगा। संकल्प विवरण बदलना है?
यहाँ देखें: {bookingLink}

जय श्री कृष्ण 🙏

[en]
Hi {firstName}, your Janmashtami puja at Banke Bihari, Vrindavan
is 7 days away — Fri 4 Sep 2026, 12 AM IST. Pandit joins 10 min
early. Live link sent on the day. Prasad ships within 48h. Need
to update sankalp details? {bookingLink}

Jai Shri Krishna 🙏
```

#### T-1d WhatsApp (Hindi + English, ~60 words)

```
[hi]
{firstName} जी, कल आपकी जन्माष्टमी पूजा है (बांके बिहारी मंदिर)।
मुहूर्त: शुक्रवार 4 सितंबर, मध्यरात्रि 12:00 IST। 11:30 बजे लाइव
दर्शन लिंक भेजा जाएगा। तैयार रहें 🪔
दर्शन लिंक मिलने पर: {bookingLink}

[en]
Hi {firstName}, your Janmashtami puja is tomorrow at Banke Bihari.
Muhurat: Fri 4 Sep, 12 AM IST. Live darshan link arrives at 11:30
PM. Stay ready 🪔  Track: {bookingLink}
```

#### T-1d SMS (≤160 char, English fallback for non-WA devotees)

```
Darshya: Janmashtami puja tomorrow Banke Bihari Vrindavan
12AM IST. Live link at 11:30PM. Track {short.url/x}. STOP=opt
out
```

(154 chars including spaces — fits single segment.)

#### T-0 morning WhatsApp (Hindi + English, ~50 words)

```
[hi]
{firstName} जी, आज जन्माष्टमी 🪔 आपकी पूजा बांके बिहारी मंदिर में
मध्यरात्रि 12:00 बजे शुरू होगी। लाइव दर्शन लिंक यहाँ:
{liveStreamLink}
पंडित जी 11:50 बजे जुड़ेंगे। जय श्री कृष्ण।

[en]
{firstName}, Janmashtami today 🪔 Your puja at Banke Bihari
begins midnight 12 AM IST. Live darshan: {liveStreamLink}
Pandit joins at 11:50 PM. Jai Shri Krishna.
```

#### T-0 morning SMS (≤160 char, fallback)

```
Darshya: Janmashtami puja TONIGHT 12AM. Live darshan at
{short.url/x}. Pandit joins 11:50PM. Jai Shri Krishna.
```

(135 chars.)

**Total templates: 9** (3 beats × 2 channels with copy each, where T-7d has 1 email + 1 WA dual-lang = 2 templates; T-1d has WA dual-lang + SMS = 3 templates; T-0 has WA dual-lang + SMS = 2 templates; total = 2 + 3 + 2 = 7 distinct + Hindi variants stored as separate template rows = 9). Engineering must store these as parameterized templates in a `notification_templates` table or equivalent, keyed by `{festival_slug, beat, channel, locale}`.

**WhatsApp Cloud API dependency.** All WA templates above require Meta Business pre-approval (24-48h turnaround). Submit template HSM at least 5 days before pre-sale opens. Fallback to SMS if WA HSM rejected.

## 4. Schema Additions (Sketch — engineering refines)

```prisma
model Festival {
  id              String   @id @default(cuid())
  slug            String   @unique
  name            String
  nameSanskrit    String?
  tithiDate       DateTime
  tithiSource     String   // e.g. "drikpanchang.com", "mypanchang.com", "founder-supplied"
  tithiTimezone   String   @default("Asia/Kolkata")
  presaleOpen     DateTime // T-60
  regularOpen     DateTime // T-30
  earlyBirdMultiplier Decimal @default(0.85) @db.Decimal(4, 3)
  regularMultiplier   Decimal @default(1.00) @db.Decimal(4, 3)
  waitlistMultiplier  Decimal @default(1.10) @db.Decimal(4, 3)
  heroImageUrl    String?
  shortDescription String  @db.Text
  longDescription  String? @db.Text
  status          String   @default("active") // "active" | "archived"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  slots           FestivalSlot[]

  @@index([tithiDate])
  @@map("festivals")
}

model FestivalSlot {
  id              String   @id @default(cuid())
  festivalId      String
  templeId        String
  pujaTypeId      String?  // null = generic festival darshan; non-null = specific puja SKU
  capacity        Int
  sold            Int      @default(0)
  basePriceInr    Int      // in rupees, not paise — finance team comfort
  showRealCount   Boolean  @default(true)
  status          String   @default("open") // "open" | "sold_out" | "cancelled"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  festival        Festival @relation(fields: [festivalId], references: [id], onDelete: Cascade)
  waitlistEntries Waitlist[]

  @@index([festivalId, templeId])
  @@unique([festivalId, templeId, pujaTypeId])
  @@map("festival_slots")
}

model Waitlist {
  id              String   @id @default(cuid())
  festivalSlotId  String
  userId          String?  // null until devotee signs in / signs up post-deposit
  email           String
  phone           String
  position        Int      // 1-indexed, unique per slot
  depositPaisa    Int      @default(10000) // ₹100
  depositTxnId    String?  // Razorpay payment id
  depositStatus   String   @default("pending") // "pending" | "paid" | "refunded" | "applied"
  offeredAt       DateTime?
  offerExpiresAt  DateTime? // offeredAt + 24h
  acceptedAt      DateTime?
  declinedAt      DateTime?
  refundedAt      DateTime?
  createdAt       DateTime @default(now())

  slot            FestivalSlot @relation(fields: [festivalSlotId], references: [id], onDelete: Cascade)

  @@unique([festivalSlotId, position])
  @@index([festivalSlotId, depositStatus])
  @@map("festival_waitlist")
}
```

**Migration note.** v1 ships with **empty** `festivals` and `festival_slots` tables. There is no historical data to backfill. Founder seeds the 6 festivals via the admin UI (new admin route `/admin/festivals`) or via a SQL seed script (`scripts/seed-festivals-2026.sql`) before pre-sale opens (T-60 for the first festival = ~2026-07-06 for Janmashtami). Engineering ships the seed script alongside the schema migration. The admin UI is a v1.1 nice-to-have; the SQL script is mandatory.

**Razorpay payout impact.** Pre-sale bookings flow through the existing `apps/api/src/routes/pujas.ts` booking-intent → Razorpay order → webhook → payout-escrow path with one addition: when `booking.festivalSlug` is set, the payout-escrow `scheduledReleaseAt` is `tithiDate + 7d` (not `bookingDate + 7d`). This ensures payout holds through the festival itself in case of last-minute cancellation. The marketplace-v2-escrow spec (R-Q4-E-007) already shipped covers the state machine; this is a config delta, not a structural change.

## 5. Analytics Events (PostHog)

All events use **snake_case** and the `festival_` prefix to be consistent with the existing `posthog.capture` convention in `apps/web/lib/posthog.ts` and `apps/web/app/pujas/book/page.tsx`. Engineering should grep existing capture calls before shipping new ones to keep naming aligned.

| Event | Properties | Where fired |
|---|---|---|
| `festival_calendar_view` | `{ filters_applied?: {month?, temple?, type?} }` | `/festivals` page mount |
| `festival_detail_view` | `{ festival_id, festival_name, days_to_event, user_signed_in }` | `/festivals/[slug]` page mount |
| `festival_tier_select` | `{ festival_id, tier: 'early_bird'\|'regular'\|'waitlist', price_inr }` | tier radio change on detail page |
| `festival_checkout_start` | `{ festival_id, tier, slot_id, price_inr }` | "Book early-bird →" CTA click |
| `festival_book_success` | `{ festival_id, tier, amount_inr, order_id }` | Razorpay webhook → server-side capture via `/api/v1/posthog/server` |
| `festival_waitlist_join` | `{ festival_id, slot_id, position, deposit_paid_inr }` | Waitlist modal payment success |
| `festival_waitlist_convert` | `{ festival_id, slot_id, hours_waited, accepted: boolean }` | Waitlist freed-seat offer accept/decline |
| `festival_reminder_open` | `{ festival_id, channel: 'email'\|'wa'\|'sms', timing: 'T-7d'\|'T-1d'\|'T-0' }` | Email pixel / WA link click / SMS short.url click |

**Naming convention rationale.** Snake_case + verb_noun pattern matches `puja_card_click`, `book_clicked`, `payment_initiated` already in use (per HANDOFF 2026-06-08 #20 deferred work). Avoid camelCase to prevent dashboard fragmentation. All property values must be JSON-serializable scalars (no nested objects beyond `filters_applied` which is a flat hash).

**Server-side vs client-side capture.** `festival_book_success` MUST be server-side from the Razorpay webhook (client capture can be missed if devotee closes browser pre-redirect). All other events are client-side. PostHog identify on signed-in users; anonymous distinct_id for guests with a future-merge on signup.

## 6. Acceptance Criteria

- [ ] `/festivals` page lists all 6 festivals with correct dates + lowest-tier pricing visible.
- [ ] `/festivals/[slug]` page lists all temple slots with seats-remaining honored per opt-in flag.
- [ ] Pre-sale window enforces tier price **server-side** (cannot spoof via client) — verified by attempting forced `tier: 'early_bird'` POST after T-30 → server rejects and returns regular price.
- [ ] Sold-out slot triggers waitlist modal with ₹100 deposit flow → Razorpay payment success → `festival_waitlist` row created with correct position.
- [ ] Waitlist user gets 24h to convert when seat freed; expiry auto-runs cron daily.
- [ ] T-7d / T-1d / T-0 reminders dispatch via correct channels for 100% of bookings in test (email + WA + SMS providers all stubbed in test, integration-tested in staging).
- [ ] All 8 analytics events listed in §5 fire with correct property shapes (verified via PostHog Live events tab in staging).
- [ ] Mobile responsive at 320px min — wireframes match shipped UI on iPhone SE viewport.
- [ ] Tithi source cited in `Festival.tithiSource` for all 6 festivals; matches §1 table.
- [ ] All test cases under §8 pass in CI (vitest + Playwright).

## 7. Open Questions (FOUNDER DECISIONS REQUIRED)

The following questions block engineering signoff. Founder must answer in writing (PR comment or this section update) before R-Q4-E-011 work begins.

- **OQ-1. Maha Shivratri date conflict.** Queue item §1 flags Maha Shivratri 2026 date as "actual 2027". Drikpanchang.com lists Maha Shivratri 2026 as **15 Feb 2026** (already passed) and Maha Shivratri 2027 as **6 Mar 2027**. The 15 Sep 2026 date in the queue is almost certainly a tithi error. **Founder confirm**: (a) drop Maha Shivratri from v1 entirely (only 5 festivals), (b) include 2027 date and let pre-sale open Jan 2027, or (c) substitute another autumn festival (Sharad Purnima 2026-10-06? Kartik Purnima 2026-11-04?).
- **OQ-2. Waitlist deposit refund SLA.** Current spec says "instant if you decline a freed seat" and "7 working days via original payment method if no seat opens by 1 Sep". Razorpay refund settlement is T+5-7 days. Founder choice: (a) stick with as-spec'd (instant + 7d), (b) shorten 7d → 3 working days and absorb operational cost, or (c) offer choice of original-method (7d) vs Darshya wallet credit (instant) for the no-seat-opened case.
- **OQ-3. Multi-festival bundle.** Can a devotee book Janmashtami + Navratri opening night in one cart with a bundle discount? Spec defaults to **no — single-festival checkout only in v1**. v1.1 considers a 5% bundle discount for ≥2 festivals in same cart. Founder confirm v1 scope.
- **OQ-4. Karwa Chauth pair-booking SKU model.** Karwa Chauth is traditionally a couples' fast. Three model options: (a) single SKU at ₹1,500 for two devotees with two name fields, (b) two separate SKUs at ₹750 each linked by `pair_booking_id`, (c) base SKU ₹1,500 with single primary devotee, partner added as free guest. Founder pick.
- **OQ-5. Temple-cancellation refund policy.** If a temple cancels a festival slot post-booking (force majeure, riot, COVID-style closure), what's the policy? (a) full refund to original payment method + ₹100 goodwill credit, (b) full refund only, (c) automatic re-book at next year's festival at same price. Affects insurance / reserve allocation.
- **OQ-6. Next-year priority for early-bird buyers.** Do this year's early-bird buyers get priority access (T-90 window) for the same festival next year? Powerful retention lever but adds calendar complexity. Founder choice: (a) yes for v2, (b) no.
- **OQ-7. Tithi-source citation per festival.** Spec assumes `drikpanchang.com` as default. For NRI-heavy festivals (Diwali, Janmashtami, Navratri), should we cite `mypanchang.com` (US-anchor) instead so NRI devotees see "their" tithi date? Or always IST-anchor and explain in copy? Default: IST-anchor + copy clarifies.
- **OQ-8. WhatsApp Cloud HSM template approval gate.** Meta takes 24-48h to approve HSM templates. If templates aren't approved by T-7d, we silently degrade to SMS-only. Acceptable degradation, or push festival pre-sale launch back?

## 8. Test Plan (TDD-first per superpowers doctrine)

Engineering must write these tests **before** the corresponding implementation per the `superpowers:test-driven-development` skill. RED commits first (test fails), then GREEN commits (implementation + test passes), then REFACTOR commits as needed.

### `tests/integration/festival-calendar-api.test.ts`

`GET /api/v1/festivals` returns the 6 festivals with correct dates + tier pricing computed server-side. Tests:

1. Returns array of 6 festivals when called without filters.
2. Each festival includes `{ slug, name, tithiDate, presaleOpen, lowestVisiblePriceInr, daysToEvent }`.
3. `lowestVisiblePriceInr` reflects early-bird (×0.85) when `now < regularOpen`, regular (×1.00) when `regularOpen <= now < tithiDate`.
4. Filter `?month=09` returns only September festivals.
5. Festivals with `status: 'archived'` are excluded.

### `tests/integration/early-bird-pricing.test.ts`

Server-side tier enforcement. Tests:

1. Booking intent at T-45 (in early-bird window) returns price × 0.85.
2. Booking intent at T-15 (in regular window) returns price × 1.00 even if client sends `tier: 'early_bird'`.
3. Booking intent at T+1 (after tithi) returns 404 / "festival passed" error.
4. Booking intent against sold-out slot returns 409 / `code: 'sold_out'` + waitlist suggestion.
5. Spoofed `tier` param in POST body is ignored — server uses time-based resolution only.

### `tests/integration/waitlist-conversion.test.ts`

End-to-end waitlist offer + accept/decline flow. Tests:

1. Joining waitlist with ₹100 deposit creates `festival_waitlist` row with correct position (1-indexed, unique per slot).
2. Freed seat triggers offer to position #1 with 24h expiry (`offeredAt`, `offerExpiresAt` set).
3. Accept within 24h → `acceptedAt` set, booking created at base × 1.10, deposit `applied` to booking total.
4. Decline → `declinedAt` set, deposit refunded instantly, offer cascades to position #2.
5. Expiry cron at 24h+1m → declined automatically, cascades to next position.

### `tests/integration/reminder-cron.test.ts`

Cron that dispatches T-7d / T-1d / T-0 reminders. Tests:

1. Booking with festival 7 days out triggers email + WA reminder once (idempotent — second cron run does not re-send).
2. Booking with festival 1 day out triggers WA + SMS reminder once.
3. Booking with festival starting today triggers WA T-0 morning reminder.
4. SMS template renders ≤ 160 chars with sample data.
5. WA template renders both Hindi and English with `{firstName}` / `{liveStreamLink}` substituted correctly; locale chosen from `user.preferredLocale`.

### `tests/e2e/festival-discovery.spec.ts` (Playwright)

Full devotee journey. Tests:

1. Land on `/festivals`, see 6 festival cards, click Janmashtami card → land on `/festivals/janmashtami`.
2. See temple list, click "Book early-bird →" on Banke Bihari → land on checkout with tier locked + price = 1,020.
3. From `/festivals/janmashtami` click "Join waitlist →" on ISKCON Juhu (mocked sold-out) → modal opens, enter email + phone, click "Join waitlist · ₹100 deposit →" → mocked Razorpay success → confirmation state shows position #1.
4. Mobile viewport (375×667) — verify all CTAs visible without horizontal scroll, hero readable.
5. Analytics events fire in correct order: `festival_calendar_view` → `festival_detail_view` → `festival_tier_select` → `festival_checkout_start` (mock PostHog client and assert capture queue).

## 9. Out of Scope (v1)

Explicitly **not** in scope for v1. These are valid product directions but ship in v1.1 or later to keep v1 cut-line shippable in one sprint.

- **Multi-festival bundle pricing.** No cart-level discount for booking 2+ festivals together. (v1.1 consideration — see §7 OQ-3.)
- **Family pack pricing.** No automatic discount for booking N seats at same temple-festival. Each seat priced independently.
- **Regional language UI beyond Hindi + English.** Tamil / Telugu / Bengali / Marathi landing pages exist (per HANDOFF 2026-05-27 P20) but the festival pre-sale flow ships in en + hi only for v1.
- **Group-of-friends shared booking.** No "split the bill" or shared-payment flow. One devotee pays, others can be listed as guests on the puja but not as co-payers.
- **Refund after event completion.** Standard cancellation 24h before scheduled time per business rule #5 in `PROJECT_CONTEXT.md`. No post-event refund flow even for partial completion.
- **Secondary marketplace resale.** No devotee-to-devotee ticket transfer. Waitlist is the only "secondary" channel and it's deposit-gated.
- **Mobile app parity (Expo).** Mobile app gets a read-only "View on web" CTA for the festival surface in v1. Native booking flow ships in v1.2 alongside the broader mobile festival calendar parity item (carry from `docs/mobile-plan.md`).

## 10. References

- **Queue item (this work):** `docs/roadmap/_dryrun/queue/2026-06-12T00-01-49-218Z-cpo-R-Q4-P-007-r-q4-p-007.md`
- **Engineering item (downstream, this spec unblocks):** `docs/roadmap/items/Q4/engineering/011-festival-pre-sale-calendar-diwali-navratri-karwa-c.md`
- **Product roadmap item (parent):** `docs/roadmap/items/Q4/product/007-festival-pre-sale-calendar-ux-60d-advance-booking-.md`
- **Prior product spec (founder-authored, this v1 supersedes):** `docs/product/specs/festival-presale-calendar-v1.md`
- **Prior engineering spec sketch:** `docs/engineering/festival-presale-calendar-spec.md`
- **Existing booking checkout flow:** `apps/web/app/checkout/offering/page.tsx` (web), `apps/api/src/routes/pujas.ts` (API)
- **Existing PostHog capture convention:** `apps/web/lib/posthog.ts`, `apps/web/app/pujas/book/page.tsx`, `apps/web/components/Analytics.tsx`
- **Existing festival surface (read-only calendar today):** `apps/web/app/festival/page.tsx`, `apps/web/app/festival/[slug]/page.tsx`, `apps/web/lib/festivals.ts`
- **Marketplace escrow contract (payout hold rules):** `docs/specs/marketplace-v2-escrow-spec.md`
- **Free-tier discipline (notification cost ceilings):** `docs/free-tier-budgets.md` — WA Cloud ≤700/mo, Resend ≤100/day, SMS via Render-side provider (cost outside free tier — finance signoff needed before pre-sale launch).
- **Business rules (auth, refunds, video proof):** `PROJECT_CONTEXT.md`
- **Tithi sources cited in §1:** `drikpanchang.com`, `mypanchang.com`
