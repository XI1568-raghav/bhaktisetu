---
id: R-Q4-SA-001
title: "Anchor temple chain master agreement signed — 50+ temple commit + revenue share"
category: sales
owner_role: sales
quarter: Q4
month_target: 10
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: 'U6'
depends_on: ["R-Q3-SA-001","R-Q4-S-006"]
blocks: ["R-Q4-S-003"]

kpi:
  metric: "anchor_chain_temples_committed"
  current: 0
  target: 50
  unit: "count"
  source: "manual"
  query: "manual-kpi-count-temples-listed-in-signed-master-agreement-with-anchor-chain"

revenue_impact:
  amount_inr: 2500000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Master agreement signed with anchor chain (ISKCON or similar) by Oct 31 2026"
  - "Agreement schedule lists >= 50 temples with revenue-share % per temple"
  - "Schema migration adds chain_id FK on Temple table + 5 anchor temples seeded"

agent_brief:
  context_files:
    - docs/company/04-sales.md
    - prisma/schema.prisma
    - apps/api/src/routes/admin-leads.ts
  prompt_skeleton: |
    Cannot agent-assign — founder action U6 (legal MSA signing + anchor relationship) required.
    Sub-agent can: draft 20-page MSA template (revenue share + IP + SLA + termination) + temple-list
    schedule annex + extend prisma Temple schema with chain_id FK. Founder owns negotiation + signing
    + temple-by-temple introduction calls via anchor chain's regional heads.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["b2b","anchor","contract","chain"]
created_at: 2026-06-09T22:09:26.259Z
updated_at: 2026-06-09T22:09:26.259Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
