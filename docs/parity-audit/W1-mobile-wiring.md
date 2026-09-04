# W1 — Mobile Wiring Audit (apps/mobile): real data vs. mocks

Audit date: 2026-09-02. Scope: `apps/mobile/app/**` (111 `.tsx`), shared client `packages/api-client`,
mobile-local data layer `apps/mobile/lib/`.

Question answered: **does the mobile app render REAL data, or fake data in a file that merely exists?**

## Headline (see bottom for final numbers)

- 111 `.tsx` files under `apps/mobile/app/`.
- 56 import `@poojly/api-client` directly.
- The remaining 55 are NOT automatically mocks: mobile has a **second data layer** in
  `apps/mobile/lib/` (`api.ts` -> `apiFetch`, `portal-queries.ts`, `inbox.tsx`,
  `provider-payouts.tsx`, `subscription-screen.tsx`, `portal-screen.tsx`, `search-queries.ts`)
  that also calls the real API. Classification below accounts for both.

(Sections appended as the audit proceeds.)

## 1. Shared hook inventory — `packages/api-client/src/hooks/`

| File | Exported hooks | Endpoints |
|---|---|---|
| `auth.ts` | useSignInWithOtp, useVerifyOtp, useSignInWithCredentials, useSignUp, useLogout, useRefreshToken, useMe | `/api/v1/auth/*` |
| `consultations.ts` | useMyConsultations, useCancelConsultation | `/api/v1/consultations` |
| `portals.ts` | useAstrologerDashboard, useStoreAdminDashboard, useStoreAdminReviews, useStoreAdminRevenue, useGaushalaDashboard, useGaushalaPortalDonations, useGaushalaVolunteers, useTempleDashboard, useTemplePortalDonations, useWellnessDashboard, useWellnessStudents | `/api/v1/{astrologer,store-admin,gaushala,temple,wellness}-portal/*` |
| `providers.ts` | useAstrologers, useAstrologer, useHoroscope, useWellnessInstructors, useWellnessSessions, useWellnessPrograms, useGaushalas, useCows, useAdoptionPlans, usePriestDashboard, usePriestBookings, usePriestPayouts, usePriestProfile, useAdminDashboard, useAdminUsers, useAdminPendingApprovals, useAdminRevenue | `/api/v1/{astrology,wellness,gaushala,priest,admin}/*` |
| `reading-progress.ts` | useReadingProgress, useAllReadingProgress, useMergeAnonReadingProgress | `/api/v1/reading-progress` |
| `store.ts` | useProducts, useProduct, useCollections, useCart, useAddToCart, useUpdateCartItem, useRemoveCartItem | `/api/v1/store/*` |
| `wave-1-4.ts` | useStoreOrders, useStoreOrder, useCreateStoreOrder, useUpdateStoreOrderStatus, useSupportTickets, useSupportTicket, useCreateSupportTicket, useUpdateSupportTicket, useAddTicketMessage, useWellnessSessionsV2, useWellnessSession, useCreateWellnessSession, useEnrollWellnessSession, useVerifyWellnessEnrollment, useSetWellnessRoom, useAstrologyConsultations, useUpdateConsultation, useStartConsultationCall, useAdminCommissions, useSubscriptionPlans, useMySubscription, useSubscribe, useCancelSubscription, useCreateDonationOrder, useVerifyDonation, usePaymentConfig | `/api/v1/{store/orders,support/tickets,wellness,astrology,admin,subscriptions,donations,payments}/*` |
| `wave-5.ts` | useGenerateKundli, useDailyHoroscope, useYatraPackages, useYatraPackage, useBookYatraPackage, useYatraList, useYatra, useFindMuhurats, useCreateWeddingInquiry, useCreateAnnualSubscription, useIsPremium | `/api/v1/{astrology,yatra-packages,yatra,muhurat,weddings,subscriptions}/*` |
| `index.ts` | re-exports + `api` client, plus useBookings, useTemples, useContent, useDarshan, useDarshanStream, usePujas, usePanchang, useUserAddresses | `/api/v1/*` |

**Important**: mobile has a SECOND, mobile-local data layer that also hits the real API and must not be
counted as mock:

