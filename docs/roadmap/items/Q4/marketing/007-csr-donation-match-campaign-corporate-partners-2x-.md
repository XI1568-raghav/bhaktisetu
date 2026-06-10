---
id: R-Q4-M-007
title: "CSR donation match campaign — corporate partners 2x match for adopt-a-temple"
category: marketing
owner_role: cmo
quarter: Q4
month_target: 12
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-E-012"]

kpi:
  metric: "csr_match_partners"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "manual:docs/marketing/csr-match-campaign.md#10-target-accounts (track MoU-signed count; csr_match_partners DB table to follow when 1st account signs)"

revenue_impact:
  amount_inr: 400000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 32
est_cost_inr: 0

success_criteria:
  - "docs/marketing/csr-match-campaign.md shipped w/ pitch outline + ICP + 10 named target accounts"
  - "apps/web/app/csr-match/page.tsx renders, 5/5 RTL tests green"
  - "docs/marketing/csr-match-email-sequence.md — 5 touches over 21 days"
  - "docs/marketing/csr-match-revenue-model.md — bear/base/bull scenarios w/ tagged assumptions"
  - "PR amplification angle cited from docs/agent-reports/2026-06-08-pr-outreach.md"
  - "FOUNDER-BLOCKER: warm-intro annotation on 10 accounts before outbound fires"
  - "FOUNDER-BLOCKER: 80G + CSR-1 compliance attestation before landing-page publish"
  - "FOUNDER-BLOCKER: revenue model assumptions reviewed before sales convo"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-11: 5 artifacts shipped per queue prompt R-Q4-M-007 (Q-R-Q4-M-007-20260610T1623):
    - docs/marketing/csr-match-campaign.md (pitch deck 10 slides + ICP + 10 verified target accounts + PR cross-ref)
    - apps/web/app/csr-match/page.tsx + apps/web/__tests__/csr-match.test.tsx (5/5 green w/ happy-dom env)
    - docs/marketing/csr-match-email-sequence.md (5-touch cold sequence over 21d)
    - docs/marketing/csr-match-revenue-model.md (bear/base/bull, sensitivity, 6 tagged assumptions)
  Green: 5/8 success criteria. Blocked-on-founder: 3 (warm intros, 80G+CSR-1 attestation, revenue assumptions review).
  Tests: pnpm --filter @poojly/web exec vitest run __tests__/csr-match.test.tsx → 5/5 passed.
  Hard rules honored: zero email fabrication ([VERIFY] markers on all), no deploy (dev-server only), tests RED → GREEN sequence committed.

tags: ["csr","donation","match","corporate"]
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
