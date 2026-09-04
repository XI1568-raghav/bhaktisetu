# W1 — Android / Google Play Release Readiness Audit

**Target:** `apps/mobile` (Expo SDK 52, RN 0.76, expo-router 4, `newArchEnabled: true`, targetSdk 35)
**Date:** 2026-09-02
**Scope:** Everything *other* than the build-config issues already fixed by the main session
(`expo-build-properties` missing → now installed; the single 2026-04-28 EAS Android build that
ERRORED at Metro EAGER_BUNDLE on `@babel/runtime/helpers/interopRequireDefault` + 3 peer deps).

**Method:** static audit of `apps/mobile/app` (111 `.tsx` route files), `apps/mobile/lib` (36 modules),
`apps/mobile/app.json` / `eas.json` / `package.json` / `assets`, plus the corresponding
`apps/api/src/routes`, `apps/api/src/lib/fcm.ts`, `apps/api/src/services/subscription*.ts`,
`apps/web/public`, `apps/web/app`, and `.github/workflows`. No `eas build`, no `expo prebuild`.

---

## Scorecard

| Severity | Count |
|---|---|
| **BLOCKER** | 4 |
| **HIGH** | 9 |
| **MEDIUM** | 8 |
| **Verified OK** | 11 |

**Android public-release-readiness score: 34 / 100.**

---

## Severity legend

| Level | Meaning |
|---|---|
| **BLOCKER** | Play Console will reject the release, or the app is functionally broken for a normal Android user on first run. |
| **HIGH** | Ships, but a large fraction of users hit a visible defect, or a policy landmine goes live the moment a flag/key flips. |
| **MEDIUM** | Quality/polish debt that a reviewer, the Play pre-launch report, or a demanding user will notice. |

---

# BLOCKERS

## B-1 — No in-app account deletion anywhere; the web deletion page is sign-in-only

**Policy:** Google Play *User Data — Account deletion* requirement. Any app that lets users create an
account must offer (a) an in-app path to request account + data deletion, and (b) a web URL declared in
the Data safety form for the same request, reachable without installing the app.

**Evidence:**
- `apps/mobile` — zero hits. `grep -rn "delete-account\|deleteAccount\|Delete Account\|account/delete" apps/mobile/app apps/mobile/lib` returns **nothing**. The app has signup (`apps/mobile/app/(auth)/signup.tsx`) and sign-out (`apps/mobile/app/(devotee)/profile.tsx:423`) but no deletion.
- The only deletion rail in the product is the DSAR form at `apps/api/src/routes/dpdp.ts:108` (`POST /dsar`, `preHandler: [authenticateUser]`) with `kind: 'erasure'` (`apps/api/src/routes/dpdp.ts:53`).
- Its only UI is `apps/web/app/account/privacy/page.tsx:73-74` (`id: 'erasure'`, `label: 'Delete my account and data'`).
- That page is explicitly a signed-in surface — `apps/web/app/account/privacy/layout.tsx:19-24` sets `robots: { index: false, follow: false }` with the comment "A signed-in surface". There is no unauthenticated `/delete-account` or `/data-deletion` landing page.

**Why this rejects:** the Data safety declaration will be filed with either no deletion URL or a URL that
renders nothing to a logged-out reviewer, and there is no in-app path at all. This is the single most
commonly-enforced Play rejection for apps with account creation.

**Remedy:**
1. Add `apps/web/app/data-deletion/page.tsx` — a *public* (indexable, no auth) page that names the app, explains what is deleted vs retained (bookings/donations kept for statutory records), states the SLA, and links to the signed-in form and `support@darshya.online`. This URL goes in the Data safety form.
2. Add an in-app row in `apps/mobile/app/(devotee)/profile.tsx` (wire it into `handleQuickLink`, `profile.tsx:234-256`) that POSTs `{ kind: 'erasure' }` to `/api/v1/dpdp/dsar` behind a typed-confirmation dialog, then signs the user out.
3. Mirror the row on every role portal — the deletion path must exist for pandits/astrologers/temple managers too, not just devotees.

---

## B-2 — No privacy policy link inside the app

**Policy:** Google Play *User Data* — the privacy policy must be linked **both** on the store listing
**and** from within the app, for any app collecting personal or sensitive data. Darshya collects email,
phone, name, date/time/place of birth (kundli), and delivery addresses.

**Evidence:**
- `apps/web/app/privacy/page.tsx` exists, so the store-listing half is satisfiable.
- The app never links it. The only candidate row is `apps/mobile/app/(devotee)/profile.tsx:69-74` — `label: 'Settings'`, `subtitle: 'Language, notifications, privacy'` — and `handleQuickLink` (`profile.tsx:234-256`) has no `settings` branch, so it falls through to `profile.tsx:255`: `Alert.alert('Coming Soon', 'This feature is coming soon!')`.
- `grep -rn "privacy" apps/mobile/app apps/mobile/lib` finds no URL, no `Linking.openURL('https://darshya.online/privacy')`, nothing.

**Remedy:** in `apps/mobile/app/(devotee)/profile.tsx`, add explicit `Privacy Policy` and `Terms` rows that
call `Linking.openURL('https://darshya.online/privacy')` / `/terms` — follow the existing pattern in
`apps/mobile/lib/help-centre.ts:54` (`openHelpCentre`), which already does exactly this correctly for
`/help`. Also add them to the auth screens' footer (`apps/mobile/app/(auth)/signup.tsx`) since consent is
collected at signup.

