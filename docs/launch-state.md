# Launch state

> High-churn doc. Update this when phases progress, files are added, or open items resolve.
> Last refreshed: 2026-04-26.

## 3-day launch plan status

| Phase | Status | Scope |
|---|---|---|
| Day 1 — Foundation | ✅ done | Sentry + PostHog + Cloudflare Web Analytics + Resend + magic-link auth |
| Day 2 — Money/Audio | ✅ done | Cloudflare R2 + Razorpay checkout + 80G PDF receipts (donations + booking flow) |
| Day 3 — Engagement | ✅ done | WhatsApp Business Cloud API + GitHub Actions cron + Cohere embeddings + web push |

Mobile parity is a parallel track — see `docs/mobile-plan.md`.

## Recent files (Days 1-2)

Don't re-scaffold these.

```
apps/api/src/lib/sentry.ts                    Sentry init + captureException
apps/api/src/lib/email.ts                     Resend singleton + 3 templates
apps/api/src/lib/r2.ts                        S3 SDK → R2; upload/presign/delete
apps/api/src/lib/pdf-receipt.ts               pdf-lib 80G receipt generator
apps/api/src/routes/magic-link.ts             /request, /verify; HMAC tokens
apps/api/src/routes/media.ts                  /upload-url presigned PUT
apps/api/src/routes/donations.ts              /create-order, /verify; in-memory store
apps/web/sentry.client.config.ts              Sentry browser SDK
apps/web/components/Analytics.tsx             PostHog client (Suspense-wrapped)
apps/web/components/CloudflareAnalytics.tsx   CF Web Analytics beacon
apps/web/app/auth/verify/page.tsx             magic-link landing (edge runtime)
```

Modified:
- `apps/api/src/server.ts` — Sentry init at top; magic-link + media + donations registration; `setErrorHandler` reports to Sentry
- `apps/api/src/middlewares/auth.ts` — `email-*` token branch added before Supabase
- `apps/web/app/layout.tsx` — Analytics + CloudflareAnalytics mounted

## Day 3 files (written)

```
apps/api/src/lib/whatsapp.ts                          Meta Graph API helper, sendWhatsappTemplate/Text
apps/api/src/routes/whatsapp-otp.ts                   /request + /verify, returns email-* session token
apps/api/src/lib/web-push.ts                          VAPID + sendNotification, expired-detect (404/410)
apps/api/src/routes/notifications.ts                  /vapid-public-key, /subscribe, /unsubscribe, /test + notifyUser helper
apps/api/src/lib/embeddings.ts                        Cohere embed-multilingual-v3 single + batch + toPgVector
apps/api/src/routes/semantic-search.ts                pgvector cosine + LIKE fallback
apps/api/src/routes/cron.ts                           /daily token-gated, constant-time compare
apps/api/prisma/migrations/20260426_pgvector/         enable extension + add embedding columns + IVFFlat indexes
apps/api/src/types/web-push.d.ts                      module shim (no @types/web-push on npm)
.github/workflows/daily-cron.yml                      00:00 UTC = 05:30 IST daily POST
apps/web/components/NotificationPrompt.tsx            permission flow (signed-in users only, 7-day dismiss)
apps/web/public/sw.js                                 service worker — push only, no app-shell cache
```

Modified:
- `apps/api/src/server.ts` — registers donations, media, whatsapp-otp, notifications, semantic-search, cron routes; tightened error-handler typing
- `apps/web/app/layout.tsx` — mounts `<NotificationPrompt />` after `<Analytics />`

## Open items — user must do these to unblock

Once any env var is set, the corresponding code branch activates (existing code already coded for ✅ rows; Day 3 rows light up after code is written).

