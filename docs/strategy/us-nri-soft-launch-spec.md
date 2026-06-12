# US NRI Soft Launch — Landing + Stripe USD + First 100 Signups

> **Roadmap item**: R-Q2-G-006 (P0) · **Authored**: 2026-06-13

## Goal

Q2 soft launch US NRI segment. Stripe USD live + dedicated /nri/usa landing + 100 first signups. Targets $5K monthly NRI MRR by Q2-end.

## Stripe USD activation

### Pre-req (U2 unblock)
- Stripe NRI account KYC: business docs submitted Q1
- Test transactions cleared
- Webhook configured (per R-Q2-E-010 reliability spec)

### Q2 launch
- Real USD charges (not test mode)
- Pricing: 9-10× INR (e.g., Rudrabhishek ₹2K India = $20 NRI)
- Tax: 0% (US has no GST equivalent on services)
- Refund: instant via Stripe within 7 days

## /nri/usa landing page

### Hero
"Daily puja at India temples — booked from USA"

### 3 trust signals
- Verified pandits w/ Aadhaar
- Video proof within 24hr
- 80G receipt (for India tax-deductible donations)

### Pricing
USD pricing table for top 5 NRI pujas (Satyanarayan / Lakshmi / Ganesh / Shraddha / Dhanteras)

### Testimonial section
- 3 NRI customer quotes (anonymized if not consented)
- City+state attribution (e.g., "Priya M., New Jersey")

### CTA
"Book your first puja — pay $X.XX USD"

## Acquisition channel

- Google Ads (per R-Q2-M-006 spec): $100/mo US
- Reddit /r/IndianAmerican + /r/NRI subreddit posts (1-2/mo, organic)
- Facebook NRI groups (50+ groups identified): weekly post sharing
- LinkedIn outreach to NRI Indian professionals (founder personal)

## Success metric

- 100+ signups Q2 (vs 0 baseline)
- 30+ first paid puja
- $5K monthly MRR
- 25% Day-30 retention

## Engineering tickets

- R-Q2-G-006a: /nri/usa landing
- R-Q2-G-006b: Stripe USD live mode
- R-Q2-G-006c: USD pricing table component
- R-Q2-G-006d: NRI funnel events

## Closes

R-Q2-G-006 — spec shipped.
