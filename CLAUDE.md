# Darshya

@PROJECT_CONTEXT.md
@ROADMAP.md
@TASKS.md

Devotional super-app at https://darshya.online. Solo founder, $0 budget.
Repo `E:\NewClaude\bhaktisetu` (folder legacy; `poojly_*` storage retained — never rename).

## Rules

- Session start: load 3 @-imports + current task. Build from those, not prior chat.
- New long-term info (architecture, cross-platform, business) → UPDATE matching file.
- Before /compact or /clear → write HANDOFF block in `docs/handoff.md` (append-only archive, NOT @-imported). **Never in TASKS.md** — TASKS.md is @-imported above, so every byte is charged to every session in this repo. Keep it a LIVE ledger only, under 25 KB; move a block to `docs/handoff.md` as soon as it stops being actionable. (It reached 232 KB / ~58k tokens per session before the 2026-08-10 trim.)
- Treat 3 files as shared memory across agents + sessions.
- Verify "memory says X" by reading current source before acting.
- **Web deploy = Render (NOT Cloudflare Pages).** `darshya.online` + `www` CNAME → `darshya-web.onrender.com` (Render docker, Next standalone `apps/web/Dockerfile`, Node runtime). Cloudflare is DNS + edge proxy only. Runbook: `docs/render-web-cutover-runbook.md`. Workflows: `render-cutover.yml` (`workflow_dispatch`), `deploy-web-render.yml` (docker smoke), `render-diag.yml` (deploy/diagnose).
- **A push builds NOTHING. Both Render services are `autoDeploy: false`** (`render.yaml:28` API, `:60` web), so merging to `main` costs zero build minutes and changes nothing in production until a deploy is dispatched by hand (verified 2026-10-04: Render's API reads `autoDeploy: "no"` for the API service, switched off by the owner at 06:36Z that day; it had read `yes` from at least 2026-09-09, so a doc dated in between that says the API deploys on push describes that window, and the dashboard can be flipped back, so re-check with `render-diag.yml -f mode=detail` before relying on this):
  `gh workflow run render-diag.yml -f mode=deploy -f sid=<SID>`
  The old `branch` input is DEPRECATED and IGNORED by Render — the workflow says so in its own
  input description. Render deploys the branch the service tracks. The lever that selects what
  ships is `-f commit=<SHA>`, which is also the rollback.
  (API `srv-d7mc2n8sfn5c73dfce0g`, web `srv-d970l2ks728c738fc33g`; roll back with `-f commit=<SHA>` — see `docs/runbooks/prod-rollback.md`.)
  This line used to claim that a push to `main` triggered a build on each service and that both deployed themselves from it — false since the 2026-07-08 cutover (the retired wording is quoted in full in `docs/audit/LEDGER.json` under `OPS-06`, which is the one place exempt from the rollback-honesty scan precisely so the record can keep it verbatim), and the highest-leverage wrong sentence in the repo, because every agent session reads this file and then reasons about deploys from it. Corrected 2026-09-02 (`OPS-06`). The 2026-06-15→17 incident that motivated the original warning was real, but its cause is gone: ~120 commits burned the free-tier pipeline-minutes quota back when pushes did build. Render Build Filter should scope: `darshya-web` → `apps/web/**, packages/**, package.json, pnpm-lock.yaml`; `bhaktisetu-api` → `apps/api/**, packages/**, package.json, pnpm-lock.yaml`. (`[skip render]` in a commit subject is now pointless — nothing watches a push at all; the build filters below only matter for a dispatched deploy.)
- **Batch commits before pushing.** Stage all session work, push once. Multiple `git push` calls in same session = waste. Prefer single push at session end.
- **Conventional Commits (enforced).** Every commit message MUST follow `type(scope): subject` — see `commitlint.config.js`. Types: `feat|fix|docs|style|refactor|perf|test|ci|chore|build|revert|security`. Scope lowercase (`api|web|admin|mobile|prisma|render|cf|ci|agents`). Subject imperative + lowercase + no trailing period, ≤100 chars. Enforced server-side by `.github/workflows/commitlint.yml` on every PR (runs on all PRs incl. docs-only — the one gate never skipped). End commit bodies with the current model's `Co-Authored-By: Claude <model> <noreply@anthropic.com>` trailer when Claude authored — do not pin a specific version here, it goes stale and fails the review gate.
- **Docker-image smoke (Render path).** `.github/workflows/deploy-web-render.yml` builds the image, boots Next standalone, and runs 9 curl checks (`/`, sitemap, robots, an API route, the `/kundli` redirect, a `/_next/static` asset, two `[slug]` prerendered-route body markers). **`ci.yml` does NOT cover this:** it runs `next build` via turbo and never touches the Dockerfile, so a green CI says nothing about whether Render can build. It runs on PRs touching the Dockerfile, `next.config.*`, the workspace manifests or the lockfile (not every `apps/web` change: a docker build is ~8 min). Run it by hand before any web deploy: `gh workflow run deploy-web-render.yml --ref main`. The Dockerfile's standalone-copy guards (static + public + server.js) fail the build on a partial standalone. (History: from 2026-07-08 to 2026-09-04 its trigger was pinned to a dead branch and it ran on nothing; image builds were broken for three weeks.)

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
| `docs/free-tier-budgets.md` | **READ before any new workflow/cron/integration/SDK.** GH Actions 2000 min/mo + Resend 100/day + Supabase 500MB + Render 750hr + commit batching + per-agent throttle rules. Last incident 2026-05-28. |
| `docs/mobile-plan.md` | Mobile parity multi-phase plan |
