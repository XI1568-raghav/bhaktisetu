# Mobile parity plan

> Multi-session plan to bring the Expo app to feature-parity with the web app.
> Source plan file: `C:\Users\DELL\.claude\plans\iridescent-gathering-blum.md`

## Current state

The mobile app (`apps/mobile`) has:
- ❌ Zero auth wiring
- ❌ Zero real API calls
- ❌ Zero portal screens
- ✅ 9 devotee tab screens with inline hardcoded mock data
- ❌ `@poojly/api-client` not installed in the package
- ❌ React Query, secure storage, auth hooks not yet present

## Goal

A feature-complete twin of the web: real OTP login, all 7 role-based portals with full sub-page parity (~30 portal screens), all 9 devotee tabs wired to real API calls. Test via Expo Go.

## Honest scope

**~25-35 hours across 4-6 sessions.** Phased so the user can test in Expo Go after Phase 1 rather than waiting until the end.

## Out of scope

- Real video streaming (AWS IVS player) — show stream metadata only
- Real payment flow — booking goes up to payment screen, then mocks success
- Native push notifications (FCM/APNs)
- iOS native build (`.ipa`) — testing is via Expo Go only

## Phases

### Phase 1 — Foundation + auth (~4-5h) ← **test in Expo Go after this**

- Install `@poojly/api-client`, `@tanstack/react-query`, `expo-secure-store`
- Add auth hooks to `@poojly/api-client` (mirror `apps/api/src/routes/auth.ts`)
- Mobile auth context (`apps/mobile/lib/auth-context.tsx`) — mirror of web's, but `expo-secure-store` instead of `localStorage`, `router.replace` instead of `window.location.href`
- Wrap `Stack` in `_layout.tsx` with `SafeAreaProvider` + `QueryClientProvider` + `AuthProvider`. Init `apiClient` with `EXPO_PUBLIC_API_URL`.
- Auth screens: `login.tsx`, `verify-otp.tsx`, `signup.tsx` + `(auth)/_layout.tsx`
- One Expo Router group per role (`(devotee)/`, `(priest)/`, `(store-admin)/`, `(astrologer)/`, `(wellness)/`, `(temple)/`, `(gaushala)/`, `(admin)/`) with role guard
- Move existing `(tabs)/*` into `(devotee)/`
- Non-devotee groups get a placeholder `dashboard.tsx`
- Root `index.ts` redirects based on auth state

**Phase 1 verify**: All 8 demo accounts log in and land on correct portal (placeholder for non-devotee).

### Phase 2 — Devotee tabs wired to real API (~4-5h)

Replace mock data in 9 devotee tabs with `useQuery` hooks. No new screens.

| Screen | Hooks |
|---|---|
| `(devotee)/index.tsx` (Home) | `useFeaturedContent`, `useDarshan`, `usePujas`, `usePanchang` |
| `(devotee)/pujas.tsx` | `usePujas`, `usePujaCategories` |
| `(devotee)/darshan.tsx` | `useDarshan` (30s polling) |
| `(devotee)/temples.tsx` | `useTemples` |
| `(devotee)/store.tsx` | `useProducts` (new) |
| `(devotee)/content.tsx` | `useContent` |
| `(devotee)/astrology.tsx` | static rashi + `useAstrologers` if exists |
| `(devotee)/wellness.tsx` | `useWellnessSessions` (new) |
| `(devotee)/profile.tsx` | `useUserProfile`, `useUserAddresses` |

Booking flow: real up to payment step, then alert "Payment integration coming soon."

### Phase 3 — Priest, Store, Devotee bookings (~5-6h)

- Priest portal (6 screens): dashboard, bookings, services, reviews, payouts, profile
- Store admin portal (5 screens): dashboard, products, orders, reviews, revenue
- Devotee bookings sub-page

Add hooks: `usePriestBookings`, `usePriestPayouts`, `usePriestReviews`, `useUpdatePriestProfile`.

### Phase 4 — Astrologer, Wellness, Temple, Gaushala (~5-6h)

| Portal | Screens |
|---|---|
| `(astrologer)/` | dashboard, consultations, availability, profile |
| `(wellness)/` | dashboard, sessions, students, profile |
| `(temple)/` | dashboard, darshan-streams (metadata only), pujas, donations |
| `(gaushala)/` | dashboard, donations, cows, volunteers, profile |

### Phase 5 — Admin + polish (~4-5h)

- Admin portal (7 screens): dashboard, users, approvals, support, revenue, reports, settings
- Pull-to-refresh on all lists
- Loading skeletons (`react-native-reanimated` shimmer)
- Error states with retry
- Empty states with CTAs
- Sign-out confirmation
- Deep linking (`poojly://` scheme)

## Critical files map

| File | Phase | Action |
|---|---|---|
| `apps/mobile/package.json` | 1 | Add deps |
| `apps/mobile/app/_layout.tsx` | 1 | Wrap providers |
| `apps/mobile/lib/auth-context.tsx` | 1 | NEW |
| `apps/mobile/lib/role-paths.ts` | 1 | NEW |
| `apps/mobile/app/index.ts` | 1 | NEW root redirect |
| `apps/mobile/app/(auth)/{login,verify-otp,signup}.tsx` + `_layout.tsx` | 1 | NEW |
| `apps/mobile/app/(devotee)/{9 existing tabs}` | 1 (move) + 2 (wire) | Move from `(tabs)/` |
| `apps/mobile/app/(priest)/{6 screens}` + `_layout.tsx` | 3 | NEW |
| `apps/mobile/app/(store-admin)/{5 screens}` + `_layout.tsx` | 3 | NEW |
| `apps/mobile/app/(astrologer)/{4 screens}` + `_layout.tsx` | 4 | NEW |
| `apps/mobile/app/(wellness)/{4 screens}` + `_layout.tsx` | 4 | NEW |
| `apps/mobile/app/(temple)/{4 screens}` + `_layout.tsx` | 4 | NEW |
| `apps/mobile/app/(gaushala)/{5 screens}` + `_layout.tsx` | 4 | NEW |
| `apps/mobile/app/(admin)/{7 screens}` + `_layout.tsx` | 5 | NEW |
| `packages/api-client/src/hooks/auth.ts` | 1 | NEW |
| `packages/api-client/src/hooks/{priest,store,astrologer,wellness,temple,gaushala,admin}.ts` | 3-5 | NEW per portal |

**Total**: ~50 new screen files + 8 new hook files + ~6 file moves.

## Expo Go local-test recipe

1. Start API: `pnpm --filter @poojly/api dev`
2. Find LAN IP: `ipconfig` → IPv4 of Wi-Fi adapter
3. `apps/mobile/.env` → `EXPO_PUBLIC_API_URL=http://<LAN-IP>:4000`
4. Start mobile: `pnpm --filter @poojly/mobile dev`
5. Open Expo Go on phone (same Wi-Fi), scan QR
6. Test all 8 demo accounts

## Recommended execution

- **Per session**: one phase at a time. Each phase is independently shippable.
- **Verification**: type-check (`pnpm turbo type-check`) green at every boundary.
- **Source of truth**: `pnpm --filter @poojly/api dev` with seeded demo data — every screen's expected output is "what the web shows for the same user."
