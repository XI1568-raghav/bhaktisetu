# Recurring Donations Engine — Razorpay Subscriptions + Monthly Puja

> **Roadmap item**: R-Q3-E-008 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q1-E-017 subscription schema

## Goal

Q3 ship recurring monthly donation product. Devotees subscribe ₹501/₹1001/₹2501 per month → auto-puja on specified date.

## Product

| Tier | Inr/mo | Inclusion |
|---|---|---|
| Basic | ₹501 | 1 standard puja/mo + 80G + WA reminder |
| Premium | ₹1001 | 2 pujas + video proof + pandit Q&A 1×/mo |
| Devotee | ₹2501 | 4 pujas + dedicated pandit + monthly impact PDF |

## User flow

1. /donate-monthly browse tiers
2. Pick tier + assignment (deity choice OR auto-rotation OR personal request)
3. Razorpay subscription checkout
4. Monthly auto-charge → triggers puja booking creation
5. Pandit performs puja → video proof → 80G email
6. Cancel anytime, pro-rata refund

## Engineering tickets

- R-Q3-E-008a: Extend Subscription model w/ donation tier
- R-Q3-E-008b: Razorpay subscription per-tier integration
- R-Q3-E-008c: Monthly auto-puja-booking cron
- R-Q3-E-008d: /donate-monthly landing + tier selector
- R-Q3-E-008e: Admin recurring donor dashboard

## Q3 success

- 100+ monthly subscribers Q3-end
- ₹1L recurring MRR (10× LTV vs one-time)
- 80%+ Month-3 retention

## Closes

R-Q3-E-008 — spec shipped.
