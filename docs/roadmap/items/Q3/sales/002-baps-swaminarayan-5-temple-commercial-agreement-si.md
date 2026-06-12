---
id: R-Q3-SA-002
title: "BAPS Swaminarayan 5-temple commercial agreement signed"
category: sales
owner_role: sales
quarter: Q3
month_target: 8
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q3-S-010"]
blocks: []

kpi:
  metric: "baps_agreement_signed"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "docs/roadmap/_manual-kpis.yml key=baps_agreement_signed (founder updates after BAPS Akshardham central signs commercial agreement covering 5+ federated temples + 20-40% platform split per CTO rule; target 1)"

revenue_impact:
  amount_inr: 400000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "BAPS Akshardham commercial MSA countersigned covering 5 BAPS temples (Delhi + Gandhinagar + Toronto + London-Neasden + Houston)"
  - "Revenue split 20-40% platform commission per CTO platform-commission rule (PROJECT_CONTEXT business rule #3)"
  - "Each BAPS temple live with min 3 puja SKUs + Pandit roster (depends on R-Q3-S-010 central pipeline)"
  - "First 30 days post-go-live ≥ ₹2L GMV across 5 BAPS temples (validates commercial terms)"

agent_brief:
  context_files:
    - scripts/agents/cold-temple-outreach.mjs
    - apps/api/src/routes/admin-leads.ts
    - apps/api/src/routes/temple-portal.ts
    - docs/company/05-sales.md
    - docs/ceo-roadmap-2026-05-27.md
  prompt_skeleton: |
    Sales sub-agent. P0 BAPS Swaminarayan 5-temple commercial agreement — biggest Q3 anchor enterprise win.
    Pre-req R-Q3-S-010 BAPS central pipeline must surface temple-by-temple commitment letters first (track via admin-leads source='baps_central_pipeline').
    Draft commercial MSA template w/ 20-40% commission split per business rule #3 + 80G receipt clause + video-proof SLA (per business rule #1).
    Reference R-Q2-SA-001 ISKCON groundwork (5-temple anchor LOI prior quarter) — re-use LOI/MSA structure proven there.
    Sales drafts redlines + founder owns countersign meeting w/ BAPS Akshardham central admin (Sadhu Brahmaviharidas or designate).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","baps","agreement"]
created_at: 2026-06-09T22:02:55.221Z
updated_at: 2026-06-09T22:02:55.221Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
