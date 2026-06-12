---
id: R-Q1-IT-001
title: "UptimeRobot setup on api.darshya.online/health + darshya.online (SMS alerts)"
category: it
owner_role: it
quarter: Q1
month_target: 1
priority: P0
status: shipped
agent_assignable: true
founder_blocker: null
depends_on: []
blocks: []

kpi:
  metric: "uptime_monitors_active"
  current: 0
  target: 2
  unit: "count"
  source: "manual"
  query: "manual KPI _manual-kpis.yml field uptime_monitors_active (count of active UptimeRobot monitors with SMS alert configured)"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "UptimeRobot HTTPS monitor on https://api.darshya.online/health (5min interval, expect 200)"
  - "UptimeRobot HTTPS monitor on https://darshya.online (5min interval, expect 200)"
  - "SMS + email alert contacts configured for founder phone (downtime > 5min triggers alert)"
  - "Public status page URL captured in docs/operational-context.md"

agent_brief:
  context_files:
    - docs/company/09-it.md
    - docs/operational-context.md
    - scripts/agents/uptime-pinger.mjs
  prompt_skeleton: |
    IT sub-agent. P0 ops — no external uptime monitoring; Render/CF dashboards only show in-platform.
    Founder action: create free UptimeRobot account (50 monitors free tier). Add 2 HTTPS monitors:
    1. https://api.darshya.online/health — 5min, expect 200, alert if 3 consecutive failures
    2. https://darshya.online — 5min, expect 200, same alert rule
    Configure SMS contact (free tier: 1 SMS alert/month — supplement with email + Telegram webhook).
    Note: existing scripts/agents/uptime-pinger.mjs runs in GH Actions but useless if GH itself down. External monitor mandatory.
    Cannot agent-assign account creation — founder login + SMS setup required.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["observability","uptime","p0"]
created_at: 2026-06-09T21:50:47.096Z
updated_at: 2026-06-09T21:50:47.096Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Imported placeholder. First orchestrator cycle emits sub-agent to populate full body.

# Reference material
- See agent_brief.context_files after cycle 1
