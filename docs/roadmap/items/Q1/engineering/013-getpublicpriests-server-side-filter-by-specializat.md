---
id: R-Q1-E-013
title: getPublicPriests server-side filter by specialization+deity
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: server_side_priest_filter
  current: 0
  target: 1
  unit: count
  source: manual
  query: "manual-kpi-1-if-priests-public-route-accepts-specialization-and-deity-query-params-with-prisma-has-and-some-filter-applied-server-side"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 3
est_cost_inr: 0

success_criteria:
  - "GET /api/v1/priests accepts specialization + deity query params"
  - "Prisma where clause uses has: on specialization string[] and some: on offerings.deity relation"
  - "apps/web/lib/pandit-api.ts client typed with query params"
  - "Filter response cached 5min via fastify route hook"

agent_brief:
  context_files:
    - apps/api/src/routes/priests-public.ts
    - apps/web/lib/pandit-api.ts
    - prisma/schema.prisma
  prompt_skeleton: |
    Read apps/api/src/routes/priests-public.ts. Current returns all active priests unfiltered.
    Add zod query schema: specialization optional string + deity optional string.
    Build prisma where dynamically: specialization has: + offerings some: deity equals.
    Update apps/web/lib/pandit-api.ts client signature.
    Add vitest case for each filter combo.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["api","filter","priests"]
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
