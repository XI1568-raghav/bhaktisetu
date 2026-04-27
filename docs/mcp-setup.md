# MCP server setup — Darshya

> Four MCP (Model Context Protocol) servers are configured for this
> project: Playwright (user-scope, no key) and Postgres + Sentry +
> Firecrawl (project-scope, see `.mcp.json`). MCP lets Claude Code
> talk to live systems instead of scraping CSVs you upload.

## Status

| MCP | Scope | Config file | Needs from you |
|---|---|---|---|
| Playwright | User | `~/.claude.json` | Nothing — `npx @playwright/mcp` downloads on first use. |
| Postgres | Project | `.mcp.json` (committed) | `DATABASE_URL` exported in the shell that starts Claude. |
| Sentry | Project | `.mcp.json` | `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` in shell env. |
| Firecrawl | Project | `.mcp.json` | `FIRECRAWL_API_KEY` in shell env. |

## How env vars reach an MCP server

Important: MCP servers inherit the env from the shell that **launched
Claude Code**, not from `apps/api/.env`. Setting a variable in `.env`
does not propagate. You have two options:

### Option A — Export from `.env` before launching Claude

Add this to a small wrapper script (or run it once per terminal
session). Linux / macOS / Git Bash on Windows:

```bash
set -a
source apps/api/.env
set +a
claude
```

`set -a` makes every subsequent assignment auto-exported. After
Claude starts the MCP servers will pick them up. `set +a` restores
the default at the end.

### Option B — Permanent user-level env vars (Windows)

PowerShell:

```powershell
[Environment]::SetEnvironmentVariable("DATABASE_URL", "<value>", "User")
[Environment]::SetEnvironmentVariable("FIRECRAWL_API_KEY", "<value>", "User")
[Environment]::SetEnvironmentVariable("SENTRY_AUTH_TOKEN", "<value>", "User")
[Environment]::SetEnvironmentVariable("SENTRY_ORG", "darshya", "User")
[Environment]::SetEnvironmentVariable("SENTRY_PROJECT", "bhaktisetu-api", "User")
```

Restart any terminals/Claude after setting these. They persist across
reboots.

## Per-MCP setup

### Postgres (already viable today)

Your `DATABASE_URL` already exists in `apps/api/.env`. Just `set -a;
source apps/api/.env; set +a; claude` and the postgres MCP starts.

⚠️ **Production safety**: this is the *prod* Supabase pooler URL. The
service role can write. For routine triage, treat the MCP as
read-only by convention — only use SELECT statements unless you're
intentionally fixing data.

### Sentry

1. Sentry → User settings → Auth Tokens → "Create New Token". Scopes:
   `project:read`, `event:read`, `org:read`. Save the token.
2. Note your **org slug** (visible in your Sentry URL:
   `sentry.io/organizations/<this-is-the-slug>/`).
3. Note the **project slug** for the API project (likely
   `bhaktisetu-api`).
4. Export all three (Option A or B above).

If `SENTRY_DSN` is not yet set in `apps/api/.env`, the API isn't
sending events to Sentry — fix that first or the MCP has nothing to
show.

### Firecrawl

1. Sign up free at https://firecrawl.dev (no card required, 500
   pages/month).
2. Dashboard → API Keys → copy.
3. Export as `FIRECRAWL_API_KEY`.

### Playwright

No config. First run downloads the headless Chromium. `npx
@playwright/mcp` is invoked on demand.

## Verifying MCP servers are loaded

Inside Claude Code, run:

```
/mcp
```

This lists the active servers and their connection state. Anything
in `error` state means an env var is missing or wrong. Common causes:
- `DATABASE_URL` not exported (only set in `.env`).
- `SENTRY_AUTH_TOKEN` token has wrong scopes.
- `FIRECRAWL_API_KEY` missing or revoked.

## What MCP servers DO NOT do

- They do not bypass auth — Postgres MCP needs the same DB credential
  Render uses. There's no implicit elevation.
- They do not run inside Claude's process — each is a child process
  via `npx`, so first-run cold start is 5–30 s while npm fetches the
  package. Cached after that.
- They do not work with secrets stored in `apps/api/.env` unless you
  export them into the shell that launched Claude (see Option A/B).

## Removing a server

```
claude mcp remove <name>           # user-scope (e.g. playwright)
```

For project-scope servers, edit `.mcp.json` and restart Claude.
