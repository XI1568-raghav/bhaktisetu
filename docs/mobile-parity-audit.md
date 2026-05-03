# Mobile parity audit (TD10 — 2026-05-02)

> Audits every web route against the Expo Router mobile app. Updated when the
> mobile screen list changes. The "live" column is what `apps/mobile/app/`
> actually contains right now — not a wishlist.

## Scope

`apps/mobile` is Expo Router (SDK 52, expo-router 4). Mobile uses role groups
(`(devotee)`, `(priest)`, etc.) instead of URL paths. Devotee-facing web routes
land inside `(devotee)/`; portal routes land inside their `(role)/` group.

## Audit table

| Web route | Mobile screen | State |
|---|---|---|
| `/` | `(devotee)/index.tsx` | live |
| `/temples` | `(devotee)/temples.tsx` | live |
| `/temples/[slug]` | — | **missing (devotee/temple/[slug] needed)** |
| `/darshan` | `(devotee)/darshan.tsx` | live |
| `/darshan/[id]` | `(devotee)/darshan/[id].tsx` | added (TD10) — WebView player |
| `/pujas` | `(devotee)/pujas.tsx` | live |
| `/pujas/[slug]/book` | — | **missing (booking flow)** |
| `/donations` | `(devotee)/donations.tsx` | live |
| `/astrology` | `(devotee)/astrology.tsx` | live (rashi grid) |
| `/astrology/kundli` | `(devotee)/astrology/kundli.tsx` | added (TD10) |
| `/astrology/horoscope` | `(devotee)/astrology/horoscope.tsx` | added (TD10) |
| `/astrology/chat` | — | deferred — RN Jitsi SDK not wired |
| `/yatra/destinations` | `(devotee)/yatra/index.tsx` | added (TD10) — list |
| `/yatra/[slug]` | `(devotee)/yatra/[slug].tsx` | added (TD10) — detail |
| `/yatra-packages` | covered by `(devotee)/yatra/index.tsx` | partial |
| `/yatra-packages/[slug]` | — | deferred (yatra detail covers main use case) |
| `/weddings` | `(devotee)/weddings/index.tsx` | added (TD10) |
| `/weddings/muhurat` | `(devotee)/weddings/muhurat.tsx` | added (TD10) |
| `/weddings/inquiry` | inline in weddings index | partial |
| `/antim-sanskar` | — | deferred — sensitive flow, web-first |
| `/upgrade` | `(devotee)/upgrade.tsx` | added (TD10) — NRI Stripe |
| `/account/subscriptions` | — | deferred (Stripe cancel flow web-first) |
| `/store` | `(devotee)/store.tsx` | live |
| `/content` | `(devotee)/content.tsx` | live |
| `/panchang` | inline on home + content | covered |
| `/wellness` (provider listing) | `(devotee)/wellness.tsx` | live |
| `/priest` portal | `(priest)/*` | live |
| `/astrologer-portal` | `(astrologer)/*` | live |
| `/wellness-portal` | `(wellness)/*` | live |
| `/gaushala-portal` | `(gaushala)/*` | live |
| `/store-admin` | `(store-admin)/*` | live |
| `/temple-portal` | `(temple)/*` | live |
| `/admin` | `(admin)/*` (placeholder dashboards) | partial — desktop-first OK |
| `/auth/*` | `(auth)/login`, `verify-otp`, `signup` | live |
| `/onboarding` (provider) | `(onboard)/*` | live |
| `/dashboard` | role redirect via `app/index.tsx` | live |
| `/profile`, `/messages`, `/bookings`, `/support` | `(devotee)/*.tsx` | live |
| `/list-temple`, `/list-gaushala`, `/become-priest`, `/become-astrologer`, `/become-wellness`, `/waitlist` | `(onboard)/*` | live |

## Filled this session (TD10 — 5 highest-value gaps)

1. **Live darshan player** — `(devotee)/darshan/[id].tsx` (`react-native-webview`-based
   YouTube/HLS embed, falls back to a metadata card when the package is unavailable
   in Expo Go).
2. **Kundli generator** — `(devotee)/astrology/kundli.tsx` (`useGenerateKundli`).
3. **Daily horoscope** — `(devotee)/astrology/horoscope.tsx` (`useDailyHoroscope`).
4. **Yatra packages list + detail** — `(devotee)/yatra/index.tsx` + `[slug].tsx`
   (`useYatraPackages`, `useYatraPackage`, `useBookYatraPackage`).
5. **Weddings muhurat + inquiry** — `(devotee)/weddings/index.tsx` +
   `weddings/muhurat.tsx` (`useFindMuhurats`, `useCreateWeddingInquiry`).
6. **NRI premium upgrade** — `(devotee)/upgrade.tsx` (`useCreateStripeAnnual`,
   opens Stripe Checkout via in-app browser).

(Six were filled — five was the floor; weddings index + muhurat are split for
clarity but considered one gap.)

## Deferred (rationale)

- **Antim Sanskar booking** — sensitive offering, web-only audit trail required;
  WebView fallback fine for now.
- **Astrology chat** — needs RN Jitsi SDK + media permissions; out of scope.
- **Account subscriptions management** — cancel/refund flows safer via web.
- **Yatra-packages dedicated detail vs `/yatra/[slug]`** — one flow currently
  reuses both endpoints; a follow-up may split.
- **Admin portal screens** — desktop-first is acceptable per scope.

## Hooks added to `@poojly/api-client`

`packages/api-client/src/hooks/wave-5.ts` exports:

`useGenerateKundli`, `useDailyHoroscope`, `useYatraPackages`, `useYatraPackage`,
`useBookYatraPackage`, `useYatraList`, `useYatra`, `useFindMuhurats`,
`useCreateWeddingInquiry`, `useCreateStripeAnnual`, `useIsPremium`.

All paths use `/api/v1/...` to match the Fastify mount points. No new top-level
deps were introduced.

## Type-check baseline

Mobile pre-existing baseline ~211 TS2786 errors driven by two `@types/react`
versions resolving in pnpm (React 18 in `apps/mobile`, React 19 hoisted at the
root). The audit doc previously noted this. New TD10 files are written so they
do not add new error categories beyond the baseline.