- `apps/mobile/lib/api.ts` — `apiFetch` / `apiPost` / `apiBase`, plain `fetch` against `EXPO_PUBLIC_API_URL`.
- `apps/mobile/lib/portal-queries.ts:31` — imports `api` from `@poojly/api-client`; supplies
  useTemplePortalDashboard/Offerings/Streams/Payouts/Bookings, useGaushalaPortalCows,
  useAstrologerEarnings, useProviderCommissions, usePayoutBalance, useRequestPayout.
- `apps/mobile/lib/search-queries.ts:19` — useTempleSearch / useContentSearch.
- `apps/mobile/lib/inbox.tsx:19` — the whole messaging surface (`/api/v1/conversations/*`).
- `apps/mobile/lib/provider-payouts.tsx` — shared payouts/earnings screen body.
- `apps/mobile/lib/subscription-screen.tsx` — shared subscription screen body.
- `apps/mobile/lib/auth-context.tsx:10` — the auth surface.

## 2. Classification of all 111 `.tsx` under `apps/mobile/app/`

Buckets: **LIVE** (renders server data) - **MOCK** (renders fabricated domain data as if real) -
**STATIC** (legitimately no API) - **STUB** (shell / dark behind a flag / missing native module).
A fourth informal tag, **HYBRID**, marks a LIVE screen that paints fake values over real rows —
counted under LIVE but called out, because it is the most dangerous category: it looks real.

### (admin) — 9

| Screen | Class | Evidence | Hooks |
|---|---|---|---|
| `_layout.tsx` | STATIC | tab bar only | — |
| `approvals.tsx` | LIVE | imports `@poojly/api-client` | useAdminPendingApprovals |
| `commissions.tsx` | LIVE | | useAdminCommissions |
| `dashboard.tsx` | LIVE | | useAdminDashboard, useAdminPendingApprovals |
| `reports.tsx` | LIVE (stub action) | `reports.tsx:17` static report menu; `:44-49` export fires an honest "not available in the mobile app" Alert — no fake "email is on its way" claim | useAdminDashboard |
| `revenue.tsx` | LIVE | | useAdminRevenue |
| `settings.tsx` | LIVE (read-only, honest) | `lib/platform-flags.ts:1-27` documents that five fake Switches over `useState` were removed; only `/api/v1/payments/config` is read | useAdminDashboard, useQuery(payments/config) |
| `support.tsx` | LIVE | | useAdminPendingApprovals, useSupportTickets |
| `users.tsx` | LIVE (no loading/error UI) | `users.tsx:34` PortalScreen; zero `isLoading`/`isError` in the file | useAdminUsers |

### (astrologer) — 9

| Screen | Class | Evidence | Hooks |
|---|---|---|---|
| `_layout.tsx` | STATIC | | — |
| `availability.tsx` | **MOCK** | `availability.tsx:14-22` `const INITIAL: Slot[]` is a fabricated Mon-Sun schedule seeded into `useState` at `:32`. Nothing ever reads the astrologer's real availability back from the server. `save()` at `:45` does PATCH `/api/v1/astrologer-portal/availability`, so the screen can *write* a schedule the astrologer never set. | useAstrologers (unused for the grid) |
| `consultations.tsx` | LIVE | | useAstrologyConsultations, useUpdateConsultation, useStartConsultationCall |
| `dashboard.tsx` | LIVE | | useAstrologerDashboard |
| `earnings.tsx` | LIVE | `lib/portal-queries.ts:116` to `/api/v1/astrologer-portal/earnings` | useAstrologerEarnings |
| `messages.tsx` | LIVE | `:1` delegates `<Inbox role="provider"/>`; `lib/inbox.tsx:154,340,379` real conversation endpoints | — |
| `payouts.tsx` | LIVE | `:2` delegates `<ProviderPayouts/>` to usePayoutBalance / useProviderCommissions / useRequestPayout | — |
| `profile.tsx` | LIVE (HYBRID) | `:21` `FALLBACK_SPECIALIZATIONS = ['Vedic','Numerology','Tarot','Vastu']`, substituted at `:32` when the server has none | useAuth, useAstrologers |
| `subscription.tsx` | LIVE | `:2` delegates `<SubscriptionScreen role="astrologer"/>` | useSubscriptionPlans, useSubscribe |

### (auth) — 4

