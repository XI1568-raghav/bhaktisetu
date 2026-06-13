# Gurukul Recurring Tuition Product — Monthly Subscription

> **Roadmap item**: R-Q3-P-004 (P1) · **Authored**: 2026-06-13

## Goal

Q3 ship Gurukul recurring tuition product. Monthly subscription ₹999/mo for student → guru live Sanskrit lessons (4×/mo).

## Product

| Tier | ₹/mo | Inclusion |
|---|---|---|
| Basic | ₹999 | 4 live lessons/mo + WhatsApp Q&A access |
| Intermediate | ₹1999 | 8 lessons + 1-on-1 30min/wk |
| Advanced | ₹3999 | 12 lessons + dedicated guru + curriculum customization |

## Flow

1. /gurukul browse — gurus + their offerings
2. Pick guru + tier
3. Razorpay subscription checkout
4. Auto-schedule 4 lessons month-1 (calendar invites)
5. Lessons via Jitsi room (per existing R-Q1-E lessons schema)
6. Cancel anytime, pro-rata refund

## Per-guru offering

- Sanskrit alphabet + sandhi
- Bhagavad Gita verse-by-verse
- Upanishad commentary
- Vedic mantra pronunciation
- Astrology basics (per existing /astrology lib)

## Engineering tickets

- R-Q3-P-004a: Subscription tier per guru
- R-Q3-P-004b: Calendar scheduling logic
- R-Q3-P-004c: Jitsi room per lesson
- R-Q3-P-004d: Guru dashboard (revenue + student progress)

## Q3 success

- 20 gurus listed
- 50 active student subscribers
- ₹1L gurukul MRR

## Closes

R-Q3-P-004 — spec shipped.
