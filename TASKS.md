# Tasks — Darshya

> Live ledger. History → `docs/handoff.md`. Completed log → `docs/tasks-history.md`. User gates → `docs/activation-gates.md`. Last: 2026-05-21.

## In progress

- (nothing — c9d9288 shipped, CF Pages build fixed via `f948e0d`, caveat doc `d63d660`. See `docs/handoff.md` 2026-05-21.)

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key on user paste | env-or-noop, user-paste required |
| E9 | TODO(W8): embedded Stripe Elements | clientSecret-only fallback (mirrors pujas page gap) |
| E10 | `getPublicPriests({ specialization?, deity? })` server-side filter | API enhancement, client-side filter works for now |

## Pending — user-action

→ `docs/activation-gates.md` (U1-U15).

**Prod migrations applied 2026-05-21** via `prisma db execute` against poojly Supabase. Verified via `apps/api/scripts/check-prod-tables.mjs` — 5/5 tables, 14/14 columns, `donations.gaushala_id` nullable. All 4 shipped.

## Recently completed (top 5)

| Date | Task | Commit |
|---|---|---|
| 2026-05-21 | docs(caveats): every dynamic route needs `runtime = 'edge'` for CF Pages | `d63d660` |
| 2026-05-21 | fix(web): edge runtime on `/pandits/[id]` + `/pujas/pandits/[id]` → CF Pages green | `f948e0d` |
| 2026-05-21 | docs/operational-context.md — every service + key + deploy mechanism | `1ec7745` |
| 2026-05-21 | W1-W8 bundle shipped + 4 prod migrations applied + verified (5 tbl/14 col/6 FK) | `c9d9288` |
| 2026-05-20 | W6-W8: E7 BE bundle + home-puja grids + dual-currency offering checkout | (in c9d9288) |
| 2026-05-20 | W1-W5: admin fix + 4 P0 + 4 P1 endpoints + booking checkout + pujas merge | (in c9d9288) |
| 2026-05-20 | Real-numbers admin + pandit puja chain | (in c9d9288) |
| 2026-05-19 | Auth-cascade fix + gaushala donations real API | `9e87aca` |
