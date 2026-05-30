# MCP servers — paste-once setup (5 high-leverage servers)

> Companion to `docs/mcp-setup.md`. That doc covers the 4 already-configured project servers (Playwright/Postgres/Sentry/Firecrawl). This doc adds 5 more that close the biggest verify/automate gaps.

Five MCP servers, paste-once setup. Each section: **what** + **why for Darshya** + **exact JSON** + **what owner pastes**. Composite block at bottom.

Paste-target: `C:\Users\DELL\.claude\settings.json` → top-level `mcpServers` key (sibling of `permissions`, `model`, `env`). If `mcpServers` already exists, merge keys.

After every paste, restart Claude Code (`/exit` then re-launch) so MCP servers boot.

---

## 1. github — official GitHub MCP

**Why for Darshya**: gh CLI works but MCP exposes PRs / issues / releases as structured tools — faster than parsing `gh api` JSON. Useful for: agent-issue-filer dedup, PR review, release notes auto-pulled from commits.

```json
"github": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-github"],
  "env": {
    "GITHUB_PERSONAL_ACCESS_TOKEN": "REPLACE_ME"
  }
}
```

**Owner action**: github.com → Settings → Developer settings → Personal access tokens → Fine-grained → repo `darshya-online/bhaktisetu` → scopes: `Contents: Read+Write`, `Issues: Read+Write`, `Pull requests: Read+Write`, `Actions: Read`. Paste token over `REPLACE_ME`.

---

## 2. supabase — query prod DB directly (read-only by default)

**Why for Darshya**: today verification is `apps/api/scripts/check-prod-tables.mjs` then read stdout. MCP lets Claude run SQL inline — booking funnel queries, "find duplicate users", row counts after migration without round-trip scripts. The `--read-only` flag below blocks accidental mutations.

```json
"supabase": {
  "command": "npx",
  "args": ["-y", "@supabase/mcp-server-supabase", "--read-only"],
  "env": {
    "SUPABASE_ACCESS_TOKEN": "REPLACE_ME",
    "SUPABASE_PROJECT_REF": "REPLACE_ME"
  }
}
```

**Owner action**: supabase.com/dashboard → Account → Access Tokens → Generate new token (name "claude-code-darshya"). Project ref = slug in `supabase.com/dashboard/project/<REF>` (the project holding `poojly_*` storage + DB).

> Note: Postgres MCP in `.mcp.json` connects via `DATABASE_URL` for raw SQL. Supabase MCP adds metadata access (table list, edge functions, storage) the postgres MCP cannot reach.

---

## 3. cloudflare — read CF Pages build logs + worker analytics

**Why for Darshya**: today's verify-before-declare-done rebuke happens because Claude can't read CF deploy logs. MCP exposes builds / deployments / errors as tools — Claude can confirm CF green vs red instead of asking owner to curl. Closes the biggest gap in the verify discipline.

```json
"cloudflare": {
  "command": "npx",
  "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
  "env": {
    "CLOUDFLARE_API_TOKEN": "REPLACE_ME",
    "CLOUDFLARE_ACCOUNT_ID": "REPLACE_ME"
  }
}
```

**Owner action**: dash.cloudflare.com → My Profile → API Tokens → Create Token → template "Edit Cloudflare Workers" (Pages permission bundled). Restrict to account-scope. Copy token + account ID (right sidebar of any zone page in CF dashboard).

---

## 4. linear — pull product spec / tickets into the conversation

**Why for Darshya**: roadmap currently lives in `ROADMAP.md` + `TASKS.md`. If/when Linear gets adopted for the seed-pitch sprint (3 founders), MCP saves the copy-paste step on every "what was decided about X" question. Skip if you're not planning to use Linear.

```json
"linear": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-linear"],
  "env": {
    "LINEAR_API_KEY": "REPLACE_ME"
  }
}
```

**Owner action**: linear.app → Settings → API → Personal API keys → Create key. Defer setup until Linear is actually adopted.

---

## 5. brave-search — neutral web search outside Firecrawl

**Why for Darshya**: Firecrawl is good for scrape + content extraction. Brave Search MCP gives raw SERP results without Firecrawl credit burn — useful when running 20 quick "does darshya rank for X" checks per day in the keyword-rank-tracker agent or during ad-hoc SEO triage. Free tier 2k queries/month.

```json
"brave-search": {
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-brave-search"],
  "env": {
    "BRAVE_API_KEY": "REPLACE_ME"
  }
}
```

**Owner action**: brave.com/search/api → sign up free → API Keys → generate. Free plan = 2k queries/month, no card required.

---

## Composite — paste this single block

If your `settings.json` has no `mcpServers` key, add this as a top-level sibling of `permissions`. If it has one, merge these entries into the existing object.

```json
"mcpServers": {
  "github": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-github"],
    "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "REPLACE_ME" }
  },
  "supabase": {
    "command": "npx",
    "args": ["-y", "@supabase/mcp-server-supabase", "--read-only"],
    "env": {
      "SUPABASE_ACCESS_TOKEN": "REPLACE_ME",
      "SUPABASE_PROJECT_REF": "REPLACE_ME"
    }
  },
  "cloudflare": {
    "command": "npx",
    "args": ["-y", "@cloudflare/mcp-server-cloudflare"],
    "env": {
      "CLOUDFLARE_API_TOKEN": "REPLACE_ME",
      "CLOUDFLARE_ACCOUNT_ID": "REPLACE_ME"
    }
  },
  "linear": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-linear"],
    "env": { "LINEAR_API_KEY": "REPLACE_ME" }
  },
  "brave-search": {
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-brave-search"],
    "env": { "BRAVE_API_KEY": "REPLACE_ME" }
  }
}
```

## Verify

After restart, in Claude Code:

1. `/mcp` — should list all 5 as `connected`.
2. `failed`: token wrong or scopes missing. Re-issue and re-paste.
3. `loading` >30s: `npx` install hung. Run `npm cache clean --force` then restart.

## Priority order (set first → set last)

| Order | MCP | Time | Biggest unlock |
|---|---|---|---|
| 1 | cloudflare | 5 min | Closes verify-before-declare-done gap on every CF Pages push |
| 2 | github | 5 min | Issue automation + PR review without `gh api` JSON parsing |
| 3 | supabase | 5 min | Inline prod SQL — replaces every `check-prod-tables.mjs` round-trip |
| 4 | brave-search | 5 min | Cheap SERP checks without Firecrawl credit burn |
| 5 | linear | 5 min | Only if/when Linear is adopted for sprint tracking |

Each `REPLACE_ME` is the only thing owner pastes. Total setup: ~25 min for all 5.
