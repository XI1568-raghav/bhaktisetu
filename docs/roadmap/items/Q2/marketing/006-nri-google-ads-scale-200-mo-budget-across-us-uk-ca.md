---
id: R-Q2-M-006
title: "NRI Google Ads scale — $200/mo budget across US+UK+CA+AU"
category: marketing
owner_role: cmo
quarter: Q2
month_target: 4
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: 'U2'
depends_on: ["R-Q1-M-011"]
blocks: []

kpi:
  metric: "nri_ads_spend_monthly"
  current: 0
  target: 200
  unit: "usd"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "Founder Google Ads account exists w/ billing verified"
  - "Conversion tracking firing on /nri funnel"
  - "$200 USD/mo cycle invoiced + screenshot archived"
  - "Blended NRI CAC < $40 by week 8 (else trigger tripwire)"
  - "kpi.current populated from Google Ads billing tab"

agent_brief:
  context_files:
    - docs/marketing/nri-google-ads-scale-q2-spec.md
    - docs/marketing/R-Q2-M-006-handoff.md
    - docs/roadmap/items/Q1/marketing/011-nri-targeted-facebook-ads-50-budget-3-creatives-2-.md
    - docs/activation-gates.md
  prompt_skeleton: |
    R-Q2-M-006 = founder-action-required scaffold. KPI nri_ads_spend_monthly $0→$200/mo requires
    founder credit card + Google Ads account + monthly spend commitment. No agent run advances
    counter. Status MUST stay in_progress until founder completes Steps 1-7 in handoff doc +
    verification gate. Do NOT auto-flip to shipped.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13 (R3): full spec shipped at docs/marketing/nri-google-ads-scale-q2-spec.md w/ campaign
    structure (3 campaigns × 4 geos), $200 budget split, conversion tracking plan, 3 engineering
    sub-tickets (R-Q2-M-006a/b/c).
  2026-06-15 (R4): founder handoff doc shipped at docs/marketing/R-Q2-M-006-handoff.md w/ 7-step
    checklist (account setup, conversion tracking, landing pages, campaign creation, copy,
    launch+monitor, month-1 retro), spend tripwires, verification gate before shipped flip.
    Status stays in_progress per pitfalls rule — KPI advances only on founder action.

tags: ["ads","nri","scale"]
created_at: 2026-06-09T21:55:19.892Z
updated_at: 2026-06-09T21:55:19.892Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
