---
id: R-Q1-E-010
title: Astrologer slug to UUID design pass + migration
category: engineering
owner_role: cpo
quarter: Q1
month_target: 3
priority: P2
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: astrologer_uuid_migrated
  current: 0
  target: 1
  unit: count
  source: manual
  query: "manual-kpi-1-if-astrologer-table-has-uuid-pk-with-slug-as-unique-index-and-all-existing-rows-migrated-else-0"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "Prisma migration adds uuid PK to Astrologer table with slug as unique index"
  - "All existing astrologer rows backfilled with uuid"
  - "FK references in AstrologerConsultation + AstrologerAvailability updated to uuid"
  - "apps/web/app/astrology/[id]/page.tsx + apps/api/src/routes/astrology.ts handle both slug + uuid lookup"

agent_brief:
  context_files:
    - prisma/schema.prisma
    - apps/api/src/routes/astrology.ts
    - apps/web/app/astrology/[id]/page.tsx
  prompt_skeleton: |
    Read prisma/schema.prisma. Find Astrologer model. Currently uses slug as PK.
    Draft migration adding uuid column default gen_random_uuid + backfill all rows.
    Update FK refs in AstrologerConsultation + AstrologerAvailability.
    Wire getAstrologerByIdOrSlug helper in apps/api/src/routes/astrology.ts.
    Founder reviews migration before applying to prod via prisma db execute.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["astrology","schema","migration"]
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
