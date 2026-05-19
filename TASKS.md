# Tasks — Darshya

> Live ledger. Completed history in `docs/tasks-history.md`.
> User-action gates in `docs/activation-gates.md`.
> Last updated: 2026-05-19.

## HANDOFF (2026-05-19, post P1-P4 provider portal overhaul)

**Shipped** (`bcadee6`):
- P1 — Dashboard stats default to zero on empty profile for all 6 provider roles. Dynamic growth from real Prisma aggregates.
- P2 — PATCH /profile across astrologer/wellness/gaushala portals; FE rewired (drop localStorage stubs).
- P3 — Gaushala cows + volunteers full CRUD (API routes + Prisma models + migration + FE pages). Register/View Health/Add Volunteer modals all wired.
- P4 — Verification documents widget now reads `/provider-kyc` (PAN/Aadhaar masked/AddressProof/Selfie) replacing 4-doc hardcoded list.
- Site-wide WhatsApp click-to-chat button (z-59, below cart z-60) with greeting prefill.
- CORS: explicit methods + allowedHeaders to unblock PATCH preflight (`6f8ca24`).

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
