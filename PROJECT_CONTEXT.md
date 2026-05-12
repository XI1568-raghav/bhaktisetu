# Project Context — Darshya

> Persistent project memory. Survives /compact and /clear.
> Source of truth for cross-platform architecture.
> Last updated: 2026-05-13.

## Identity

- **Product**: Darshya — India's devotional super-app (live darshan, puja with video proof, content, gaushala seva, e-commerce, astrology, wellness, yatra).
- **Domain**: https://darshya.online · API https://api.darshya.online
- **Repo path**: `E:\NewClaude\bhaktisetu` (folder name legacy; `poojly_*` storage keys retained for back-compat — never rename without migration).
- **Prior names**: Poojly → BhaktiSetu → Darshya.
- **Operator**: Solo founder; budget $0 — every integration must work in free tier or no-op when env vars absent.

## Surfaces

| Surface | Path | Stack | Status |
|---|---|---|---|
| Web | `apps/web` (port 3000) | Next.js 15 + React 19 + Tailwind v4 + ShadcnUI + React Query | **LIVE** at darshya.online (Cloudflare Pages) |
| API | `apps/api` (port 4000) | Fastify 5 + Prisma + PostgreSQL (Supabase) | **LIVE** at api.darshya.online (Render free tier) |
| Admin | `apps/admin` (port 3001) | Next.js | LIVE |
| Mobile (Android) | `apps/mobile` | Expo 50 + Expo Router | EAS APK shipped. Mock-only currently. Parity plan in `docs/mobile-plan.md` |
| Mobile (iOS) | `apps/mobile` (same code) | Expo + Expo Go testing only | **Blocked**: Apple Developer Program signup ($99/yr) pending |
| Commerce | `apps/medusa-store` | MedusaJS headless | Wired |

## Cross-platform contracts

- **Single API**: `apps/api` serves web + admin + mobile. Prefix `/api/v1/*`.
- **Shared client**: `packages/api-client` — React Query hooks + typed fetch (RN-compatible). Both web and mobile consume.
- **Shared types**: `packages/shared` — TS types, Zod validators, constants, api-endpoints.
- **Shared UI primitives**: `packages/ui` — ShadcnUI base. Web only (mobile uses native components).
- **Auth**: JWT access + refresh. Web stores in cookies; mobile in `expo-secure-store`. See `docs/auth-model.md`.
- **Money**: `Decimal(10,2)` in DB; render via `formatPrice`; INR + USD always. NRI pricing 9-10× domestic.
- **Booking number**: `BS-YYYYMMDD-XXXXX`. **80G receipt**: `DR-YYYYMMDD-XXXX`.

## Integrations (current, all env-or-noop)

| Concern | Service | Notes |
|---|---|---|
| AI | **Groq** Llama 3.3 70B + 3.1 8B Instant | Replaced Anthropic. Free tier. |
| Payments (INR) | Razorpay | KYC pending live activation. Demo mode works without keys. |
| Payments (NRI) | Stripe | KYC pending. |
| Streaming | AWS IVS | Web only. |
| Realtime calls | Jitsi Meet | Free, no key. |
| Cache | Upstash Redis | Optional. Read-paths skip cache when `REDIS_URL` absent. |
| Email | Resend | 3K/mo free. Magic links + receipts. |
| Object storage | Cloudflare R2 | 10GB free, zero egress. |
| Errors | Sentry (`@sentry/browser` standalone, NOT `@sentry/nextjs` — breaks `@cloudflare/next-on-pages`) | 5K/mo free. |
| Analytics | PostHog + Cloudflare Web Analytics | Browser-only. Don't grep static HTML to verify. |
| Push | Web push + FCM | Web push live. FCM SDK wired, prod activation pending. |
| Panchang | `mhah-panchang` lib | Real, not mocked. |
| CMS | Sanity | Connected. |
| WhatsApp | Meta Cloud API | Templates parked. |

## Conventions

- TypeScript strict mode everywhere.
- **Zod at every external boundary** (HTTP body, query, form). Internal code trusts types.
- Prisma for queries; raw SQL only when measured.
- React Query for ALL frontend API calls (both web and mobile).
- Files: kebab-case. Components: PascalCase.
- **Default to no comments**. Document non-obvious WHY (constraints, prior incidents) only. Never narrate WHAT.
- **Graceful degradation**: every integration checks env vars and returns `{skipped: true}` / no-op when absent.
- Commits: conventional (`feat(scope):`, `fix(scope):`, `test(scope):`, etc.). Co-authored line not required for routine work.

## Business rules (immutable)

1. Video proof MANDATORY for puja bookings — priest uploads before payout.
2. NRI pricing 9-10× domestic, configured per puja type.
3. Platform commission 20-40% per temple, configurable.
4. Priest payout = booking price − commission, gated on Aadhaar verification.
5. Cancellation up to 24h before scheduled time.
6. Temples must be verified before going live.
7. 80G receipt requires donee 80G regn + PAN.

## Methodology

Superpowers: Brainstorm → Plan → TDD → Execute → Review → Verify.
- Vitest unit + Playwright E2E, co-located `*.test.ts`.
- `pnpm turbo type-check` and `pnpm turbo test` green at every phase boundary.
- Targets: 90%+ on services, 100% on validators.
- Current API test count: 277/277 green across 16 service files.

## Deeper docs (load on demand)

| File | When to read |
|---|---|
| `docs/launch-state.md` | Current launch progress, recent commits, open user-action items |
| `docs/auth-model.md` | Token formats, demo accounts, middleware ordering |
| `docs/env-vars.md` | Every env var + behavior when absent |
| `docs/mobile-plan.md` | Mobile parity multi-phase plan |
| `docs/glossary.md` | Domain terms (darshan, puja, sankalp, 80G, etc.) |
| `docs/caveats.md` | "Do not touch unless asked" gotchas |
| `docs/skill-workflow-map.md` | Which Claude Code skill for which business-ops workflow |
| `docs/cloudflare-pages-migration.md` | Web deploy pipeline + prerender gotchas |
| `docs/cf-pages-env-wiring-2026-05-13.md` | Sentry + PostHog env paste runbook |
| `docs/security-rotation-2026-05-13.md` | Resend / Supabase / ALLOW_DEMO_TOKENS rotation runbook |
| `docs/demo-video-recipe-2026-05-13.md` | Playwright + ffmpeg golden-path MP4 for KYC/Meta/Reddit/investors |

## Recently shipped surfaces

- `/nri` — public NRI Premium landing (server component, full SEO meta, hero + 6 benefits + comparison table + 6 FAQs). Counters Sri Mandir USD-tier strategy tripwire. Wired into MoreDropdown nav. Stripe checkout target: `nri_premium_yearly` (₹5000 / $60), no-ops until U2 Stripe KYC clears.

## Critical gotchas

- `useSearchParams()` consumers in static-prerender pages (e.g. `/temples`, `/astrology`, `/priest/bookings`) MUST be wrapped in `<Suspense>` at parent or Next 15 prerender bails.
- Cloudflare Pages build invokes Vercel CLI under the hood. Use `@sentry/browser` standalone, not `@sentry/nextjs`.
- Storage keys still use `poojly_*` prefix. Never rename without a migration script.
- Demo-token branch in API auth gated by `NODE_ENV !== 'production' || ALLOW_DEMO_TOKENS === 'true'`. Unset on Render after demos.
- Cron disabled on Render free tier — use cron-job.org → `POST /api/v1/admin/jobs/daily-ops`.
