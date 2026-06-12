---
id: R-Q1-CS-005
title: "Re-send 230 EMAILED templates after DNS verify (zero replies because spam)"
category: cs
owner_role: cs
quarter: Q1
month_target: 1
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: ["R-Q1-IT-004","R-Q1-IT-005"]
blocks: []

kpi:
  metric: "temple_reply_rate_pct"
  current: 0
  target: 5
  unit: "pct"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 4
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-12: Ops runbook + script skeleton shipped. docs/ops/cs-005-resend-stale-leads-runbook.md (8-step, ~2hr):
    - Pre-flight gate: IT-004 Resend DNS verify MUST be GREEN (else damages domain reputation)
    - SQL query + segment by role (pandit/temple/gaushala/astrologer) + by source
    - 4 per-role warm-followup templates (acknowledges prior contact + new update + soft re-ask + explicit unsubscribe)
    - Idempotency guard via Lead.metadata.cs005_resent_at
    - Send script skeleton at apps/api/scripts/ops/cs005-resend-stale-leads.ts (similar pattern to sla-breach-outreach.ts)
    - Dry-run gate before live send
    - Resend free-tier rate limit (100/day) → 3-day spread for 230 emails
    - Reply triage SQL (target 5-8% reply rate, threshold 2% = DNS not actually fixed)
  UNBLOCKS R-Q1-CS-007 (bulk-reset 200 stale → NEW for rolling window) — CS-005 + CS-007 are a pair.
  BLOCKED-ON: R-Q1-IT-004 Resend DNS verify completion. CS-005 cannot ship until IT-004 GREEN.
  FOUNDER ACTION: complete IT-004 first (~45min) → then 8 CS-005 steps (~2hr spread over 3 days).
  Closes (partial): R-Q1-CS-005. Status flips to shipped after 230/230 sends + day-14 reply triage.

tags: ["outreach","temple","rerun","p0"]
created_at: 2026-06-10T20:11:37.313Z
updated_at: 2026-06-12T11:15:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