| Screen | Class | Evidence | Hooks |
|---|---|---|---|
| `_layout.tsx` | STATIC | | — |
| `login.tsx` | LIVE | `:68` `signInWithOtp(e164)` to `lib/auth-context.tsx:367` POST `/api/v1/auth/send-otp`; `:47` credential path to `/api/v1/auth/login`. `:22` `DEMO_HINTS` is dev-only, gated by `auth-context.tsx:23-25` | useAuth |
| `signup.tsx` | LIVE | `auth-context.tsx:445` POST signup | useAuth |
| `verify-otp.tsx` | LIVE | `:60` `verifyOtp` to `auth-context.tsx:382` POST `/api/v1/auth/verify-otp`; persists session then `router.replace('/')` | useAuth |

### (devotee) — 35

| Screen | Class | Evidence | Hooks |
|---|---|---|---|
| `_layout.tsx` | STATIC | | — |
| `astrology.tsx` | LIVE (HYBRID) | `:98` `const services: AstrologyService[]` is a hardcoded **price list** (299 / 499 / 1499 INR) rendered at `:255`. `rashiData:74` is legitimate zodiac reference data. | useAstrologers, useHoroscope |
| `bookings.tsx` | LIVE | | useBookings |
| `consultations.tsx` | LIVE | | useMyConsultations, useCancelConsultation |
| `content.tsx` | **MOCK** (hybrid) | `:34` `contentData` is 12+ invented aartis with fake deities and durations. `:250` — with zero API rows **the whole screen is the mock**. `:243-244` — even with real rows, `deity` and `duration` are painted from the mock. | useContent |
| `darshan-player.tsx` | LIVE (degraded) | `useDarshanStream` real; the player `require('react-native-webview')` inside try/catch and the package is **not installed** — `lib/webview-module.ts:4-8` | useDarshanStream |
| `darshan.tsx` | LIVE | | useDarshan |
| `donations.tsx` | LIVE | `:103` `createOrder.mutateAsync` real; `:130` payment leaves the app via `Linking.openURL` | useCreateDonationOrder, useGaushalas, useTemples |
| `gurukul-apply.tsx` | LIVE | `:72` POST `/api/v1/gurukul-applications` | useAuth |
| `gurukul-detail.tsx` | LIVE | `:33` `apiFetch` on the gurukul detail route | — |
| `gurukul-portal.tsx` | LIVE | `:78-79,108` real portal fetches | useAuth |
| `gurukuls.tsx` | LIVE | `:30` `apiFetch` on the gurukuls list | — |
| `horoscope.tsx` | LIVE | | useDailyHoroscope |
| `index.tsx` (home) | LIVE | | useAuth, useDarshan, usePujas, usePanchang |
| `knowledge-article.tsx` | LIVE (dark) | `:64` `apiFetch` on the knowledge article route — unreachable, hub is flag-dark | — |
| `knowledge-category.tsx` | LIVE (dark) | `:28` `apiFetch` on the knowledge category route — same | — |
| `knowledge.tsx` | **STUB** | `:22` `EXPO_PUBLIC_KNOWLEDGE_ENABLED === 'true'`; unset in `.env` and in **every** `eas.json` build profile, so all shipped builds render "Knowledge Hub launching soon" | — |
| `kundli.tsx` | LIVE | | useGenerateKundli |
| `learn-sanskrit.tsx` | LIVE (HYBRID) | `:24` `STATIC_CATALOG` is 3 hardcoded lessons; progress at `:37` is real (`/api/v1/lessons`) | useAuth |
| `lesson.tsx` | LIVE | `:82` POST `/api/v1/lessons/complete` | useAuth |
| `messages.tsx` | LIVE | delegates `<Inbox role="devotee"/>` | — |
| `profile.tsx` | LIVE (stub actions) | data real; `:171`, `:255`, `:300` are three "coming soon" Alerts — including **Edit Profile** | useAuth, useBookings, useUserAddresses |
| `puja-book.tsx` | LIVE | `:147,:195` real puja + slot fetches; `:277` POST `/api/v1/bookings/book`. Payment is NOT in-app — `:351` `Linking.openURL(resumePaymentUrl(...))` | useAuth + raw fetch |
| `pujas.tsx` | LIVE | `:253,:308-323` proper loading / error / empty via `ListEmptyComponent` | usePujas |
| `search.tsx` | LIVE | `lib/search-queries.ts:38,50` | useTempleSearch, useContentSearch |
| `store.tsx` | LIVE | `:202` real `addToCart`; `:248` "Checkout is on the web store for now." | useProducts, useCart, useAddToCart |
| `support.tsx` | LIVE | | useSupportTickets, useCreateSupportTicket |
| `temples.tsx` | LIVE | | useTemples |
| `upgrade.tsx` | LIVE | `:117` `createCheckout.mutateAsync()` real; `:131` `Linking.openURL(url)` opens the Razorpay hosted mandate page in the external browser | useIsPremium, usePaymentConfig, useCreateAnnualSubscription |
| `web-view.tsx` | **STUB** | consumer of `lib/webview-module.ts`; `WEBVIEW_AVAILABLE` is false because `react-native-webview` is absent from `apps/mobile/package.json` | — |
| `weddings-muhurat.tsx` | LIVE | | useFindMuhurats |
| `weddings.tsx` | LIVE (HYBRID) | `:19` `PACKAGES` is a hardcoded tier list rendered at `:102`; the inquiry submit itself is real | useCreateWeddingInquiry |
| `wellness.tsx` | **MOCK** | `:66` `meditationTracks` — 5 invented tracks with fabricated **play counts** (12,400 / 23,100 / ...) and invented guides ("Swami Vivekanand", "Guru Maya"), rendered unconditionally at `:259`. `:109` `ayurvedaTips` likewise at `:327`. `:249` "play" is an `Alert.alert`, no audio exists. `:319` Dosha quiz is "coming soon". | useWellnessSessions (one tab only) |
| `yatra-detail.tsx` | LIVE | | useYatraPackage, useYatra, useBookYatraPackage |
| `yatra.tsx` | LIVE (HYBRID) | `:17` `FALLBACK_DESTINATIONS` substituted at `:40` when the API returns nothing | useYatraPackages, useYatraList |

