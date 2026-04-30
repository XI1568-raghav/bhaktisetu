# Env vars

> Single source of truth. Every integration is env-var-driven and no-ops when keys are absent.

## Behavior contract

Every integration in this repo follows the same pattern:
1. Check env var at module init
2. If missing, set an `enabled = false` flag and skip side effects
3. Caller-facing functions return `{ ok: false, skipped: true }` (or equivalent) — never throw

Adding a new integration? Match this contract.

## API server (`apps/api`)

| Var | Used by | Behavior when absent |
|---|---|---|
| `SENTRY_DSN` | `lib/sentry.ts` | no-op, no events sent |
| `MAGIC_LINK_SECRET` | `routes/magic-link.ts` | required for HMAC; falls back to dev secret with warning |
| `RESEND_API_KEY` | `lib/email.ts` | `sendEmail` returns `{skipped:true}`; magic-link route returns `devLink` for manual testing |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | `routes/donations.ts` + booking | `isDemoPayment=true`; signature verification skipped, demo orderId returned |
| `STORAGE_BUCKET` | `lib/r2.ts` (Supabase Storage adapter) | defaults to `darshya-media` if unset; bucket must exist in Supabase Storage |
| `GROQ_API_KEY` | `services/ai.service.ts` | AI endpoints unavailable |
| `SUPABASE_URL` | core auth | **required** — auth broken without it |
| `SUPABASE_SERVICE_ROLE_KEY` | core auth | **required** |
| `REDIS_URL` (or `UPSTASH_REDIS_URL`) | `lib/cache.ts` (panchang/temple/puja read-through cache) | no-op — every cache call falls through to DB. App keeps working, just hits DB harder. |

### Day 3

| Var | Used by | Behavior when absent |
|---|---|---|
| `WHATSAPP_PHONE_NUMBER_ID` | `lib/whatsapp.ts` | template sends no-op (`{skipped:true}`); OTP route returns `devCode` |
| `WHATSAPP_ACCESS_TOKEN` | same | same |
| `WHATSAPP_API_VERSION` | same | defaults to `v21.0` |
| `WHATSAPP_OTP_TEMPLATE` | `routes/whatsapp-otp.ts` | defaults to `otp_login` |
| `CRON_AUTH_TOKEN` | `routes/cron.ts` | endpoint rejects all requests (fail-closed) |
| `COHERE_API_KEY` | `lib/embeddings.ts` | semantic search falls back to LIKE matching |
| `VAPID_PUBLIC_KEY` | `lib/web-push.ts` | push subscribe disabled; `/vapid-public-key` returns `enabled:false` |
| `VAPID_PRIVATE_KEY` | same | same |
| `VAPID_SUBJECT` | same | defaults to `mailto:support@darshya.online` |

## Web client (`apps/web`)

`NEXT_PUBLIC_*` only — anything else is filtered out at build time.

| Var | Used by | Behavior when absent |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `apps/web/lib/sentry-client.ts` (via `SentryProvider` + `global-error.tsx`) | client SDK not initialised; no browser errors captured |
| `NEXT_PUBLIC_POSTHOG_KEY` | `components/Analytics.tsx` | analytics disabled |
| `NEXT_PUBLIC_POSTHOG_HOST` | same | defaults to `us.i.posthog.com` |
| `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN` | `components/CloudflareAnalytics.tsx` | manual injection path. **Usually unnecessary** — when `darshya.online` is proxied through Cloudflare (orange cloud), the beacon is auto-injected at the edge with no client-side code needed. Only set this if a page is served outside Cloudflare's proxy. |
| `NEXT_PUBLIC_API_URL` | `lib/api-config.ts` | defaults to `http://localhost:4000` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | booking + donation pages | falls back to `rzp_test_demo` |

## Mobile (`apps/mobile`)

| Var | Used by | Behavior when absent |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `lib/api-config.ts` | defaults to `http://<lan-ip>:4000` (must be set for Expo Go on phone) |

## Local dev quickstart

Minimum to bring the stack up:
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (required — no fallback)
- `GROQ_API_KEY` (only if testing AI features)
- Everything else can be left unset; features degrade gracefully.

To test magic-link locally without Resend:
- Leave `RESEND_API_KEY` unset
- POST to `/auth/magic-link/request` — response includes `devLink`
- Open `devLink` in browser to complete the flow