---

## B-3 — Every tab bar hard-codes its Android height, defeating edge-to-edge insets at targetSdk 35

**Impact:** the app's primary navigation is partially covered by the system nav bar on Android 15. This
is the first thing a user sees after login, on every one of the 9 role portals.

**Mechanism:** `apps/mobile/app.json:38-46` pins `targetSdkVersion: 35` via `expo-build-properties`
(and Play *requires* API 35 for new apps, so dropping to 34 is not an option). Android 15 enforces
edge-to-edge for targetSdk 35 apps — the system nav bar draws over the app window. React Navigation's
bottom tab bar normally compensates by adding `useSafeAreaInsets().bottom` to its own padding, but that
is only applied when `tabBarStyle` does not override `height`/`paddingBottom`. Every layout here
overrides both.

**Evidence — identical defect in all 9 tab layouts:**

| File | Line |
|---|---|
| `apps/mobile/app/(devotee)/_layout.tsx` | 186, 188 |
| `apps/mobile/app/(admin)/_layout.tsx` | 43, 45 |
| `apps/mobile/app/(astrologer)/_layout.tsx` | 46, 48 |
| `apps/mobile/app/(gaushala)/_layout.tsx` | 44, 46 |
| `apps/mobile/app/(priest)/_layout.tsx` | 61, 63 |
| `apps/mobile/app/(store-admin)/_layout.tsx` | 44, 46 |
| `apps/mobile/app/(temple)/_layout.tsx` | 43, 45 |
| `apps/mobile/app/(wellness)/_layout.tsx` | 46, 48 |
| `apps/mobile/app/(onboard)/_layout.tsx` | `<Stack>`, not a tab bar — not affected |
| `apps/mobile/app/(auth)/_layout.tsx` | `<Stack>`, not a tab bar — not affected |

The literal, in each:

```js
height: Platform.OS === 'ios' ? 88 : 64,
paddingBottom: Platform.OS === 'ios' ? 28 : 8,
```

iOS gets a 28pt bottom allowance; **Android gets 8**. The gesture-nav inset is ~24dp and the 3-button nav
bar is 48dp. Labels (`fontSize: 11`, `apps/mobile/app/(devotee)/_layout.tsx:196`) sit in the bottom ~14dp
of the bar and are covered outright; the lower half of each icon's touch target falls under the system bar.

**Remedy (per file):** replace the constant with the real inset —

```js
const insets = useSafeAreaInsets();          // react-native-safe-area-context
// ...
tabBarStyle: [styles.tabBar, {
  height: 56 + insets.bottom,
  paddingBottom: 8 + insets.bottom,
}],
```

…or simply delete `height`/`paddingBottom` from the `tabBar` style and let React Navigation 7 compute
them. Additionally set `androidNavigationBar` in `apps/mobile/app.json` (see B-4) so the bar is
transparent rather than an opaque black band over the tabs.

---

## B-4 — Edge-to-edge is unconfigured at the app level; bottom-pinned UI has no inset

`apps/mobile/app.json` declares **no** `androidStatusBar`, **no** `androidNavigationBar`, and **no**
`edgeToEdgeEnabled` under `expo-build-properties` (the whole `android` block is `app.json:33-46`:
`adaptiveIcon`, `package`, `versionCode`, `permissions` — nothing else). `expo-system-ui` is a
dependency (`apps/mobile/package.json`) but is **never imported** —
`grep -rn "expo-system-ui\|SystemUI\|setBackgroundColorAsync" apps/mobile/app apps/mobile/lib` → 0 hits.
The only status-bar control is `apps/mobile/app/_layout.tsx:55`:
`<StatusBar style="dark" backgroundColor="#FFFFFF" />` — and on Android 15 with enforced edge-to-edge,
`backgroundColor` on `expo-status-bar` is a no-op, so this line is already dead.

**Concrete casualties beyond the tab bars:**

- `apps/mobile/app/(devotee)/content.tsx:530-544` — the `miniPlayer` is `position: 'absolute', bottom: 0` inside a `SafeAreaView edges={['top']}` (`content.tsx:262`). Its transport controls land under the gesture pill and become untappable.
- Every `PortalScreen` (`apps/mobile/lib/portal-screen.tsx:28`) uses `edges={['top']}` only. Its `ScrollView` adds a `spacing.xl` (32px) tail (`portal-screen.tsx:43`) which partially masks the problem — but the 32px is unconditional and unrelated to the real inset.
- Same `edges={['top']}` pattern in `apps/mobile/lib/inbox.tsx:183, 210, 220, 437`, `apps/mobile/app/(devotee)/upgrade.tsx:142`, `apps/mobile/app/(devotee)/web-view.tsx:~156`.

**Remedy:**
1. In `apps/mobile/app.json`, add under `expo.android`:
   ```json
   "androidStatusBar": { "barStyle": "dark-content", "translucent": true, "backgroundColor": "#00000000" },
   "androidNavigationBar": { "barStyle": "dark-content" }
   ```
