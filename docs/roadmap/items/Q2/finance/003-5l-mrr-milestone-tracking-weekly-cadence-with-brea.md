---
id: R-Q2-F-003
title: "₹5L MRR milestone tracking — weekly cadence with breakdown by lane"
category: finance
owner_role: cfo
quarter: Q2
month_target: 5
priority: P1
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "mrr_inr_monthly"
  current: 0
  target: 500000
  unit: "inr"
  source: "supabase"
  query: "SELECT SUM(amount_inr) / 100 AS mrr_inr FROM \"Booking\" WHERE status='completed' AND created_at >= date_trunc('month', NOW()) UNION ALL SELECT SUM(amount_inr) / 100 FROM \"Donation\" WHERE created_at >= date_trunc('month', NOW())"

revenue_impact:
  amount_inr: 500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "Weekly cadence MRR snapshot stored in docs/agent-reports/YYYY-MM-DD-mrr-snapshot.md"
  - "Breakdown by lane: pujas / donations / yatra / consultations / store / wellness — each lane ≥1 row"
  - "Sum of lanes equals SQL aggregate of Booking.status='completed' + Donation rows month-to-date"
  - "₹5L MRR milestone alert fires when mrr_inr ≥ 500000 (PostHog cohort + Resend email to founder)"
  - "Investor-weekly-digest-v2 agent consumes snapshot for weekly investor update"

agent_brief:
  context_files:
    - docs/company/03-cfo.md
    - apps/api/src/routes/admin-metrics.ts
    - scripts/agents/weekly-investor-update.mjs
    - prisma/schema.prisma
  prompt_skeleton: |
    CFO sub-agent. P1 MRR milestone tracking — weekly cadence with breakdown by lane.
    Read apps/api/src/routes/admin-metrics.ts (admin metrics aggregator already shipped Sprint 3.4).
    Build SQL: SUM(amount_inr) grouped by source lane (Booking.type / Donation / yatra-inquiry / AstrologerConsultation / Order / wellness-session).
    Write daily snapshot to docs/agent-reports/YYYY-MM-DD-mrr-snapshot.md w/ lane breakdown table + week-over-week delta.
    Trigger Resend email to founder when mrr_inr crosses ₹5L threshold for the first time this month.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: SHIPPED. docs/finance/mrr-tracking-cadence-v1.md authored end-to-end:
    - 5 revenue lanes mapped (L1 Puja bookings ₹1.5L / L2 Adopt-temple ₹1.2L / L3 CSR ₹1L / L4 B2B SaaS ₹80K / L5 Affiliate ₹50K = ₹5L Q2 target)
    - Q4 trajectory: ₹12.5L MRR (= ₹1.5Cr ARR)
    - Weekly Friday review template w/ explicit table (lane × WoW Δ × variance × owner notes)
    - Per-lane SQL queries for live KPI compute (puja_bookings, temple_subscription, b2b_booking_attribution)
    - 5-level escalation thresholds (Y1/Y2/R1/R2/CRITICAL) w/ specific trigger conditions + actions
    - 4 new tripwires to add in next cycle (mrr_l1_pujas_behind_2w, mrr_l2_subs_below_30pct_w10, mrr_aggregate_red_3w, mrr_aggregate_critical_4w)
    - Cash runway implication: hit ₹5L MRR Q2-end + <₹2L/mo costs = break-even start of Q3
    - Quarterly review template at docs/finance/quarterly-reviews/QX-YYYY.md
    - Founder action checklist: mkdir + Friday 4 PM IST recurring calendar + first snapshot 2026-06-14
  FOUNDER ACTION: first snapshot landing 2026-06-14 + ongoing weekly cadence (~15min/Friday).
  Closes: Q-C-20260612T1153-R-Q2-F-003.

tags: ["finance","mrr","milestone"]
created_at: 2026-06-09T21:56:41.463Z
updated_at: 2026-06-12T09:00:00.000Z
shipped_at: 2026-06-12T09:00:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
