# R-Q2-E-014 — Mobile push tap deep-linking (handoff)

> **Status:** scaffold + spec shipped. Full activation gated on EAS build cycle + APNs/FCM credentials (founder-action).
>
> **Why this matters:** when a devotee taps a puja-reminder or darshan-live push notification, the OS should open the Darshya app directly to that puja / darshan / booking screen — not the home tab. Without typed deep-link parsing, every push tap drops the user on the splash screen and the conversion lift from push evaporates.

## Architecture

Three layers, each env-or-noop, scaffolded for shipping once EAS build + APNs/FCM keys land:

1. **Scheme + universal-link manifest** (`apps/mobile/app.json`) — `scheme: "darshya"` already set. Need to add `ios.associatedDomains` for `applinks:darshya.online` + Android `intentFilters` for `https://darshya.online/*` so taps from web links + push payloads route to the app. Pending real Apple Team ID + signed AASA/assetlinks.json hosted on web.
2. **Push payload contract** (`apps/api/src/services/push-notifier.ts` — to extend) — every FCM/APNs payload **must** include a top-level `data.deepLink` string. The push-notifier service is the only place this convention is enforced; route this through one builder fn so we don't drift.
3. **Deep-link parser hook** (`apps/mobile/lib/deep-link.ts` — shipped this batch) — wraps Expo Router `useURL()` + `Linking.getInitialURL()` and maps darshya:// + https://darshya.online routes to typed expo-router paths.

## URL contract (frozen)

| External URL | Resolves to | Trigger |
|---|---|---|
| `darshya://puja/{slug}` | `(devotee)/puja-details?slug={slug}` | Festival reminder, daily aarti CTA |
| `darshya://darshan/{streamId}` | `(devotee)/darshan-player?id={streamId}` | Live darshan start |
| `darshya://booking/{bookingNumber}` | `(devotee)/booking-detail?bn={bookingNumber}` | Video proof uploaded, status change |
| `darshya://consultation/{id}` | `(devotee)/consultation?id={id}` | Astrologer ready to join |
| `darshya://chat/{threadId}` | `(devotee)/inbox?thread={threadId}` | Inbound message |
| `darshya://order/{orderId}` | `(devotee)/order-detail?id={orderId}` | Shipment update |
| `darshya://today` | `(devotee)/today` | Daily devotional broadcast |
| `https://darshya.online/puja/{slug}` | same as `darshya://puja/{slug}` | iOS Universal Link / Android App Link |
| (unknown) | `(devotee)/home` | Fallback — never crash, never freeze |

**Rule:** every push-notifier payload includes `data.deepLink`. UI parser is the only consumer — DO NOT scatter `Linking.openURL` calls across screens.

## Founder action items (BEFORE production push)

- [ ] **Apple Team ID + AASA file** — Apple Developer membership (gate U3, $99/yr). Generate AASA, host at `https://darshya.online/.well-known/apple-app-site-association` (Cloudflare Pages). Add `associatedDomains: ["applinks:darshya.online"]` to `apps/mobile/app.json` under `ios`. EAS rebuild required.
- [ ] **Android Digital Asset Links** — generate SHA-256 cert fingerprint from EAS Android keystore. Host `https://darshya.online/.well-known/assetlinks.json` with the fingerprint. Add intent filter to `apps/mobile/app.json` under `android`. EAS rebuild required.
- [ ] **APNs + FCM credentials** — pending U5 (FCM server key) + Apple Developer (APNs key p8 file). Push-notifier `apps/api/src/services/push-notifier.ts` is already env-or-noop; will start firing once both keys are pasted on Render.
- [ ] **Verify on TestFlight + Play Internal Track** — install build, send test push with `data.deepLink: "darshya://puja/rudrabhishek"`, confirm tap opens puja detail (not splash → home).

## What ships in this batch

- `apps/mobile/lib/deep-link.ts` — typed parser hook `useDeepLinkRouter()`. Hook into `apps/mobile/app/_layout.tsx` once code review approves. Zero runtime side-effects until mounted.
- This handoff doc — captures URL contract + founder action items.

## What does NOT ship in this batch

- AASA / assetlinks.json files (need real Team ID + SHA-256 fingerprint — founder action).
- `app.json` ios.associatedDomains / android.intentFilters edits (gated on above).
- Push-notifier `deepLink` payload field rollout (separate PR once parser hook is mounted + verified on dev build).
- E2E test against TestFlight (founder action — requires paid Apple Dev).

## KPI

`push_deep_link_active = 1` flips once one production push tap routes a user past the splash screen to a typed destination. Verified manually post-TestFlight install; PostHog `deep_link_handled` event already wired in parser hook for instrumentation.

## Risk register

| Risk | Mitigation |
|---|---|
| AASA file misconfigured → iOS taps open Safari, not app | Standard `apple-app-site-association` validator + 1-week TestFlight soak before App Store push |
| Push payload missing `deepLink` field → tap drops to home | Single builder fn in push-notifier service; lint rule TBD on PR review |
| User taps push while logged out | Parser hook returns route → root layout AuthGuard intercepts → `(auth)/sign-in?next=<encoded-deep-link>` → resume after login |
| Deep link to deleted resource (puja unpublished, booking cancelled) | Each screen handles its own 404 — parser does NOT validate, only routes |