2. Set `edgeToEdgeEnabled: true` in the `expo-build-properties` android block so the behaviour is explicit and identical on Android 14 and 15 (rather than only appearing on 15).
3. Change the shared shells to `edges={['top','bottom']}` — `apps/mobile/lib/portal-screen.tsx:28` and `apps/mobile/lib/inbox.tsx:183/210/220/437` — which fixes ~60 screens in two files.
4. Give `content.tsx`'s `miniPlayer` `bottom: insets.bottom`.

---

# HIGH

## H-1 — Push notifications: dependency present, hook mounted, and structurally incapable of working

**End-to-end verdict: the token the app produces is a format the server is coded to reject with HTTP 400.
Push has never worked and will still not work after the feature flag is flipped.**

Trace:

| Step | Status | Evidence |
|---|---|---|
| Dep installed | YES | `expo-notifications ~0.14.0`, `apps/mobile/package.json` |
| Hook mounted | YES | `apps/mobile/app/_layout.tsx:9,12-15,54` → `<PushRegister />` |
| Runtime flag | **OFF** | `apps/mobile/lib/push-notifications.ts:62` — `if (process.env.EXPO_PUBLIC_PUSH_ENABLED !== 'true') return;`. `.env.example:30` sets `false`; the local `.env` omits the key entirely; `apps/mobile/eas.json` `preview`/`production` `env` blocks do **not** set it → **`false` in every shipped build**. |
| Permission requested | **NEVER at runtime** | `apps/mobile/lib/push-notifications.ts:37-42` calls `getPermissionsAsync()` then `requestPermissionsAsync()` — but it is downstream of the flag return at line 62. **On Android 13+ the `POST_NOTIFICATIONS` runtime prompt is never shown.** |
| Token obtained | Code exists, unreachable | `apps/mobile/lib/push-notifications.ts:46` — `getExpoPushTokenAsync(...)`. `getDevicePushTokenAsync` is never used. |
| Project ID | **Wrong source** | Line 45 reads `process.env.EXPO_PUBLIC_EAS_PROJECT_ID`, which is empty in `.env.example:31` and unset in both `eas.json` build profiles. The real id **is** present at `app.json:53` (`extra.eas.projectId: d928b3ea-…`) but the code never reads it. |
| FCM native config | **ABSENT** | No `google-services.json` in `apps/mobile/`; `grep -c googleServicesFile apps/mobile/app.json` → `0`. A standalone Android build cannot obtain a device push token without it. |
| Endpoint exists | YES | `apps/api/src/routes/notifications.ts:221` — `POST /register-token` |
| **Endpoint accepts the token** | **NO — hard 400** | `apps/api/src/routes/notifications.ts:236-241` rejects anything failing `isFcmRegistrationToken`. That guard (`apps/api/src/lib/fcm.ts:~124-131`) requires `t.length >= 60` and `/^[A-Za-z0-9_:.-]+$/`. An Expo push token is `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]` — **~41 chars, and `[`/`]` are outside the charset**. It fails *both* conditions. |
| Send path | Exists, FCM-only | `apps/api/src/lib/fcm.ts:132` `sendFcm` → `https://fcm.googleapis.com/v1/projects/{id}/messages:send`. There is **no** Expo push endpoint (`exp.host/--/api/v2/push/send`) anywhere in `apps/api`. |
| Anything ever sent to a mobile device | **NO** | No row can ever be written, so nothing can ever be selected to send to. |

**The core mismatch:** the client speaks *Expo Push*, the server speaks *FCM v1 raw*. They are not
interchangeable, and `apps/api/src/lib/fcm.ts` was deliberately hardened (NOTIF-07) to refuse non-FCM
tokens — that same hardening now blocks the mobile client.

**Remedy — pick one rail and commit to it:**
- **Rail A (fewer moving parts):** swap `getExpoPushTokenAsync` → `getDevicePushTokenAsync()` in `apps/mobile/lib/push-notifications.ts:46` (returns the raw FCM token the API already accepts), add `google-services.json` + `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`, and read the project id from `Constants.expoConfig.extra.eas.projectId` instead of the unset env var.
- **Rail B:** keep Expo Push and add an Expo send path + a token-shape branch server-side in `apps/api/src/routes/notifications.ts:236` and `apps/api/src/lib/fcm.ts`.
- Either way: set `EXPO_PUBLIC_PUSH_ENABLED=true` in the `preview` and `production` `env` blocks of `apps/mobile/eas.json`, and **move the permission request out from behind the flag or off the app-launch path** — asking for notifications on first launch with no context is the lowest-converting placement there is.

---

## H-2 — `POST_NOTIFICATIONS` is declared but never requested (Play flags it; users never see the prompt)

`apps/mobile/app.json:41-44` declares `["POST_NOTIFICATIONS", "VIBRATE"]`. Per H-1, the runtime request at
`apps/mobile/lib/push-notifications.ts:40` is unreachable in every shipped build. On Android 13+ a declared
`POST_NOTIFICATIONS` with no runtime request means notifications are silently blocked forever and the
permission appears in the Play listing's permission summary for no reason.

`VIBRATE` has no direct consumer either — `grep -rn "Vibration\|Haptics" apps/mobile/app apps/mobile/lib`
→ 0 hits. It is harmless (normal permission, no prompt, not a Data-safety item) and `expo-notifications`
merges it anyway, so it is noise rather than risk.

