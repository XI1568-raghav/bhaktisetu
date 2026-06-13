---
id: R-Q2-IT-003
title: "Supabase backup automation — daily pg_dump to S3 + 30d retention"
category: it
owner_role: cto
quarter: Q2
month_target: 6
priority: P2
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "supabase_backup_active"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 6
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.
  2026-06-13: code shipped (R-Q2-IT-003 batch).
    - scripts/backup/supabase-backup.mjs (pg_dump --format=custom → Supabase Storage)
    - scripts/backup/prune-old-backups.mjs (30-day retention)
    - scripts/backup/test/backup.test.mjs (7 vitest pass, TDD RED→GREEN)
    - .github/workflows/db-backup.yml (daily 19:00 UTC cron)
    - docs/runbooks/db-restore.md (blind-followable restore procedure)
  Default vendor: Supabase Storage bucket `db-backups` (no new vendor, $0).
  Both scripts env-gated → no-op + exit 0 when secrets missing.
  FOUNDER BLOCKERS before status=shipped:
    1. Decide vendor (Supabase Storage default; R2/B2 needs CFO sign-off).
    2. Create `db-backups` bucket in chosen vendor.
    3. Set GH Actions secrets: SUPABASE_DB_URL (DIRECT_URL, not pooled),
       SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL.
    4. Manual trigger: gh workflow run db-backup.yml.
    5. Verify dump uploaded: list bucket db-backups/backups/.
    6. Restore drill on staging per docs/runbooks/db-restore.md.

tags: ["it","supabase","backup","dr"]
created_at: 2026-06-09T21:55:18.961Z
updated_at: 2026-06-09T21:55:18.961Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
