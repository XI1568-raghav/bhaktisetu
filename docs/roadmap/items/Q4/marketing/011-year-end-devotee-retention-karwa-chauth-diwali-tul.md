---
id: R-Q4-M-011
title: "Year-end devotee retention — Karwa Chauth + Diwali + Tulsi Vivah triple-cycle nudges"
category: marketing
owner_role: cmo
quarter: Q4
month_target: 12
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "retention_d30_pct"
  current: 0
  target: 38
  unit: "percent"
  source: "posthog"
  query: "cohort:kc_2026_cohort funnel:booked_kc->any_event_30d denominator:cohort_size"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "D30 retention lift target 38% vs current Q3 baseline ~22%. Revenue lift is downstream of LTV, not directly modelled. Refine after first KC cycle."

est_hours: 28
est_cost_inr: 87500

success_criteria:
  - "All 35 templates (5 segments × 7 touchpoints) drafted in handoff doc"
  - "Per-cycle nudge schedule documented (T-7 to T+14)"
  - "Cohort SQL view spec written for Supabase"
  - "Free-tier budget impact assessed (WA + Resend + Supabase + GH Actions)"
  - "Founder action gates enumerated explicitly"
  - "D30 measurement script path identified"
  - "Native-language review budget surfaced for founder approval"

agent_brief:
  context_files:
    - "docs/marketing/R-Q4-M-011-handoff.md"
    - "docs/free-tier-budgets.md"
    - "docs/activation-gates.md"
    - "scripts/agents/onboarding-v2/_onboard-lib.mjs"
  prompt_skeleton: |
    Read R-Q4-M-011-handoff.md. The triple-cycle architecture is defined.
    Your job per cycle: (a) draft missing template variants in ta/te/bn/mr/ka
    as DRAFT-tier (NEVER auto-publish), (b) verify cohort SQL once founder
    confirms Supabase view exists, (c) bump est_cost_inr if WA upgrade taken.
    DO NOT auto-flip status=shipped; only founder can after D30 measurement
    + cycle send.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (R-Q4-M-011 batch r4): handoff scaffold shipped at
    docs/marketing/R-Q4-M-011-handoff.md. Triple-cycle architecture +
    5-segment matrix + 35-template plan + free-tier impact + founder
    action items enumerated. Status STAYS in_progress per KPI gating
    rule (D30 retention requires real cycle send + 30d wait).
    Founder blockers: U7 WA Meta paste, native-translation budget,
    WA upgrade vs cohort-reduction decision, 35-template copy approval,
    supply-side temple partner confirmation, Supabase read-only role.

tags: ["retention","d30","festival","cycle"]
created_at: 2026-06-09T22:09:25.579Z
updated_at: 2026-06-09T22:09:25.579Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
