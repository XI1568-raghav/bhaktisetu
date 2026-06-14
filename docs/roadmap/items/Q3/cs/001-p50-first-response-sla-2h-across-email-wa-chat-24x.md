---
id: R-Q3-CS-001
title: "P50 first-response SLA <2h across email/WA/chat (24x7 coverage)"
category: cs
owner_role: cs
quarter: Q3
month_target: 7
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "cs_p50_response_minutes"
  current: 0
  target: 120
  unit: "minutes"
  source: "agent-state-file"
  query: "jq -r '.overall.p50 // 0' docs/agent-reports/_cs-sla-state.json"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 16
est_cost_inr: 0

success_criteria:
  - "cs-sla-tracker agent runs daily and writes _cs-sla-state.json without crashing"
  - "10/10 vitest cases green for percentile + channel-alias + window cutoff + pending logic"
  - "Handoff doc at docs/cs/R-Q3-CS-001-handoff.md lists 3 wiring options for founder"

agent_brief:
  context_files:
    - "scripts/agents/cs-sla-tracker.mjs"
    - "scripts/agents/__tests__/cs-sla-tracker.test.mjs"
    - "docs/cs/R-Q3-CS-001-handoff.md"
  prompt_skeleton: |
    Measurement plumbing for first-response SLA. Reads _inbound-tickets.jsonl,
    computes p50/p90 per channel over 7-day window vs 120-minute target.
    Inbound wiring (WhatsApp Cloud / Resend inbound / LiveChatWidget) is founder-gated.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-14: shipped measurement primitive (cs-sla-tracker.mjs + 10 tests + handoff doc).
              Agent runs no-op-but-alive. KPI starts moving when founder wires any of
              the three inbound sources listed in docs/cs/R-Q3-CS-001-handoff.md.

tags: ["cs","sla","response","coverage"]
created_at: 2026-06-09T22:02:47.227Z
updated_at: 2026-06-09T22:02:47.227Z
shipped_at: 2026-06-14T05:40:00.000Z
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
