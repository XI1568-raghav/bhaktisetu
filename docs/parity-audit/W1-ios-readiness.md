# W1 — iOS Release Readiness Audit (apps/mobile)

**Date:** 2026-09-02
**Scope:** Expo SDK 52 / RN 0.76 / expo-router 4 / newArchEnabled=true, bundleId `com.darshya.app`
**Out of scope (already established by main session):** `tsc --noEmit` is clean; `expo-build-properties` was missing and is now FIXED; the only EAS build ever run was Android 2026-04-28 and it ERRORED at Metro bundle. No IPA has ever been produced.

> Status: COMPLETE.

## 0. Baseline facts

`apps/mobile/app.json` ios block declares exactly two Info.plist keys:
- `NSPhotoLibraryUsageDescription`
- `ITSAppUsesNonExemptEncryption: false`

No `ios.privacyManifests`, no `ios.entitlements`, no `UIBackgroundModes`, no `NSAppTransportSecurity`.

`apps/mobile/package.json` native modules present:
`expo-asset, expo-build-properties, expo-constants, expo-font, expo-linking, expo-modules-autolinking, expo-modules-core, expo-notifications, expo-router, expo-secure-store, expo-status-bar, expo-system-ui, expo-video, @sentry/react-native, react-native-safe-area-context, react-native-screens`.

NOT present: expo-image-picker, expo-camera, expo-location, expo-media-library, expo-av, expo-contacts, expo-calendar, expo-tracking-transparency, react-native-webview, expo-web-browser, expo-file-system, expo-image, expo-haptics, expo-device, expo-application, expo-sharing, expo-document-picker.

---

## 1. Info.plist usage strings vs actual native API usage

**Method:** grepped `apps/mobile/app` + `apps/mobile/lib` (excluding `__tests__`) for every capability import and API call.

### Capabilities actually used

