# Sentry SLO Tuning — Alert Thresholds + Ignore Noisy Patterns

> **Roadmap item**: R-Q3-IT-001 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q2-IT-001 + R-Q3-E-013

## Goal

Q3 fine-tune Sentry alert thresholds + ignore noisy patterns. Reduce alert fatigue (currently ~5 alerts/day to 1/day signal).

## Noisy patterns to ignore

| Pattern | Reason |
|---|---|
| `NetworkError when attempting to fetch resource` | User network drop |
| `Failed to fetch` | Same |
| `ChunkLoadError` | CF Pages chunk lazy-load (transient) |
| `ResizeObserver loop limit` | Benign DOM internal |
| `Non-Error promise rejection captured` | Unhandled but benign |
| `AbortError` | User-initiated nav abort |
| `Loading chunk N failed` | Same as ChunkLoadError |

Add to `beforeSend` filter per R-Q2-IT-001 base.

## Alert tier rules

| Alert level | Threshold | Action |
|---|---|---|
| Info | New issue type seen | Daily digest email |
| Warning | Same error >50/hour | Email founder |
| Critical | Error rate >1% session | SMS + page |
| Emergency | API 5xx >50% 10min | SMS + autopage all |

## Founder review SOP

- Daily: 5-min Sentry dashboard scan (morning)
- Weekly: 30-min new-issue triage Monday
- Quarterly: alert rule review

## Engineering tickets

- R-Q3-IT-001a: beforeSend filter update
- R-Q3-IT-001b: 4-tier alert rules
- R-Q3-IT-001c: Daily digest email
- R-Q3-IT-001d: Founder Sentry review cadence

## Closes

R-Q3-IT-001 — spec shipped.
