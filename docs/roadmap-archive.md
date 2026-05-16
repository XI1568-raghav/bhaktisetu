# Roadmap — Archive (load on demand)

> Historical phases + long-term direction spillover from `ROADMAP.md`. Active gates + tripwires stay in main file.

## Shipped phases (Day 1 → Layer AL)

| Phase | Scope | Status |
|---|---|---|
| Day 1 | Sentry + PostHog + CF Analytics + Resend + magic-link auth | ✅ |
| Day 2 | Supabase Storage (R2 swap) + Razorpay + 80G PDF receipts | ✅ |
| Day 3 | Web push + Cohere semantic search + GH cron + WhatsApp parked | ✅ |
| Launch readiness (2026-04-29) | Security CRITICALs, 277/277 tests, Sentry web, EAS APK, pitch deck, SEO, SCA, cache | ✅ |
| Layer A → AL | Booking, NRI Stripe, paywall, refunds, subscriptions, FCM, R2, Sentry, i18n, kundli, ratings, A/B | ✅ |

Test status: **416/416 tests green** across 32 service files (as of 2026-05-17 signup-role wire).

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
