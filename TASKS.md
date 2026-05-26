# Tasks — Darshya

> Live ledger. History → `docs/handoff.md`. Completed log → `docs/tasks-history.md`. User gates → `docs/activation-gates.md`. Last: 2026-05-27.

## In progress

- (nothing — agent fleet shipped 2026-05-27. See `docs/ceo-roadmap-2026-05-27.md` + `/admin/agents`. 9 agents, 3 GH workflows, real artifacts in `docs/agent-reports/`.)

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key on user paste | env-or-noop, user-paste required |
| E9 | TODO(W8): embedded Stripe Elements | clientSecret-only fallback (mirrors pujas page gap) |
| E10 | `getPublicPriests({ specialization?, deity? })` server-side filter | API enhancement, client-side filter works for now |

## Pending — user-action

→ `docs/activation-gates.md` (U1-U15).

**U16 (new):** Flip Cloudflare Pages env vars `NEXT_PUBLIC_KNOWLEDGE_ENABLED=true` and `NEXT_PUBLIC_GURUKUL_ENABLED=true`, then rebuild. (Optional: `KNOWLEDGE_CONTENT_DIR` on Render if API container ships MDX.)

**U17 DONE 2026-05-27** — secrets set, default branch flipped main, fleet verified green (c4a1495, 6 reports).

**U18 (new):** Set `CRON_AUTH_TOKEN` GH secret (matching Render env) so daily-cron workflow stops failing. If not set in Render either: generate `openssl rand -hex 32` + set both places. Currently daily-cron exits 1 at precheck.

**Prod migrations applied 2026-05-25** via `prisma db execute` against poojly Supabase. Verified via `apps/api/scripts/check-prod-tables.mjs` — 11/11 tables, 28/28 columns, 6/6 FKs. 7 total shipped now (5 prior + 3 fresh: lessons/streaks/badges + 2 gurukul migrations).

## Recently completed (top 5)

| Date | Task | Commit |
|---|---|---|
| 2026-05-27 | feat: agent fleet (9 agents) + CEO roadmap + /admin/agents + 3 GH workflows | pending |
| 2026-05-26 | feat(mobile): gurukul owner parity — become-gurukul + portal screens (89/89 smoke) | `d170b39` |
| 2026-05-25 | feat: sample gurukul seed + admin moderation + signin fix | pending |
| 2026-05-25 | feat: knowledge hub + gurukul marketplace + admissions (188 files, 3 migrations applied to prod) | `bda6a0b` |
| 2026-05-21 | docs(caveats): every dynamic route needs `runtime = 'edge'` for CF Pages | `d63d660` |
| 2026-05-21 | fix(web): edge runtime on `/pandits/[id]` + `/pujas/pandits/[id]` → CF Pages green | `f948e0d` |
| 2026-05-21 | docs/operational-context.md — every service + key + deploy mechanism | `1ec7745` |
| 2026-05-21 | W1-W8 bundle shipped + 4 prod migrations applied + verified (5 tbl/14 col/6 FK) | `c9d9288` |
| 2026-05-20 | W6-W8: E7 BE bundle + home-puja grids + dual-currency offering checkout | (in c9d9288) |
| 2026-05-20 | W1-W5: admin fix + 4 P0 + 4 P1 endpoints + booking checkout + pujas merge | (in c9d9288) |
| 2026-05-20 | Real-numbers admin + pandit puja chain | (in c9d9288) |
| 2026-05-19 | Auth-cascade fix + gaushala donations real API | `9e87aca` |
