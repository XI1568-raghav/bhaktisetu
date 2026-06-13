# Spend Dashboard v2 — Burn Forecast + Runway Alerts + Monthly Investor Report

> **Roadmap item**: R-Q3-F-004 (P2) · **Authored**: 2026-06-13

## Goal

Q3 ship spend dashboard v2 w/ burn forecast + runway alerts. Founder operational + monthly investor email.

## /admin/spend dashboard

- Current month burn vs budget
- 12-month projection
- Per-category breakdown (hosting / hire / ads / tools / legal / misc)
- Runway months @ current burn
- Alerts: <6mo runway = warn, <3mo = critical

## Monthly investor email

Cron 1st of month → email all SAFE-signed angels:
- Last-month KPI (MAU / MRR / paid bookings / pandit count)
- Last-month burn vs forecast
- Highlights + lowlights (3 bullet each)
- Next-month focus areas
- Ask-from-angels (intros / advice)

## Engineering tickets

- R-Q3-F-004a: Spend tracking Prisma model
- R-Q3-F-004b: /admin/spend dashboard
- R-Q3-F-004c: Forecast logic
- R-Q3-F-004d: Investor email cron + template

## Q3 success

- 100% spend tracked
- Founder sees runway in real-time
- 4/4 monthly investor emails Q3 sent on time

## Closes

R-Q3-F-004 — spec shipped.
