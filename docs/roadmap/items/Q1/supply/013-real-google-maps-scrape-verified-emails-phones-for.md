---
id: R-Q1-S-013
title: "Real Google Maps scrape — verified emails+phones for 100 NEW BLR temple leads"
category: supply
owner_role: sales
quarter: Q1
month_target: 1
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: "GOOGLE_PLACES_API_KEY missing in Render env — see docs/supply/R-Q1-S-013-handoff.md"
depends_on: []
blocks: []

kpi:
  metric: "leads_new_verified_emails"
  current: 0
  target: 100
  unit: "count"
  source: "supabase"
  query: "SELECT COUNT(*) FROM leads WHERE role='TEMPLE' AND city='Bengaluru' AND (metadata->>'campaign')='R-Q1-S-013' AND ((email IS NOT NULL AND email NOT LIKE '%.temple.placeholder.in' AND (metadata->>'verified_email')::boolean=true) OR (metadata->>'verified_phone')::boolean=true);"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 8
est_cost_inr: 0

success_criteria:
  - "100-row BLR temple seed shipped + idempotent upsert"
  - "BLR-focused Google Places scraper shipped (env-or-noop on GOOGLE_PLACES_API_KEY)"
  - "KPI SQL query exposed at apps/api/scripts/leads/blr-kpi.sql"
  - "Founder-action-required handoff doc at docs/supply/R-Q1-S-013-handoff.md"

agent_brief:
  context_files:
    - "apps/api/scripts/leads/_temple-seed-blr.ts"
    - "apps/api/scripts/leads/scrape-temples-blr.ts"
    - "apps/api/scripts/leads/blr-kpi.sql"
    - "docs/supply/R-Q1-S-013-handoff.md"
  prompt_skeleton: |
    Re-run BLR temple scraper after GOOGLE_PLACES_API_KEY is set in Render env.
    Verify KPI via apps/api/scripts/leads/blr-kpi.sql.
    Surface verified-email gap in next supply lead-gen agent report.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-14: env-or-noop code shipped (PR batch-2026-06-14). Static 100-row BLR seed
              inserts on every run; verified email/phone enrichment unblocks the moment
              founder sets GOOGLE_PLACES_API_KEY in Render env. See
              docs/supply/R-Q1-S-013-handoff.md for the 4-step founder action.

tags: ["scrape","verified","leads","p0"]
created_at: 2026-06-10T20:35:05.804Z
updated_at: 2026-06-10T20:35:05.804Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