**Remedy:** either fix H-1 so the prompt actually fires, or drop `POST_NOTIFICATIONS` from `app.json:41-44`
until push works. Shipping a permission that is declared, never requested, and backed by a broken rail is
the worst of the three options.

---

## H-3 — Adaptive icon is the iOS square icon; the temple mark will be clipped by every launcher mask

`apps/mobile/assets/adaptive-icon.png` is **byte-identical** to `apps/mobile/assets/icon.png`
(verified: both 1024×1024, 8-bit RGBA, 46,944 bytes, `Buffer.equals()` → `true`).

The artwork is a full-bleed rounded-square orange plate with the temple glyph spanning roughly
y=105 → y=850 of 1024 (~10% → ~83%).

Android composites the adaptive foreground onto a 108dp canvas of which only the central **66dp
(≈61%)** is mask-safe — i.e. pixels **199 → 825** of a 1024 canvas. The temple's roof apex (y≈105) and
its base (y≈850) both fall **outside** that window and will be cropped on circular and squircle
launchers. Worse, the foreground carries its own rounded-square orange plate while
`app.json:35-37` also paints `backgroundColor: "#EA580C"` — so the result is an orange plate visibly
inset inside an orange mask, with a double-rounded corner artifact.

There is also no `monochrome` layer, so Android 13+ themed icons fall back to the un-themed icon.

**Remedy:** author a *separate* `adaptive-icon.png`: transparent background, glyph only, scaled so all
content sits inside the central 66% (≈ pixels 174–850 of 1024, with real margin). Keep
`icon.png` as-is for iOS. Add `"monochrome": "./assets/adaptive-icon-mono.png"` to
`app.json`'s `android.adaptiveIcon` block.

## H-4 — Notification icon is a full-colour 1024×1024 PNG; Android will render a solid white square

`apps/mobile/app.json:47-51`:
```json
"notification": { "icon": "./assets/icon.png", "color": "#EA580C", "androidMode": "default" }
```
Android tints the notification *small* icon and treats every non-transparent pixel as opaque. Pointing it
at the full-bleed colour app icon produces a featureless white/orange block in the status bar and shade.
Additionally, the top-level `expo.notification` key is the legacy path in SDK 52; the supported route is
the `expo-notifications` config plugin, which is **not** in `app.json:23-32`'s `plugins` array.

**Remedy:** add a 96×96 white-on-transparent silhouette (e.g. `assets/notification-icon.png`) and move the
config into the plugin:
```json
["expo-notifications", { "icon": "./assets/notification-icon.png", "color": "#EA580C" }]
```

## H-5 — Deep links / Android App Links are entirely unconfigured, and the router hook is dead code

Three independent gaps:

1. **No `intentFilters`.** `apps/mobile/app.json` has `"scheme": "darshya"` (line 5) and nothing else — `grep -n "intentFilters\|autoVerify" apps/mobile/app.json` → 0 hits. So `https://darshya.online/...` links open the browser, never the app.
2. **No `assetlinks.json`.** `apps/web/public/` contains no `.well-known` directory (verified by listing), and a repo-wide grep for `assetlinks` across `apps/web` returns nothing but an unrelated prose match. No Next route serves it either. Without it `autoVerify` cannot succeed even once added.
3. **The deep-link router is never mounted.** `apps/mobile/lib/deep-link.ts:101` exports `useDeepLinkRouter`, and `grep -rn "useDeepLinkRouter" apps/mobile/app` returns **zero call sites** — only its own test file references `parseDeepLink`. The module's own header (`deep-link.ts:22-30`) states the activation gates and admits the hook is inert. It is currently not even that: it is unreferenced.

Consequence: `darshya://puja/rudrabhishek` is handed to expo-router's default linking, which has no
`puja/[slug]` route, so it resolves to not-found rather than `apps/mobile/app/(devotee)/puja-book.tsx`.
Every marketing link, every share link, and every future push tap lands wrong.

**Remedy:**
1. `apps/web/public/.well-known/assetlinks.json` with the `com.darshya.app` package and the SHA-256 of the *Play App Signing* cert (from Play Console → Setup → App integrity — **not** the upload cert, the most common mistake here). Confirm `apps/web/public/_headers` serves it as `application/json` and that no redirect intercepts `/.well-known/*`.
2. Add to `app.json` under `expo.android`:
   ```json
   "intentFilters": [{
     "action": "VIEW", "autoVerify": true,
     "data": [{ "scheme": "https", "host": "darshya.online" }],
     "category": ["BROWSABLE", "DEFAULT"]
   }]
   ```
3. Mount `useDeepLinkRouter()` in `apps/mobile/app/_layout.tsx` next to `<PushRegister />` (line 54), or delete `lib/deep-link.ts` and express the map as an expo-router `linking` config. Do not ship it unreferenced.

## H-6 — Play Billing: no violation today, two live landmines

**Classification of every payment surface reachable from the Android app:**

