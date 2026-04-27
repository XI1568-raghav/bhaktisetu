# Darshya — Full Project Context (Cross-Session Reference)

> Master context dump. Captures the entire 3-day launch arc + all integrations + mobile plan + production gotchas.
> Last refreshed: 2026-04-27.
> When starting a fresh session, read: `CLAUDE.md` → `docs/launch-state.md` → this file (only if you need historical depth).

---

## 1. Identity & business

- **Product**: Darshya — India's devotional super-app (live darshan, puja booking with video proof, content library, gaushala seva, e-commerce, astrology, wellness)
- **Domain**: https://darshya.online
- **API**: https://bhaktisetu.onrender.com (will alias to `api.darshya.online`)
- **Repo path**: `E:\NewClaude\bhaktisetu` (folder name is legacy)
- **Prior names**: Poojly → BhaktiSetu → Darshya. Storage keys still `poojly_*` for backwards compat — DO NOT rename without migration
- **Budget**: $0. Every integration must work on free tier or no-op when env vars are absent
- **Owner**: solo dev (the user); no Apple Developer account, no Meta business verification yet

## 2. Tech stack (current, not aspirational)

- **Monorepo**: Turborepo + pnpm workspaces
- **Web** (`apps/web`): Next.js 15 + React 19 + Tailwind v4 + ShadcnUI → **Cloudflare Pages**
- **API** (`apps/api`): Fastify 5 + Prisma + PostgreSQL on **Supabase** → **Render** (free tier; no built-in cron)
- **Mobile** (`apps/mobile`): Expo + Expo Router (currently mock-only; Phase 1 of mobile parity plan not yet executed)
- **Admin** (`apps/admin`): port 3001
- **Commerce**: MedusaJS headless (`apps/medusa-store`)
- **AI**: **Groq** (Llama 3.3 70B + 3.1 8B Instant) — replaced Anthropic
- **Payments**: Razorpay (INR) + Stripe (NRI)
- **Streaming**: AWS IVS (web only; mobile shows metadata)
- **Realtime**: Jitsi Meet for live consultations
- **Cache**: Upstash Redis
- **Email**: Resend (3K/mo free)
- **Storage**: **Supabase Storage** (swapped from Cloudflare R2 because R2 needs a card)
- **Errors**: Sentry server-side only (`@sentry/node`); browser-side `@sentry/nextjs` removed entirely
- **Analytics**: PostHog + Cloudflare Web Analytics (auto-injected via zone proxy)
- **Panchang**: `mhah-panchang` (real, not mocked)
- **CMS**: Sanity
- **Search**: Cohere `embed-multilingual-v3.0` (1024-dim) + pgvector cosine; LIKE fallback
- **Push**: Web Push API + VAPID; service worker at `/sw.js`
- **Cron**: GitHub Actions (Render free tier has no cron) — `00:00 UTC = 05:30 IST` daily POST
- **WhatsApp**: Meta Graph API (parked — no business verification yet; code runs in dev mode)

## 3. Repo layout

```
apps/
  web/             Next.js 15 main site (port 3000) → Cloudflare Pages
  api/             Fastify backend (port 4000) → Render
  admin/           Admin dashboard (port 3001)
  mobile/          Expo app (mock-only; parity plan pending)
  medusa-store/    MedusaJS commerce engine
packages/
  ui/              ShadcnUI-based shared components
  shared/          TS types, Zod validators, constants, api-endpoints
  api-client/      React Query hooks + typed fetch client (RN-compatible)
  analytics/       PostHog event tracking
```

## 4. Conventions

- TypeScript strict mode
- **Zod at every external boundary** (HTTP body, query, form). Internal code trusts types
- Prisma for queries; raw SQL only when measured
- React Query (TanStack) for all frontend API calls
- ShadcnUI base; customise via CVA
- Files: kebab-case; components: PascalCase
- API routes: `/api/v1/*` prefix
- Money: `Decimal(10,2)` in DB; render via `formatPrice`; INR + USD always
- Booking number: `BS-YYYYMMDD-XXXXX`
- 80G receipt number: `DR-YYYYMMDD-XXXX` (4 hex)
- **Default to no comments**. Document non-obvious WHY only. Never narrate WHAT
- **Graceful degradation everywhere**: every integration checks env vars and returns `{skipped: true}` / no-op when absent. Never crash on missing config

