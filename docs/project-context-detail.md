# Project Context — Detail (load on demand)

> Detail spillover from `PROJECT_CONTEXT.md`. Read when slim index lacks needed info.

## Full integrations table

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

## Critical gotchas

- `useSearchParams()` consumers in static-prerender pages (e.g. `/temples`, `/astrology`, `/priest/bookings`) MUST be wrapped in `<Suspense>` at parent or Next 15 prerender bails.
- Cloudflare Pages build invokes Vercel CLI under the hood. Use `@sentry/browser` standalone, not `@sentry/nextjs`.
- Storage keys still use `poojly_*` prefix. Never rename without a migration script.
- Demo-token branch in API auth gated by `NODE_ENV !== 'production' || ALLOW_DEMO_TOKENS === 'true'`. Unset on Render after demos.
- Cron disabled on Render free tier — use cron-job.org → `POST /api/v1/admin/jobs/daily-ops`.

## Recently shipped surfaces

- `/nri` — public NRI Premium landing (server component, full SEO meta, hero + 6 benefits + comparison table + 6 FAQs). Counters Sri Mandir USD-tier strategy tripwire. Wired into MoreDropdown nav. Stripe checkout target: `nri_premium_yearly` (₹5000 / $60), no-ops until U2 Stripe KYC clears.
- Signup role wiring (2026-05-17) — `POST /auth/signup` now writes `UserRoleAssignment` (isPrimary=true) + stub provider profile row per role. `/me`, `/login`, `/verify-otp`, Google sync all return real role via `getPrimaryRoleForUser`. Admin user list + approval queue populate end-to-end.

## Deeper docs map

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
