---
id: R-Q1-IT-004
title: "Resend domain DNS verify — DKIM+SPF+DMARC for darshya.online"
category: it
owner_role: it
quarter: Q1
month_target: 1
priority: P0
status: in_progress
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "resend_domain_verified"
  current: 0
  target: 1
  unit: "count"
  source: "manual"
  query: "TBD-populate-before-orchestrator-go-live"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "Populate during first sub-agent emission cycle"

agent_brief:
  context_files: []
  prompt_skeleton: |
    TBD — populated by first sub-agent cycle.

handoff_notes: |
  2026-06-10: bulk-imported from year-1 content sprint.
  2026-06-12: Runbook shipped. docs/ops/resend-dns-verify-runbook.md (10-step, ~45min):
    - SPF merge (don't add 2nd record), DKIM (resend._domainkey), MX bounce subdomain, SPF for bounce sub, DMARC (p=none v1 → escalate p=quarantine/p=reject over 90 days)
    - Resend dashboard verify + Gmail "Show original" SPF/DKIM/DMARC PASS check
    - API key rotation (U12 leaked key cleanup) w/ Render + GH + .env paste + restart
    - 12 pass-criteria checkboxes + 6 failure modes
    - DMARC monitoring inbox + monthly review cadence
  UNBLOCKS:
    - R-Q1-CS-005 (re-send 230 stale leads — would've gone to spam without DNS)
    - U12 (leaked Resend API key cleanup)
    - All Bhaktisetu transactional emails (booking confirmations, refund notices, 80G PDFs, monthly impact reports, festival reminders, CS macros)
  FOUNDER ACTION: 45 min focused — DNS access required + new API key paste to Render + GH + .env.
  Closes (partial): R-Q1-IT-004. Status flips to shipped after founder completes 12 pass-criteria + Gmail test send PASS.

tags: ["critical","resend","dns","email","p0"]
created_at: 2026-06-10T20:11:37.313Z
updated_at: 2026-06-12T11:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