| What user does | Env vars to set | Status |
|---|---|---|
| Sign up at sentry.io, create project | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | code ✅ — needs key |
| Sign up at posthog.com | `NEXT_PUBLIC_POSTHOG_KEY` | code ✅ — needs key |
| Cloudflare → Web Analytics | `NEXT_PUBLIC_CLOUDFLARE_BEACON_TOKEN` | code ✅ — needs key |
| Sign up at resend.com + verify darshya.online domain | `RESEND_API_KEY` | code ✅ — needs key |
| Supabase Storage → create bucket `darshya-media` (public, 25 MB cap) | `STORAGE_BUCKET` (defaults to `darshya-media`) — reuses existing `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | swapped from Cloudflare R2 (R2 needs a card on file). `lib/r2.ts` is now a Supabase Storage adapter — see `docs/caveats.md` |
| Razorpay KYC (or test mode) | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | code ✅ — needs keys |
| Magic-link signing secret | `MAGIC_LINK_SECRET` | code ✅ — needs secret (dev fallback OK locally) |
| Meta Business + WhatsApp Business verification | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_OTP_TEMPLATE` (default `otp_login`) | 🅿️ **parked** — code ✅, business verification deferred. Endpoint runs in dev mode (returns `devCode` in response) until env vars are set |
| Sign up at cohere.com | `COHERE_API_KEY` | code ✅ — needs key |
| `npx web-push generate-vapid-keys` | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (default `mailto:support@darshya.online`) | code ✅ — needs keys |
| GitHub repo → Settings → Secrets | `CRON_AUTH_TOKEN`, `API_BASE_URL` (e.g. `https://api.darshya.online`) | code ✅ — needs secrets |
| Run pgvector migration on Supabase | (SQL — file written) | apply `prisma/migrations/20260426_pgvector/migration.sql` then run `pnpm --filter @poojly/api exec tsx scripts/backfill-embeddings.ts` |
| Backfill embeddings | `apps/api/scripts/backfill-embeddings.ts` | code ✅ — runs after Cohere key + pgvector migration are live; idempotent, re-runnable |
| Booking push notifications | wired in `services/booking.service.ts` | code ✅ — fires on `confirmed` / `priest_assigned` / `video_uploaded` / `cancelled` transitions; no-op when VAPID unset |

Full env reference: `docs/env-vars.md`.

## Day 3 activation status (live values held by user)

| Item | Status |
|---|---|
| VAPID keys | ✅ generated by user, ready to paste into Render |
| Cron auth token | ✅ generated `e1b34c4e64633802ad1db56073f388b67b44833200fd09d556bfc5dc280613f6` |
| Cohere API key | ✅ received (rotate after launch) |
| Render API URL | ✅ `https://bhaktisetu.onrender.com` |
| pgvector migration | ✅ applied (Supabase SQL Editor confirmed "Success. No rows returned") |
| GitHub Actions secrets | ⏳ pending Render URL + cron token paste |
| Backfill embeddings | ⏳ pending Cohere key + migration |
| WhatsApp Business | 🅿️ parked (no business verification yet) |

## Recent fixes (notable)

- **Sankalp double-wrap JSON**: Llama 3.3 returned `{sanskrit: "<full json string>"}`. Detect nested `{` in `sanskrit`, re-parse. Lives in `ai.service.ts`.
- **AI chat 500 for demo users**: `prisma.aiConversation.create` failed UUID FK on `demo-devotee`. Skip DB persistence for `demo-*` and `anon-*` ids.
- **Anonymous AI chat**: `/ai/chat` made auth-optional with `anon-<ts>` synthetic id.
- **Mobile drawer behind page**: Drawer was inside header (backdrop-blur stacking context). Fixed with `createPortal(document.body)` + `z-[100]/[101]`.
- **Adopt Today sticky overlap**: removed `lg:sticky` entirely (multiple half-fixes failed first).
- **Triple scrollbar on chat pages**: `calc(100dvh - 56px)` container + scoped `el.scrollTo` instead of `scrollIntoView` (which bubbled to window).
- **Suspense for `useSearchParams`**: `Analytics.tsx` Suspense-wrapped to avoid forcing dynamic rendering.

## Active multi-session plans

- `C:\Users\DELL\.claude\plans\iridescent-gathering-blum.md` — Mobile App full parity (5 phases, 25-35h). Out of scope: real video, real payments, native push, iOS native build. See `docs/mobile-plan.md` for the readable summary.
