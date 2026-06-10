---
id: R-Q1-SA-004
title: "Reach Hindu American Foundation + Sewa International (diaspora orgs)"
category: sales
owner_role: sales
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "diaspora_orgs_engaged"
  current: 0
  target: 2
  unit: "count"
  source: "manual"
  query: "manual-kpi-count-diaspora-orgs-engaged-from-set-HAF-sewa-international-with-intro-call-completed-and-logged-in-docs-agent-reports-diaspora-outreach-md"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "2 diaspora org intro calls completed (HAF + Sewa International) by Feb 28"
  - "Partnership angle pitched: gift-puja referral commission + 80G receipts for US donors"
  - "Outreach logged in docs/agent-reports/diaspora-outreach.md"

agent_brief:
  context_files:
    - apps/web/app/nri/page.tsx
    - apps/web/app/gift/page.tsx
    - docs/company/04-sales.md
  prompt_skeleton: |
    Cannot agent-assign — founder action for relationship calls.
    Sub-agent prepares outreach pack: 1-pager on darshya NRI value prop.
    Drafts 2 cold emails to HAF + Sewa International program directors.
    Pitch: referral commission for diaspora members using gift-puja + 80G compliance.
    Founder sends + does follow-up calls. Sub-agent logs to docs/agent-reports/diaspora-outreach.md.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["nri","diaspora","outreach","p2"]
created_at: 2026-06-09T21:47:15.182Z
updated_at: 2026-06-09T21:47:15.182Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
