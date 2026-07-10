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
- **Web deploy = Render (NOT Cloudflare Pages).** Cutover complete 2026-07-08 — `darshya.online` + `www.darshya.online` now CNAME → `darshya-web.onrender.com` (Render docker, Next standalone `apps/web/Dockerfile`), DNS proxied through CF edge (`server: cloudflare` + `x-render-origin-server: Render`). CF Pages project `darshya` auto-deploy KILLED 2026-07-08 (`cf-kill-zombie.yml`); last frozen deploy preserved as rollback. CF is now DNS + edge proxy only — no Pages build pipeline, no 500/mo quota, no `next-on-pages`, no edge-runtime constraints. Runbook: `docs/render-web-cutover-runbook.md`. Workflow: `.github/workflows/render-cutover.yml` (autonomous, `workflow_dispatch`) + `deploy-web-render.yml` (CI smoke) + `render-diag.yml` (operational telescope).
- **Every push = 1 Render WEB build + 1 Render API build.** Both Render services auto-deploy on main push (Render does NOT honor `[skip ci]`). Cap = pipeline minutes/mo. Render Build Filter should scope: `darshya-web` → `apps/web/**, packages/**, package.json, pnpm-lock.yaml`; `bhaktisetu-api` → `apps/api/**, packages/**, package.json, pnpm-lock.yaml`. Append `[skip render]` to commit subject for docs-only commits (Render ignores it, but signals intent + lets a future filter key off it). Incident 2026-06-15→17: ~120 commits burned Render free-tier pipeline-minutes quota.
- **Batch commits before pushing.** Stage all session work, push once. Multiple `git push` calls in same session = waste. Prefer single push at session end.
- **Conventional Commits (enforced).** Every commit message MUST follow `type(scope): subject` — see `commitlint.config.js`. Types: `feat|fix|docs|style|refactor|perf|test|ci|chore|build|revert|security`. Scope lowercase (`api|web|admin|mobile|prisma|render|cf|ci|agents`). Subject imperative + lowercase + no trailing period, ≤100 chars. Enforced server-side by `.github/workflows/commitlint.yml` on every PR (runs on all PRs incl. docs-only — the one gate never skipped). End commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` when Claude authored.
- **Pre-push web smoke (Render path).** `.github/workflows/deploy-web-render.yml` builds the Docker image, boots Next standalone, and curls `/` + sitemap + robots + API route + `/kundli` redirect + a `/_next/static` asset (9 checks incl. two `[slug]` prerendered-route body-marker checks). The Dockerfile's standalone-copy guards (static + public + server.js) fail the build on a partial standalone. No more `next-on-pages` preflight — that script + the `.githooks/pre-push` CF hook are dead code post-cutover (cleanup pending).
- **Edge-runtime constraints REMOVED.** Under CF Pages + `next-on-pages`, every dynamic route needed `runtime='edge'` and `apps/web/middleware.ts` forced all routes edge. Render runs Next standalone on Node — no edge-runtime requirement, no 3 MiB worker bundle limit, no `generateStaticParams`+edge mutual exclusion. `apps/web/middleware.ts` was a build-breaker on `@cloudflare/next-on-pages` (hotfix 9c71e60b) — on Render it's a non-issue. Standard Next Node runtime applies.

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
