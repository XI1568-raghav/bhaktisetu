# Graft code-graph — Darshya integration (2026-08-06)

The repo is indexed by **Graft** (NanoNets [`@nanonets/graft@0.8.2`](https://github.com/NanoNets/Graft)) — an open-source context layer that maps the codebase into a graph of **nodes (files/symbols) and edges (calls/imports)**, so the coding agent starts oriented instead of grepping from cold. Claimed benefit: −46% tool calls, −42% tokens, −60% latency, +33% on SWE-bench. The structural graph is pure tree-sitter — **deterministic, no LLM key, $0**.

## What was done

| Piece | Where | State |
|---|---|---|
| CLI | global `graft` 0.8.2 | installed |
| MCP server (6 tools) | `.mcp.json` → `mcpServers.graft` | committed (PR #234) |
| Statusline + 5 hooks | `.claude/settings.json` | committed (PR #234) |
| Skill + shims | `.claude/skills/graft/SKILL.md`, `.claude/helpers/graft-*.cjs` | committed (PR #234) |
| Ignore rules | `.gitignore` (`/graft/` anchored + `.claude` re-include), `.ignore` (cards greppable) | committed (PR #234) |
| Graph (data) | `graft/` — 7,132 nodes / 14,365 edges / 1,437 cards | **local, gitignored** |
| Global wiring | `~/.claude.json` `mcpServers.graft` + global `~/.claude/CLAUDE.md` doctrine | machine-level |

**6 MCP tools:** `graft_find_code` (query), `graft_file_api` (file signatures), `graft_trace_calls` (callers/blast-radius), `graft_find_all` (regex/literal, grouped by symbol), `graft_repo_map` (orientation), `graft_check_freshness` (drift).

## Load-bearing Windows fix

`graft init` emits hook/statusline commands as `${CLAUDE_PROJECT_DIR:-.}`. The `:-` POSIX default-expansion **literal-corrupts the path under Git-Bash on win32** (`E:\...:-.`). All commands in `.claude/settings.json` were rewritten to plain `$CLAUDE_PROJECT_DIR` (matches the machine's existing working hooks). **If you re-run `graft init`, re-apply this strip.**

## The graph (local, regenerable — never committed)

`graft/` is a local cache (like `node_modules`), gitignored via anchored `/graft/`. It is **not** in the PR; each machine builds its own.

- **Structural (free, no key):** `graft build` — wiring graph + per-file cards.
- **Deep (LLM, optional):** adds concept nodes + per-symbol summary/crux. Run via the local Blackbox proxy with kimi-k3:
  ```powershell
  $env:GRAFT_PROVIDER="openai"; $env:GRAFT_BASE_URL="http://127.0.0.1:8787/v1"
  $env:GRAFT_API_KEY="proxy"; $env:GRAFT_MODEL="blackboxai/moonshotai/kimi-k3"
  graft build --deep -j 6
  ```
  Cached by content hash — re-runs only touch changed files. Built 2026-08-06; ~955 concept nodes computed; per-symbol summary tail resumed for the remaining pending. One transient proxy connection error occurred on `apps/web/app/error.tsx` (re-run fills it).

Every graft query auto-refreshes the graph structurally first (~3 ms stat probe, $0, no LLM), so answers describe the code as it is right now — uncommitted edits included.

## How to use (doctrine)

Reach for graft **before** Grep/Glob/Read for find / understand / trace / scope:
- locate + understand → `graft_find_code` / `graft ask "<task>"`
- a file's API → `graft_file_api` / `graft skeleton <file>`
- **blast radius before any refactor/rename/multi-file edit** → `graft_trace_calls <sym> depth=all` / `graft callers <sym> --depth all`
- every occurrence → `graft_find_all` / `graft grep "<literal>"`
- orient in unfamiliar repo → `graft_repo_map` / `graft map`
- monorepo scope → add `in: "apps/web/"` (or `--in`) to scope to one sub-project

## Pending

1. **Merge PR #234** (wiring).
2. **Restart Claude Code** to load the graft MCP server into the session.
3. Optional: re-run `graft build --deep` to top up any pending per-symbol summaries (cached, cheap).
