---
id: R-Q4-P-001
title: "Antim sanskar product spec — dignity-first UX + pandit dispatch flow + family co-ord"
category: product
owner_role: cpo
quarter: Q4
month_target: 10
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-001"]

kpi:
  metric: "antim_sanskar_csat"
  current: 0
  target: 90
  unit: "percent"
  source: "supabase"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 80000
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
  2026-06-11: spec shipped per R-Q4-P-001 prompt (Q-C-20260610T1623-R-Q4-P-001).
    Files:
      - docs/product/specs/antim-sanskar-v1.md (455 LOC, 13 H2 sections, 5 ASCII wireframes, 15+ checklist items)
      - scripts/lint-product-specs.mjs (TDD spec-lint w/ forbidden-word + structural checks)
      - package.json: pnpm lint:specs script added
    Verify: pnpm lint:specs → OK. wc -l → 455. grep ## → 13.
    Unblocks: R-Q4-E-001 engineering build.
    FOUNDER-BLOCKER (10 open questions, top 4):
      (1) pricing tier amounts ₹5100/11000/21000 confirm,
      (2) name senior pandit reviewer for grief-copy sign-off,
      (3) confirm 5% bad-debt tolerance,
      (4) cremation-ground partnership scope decision.

tags: ["product","antim-sanskar","dignity","ux"]
created_at: 2026-06-09T22:09:25.940Z
updated_at: 2026-06-11T03:50:00.000Z
shipped_at: 2026-06-11T03:50:00.000Z
verified_at: 2026-06-11T03:50:00.000Z
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
