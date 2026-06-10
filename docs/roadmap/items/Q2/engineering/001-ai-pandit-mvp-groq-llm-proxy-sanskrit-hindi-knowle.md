---
id: R-Q2-E-001
title: "AI Pandit MVP — Groq LLM proxy + Sanskrit/Hindi knowledge base ingest"
category: engineering
owner_role: cto
quarter: Q2
month_target: 4
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: ["R-Q2-P-001"]

kpi:
  metric: "ai_pandit_responses_per_day"
  current: 0
  target: 500
  unit: "count"
  source: "posthog"
  query: "posthog-insight-TBD-create-via-ui (event=ai_pandit_response_emitted, unique distinct_id daily, target ≥500/day)"

revenue_impact:
  amount_inr: 200000
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 40
est_cost_inr: 0

success_criteria:
  - "Groq LLM proxy live at /api/v1/ask-pandit w/ rate-limit (5/min/IP) per Sprint 1 P0"
  - "Sanskrit/Hindi knowledge base ingested: 6 Scripture (vedas/upanishads/gita/puranas/ramayana/mahabharata) + aartis + chalisas + chants"
  - "PostHog event ai_pandit_response_emitted fires per response (daily ≥500 target)"
  - "Response latency p95 < 3s (Groq inference + KB retrieval)"
  - "Blocks R-Q2-P-001 (AI Pandit ₹199/mo subscription launch)"

agent_brief:
  context_files:
    - apps/api/src/routes/ask-pandit.ts
    - apps/web/app/ask-pandit/page.tsx
    - apps/web/lib/vedas.ts
    - apps/web/lib/upanishads.ts
    - docs/company/01-cto.md
  prompt_skeleton: |
    CTO sub-agent. P0 AI Pandit MVP — Groq LLM proxy + Sanskrit/Hindi KB ingest.
    Read apps/api/src/routes/ask-pandit.ts (existing rate-limited Groq proxy from Sprint 1 P0).
    Ingest 6 Scripture libs (vedas/upanishads/gita/puranas/ramayana/mahabharata) + chants/aartis/chalisas into RAG index.
    Add PostHog event ai_pandit_response_emitted on every successful response (token count + latency).
    Verify p95 latency < 3s with KB retrieval. Blocks R-Q2-P-001 (₹199/mo subscription).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["ai","pandit","mvp","groq"]
created_at: 2026-06-09T21:55:16.790Z
updated_at: 2026-06-09T21:55:16.790Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
