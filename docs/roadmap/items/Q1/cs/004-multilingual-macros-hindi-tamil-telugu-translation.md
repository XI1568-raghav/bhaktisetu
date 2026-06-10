---
id: R-Q1-CS-004
title: "Multilingual macros — Hindi + Tamil + Telugu translations of top 5"
category: cs
owner_role: cs
quarter: Q1
month_target: 3
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "multilingual_macros_shipped"
  current: 0
  target: 5
  unit: "count"
  source: "manual"
  query: "manual-kpi-count-translated-support-macros-shipped-to-apps-web-lib-i18n-cs-macros-json-with-hi-ta-te-keys-on-top-5-issue-types"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "Top 5 support issue types identified from ticket volume past 30 days"
  - "All 5 macros translated en + hi + ta + te (15 strings total) in apps/web/lib/i18n/cs-macros.json"
  - "Language detection from user phone locale on inbound support ticket"

agent_brief:
  context_files:
    - apps/web/lib/i18n/en.json
    - docs/company/07-cs.md
    - apps/api/src/routes/support.ts
  prompt_skeleton: |
    Pull top 5 ticket types from past 30 days. Likely refund + booking-stuck + video-not-arrived + payment-failed + how-to-book.
    Draft canonical English macro for each. Translate to hi + ta + te.
    Write to apps/web/lib/i18n/cs-macros.json keyed by issue-type + lang.
    Wire support agent UI to pick macro by detected user lang.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["cs","i18n","p2"]
created_at: 2026-06-09T21:50:37.964Z
updated_at: 2026-06-09T21:50:37.964Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
