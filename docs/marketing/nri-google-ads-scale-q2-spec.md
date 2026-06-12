# NRI Google Ads Scale — $200/mo Across US + UK + CA + AU

> **Roadmap item**: R-Q2-M-006 (P1) · **Authored**: 2026-06-13

## Goal

Q2 scale NRI Google Ads from R-Q1-M-006 baseline ($50/mo US-only) to $200/mo across US + UK + CA + AU. Target CAC <$20 + 100 NRI signups/mo.

## Budget split

| Geo | Monthly | Daily | Languages | Currency |
|---|---|---|---|---|
| US | $100 | ~$3.30 | English | USD |
| UK | $40 | ~$1.30 | English | GBP→USD |
| CA | $30 | ~$1 | English | CAD→USD |
| AU | $30 | ~$1 | English | AUD→USD |
| **Total** | **$200** | ~$6.60 | — | $200 USD |

## Campaign structure

### Campaign 1: Search — "remote puja from {geo}"
- Keywords: "remote puja India", "online puja USA", "NRI puja booking", "hindu puja online" + geo-permutations
- Budget: 60% of geo ($120 total)
- Landing: /nri/{geo} (per-geo variant page)

### Campaign 2: Search — "online shraddha"
- Keywords: "online shraddha", "pitru paksha remote", "gaya shraddha from USA"
- Budget: 30% ($60)
- Landing: /shraddha hub

### Campaign 3: Display retargeting
- Visitors who landed /nri but didn't book
- Budget: 10% ($20)
- Creative: "Your father's shraddha — pandit-verified video proof. Book in 5 min."

## NRI landing variants (4 new pages)

- /nri/usa — USD pricing, US tax-deduct context (no 80G in US)
- /nri/uk — GBP, gift-aid not applicable
- /nri/ca — CAD, donation receipt context
- /nri/au — AUD

Each: 4 geo-specific testimonials, geo timezone for live-darshan slots, contact via WhatsApp +1 / +44 / +1 / +61 sandbox.

## Tracking

- UTM: utm_source=google&utm_medium=cpc&utm_campaign={campaign}&utm_term={keyword}
- Conversion: signup OR first puja booking
- CAC target: <$20 blended
- LTV target: >$200 (10× CAC)

## Engineering tickets

- R-Q2-M-006a: 4 geo landing variants
- R-Q2-M-006b: PostHog NRI funnel events
- R-Q2-M-006c: Google Ads conversion tracking pixel

## Closes

R-Q2-M-006 — spec shipped.
