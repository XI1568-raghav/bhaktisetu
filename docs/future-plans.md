## Future Plans — Darshya

> Consolidated forward view. Sources of truth (still authoritative):
> - `ROADMAP.md` — slim active gates + tripwires
> - `docs/roadmap-archive.md` — historical phases + Q3 candidates + revenue lines + long-term bets
> - `docs/activation-gates.md` — U1-U15 user-action blockers
> - `docs/mobile-plan.md` — Phase 1-5 mobile parity (substantially shipped per project memory)
>
> This doc = single-glance summary. When in doubt, read the source. Last updated 2026-05-21.

---

## Near-term engineering (carry across sessions)

Live ledger in `TASKS.md`. Current pending:

| # | Task | Why pending | Notes |
|---|---|---|---|
| E2 | Wire FCM server key on user paste | Requires user paste from Firebase | env-or-noop branch in place |
| E9 | Embedded Stripe Elements for clientSecret-only fallback | TODO from W8 | Mirrors pujas page gap; current Stripe Checkout URL redirect works |
| E10 | `getPublicPriests({ specialization?, deity? })` server-side filter | API enhancement | Client-side keyword filter (specializations+bio) works for now |

**Pre-existing test debt (NOT blocking)**: `apps/web/__tests__/*` + `vitest.setup.ts` lack `@testing-library/react` types. Fix when convenient: `pnpm --filter @poojly/web add -D @testing-library/react @testing-library/jest-dom`.

---

## User-action gates (U1-U15) — none can be unblocked by agents

Full table at `docs/activation-gates.md`. Summary buckets:

**Payments + KYC**:
- U1 Razorpay live KYC → domestic real payments
- U2 Stripe NRI KYC (US/UK/CA/AU) → NRI real payments
- U15 `ALLOW_DEMO_PAYMENTS=true` on Render until U1 → keep API alive

**Mobile distribution**:
- U3 Apple Developer Program ($99/yr) → iOS build + App Store
- U4 Google Play Console ($25) → Play Store APK

**Observability + comms**:
- U5 FCM server key paste → native push live
- U6 Sentry DSN paste → prod error capture
- U7 WhatsApp Meta Cloud API verification → WA blasts
- U8 PostHog key paste → funnel dashboards

**Revenue + partners**:
- U9 Affiliate signups (Amazon/Flipkart/MMT) → commission revenue

**Security hygiene**:
- U10 Supabase password rotation
- U11 Unset `ALLOW_DEMO_TOKENS` on Render after demos
- U12 Rotate Resend API key (leaked: `re_46d7rTF7_7DygN1pnEpG3T5Cmi5cMnvB3`)

**Operational**:
- U13 Demo MP4 capture run (needed for KYC + investor outreach)
- U14 `REDIS_URL` paste from Upstash free tier → cache activation

---

## Strategy tripwires (multi-vertical vs NRI-only)

Two breaches same week → fold to NRI-only SKU. Source: `docs/strategy/appsforbharat-steelman.md`.

| Tripwire | Threshold | Action |
|---|---|---|
| NRI Day-30 retention | < 25% by week 8 | Fold to NRI-only SKU |
| Blended NRI CAC | > $40 vs monthly-sub LTV by week 8 | Fold + pause paid acquisition |
| NRI annual:per-puja ratio | < 1:3 by week 12 | Re-frame as per-puja, pull revenue projection |
| Sri Mandir launches USD premium tier | Any time | Window closed — execute pivot |

---

## Q3 2026 candidate features (not started)

- iOS native build pipeline (after Apple Dev Program — U3)
- Live darshan IVS player on mobile (currently web-only)
- Real video calls (Jitsi → Daily.co or LiveKit if scale demands)
- Astrology marketplace expansion (verified astrologer onboarding flow)
- Yatra package commerce — full booking with hotel + transport partners
- Gaushala seva subscription tiers
- Gift puja for NRI → Indian recipient with WhatsApp delivery
- B2B temple SaaS (donations + e-prasad + livestream-as-a-service)

---

## Revenue lines (priority order)

1. Per-puja booking commission (20-40%)
2. NRI annual subscription (₹5000 / $60 — `nri_premium_yearly`)
3. AI Pandit subscriptions (`astro_session` ₹99 / `astro_monthly` ₹499)
4. E-commerce store (Medusa) — prasad, idols, books
5. Donation 80G processing fees
6. Affiliate (Amazon/Flipkart/MMT for yatra) — pending program approvals
7. Astrology consultation commission
8. Yatra packages

---

## Long-term bets

- WhatsApp-first onboarding (Meta Cloud API)
- Voice-first AI Pandit (Groq + native TTS)
- Offline-first mobile for low-connectivity rural users
- Regional language expansion beyond Hindi/English (Tamil, Telugu, Bengali, Marathi)

---

## Mobile parity (Expo) — status per `docs/mobile-plan.md`

**Phase 1-5 substantially shipped** (per project memory, verified 2026-05-13):
- Auth context + 8 role groups wired (`(devotee)`, `(temple)`, `(priest)`, `(astrologer)`, `(admin)`, `(gaushala)`, `(store-admin)`, `(wellness)`, `(onboard)`)
- All devotee tabs hit real API via `@poojly/api-client` React Query hooks
- All role portals wired except shared lib screens (`lib/inbox.tsx` + `lib/subscription-screen.tsx`) — intentionally generic
- Phase 5 polish: pull-to-refresh on raw-ScrollView screens

**Remaining mobile work**:
- iOS native build pipeline (blocked by U3 Apple Dev Program)
- Live darshan IVS player (currently web-only)
- Native push notifications (FCM/APNs — needs U5)
- Real payment flow (currently mocks success on payment screen — needs U1/U2)
- Deep linking (`poojly://` scheme — was Phase 5 stretch)

---

## How to use this doc

- Starting a session and unsure what's next → glance `TASKS.md` In progress, then this doc's Near-term table
- User asks "what's the roadmap?" → this doc covers all of it; expand source files only if user wants specifics
- New idea / direction proposal → update `ROADMAP.md` or `docs/roadmap-archive.md` (whichever fits), not this doc — this is a summary, sources are authoritative
- Tripwire question → this doc + `docs/strategy/appsforbharat-steelman.md`
- Pre-deploy / KYC question → `docs/activation-gates.md`

Pointer registered in `CLAUDE.md` lazy-load table.