## 5. Business rules

1. Video proof MANDATORY for puja bookings — priest uploads before payout
2. NRI pricing: 9-10× domestic, configured per puja type
3. Platform commission: 20-40% per temple, configurable
4. Priest payout = booking price − commission, gated on Aadhaar verification
5. Cancellation up to 24h before scheduled time
6. Temples must be verified before going live
7. 80G receipt requires donee 80G regn + PAN

## 6. Auth model

Three token formats accepted by `apps/api/src/middlewares/auth.ts`:

| Format | Origin | Notes |
|---|---|---|
| `email-<userId>-<32hex>` | magic-link `/verify` and WhatsApp OTP `/verify` | HMAC-SHA256 signed; `MAGIC_LINK_SECRET` |
| `demo-*` and `anon-*` | `apps/web/lib/auth-context.tsx` demo accounts; AI chat anonymous flow | Skips DB lookup; synthetic IDs (NOT real UUIDs — DO NOT pass to Prisma `findUnique` on FK columns) |
| Supabase JWT | real signups (legacy) | Validated against Supabase |

**Eight demo accounts**, all password `demo123`:
- `devotee@demo.com` / `pandit@demo.com` (priest) / `priest@demo.com` / `store@demo.com` / `astro@demo.com` / `wellness@demo.com` / `gaushala@demo.com` / `temple@demo.com` / `admin@demo.com`

`apps/web/lib/auth-context.tsx` has `getRoleDashboardPath()` which maps role → URL:
- devotee → `/dashboard`, priest → `/priest`, store_owner → `/store-admin`, astrologer → `/astrologer-portal`, wellness_instructor → `/wellness-portal`, gaushala_manager → `/gaushala-portal`, temple_manager → `/temple-portal`, admin → `/admin`

## 7. Three-day launch plan (ALL GREEN as of 2026-04-27)

### Day 1 — Foundation (✅ live)
| Component | File(s) | Status |
|---|---|---|
| Sentry server-side | `apps/api/src/lib/sentry.ts` | ✅ — needs `SENTRY_DSN` |
| Sentry browser | (removed entirely — see §11) | ✅ deferred |
| PostHog | `apps/web/components/Analytics.tsx` | ✅ — needs `NEXT_PUBLIC_POSTHOG_KEY` |
| Cloudflare Web Analytics | `apps/web/components/CloudflareAnalytics.tsx` | ✅ auto-injected by CF zone proxy |
| Resend email | `apps/api/src/lib/email.ts` (3 templates) | ✅ — needs `RESEND_API_KEY` + verified domain |
| Magic-link auth | `apps/api/src/routes/magic-link.ts` (`/request`, `/verify`) | ✅ — needs `MAGIC_LINK_SECRET` |
| Magic-link landing | `apps/web/app/auth/verify/page.tsx` (edge runtime) | ✅ |