| Capability | Used? | Evidence | iOS usage string required? | Declared? |
|---|---|---|---|---|
| Camera | **NO** | 0 hits for `expo-camera` / `ImagePicker` / `launchCamera`. Only hits are the string `cameraLocation` (a temple's text field describing where a stream camera is physically mounted) - `apps/mobile/app/(temple)/dashboard.tsx:137`, `apps/mobile/app/(temple)/streams.tsx:72`, `apps/mobile/lib/api-contracts.ts:777` | No | n/a |
| Photo library / picker | **NO** | 0 hits for `expo-image-picker`, `expo-media-library`, `expo-document-picker`. Package absent from `package.json`. | No | **Declared anyway** |
| Microphone | **NO** | 0 hits. The 13 `Audio` hits are all the boolean field `isAudio` in `apps/mobile/app/(devotee)/content.tsx:24,41-113` | No | n/a |
| Location | **NO** | 0 hits for `expo-location` / `getCurrentPosition`. The 8 `Location` hits are the `location` text input on `apps/mobile/app/(devotee)/kundli.tsx:33,126` (user types their birth city) and the `Location not listed` label on `apps/mobile/app/(devotee)/puja-book.tsx:442,467` | No | n/a |
| Contacts | **NO** | 0 hits | No | n/a |
| Calendar / Reminders | **NO** | 0 hits | No | n/a |
| Push notifications | **YES** | `apps/mobile/lib/push-notifications.ts:40` calls `requestPermissionsAsync()` | **No plist string exists for this on iOS** - the system prompt text is fixed and not author-supplied | n/a |
| App Tracking Transparency | **NO** | 0 hits for `expo-tracking-transparency` / `AppTrackingTransparency` | No | n/a |
| Video playback | YES (WebView only) | `apps/mobile/app/(devotee)/darshan-player.tsx:182,191` | No | n/a |

### Findings

**MEDIUM - `NSPhotoLibraryUsageDescription` is declared for a feature that does not exist.**
`apps/mobile/app.json` (ios.infoPlist) declares: "Darshya needs photo library access so devotees can attach photos to support tickets."

There is no photo-library code path anywhere in `apps/mobile`, and `apps/mobile/app/(devotee)/support.tsx` has no attachment control. This is not a crash and not an automatic rejection, but it is an App Privacy questionnaire mismatch risk: you declare a purpose string for an API you never call, describing a feature reviewers cannot find. Remedy: delete the key from `apps/mobile/app.json`, or build the attachment feature. Deleting is correct today.

**VERIFIED OK - no missing usage strings.** This is the headline result for item 1: the app uses **zero** permission-gated native APIs other than push notifications, which needs no `NS*UsageDescription`. There is no runtime-crash-on-first-use gap and no missing-purpose-string rejection here. `apps/mobile/package.json` contains no camera/photos/location/mic/contacts/calendar module at all, so the gap cannot exist.

**MEDIUM - push entitlement not explicitly configured.** `expo-notifications` is a dependency and `requestPermissionsAsync()` is called, but `expo-notifications` is **not** listed in `apps/mobile/app.json` -> `plugins` (only `expo-router`, `expo-secure-store`, `expo-build-properties` are). The `aps-environment` entitlement is normally injected by Expo's prebuild when the module is installed, but the top-level legacy `"notification"` key in `app.json` is SDK-<48 style and does not configure iOS. Verify `aps-environment` lands in the generated entitlements on the first iOS build and register an APNs key in EAS credentials - otherwise push silently never arrives on iOS (no crash, no error).

---

## 2. Sign in with Apple (Guideline 4.8) - **NOT REQUIRED. NOT A BLOCKER.**

**Verdict: PASS. No Sign in with Apple work is needed.**

Login methods that exist, exhaustively:

1. **Email + password** - `apps/mobile/app/(auth)/login.tsx:47` -> `signInWithCredentials(email, password)` -> `apps/mobile/lib/auth-context.tsx:407` -> `POST /api/v1/auth/login`
2. **Phone OTP** - `apps/mobile/app/(auth)/login.tsx` phone tab -> `signInWithOtp(phone)` -> `apps/mobile/lib/auth-context.tsx:365` -> `POST /api/v1/auth/send-otp`, then `apps/mobile/app/(auth)/verify-otp.tsx` -> `verifyOtp` -> `apps/mobile/lib/auth-context.tsx:387` -> `POST /api/v1/auth/verify-otp`
3. **Email/password signup** - `apps/mobile/app/(auth)/signup.tsx` -> `apps/mobile/lib/auth-context.tsx:449` -> `POST /api/v1/auth/signup`

`AuthContextValue` (`apps/mobile/lib/auth-context.tsx:257-262`) exposes exactly three sign-in members: `signInWithOtp`, `verifyOtp`, `signInWithCredentials`. A case-insensitive grep for `google|facebook|apple|oauth|social|sign.?in.?with` across `apps/mobile/app/(auth)/` and `apps/mobile/lib/auth-context.tsx` returns **no third-party identity provider** - every hit is either the app's own `signInWith*` method names or the `{ noAuth: true }` request option.

Guideline 4.8 is triggered only by third-party/social login services (Facebook Login, Google Sign-In, Sign in with Twitter, LinkedIn, Login with Amazon, WeChat Login). First-party email/password and first-party phone-OTP are the app's own account system and do **not** trigger it. Sign in with Apple is therefore optional here.

### BLOCKER (found while reading the auth screens) - production build ships 8 demo accounts with a printed password

`apps/mobile/app/(auth)/login.tsx:22-31` defines `DEMO_HINTS` (8 role accounts: `devotee@demo.com`, `pandit@demo.com`, `store@demo.com`, `astro@demo.com`, `wellness@demo.com`, `gaushala@demo.com`, `temple@demo.com`, `admin@demo.com`) and `apps/mobile/app/(auth)/login.tsx:162-176` renders them **unconditionally** as tappable chips under the literal heading `Demo accounts (password: demo123)`.

Only the `useState` initial value is dev-gated (`apps/mobile/app/(auth)/login.tsx:37`: `useState(__DEV__ ? 'demo123' : '')`). The `demoBox` JSX has **no `__DEV__` guard**, so on a production `eas build --profile production` IPA every App Store user - and the App Review team - sees a one-tap **admin** login with the password printed on screen.

Consequences: (a) Guideline 2.3.1 / 2.2 - the build presents itself as a demo/beta; (b) a live privilege-escalation path to `admin@demo.com` if those rows exist in prod.

**Remedy:** wrap `apps/mobile/app/(auth)/login.tsx:162-176` in `{__DEV__ && ( ... )}` and confirm the demo users are absent from (or disabled in) the production database.

---

## 3. In-App Purchase (Guideline 3.1.1) - **SPLIT VERDICT**

Every payment in the app leaves the binary the same way: the server returns a Razorpay hosted checkout URL and the screen calls `Linking.openURL(url)`, bouncing the user to Safari. There is **no** StoreKit / `expo-in-app-purchases` / `react-native-iap` dependency anywhere.

### 3a. Real-world services and physical goods - **EXEMPT. Card payment is correct. No IAP needed.**

These are consumed outside the app and fall under Guideline 3.1.3(e):

| Screen | What is sold | Path |
|---|---|---|
| `apps/mobile/app/(devotee)/puja-book.tsx:351` | A priest performing a puja at a temple/home | `Linking.openURL(resumePaymentUrl(...))` |
| `apps/mobile/app/(devotee)/consultations.tsx:69` | 1:1 astrologer consultation (Jitsi room) | real-world / person-to-person |
| `apps/mobile/app/(devotee)/donations.tsx:130` | Temple / gaushala donation | `Linking.openURL(url)` - Apple explicitly forbids IAP for charitable donations |
| `apps/mobile/app/(devotee)/store.tsx` | Physical store goods | web checkout |
| Yatra / weddings / gurukul screens | Travel, wedding services, school admission | real-world |

**No change required.** Do not build IAP for any of these - it would violate 3.1.3(e) in the other direction (Apple rejects IAP used for physical goods).

### 3b. Devotee "Darshya Premium" Rs 5,000/yr - **DIGITAL -> IAP REQUIRED, but currently DISABLED so NOT a v1 blocker.**

`apps/mobile/app/(devotee)/upgrade.tsx:43-48` lists the benefits: "Unlimited HD live darshan", "20% off all puja bookings", "Premium kundli + monthly horoscope reports", "Free shipping on Darshya store orders", "Priority concierge for yatra & weddings".

"Unlimited HD live darshan" and "Premium kundli + monthly horoscope reports" are **digital content consumed inside the app**. A recurring annual plan unlocking in-app content is squarely Guideline 3.1.1 -> auto-renewable subscription via StoreKit. Selling it by opening a Razorpay page with `Linking.openURL` (`apps/mobile/app/(devotee)/upgrade.tsx:129-131`) is a textbook 3.1.1 rejection, and the 3.1.3(b) multiplatform carve-out does **not** rescue it (that permits honouring an outside purchase, not linking out to make one).

**However - it is switched off.** `apps/mobile/lib/nri-premium-availability.ts:29` sets `NRI_PREMIUM_IS_SELLABLE = false`, and `apps/mobile/app/(devotee)/upgrade.tsx:164,175,201` gate the price, the benefit list and the CTA behind it. As shipped the screen renders "Not currently sold" plus a lock card; `onUpgrade` is unreachable. **Not a v1 blocker. It is a tripwire:** the moment that constant flips to `true`, the app becomes 3.1.1-rejectable. Add a note at `apps/mobile/lib/nri-premium-availability.ts:29` recording that re-opening the sale requires StoreKit on iOS.

### 3c. Provider subscriptions Rs 799 - Rs 3,999/month - **THE REAL AND CURRENT 3.1.1 EXPOSURE. Treat as a BLOCKER.**

Unlike 3b these are **live and reachable today**. Four screens (`apps/mobile/app/(priest)/subscription.tsx`, `apps/mobile/app/(astrologer)/subscription.tsx`, `apps/mobile/app/(temple)/subscription.tsx`, `apps/mobile/app/(wellness)/subscription.tsx`) all render `apps/mobile/lib/subscription-screen.tsx`, which fetches plans from `GET /api/v1/subscriptions/plans` and on tap calls `Linking.openURL(url)` at `apps/mobile/lib/subscription-screen.tsx:70`.

The plans (`apps/api/src/services/subscription.service.ts:78` onward) are recurring monthly and their advertised features are **in-app functionality and visibility**, not real-world services:

- `plan-pandit-basic` Rs 999/month - "Unlimited bookings", "Priority listing", "Profile badge", "Chat support"
- `plan-pandit-pro` Rs 2,999/month - "Unlimited bookings", "Top listing", "Verified badge", "Video consultation", "Dedicated support"
- `plan-astro-basic` Rs 799/month, `plan-astro-pro` Rs 1,999/month, `plan-store-basic` Rs 1,499/month, `plan-store-pro` Rs 3,999/month - same shape
- free tiers are capped at "5 bookings/month"

"Priority listing", "Top listing", "Verified badge" and lifting the "5 bookings/month" cap are **features unlocked within the app**, which is the exact wording of Guideline 3.1.1. There is a genuine counter-argument - marketplace seller/pro subscriptions (Thumbtack Pro, Housecall Pro, Etsy Seller) are routinely approved with card billing as business services - but that defence is strongest for a **separate pro-only binary**. Darshya ships one consumer app in which a reviewer can reach a paid "Verified badge" upgrade behind a normal login, which is the configuration reviewers most often reject.

**Recommended remedy for v1 (cheapest, zero revenue loss): hide the provider subscription screens on iOS.** Gate `apps/mobile/lib/subscription-screen.tsx` on `Platform.OS !== 'ios'` (or drop the four routes from the iOS build) and let providers subscribe on darshya.online, with no in-app link to that page. This removes the 3.1.1 surface entirely. Building StoreKit for a B2B plan you can bill on the web would be weeks of wasted work.

**Secondary note (not App Store, but real):** `apps/mobile/lib/subscription-screen.tsx:33-40` documents that `POST /api/v1/subscriptions/subscribe` could grant an ACTIVE paid plan and write a COMPLETED transaction with no money taken; the client half is fixed (a missing checkout URL is now surfaced as a failure, `apps/mobile/lib/subscription-screen.tsx:72-77`) but the comment states the server fix is still pending in `apps/api`.

---

## 4. Account deletion (Guideline 5.1.1(v)) - **BLOCKER. Confirmed absent everywhere.**

**Verdict: HARD REJECTION as it stands.**

The app creates accounts (`apps/mobile/app/(auth)/signup.tsx` -> `POST /api/v1/auth/signup`, `apps/mobile/lib/auth-context.tsx:449`). Guideline 5.1.1(v) therefore requires an **in-app** path that initiates account deletion.

Searches (case-insensitive, for `delete.?account|deleteAccount|delete my account|close account|erase account`):

- `apps/mobile/app` + `apps/mobile/lib` - **0 hits**
- `apps/api/src` - **1 hit, and it is the opposite of an implementation**: `apps/api/src/routes/support.ts:42` instructs the support bot that account deletion is something it *cannot* handle and must escalate to a human ("When you CAN'T help (complex refunds >Rs5000, account deletion, disputes, legal, medical, bugs, payment failures needing investigation) -> explicitly set escalate=true")
- `apps/web/src` - **0 hits**

So there is no delete-account UI, no API endpoint, and no web fallback. `apps/mobile/lib/auth-context.tsx:480` has `POST /api/v1/auth/logout` only - sign-out is not deletion, and Apple rejects "email us to delete" as the sole mechanism.

**Remedy (both halves are required):**
1. `apps/api` - add `DELETE /api/v1/auth/account` (or `POST /api/v1/account/delete`): re-authenticate, then delete or irreversibly anonymise the user plus dependent PII, honouring financial-record retention for completed transactions.
2. `apps/mobile` - add a "Delete account" row to `apps/mobile/app/(devotee)/profile.tsx` (and the other role `profile.tsx` screens) with a destructive confirm, calling that endpoint and then clearing the SecureStore session.

---

## 5. Safe areas (notch / Dynamic Island / home indicator)

**Root is correct.** `apps/mobile/app/_layout.tsx:49` wraps the whole tree in `<SafeAreaProvider>`, so `react-native-safe-area-context` works.

**Risk amplifier:** `apps/mobile/app/_layout.tsx:56` sets `screenOptions={{ headerShown: false }}` for every route in the root `Stack`. There is no native navigation header anywhere, so **each screen is solely responsible for its own top inset**. A screen with no `SafeAreaView` renders its first pixel at y=0, under the status bar and Dynamic Island.

### Coverage

Raw `grep -L` says 79 of 111 files in `apps/mobile/app` lack `SafeAreaView`/`useSafeAreaInsets`. That number is misleading — most render through shared wrappers that do have it:

| Wrapper | Inset call site | Screens covered |
|---|---|---|
| `apps/mobile/lib/portal-screen.tsx:28` | `<SafeAreaView edges={['top']}>` | 44 provider/admin screens |
| `apps/mobile/lib/inbox.tsx:183,210,220,437` | `<SafeAreaView edges={['top']}>` | all `messages.tsx` screens |
| `apps/mobile/app/(onboard)/_form.tsx:117,145` | `<SafeAreaView edges={['top']}>` | `become-astrologer/-priest/-wellness`, `list-gaushala`, `list-temple` |
| `apps/mobile/lib/subscription-screen.tsx`, `lib/provider-payouts.tsx`, `lib/portal-placeholder.tsx` | via `PortalScreen` | subscription / payouts / placeholder screens |
| `_layout.tsx` files (11) | `Tabs`/`Stack` from expo-router apply insets themselves | n/a |

### HIGH - the 3 auth screens render under the notch

These are the only real content screens with **no top inset at all**. Their root element is `KeyboardAvoidingView`, not `SafeAreaView`:

- `apps/mobile/app/(auth)/login.tsx:83` - root is `<KeyboardAvoidingView>`; `apps/mobile/app/(auth)/login.tsx:91-93` renders the brand header (`Darshya` + tagline) as the first child, so the wordmark sits under the status bar / Dynamic Island.
- `apps/mobile/app/(auth)/signup.tsx:79` - same shape.
- `apps/mobile/app/(auth)/verify-otp.tsx:84` - root `<KeyboardAvoidingView>`, and `apps/mobile/app/(auth)/verify-otp.tsx:88` is a back button pinned at the top - it will be partly unreachable behind the Dynamic Island on iPhone 14 Pro and later.

This is the **first screen every new user and every App Store reviewer sees**, which is why it is HIGH rather than MEDIUM.

**Remedy:** wrap each of the three in `<SafeAreaView style={{flex:1}} edges={['top']}>` inside (or around) the `KeyboardAvoidingView`, matching the pattern already used at `apps/mobile/app/(onboard)/_form.tsx:145-147`.

### Benign (no fix needed)

- `apps/mobile/app/index.tsx:27-30` - a single centred `ActivityIndicator`, nothing pinned to an edge.
- `apps/mobile/app/+error.tsx` - centred error card, nothing pinned to an edge.

### MEDIUM - nothing anywhere handles the bottom inset

`grep` for `edges={` across `apps/mobile/app` + `apps/mobile/lib` returns **46 occurrences and every single one is `edges={['top']}`**. There is no `'bottom'` edge and no `useSafeAreaInsets().bottom` in the codebase.

In practice most screens are rescued by react-navigation: the `Tabs` bottom bar in each group `_layout.tsx` applies its own bottom inset. The residual risk is any full-screen **stack** route with edge-pinned content - `apps/mobile/app/(devotee)/content.tsx:531-532` declares `position:'absolute', bottom: 0` for its mini-player bar; it is a tab route so the tab bar shields it, but verify on a notched device. Treat this as a device-test item, not a code change.

---

## 6. Keyboard handling

`KeyboardAvoidingView` is used in **9 files**, and every one uses the correct iOS behavior:
`behavior={Platform.OS === 'ios' ? 'padding' : undefined}` (`apps/mobile/app/(auth)/login.tsx:84`, `signup.tsx:80`, `verify-otp.tsx:85`, `app/(gaushala)/cows.tsx:169`, `app/(onboard)/become-gurukul.tsx:156`, `app/(onboard)/waitlist.tsx:151`, `app/(onboard)/_form.tsx:147`, `app/(store-admin)/products.tsx:153`, `lib/inbox.tsx:456`). `apps/mobile/lib/inbox.tsx:457` additionally sets `keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}`. **The pattern in use is correct** - the gap is coverage, not technique.

### HIGH - 13 screens contain a `TextInput` with no `KeyboardAvoidingView`

On iOS there is no automatic keyboard avoidance and no back gesture to dismiss it, so a bottom-of-form field is simply covered with no way out.

Genuinely broken (data-entry forms, field is below the fold):

| Screen | Why it matters |
|---|---|
| `apps/mobile/app/(devotee)/kundli.tsx` (inputs at `:33,126`) | Multi-field birth-details form (name, date, time, location) - the last fields will be under the keyboard |
| `apps/mobile/app/(devotee)/puja-book.tsx` | The primary revenue flow; booking form fields |
| `apps/mobile/app/(devotee)/donations.tsx` | Donation amount entry - revenue flow |
| `apps/mobile/app/(devotee)/support.tsx` | Ticket compose box |
| `apps/mobile/app/(devotee)/gurukul-apply.tsx` | Multi-field application form |
| `apps/mobile/app/(devotee)/weddings-muhurat.tsx` | Date/detail form |
| `apps/mobile/app/(devotee)/weddings.tsx` | Enquiry form |
| `apps/mobile/app/(devotee)/yatra-detail.tsx` | Enquiry form |
| `apps/mobile/app/(wellness)/sessions.tsx` | Session create/edit form |

Lower risk (single search field pinned near the top, keyboard cannot cover it):
`apps/mobile/app/(admin)/users.tsx`, `apps/mobile/app/(devotee)/search.tsx`, `apps/mobile/app/(devotee)/temples.tsx`, `apps/mobile/app/(devotee)/gurukuls.tsx`.

**Remedy:** for the nine form screens, wrap the scroll container exactly as `apps/mobile/app/(onboard)/_form.tsx:146-147` already does, and add `keyboardShouldPersistTaps="handled"` to the `ScrollView` (the pattern at `apps/mobile/app/(auth)/login.tsx:88`).

---

## 7. Privacy manifest (`PrivacyInfo.xcprivacy`)

**Verdict: no code change needed. One manual submission task.**

- `apps/mobile/app.json` has **no** `ios.privacyManifests` key (confirmed: 0 matches).
- Expo SDK 52 (`expo@52.0.49` installed) auto-generates an app-level `PrivacyInfo.xcprivacy` during prebuild, pre-seeded with the required-reason API declarations Expo's own modules need (UserDefaults, file timestamp, system boot time, disk space). Each Expo module pod also ships its own manifest, and `@sentry/react-native@6.22.0` ships one too.
- This app calls **no** additional required-reason API directly: there is no `expo-file-system`, no `@react-native-async-storage`, and `expo-secure-store` uses Keychain (not a required-reason API).

So `ios.privacyManifests` config is **not required here**. Add it only if a future dependency needs a declaration Expo does not emit.

**POLISH / submission task:** the App Store Connect **App Privacy questionnaire** is separate, manual, and mandatory. This app collects phone number, email, name, and - via `apps/mobile/app/(devotee)/kundli.tsx` - date of birth, time of birth and birth location, which is sensitive personal data. Sentry collects crash diagnostics. Fill the nutrition label accordingly and set "Data used to track you" = No (there is no ATT / tracking SDK, confirmed in section 1).

---

## 8. Darshan playback (`app/(devotee)/darshan-player.tsx`)

### BLOCKER (functional, not review) - the in-app player cannot work in any EAS build

`apps/mobile/app/(devotee)/darshan-player.tsx:25-31` resolves the player lazily:

```js
let WebViewComp = null;
try {
  WebViewComp = (require('react-native-webview')).WebView;
} catch { WebViewComp = null; }
```

**`react-native-webview` is not declared in any `package.json` in the monorepo and is not present in `node_modules` (root or `apps/mobile`).** Verified both ways. The comment at `apps/mobile/app/(devotee)/darshan-player.tsx:23` states the assumption - "Expo Go ships it, bare RN may not" - and that assumption is exactly why this has never been noticed: it works in Expo Go and dies in a real build.

Consequence in a production IPA: `WebViewComp === null`, both player branches at `apps/mobile/app/(devotee)/darshan-player.tsx:181` and `:190` are skipped, and the screen falls through to the fallback at `:196-215`, which literally reads:

> "In-app player unavailable" / "The video component is missing from this build. Open it in your browser instead."

**Live darshan - the app's flagship feature - never plays inside the app on iOS.** It bounces the devotee to Safari. The same dead dependency also disables `apps/mobile/app/(devotee)/web-view.tsx` (via `apps/mobile/lib/webview-module.ts`), which is already documented at `apps/mobile/app/(devotee)/web-view.tsx:46-51` as blocked on an owner action.

It does **not** crash - the try/catch and the fallback copy are well built - so this is a functional blocker, not a stability one. But a core feature that only opens Safari is also a plausible Guideline 4.2 (minimum functionality) challenge.

**Remedy:** `npx expo install react-native-webview` in `apps/mobile`. Nothing else changes; both screens light up on their own. Note this is a native dependency change, so it invalidates any existing dev client.

### `UIBackgroundModes: audio` - **do NOT add it**

The player renders video inside a `WebView` (HLS via an inline `hls.js` page at `apps/mobile/app/(devotee)/darshan-player.tsx:50-58`, or a YouTube embed at `:38`). There is no `expo-av` / `expo-video` audio session in the playback path at all.

Adding `UIBackgroundModes: ['audio']` would be **actively harmful**: Guideline 2.5.4 rejects apps that declare the background-audio mode without genuinely playing continuous audio in the background, and a `WebView` does not keep an audio session alive when backgrounded anyway. Leave `apps/mobile/app.json` as is. If background aarti audio is ever a real product requirement, it needs `expo-audio`/`expo-av` with a configured audio session first, and the plist key second.

### Will it work on iOS otherwise? Yes, once the dependency lands.

- iOS `WKWebView` plays HLS (`.m3u8`) natively, so the `hls.js` shim is redundant on iOS but harmless.
- `allowsInlineMediaPlayback` and `mediaPlaybackRequiresUserAction={false}` are both set on the HLS branch (`apps/mobile/app/(devotee)/darshan-player.tsx:185-186`) - correct, and required on iOS or the video force-fullscreens.
- **MEDIUM:** the YouTube branch at `apps/mobile/app/(devotee)/darshan-player.tsx:190-195` sets `allowsFullscreenVideo` and `mediaPlaybackRequiresUserAction={false}` but **omits `allowsInlineMediaPlayback`**. On iOS that branch will punch straight to the native fullscreen player on load. Add `allowsInlineMediaPlayback` for parity with the HLS branch.
- **MEDIUM:** the HLS page loads `https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js` from a third-party CDN (`apps/mobile/app/(devotee)/darshan-player.tsx:57`). HTTPS, so ATS is satisfied and no `NSAppTransportSecurity` exception is needed - but the flagship feature has a hard runtime dependency on jsDelivr being reachable. Consider vendoring `hls.js` into the inline HTML, or skip it entirely on iOS where `WKWebView` plays HLS natively.

### Dead dependency

`expo-video@2.0.6` is installed and declared in `apps/mobile/package.json` but **imported nowhere** (0 hits for `expo-video` / `useVideoPlayer` / `VideoView` outside tests). It links AVFoundation into the binary for no benefit. Either use it for darshan playback instead of the WebView (the cleaner architecture), or remove it. Note the irony: the module that *is* installed is unused, and the module the player *needs* is not installed.

---

## 9. Assets

All four assets exist under `apps/mobile/assets/`. PNG `IHDR` headers read directly:

| File | Dimensions | Colour type | Alpha? |
|---|---|---|---|
| `apps/mobile/assets/icon.png` | **1024 x 1024** (correct) | 6 = RGBA | **YES** |
| `apps/mobile/assets/splash.png` | 1284 x 2778 | 6 = RGBA | YES (fine for splash) |
| `apps/mobile/assets/adaptive-icon.png` | 1024 x 1024 | 6 = RGBA | YES (correct for Android) |
| `apps/mobile/assets/favicon.png` | 48 x 48 | 6 = RGBA | YES (fine for web) |

### MEDIUM - `icon.png` carries an alpha channel

The size is right, but colour type 6 means a transparency channel is present. An App Store icon with alpha is rejected at upload with **ITMS-90717 "Invalid App Store Icon - the icon can't be transparent nor contain an alpha channel"**, one of the most common upload failures.

**This is probably survivable:** Expo's prebuild icon pipeline (`@expo/prebuild-config` `withIosIcons`) flattens transparency onto a background colour when it generates the iOS `AppIcon.appiconset`. So EAS will most likely emit a compliant icon on its own. Two reasons it still deserves a fix:

1. If any pixels are actually transparent, Expo composites them onto **white** by default, which will look wrong against the `#EA580C` saffron brand used for `splash.backgroundColor` and `adaptiveIcon.backgroundColor`.
2. It removes an ITMS-90717 risk entirely rather than relying on the toolchain.

**Remedy:** flatten `apps/mobile/assets/icon.png` onto the saffron background and re-save as 24-bit RGB (colour type 2, no alpha), keeping 1024x1024. Leave `adaptive-icon.png` as RGBA - Android needs the transparency.

### MEDIUM - `expo-splash-screen` is not installed

`expo-splash-screen` does not resolve from `apps/mobile` and is absent from `apps/mobile/package.json`. `app.json` uses the legacy top-level `expo.splash` key, which `@expo/prebuild-config` still honours in SDK 52, so a splash will most likely still be generated. But SDK 52's documented path is the `expo-splash-screen` config plugin, and without the module you cannot call `SplashScreen.preventAutoHideAsync()` (the app does not, so nothing is broken today). Verify the splash actually appears on the first iOS build; if it does not, `npx expo install expo-splash-screen` and move the config into the plugin.

Also note `splash.png` at 1284x2778 is a full iPhone-screen image used with `resizeMode: 'contain'`; on other aspect ratios it letterboxes against `#EA580C`. Acceptable, but a centred logo on a solid background is the more robust pattern.

---

## 10. iOS-specific styling gaps

**VERIFIED OK - nothing to fix. This is the cleanest area of the audit.**

- `Platform.OS === 'android'` appears **zero** times in `apps/mobile/app` and `apps/mobile/lib`. There are no Android-only styling branches that could leave iOS unstyled.
- `Platform.OS === 'ios'` appears 26 times, all of them the `KeyboardAvoidingView` behavior prop.
- Shadow/elevation pairing is exact:

```
shadowColor   : 16
shadowOffset  : 16
shadowOpacity : 16
shadowRadius  : 16
elevation     : 16
```

Every one of the 16 `elevation` declarations sits in the same style block as a complete iOS shadow quad, across the same 12 files. Spot-checked at `apps/mobile/app/(devotee)/darshan.tsx:355-359`:

```js
shadowColor: colors.black,
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.05,
shadowRadius: 6,
elevation: 2,
```

**No card will render flat on iOS.**

---

## Summary

### BLOCKERS (fail review, or a core feature does not work)

1. **Account deletion missing entirely** - Guideline 5.1.1(v). No UI in `apps/mobile`, no endpoint in `apps/api/src`, no web fallback; the only mention is `apps/api/src/routes/support.ts:42` telling the bot to escalate it to a human. Signup exists, so the requirement is triggered. **Remedy:** add `DELETE /api/v1/auth/account` + a destructive "Delete account" row in the role `profile.tsx` screens.
2. **Demo credentials ship in the production build** - `apps/mobile/app/(auth)/login.tsx:22-31` and `:162-176` render 8 one-tap role logins including `admin@demo.com` under the heading "Demo accounts (password: demo123)", with **no `__DEV__` guard** (only the password `useState` at `:37` is guarded). Guideline 2.3.1 plus a real privilege-escalation path. **Remedy:** wrap `:162-176` in `{__DEV__ && (...)}` and purge/disable the demo users in prod.
3. **Provider subscriptions are a live Guideline 3.1.1 exposure** - `apps/mobile/lib/subscription-screen.tsx:70` sends users to a Razorpay page via `Linking.openURL` to buy Rs 999-Rs 3,999/month plans whose benefits ("Priority listing", "Top listing", "Verified badge", lifting a "5 bookings/month" cap - `apps/api/src/services/subscription.service.ts:78+`) are features unlocked *within the app*. Reachable from four routes today. **Remedy:** gate the screens behind `Platform.OS !== 'ios'` for v1.
4. **`react-native-webview` is undeclared, so live darshan cannot play in-app** - `apps/mobile/app/(devotee)/darshan-player.tsx:25-31` `require()`s a package that exists in no `package.json` and no `node_modules`. In a real IPA the screen falls to its "The video component is missing from this build" fallback (`:196-215`) and bounces to Safari. Also disables `apps/mobile/app/(devotee)/web-view.tsx`. **Remedy:** `npx expo install react-native-webview`.

### HIGH (broken UX, will not fail review)

5. **Three auth screens render under the notch / Dynamic Island** - `apps/mobile/app/(auth)/login.tsx:83`, `signup.tsx:79`, `verify-otp.tsx:84` root at `KeyboardAvoidingView` with no `SafeAreaView`, while `apps/mobile/app/_layout.tsx:56` disables navigation headers globally. `verify-otp.tsx:88`'s back button is partly behind the Dynamic Island. First screen every reviewer sees.
6. **Nine form screens have a `TextInput` and no `KeyboardAvoidingView`** - `kundli.tsx`, `puja-book.tsx`, `donations.tsx`, `support.tsx`, `gurukul-apply.tsx`, `weddings-muhurat.tsx`, `weddings.tsx`, `yatra-detail.tsx`, `(wellness)/sessions.tsx`. On iOS the keyboard covers the field with no escape. Two of these are revenue flows.

### MEDIUM

7. `apps/mobile/assets/icon.png` is 1024x1024 but colour type 6 (has alpha) - ITMS-90717 risk; Expo's prebuild very likely flattens it, but it would flatten onto white, not brand saffron.
8. `NSPhotoLibraryUsageDescription` in `apps/mobile/app.json` declares a photo-attachment feature that does not exist anywhere in the app - App Privacy mismatch. Delete the key.
9. `expo-notifications` is not in `app.json` `plugins`; verify `aps-environment` is emitted and an APNs key is registered in EAS, or iOS push silently never arrives.
10. `expo-splash-screen` is not installed while `app.json` uses the legacy top-level `splash` key - verify the splash renders on the first iOS build.
11. YouTube branch at `apps/mobile/app/(devotee)/darshan-player.tsx:190-195` omits `allowsInlineMediaPlayback` - video will force-fullscreen on iOS.
12. Darshan HLS playback hard-depends on jsDelivr at runtime (`apps/mobile/app/(devotee)/darshan-player.tsx:57`) - vendor `hls.js`, or skip it on iOS where WKWebView plays HLS natively.
13. No bottom safe-area handling anywhere - all 46 `edges={}` props are `['top']`. Tab bars rescue most screens; device-test any stack route with bottom-pinned content.
14. `expo-video@2.0.6` is installed and never imported - dead native dependency.

### POLISH

15. Fill the App Store Connect App Privacy questionnaire (phone, email, name, and birth date/time/place from `kundli.tsx`; Sentry diagnostics; tracking = No).
16. Record at `apps/mobile/lib/nri-premium-availability.ts:29` that flipping `NRI_PREMIUM_IS_SELLABLE` to `true` requires StoreKit on iOS.
17. `splash.png` is a full-screen 1284x2778 image; a centred logo on a solid colour is more robust across aspect ratios.

### Verified OK

- **No missing `NS*UsageDescription`.** The app calls zero permission-gated native APIs beyond push notifications (which needs no purpose string). No camera, photos, mic, location, contacts, calendar, or ATT anywhere - the modules are not even installed.
- **Sign in with Apple not required** - only first-party email/password and first-party phone OTP; no third-party IdP anywhere.
- **Booking/donation/store payments correctly stay off IAP** - real-world services and physical goods, Guideline 3.1.3(e).
- **Devotee Premium is gated off** (`NRI_PREMIUM_IS_SELLABLE = false`), so its 3.1.1 problem is dormant, not live.
- **`SafeAreaProvider` is correctly installed at the root** (`apps/mobile/app/_layout.tsx:49`), and 44+ screens get top insets via `apps/mobile/lib/portal-screen.tsx:28`.
- **Every `KeyboardAvoidingView` uses the correct `behavior="padding"` on iOS** - the technique is right, only the coverage is short.
- **Zero elevation-without-shadow bugs**; all 16 elevations paired with full iOS shadow quads; no `Platform.OS === 'android'` branches at all.
- **Privacy manifest needs no config** - Expo SDK 52 auto-generates it and no extra required-reason API is used.
- **`ITSAppUsesNonExemptEncryption: false`** is correctly declared in `apps/mobile/app.json`, which avoids the export-compliance prompt on every upload.

### iOS public-release-readiness score: **38 / 100**

The iOS-specific engineering is better than expected - no permission-string gaps, correct safe-area provider, correct keyboard technique, perfect shadow/elevation parity, and the two hardest judgement calls (Sign in with Apple, IAP-for-bookings) both come out in the app's favour - but it cannot ship as-is: two certain review rejections (no account deletion, demo admin credentials on the login screen), one probable one (provider subscriptions billing outside IAP for in-app features), and a flagship feature that silently degrades to a Safari link because `react-native-webview` was never added to `package.json`. All four are small, well-scoped fixes rather than architectural problems, and no IPA has ever been built, so none of this has been exercised on a device.
