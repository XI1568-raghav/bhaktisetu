---
id: R-Q1-P-001
title: "Kill silent mock fallback in pujas/[slug]/book/page.tsx:549 (CPO #1)"
category: product
owner_role: cpo
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "mock_fallback_killed"
  current: 0
  target: 1
  unit: "count"
  source: "gh_repo"
  query: "grep -nE 'mockData|fallback.*mock|silent.*fallback' apps/web/app/pujas/book/page.tsx | wc -l (target: 0)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "apps/web/app/pujas/book/page.tsx line ~549 silent mock fallback REMOVED — API failure throws/shows error UI instead"
  - "grep mockData|fallback.*mock returns 0 hits in pujas/book/page.tsx"
  - "When API returns 5xx, user sees explicit error banner (not silently rendered mock data)"
  - "PostHog event book_api_error fires on failure path"

agent_brief:
  context_files:
    - apps/web/app/pujas/book/page.tsx
    - apps/web/lib/api-client.ts
    - docs/company/04-cpo.md
  prompt_skeleton: |
    CPO sub-agent. P0 product truthfulness — silent mock fallback in pujas/book/page.tsx ~line 549 means user sees fake data when API down, books a puja that never reaches backend.
    Read apps/web/app/pujas/book/page.tsx around line 549. Find the try/catch where API failure falls back to local mockData.
    Replace silent fallback with: (a) setError state, (b) render amber alert banner "Booking temporarily unavailable, please retry", (c) disable Book Now button, (d) posthog.capture('book_api_error').
    Verify no other silent mock paths exist (grep for setBookings.*mock or fallback.*data).

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["product","p0","mocks"]
created_at: 2026-06-09T21:51:06.038Z
updated_at: 2026-06-09T21:51:06.038Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