| Surface | What is sold | Play class | Verdict |
|---|---|---|---|
| `apps/mobile/lib/booking-flow.ts` + `app/(devotee)/puja-book.tsx:351` | A priest physically performing a puja at a temple | **Real-world service** | **EXEMPT** — correct as built |
| `app/(devotee)/donations.tsx:130` | Donation to temple / gaushala | **Donation** | **EXEMPT** |
| `app/(devotee)/store.tsx` | Prasad, physical goods | **Physical goods** | **EXEMPT** |
| `app/(devotee)/consultations.tsx:69`, `app/(astrologer)/consultations.tsx:61` | Live 1:1 human consultation over Jitsi | **Service performed by a person** | **EXEMPT** |
| `app/(devotee)/upgrade.tsx` — "Darshya Premium" ₹5,000/yr | Mixed bundle incl. **"Unlimited HD live darshan"** and **"Premium kundli + monthly horoscope reports"** (`upgrade.tsx:43-45`) | **Digital content** — a mixed bundle containing in-app digital content is treated as digital in full | **WOULD VIOLATE** — currently dead |
| `app/(priest|astrologer|temple|wellness)/subscription.tsx` → `lib/subscription-screen.tsx:70` | Provider SaaS: *"Priority listing", "Top listing", "Verified badge", "Featured placement", "Advanced analytics", "Live darshan streaming"* (`apps/api/src/services/subscription.service.ts:82-227`) | **Digital service consumed in-app.** There is no B2B/SaaS carve-out in the Payments policy; the exemptions are physical goods and real-world services only | **WOULD VIOLATE** — currently gated shut |
| API plans `astro_session` ₹99 / `astro_monthly` ₹499 (`subscription.service.ts:234-256`) — *"30 AI Pandit messages"*, *"Unlimited AI Pandit chat"* | **Pure digital content** | **WOULD VIOLATE** — **not reachable from mobile** (no screen mounts them; `SubscriptionScreen` is only instantiated for the four provider roles) |

