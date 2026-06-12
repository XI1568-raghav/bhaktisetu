---
id: R-Q1-S-005
title: "Onboard 10 verified temples Bengaluru"
category: supply
owner_role: sales
quarter: Q1
month_target: 2
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "verified_temples_count_bengaluru"
  current: 0
  target: 10
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 50000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 20
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-12: Research + outreach kit shipped. docs/sales/bengaluru-temple-prospects-2026-06.md w/ 30 BLR prospects:
    - Tier A: 10 ancient/historic (Bull Temple, Gavi Gangadhareshwara, Banashankari Devi, Begur Ranganatha, Kote Venkataramana, Bhoga Nandeeshwara, etc — Foundation/heritage angle)
    - Tier B: 10 modern/institutional (ISKCON BLR w/ Bureau-dispute caveat, Art of Living, Chinmaya, Belur Math, Sringeri/Ahobila/Pejawar mutt chapters)
    - Tier C: 10 neighborhood (HSR/Marathahalli/Koramangala/Indiranagar/JP Nagar — fastest decision cycle)
  Tier-specific outreach: email (Tier A+B) + WA (Tier C). 180-word email template + Hindi WA template. Cluster by sampradaya (Smarta/Vaishnava/Madhva/Tamil Saiva/Gaudiya).
  ZERO sends from agent. Every [VERIFY-FOUNDER] marker requires founder validation via official temple site + Karnataka Endowment Dept registry.
  RISK: Bangalore-ISKCON 25-year Bureau dispute — treat as SEPARATE pilot from central ISKCON. Karnataka Endowment Dept temples may need additional state clearance.
  Y1 conservative math: 10 onboarded × 3 bookings/mo × ₹501 × 20-40% platform share = ₹30K-60K MRR.
  FOUNDER ACTION: ≤6h spread over 14 days for verification + personalisation + 3/day × 10-day send + reply triage.
  Closes (partial): Q-C-20260612T1153-R-Q1-S-005. Status stays in_progress until 10+ onboarded.

tags: ["supply","temple","bengaluru","p1"]
created_at: 2026-06-09T21:47:01.131Z
updated_at: 2026-06-12T08:30:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
