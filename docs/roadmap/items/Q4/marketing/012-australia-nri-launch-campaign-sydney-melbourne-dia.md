---
id: R-Q4-M-012
title: "Australia NRI launch campaign — Sydney + Melbourne diaspora groups + WA broadcast"
category: marketing
owner_role: cmo
quarter: Q4
month_target: 10
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q4-G-001"]

kpi:
  metric: "au_signups_monthly"
  current: 0
  target: 2000
  unit: "users"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 28
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (r4): launch scaffold + 12-week sequence + compliance checklist shipped at
    docs/marketing/R-Q4-M-012-australia-launch-handoff.md. Status stays in_progress —
    KPI (2000 AU signups) requires founder execution of WA group access, FB admin contacts,
    influencer outreach, temple partnerships, Stripe AUD enablement. Engineering work
    (/nri/au localized landing, AU TZ slot picker, PostHog dashboard) deferred to future
    batches per founder budget approval.

tags: ["nri","au","launch","diaspora"]
created_at: 2026-06-09T22:09:25.579Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
