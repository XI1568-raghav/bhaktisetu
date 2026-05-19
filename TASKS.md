# Tasks — Darshya

> Live ledger. Completed history in `docs/tasks-history.md`.
> User-action gates in `docs/activation-gates.md`.
> Last updated: 2026-05-19.

## HANDOFF (2026-05-19, post auth-cascade fix)

**Shipped** (`9e87aca`):
- Root-cause fix: `authenticateUser` looked up Prisma user by phone only — email signups (no phone) 401'd everywhere. Patched to id→email→phone fallback. Unblocks KYC load, profile save, cow add, volunteer add, gaushala onboarding submit.
- Added GET `/api/v1/gaushala-portal/donations` (status mapping pending→created, received→paid).
- Rewrote `gaushala-portal/donations` page on real API. Dropped D001-D008 dummy + 3 fake campaigns.

**Prior ship** (`bcadee6`, `4ae5573`):
- P1 — Dashboard stats zero-default for all 6 provider roles.
- P2 — PATCH /profile across astrologer/wellness/gaushala portals.
- P3 — Gaushala cows + volunteers full CRUD (routes + Prisma models + migration + FE).
- P4 — Verification documents widget on `/provider-kyc`.
- Site-wide WhatsApp click-to-chat (z-59).
- CORS: explicit methods + allowedHeaders (`6f8ca24`).

**Migration to deploy**: `20260519000000_gaushala_cows_volunteers` — creates `cows`, `cow_health_records`, `volunteers` tables. Render `start` script runs `prisma migrate deploy` auto.

**Active investigation**:
- `/admin/users` + `/admin/approvals` returning 500 in prod (from prior handoff, not addressed this session).

**Next**:
1. Push to origin → Render API + CF Pages auto-deploy.
2. Verify migration ran on Supabase (cows/volunteers tables exist).
3. Smoke-test register cow, add volunteer, edit profile across 3 roles in prod.
4. Triage admin 500 (still open from prior handoff).
5. Confirm `ALLOW_DEMO_PAYMENTS=true` on Render.

## In progress

- (nothing — handoff fresh)

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key on user paste | env-or-noop; native push live automatically |
| E3 | Triage admin /users + /approvals 500s | check Render logs; possibly env regression |

## Pending — user-action

→ `docs/activation-gates.md` (U1-U15).

## Recently completed (top 3)

| Date | Task | Commit |
|---|---|---|
| 2026-05-19 | P1-P4 provider portal overhaul (CRUD + KYC + WhatsApp) | `bcadee6` |
| 2026-05-17 | Context trim v2 + admin role-edit | settings + `e4b2f37` |
| 2026-05-17 | Persist primary role + stub provider profile on signup | `a103379` |