### (gaushala) — 8, all LIVE except the layout

`cows.tsx` (useGaushalaPortalCows), `dashboard.tsx` (same), `donations.tsx` (useGaushalaPortalDonations),
`messages.tsx` (lib/inbox), `payouts.tsx` (lib/provider-payouts), `profile.tsx` (useGaushalas),
`volunteers.tsx` (useGaushalaVolunteers). `_layout.tsx` STATIC.

### (onboard) — 9, all LIVE except the layout

`_form.tsx:91` posts to the self-onboard leads route and is the shared submit for `become-astrologer`,
`become-priest`, `become-wellness`, `list-gaushala` and `list-temple` (each a field-config wrapper).
`become-gurukul.tsx:129` POSTs `/api/v1/gurukuls` directly. `waitlist.tsx:46,70` real GET stats + POST.
`_layout.tsx` STATIC.

### (priest) — 9

| Screen | Class | Evidence | Hooks |
|---|---|---|---|
| `_layout.tsx` | STATIC | | — |
| `bookings.tsx` | LIVE | `:52` PATCH start, `:60` PATCH complete, `:74` POST video. **No accept/decline control exists anywhere in the file.** `:82` video upload is deferred to "the desktop/web portal". | usePriestBookings |
| `dashboard.tsx` | LIVE | | usePriestDashboard |
| `messages.tsx` | LIVE | lib/inbox | — |
| `payouts.tsx` | LIVE (no loading/error UI) | | usePriestPayouts |
| `profile.tsx` | LIVE | | useAuth, usePriestProfile |
| `reviews.tsx` | **MOCK** | `:17` `FALLBACK_REVIEWS` — three invented devotees ("Anjali S.", "Ramesh K.", "Priya M.") with written testimonials. `:78` they render whenever the priest has no completed bookings, i.e. **every new priest**. `:84-89` the "Average / Total" headline is computed **from the fake rows**. Even with real bookings, `:71` hardcodes `rating: 5` for every one. | usePriestDashboard, usePriestBookings |
| `services.tsx` | LIVE | | usePujas, usePriestProfile |
| `subscription.tsx` | LIVE | lib/subscription-screen | — |

### (store-admin) — 8

