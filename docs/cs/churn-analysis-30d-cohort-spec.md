# Churn Analysis — 30d Cohort Retention Dashboard

> **Roadmap item**: R-Q2-CS-002 (P1) · **Authored**: 2026-06-13

## Goal

Q2 ship 30d cohort retention dashboard surfacing top 3 churn reasons. Targets retention 30d >40% as benchmark.

## Cohort definition

- Weekly cohorts (Mon-Sun signup window)
- Retained if user has ANY booking OR pageview OR app open in week N post-signup

## Dashboard panels

`/admin/cohort-retention`:

### Panel 1: Cohort triangle table
```
Cohort  | W0   | W1   | W2   | W3   | W4
2026-W22| 100% | 65%  | 48%  | 41%  | 38%
2026-W23| 100% | 70%  | 52%  | -    | -
2026-W24| 100% | 68%  | -    | -    | -
```

### Panel 2: Top 3 churn reasons (LLM-classified)
- Pulls last 50 churned-user feedback strings
- Claude API classifies into: "puja-not-as-expected", "payment-friction", "price-too-high", "no-NRI-support", "tech-glitch", etc.
- Surfaces top 3 themes

### Panel 3: Reactivation campaign trigger
- For churned cohort: auto-email "We're back" 60 days post-last-active
- Tracks reactivation %

## Engineering tickets

- R-Q2-CS-002a: Cohort retention SQL query (BigQuery / Supabase) materialized view
- R-Q2-CS-002b: Cohort triangle UI panel
- R-Q2-CS-002c: LLM churn classifier
- R-Q2-CS-002d: Reactivation cron + email template

## Closes

R-Q2-CS-002 — spec shipped.
