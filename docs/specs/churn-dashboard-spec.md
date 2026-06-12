# Churn Analysis — 30d Cohort Retention Dashboard + Top 5 Churn Reasons

> **Roadmap item**: R-Q2-CS-002 (P1) · **Authored**: 2026-06-13

## Goal

Visualize Day-30 cohort retention. Aggregate top 5 churn reasons from NPS + cancellation surveys.

## Dashboard at `/admin/cs/churn`

### Section 1: Cohort retention chart

- X-axis: weeks since signup
- Y-axis: % retention
- Color per acquisition-month cohort (M1 / M2 / M3 / ...)
- Day-30 / Day-60 / Day-90 / Day-180 reference lines

### Section 2: Churn rate over time

- Monthly churn % trend
- Compare against target (<10% monthly churn for India consumer = healthy)

### Section 3: Top 5 churn reasons (this 30d)

LLM-aggregated from:
- NPS detractor reason_text (per R-Q2-CS-001)
- Cancellation form free-text
- Support ticket "I'm leaving because..." patterns
- Refund request reasons

Examples:
1. "Pandit was late / no-show" (X% of cancellations)
2. "Video proof took too long" (X%)
3. "Found cheaper elsewhere" (X%)
4. "Don't trust online pujas" (X%)
5. "Family already has temple connection" (X%)

### Section 4: At-risk users

- Users w/ <30% engagement last 30d
- Users w/ cancelled subscription
- Users w/ NPS detractor score
- Auto-trigger CS outreach: founder reviews list weekly

## Engineering tickets

- R-Q2-CS-002a: cohort SQL + caching
- R-Q2-CS-002b: dashboard UI
- R-Q2-CS-002c: LLM aggregation of churn reasons (weekly cron)
- R-Q2-CS-002d: at-risk list export → CS team

## Closes

R-Q2-CS-002 — spec shipped.
