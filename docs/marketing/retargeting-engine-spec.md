# Retargeting Engine — Meta + Google + DV360 Lookalikes + 30d Window

> **Roadmap item**: R-Q4-M-006 (P0) · **Authored**: 2026-06-13

## Goal

Re-engage users who visited Bhaktisetu but didn't book. 30-day window. Lift conversion from ~3% to ~7-9%.

## Audience segments

| Segment | Definition | Best retargeting message |
|---|---|---|
| `cart_abandon` | Started booking flow, didn't complete payment | "Your puja is waiting — complete in 60 sec" |
| `viewed_temple` | Viewed temple page but didn't book | "Devotees love {temple_name} — book your sankalp" |
| `viewed_puja_type` | Viewed puja type but didn't browse temples | "{puja_type} pujas in your city — verified pandit" |
| `signed_up_no_book` | Signed up but no first booking | "Welcome offer — first booking ₹100 off" |
| `lapsed_30d` | Last booking >30d ago | "We've added new temples in {city}" |
| `lapsed_90d` | Last booking >90d ago | "Festival season — early access to slots" |

## Tracking implementation

- Meta Pixel embedded on all pages (already if instrumented)
- Google Ads remarketing pixel
- PostHog event tracking (existing) → audience export to Meta + Google

## Lookalike audiences (LAA)

Source: existing paying customers (top 20% by LTV).
- LAA 1%: highest-similarity audience (smallest reach, highest match)
- LAA 5%: broader (medium match)
- Compare CPMs + conversion rates

## Budget

| Channel | Q4 monthly |
|---|---|
| Meta retargeting | ₹50K |
| Google remarketing | ₹40K |
| DV360 (if budget allows) | ₹30K |
| Total monthly | ₹1.2L |

ROI thesis: 30-day window × 5-7% conversion lift × ₹500 avg booking = ~₹2L return on ₹1.2L spend.

## Privacy compliance

- GDPR: explicit cookie consent for retargeting pixels (EU users only)
- DPDP: same consent + opt-out toggle
- Founder action: deploy Klaro CMP (per L-001 multi-geo) before retargeting goes live

## Engineering tickets

- R-Q4-M-006a: Meta + Google pixel integration
- R-Q4-M-006b: PostHog → audience export pipeline
- R-Q4-M-006c: Klaro CMP integration
- R-Q4-M-006d: retargeting campaign mgmt dashboard

## Closes

R-Q4-M-006 — spec shipped.
