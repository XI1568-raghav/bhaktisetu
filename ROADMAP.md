# Roadmap — Darshya

> Phase ledger + future product/business direction. Survives /compact.
> Last updated: 2026-05-13.

## Shipped phases (Day 1 → Layer AL)

| Phase | Scope | Status |
|---|---|---|
| Day 1 | Sentry + PostHog + CF Analytics + Resend + magic-link auth | ✅ |
| Day 2 | Supabase Storage (R2 swap) + Razorpay + 80G PDF receipts | ✅ |
| Day 3 | Web push + Cohere semantic search + GH cron + WhatsApp parked | ✅ |
| Launch readiness (2026-04-29) | Security CRITICALs, 277/277 tests, Sentry web, EAS APK, pitch deck, SEO, SCA, cache | ✅ |
| Layer A → AL | Booking, NRI Stripe, paywall, refunds, subscriptions, FCM, R2, Sentry, i18n, kundli, ratings, A/B | ✅ |

Test status: **312/501 tests green** (per memory). API test files: 16/16 covered.

## Open user-action gates (block live activation)

| Gate | What user must do | Blocker for |
|---|---|---|
| Razorpay live KYC | Submit business docs in Razorpay dashboard | Domestic real payments |
| Stripe NRI KYC | US/UK/CA/AU activation in Stripe | NRI real payments |
| Apple Developer Program | $99/yr signup | iOS build, App Store |
| Google Play Console | $25 one-time signup | Play Store APK |
| FCM server key | Firebase project + paste `FCM_SERVER_KEY` to Render | Native push live |
| Sentry DSN flag | Paste `NEXT_PUBLIC_SENTRY_DSN` to CF Pages + `SENTRY_DSN` to Render. Runbook: `docs/cf-pages-env-wiring-2026-05-13.md` | Error capture in prod |
| WhatsApp Meta Cloud API | Business verification | Outbound WA blasts |
| PostHog project key | Paste `NEXT_PUBLIC_POSTHOG_KEY` to CF Pages. Runbook: same as Sentry above | Funnel dashboards |
| Affiliate programs | Sign up Amazon/Flipkart/MMT (yatra) | Commission revenue |
| Supabase password rotation | Reset + update Render `DATABASE_URL`. Runbook: `docs/security-rotation-2026-05-13.md` | Security hygiene (chat archive contains old password) |
| Unset `ALLOW_DEMO_TOKENS` | Render env → delete after investor demos. Runbook: same as above | Prod auth hardening |
| Resend API key rotation | Old key `re_46d7rTF7_*` leaked. Runbook: same as above | Email security |
| Demo MP4 capture run | Install ffmpeg + Playwright Chromium, run `bash scripts/build-demo-video.sh`. Recipe: `docs/demo-video-recipe-2026-05-13.md` | Razorpay/Stripe/Meta KYC + investor outreach |

## Active multi-session plans

- **Mobile App Full Parity** — `docs/mobile-plan.md` (~25-35h across 4-6 sessions). Phase 1 = auth + role groups; Phase 2 = devotee tabs to real API; later phases = portal screens.
- **Mobile parity audit** — `docs/mobile-parity-audit.md`.

## Strategy tripwires

Multi-vertical super-app vs NRI-only narrow focus. Two or more in same week → fold to NRI-only.

| Tripwire | Threshold | Action |
|---|---|---|
| NRI Day-30 retention | < 25% by week 8 | Fold to NRI-only SKU |
| Blended NRI CAC | > $40 vs monthly-sub LTV by week 8 | Fold + pause paid acquisition |
| NRI annual:per-puja ratio | < 1:3 by week 12 | Re-frame as per-puja, pull revenue projection |
| Sri Mandir launches USD premium tier | Any time | Window closed — execute pivot |

Source: `docs/strategy/appsforbharat-steelman.md`.

## Future direction (not started)

### Q3 2026 candidates
- iOS native build pipeline (after Apple Dev Program)
- Live darshan IVS player on mobile (currently web-only)
- Real video calls (Jitsi → Daily.co or LiveKit if scale demands)
- Astrology marketplace expansion (verified astrologer onboarding flow)
- Yatra package commerce — full booking with hotel + transport partners
- Gaushala seva subscription tiers
- Gift puja for NRI → Indian recipient with WhatsApp delivery
- B2B temple SaaS (donations + e-prasad + livestream-as-a-service)

### Revenue lines (priority order)
1. Per-puja booking commission (20-40%)
2. NRI annual subscription (₹5000 / $60 — `nri_premium_yearly`)
3. AI Pandit subscriptions (`astro_session` ₹99 / `astro_monthly` ₹499)
4. E-commerce store (Medusa) — prasad, idols, books
5. Donation 80G processing fees
6. Affiliate (Amazon/Flipkart/MMT for yatra) — pending program approvals
7. Astrology consultation commission
8. Yatra packages

### Long-term bets
- WhatsApp-first onboarding (Meta Cloud API)
- Voice-first AI Pandit (Groq + native TTS)
- Offline-first mobile for low-connectivity rural users
- Regional language expansion beyond Hindi/English (Tamil, Telugu, Bengali, Marathi)

## How to update this file

When phases progress, scope expands, or priorities shift — add a row or section here. Don't write new roadmap thinking in chat. Reference deeper plans by file path, don't inline them.
