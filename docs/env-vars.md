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
| `R2_BUCKET` | `lib/r2.ts` | R2 public media bucket; defaults `darshya-media`. Never used for booking proofs. |
| `R2_PRIVATE_BUCKET` | `lib/r2.ts` (booking video proof) | **Required when R2 is enabled** (`R2_ACCOUNT_ID`+`R2_ACCESS_KEY_ID`+`R2_SECRET_ACCESS_KEY`). Unset => `POST /priest/bookings/:id/video-proof/signed-url` answers 503 "Video proof storage is not configured" (logged once) instead of writing proofs to the public `R2_BUCKET`. Reads/deletes of existing proof keys still fall back to `R2_BUCKET` (signed GET only) so older proofs stay reachable. Supabase-storage mode (no R2 vars) is unaffected: it uses its own private `STORAGE_PROOF_BUCKET` (`booking-proofs-private`). |
| `STORAGE_BUCKET` | `lib/r2.ts` (Supabase Storage adapter) | defaults to `darshya-media` if unset; bucket must exist in Supabase Storage |
| `GROQ_API_KEY` | `services/ai.service.ts` + `routes/voice-pandit.ts` (STT via Groq Whisper + LLM via Groq Llama) | AI endpoints unavailable; voice-pandit returns demo reply. **Note**: Whisper is hosted by Groq (NOT OpenAI) — `whisper-large-v3-turbo` runs on Groq's inference, single `GROQ_API_KEY` covers both STT and LLM. |
| `ELEVENLABS_API_KEY` | `routes/voice-pandit.ts` (R-Q3-E-001 TTS) | voice-pandit returns transcript + reply text but empty audio (`demo:true`) |
| `VOICE_PANDIT_STT_MODEL` | `routes/voice-pandit.ts` | defaults to `whisper-large-v3-turbo` (Groq-hosted Whisper, not OpenAI) |
| `VOICE_PANDIT_LLM_MODEL` | `routes/voice-pandit.ts` | defaults to `llama-3.3-70b-versatile` |
| `VOICE_PANDIT_TTS_MODEL` | `routes/voice-pandit.ts` | defaults to `eleven_turbo_v2_5` |
| `VOICE_PANDIT_TTS_VOICE_EN` / `VOICE_PANDIT_TTS_VOICE_HI` | `routes/voice-pandit.ts` | ElevenLabs voice IDs; founder can swap without redeploy |
| `REQUIRE_PROVIDER_APPROVAL` | `lib/provider-approval.ts` (read at call time; declared in `lib/env.ts`) | **Unset / `false` / `0` / `off` / `no` = NO admin approval (default, since 2026-10).** A pandit, store owner, astrologer, wellness instructor, gaushala or temple manager is live and its portal usable when the profile is submitted (`onboardingService.activateOnSubmit`, `lib/go-live.ts`). `true` / `1` / `yes` / `on` restores the old gate: profiles are created `approved=false` and wait on `/admin/approvals`; signup answers `pending_approval`; astrologer `verified` is echoed again. Restart the API after changing it (no deploy of new code needed). Never changes: `Priest.isVerified` / `verificationStatus` are not written by auto-activation (TC-08), payout KYC and held earnings, the blocked-user gate, the gaushala/temple quality bar, and a temple name that is already a catalogue Temple still needs an admin link. See `docs/auth-model.md` "Provider approval". |
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
| `REDDIT_CLIENT_ID` | `lib/reddit.ts` (Layer AO auto-post) | `submitRedditPost` returns `{skipped:true}`; cron tick logs + continues |
| `REDDIT_CLIENT_SECRET` | same | same |
| `REDDIT_USERNAME` | same | same |
| `REDDIT_PASSWORD` | same | same |
| `REDDIT_USER_AGENT` | same | defaults to `darshya-content-bot/1.0 by /u/<username>` |

## Web client (`apps/web`)

`NEXT_PUBLIC_*` only — anything else is filtered out at build time.

