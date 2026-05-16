# Darshya — Project Context

> Slim index. Load deeper docs as needed.
> Last refreshed: 2026-05-17.

## Persistent project memory (READ AT SESSION START)

Source of truth (conversation history wiped by /compact + /clear):

@PROJECT_CONTEXT.md
@ROADMAP.md
@TASKS.md

**Rules:**
1. At session start, load the three @-imports + current task. Build understanding from those, not prior chat.
2. When learning long-term info (architecture, cross-platform, business direction) — UPDATE the matching file. Show diff-style summary.
3. Before /compact or /clear — CONSOLIDATE: update the three files + write a short HANDOFF block in TASKS.md.
4. Treat these files as shared memory across agents + sessions.

## Identity (one-line)

Darshya — devotional super-app at https://darshya.online. Solo founder, $0 budget. Detail in `PROJECT_CONTEXT.md`.

## Context-discipline (CRITICAL — keeps sessions long)

These rules cap per-turn token bloat. Auto-compact at ~200K tokens; trim discipline buys ~12-15 chats per session instead of 2-3.

- **Reads**: use `offset` + `limit` on Read. Never load whole files >500 lines. For unknown files, Read first 50 then targeted ranges.
- **Searches**: use Grep with `head_limit` + targeted `glob`/`type`. For broad multi-round exploration, dispatch `Agent(subagent_type=Explore)` — keeps results out of main context.
- **Vitest**: `--reporter=basic` not dot. Pipe through `2>&1 | tail -40` when only outcome matters. Strip ANSI on need.
- **Type-check**: `pnpm tsc --noEmit 2>&1 | head -20`. Don't dump full output.
- **Big work**: enter Plan mode. Don't plan in chat.
- **Bash output**: `head` / `tail` / `Select-Object -First N` on noisy commands (git log, ls, npm install).
- **Files written by you**: don't Read back — harness tracks state.
- **Memory @-imports**: keep the three files ≤60 lines each. Spillover → `docs/*-detail.md`, `docs/*-archive.md`, `docs/*-history.md`.

## Tech stack (current)

Monorepo: Turborepo + pnpm. Web: Next 15 → CF Pages. API: Fastify 5 + Prisma → Render. DB: Supabase Postgres. Mobile: Expo 50. Commerce: MedusaJS. AI: Groq. Payments: Razorpay + Stripe. Streaming: AWS IVS. Cache: Upstash Redis. Email: Resend. Storage: R2. Errors: Sentry. Analytics: PostHog + CF. CMS: Sanity. Panchang: `mhah-panchang`.

Full integration table + free-tier notes → `docs/project-context-detail.md`.

## Repo layout

```
apps/{web,api,admin,mobile,medusa-store}
packages/{ui,shared,api-client,analytics}
```

## Conventions

- TS strict everywhere.
- Zod at every external boundary; internal trusts types.
- React Query for ALL frontend API calls.
- Files kebab-case; components PascalCase.
- API routes `/api/v1/*`.
- Money `Decimal(10,2)` → `formatPrice` → INR + USD always.
- Booking `BS-YYYYMMDD-XXXXX`; 80G `DR-YYYYMMDD-XXXX`.
- **Default no comments**. Document non-obvious WHY only. Never narrate WHAT.
- **Graceful degradation**: every integration env-or-noop.

## Business rules

In `PROJECT_CONTEXT.md`. Video proof mandatory, NRI 9-10×, commission 20-40%, etc.

## Deeper docs

| File | When |
|---|---|
| `docs/launch-state.md` | Read first for current launch progress, recent files, open user items |
| `docs/project-context-detail.md` | Full integrations + gotchas + recently shipped + doc map |
| `docs/roadmap-archive.md` | Shipped phases + tripwires + future direction + revenue lines |
| `docs/tasks-history.md` | Completed task log beyond top 3 |
| `docs/auth-model.md` | Token formats, demo accounts, middleware ordering |
| `docs/env-vars.md` | Every env var + behavior when absent |
| `docs/glossary.md` | Domain terms |
| `docs/caveats.md` | "Do not touch unless asked" gotchas |
| `docs/mobile-plan.md` | Mobile parity multi-phase plan |
| `docs/skill-workflow-map.md` | Which Claude Code skill for which business-ops workflow |

## How future sessions should use this

1. Read this file first; the @-imports auto-load.
2. Run `TaskList` to see in-progress work.
3. Load deeper docs only when relevant.
4. Verify "memory says X exists" by reading current source before acting.
5. New integration → env-or-noop pattern (`docs/env-vars.md`).
6. Update `docs/launch-state.md` when state materially changes.
