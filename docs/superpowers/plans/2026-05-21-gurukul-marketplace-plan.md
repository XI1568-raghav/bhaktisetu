# Gurukul Marketplace — Implementation Plan

> Status: SHIPPED · Spec: `../specs/2026-05-21-gurukul-marketplace-design.md`

## Phases (all completed)

1. **DB** — `20260521010000_gurukuls` (gurukul + program tables), `20260521020000_gurukul_applications` (application + status enum). Prisma models + relations on `User`.
2. **API** — `routes/gurukuls.ts` (public list + detail + owner CRUD), `routes/gurukul-applications.ts` (POST submit with DPDP minor refine + status workflow), `routes/gurukul-portal.ts` (owner inbox + PATCH decisions). Tests in `gurukul-applications.test.ts`.
3. **Web** — `/gurukuls` (list + filters), `/gurukuls/[slug]` (detail), `/gurukuls/apply/[programId]` (DPDP form), `/become-gurukul` (owner reg), `/gurukul-portal` + `/gurukul-portal/applications` (owner UI). All edge runtime.
4. **Mobile** — `(devotee)/gurukuls.tsx`, `gurukul-detail.tsx`, `gurukul-apply.tsx`. Registered in `(devotee)/_layout.tsx`.

## Deploy steps

1. Apply 2 migrations via `prisma db execute` (DIRECT_URL).
2. Verify via `apps/api/scripts/check-prod-tables.mjs`.
3. CF Pages env: `NEXT_PUBLIC_GURUKUL_ENABLED=true`.
4. CF Pages rebuild.

## Schema review hardening (post-incident)

`submitSchema` updated 2026-05-25: minor (age<18) must use `applicantType='parent'` — previously schema permitted `self` so long as guardian fields were filled. Test added.

## Rollback

- Feature flag flip.
- Migrations additive — safe to retain.