**Why there is no violation today — both digital rails are closed:**
- Devotee: `apps/mobile/lib/nri-premium-availability.ts:29` — `export const NRI_PREMIUM_IS_SELLABLE = false;`. `upgrade.tsx:204` requires it to be true before the CTA renders at all.
- Providers: `apps/mobile/lib/subscription-screen.tsx:54-64` — `handleSubscribe` refuses unless `evaluateUpgradeGate` passes, and that gate (`apps/mobile/lib/subscription-gate.ts:62-68`) is **closed by default** and additionally rejects the `rzp_test_demo` placeholder key. Repo state (TASKS.md, item #205) records prod as still on that placeholder.

**The landmine:** both screens purchase by `Linking.openURL(razorpayCheckoutUrl)` —
`upgrade.tsx:131` and `subscription-screen.tsx:70`. That is precisely the out-of-app payment link Play
prohibits for digital goods. The moment the live Razorpay key lands (unblocking every provider
`subscription.tsx`) **or** `NRI_PREMIUM_IS_SELLABLE` flips, an Android build ships a policy violation
with no code change required.

**Remedy — decide before the key lands, not after:**
1. **Cheapest:** remove the four provider `subscription.tsx` routes and `(devotee)/upgrade.tsx` from the Android build entirely (`href: null` is not enough — delete the route or gate it on `Platform.OS !== 'android'`). Providers manage plans on `darshya.online`; the app must not *link* to that checkout either.
2. **If you want to sell in-app:** integrate `react-native-iap` / Play Billing for these SKUs specifically. Note Play's India User-Choice-Billing programme still requires Play Billing to be offered and still charges a service fee — it is not an escape hatch.
3. Keep bookings/donations/store/consultations exactly as they are. Those are correctly exempt and must **not** be moved to Play Billing (that would cost 15-30% on real-world services for no reason).

## H-7 — Five dead rows and a dead button on the main profile screen

`apps/mobile/app/(devotee)/profile.tsx:234-256` — `handleQuickLink` handles only `bookings`, `messages`,
`consultations`, `addresses`, `list-business`. Everything else hits line 255:
`Alert.alert('Coming Soon', 'This feature is coming soon!')`.

Dead rows, with their definition sites:
- `subscription` — "Manage your Darshya Premium" (`profile.tsx:55-61`)
- `settings` — "Language, notifications, privacy" (`profile.tsx:69-74`) — **this is also B-2**
- `help` — "Help & Support / FAQs and customer support" (`profile.tsx:86-91`) — ironic: `apps/mobile/lib/help-centre.ts` already implements this correctly and `app/(devotee)/support.tsx:104` already calls it
- `about` — "About Darshya" (`profile.tsx:93-97`)
- `share` — "Share App / Invite friends and family" (`profile.tsx:98-103`)
- Plus "Edit Profile" → `profile.tsx:300`, `Alert.alert('Edit Profile', 'Profile editing coming soon!')`
- Plus the generic fallback at `profile.tsx:171` for any row rendered without an `onPress`

Play's pre-launch report and human review both flag advertised-but-inert UI under Broken Functionality /
Minimum Functionality. Six dead controls on the profile screen is a bad look at review and a worse one
at first use.

**Remedy:** wire `help` → `openHelpCentre(Linking.openURL)` (one line, the helper exists);
`settings` → the new privacy/terms screen from B-2; `share` → RN `Share.share()`;
`about` → `Linking.openURL('https://darshya.online/about')`; `subscription` →
`router.push('/(devotee)/upgrade')`. Delete any row you will not wire this release.

## H-8 — `(auth)` screens and `+error.tsx` have no safe-area handling at all

`apps/mobile/app/(auth)/login.tsx`, `signup.tsx`, `verify-otp.tsx` and `apps/mobile/app/+error.tsx` are in
the no-`SafeAreaView` set. Login/signup partially escape by luck — `login.tsx:236` sets
`paddingTop: spacing['2xl'] + spacing.md` = 48+16 = **64px**, which clears the ~24dp status bar. But it is
a fixed constant, not an inset: on a device with a larger cutout the brand row (`login.tsx:91-94`) crowds
the notch, and the *bottom* of the scroll has no allowance at all.

`apps/mobile/app/+error.tsx` is the crash screen — a `View` with a `Pressable` reload button
(`+error.tsx:47`) and no safe area anywhere. If it renders under edge-to-edge with the button near an
edge, the one control that recovers from a crash is the one under the gesture bar.

`apps/mobile/app/index.tsx` is fine — a centred `ActivityIndicator` (`index.tsx:27-31`), nothing pinned.

**Remedy:** wrap all four in `<SafeAreaView edges={['top','bottom']}>` from
`react-native-safe-area-context` (already a dependency, already the pattern in
`apps/mobile/lib/portal-screen.tsx:28`).

## H-9 — Hardware back exits the app from every role dashboard; only one screen handles it

`grep -rn "BackHandler\|hardwareBackPress" apps/mobile/app apps/mobile/lib` returns exactly **two**
lines, both in one file: `apps/mobile/app/(devotee)/web-view.tsx:9` and `:138`. That one usage is
**correct and well-reasoned** (`useFocusEffect` + `sub.remove()`, walks WebView history first).

Everywhere else:
- **Every role dashboard is a tab-root under a stack whose only sibling is `index`.** `apps/mobile/app/index.tsx:21` does `router.replace(getRoleDashboardPath(user.role))` — a **replace**, so the stack has exactly one entry. Pressing back on `(devotee)/index`, `(priest)/dashboard`, `(temple)/dashboard`, etc. exits the app immediately, with no "press back again to exit" confirmation. Standard Android apps either confirm or pop to the first tab.
- **Back from a secondary tab does not return to the first tab.** All the `href: null` screens (`apps/mobile/app/(devotee)/_layout.tsx:77-175` — 25 of them) are tab routes reached by `router.push`. React Navigation's Android back handling in a tab navigator does not pop to the initial tab by default, so back from e.g. `kundli` exits rather than returning to Home.
- **Back cannot escape the auth guard, correctly.** `apps/mobile/lib/role-guard.tsx:26/30` uses `router.replace` for both redirects, so there is no popped-back-into-a-guarded-screen hole. This part is right.

**Remedy:**
1. Add a `backBehavior="initialRoute"` prop to each `<Tabs>` in the 9 `_layout.tsx` files so back returns to the first tab.
2. Add a double-tap-to-exit `BackHandler` on each role dashboard (or one shared hook in `lib/`), modelled on the existing `useFocusEffect` pattern at `apps/mobile/app/(devotee)/web-view.tsx:136-147`.

---

# MEDIUM

## M-1 — `elevation` + `overflow: 'hidden'` on the same view kills the shadow on Android

On Android, `overflow: 'hidden'` clips the view's own elevation shadow. iOS `shadow*` props are
unaffected, so these cards have depth on iOS and are flat on Android:

- `apps/mobile/app/(devotee)/pujas.tsx:389-397` (`pujaCard`)
- `apps/mobile/app/(devotee)/store.tsx:424-432` (`productCard`)
- `apps/mobile/app/(devotee)/content.tsx:530-544` (`miniPlayer` — `elevation: 10` + `overflow: 'hidden'`)
- Same shape at `apps/mobile/app/(devotee)/darshan.tsx:352`, `temples.tsx:256`, `wellness.tsx:567`, `profile.tsx:626`, `index.tsx:427`

**Remedy:** split into an outer elevated wrapper (`elevation` + `shadow*`, no `overflow`) and an inner
clipping child (`borderRadius` + `overflow: 'hidden'`, no elevation).

## M-2 — `PortalScreen`'s ScrollView swallows the first tap when the keyboard is open

`apps/mobile/lib/portal-screen.tsx:33-41` — the `ScrollView` has no `keyboardShouldPersistTaps`. RN's
default is `"never"`, so with a keyboard up, the first tap anywhere only dismisses the keyboard; the user
must tap the submit button twice. This affects every portal form:
`app/(admin)/users.tsx`, `app/(store-admin)/products.tsx`, `app/(wellness)/sessions.tsx`,
`app/(devotee)/support.tsx`, `app/(devotee)/donations.tsx`, `app/(devotee)/temples.tsx`,
`app/(devotee)/gurukuls.tsx`, `app/(devotee)/yatra-detail.tsx`.

**Remedy:** one line — add `keyboardShouldPersistTaps="handled"` at `apps/mobile/lib/portal-screen.tsx:34`.
Fixes all of them at once. The standalone forms already do this correctly
(`app/(devotee)/puja-book.tsx:405`, `kundli.tsx:84`, `weddings.tsx:85`, `gurukul-apply.tsx:115`).

## M-3 — No `KeyboardAvoidingView` on the portal forms

Only 6 files use `KeyboardAvoidingView`: `(auth)/login.tsx:83`, `(auth)/signup.tsx:79`,
`(auth)/verify-otp.tsx:84`, `(gaushala)/cows.tsx:168`, `(onboard)/become-gurukul.tsx:155`. Every
`PortalScreen`-based form has none. Note the *modal* case is the dangerous one: an input inside a
`<Modal>` does not benefit from `windowSoftInputMode=adjustResize`, so a modal form without a
`KeyboardAvoidingView` will have its input covered. `(gaushala)/cows.tsx:168` gets this right; check any
new modal forms against it.

**Not a defect:** `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` (login.tsx:84,
signup.tsx:80, verify-otp.tsx:85, cows.tsx:169, become-gurukul.tsx:156) is the **correct** Android
pattern — `undefined` lets `adjustResize` do the work, and `"padding"` on Android double-compensates.
This is right as written.

## M-4 — `softwareKeyboardLayoutMode` not declared (relying on an undocumented default)

`apps/mobile/app.json` does not set `expo.android.softwareKeyboardLayoutMode`. Expo's default is
`"resize"` (→ `android:windowSoftInputMode="adjustResize"`), which is what the M-3 analysis assumes, but
it is worth pinning explicitly so a future Expo default change does not silently break every form.

**Remedy:** add `"softwareKeyboardLayoutMode": "resize"` to the `expo.android` block.

## M-5 — No CI builds Android; the entire release path is manual and undocumented at the Play end

`grep -rln "eas build\|eas-cli\|expo/expo-github-action\|eas submit" .github/workflows/` → **zero
matches** across 21 workflows. The only mobile-adjacent workflow is `sentry-release.yml`.

Everything is a manual npm script (`apps/mobile/package.json` — `build:android:prod`, `submit:android`).
`MOBILE_BUILD.md` and `DISTRIBUTION.md` document the *EAS* half competently but **nothing** about the
Play-specific half:
- no mention of Play App Signing, the upload keystore, or where the SHA-256 for `assetlinks.json` comes from
- `MOBILE_BUILD.md` "Submit to stores" says `submit:android` "requires service-account.json" — that file is never described, never gitignored explicitly, and `eas.json`'s `submit.production.android` block (line ~66) sets only `{ "track": "production" }` with no `serviceAccountKeyPath`
- no Data-safety-form checklist, no content-rating step, no internal-testing track step
- `MOBILE_BUILD.md`'s prominent "**Warning — missing assets:** `apps/mobile/assets/` is currently empty" block is **stale** — the directory has held all five assets since 2026-04-28. It will send the next reader chasing a non-problem.
- `DISTRIBUTION.md` "Option 2 — Expo Web Export → Vercel/Netlify" contradicts the project's Render-only deployment doctrine and should be removed or relabelled as a one-off demo path.

**Remedy:** add `.github/workflows/mobile-android.yml` (manual `workflow_dispatch`, `eas build --profile
production --platform android --non-interactive`, `EXPO_TOKEN` secret). Run the free-tier gate first —
EAS free tier is 15 Android builds/month and this shares no budget with GitHub Actions minutes. Then fix
the stale assets warning and add the Play-side checklist.

## M-6 — `expo-video` is a declared dependency with zero imports

`apps/mobile/package.json` lists `expo-video ~2.0.0`. `grep -rn "expo-video\|VideoView\|useVideoPlayer"
apps/mobile/app apps/mobile/lib` → **0 hits**. It is a native module: it enlarges the AAB, adds
autolinking surface, and pulls Media3/ExoPlayer into the build for nothing.

Related: `react-native-webview` is **not** installed (verified — absent from `node_modules`), which
`apps/mobile/lib/webview-module.ts:1-25` documents deliberately. The consequence is that every
"in-app browser" path degrades to `Linking.openURL`, including
`app/(devotee)/darshan-player.tsx:134` — so **live darshan currently ejects the user into Chrome**,
and `app/(devotee)/web-view.tsx` renders its hand-off card instead of a frame.

**Remedy:** drop `expo-video` unless the darshan player is about to use it. If darshan is meant to play
in-app for the Play release, that is a scoped decision (either `expo-video` for HLS or
`react-native-webview` for the YouTube embed) — both need an EAS rebuild, so decide before the first
production build rather than after.

## M-7 — `versionCode: 1` with `appVersionSource: "remote"` — a footgun on first submit

`apps/mobile/app.json:40` pins `"versionCode": 1` while `apps/mobile/eas.json:4` sets
`"appVersionSource": "remote"` and `eas.json`'s `production` profile sets `"autoIncrement": true`.
With remote versioning, EAS owns the number and the local value is ignored — but a stale local `1`
misleads anyone reading `app.json`, and if `appVersionSource` is ever switched to `local`, the second
production upload is rejected by Play for a duplicate version code.

**Remedy:** remove `versionCode` from `app.json` (remote source owns it) or switch to `local` and bump
deliberately. Do not keep both.

## M-8 — `updates.url` is configured with no channel/branch policy for a store build

`apps/mobile/app.json:56-58` enables EAS Update against
`https://u.expo.dev/d928b3ea-…` with `runtimeVersion.policy: "appVersion"` (line 55), but no build
profile in `eas.json` declares a `channel`. A production Play build with OTA updates enabled and no
channel binding will either take no updates at all or take whatever lands on the default branch — and
Play policy prohibits OTA delivery that materially changes app behaviour or bypasses review.

**Remedy:** add `"channel": "production"` to `eas.json`'s `production` profile (and `"preview"` to
preview), and confirm the update branch only ever carries JS-level fixes.

