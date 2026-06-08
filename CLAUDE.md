# Darshya

@PROJECT_CONTEXT.md
@ROADMAP.md
@TASKS.md

Devotional super-app at https://darshya.online. Solo founder, $0 budget.
Repo `E:\NewClaude\bhaktisetu` (folder legacy; `poojly_*` storage retained — never rename).

## Rules

- Session start: load 3 @-imports + current task. Build from those, not prior chat.
- New long-term info (architecture, cross-platform, business) → UPDATE matching file.
- Before /compact or /clear → write HANDOFF block in TASKS.md.
- Treat 3 files as shared memory across agents + sessions.
- Verify "memory says X" by reading current source before acting.
- **Every push = 1 CF Pages build. Cap 500/mo.** Before pushing, check if commit is docs-only or non-deploy (TASKS.md / ROADMAP.md / PROJECT_CONTEXT.md / docs/** / *.md only / scripts/agents/** with no `apps/web/**` change). If yes → append `[skip ci]` to commit subject line. CF Pages git integration skips queue entirely → no build, no quota burn. Incident 2026-05-30: docs-only `a358f92` pushed without tag, blocked at 500/500 along with `72a6da1` code commit.
- **Batch commits before pushing.** Stage all session work, push once. Multiple `git push` calls in same session = waste. Prefer single push at session end.
- **MANDATORY pre-push CF Pages preflight (NEVER skip, NEVER use --no-verify).** `bash scripts/preflight-cf-pages.sh` runs the EXACT `@cloudflare/next-on-pages` build CF runs in prod. Pre-push git hook at `.githooks/pre-push` auto-enforces (activate via `git config core.hooksPath .githooks` — done in repo). Catches what `next build` misses: dynamic route without `runtime='edge'`, middleware.ts forcing route-level edge, invalid prerender configs. Incidents 2026-06-08 (CSP middleware + /pujas searchParams) both would have been caught.
- **Edge-runtime triggers** (each requires `export const runtime = 'edge'` on EVERY non-static route):
  1. `apps/web/middleware.ts` present at root → forces ALL routes to declare edge
  2. Page using `searchParams` in server component (becomes dynamic)
  3. Page using `headers()` / `cookies()` / `draftMode()` from `next/headers`
  4. `revalidate = 0` (force-dynamic)
  Before adding ANY of these features: plan migration sweep for all ~250 routes OR confine to a single edge-runtime'd page. PUSH PREFLIGHT WILL BLOCK YOU OTHERWISE.

## Deeper docs (lazy-load)

| File | When |
|---|---|
| `docs/claude-discipline.md` | Context-discipline rules + plugin policy |
| `docs/activation-gates.md` | U1-U15 user-action blockers |
| `docs/future-plans.md` | Single-glance: near-term + Q3 candidates + revenue + tripwires + mobile remaining |
| `docs/operational-context.md` | Every external service + key location + deploy mechanism (Render/CF/Supabase/Razorpay/Stripe/cron) |
| `docs/launch-state.md` | Current launch progress, recent files, open items |
| `docs/project-context-detail.md` | Full integrations + gotchas + recently shipped |
| `docs/roadmap-archive.md` | Shipped phases + tripwires + future direction |
| `docs/tasks-history.md` | Completed task log beyond top 3 |
| `docs/auth-model.md` | Token formats, demo accounts, middleware ordering |
| `docs/env-vars.md` | Every env var + behavior when absent |
| `docs/caveats.md` | "Do not touch unless asked" gotchas |
| `docs/cf-worker-budget.md` | CF Pages 3 MiB worker limit — READ before adding `runtime='edge'` |
| `docs/free-tier-budgets.md` | **READ before any new workflow/cron/integration/SDK.** GH Actions 2000 min/mo + CF builds 500/mo + Resend 100/day + Supabase 500MB + Render 750hr + commit batching + per-agent throttle rules. Last incident 2026-05-28. |
| `docs/mobile-plan.md` | Mobile parity multi-phase plan |