| Screen | Class | Evidence | Hooks |
|---|---|---|---|
| `_layout.tsx` | STATIC | | — |
| `dashboard.tsx` | LIVE | | useProducts, useStoreAdminDashboard |
| `messages.tsx` | LIVE | lib/inbox | — |
| `orders.tsx` | LIVE | | useStoreOrders, useUpdateStoreOrderStatus |
| `payouts.tsx` | LIVE | lib/provider-payouts | — |
| `products.tsx` | **MOCK (worst kind)** | `:20` `FALLBACK` is 5 invented SKUs with prices and stock. `:61` **`stock` is taken from `FALLBACK[i % 5]` unconditionally — even for real products**, so a store owner reads "23 / 8 / 0 / 45 / 4 in stock" against their genuine catalogue and it is pure fiction. `:64` with an empty catalogue the entire list is the mock. | useProducts |
| `revenue.tsx` | LIVE | | useStoreAdminRevenue |
| `reviews.tsx` | LIVE | | useStoreAdminReviews |

### (temple) — 9, all LIVE except the layout

`bookings.tsx` (useTemplePortalBookings), `dashboard.tsx` (useTemplePortalDashboard + Streams),
`donations.tsx` (useTemplePortalDonations), `messages.tsx` (lib/inbox), `payouts.tsx`
(useTemplePortalPayouts), `pujas.tsx` (useTemplePortalOfferings + usePujas), `streams.tsx`
(useTemplePortalStreams), `subscription.tsx` (lib/subscription-screen). `_layout.tsx` STATIC.

### (wellness) — 8

All LIVE except `_layout.tsx` (STATIC), with one contamination worth naming:
`profile.tsx:15` `FALLBACK_CERTS = ['RYT-500 Yoga Alliance', 'Vipassana Teacher Training (10-day)']`
is rendered **unconditionally** at `:86` — every instructor's profile claims two certifications nobody
verified. `:14/:26` specializations fall back the same way. That is a trust-and-safety issue, not a
cosmetic one.

### root — 3

`_layout.tsx` LIVE (`initApiClient` + `usePushNotifications`) - `index.tsx` LIVE (auth-gated role
routing via `lib/role-paths.ts`) - `+error.tsx` STATIC.

## 3. Counts (of 111)

| Bucket | Count |
|---|---|
| **LIVE** | **93** |
| **MOCK** | **5** |
| **STATIC** | **11** |
| **STUB** | **2** |

- STATIC = 10 group `_layout.tsx` files + `+error.tsx`.
- STUB = `(devotee)/knowledge.tsx` (flag-dark in every build profile) and `(devotee)/web-view.tsx`
  (`react-native-webview` not installed).
- MOCK = `(astrologer)/availability.tsx`, `(priest)/reviews.tsx`, `(devotee)/wellness.tsx`,
  `(store-admin)/products.tsx`, `(devotee)/content.tsx`.
- **6 further LIVE screens are HYBRID — real query, fabricated fallback**:
  `(devotee)/astrology.tsx` (price list), `(devotee)/yatra.tsx`, `(devotee)/weddings.tsx`,
  `(devotee)/learn-sanskrit.tsx`, `(wellness)/profile.tsx` (fake certs, always shown) and
  `(astrologer)/profile.tsx`. **Contaminated total = 11 screens.**

## 4. Critical journeys

