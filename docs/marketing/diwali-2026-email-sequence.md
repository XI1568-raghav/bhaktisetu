# Diwali 2026 Pre-Sale Email Sequence — T-30 / T-14 / T-7 / T-3

> 4-email Diwali campaign per R-Q4-E-011 + R-Q3-M-006. Targets ₹50L Q4 Diwali GMV.

## T-30 days (October 13, 2026) — Early-bird pre-sale launch

**Subject:** "Diwali 2026 pre-booking opens — save 15% on Lakshmi Puja"

```
Namaste {{first name}} 🪔

Diwali 2026 is exactly 30 days away (November 12). Bhaktisetu's pre-sale opens TODAY.

**Why pre-book now:**
- 15% off if you book by October 26 (T-14)
- 10% off if you book by November 5 (T-7)
- 5% off if you book by November 9 (T-3)
- Standard pricing after that — but Diwali day slots fill up

**Top 5 Diwali 2026 pujas — pre-sale tiered pricing:**

🪔 **Dhanteras Lakshmi Puja** (Nov 10)
   Standard ₹3,000 → Pre-sale T-30: ₹2,550

🪔 **Naraka Chaturdashi Snan** (Nov 11)
   Standard ₹1,500 → Pre-sale T-30: ₹1,275

🪔 **Diwali Lakshmi Puja** (Nov 12, main day)
   Standard ₹3,500 → Pre-sale T-30: ₹2,975

🪔 **Govardhan Puja** (Nov 13)
   Standard ₹1,500 → Pre-sale T-30: ₹1,275

🪔 **Bhai Dooj** (Nov 14)
   Standard ₹1,000 → Pre-sale T-30: ₹850

**5-Day Diwali Bundle** (all 5 pujas — book once, save more):
   Standard ₹10,500 → Bundle T-30: ₹8,000 (save ₹2,500)

[Book at bhaktisetu.com/festival/diwali]

🙏
Team Bhaktisetu
```

## T-14 days (October 28, 2026) — Mid-campaign + family reminder

**Subject:** "{{first name}}, your family's Diwali pujas — 14 days left for 10% discount"

```
Namaste {{first name}},

14 days until Diwali. Quick reminder of what's important.

**For your family in India:**
- Have you booked Diwali Lakshmi Puja for your parents/grandparents in India?
- 10% pre-sale discount still active through November 5

**For your family abroad:**
- 24hr video proof works across all timezones — your puja in India can be watched from Bay Area / NJ / London / Toronto same day
- USD/GBP/CAD/AUD pricing for all Diwali pujas

**Most-booked combinations this Diwali (1000+ bookings so far):**

1. **Family-focused:** Lakshmi Puja for parents in India + 24hr video proof to share on family WhatsApp
2. **NRI gift:** Lakshmi Puja booked from US/UK with India family receiving 80G receipt
3. **Bundle:** 5-day Diwali bundle for entire week of festivities

**Pandit availability status:**
- 80 verified Diwali pandits across 12 cities
- 60% of Diwali Lakshmi Puja slots already booked
- 40% remaining — but Mumbai/Bengaluru running tight

[Book now: bhaktisetu.com/festival/diwali]

🙏
Sunil Kumar
Founder, Bhaktisetu
```

## T-7 days (November 5, 2026) — Last call

**Subject:** "Final week for Diwali pre-sale — 5% off ends in 7 days"

```
Namaste {{first name}},

We're 7 days from Diwali. Last call for pre-sale pricing.

**Remaining pre-sale tier (5% off):**
Valid through November 9. After that: standard pricing.

**Available slots this week:**
- Dhanteras Lakshmi Puja (Nov 10): {{X}} slots remaining
- Diwali Lakshmi Puja (Nov 12): {{Y}} slots remaining
- Govardhan Puja (Nov 13): {{Z}} slots remaining

**For NRI families:**
- ⏰ Time zones — if you're in US/UK/Australia, book at least 48 hours in advance to give pandit time to coordinate
- 📧 80G receipts auto-issued for India tax filing
- 📱 WhatsApp video live-stream available for family viewing

**Special: ISKCON Janmashtami Bundle** (also Nov 5 Krishna special)
- ISKCON Mathura + Vrindavan + Mayapur live darshan series
- ₹1,500 includes 4-day Janmashtami devotional content
- ISKCON-verified pandits

**Quick book:** Reply to this email with the puja you want and we'll book it for you within 1 hour (WhatsApp +91-XXXXX-XXXXX).

🙏
Sunil
```

## T-3 days (November 9, 2026) — Urgent + last-minute

**Subject:** "Diwali is 3 days away — last available slots"

```
Namaste {{first name}},

Diwali Lakshmi Puja is in 3 days (November 12 main day).

**Status check on remaining slots:**

🔴 **Mumbai pandits:** SOLD OUT for Nov 12 (Lakshmi Puja)
   ↳ Alternative: Mumbai Nov 13 Govardhan still available

🟡 **Bengaluru pandits:** 5 slots remaining for Nov 12
   ↳ Book by Nov 10 if you want a Bengaluru pandit specifically

🟢 **Varanasi (Kashi):** 20 slots remaining for Nov 12
   ↳ Bonus: NRI families often prefer Varanasi for higher spiritual significance

🟢 **Delhi (Akshardham, Birla):** 15 slots remaining for Nov 12
   ↳ NCR pandits available

🟢 **Tirupati TTD + adjacent:** 10 slots remaining for Nov 12
   ↳ South Indian families' preferred choice

**Last-minute help:**
WhatsApp +91-XXXXX-XXXXX directly — Sunil (founder) is monitoring for last-minute Diwali bookings personally. Reply within 30 minutes.

**Already booked? Reminder:**
- Pandit confirmation email within 2 hours of booking
- Live ceremony begins at booking time (we send WhatsApp 5 min before)
- 24hr video proof + 80G receipt arrive within 24 hours

🙏
Sunil Kumar
Founder, Bhaktisetu
bhaktisetu.com/festival/diwali
```

## Implementation

```typescript
// apps/api/src/jobs/diwali-2026-sequence.ts
export const DIWALI_2026_SEQUENCE = {
  diwaliDate: '2026-11-12',
  emails: [
    { offsetDays: -30, template: 'diwali_t_minus_30' },
    { offsetDays: -14, template: 'diwali_t_minus_14' },
    { offsetDays: -7, template: 'diwali_t_minus_7' },
    { offsetDays: -3, template: 'diwali_t_minus_3' },
  ]
}

// Send to existing devotee segment + acquired-this-quarter segment
```

## Segmentation logic

- Send to ALL existing devotees (5K MAU)
- Skip if user has already booked Diwali puja this year
- Skip if user has unsubscribed
- Personalise NRI vs domestic based on geo
- Cross-channel: WhatsApp same content for engaged WA opt-in users

## Metrics

- Open rate (target 35% — higher than usual due to seasonal urgency)
- Click-through rate (target 8%)
- Conversion (book Diwali puja within 7 days of email) (target 5%)
- Total Diwali GMV attributed (target ₹50L Q4)
- T-30 vs T-3 effectiveness (typical: T-7 highest conversion)
