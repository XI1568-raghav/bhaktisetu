---
id: R-Q3-E-001
title: "Voice AI Pandit v1 — Whisper STT + Groq LLM + ElevenLabs TTS round-trip <3s"
category: engineering
owner_role: cto
quarter: Q3
month_target: 7
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q2-E-001"]
blocks: ["R-Q3-P-001"]

kpi:
  metric: "voice_pandit_sessions_daily"
  current: 0
  target: 300
  unit: "count"
  source: "posthog"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 400000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 48
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["voice","ai","pandit","whisper","tts"]
created_at: 2026-06-09T22:02:48.000Z
updated_at: 2026-06-09T22:02:48.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
