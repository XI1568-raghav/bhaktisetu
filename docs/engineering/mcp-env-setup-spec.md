# Sentry MCP + Postgres MCP Env-Var Setup

> **Roadmap item**: R-Q1-E-014 (P2) · **Authored**: 2026-06-13

## Goal

Q1 setup Sentry MCP + Postgres MCP for founder Claude Code workflows. Closes verify-before-declare-done gap on prod work.

## Per `docs/mcp-paste-once.md` (already shipped 2026-05-30)

### Sentry MCP
- `SENTRY_AUTH_TOKEN` env var
- Founder generates at sentry.io → Settings → Auth Tokens
- Scope: `project:read` + `event:read` + `org:read`
- Paste to Claude settings.json mcp servers config

### Postgres MCP
- `DATABASE_URL` (Supabase direct URL, not pooled)
- Founder fetches from Supabase Dashboard → Settings → Database
- Paste to Claude settings.json mcp servers config

## Founder-action

1. Generate Sentry token + paste
2. Fetch Supabase direct URL + paste
3. Restart Claude Code
4. Test: ask Claude "show latest 5 Sentry errors" → MCP queries succeed

## Engineering tickets

- R-Q1-E-014a: Doc current per `docs/mcp-paste-once.md`
- R-Q1-E-014b: Founder paste tokens
- R-Q1-E-014c: Verify Claude MCP queries

## Closes

R-Q1-E-014 — spec shipped.