| Var | Used by | Behavior when absent |
|---|---|---|
| `NEXT_PUBLIC_SENTRY_DSN` | `apps/web/lib/sentry.ts` (CDN-loaded `bundle.min.js`, called from layout) | client SDK not initialised; no browser errors captured |
| `NEXT_PUBLIC_POSTHOG_KEY` | `components/Analytics.tsx` | analytics disabled |
| `NEXT_PUBLIC_POSTHOG_HOST` | same | defaults to `us.i.posthog.com` |
| `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN` | `components/CloudflareAnalytics.tsx` | manual injection path. **Usually unnecessary** — when `darshya.online` is proxied through Cloudflare (orange cloud), the beacon is auto-injected at the edge with no client-side code needed. Only set this if a page is served outside Cloudflare's proxy. |
| `NEXT_PUBLIC_API_URL` | `lib/api-config.ts` | defaults to `http://localhost:4000` |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | booking + donation pages | falls back to `rzp_test_demo` |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | `lib/medusa.ts` (Storefront API) | unset → `/store` lists static seed catalogue from `lib/products.ts`. Set to e.g. `http://localhost:9000` or `https://commerce.darshya.online` when MedusaJS is running. |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | same | per-channel publishable key sent as `x-publishable-api-key`. Optional in dev. |

## Commerce (`apps/medusa-store`)

Stub today; values listed for when Medusa boots.

| Var | Used by | Behavior when absent |
|---|---|---|
| `MEDUSA_DATABASE_URL` | `medusa-config.js` | required; Medusa won't boot |
| `MEDUSA_REDIS_URL` | `medusa-config.js` | optional; falls back to in-memory cache |
| `MEDUSA_ADMIN_URL` / `MEDUSA_ADMIN_TOKEN` | `scripts/seed-dropship.mjs` | seed prints catalogue JSON to stdout instead of POSTing |
| `STORE_CORS` / `ADMIN_CORS` | `medusa-config.js` | defaults to localhost + darshya.online |

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

## Rate limiting and gateway timeout (added 2026-10-13)

| Var | Default | Behaviour |
|---|---|---|
| `CF_ORIGIN_SECRET` | unset | Optional. When set, `CF-Connecting-IP` is trusted ONLY on requests carrying `x-origin-secret: <this value>`. Owner action: add a Cloudflare Transform Rule (Rules > Transform Rules > Modify Request Header) that sets that header on `api.darshya.online`. Without it the API falls back to proving Cloudflare from the last `X-Forwarded-For` hop being a Cloudflare edge IP. |
| `RATE_LIMIT_TRUST_CF_HEADER` | unset | Rollback lever: `true` trusts `CF-Connecting-IP` unconditionally (the pre-2026-10-13 behaviour). Use it if the API log shows `CF-Connecting-IP ignored` for real production traffic. |
| `RATE_LIMIT_IP_CEILING` | `RATE_LIMIT_MAX * 12` | Per-client-IP cap per minute regardless of credential; stops `Authorization: Bearer <random>` bucket minting. |
| `RAZORPAY_TIMEOUT_MS` | `15000` | Timeout on every Razorpay SDK call and the reconcile fetch. A stalled gateway answers the friendly 503 instead of hanging. |

## Cloud Run / scale-to-zero (added 2026-10-17)

See `docs/runbooks/cloud-run-api-deploy.md`.

| Var | Default | Behaviour |
|---|---|---|
| `DISABLE_INPROCESS_JOBS` | unset | `true` turns off in-process timers (ops scheduler, per-booking offer timeouts, latency reporter); an external caller must hit `POST /api/v1/cron/tick`. `false` forces them on. Unset: off when `K_SERVICE` is set (Cloud Run), on elsewhere. Overrides `OPS_SCHEDULER_ENABLED`. |
| `K_SERVICE` | set by Cloud Run | Do not set by hand. Presence implies scale-to-zero, so timers default off. |
| `CRON_AUTH_TOKEN` | unset | Bearer token for `POST /api/v1/cron/tick`, `/daily`, `/run/:job`. Unset => every cron request is 401 (fail closed). Use a 32+ byte random value. |
| `BACKGROUND_AWAIT_MS` | `4000` | Max time a request waits for receipts/audit/notification side effects before replying (`lib/background.ts`). `0` restores fire-and-forget. |
| `RUN_MIGRATIONS_ON_BOOT` | unset | Docker image only (`apps/api/Dockerfile`). `true` runs `prisma migrate deploy` before starting; default is to skip (migrations are manual). |
| `PORT` / `HOST` | `4000` / `0.0.0.0` | Cloud Run injects `PORT=8080`; the server honours it. |
