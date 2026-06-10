---
id: R-Q1-E-011
title: Wire FCM server key (env-or-noop already in place)
category: engineering
owner_role: cto
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: 'U5'
depends_on: []
blocks: []

kpi:
  metric: fcm_push_live
  current: 0
  target: 1
  unit: count
  source: manual
  query: "manual-kpi-1-if-FCM_SERVER_KEY-set-in-render-env-and-test-push-delivered-to-1-device-else-0"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "FCM_SERVER_KEY env var set in Render production"
  - "Test push delivered to founder device from mobile devotee app"
  - "Push notification fires on booking confirmation event"

agent_brief:
  context_files:
    - apps/api/src/lib/fcm.ts
    - apps/mobile/app/_layout.tsx
    - docs/env-vars.md
  prompt_skeleton: |
    Cannot agent-assign — founder action U5 (FCM key paste in Render env) required.
    Code already env-or-noop in apps/api/src/lib/fcm.ts. After paste:
    Sub-agent can write smoke-test script to POST 1 test push to founder's expo-push-token.
    Confirms server keys works end-to-end. Then enable push trigger on booking.created event.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["mobile","push","fcm"]
created_at: 2026-06-09T21:28:52.338Z
updated_at: 2026-06-09T21:28:52.338Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
