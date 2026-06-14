# R-Q1-E-014 — Sentry MCP + Postgres MCP env-var setup (founder paste-once)

> Roadmap item: `docs/roadmap/items/Q1/engineering/014-sentry-mcp-postgres-mcp-env-var-setup.md`
> Status: scaffolded by agent; flips to `shipped` after founder pastes secrets + runs 2 smoke prompts.
> Founder blocker: U6 (Sentry account + Supabase read-only role).
> KPI target: `mcp_servers_configured: 2` (Sentry + Postgres responding to test query each).

## Why this matters

Two MCP servers close the biggest verify-before-declare-done gaps for the founder:

1. **Sentry MCP** — Claude reads prod errors inline instead of asking founder to open Sentry UI. Closes the loop on "did my fix actually stop the crash?" without round-tripping the founder.
2. **Postgres MCP (read-only)** — Claude runs SQL against the Supabase Postgres prod DB without writing a one-off `apps/api/scripts/check-*.mjs`. Use cases: row counts after migration, find duplicate users, booking funnel queries, KPI sanity checks for the roadmap loop.

Postgres MCP is already declared in `.mcp.json` but inherits `DATABASE_URL` from the launching shell — without the env var exported, the server loads but every query fails. Sentry MCP is not yet declared in `.mcp.json` — this doc adds it (founder-side paste).

## Pre-work owner needs to do (one-time)

### 1. Sentry account + token

1. Visit https://sentry.io → sign up (free tier covers 5k events/mo, enough for prod traffic at current scale).
2. Create org slug (suggested: `darshya`).
3. Create project slug (suggested: `bhaktisetu-api` for Fastify backend; add `bhaktisetu-web` later for Next.js).
4. Settings → Account → API → Auth Tokens → Create New Token. Scopes needed: `event:read`, `project:read`, `org:read`. Name: `claude-code-mcp`. Copy token.

### 2. Supabase read-only role

The existing `SUPABASE_DIRECT_URL` uses the `postgres` superuser — Claude running raw SQL via MCP should use a least-privilege role so an accidental `DELETE FROM bookings` is impossible.

Run the existing DDL once against the prod DB:

```bash
# From the bhaktisetu repo root
psql "$SUPABASE_DIRECT_URL" -f docs/roadmap/setup/supabase-readonly-role.sql
```

That script creates a role `claude_readonly` with `SELECT` only on every existing table + default privilege grant on future tables. Copy the role password it emits (or pre-set it via `\set readonly_password 'xxx'` before running).

Build the read-only connection string:

```
postgres://claude_readonly:<password>@<host>:5432/postgres?sslmode=require
```

Where `<host>` is the same `db.<ref>.supabase.co` as `SUPABASE_DIRECT_URL`. Save as `SUPABASE_READONLY_URL` for later paste.

## Paste block — `.mcp.json` (project-scope)

Edit `bhaktisetu/.mcp.json`. The Postgres entry already exists — change it to use the read-only URL. Add a Sentry entry.

```json
{
  "$schema": "https://json.schemastore.org/mcp.json",
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "${env:SUPABASE_READONLY_URL}"
      ],
      "comment": "Read-only access to Supabase Postgres prod DB via claude_readonly role. Loads only when SUPABASE_READONLY_URL is exported."
    },
    "sentry": {
      "command": "npx",
      "args": ["-y", "@sentry/mcp-server"],
      "env": {
        "SENTRY_AUTH_TOKEN": "${env:SENTRY_AUTH_TOKEN}",
        "SENTRY_ORG": "${env:SENTRY_ORG}",
        "SENTRY_PROJECT": "${env:SENTRY_PROJECT}"
      },
      "comment": "Sentry MCP — reads issues / events / replays from sentry.io. Read-only on the token scope set in account."
    }
  }
}
```

> Note: `${env:NAME}` is the standard MCP env-substitution syntax. The MCP runtime expands these from the shell that launched Claude Code, not from `apps/api/.env`. See `docs/mcp-setup.md` "How env vars reach an MCP server".

## Paste block — environment (founder workstation, persists across reboots)

PowerShell on Windows (per `docs/mcp-setup.md` Option B):

```powershell
[Environment]::SetEnvironmentVariable("SUPABASE_READONLY_URL", "postgres://claude_readonly:REPLACE_ME@db.REPLACE_REF.supabase.co:5432/postgres?sslmode=require", "User")
[Environment]::SetEnvironmentVariable("SENTRY_AUTH_TOKEN", "REPLACE_ME", "User")
[Environment]::SetEnvironmentVariable("SENTRY_ORG", "darshya", "User")
[Environment]::SetEnvironmentVariable("SENTRY_PROJECT", "bhaktisetu-api", "User")
```

Linux / macOS / Git Bash equivalent — append to `~/.bashrc` / `~/.zshrc`:

```bash
export SUPABASE_READONLY_URL='postgres://claude_readonly:REPLACE_ME@db.REPLACE_REF.supabase.co:5432/postgres?sslmode=require'
export SENTRY_AUTH_TOKEN='REPLACE_ME'
export SENTRY_ORG='darshya'
export SENTRY_PROJECT='bhaktisetu-api'
```

After paste: close every Claude Code window, open a fresh PowerShell / shell, then `claude` again. MCP servers boot lazily on first tool call.

## Smoke tests (run inside Claude Code after restart)

Run these two prompts in order. Each should succeed within one tool turn.

### Smoke 1 — Sentry MCP responds

```
Use the sentry MCP to list the 5 most recent unresolved issues for project bhaktisetu-api. Show issue title, count, last seen.
```

Pass criteria: response includes a markdown table with 0-5 rows. Empty list is fine (it means no errors). Failure: tool returns auth error → check `SENTRY_AUTH_TOKEN` scope.

### Smoke 2 — Postgres MCP responds

```
Use the postgres MCP to run: SELECT COUNT(*) AS pandit_count FROM "Priest" WHERE "isActive" = true;
```

Pass criteria: response includes a single row with `pandit_count` integer (e.g. `0` for empty DB, any positive for live DB). Failure: tool returns permission denied → re-run the DDL script and verify the `GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_readonly` line.

## Flip status to shipped

After both smokes pass, edit `docs/roadmap/items/Q1/engineering/014-sentry-mcp-postgres-mcp-env-var-setup.md`:

```yaml
status: shipped
shipped_at: 2026-06-15T00:00:00Z   # set to actual UTC timestamp
kpi:
  current: 2                        # was 0
```

Commit on the next batched docs push (no apps/web change → `[skip ci]`, 0 CF burn).

## Failure modes / debug

| Symptom | Likely cause | Fix |
|---|---|---|
| MCP server not listed in `/mcp` | Env var missing in launching shell | Restart terminal, re-export, restart Claude |
| `permission denied for table X` | DDL didn't grant on that table (was added after) | Re-run `supabase-readonly-role.sql` |
| `SENTRY_AUTH_TOKEN invalid` | Token has wrong scope or expired | Regenerate at sentry.io → API → Auth Tokens |
| Postgres MCP `ECONNREFUSED` | Supabase pooler URL used instead of direct | Use `db.<ref>.supabase.co:5432`, not `aws-0-*.pooler.supabase.com:6543` |
| Sentry MCP boots but no project visible | Token org-scope mismatch | Set `SENTRY_ORG` to the actual slug from sentry.io URL |

## Why not declare in `.claude/settings.json` user-scope?

Project-scope `.mcp.json` keeps the Postgres + Sentry config versioned with the repo. Future hires get the same MCP setup automatically on clone. User-scope `~/.claude.json` is reserved for personal MCPs like Playwright that don't need repo-specific creds.
