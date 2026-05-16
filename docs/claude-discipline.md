# Claude Code context discipline — Darshya

> Per-turn token caps. Read on demand when you suspect bloat.

These rules keep sessions long. Auto-compact at ~200K tokens. Without discipline → compact at 2-3 chats. With discipline → 10-15 chats.

## Hard rules

- **Reads**: use `offset` + `limit` on Read. Never load whole files >500 lines. Unknown files → Read first 50 lines then targeted ranges.
- **Searches**: Grep with `head_limit` + targeted `glob`/`type`. Broad multi-round exploration → `Agent(subagent_type=Explore)` to keep results out of main context.
- **Vitest**: `--reporter=basic` not dot. Pipe through `2>&1 | tail -40` when only outcome matters.
- **Type-check**: `pnpm tsc --noEmit 2>&1 | head -20`. Don't dump full output.
- **Big work**: enter Plan mode. Don't plan in chat.
- **Bash output**: `head` / `tail` / `Select-Object -First N` on noisy commands (git log, ls, npm install).
- **Files you wrote**: don't Read back — harness tracks state.
- **Memory @-imports**: keep auto-loaded files ≤60 lines each. Spillover → `docs/*-detail.md`.

## Plugin discipline

- Disabled plugins (notion/figma/linear/gitlab/asana/playwright/cloudflare/sentry/supabase) save ~35K tokens/turn. Re-enable on demand in `~/.claude/settings.json`.
- Vercel + GitHub + context7 + typescript-lsp + superpowers + caveman + code-review + commit-commands stay always-on.
- Project `.mcp.json` (postgres/sentry/firecrawl) loads only when env vars set.

## Backup

`~/.claude/settings.json.bak-2026-05-17` — restore by `Copy-Item .bak ... settings.json`.
