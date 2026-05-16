# Project Context — Darshya

> Slim index. Detail in `docs/project-context-detail.md`.
> Last updated: 2026-05-17.

## Identity

- **Product**: Darshya — India's devotional super-app (live darshan, puja w/ video proof, content, gaushala seva, e-commerce, astrology, wellness, yatra).
- **Domain**: https://darshya.online · API https://api.darshya.online
- **Repo**: `E:\NewClaude\bhaktisetu` (folder name legacy; `poojly_*` storage keys retained — never rename without migration).
- **Prior names**: Poojly → BhaktiSetu → Darshya.
- **Operator**: Solo founder; budget $0 — every integration free-tier or no-op on missing env.

## Surfaces

| Surface | Path | Stack | Status |
|---|---|---|---|
| Web | `apps/web` :3000 | Next 15 + React 19 + Tailwind v4 + ShadcnUI + React Query | LIVE (Cloudflare Pages) |
| API | `apps/api` :4000 | Fastify 5 + Prisma + PostgreSQL (Supabase) | LIVE (Render) |
| Admin | `apps/admin` :3001 | Next.js | LIVE |
| Mobile | `apps/mobile` | Expo 50 + Expo Router | EAS APK shipped; iOS blocked on Apple Dev signup |
| Commerce | `apps/medusa-store` | MedusaJS headless | Wired |

## Cross-platform contracts

- **Single API** serves web + admin + mobile. Prefix `/api/v1/*`.
- **Shared client**: `packages/api-client` (React Query + typed fetch, RN-compatible).
- **Shared types/validators**: `packages/shared`.
- **Shared UI primitives**: `packages/ui` (web only).
- **Auth**: JWT access + refresh. Web → cookies; mobile → `expo-secure-store`. See `docs/auth-model.md`.
- **Money**: `Decimal(10,2)`; render via `formatPrice`; INR + USD always. NRI 9-10× domestic.
- **Booking #**: `BS-YYYYMMDD-XXXXX`. **80G**: `DR-YYYYMMDD-XXXX`.
- **Roles** (Prisma `UserRoleAssignment`, isPrimary): devotee, pandit, store_owner, astrologer, wellness_instructor, gaushala_manager, temple_manager, admin. Web↔API enum bridge: web `priest` ↔ API `pandit`.

## Conventions

- TypeScript strict everywhere.
- **Zod at every external boundary** (HTTP body, query, form). Internal trusts types.
- Prisma for queries; raw SQL only when measured.
- React Query for ALL frontend API calls (web + mobile).
- Files: kebab-case. Components: PascalCase.
- **Default to no comments**. Document non-obvious WHY only.
- **Graceful degradation**: every integration checks env vars; returns `{skipped: true}` / no-op when absent.
- Commits: conventional (`feat(scope):`, `fix(scope):`).

## Business rules (immutable)

1. Video proof MANDATORY for puja bookings — priest uploads before payout.
2. NRI pricing 9-10× domestic per puja type.
3. Platform commission 20-40% per temple, configurable.
4. Priest payout = price − commission, gated on Aadhaar verification.
5. Cancellation up to 24h before scheduled time.
6. Temples must be verified before going live.
7. 80G receipt requires donee 80G regn + PAN.

## Methodology

Superpowers: Brainstorm → Plan → TDD → Execute → Review → Verify.
- Vitest unit + Playwright E2E, co-located `*.test.ts`.
- `pnpm turbo type-check` + `pnpm turbo test` green at every phase boundary.
- Targets: 90%+ services, 100% validators. Current API: **416/416 green** (32 files).

For full integrations table, gotchas, recent surfaces, and deeper-doc map → `docs/project-context-detail.md`.
