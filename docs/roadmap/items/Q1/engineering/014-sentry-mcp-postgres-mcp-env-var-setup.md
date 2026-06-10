---
id: R-Q1-E-014
title: Sentry MCP + Postgres MCP env-var setup
category: engineering
owner_role: it
quarter: Q1
month_target: 2
priority: P2
status: planned
agent_assignable: true
founder_blocker: 'U6'
depends_on: []
blocks: []

kpi:
  metric: mcp_servers_configured
  current: 0
  target: 2
  unit: count
  source: manual
  query: "manual-kpi-count-mcp-servers-configured-in-claude-settings-json-from-set-sentry-postgres-with-tokens-set-and-1-test-query-succeeded-each"

revenue_impact:
  amount_inr: 0
  confidence: medium
  basis: "Imported from year-1 plan; refine on first cycle review."

est_hours: 2
est_cost_inr: 0

success_criteria:
  - "Sentry MCP server configured in claude settings.json with SENTRY_AUTH_TOKEN"
  - "Postgres MCP server configured with SUPABASE_DIRECT_URL (read-only role)"
  - "1 test query each: Sentry recent issues + Postgres count of priests succeeds"

agent_brief:
  context_files:
    - docs/mcp-paste-once.md
    - docs/env-vars.md
    - docs/operational-context.md
  prompt_skeleton: |
    Cannot agent-assign — founder action U6 (Sentry account + Supabase read-only role creation) required.
    Sub-agent prepares paste block per docs/mcp-paste-once.md format.
    Includes Sentry MCP url + auth token slot + Postgres MCP url + connection string slot.
    Founder pastes into ~/.claude/settings.json mcpServers section.
    Sub-agent then writes 2 smoke-test prompts to confirm both MCPs respond.

handoff_notes: |
  2026-06-09: bulk-imported from year-1 content sprint.

tags: ["observability","mcp","setup"]
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
