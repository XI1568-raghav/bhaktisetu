# Launch state

> High-churn doc. Update when phases progress, files are added, or open items resolve.
> Last refreshed: 2026-04-29 (post launch-readiness pass).

## 🎉 LAUNCH STATUS: SHIP-READY

Day 1-3 + launch-readiness pass shipped, deployed, verified end-to-end.

| Day | What | Status |
|---|---|---|
| Day 1 | Sentry + PostHog + CF Analytics + Resend + magic-link auth | ✅ live |
| Day 2 | Supabase Storage (R2 swap) + Razorpay + 80G PDF receipts | ✅ live |
| Day 3 | Web push + Cohere semantic search + GH cron + WhatsApp (parked) | ✅ live |
| Launch readiness | Security CRITICALs + tests + Sentry web + EAS APK + pitch deck + SEO + SCA + cache | ✅ live |

**Live URLs**: https://darshya.online · https://api.darshya.online
**Last deploy commit**: `fc9febe` (Redis cache layer)
**Production smoke**: API /health 200, web /pitch 200, /sitemap.xml 200, /robots.txt 200.

## 2026-04-29 launch-readiness pass

Single PR merged to main (`#1`, squash → `84a179c`) bundling 20 commits across security, tests, mobile, SEO, observability. Followed by two surgical pushes.

### Security (CRITICAL → fixed)

| File | Fix |
|---|---|
| `apps/api/src/routes/subscriptions.ts` | Razorpay webhook HMAC verification + Zod body validation |
| `apps/api/src/middlewares/auth.ts` | Demo-token branch gated `NODE_ENV !== 'production' \|\| ALLOW_DEMO_TOKENS === 'true'` |
| `apps/api/src/routes/donations.ts` | Zod validation, ₹101 floor, ₹10L cap |
| `apps/api/src/server.ts` | Stack trace hidden in prod, per-route rate limits (`/auth/*` 10/min, `/ai/chat` 20/min), CORS env-driven |
| `apps/api/prisma/migrations/20260428_phase2_indexes.sql` | Composite indexes on hot paths (DailyPanchang, Temple, PujaType, ContentItem) |

### Tests

- 277/277 green across 16 service test files (was 2/16 → 16/16 coverage)
- New: gaushala, astrology, onboarding, priest, panchang, conversation, provider, admin, ai, content, store, subscription, payment
- `apps/api/src/lib/__mocks__/prisma.ts` — manual deep-mock pattern, vi.fn per method

### Mobile

- EAS Android preview APK shipped (`expo-modules-autolinking ~2.0.0` + `expo-modules-core ~2.2.0` pinned to fix peer-hash drift causing `expo.core.ExpoModulesPackage` symbol error)
- Apple Developer + Play Console signups still pending ($99/yr + $25 one-time)

### Observability + SEO

- `apps/web/lib/sentry-client.ts` + `SentryProvider` + `global-error.tsx` — `@sentry/browser` standalone, NOT `@sentry/nextjs` (breaks `@cloudflare/next-on-pages`)
- `apps/web/app/robots.ts` + `apps/web/app/sitemap.ts` — dynamic temple + puja slugs at build time
- `apps/web/app/temples/[slug]/page.tsx` — JSON-LD `LocalBusiness` schema injected
- `apps/web/app/pitch/` — investor pitch deck route at /pitch with Playwright capture script

### Type cleanup + dep hygiene (post-merge)

| Commit | Change |
|---|---|
| `c5fdc4e` | gitignore EAS build logs + Playwright test outputs (was 25 untracked) |
| `f10828c` | pnpm.overrides patch all 44 transitive CVEs (uuid/tar/xmldom/minimatch/path-to-regexp/esbuild/cookie/ajv/smol-toml/srvx/@tootallnate/once/postcss/undici). `pnpm audit` → "No known vulnerabilities found" |
| `fc9febe` | Upstash Redis cache layer for panchang/temple/puja read paths (env-or-noop) |

## Open items — user must do these to unblock

| What | Env / action | Status |
|---|---|---|
| Rotate Supabase DB password | dashboard → reset → update Render `DATABASE_URL` | ⏳ pending (chat archive contains old password literal) |
| Unset `ALLOW_DEMO_TOKENS` on Render after investor demos | Render env → delete | ⏳ pending |
| Apple Developer Program signup | $99/yr | ⏳ blocked on user $$ |
| Google Play Console signup | $25 one-time | ⏳ blocked on user $$ |
| `REDIS_URL` for cache activation | Upstash free tier (10K cmd/day) → paste into Render | ⏳ optional |
| Demo video MP4 stitching | needs `ffmpeg` install + run capture script | ⏳ deferred |

Day 1-3 env unchanged from prior pass (Sentry/PostHog/Resend/Razorpay/etc) — see `docs/env-vars.md`.

## Verification gotchas — read before debugging

**Don't probe server-rendered HTML for client-only integrations.** PostHog, Sentry browser SDK, NotificationPrompt all run in the browser only. Use DevTools Network tab against `posthog.com`/`sentry.io`/`cloudflareinsights.com`, don't grep static HTML.

## Strategy tripwires (from `docs/strategy/appsforbharat-steelman.md`)

Multi-vertical super-app vs NRI-only narrow focus. Two or more tripwires firing in the same week → fold to NRI-only.

| Tripwire | Threshold | Action if fires |
|---|---|---|
| NRI Day-30 retention | < 25% by week 8 | Fold to NRI-only SKU |
| Blended NRI CAC | > $40 vs monthly-sub LTV by week 8 | Fold + pause paid acquisition |
| NRI annual:per-puja ratio | < 1:3 by week 12 | Re-frame as per-puja, pull revenue projection |
| Sri Mandir launches USD premium tier | Any time | Window closed — execute pivot |

## Active multi-session plans

- `C:\Users\DELL\.claude\plans\iridescent-gathering-blum.md` — Mobile App full parity. See `docs/mobile-plan.md`.

## Outreach + Waitlist Operations

- Daily ops endpoint: `POST /api/v1/admin/jobs/daily-ops` (admin token)
- Recommended cron: every 30 min via cron-job.org → outreach tick
- Daily 5am IST: panchang blast
- Lead scrapers: `pnpm leads:scrape-all` (manual or weekly)
- Admin dashboard: https://darshya.online/admin/leads
- Required env vars: RESEND_API_KEY, GROQ_API_KEY, WHATSAPP_TOKEN (optional)
