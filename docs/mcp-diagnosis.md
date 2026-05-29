# MCP Server Diagnosis — 2026-05-30

Diagnoses why ~5 MCP servers show **not connected** in Claude Code statusline. Source: enumerated `enabledPlugins`, `enabledMcpjsonServers`, and every `.mcp.json` in plugin cache.

## TL;DR

Currently connected (this session): **firecrawl** + **ide**.

Loaded-but-disconnected candidates (depending on which CWD launches Claude Code):

| # | Server | Type | Why disconnected | Necessary? |
|---|---|---|---|---|
| 1 | `postgres` | stdio (project `.mcp.json`) | `DATABASE_URL` env not set in shell | **NO** (Prisma CLI covers it) |
| 2 | `github` | HTTP | `GITHUB_PERSONAL_ACCESS_TOKEN` env not set | **MAYBE** (`gh` CLI already used) |
| 3 | `figma` | HTTP+OAuth | Not authorized via Figma OAuth | **NO** (no Figma assets in repo) |
| 4 | `vercel` | HTTP+OAuth | Not authorized via Vercel OAuth | **NO** (deploy is Cloudflare + Render) |
| 5 | `serena` | stdio (`uvx`) | `uvx` (Python `uv`) not installed | **NO** (LSP coverage via VS Code) |
| 6 | `context7` | stdio (`npx`) | npx call timing out / network | Optional (docs lookup) |
| 7 | `playwright` | stdio (`npx`) | npx install on first run | Optional (browser test) |

Of these, **none are strictly required** for the Darshya MVP1 push. Two are worth wiring: `github` (faster than `gh` CLI for PR/issue automation) and optionally `supabase`/`sentry` later for prod observability.

## Where the configs live

- **User scope**: `C:\Users\DELL\.claude\settings.json`
  - `enabledMcpjsonServers: ["postgres"]` → consents to project-defined postgres MCP
  - `enabledPlugins` (relevant): `superpowers`, `caveman`, `typescript-lsp`, **`github`**, `commit-commands`. Many others present but explicitly `false`.
- **Project scope** (Darshya root `E:\NewClaude`): `.claude/settings.json` enables only superpowers + frontend-design + 7 designer-skills + claude-red. None ship MCP servers.
- **Subproject** (`E:\NewClaude\bhaktisetu\apps\api\.claude\settings.json`): enables `context7`, `playwright`, `figma`, `vercel`, `serena` plugins. **Only loads when CWD = `apps/api`.** That CWD launch produces 5 extra HTTP/stdio MCP attempts.
- **Project `.mcp.json`** (`E:\NewClaude\bhaktisetu\.mcp.json`): defines `postgres` → `@modelcontextprotocol/server-postgres ${env:DATABASE_URL}`.

The "5 disconnected" count almost certainly comes from launching Claude Code from `apps/api` — at that CWD, 6 MCP attempts happen (postgres + context7 + playwright + figma + vercel + serena) and only context7/playwright succeed if `npx` works; the other 4-5 fail = "5 not connected".

## Per-server fix steps

### postgres (stdio)
- Defined: `apps/api/.mcp.json` referenced via user `enabledMcpjsonServers`.
- Needs: `DATABASE_URL` in shell where Claude Code launches.
- Fix: `export DATABASE_URL=...supabase pooler URL...` then relaunch. Or remove `"postgres"` from `enabledMcpjsonServers` since Prisma CLI + `apps/api/scripts/check-prod-tables.mjs` already cover prod DB queries.
- **Recommend: remove.** Don't expose prod DB to MCP layer.

### github (HTTP, `Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}`)
- Defined: plugin cache `claude-plugins-official\github\unknown\.mcp.json`.
- Needs: `GITHUB_PERSONAL_ACCESS_TOKEN` env (PAT with `repo` + `workflow` + `issues` scopes).
- Fix: GH → Settings → Developer Settings → PAT → create classic token → `export GITHUB_PERSONAL_ACCESS_TOKEN=ghp_...` in launch shell, relaunch. The `agent-issue-filer` script already uses `GITHUB_TOKEN`; reuse that or generate a new PAT.
- **Recommend: keep.** Faster issue/PR ops than `gh` CLI calls.

### figma (HTTP+OAuth)
- Needs: OAuth flow on first connect (browser auth).
- Fix: triggers automatically on first MCP call; if fail, disable in `apps/api/.claude/settings.json` (`"figma@claude-plugins-official": false`).
- **Recommend: disable.** No Figma usage in Darshya.

### vercel (HTTP+OAuth)
- Needs: OAuth flow.
- Fix: disable in `apps/api/.claude/settings.json`.
- **Recommend: disable.** Deploy = Cloudflare Pages + Render, not Vercel.

### serena (stdio `uvx`)
- Needs: Python `uv` toolchain installed and `uvx` on PATH. `pip install uv` or `winget install --id astral-sh.uv`.
- **Recommend: disable.** TypeScript LSP already shipped via typescript-lsp plugin. Serena = symbolic code intelligence in Python; redundant for this stack.

### context7 (stdio `npx -y @upstash/context7-mcp`)
- Needs: Node + npx + network for first install.
- Fix: pre-warm with `npx -y @upstash/context7-mcp --version` once. Or disable.
- **Recommend: keep if you use it for docs lookup, else disable.**

### playwright (stdio `npx @playwright/mcp@latest`)
- Needs: Node + npx + Chromium download on first run (~200 MB).
- **Recommend: disable** for now (heavy). Use `puppeteer` via Bash if browser test needed.

## Recommended cleanup edit

Edit `E:\NewClaude\bhaktisetu\apps\api\.claude\settings.json` — flip these to `false`:

```diff
- "figma@claude-plugins-official": true,
- "vercel@claude-plugins-official": true,
- "serena@claude-plugins-official": true,
+ "figma@claude-plugins-official": false,
+ "vercel@claude-plugins-official": false,
+ "serena@claude-plugins-official": false,
```

Then in `C:\Users\DELL\.claude\settings.json` either:
- Set `GITHUB_PERSONAL_ACCESS_TOKEN` env in launch shell, OR
- Flip `github@claude-plugins-official` to `false` if `gh` CLI is enough.

Drop `"postgres"` from `enabledMcpjsonServers` array — prod DB shouldn't be MCP-exposed.

Result: from ~5 disconnected → 0 disconnected, only firecrawl + ide remaining (the two that actually work).

## What MCPs Darshya could actually benefit from (future)

- **sentry** — once U6 Sentry DSN is set, MCP lets you query prod errors from chat. Worth enabling then.
- **supabase** — official Supabase MCP. Useful for prod schema queries without leaving chat. Needs Supabase access token. Enable post-MVP1.
- **firecrawl** — already connected. Used heavily for competitor scrape / SERP / docs lookup.

Nothing else moves the needle for the Day-90 plan.
