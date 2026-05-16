# Tasks — Darshya

> Live ledger. Completed history in `docs/tasks-history.md`.
> User-action gates in `docs/activation-gates.md`.
> Last updated: 2026-05-17.

## HANDOFF (2026-05-17, post context-trim + admin role-wire)

**Shipped**:
- Signup persists primary role + stub provider profile e2e (`a103379`).
- Admin Users role-edit + stub provider seed on role change (`e4b2f37`).
- Context-trim v2: disabled 9 unused plugins (notion/figma/linear/gitlab/asana/playwright/cloudflare/sentry-plugin/supabase). ~35K tokens/turn saved. **Requires Claude Code restart to apply.**
- CLAUDE.md chain trimmed; user-action gates de-dup → `docs/activation-gates.md`.

**Active investigation**:
- `/admin/users` + `/admin/approvals` returning 500 in prod. Possibly downstream of Render env state post-branch-switch.

**Next**:
1. Triage 500: check Render logs for stack trace at `/admin/users` + `/admin/approvals`.
2. Confirm `ALLOW_DEMO_PAYMENTS=true` set on Render.
3. Verify Survagya e2e flow once 500 resolved.

## In progress

- Investigate admin 500s.

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key on user paste | env-or-noop; native push live automatically |

## Pending — user-action

→ `docs/activation-gates.md` (U1-U15).

## Recently completed (top 3)

| Date | Task | Commit |
|---|---|---|
| 2026-05-17 | Context trim v2 + admin role-edit | settings + `e4b2f37` |
| 2026-05-17 | Persist primary role + stub provider profile on signup | `a103379` |
| 2026-05-17 | Signup web↔API role enum mapping | `8b87dfb` |