---

# Verified OK

1. **`elevation` / `shadow*` pairing is consistent.** All 12 files using `elevation:` also set `shadowColor` in the same count (`login.tsx` 1/1, `astrology.tsx` 2/2, `content.tsx` 2/2, `profile.tsx` 2/2, `wellness.tsx` 2/2, `darshan.tsx` 1/1, `pujas.tsx` 1/1, `store.tsx` 1/1, `temples.tsx` 1/1, `_layout.tsx` 1/1, `signup.tsx` 1/1, `portal-placeholder.tsx` 1/1). No iOS-only or Android-only shadows. (The `overflow` interaction is M-1; the pairing itself is correct.)
2. **`KeyboardAvoidingView` behavior is the correct Android pattern** — `Platform.OS === 'ios' ? 'padding' : undefined` at `login.tsx:84`, `signup.tsx:80`, `verify-otp.tsx:85`, `cows.tsx:169`, `become-gurukul.tsx:156`. Not the common `"height"`-on-Android mistake.
3. **`includeFontPadding` is never set** — no hand-tuned text metrics to go wrong across Android versions.
4. **Touchable usage is uniform.** `TouchableOpacity` everywhere, one `Pressable` (`+error.tsx:47`); no `TouchableNativeFeedback`, no mixed `android_ripple`. Visually consistent across platforms.
5. **The auth guard cannot be escaped by back navigation.** `apps/mobile/lib/role-guard.tsx:26` and `:30` both use `router.replace`, and `apps/mobile/app/index.tsx:21/23` does the same. No guarded screen is left on the stack to pop back into.
6. **The one `BackHandler` in the codebase is correctly written** — `apps/mobile/app/(devotee)/web-view.tsx:136-147`: `useFocusEffect` + `useCallback` + `sub.remove()` cleanup, and it walks WebView history before yielding to the navigator.
7. **Tab-route registration is complete.** All 25 secondary devotee routes carry an explicit `<Tabs.Screen href={null}>` (`app/(devotee)/_layout.tsx:77-175`), guarded by `lib/__tests__/tab-route-registration.par15.test.ts`. No stray unlabelled tabs — a defect this codebase already found and fixed.
8. **No undeclared native capability is used.** Grep for camera, image picker, media library, document picker, file system, location, contacts, calendar, biometrics across `apps/mobile/app` + `lib` → **zero hits**. The only native surfaces are `Linking` (no permission needed), `expo-secure-store` (none), and `expo-notifications` (declared). The `NSPhotoLibraryUsageDescription` at `app.json:24` is iOS-only and vestigial — nothing picks photos on either platform.
9. **Real-world-service payment paths are correctly exempt from Play Billing** and correctly implemented — puja booking hands off one step to `/bookings/pay?id=` (`lib/booking-flow.ts:38-45`) rather than minting an unpaid hold, donations/store/consultations all external.
10. **`SafeAreaProvider` is mounted at the root** (`apps/mobile/app/_layout.tsx:51`), so `useSafeAreaInsets` will work as soon as the screens start calling it. The infrastructure is right; only the consumers are missing.
11. **Splash asset is correctly sized** — `assets/splash.png` 1284×2778 with `resizeMode: "contain"` and a matching `backgroundColor: "#EA580C"` (`app.json:10-14`). Will letterbox cleanly on any Android aspect ratio.

