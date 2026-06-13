# Document First-Contractor-Hire Trigger Metric — 50 Bookings/Day

> **Roadmap item**: R-Q1-H-001 (P2) · **Authored**: 2026-06-13

## Goal

Q1 document decision metric for first contractor hire. Trigger: 50+ bookings/day sustained 14 days → unblock R-Q2-HR-001 CS-ops contractor.

## Decision matrix

| Metric current | Action |
|---|---|
| <20 bookings/day | Founder solo, no hire |
| 20-50 bookings/day | Plan contractor JD, defer hire |
| 50+ bookings/day sustained 14d | **Trigger hire** R-Q2-HR-001 |
| 100+ bookings/day | Add 2nd hire (per R-Q3-H-002) |

## Reasoning

- <20: founder handles T1 within 4hr SLA solo (verified Q1)
- 20-50: founder T1 saturating, but doesn't justify hire cost yet
- 50+: T1 SLA breaks without dedicated person, hire ROI clear

## Dashboard

`/admin/metrics` exposes daily-booking + sustained-14d signal. Threshold flag visible to founder.

## Funding source

Pre-seed proceeds (per R-Q3-F-001) cover CS-ops contractor ₹50K/mo × 3-month runway = ₹1.5L Q1 reserve.

## Engineering tickets

- R-Q1-H-001a: Document decision matrix
- R-Q1-H-001b: Dashboard 14d-sustained signal
- R-Q1-H-001c: Hire trigger SOP

## Closes

R-Q1-H-001 — spec shipped.
