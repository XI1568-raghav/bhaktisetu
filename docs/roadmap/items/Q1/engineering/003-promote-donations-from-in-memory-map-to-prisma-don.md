---
id: R-Q1-E-003
title: Promote donations from in-memory Map to Prisma Donation table
category: engineering
owner_role: cto
quarter: Q1
month_target: 1
priority: P0
status: planned
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: donations_persisted
  current: 0
  target: 1
  unit: count
  source: supabase
  query: 'SELECT COUNT(*) FROM "Donation" WHERE created_at > NOW() - INTERVAL ''24 hours'''

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Prisma Donation table exists with all required cols (donorId, amount, currency, templeId, status, razorpayPaymentId, panNumber, eightyG receipt fields)"
  - "POST /api/v1/donations writes to Donation table (not in-memory Map)"
  - "Supabase: SELECT COUNT(*) FROM Donation increases on each new donation"
  - "Render restart preserves all donations (in-memory Map lost on restart, Prisma persists)"
  - "80G receipt generation reads from Donation row (not Map)"

agent_brief:
  context_files:
    - apps/api/src/routes/donations.ts
    - apps/api/src/routes/admin-donations-export.ts
    - apps/api/prisma/schema.prisma
    - docs/company/01-cto.md
  prompt_skeleton: |
    CTO sub-agent. P0 data persistence — donations currently in-memory Map (lost on Render restart).
    Read apps/api/src/routes/donations.ts. Find Map.set/get calls — replace with prisma.donation.create/findMany.
    Add Donation model to apps/api/prisma/schema.prisma if missing (donorId, amount Decimal(10,2), currency, templeId FK, status enum, razorpayPaymentId, panNumber, eightyG receipt fields, createdAt).
    Run prisma db execute against DIRECT_URL (Supabase) to apply migration. Verify via apps/api/scripts/check-prod-tables.mjs.
    Update admin-donations-export.ts to read from Prisma. Test donation flow end-to-end on test-mode Razorpay.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["data","p0","donations"]
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
