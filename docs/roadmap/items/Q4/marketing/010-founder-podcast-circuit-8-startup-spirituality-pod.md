---
id: R-Q4-M-010
title: "Founder podcast circuit — 8 startup/spirituality podcasts (Sandeep+Krish+Rocketship+others)"
category: marketing
owner_role: cmo
quarter: Q4
month_target: 11
priority: P1
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "podcast_episodes_aired"
  current: 0
  target: 8
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 24
est_cost_inr: 0

success_criteria:
  - "8 podcast episodes recorded and published in Q4 (target month-11)"
  - "200K combined plays measured 30 days post-air"
  - "5K Twitter follower spike cumulative across Q4"
  - "50+ inbound DMs (investors + customers + pandit interest)"

agent_brief:
  context_files:
    - docs/marketing/founder-podcast-circuit-q4-spec.md
    - docs/marketing/founder-podcast-pitch-emails.md
    - docs/marketing/R-Q4-M-010-handoff.md
    - docs/marketing/R-Q4-M-010-outreach-tracker.md
  prompt_skeleton: |
    Audit `R-Q4-M-010-outreach-tracker.md` — count rows with status=aired.
    If count < 8, surface remaining queued/pitched rows and oldest-pitch-without-response
    needing follow-up. Do not auto-claim shipped — founder updates tracker after each
    host publishes.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-15 (R4): handoff + outreach tracker shipped via marketing/R-Q4-M-010-batch-2026-06-15-r4.
  Status stays in_progress — KPI flips shipped only after founder records + 8 hosts publish.
  Spec + pitch templates + tracker scaffold all in place. Founder pitch loop is the gate.

tags: ["founder","podcast","awareness"]
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
