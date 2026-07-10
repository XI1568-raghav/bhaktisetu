# Project Context — Darshya

> Detail in `docs/project-context-detail.md`. Last updated 2026-05-17.

## Identity

- **Product**: Darshya — India devotional super-app (live darshan, puja w/ video proof, content, gaushala seva, e-commerce, astrology, wellness, yatra).
- **Domain**: `darshya.online` · API `api.darshya.online`
- **Repo**: `E:\NewClaude\bhaktisetu` (folder legacy; `poojly_*` storage retained — never rename without migration).
- **Surfaces**: web (Render), API (Render), admin (Next), mobile (Expo 50), commerce (Prisma StoreProduct/StoreOrder).
- **Stack**: Next 15 + Fastify 5 + Prisma + Supabase Postgres. Detail → docs.

## Cross-platform contracts

- API prefix `/api/v1/*`. Shared client `packages/api-client`. Shared types `packages/shared`.
- Auth: JWT access + refresh. Web → cookies; mobile → expo-secure-store.
- Money: `Decimal(10,2)` → `formatPrice` → INR + USD. NRI 9-10× domestic.
- Booking #: `BS-YYYYMMDD-XXXXX`. 80G: `DR-YYYYMMDD-XXXX`.
- Roles (`UserRoleAssignment.isPrimary`): devotee, pandit, store_owner, astrologer, wellness_instructor, gaushala_manager, temple_manager, admin. Web↔API bridge: web `priest` ↔ API `pandit`.

## Conventions

- TS strict. Zod at every external boundary. Internal trusts types.
- Files kebab-case. Components PascalCase.
- Default no comments. Document non-obvious WHY only.
- Graceful degradation: every integration env-or-noop.
- Commits conventional.

## Business rules (immutable)

1. Video proof MANDATORY for puja bookings.
2. NRI pricing 9-10× domestic.
3. Platform commission 20-40% per temple.
4. Priest payout = price − commission, gated on Aadhaar.
5. Cancellation up to 24h before scheduled time.
6. Temples must be verified before live.
7. 80G receipt requires donee 80G regn + PAN.

## Tests

API: 416/416 green across 32 files (2026-05-17). Web/Admin/Mobile: 0 (pre-existing).
