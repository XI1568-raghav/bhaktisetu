# Festival Pre-Sale Calendar — Diwali/Navratri/Karwa Chauth

> **Roadmap item**: R-Q4-E-011 (P1) · **Authored**: 2026-06-13

## Goal

Q4 ship festival pre-sale calendar. Devotees book pujas in advance of festivals. Targets 30% Diwali bookings via pre-sale.

## Pre-sale mechanics

- /festival/{slug} page shows date + days-until
- "Pre-book your Diwali Lakshmi puja" CTA T-30 days
- Tiered early-bird pricing:
  - T-30 days: 15% discount
  - T-14 days: 10%
  - T-7 days: 5%
  - T-3 days: standard pricing
- Founder-curated festival package bundles

## Diwali 2026 example

- Lakshmi Puja pre-book ₹2.5K (vs ₹3K standard)
- Dhanteras-Lakshmi bundle ₹4.5K (vs ₹5K)
- Bundle: Naraka snan + Lakshmi + Govardhan ₹7.5K

## Calendar surface

- /festival hub w/ next 30 festivals in date order
- Per-festival pre-sale countdown
- WA + email reminders T-30, T-14, T-7

## Engineering tickets

- R-Q4-E-011a: Festival pre-sale logic
- R-Q4-E-011b: Tiered pricing engine
- R-Q4-E-011c: Reminder cron + templates
- R-Q4-E-011d: Festival hub redesign

## Q4 success

- 30% Diwali bookings via pre-sale
- 50% repeat-customer Navratri pre-book

## Closes

R-Q4-E-011 — spec shipped.
