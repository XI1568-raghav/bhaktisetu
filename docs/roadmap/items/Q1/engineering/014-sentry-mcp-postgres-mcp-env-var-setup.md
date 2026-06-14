---
id: R-Q1-E-014
title: Sentry MCP + Postgres MCP env-var setup
category: engineering
owner_role: it
quarter: Q1
month_target: 2
priority: P2
status: in_progress
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
  2026-06-15: scaffold shipped — .mcp.json adds Sentry block + Postgres flipped to ${env:SUPABASE_READONLY_URL} (env-or-noop, no boot crash when missing). Full paste-once handoff at docs/engineering/R-Q1-E-014-sentry-postgres-mcp-handoff.md (Sentry account + Supabase read-only role + paste blocks + 2 smoke prompts). Status stays in_progress until founder pastes secrets + runs the 2 smoke tests. KPI flips current 0→2 then.

tags: ["observability","mcp","setup"]
created_at: 2026-06-09T21:28:52.338Z
updated_at: 2026-06-15T00:00:00.000Z
shipped_at: null
verified_at: null
killed_at: null
killed_reason: null
---

# Why this matters
Two MCP servers close the biggest verify-before-declare-done gaps for the solo founder: Sentry MCP lets Claude read prod errors inline (instead of asking founder to open Sentry UI), and Postgres MCP (read-only role) lets Claude run SQL against the prod DB without writing one-off check scripts. Together they cut round-trip time on "did my fix actually work?" from minutes to seconds.

# Reference material
- `docs/engineering/R-Q1-E-014-sentry-postgres-mcp-handoff.md` — full paste-once handoff (Sentry account setup + Supabase read-only role DDL + .mcp.json + env exports + 2 smoke prompts + flip-to-shipped checklist).
- `docs/mcp-setup.md` — how MCP env vars reach servers (Option A source + claude, Option B persistent user env vars on Windows).
- `docs/mcp-paste-once.md` — companion doc for 5 other MCPs (github / supabase / cloudflare / linear / brave-search).
- `docs/roadmap/setup/supabase-readonly-role.sql` — DDL the founder runs once to create the `claude_readonly` role.
- `.mcp.json` — project-scope MCP config (Sentry block + Postgres read-only URL slot scaffolded by this item; activates when env vars exported by founder).