| Journey | Works on mobile? | Evidence |
|---|---|---|
| Log in via OTP | **YES** | `login.tsx:68` to `auth-context.tsx:367` POST `/api/v1/auth/send-otp`; `verify-otp.tsx:60` to `auth-context.tsx:382` POST `/api/v1/auth/verify-otp`; session persisted to SecureStore, role routed by `index.tsx:22` |
| Book a puja | **YES** | `puja-book.tsx:277` POST `/api/v1/bookings/book`, with real slot and offering fetches at `:147` and `:195` |
| ...and pay for it | **NO (not in-app)** | `puja-book.tsx:351` `Linking.openURL(resumePaymentUrl(...))` kicks out to the website, where the devotee must sign in again. `:372` says so in the UI. |
| Place a store order | **NO** | `store.tsx:202` add-to-cart is real; `:248` "Checkout is on the web store for now." `useCreateStoreOrder` exists at `wave-1-4.ts:44` and **no mobile screen calls it** |
| ...and pay | **NO** | no order is ever created from the app |
| Submit provider onboarding | **YES** | `(onboard)/_form.tsx:91` posts the self-onboard lead; `become-gurukul.tsx:129` POST `/api/v1/gurukuls` |
| Priest accepts/declines a booking | **NO — the control does not exist** | `(priest)/bookings.tsx` offers only start (`:52`), complete (`:60`) and video (`:74`). No accept, decline or reject anywhere in the file |
| Send a message | **YES** | `lib/inbox.tsx:379` POST `/api/v1/conversations/:id/messages`, plus read receipts `:361` and Jitsi call start `:401` |
| Make a donation | **PARTIAL** | `donations.tsx:103` creates a real Razorpay order; `:130` payment then leaves the app via `Linking.openURL` |
| Upgrade / subscribe | **PARTIAL** | `upgrade.tsx:117` real order, `:131` external browser. `lib/subscription-screen.tsx:66,70` uses the identical pattern for every provider role |
| Request a payout | **YES** | `lib/portal-queries.ts:154` POST `/api/v1/payouts/request`, gated by `lib/payout-gate.ts` |
| Admin exports a report | **NO (honest stub)** | `(admin)/reports.tsx:44-49` explicitly says exports are unavailable in the app |
| Admin toggles platform flags | **NO (honest, by design)** | `lib/platform-flags.ts` — no such API exists; the fake Switches were deliberately deleted |

## 5. Auth

**Solid.** In `apps/mobile/lib/auth-context.tsx`:

- **Persistence** — `expo-secure-store`, keys `poojly_session` / `poojly_user` (`:157-186`), wrapped in
  try/catch so an unavailable keystore degrades instead of crashing.
- **Refresh** — `:330-342`: on cold start, if `expiresAt < now + 60`, POST `/api/v1/auth/refresh` and
  re-persist.
- **401 handling** — `:215` `setOnAuthExpired` plus `:229-241` `onUnauthorisedMobile`, a module-level ref
  with a single-flight latch so N concurrent 401s trigger exactly one sign-out. Wired from `_layout.tsx`
  at module scope via `initApiClient`, before the provider mounts.
- **Role routing** — `index.tsx:22` calls `getRoleDashboardPath(user.role)`; `lib/role-guard.tsx` guards
  each route group.
- **Demo bypass** — `:23-25` `DEMO_ENABLED = __DEV__ || EXPO_PUBLIC_ALLOW_DEMO_AUTH === 'true'`, so the
  `admin@demo.com / demo123` ADMIN escalation collapses to `{}` in preview/production/testflight builds.

**Env: correct, no hardcoded LAN IP.** `lib/api.ts:10-20` reads `EXPO_PUBLIC_API_URL` and **throws
loudly** when it is unset outside `__DEV__` rather than silently defaulting to `localhost:4000`.
`apiBase()` is the single exported root. `.env` sets the live API host; `eas.json` sets the same for the
`preview`, `production` and `testflight` profiles (the `development` profile deliberately has none and
falls back to localhost). `lib/web-origin.ts` derives the WEB origin from the API host, so a staging
build cannot create a booking on staging and then hand the devotee to production to pay for an id that
does not exist there. No screen under `app/` hardcodes a host — everything routes through `apiBase()`
or the shared `api` client.

## 6. Payments — can money be taken on mobile?

**No, not inside the app.** There is no payment SDK at all:

- `apps/mobile/package.json` has **no** `react-native-razorpay`, **no** `react-native-webview` and no
  Stripe. `lib/webview-module.ts:4-8` states plainly that the WebView package "is not in
  apps/mobile/package.json, not in node_modules".
- Every money path creates a real server-side order and then **leaves the app**:
  - puja booking — `puja-book.tsx:351` `Linking.openURL(resumePaymentUrl(created.id, WEB.origin))`
  - donation — `donations.tsx:130` `Linking.openURL(url)`
  - premium upgrade — `upgrade.tsx:131` `Linking.openURL(url)`
  - provider subscription — `lib/subscription-screen.tsx:70` `Linking.openURL(url)`
  - store checkout — `store.tsx:248`, no order is created at all
