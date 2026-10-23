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
- Money: `Decimal(10,2)` → `formatPrice` → INR + USD. NRI 2-3× domestic (2.5×), shown in USD, always charged as an INR order.
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
2. NRI pricing 2-3× domestic (2.5×). Shown in USD, charged as an INR Razorpay order; fees are not multiplied. Config: `apps/api/src/lib/nri-pricing.ts` + `apps/web/lib/nri-pricing.ts`.
3. Platform commission 20-40% per temple.
4. Priest payout = price − commission, gated on Aadhaar. (Unchanged by `REQUIRE_PROVIDER_APPROVAL`: earnings stay held until performed/proved and a payout still needs KYC + bank details.)
5. Cancellation up to 24h before scheduled time.
6. Temples must be verified before live. (Catalogue `Temple.isVerified` is unchanged. Since 2026-10 a temple MANAGER profile goes live without admin approval, and, since 2026-10-23, claiming an existing catalogue temple links the manager to it directly with no admin step.)
7. 80G receipt requires donee 80G regn + PAN.

## Provider approval

Off by default (`REQUIRE_PROVIDER_APPROVAL`, `docs/env-vars.md`, `docs/auth-model.md`): the six provider roles go live on submit. `Priest.isVerified` is never auto-set (TC-08).

## Tests

API: 416/416 green across 32 files (2026-05-17). Web/Admin/Mobile: 0 (pre-existing).