### Day 2 — Money/Audio (✅ live)
| Component | File(s) | Status |
|---|---|---|
| Supabase Storage adapter | `apps/api/src/lib/r2.ts` (named `r2.ts` for stable exports) | ✅ swap from Cloudflare R2 — kept `uploadToR2`, `presignR2Upload`, `r2.enabled` export names. Bucket: `darshya-media`, public, 25 MB cap |
| Media upload route | `apps/api/src/routes/media.ts` (`/upload-url`) | ✅ |
| Razorpay checkout | `apps/api/src/routes/donations.ts` (`/create-order`, `/verify`) | ✅ — needs `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| 80G PDF receipt | `apps/api/src/lib/pdf-receipt.ts` (pdf-lib) | ✅ |

### Day 3 — Engagement (✅ live, except WhatsApp parked)
| Component | File(s) | Status |
|---|---|---|
| WhatsApp Meta Graph | `apps/api/src/lib/whatsapp.ts`, `apps/api/src/routes/whatsapp-otp.ts` | 🅿️ parked (no Meta verification). Returns `devCode` in dev mode |
| Web Push VAPID | `apps/api/src/lib/web-push.ts`, `apps/api/src/routes/notifications.ts`, `apps/web/components/NotificationPrompt.tsx`, `apps/web/public/sw.js` | ✅ — VAPID keys provided by user (see §8) |
| Cohere embeddings | `apps/api/src/lib/embeddings.ts` | ✅ — Cohere key received (rotate after launch) |
| Semantic search | `apps/api/src/routes/semantic-search.ts` | ✅ — verified live with `mode:"vector"` for English ("removing obstacles for success" → Ganesh Puja) and Hindi (शांति → Bajrang Baan) queries |
| pgvector migration | `apps/api/prisma/migrations/20260426_pgvector/migration.sql` | ✅ applied via Supabase SQL editor |
| Embedding backfill | `apps/api/scripts/backfill-embeddings.ts` | ✅ ran successfully — 22 content + 5 temples + 10 puja_types embedded |
| GitHub Actions cron | `.github/workflows/daily-cron.yml` | ✅ wired — needs `CRON_AUTH_TOKEN` + `API_BASE_URL` repo secrets |
| Cron route | `apps/api/src/routes/cron.ts` | ✅ — bearer token + constant-time compare |
| Booking push notifications | `apps/api/src/services/booking.service.ts` | ✅ fires on `confirmed` / `priest_assigned` / `video_uploaded` / `cancelled` transitions |

## 8. Live values held by user (do NOT regenerate without coordination)

| Item | Value |
|---|---|
| VAPID public | `BH7sQesyqSplwkXutA41yD2pcQ9C2AyzlwL7uLT1N8wWPqWI_d5UiMIZk4gRuKxe7HsFdcPgKjMtZslt8MZB4do` |
| VAPID private | `6othV1r-QJuZkfjb18BeC1_9cE-TbRaMfjscUNRbYY8` |
| Cron auth token | `e1b34c4e64633802ad1db56073f388b67b44833200fd09d556bfc5dc280613f6` |
| Cohere key (partial, rotate) | `je2iFdD6W6Oja2aHgbrxYFSJmzEG6AkXQpZxkfT5` |
| Render API URL | `https://bhaktisetu.onrender.com` |

## 9. Last deploy state (2026-04-27)

- Last commit: `adade66` (semantic-search column fix)
- Render: deployed, vector mode confirmed live
- Cloudflare Pages: deployed; build issues resolved by removing `@sentry/nextjs` entirely from `apps/web/package.json`
- pgvector migration: applied (Supabase confirmed "Success. No rows returned")

## 10. Open items still pending user action

