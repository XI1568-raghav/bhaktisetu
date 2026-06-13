# Navratri 2026 Email Sequence — T-30 / T-14 / T-7 / Daily-9

> 4-stage campaign covering 9-day Sharad Navratri (Oct 1-9, 2026). Targets ₹30L Q3 Navratri GMV.

## Sharad Navratri 2026 calendar

| Day | Date | Devi form |
|---|---|---|
| 1 | Oct 1 | Shailaputri (Pratham Navratri) |
| 2 | Oct 2 | Brahmacharini |
| 3 | Oct 3 | Chandraghanta |
| 4 | Oct 4 | Kushmanda |
| 5 | Oct 5 | Skandamata |
| 6 | Oct 6 | Katyayani |
| 7 | Oct 7 | Kaalratri |
| 8 | Oct 8 | Mahagauri (Maha Ashtami) |
| 9 | Oct 9 | Siddhidatri (Maha Navami) + Vijayadashami next day |

## T-30 days (Sept 1, 2026) — Pre-sale launch

**Subject:** "Sharad Navratri 2026 pre-booking opens — 9 days of Devi puja"

```
Namaste {{first name}} 🌺

Sharad Navratri begins October 1 — 9 days of Devi worship culminating in Vijayadashami.

**Why pre-book now:**
- 15% off if you book by Sept 15 (T-15)
- 10% off if you book by Sept 24 (T-7)
- Standard pricing after that

**9-day Navratri puja bundle (recommended):**
- 1 puja per day at chosen Devi temple
- Daily live darshan link
- 24hr video proof each day
- 80G receipt cumulative
- Standard ₹15,000 → T-30 pre-sale: ₹12,750

**Individual day options (start with most important):**

🌺 **Day 1 — Shailaputri Puja** (Oct 1)
   New beginnings, Pratham Devi. Standard ₹2,000 → ₹1,700

🌺 **Day 8 — Mahagauri Puja** (Oct 8 Maha Ashtami)
   Highest power day. Kanya pujan tradition. Standard ₹3,500 → ₹2,975

🌺 **Day 9 — Siddhidatri (Oct 9 Maha Navami)**
   Wish-fulfillment day. Final Devi worship. Standard ₹3,500 → ₹2,975

🌺 **Day 10 — Vijayadashami (Oct 10)**
   Victory day. Vidyarambha for children, weapon worship. Standard ₹2,500 → ₹2,125

**For NRI families:** All 9 days live-streamed from major Devi temples (Vaishno Devi, Kalighat, Kamakhya, Meenakshi). Time zones handled per geo.

[Book Navratri bundle: bhaktisetu.com/festival/navratri]

🙏
```

## T-14 days (Sept 17, 2026) — Mid-campaign + Devi temple choices

**Subject:** "Choose your Navratri temple — Vaishno Devi, Kamakhya, Kalighat, Meenakshi"

```
Namaste {{first name}},

14 days to Navratri. Time to choose your Devi temple.

**Recommended Devi temples per tradition:**

🏔️ **Vaishno Devi (Jammu)** — North India + Punjabi tradition
   Pilgrimage-form Devi worship. Top NRI choice. Trikuta Mata.

🌊 **Kalighat (Kolkata)** — Bengali Shakta tradition
   Maa Kali in fierce form. Tantric tradition. Strong Bengali diaspora.

🔥 **Kamakhya (Guwahati)** — Tantric tradition (Assam)
   Foremost Shakti Peeth — yoni-shrine. Ambubachi connection.

✨ **Meenakshi Amman (Madurai)** — Tamil Shakta tradition
   Tamil Shakta worship. Strong Tamil NRI diaspora pilgrimage.

🌸 **Mahalakshmi Mumbai** — Western India + Marathi
   Triple-Devi form. Friday + Navratri peak.

**For mixed-tradition families:** Bundle 3-day rotation across 3 temples — same price.

**Already booked?**
- Pandit confirmation arrives 7 days before puja day
- Live darshan link sent T-2 hours
- Video proof within 24hr each day

[Choose your temple: bhaktisetu.com/festival/navratri]

🙏
Team Bhaktisetu
```

## T-7 days (Sept 24, 2026) — Last call

**Subject:** "Final week — Navratri 9-day bundle 10% off ends in 7 days"

```
Namaste {{first name}},

7 days from Sharad Navratri. Last call for 10% off.

**Quick check:**

🌺 Have you booked the 9-day bundle? Save ₹2,250 vs daily-booking.
🌺 Have you chosen your temple? Vaishno Devi (most-booked) / Kamakhya / Kalighat / Meenakshi
🌺 Have you confirmed your timezone for NRI live-stream? IST 06:00 = Bay Area 18:30 prev day / London 02:00 / Toronto 21:30 prev day

**Mahagauri Maha Ashtami (Oct 8) specifically:**
- Kanya pujan tradition: 9 young girls fed + worshipped
- Bhaktisetu arranges kanya pujan at temple (₹3,500 bundle includes feeding 9 girls)
- Strong NRI booking pattern: NRI grandparents fund kanya pujan for India temple

**Last available slots:**
- 9-day bundle: 30% sold, 70% remaining
- Maha Ashtami individual: 60% sold (only 40% slots left)
- Maha Navami individual: 40% sold

[Book final discount: bhaktisetu.com/festival/navratri]

🙏
Sunil
```

## Daily during Navratri (Oct 1-9) — Devi-of-day reminder

Per day, light reminder + booking nudge for missed days:

```
Subject: "Day 5 of Navratri — Skandamata (today's Devi)"

Namaste {{first name}},

Today is the 5th day of Sharad Navratri.

**Today's Devi:** Skandamata — mother of Lord Kartikeya. Worshipped for child welfare, family prosperity, mountain-like protection.

**Today's puja:** Skandamata Aarti + Mantra + 5-flower offering
**Best temple to book today:** {Local temple selection}
**Daily live darshan:** {Temple} 06:30 IST live link

If you haven't booked any Navratri puja yet:
- Today's individual ₹1,800 OR remaining 4 days bundle ₹6,000
- [Book: bhaktisetu.com/festival/navratri]

If already booked the 9-day bundle:
- Today's pandit confirmed for {{location}} 
- Live link 2 hr before scheduled
- Video proof later today

🙏
Daily Navratri reminders from Bhaktisetu
```

## Implementation per R-Q4-E-011 festival pre-sale

```typescript
// apps/api/src/jobs/navratri-2026-sequence.ts
export const NAVRATRI_2026_SEQUENCE = {
  navratriStart: '2026-10-01',
  vijayadashami: '2026-10-10',
  preEmails: [
    { offsetDays: -30, template: 'navratri_t_minus_30' },
    { offsetDays: -14, template: 'navratri_t_minus_14' },
    { offsetDays: -7, template: 'navratri_t_minus_7' },
  ],
  dailyEmails: [
    { dayOfFestival: 1, template: 'navratri_day1_shailaputri' },
    { dayOfFestival: 2, template: 'navratri_day2_brahmacharini' },
    // ... 9 days
  ]
}
```

## Q3 metrics

- Target: 1500+ Navratri bookings
- Target: ₹30L GMV
- Target: 60% bundle (9-day) vs 40% individual day
- Target: 25% NRI mix
- Target: 4.6+ avg rating
