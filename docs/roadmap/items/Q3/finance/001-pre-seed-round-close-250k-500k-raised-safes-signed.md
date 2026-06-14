---
id: R-Q3-F-001
title: "Pre-seed round close — $250K-$500K raised + SAFEs signed + bank wire received"
category: finance
owner_role: cfo
quarter: Q3
month_target: 8
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: 'U4'
depends_on: ["R-Q3-SA-003","R-Q3-SA-004"]
blocks: []

kpi:
  metric: "preseed_raised_usd"
  current: 0
  target: 400000
  unit: "usd"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Lead SAFE signed + $150K wire cleared by end of W2"
  - "Cumulative preseed_raised_usd >= 250000 by end of Q3 (floor)"
  - "All SAFEs counter-signed + filed with counsel by W11"
  - "Investor pipeline tracker maintained weekly in docs/finance/investor-pipeline-2026-06.md"
  - "Close memo sent to all wire-cleared investors by W12"

agent_brief:
  context_files:
    - "docs/finance/R-Q3-F-001-handoff.md"
    - "docs/finance/pre-seed-round-close-q3-spec.md"
    - "docs/finance/investor-pipeline-2026-06.md"
    - "docs/finance/incorporate-vs-sole-prop-decision-2026-06-12.md"
    - "docs/finance/business-bank-account-setup-runbook.md"
    - "docs/roadmap/_manual-kpis.yml"
  prompt_skeleton: |
    Founder action item. Agent cannot raise capital. Agent role: weekly nudge
    via cxo/cfo.mjs to (1) review pipeline file, (2) prompt founder to update
    preseed_raised_usd in _manual-kpis.yml on wire-clear, (3) flag tripwires
    from handoff doc (W6 $0 / W9 <$150K / W12 <$250K). Do not auto-flip
    status until preseed_raised_usd >= 250000.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14 (R-Q3-F-001 ship session): R-Q3-F-001-handoff.md authored.
  Status stays in_progress per founder-action gate. Decision Agent will
  auto-flip to shipped when preseed_raised_usd >= 250000 in _manual-kpis.yml.
  See handoff doc for 12-week sequence + close-checklist + 8 F-blocking items.

tags: ["fundraising","preseed","close","safe"]
created_at: 2026-06-09T22:02:48.580Z
updated_at: 2026-06-09T22:02:48.580Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