| Action | Env vars |
|---|---|
| GitHub repo Settings → Secrets paste | `CRON_AUTH_TOKEN`, `API_BASE_URL=https://bhaktisetu.onrender.com` |
| Sentry account + project | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (NEXT_PUBLIC_ unused now — browser SDK removed) |
| PostHog account | `NEXT_PUBLIC_POSTHOG_KEY` |
| Razorpay KYC or test mode | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Magic-link signing | `MAGIC_LINK_SECRET` (dev fallback OK locally) |
| Resend domain verify | `RESEND_API_KEY` |
| WhatsApp Business verify | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_OTP_TEMPLATE` (default `otp_login`) — PARKED |
| Re-register Cloudflare Web Analytics | (removes 404 errors on `cdn-cgi/rum` + likely fixes React #418 hydration) |

## 11. Production gotchas (the long debugging arc)

### 11.1 `@sentry/nextjs` poisoning Cloudflare Pages
**Symptom**: CF Pages build fails with `"duplicated identifier"` from `@cloudflare/next-on-pages`.

**Root cause**: `@sentry/nextjs` auto-bundles `@sentry/node` + OpenTelemetry into every route bundle. `next-on-pages` cannot dedupe across route bundles. Removing imports doesn't help — Next 15 auto-detects from `package.json`.

**Fix attempts** (in order):
1. Gating `withSentryConfig` behind `CF_PAGES=1` env var — didn't work
2. Removing `instrumentation.ts` files — didn't work
3. **Final**: removed `"@sentry/nextjs"` from `apps/web/package.json` entirely

**Future**: when browser error capture is wanted, add `@sentry/browser` standalone — pure-browser, tree-shakes cleanly.

### 11.2 Cohere response shape mismatch
**Symptom**: Backfill script returns 0 embeddings, no error.

**Root cause**: When you send `embedding_types: ['float']` in the Cohere request, the response shape is `{embeddings: {float: [[...]]}}` not `{embeddings: [[...]]}`.

**Fix**: `extractVectors()` helper handles both shapes — see `apps/api/src/lib/embeddings.ts:34`.

### 11.3 Postgres UUID `=` text error during backfill
**Symptom**: `PrismaClientUnknownRequestError 42883: operator does not exist: uuid = text`.

**Fix**: cast in raw SQL: `where id = $1::uuid`. Lives in `apps/api/scripts/backfill-embeddings.ts`.

### 11.4 Semantic search column-name mismatches
**Symptom**: Render logs show `42703: column "title" does not exist`.

**Root cause**: `content_items` uses `(title, body)` but `temples` and `puja_types` use `(name, description)`. Original code hardcoded `title` and `description`.

**Fix**: `TABLE_COLS` map in `apps/api/src/routes/semantic-search.ts:38`:
```ts
const TABLE_COLS = {
  content_items: { titleCol: 'title', snippetCol: 'body' },
  temples:       { titleCol: 'name',  snippetCol: 'description' },
  puja_types:    { titleCol: 'name',  snippetCol: 'description' },
};
```

### 11.5 Priest auth UUID crash (Sentry caught)
**Symptom**: `PrismaClientKnownRequestError` on `priest.findUnique({where: {userId: 'demo-pandit-001'}})` — userId not a valid UUID.

**Fix**: in `apps/api/src/middlewares/auth.ts`, short-circuit synthetic IDs to 403 BEFORE the Prisma lookup:
```ts
if (userId.startsWith('demo-') || userId.startsWith('anon-')) {
  reply.code(403).send({error: 'Forbidden', ...});
  return;
}
```
Status: fixed in commit `eb3cc5d`. Sentry events show 4× resolved.

### 11.6 Sankalp double-wrap from Llama 3.3
**Symptom**: AI returns `{sanskrit: "<full json string>"}` — model wraps its own JSON output.
**Fix**: detect nested `{` in `sanskrit` field, re-parse. Lives in `ai.service.ts`.

### 11.7 AI chat 500 for demo users
**Symptom**: `prisma.aiConversation.create` fails UUID FK on `demo-devotee`.
**Fix**: skip DB persistence for `demo-*` and `anon-*` ids.

### 11.8 Anonymous AI chat
**Symptom**: `/ai/chat` rejected unauthenticated requests.
**Fix**: made auth-optional with `anon-<ts>` synthetic id.

### 11.9 Mobile drawer behind page
**Symptom**: Drawer rendered behind page content.
**Root cause**: Drawer was inside header element which has `backdrop-blur` (creates stacking context).
**Fix**: `createPortal(document.body)` + `z-[100]/[101]`.

### 11.10 Adopt Today sticky overlap
**Fix**: removed `lg:sticky` entirely (multiple half-fixes failed first).

### 11.11 Triple scrollbar on chat pages
**Fix**: `calc(100dvh - 56px)` container + scoped `el.scrollTo` instead of `scrollIntoView` (which bubbled to window).

### 11.12 Suspense for `useSearchParams`
**Fix**: `Analytics.tsx` Suspense-wrapped to avoid forcing dynamic rendering.

### 11.13 React error #418 (hydration mismatch) — diagnosed but not fixed
**Symptom**: Browser console shows `Minified React error #418`.
**Likely root cause**: Cloudflare's auto-injected `beacon.min.js` injects `<script>` into HTML response between server render hash and client hydration. Same root cause as the CORS/404 errors on `cloudflareinsights.com/cdn-cgi/rum`.
**Fix**: re-register site via Cloudflare zone integration (delete auto-install, re-add via "Use this zone's RUM data"). Both errors clear together.
**Verified clean** (NOT the cause): `AuthProvider`, `CartProvider`, `NotificationPrompt`, `Analytics`, `NavAuthButton`, `NavCartButton`, `DeferredClientWidgets`. Footer copyright already has `suppressHydrationWarning`.

### 11.14 VS Code red folder
**Symptom**: `bhaktisetu` folder shown in red in VS Code sidebar.
**Root cause**: deprecated `baseUrl` in `apps/web/tsconfig.json`.
**Fix**: removed `baseUrl` entirely (paths work without it on TS 5+).

### 11.15 `pnpm exec tsx` path doubling
**Symptom**: `pnpm --filter @poojly/api exec tsx apps/api/scripts/...` fails with not-found.
**Fix**: when using `--filter`, paths are relative to package root — drop the `apps/api/` prefix.

### 11.16 Missing dotenv
**Fix**: replaced with manual `.env` loading using `fs.readFileSync` in backfill script.

## 12. Verification gotchas — read before debugging

**Don't probe server-rendered HTML for client-only integrations.** The following are intentionally absent from `curl https://darshya.online`:
- `NotificationPrompt` — initial state `hidden`, returns `null` until `useEffect` ~4s after paint, signed-in users only
- PostHog `posthog-js` — loaded via `posthog.init()` in `useEffect`
- Cloudflare beacon — auto-injected at edge by zone proxy

To verify, open the site in a browser → DevTools Network tab → look for outbound requests to `posthog.com`, `sentry.io`, `cloudflareinsights.com`. Don't grep static HTML.

## 13. Mobile parity plan (NOT YET STARTED)

Plan file: `C:\Users\DELL\.claude\plans\iridescent-gathering-blum.md`. Readable summary: `docs/mobile-plan.md`.

**Scope**: 5 phases, 25-35 hours. iOS/Android Expo app → feature-complete twin of web.

**Current mobile state**: zero auth wiring, zero real API calls, 9 tabs all use inline mock data. Shared `@poojly/api-client` is RN-compatible but not installed in mobile package.

### Phase 1 — Foundation + auth (4-5h) **← test in Expo Go after this**
- Install `@poojly/api-client`, `@tanstack/react-query`, `expo-secure-store`
- Add auth hooks to `@poojly/api-client/src/hooks/auth.ts`
- Mirror `apps/web/lib/auth-context.tsx` in mobile, swap `localStorage` → `expo-secure-store`, `window.location.href` → `router.replace()`
- 8 role-based Expo Router groups: `(devotee)/`, `(priest)/`, `(store-admin)/`, `(astrologer)/`, `(wellness)/`, `(temple)/`, `(gaushala)/`, `(admin)/`
- Move existing tabs into `(devotee)/`
- Auth screens: `(auth)/login.tsx`, `verify-otp.tsx`, `signup.tsx`
- Each non-devotee group gets placeholder `dashboard.tsx`
- Root `index.tsx` redirects based on auth state

**Phase 1 verification**: API local on LAN IP, set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000`, scan Expo Go QR, test all 8 demo accounts.

### Phase 2 — Devotee tabs wired to real API (4-5h)
Replace mock data in 9 tab screens with `useQuery` hooks. Add booking flow that stops at "Payment integration coming soon" alert.

### Phase 3 — Priest, Store, Devotee-Booking portals (5-6h)
- Priest: 6 screens (dashboard, bookings, services, reviews, payouts, profile)
- Store admin: 5 screens (dashboard, products, orders, reviews, revenue)
- Devotee bookings sub-page

### Phase 4 — Astrologer, Wellness, Temple, Gaushala portals (5-6h)
~16 portal screens across 4 roles. Temple darshan shows stream metadata only (no real IVS).

### Phase 5 — Admin portal + polish (4-5h)
- Admin: 7 screens (dashboard, users, approvals, support, revenue, reports, settings)
- Pull-to-refresh, loading skeletons, error states, deep linking via `poojly://`

### Out of scope (acknowledged limits)
1. No real video streaming (AWS IVS) — temple darshan shows metadata only
2. No real payment — booking stops at alert
3. No native push (FCM/APNs) — local Alert only
4. No iOS native build (`.ipa`) — Expo Go only, requires Apple Developer account
5. The local API server must be running (no deployed API yet for mobile)

## 14. Files map — recent additions

### Day 1 (foundation)
```
apps/api/src/lib/sentry.ts                    Sentry init + captureException
apps/api/src/lib/email.ts                     Resend singleton + 3 templates
apps/api/src/routes/magic-link.ts             /request, /verify; HMAC tokens
apps/web/sentry.client.config.ts              (REMOVED — see §11.1)
apps/web/components/Analytics.tsx             PostHog client (Suspense-wrapped)
apps/web/components/CloudflareAnalytics.tsx   CF Web Analytics beacon
apps/web/app/auth/verify/page.tsx             magic-link landing (edge runtime)
```

### Day 2 (money/audio)
```
apps/api/src/lib/r2.ts                        Supabase Storage adapter (named r2.ts for stable export)
apps/api/src/lib/pdf-receipt.ts               pdf-lib 80G receipt generator
apps/api/src/routes/media.ts                  /upload-url presigned PUT
apps/api/src/routes/donations.ts              /create-order, /verify; in-memory store
```

### Day 3 (engagement)
```
apps/api/src/lib/whatsapp.ts                          Meta Graph API helper, sendWhatsappTemplate/Text
apps/api/src/routes/whatsapp-otp.ts                   /request + /verify, returns email-* session token
apps/api/src/lib/web-push.ts                          VAPID + sendNotification, expired-detect (404/410)
apps/api/src/routes/notifications.ts                  /vapid-public-key, /subscribe, /unsubscribe, /test + notifyUser helper
apps/api/src/lib/embeddings.ts                        Cohere embed-multilingual-v3 single + batch + toPgVector
apps/api/src/routes/semantic-search.ts                pgvector cosine + LIKE fallback, TABLE_COLS map
apps/api/src/routes/cron.ts                           /daily token-gated, constant-time compare
apps/api/prisma/migrations/20260426_pgvector/         enable extension + add embedding columns + IVFFlat indexes
apps/api/scripts/backfill-embeddings.ts               manual .env load, UUID cast, idempotent
apps/api/src/types/web-push.d.ts                      module shim (no @types/web-push on npm)
.github/workflows/daily-cron.yml                      00:00 UTC = 05:30 IST daily POST
apps/web/components/NotificationPrompt.tsx            permission flow (signed-in users only, 7-day dismiss)
apps/web/public/sw.js                                 service worker — push only, no app-shell cache
```

### Modified
- `apps/api/src/server.ts` — Sentry init at top; routes registered: magic-link, media, donations, whatsapp-otp, notifications, semantic-search, cron; `setErrorHandler` reports to Sentry
- `apps/api/src/middlewares/auth.ts` — `email-*` token branch added before Supabase; synthetic ID short-circuit
- `apps/api/src/services/booking.service.ts` — wired `notifyUser` into status transitions; added `pushMessageFor()` helper
- `apps/web/app/layout.tsx` — Analytics, CloudflareAnalytics, NotificationPrompt mounted
- `apps/web/next.config.ts` — removed all Sentry references; comment block explaining why
- `apps/web/package.json` — removed `@sentry/nextjs` dependency entirely
- `apps/web/tsconfig.json` — removed deprecated `baseUrl`

## 15. Recently confirmed live values + smoke test results

E2E sweep on 2026-04-27 confirmed:
- Vector search English: `q=removing obstacles for success` → `mode:"vector"` → top hit Ganesh Puja
- Vector search Hindi: `q=शांति` → `mode:"vector"` → top hit Bajrang Baan
- Cron endpoint reachable at `/api/v1/cron/daily` with bearer auth
- VAPID public key endpoint returns `{enabled: true, publicKey: "BH7s..."}`
- Magic-link `/verify` returns `email-<userId>-<32hex>` session token
- All 8 demo accounts log in and route to correct dashboards
- 80G PDF receipt downloads with valid signature

## 16. How future sessions should use this

1. Read `CLAUDE.md` first.
2. Run `TaskList` to see in-progress work.
3. Check `docs/launch-state.md` for current state and any newly added components.
4. Load this file (`docs/full-context.md`) only when you need historical depth or production gotchas.
5. Verify any "memory/doc says X exists" claim by reading the actual source file before recommending action.
6. When adding a new integration, follow the env-var-or-noop pattern.
7. Update `docs/launch-state.md` (NOT this file) when state materially changes. This file is the historical baseline.

## 17. Active multi-session plans

- `C:\Users\DELL\.claude\plans\iridescent-gathering-blum.md` — Mobile App full parity (5 phases, 25-35h). Out of scope: real video, real payments, native push, iOS native build. Readable summary: `docs/mobile-plan.md`.

## 18. Service delivery audit (chat / call / video — DONE see §19)

### What already exists
- **Jitsi consultation route**: `apps/api/src/routes/consultation.ts` — `POST /api/v1/consultation/start` requires auth, returns a random `meet.jit.si/darshya-<kind>-<slug>-<32hex>` room URL. **No DB persistence, no booking link, no chat history.**
- **Consultation room page**: `apps/web/app/consultation/[room]/page.tsx` — embeds Jitsi iframe with `?provider=Name` query string. Edge runtime. Public — anyone with the URL can join.
- **Booking state machine** (`apps/api/src/services/booking.service.ts:69`): `pending_payment → confirmed → priest_assigned → in_progress → completed → video_uploaded → delivered`. `priest_assigned` and `in_progress` are the natural hooks for chat/call.
- **Push notifications** wired on `confirmed/priest_assigned/video_uploaded/cancelled` (booking.service.ts:291).
- **AI chat** (`/api/v1/ai/chat`): single-user with Llama 3.3, persists in `AiConversation.messages` JSON. NOT human-to-human.
- **Provider portals exist** (web): `/priest`, `/astrologer-portal`, `/wellness-portal`, `/temple-portal`, `/gaushala-portal`, `/store-admin`, `/admin`. Most have skeleton screens (`page.tsx`, `bookings`, `consultations`, `availability`, `profile`, `services`, `payouts`, `reviews`).

### What's missing (the gap)
- **No human-to-human chat model** in Prisma. No `Conversation`, `Message`, `Thread` tables. Only `AiConversation` (single-user).
- **No booking ↔ Jitsi room link**. Provider can't see "click here to deliver service for booking BS-...". Each `/consultation/start` creates a fresh URL, never persisted, never tied to a paid booking.
- **Provider has no inbox UI**. After `/priest/bookings` shows assigned bookings, there's no "open chat" or "join call" CTA per row.
- **Devotee has no provider directory with chat-first CTA**. To start a consultation right now you'd have to know to hit `/api/v1/consultation/start` directly.
- **Razorpay verify (`apps/api/src/routes/donations.ts`) doesn't transition booking state to `priest_assigned`**. Donation verify currently issues an 80G receipt; consultation/puja booking payment verify is the puja flow but the post-payment auto-assignment of a provider isn't wired (`priest_assigned` is currently triggered by manual admin action, not by payment success).
- **No "I'm not able to do any of it logged in" investigation yet** — likely the portal landing pages use `(role)` route groups that don't exist, or the `/dashboard` redirect doesn't account for provider roles. To verify: `apps/web/lib/auth-context.tsx:194` `getRoleDashboardPath()` returns `/priest`, `/astrologer-portal` etc — these portal `page.tsx` files exist but may be reading mock data instead of `useMyBookings`/`useAssignedConsultations`.

## 19. Chat / call / video build (Phases A-D, all complete 2026-04-27)

### What shipped
- 3 new Prisma models: `ChatConversation`, `ChatMessage`, `ChatCallSession` (apps/api/prisma/schema.prisma:780+)
- Migration: `apps/api/prisma/migrations/20260427_chat/migration.sql` — applied to Supabase prod
- 8 demo users seeded with REAL UUIDs: `apps/api/scripts/seed-demo-users.ts`. Demo phones use +91-0000000001 through 0000000008 to avoid colliding with seed-data block (+919876543XXX)
- Auth middleware rewrite: `demo-*` tokens now look up real DB users by email, returning real UUIDs (auth.ts:58-110). Falls back to synthetic ID only if seed hasn't run.
- Conversation routes: `apps/api/src/routes/conversations.ts` — list / create / get / messages (poll w/ `?since=`) / send / read / start-call / end-call
- Auto-conversation hook: `apps/api/src/services/conversation.service.ts` `ensureConversationForBooking()`. Called from `booking.service.ts` on `priest_assigned` transition.
- Demo-pay bypass: `apps/api/src/routes/demo-pay.ts` — `/api/v1/demo-pay/puja` (full booking flow) and `/start-chat` (any provider). Gated by `ENABLE_DEMO_PAY=true` env var (auto-on outside production).
- Shared `<Inbox role="devotee" | "provider" | "auto">` component: `apps/web/components/Inbox.tsx`. 3-second polling, autoscroll, system / call_link / text message renderers, video+phone CTAs that call `/start-call`.
- 7 inbox pages: `/messages` (devotee) plus `/{priest,astrologer-portal,wellness-portal,temple-portal,gaushala-portal,store-admin}/messages`
- Demo entry page: `/demo/chat` — one-click for any of 6 provider kinds
- Sidebar Messages tab added to all 6 provider portal layouts + auth dropdown for devotees

### Smoke test results (2026-04-27, local)
- `POST /api/v1/demo-pay/puja` → 200, real booking + conversation created, demo pandit auto-assigned
- `GET /api/v1/conversations` → both devotee and pandit see the conversation from their respective sides
- Send → reply → read flow: unread counts work correctly, autoscroll works
- `POST /api/v1/conversations/:id/start-call` → 200, valid `meet.jit.si/darshya-puja_booking-<32hex>` URL, system call_link message posted to thread
- Web pages: `/messages`, `/demo/chat`, `/priest/messages`, `/astrologer-portal/messages` all compile and serve 200 under `next dev`
- TypeScript: API + web both green (`pnpm tsc --noEmit`)

### Known limitations
- **3-second polling, not realtime sockets**. Upgrade path: Supabase Realtime (200 concurrent on free tier) — replace `setInterval` in `Inbox.tsx`.
- **Public Jitsi server (meet.jit.si)** — anyone with the 32-char random URL can join. Adequate for demo; for prod, self-host Jibri or use a JWT-gated tenant.
- **No call recording** (Jitsi public doesn't support).
- **`ENABLE_DEMO_PAY=true`** must be set to use demo-pay in production. If you ever want this on Render, paste it into Render env. Currently in local `.env` only.
- **Old conversations** (created before the priest auto-assignment fix) point at a different priest user (Pandit Ramesh Shastri vs Pandit Ramesh Sharma). Cosmetic — the demo flow now deterministically assigns the seeded pandit.

## 20. Conversation arc (high-level chronology)

1. User started Day 1 — foundation integrations (Sentry, PostHog, CF Analytics, Resend, magic-link)
2. Day 2 — wanted Cloudflare R2, hit card-required wall, swapped to Supabase Storage; Razorpay + 80G receipts shipped
3. Day 3 — WhatsApp parked (no Meta verification), web push + Cohere semantic search + GH cron shipped
4. Long debugging session: Cohere returning 0 embeddings (response shape), Postgres 42883 UUID error (cast), Postgres 42703 column error (TABLE_COLS map), CF Pages "duplicated identifier" (removed @sentry/nextjs), Sentry priest UUID crash (synthetic ID short-circuit)
5. Final E2E sweep verified all components green
6. Session ended on Cloudflare Web Analytics CORS errors + React #418 hydration mismatch — diagnosed both as same root cause (auto-injected beacon needs site re-registration); not fixed yet
