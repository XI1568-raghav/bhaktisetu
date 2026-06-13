# WhatsApp Daily Devotional Broadcast — 1000 Opt-In Users

> **Roadmap item**: R-Q2-M-008 (P2) · **Authored**: 2026-06-13 · **Depends on**: R-Q1-M-010 WA Cloud verified

## Goal

Q2 launch daily devotional WhatsApp broadcast. 1000+ opt-in users. Targets 40%+ open rate + daily-return signal.

## Content cadence

- 06:30 IST daily
- Format:
  - Sanskrit shloka of day (Devanagari + transliteration + meaning)
  - Today's panchang (tithi + nakshatra)
  - Today's deity (per 7-day rotation R-Q1-M-009)
  - Festival reminder (if T-7 days)
  - 1 booking CTA (relevant puja or today's deity)

## Opt-in flow

- /broadcast page w/ phone-input + opt-in toggle
- Existing devotee push: "Get daily devotional WA — opt-in"
- Booking confirmation flow: post-booking opt-in checkbox
- Existing 5K MAU pool → expect 20% opt-in = 1000 target

## Compliance

- WA Cloud API template_message for broadcasts (R-Q1-M-010)
- Opt-out link every message
- Daily quota stays within 1000 conversations free tier (R-Q1-M-010)

## Engineering tickets

- R-Q2-M-008a: /broadcast opt-in page
- R-Q2-M-008b: Daily content cron 06:30 IST
- R-Q2-M-008c: WA template approval (5 templates)
- R-Q2-M-008d: Open rate + opt-out tracking

## Q2 success

- 1000 opt-in users
- 40%+ open rate
- 5%+ click-through to booking CTA
- <2% opt-out rate

## Closes

R-Q2-M-008 — spec shipped.