---

## Remediation order (highest value first)

| # | Action | Files | Effort |
|---|---|---|---|
| 1 | Tab-bar insets — drop the hard-coded `height`/`paddingBottom` | 9 × `_layout.tsx` | ~30 min |
| 2 | `edges={['top','bottom']}` in the two shared shells | `lib/portal-screen.tsx:28`, `lib/inbox.tsx` ×4 | ~10 min, fixes ~60 screens |
| 3 | Edge-to-edge + status/nav bar config in `app.json` | `app.json` | ~15 min |
| 4 | Public `/data-deletion` page + in-app deletion row | `apps/web/app/data-deletion/`, `profile.tsx` | ~2 h |
| 5 | Privacy/Terms rows in-app | `profile.tsx`, `signup.tsx` | ~30 min |
| 6 | Wire or delete the 6 dead profile controls | `profile.tsx:234-256` | ~1 h |
| 7 | Decide Play Billing: strip or integrate the 5 subscription screens | `upgrade.tsx`, 4 × `subscription.tsx` | decision first |
| 8 | Redraw `adaptive-icon.png` + notification icon | `assets/` | ~1 h |
| 9 | `assetlinks.json` + `intentFilters` + mount the deep-link hook | `apps/web/public/.well-known/`, `app.json`, `_layout.tsx` | ~1 h |
| 10 | Push: pick a rail, fix the token format, add `google-services.json` | `lib/push-notifications.ts`, `app.json`, `eas.json` | ~3 h |

Items 1-3 alone move the app from "visibly broken on Android 15" to "usable", and are under an hour.
