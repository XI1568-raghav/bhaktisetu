# Unit Economics Refresh — CAC + LTV + Payback per Channel (NRI/Domestic)

> **Roadmap item**: R-Q2-F-002 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q3-F-002 unit econ M9 audit template

## Goal

Q2-end (Aug 2026) snapshot of unit econ per acquisition channel. Used to allocate Q4 paid-spend budget intelligently.

## Per-channel breakdown

| Channel | CAC (India) | CAC (NRI) | LTV (India) | LTV (NRI) | Payback months |
|---|---|---|---|---|---|
| Organic SEO | ₹0 | ₹0 (USD) | ₹500 | $50 | 0 |
| Twitter build-in-public | ₹0 | ₹0 | ₹400 | $40 | 0 |
| Reddit r/india + r/bangalore | ₹0 | minimal | ₹350 | $30 | 0 |
| WhatsApp warm-network | ₹50 (founder time) | minimal | ₹600 | $60 | 1 |
| Referral program (R-Q2-M-011) | ₹100 (wallet credit) | $10 | ₹500 | $50 | 2 |
| Instagram | ₹0 | minimal | ₹400 | $40 | 0 |
| Telegram | ₹0 | minimal | ₹300 | $30 | 0 |

Above = Q2 estimates; refresh w/ real PostHog cohort data.

## Calculations

Per channel:
- CAC = (founder hours × ₹500/hr OR paid spend) / customers acquired this channel
- LTV = avg revenue per acquired customer over 12 months × gross margin
- Payback = CAC / monthly contribution per customer

## Refresh cadence

Quarterly. Aug 31 (Q2-end), Nov 30 (Q3-end), Feb 28 (Q4-end).

## Founder action

- [ ] Cross-ref docs/finance/unit-economics-m9-audit-template.md
- [ ] Pull PostHog data per channel attribution
- [ ] Update this doc + pitch deck Slide 8

## Closes

R-Q2-F-002 — spec shipped.