- The hand-off drops the session: the devotee lands on the web login page carrying only the booking id
  (`puja-book.tsx:369-374`) and must sign in again before paying.
- To its credit, the code is *honest* about this. `lib/subscription-gate.ts` and
  `lib/platform-flags.ts` gate the pay buttons on a genuinely live Razorpay key and render
  "Not configured — no real charge can be taken" otherwise, and `puja-book.tsx:328-374` tells the
  devotee plainly that the booking is held and unpaid.

Net: bookings, donations and subscriptions can be *initiated* in the app and *completed* in the phone's
browser. A store order cannot be placed from mobile at all.

## 7. Error / loading / empty states

Repo-wide: 50/111 files reference `isLoading`/`isPending`, 42/111 an error state, 58/111 an empty state.

Sample of 12 LIVE screens:

| Screen | loading | error | empty |
|---|---|---|---|
| (admin)/dashboard | Y | Y | Y |
| (admin)/users | **N** | **N** | Y |
| (devotee)/pujas | Y | Y | Y (`ListEmptyComponent:308`) |
| (devotee)/temples | Y | Y | Y |
| (devotee)/store | Y | Y | Y |
| (devotee)/bookings | Y | Y | Y |
| (priest)/dashboard | Y | Y | Y |
| (priest)/payouts | **N** | **N** | Y |
| (temple)/donations | Y | Y | Y |
| (wellness)/students | Y | Y | Y |
| (store-admin)/orders | Y | Y | Y |
| (gaushala)/cows | Y | Y | Y |

**Ratio: loading 10/12, error 10/12, empty 12/12.**

Systemic cause of the misses: `lib/portal-screen.tsx` — the wrapper used by **43** screens — provides
`RefreshControl` and layout but **no loading spinner and no error surface** (`:20-38`). Any screen that
does not add its own therefore renders an empty list indistinguishable from "you have no data" while the
request is in flight or has failed.

## 8. Hooks that exist but no mobile screen calls

`useCreateStoreOrder`, `useStoreOrder`, `useUpdateCartItem`, `useRemoveCartItem`, `useCollections`,
`useProduct`, `useVerifyDonation`, `useMySubscription`, `useEnrollWellnessSession`,
`useVerifyWellnessEnrollment`, `useWellnessSession`, `useWellnessSessionsV2`, `useWellnessPrograms`,
`useAdoptionPlans`, `useCows`, `useAstrologer`, `useUpdateSupportTicket`, `useAddTicketMessage`,
`useSupportTicket`, `useReadingProgress`, `useAllReadingProgress`, `useMergeAnonReadingProgress`, and
the auth set `useSignUp` / `useSignInWithOtp` / `useVerifyOtp` / `useLogout` / `useMe` (mobile
re-implements these inside `auth-context.tsx` against the same endpoints).

The store cluster is the notable one: full cart-mutation and order-creation hooks exist, and mobile
checkout still bounces to the web.

## 9. Mobile screens needing a hook that does not exist

- **Astrologer availability READ** — `(astrologer)/availability.tsx` can PATCH but there is no GET, which
  is the direct cause of that screen being a mock.
- **Priest accept / decline a booking** — no hook and no control; only start / complete / video.
- **Priest reviews and ratings list** — `reviews.tsx` derives reviews from bookings because no review
  endpoint is wired, hence the fabricated fallback.
- **Store inventory / stock** — `useProducts` returns no stock field, which is why `products.tsx:61`
  invents it.
- **Devotee-side store order creation** — `useCreateStoreOrder` exists but no checkout screen consumes it.
- **Meditation and Ayurveda content** — no endpoint at all; `(devotee)/wellness.tsx` is entirely hardcoded.
- **Platform feature flags** — confirmed absent server-side (`lib/platform-flags.ts`).
- **Report exports** — absent (`(admin)/reports.tsx`).

## 10. Verdict

**Score: 72 / 100 — a real functioning app, not a shell.**

93 of 111 screens read genuine server data through a well-built two-layer client with correct env
resolution, SecureStore session persistence, token refresh, single-flight 401 sign-out and role-based
routing; the five true mocks and six hybrid fallbacks are concentrated in provider-vanity surfaces, and
the ceiling is set not by fake data but by the missing payment SDK — no money can be taken inside the
app, and the store cannot take an order at all.
