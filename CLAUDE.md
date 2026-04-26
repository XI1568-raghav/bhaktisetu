# Darshya — Project Context

> Slim index. Read this first; load deeper docs as needed.
> Last refreshed: 2026-04-26.

## Identity

- **Product**: Darshya — India's devotional super-app (live darshan, puja booking with video proof, content, gaushala seva, e-commerce, astrology, wellness).
- **Domain**: https://darshya.online
- **Repo path**: `E:\NewClaude\bhaktisetu` (folder name is legacy; product is Darshya)
- **Prior names**: Poojly → BhaktiSetu → Darshya. Storage keys still use `poojly_*` for backwards compat — do NOT rename without a migration.
- **Budget**: $0. Every integration must work in free tier or no-op when env vars are absent.

## Tech stack (current, not aspirational)

- **Monorepo**: Turborepo + pnpm workspaces
- **Web** (`apps/web`): Next.js 15 + React 19 + Tailwind v4 + ShadcnUI → **Cloudflare Pages**
- **API** (`apps/api`): Fastify 5 + Prisma + PostgreSQL on **Supabase** → **Render** (free tier, no cron)
- **Mobile** (`apps/mobile`): Expo + Expo Router (mock-only currently; see `docs/mobile-plan.md`)
- **Admin** (`apps/admin`): port 3001
- **Commerce**: MedusaJS headless (`apps/medusa-store`)
- **AI**: **Groq** (Llama 3.3 70B + 3.1 8B Instant) — replaced Anthropic
- **Payments**: Razorpay (INR) + Stripe (NRI)
- **Streaming**: AWS IVS (web only)
- **Realtime**: Jitsi Meet for live consultations
- **Cache**: Upstash Redis
- **Email**: Resend (3K/mo free)
- **Storage**: Cloudflare R2 (10GB free, zero egress)
- **Errors**: Sentry (5K/mo free)
- **Analytics**: PostHog + Cloudflare Web Analytics
- **Panchang**: `mhah-panchang` (real, not mocked)
- **CMS**: Sanity

## Repo layout

```
apps/
  web/            Next.js 15 main site (port 3000)
  api/            Fastify backend (port 4000)
  admin/          Admin dashboard (port 3001)
  mobile/         Expo app (mock-only currently)
  medusa-store/   MedusaJS commerce engine
packages/
  ui/             ShadcnUI-based shared components
  shared/         TS types, Zod validators, constants, api-endpoints
  api-client/     React Query hooks + typed fetch client (RN-compatible)
  analytics/      PostHog event tracking
```

## Conventions

- TypeScript strict mode
- **Zod at every external boundary** (HTTP body, query, form). Internal code trusts types.
- Prisma for queries; raw SQL only when measured
- React Query (TanStack) for all frontend API calls
- ShadcnUI base; customise via CVA
- Files: kebab-case; components: PascalCase
- API routes: `/api/v1/*` prefix
- Money: `Decimal(10,2)` in DB; render via `formatPrice`; INR + USD always
- Booking number: `BS-YYYYMMDD-XXXXX`
- 80G receipt number: `DR-YYYYMMDD-XXXX` (4 hex)
- **Default to no comments**. Document non-obvious WHY (constraints, prior incidents) only. Never narrate WHAT.
- **Graceful degradation everywhere**: every integration checks env vars and returns `{skipped: true}` / no-op when absent. Never crash on missing config.

## Business rules

1. Video proof MANDATORY for puja bookings — priest uploads before payout
2. NRI pricing: 9-10× domestic, configured per puja type
3. Platform commission: 20-40% per temple, configurable
4. Priest payout = booking price − commission, gated on Aadhaar verification
5. Cancellation up to 24h before scheduled time
6. Temples must be verified before going live
7. 80G receipt requires donee 80G regn + PAN

## Methodology

Superpowers: Brainstorm → Plan → TDD → Execute → Review → Verify.
- Vitest unit + Playwright E2E, co-located `*.test.ts`
- `pnpm turbo type-check` and `pnpm turbo test` green at every phase boundary
- Targets: 90%+ on services, 100% on validators

## Deeper docs

| File | When to read |
|---|---|
| `docs/launch-state.md` | Current launch progress, recent files, open items user must provide |
| `docs/auth-model.md` | Token formats, demo accounts, middleware ordering |
| `docs/env-vars.md` | Every env var + behavior when absent |
| `docs/glossary.md` | Domain terms (darshan, puja, sankalp, 80G, etc.) |
| `docs/caveats.md` | "Do not touch unless asked" gotchas — read before refactoring |
| `docs/mobile-plan.md` | Mobile parity multi-phase plan |

## How future sessions should use this

1. Read this file first.
2. Run `TaskList` to see in-progress work.
3. Load deeper docs only when relevant to the task at hand.
4. Verify any "memory/doc says X exists" claim by reading the actual source file before recommending action.
5. When adding a new integration, follow the env-var-or-noop pattern — see `docs/env-vars.md`.
6. Update `docs/launch-state.md` when state materially changes. Don't let it rot.
