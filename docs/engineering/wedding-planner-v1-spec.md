# Wedding Planner v1 End-to-End — Muhurat + Pandit + Venue

> **Roadmap item**: R-Q4-E-010 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q2-P-002 wedding muhurat tool

## Goal

Q4 ship wedding planner v1 end-to-end. Muhurat + pandit booking + venue (partner network) integration. Targets 20+ weddings booked Q4.

## Flow

1. /wedding-planner → bride + groom info (kundli match per R-Q2-P-002)
2. Suggested muhurat dates (3-5 options w/ rationale)
3. Per date: available pandits (matched to family tradition + city) + budget tiers
4. Venue: partner banquet hall / temple wedding venue (10-20 partner venues per city)
5. Bundle: pandit + venue + samagri + photographer + cater (per R-Q4-S-009 vendor network)
6. Razorpay checkout (₹50K-₹5L total)
7. Founder/coordinator manages logistics

## Pricing tiers

| Tier | ₹ | Inclusion |
|---|---|---|
| Basic | 50K | Pandit + venue + basic samagri |
| Standard | 1.5L | Above + photography (4hr) + 50-pax cater |
| Premium | 3.5L | Above + videography + decor + 200-pax cater + AC venue |

## Engineering tickets

- R-Q4-E-010a: Wedding flow UX (extends R-Q2-P-002)
- R-Q4-E-010b: Vendor partner integration (R-Q4-S-009)
- R-Q4-E-010c: Bundling + pricing engine
- R-Q4-E-010d: Coordinator dashboard

## Q4 success

- 20+ weddings booked
- ₹50L Q4 wedding GMV
- 4.5+ rating

## Closes

R-Q4-E-010 — spec shipped.
