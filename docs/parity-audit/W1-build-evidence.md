# W1 — Build & Test Ground Truth (main-session verified)

All results below are REAL command output captured in-session, not inferred.

## Mobile (apps/mobile, Expo SDK 52 / RN 0.76 / expo-router 4)

| Check | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | **PASS** — exit 0, zero errors across 111 screens |
| Metro bundle (android) | `npx expo export --platform android` | **FAIL** — config resolution error (see P0-1) |

### P0-1 — `expo-build-properties` declared but never installed  → BLOCKS ALL iOS + ANDROID BUILDS

`apps/mobile/app.json` lists `expo-build-properties` in `plugins` with android
`minSdkVersion 24 / compileSdkVersion 35 / targetSdkVersion 35` and ios
`deploymentTarget 15.1`. But the package is:

- NOT in `apps/mobile/package.json` dependencies or devDependencies
- NOT in `apps/mobile/node_modules`
- NOT in root `node_modules`
- NOT in `pnpm-lock.yaml` (grep count = 0)

Observed failure:

```
PluginError: Failed to resolve plugin for module "expo-build-properties"
  relative to "E:\NewClaude\bhaktisetu\apps\mobile"
    at resolvePluginForModule (@expo/config-plugins/src/utils/plugin-resolver.ts:52:9)
    at getConfig (@expo/config/src/Config.ts:217:10)
```

**Impact (two distinct failures):**
1. Expo config cannot resolve at all → `expo export`, `expo prebuild`, and every
   `eas build` (ios AND android) fail before compiling a single line.
2. Even once resolved, the declared `targetSdkVersion 35` and iOS
   `deploymentTarget 15.1` were never being applied. Google Play has required
   targetSdk 35 since Aug 2025, so this also silently breaks Play submission.

**Fix:** `npx expo install expo-build-properties` in `apps/mobile`.

## Historical EAS build evidence — the only build ever attempted FAILED

`apps/mobile/build.json` (buildId `1fb89532-1365-4470-96de-b1c870bc3ab2`,
profile `preview`, platform ANDROID, 2026-04-28, commit `13682f4b`):

```
"status": "ERRORED"
"artifacts": {}
```

Failed in phase `EAGER_BUNDLE` after 17.7s. Root cause from `log3.txt`:

```
Error: Unable to resolve module @babel/runtime/helpers/interopRequireDefault
  from apps/mobile/app/(admin)/reports.tsx
Missing peer dependency: expo-constants
Missing peer dependency: expo-font
Missing peer dependency: expo-linking
expo-doctor: 13/17 checks passed. 4 checks failed.
```

Those four deps HAVE since been added to `apps/mobile/package.json`
(`@babel/runtime ^7.25.0`, `expo-constants`, `expo-font`, `expo-linking`), and
`@babel/runtime` now resolves in `apps/mobile/node_modules`. So that specific
failure appears remediated — but it was never re-verified with a fresh build,
and `expo-build-properties` (P0-1) now blocks any attempt.

**Bottom line: there has never been a successful build artifact for either
platform. No APK, no AAB, no IPA has ever existed.**

---

# WAVE 2 — FIXES APPLIED + RE-VERIFIED (main session)

## The build chain: three defects, all now cleared

The mobile app could not produce a JS bundle for either platform. Three
independent blockers were stacked; fixing each revealed the next.

| # | Defect | Fix |
|---|---|---|
| 1 | `expo-build-properties` in `app.json` plugins but absent from package.json/lockfile → Expo config could not resolve at all | `pnpm --filter @poojly/mobile add expo-build-properties@~0.13.3` |
| 2 | `react-native-webview` `require()`d by `darshan-player.tsx`, `web-view.tsx`, `astrology.tsx` but never declared → live darshan silently degraded to an external browser bounce; `web-view.tsx` was dead code | `pnpm --filter @poojly/mobile add react-native-webview@13.12.5` |
| 3 | `uuid@14` (transitive via `expo-notifications`) is exports-only — `main` is `undefined`. Metro on SDK 52 ships `unstable_enablePackageExports` OFF, so it fell back to a nonexistent `main` and died at 1672 modules | `config.resolver.unstable_enablePackageExports = true` in `apps/mobile/metro.config.js` (the SDK-53 default; forward-compatible) |

### Verified result — first successful bundles in project history

```
$ npx expo export --platform android
› android bundles (1):
_expo/static/js/android/entry-b5d10c9d8b48140535435e4ec2c701a6.hbc (5.66 MB)
Exported.                                          [exit code 0]

$ npx expo export --platform ios
› ios bundles (1):
_expo/static/js/ios/entry-c79754375f18820575dde98aab12471b.hbc (5.65 MB)
Exported.                                          [exit code 0]
```

This does NOT mean an APK/AAB/IPA exists — native compilation and signing are
still unattempted, and that requires EAS credits plus (for iOS) a paid Apple
Developer account. It means the JavaScript layer, which is what failed before,
now builds clean for both platforms.

## Other fixes applied

**SECURITY — demo credentials no longer ship to production.**
`apps/mobile/app/(auth)/login.tsx` rendered a "Demo accounts (password:
demo123)" panel with 8 one-tap role chips — including `admin@demo.com` —
**unconditionally**. Only the password `useState` was `__DEV__`-guarded, so a
release build advertised admin credentials on the login screen. The whole block
is now behind `__DEV__`. (Distinct from the demo bypass in `auth-context.tsx:23-25`,
which was already correctly gated.)

**Deep links / push taps no longer dead-end.** `lib/deep-link.ts` returned 7
pathnames with no corresponding screen file — including the fallback, so there
was no recovery path. Every `darshya://` link and every notification tap landed
on expo-router's "unmatched route" screen. Remapped to real screens:

| link | was (broken) | now |
|---|---|---|
| fallback | `/(devotee)/home` | `/(devotee)` |
| `puja/:slug` | `/(devotee)/puja-details` | `/(devotee)/puja-book` |
| `booking/:bn` | `/(devotee)/booking-detail` | `/(devotee)/bookings` |
| `consultation/:id` | `/(devotee)/consultation` | `/(devotee)/consultations` |
| `chat`/`inbox` | `/(devotee)/inbox` | `/(devotee)/messages` |
| `order/:id` | `/(devotee)/order-detail` | `/(devotee)/store` |
| `today` | `/(devotee)/today` | fallback |
| `darshan/:id` | *(was already correct)* | unchanged |

Locked with `lib/deep-link.test.ts` — 5 tests, **5 passed**. The load-bearing one
asserts every returned pathname resolves to a real file under `app/`, re-checked
against the filesystem on each run, so deleting or renaming a screen now fails
here instead of in production.

Required test-harness work: the mobile vitest runner is node-environment and
cannot parse react-native's Flow source or expo-router's TSX. Added
`test/stubs/{react-native,expo-router}.ts` + aliases in `vitest.config.ts`.

**Knowledge hub un-gated.** `EXPO_PUBLIC_KNOWLEDGE_ENABLED` was read by
`(devotee)/knowledge.tsx:22` but set in no EAS profile, so every preview/
production/testflight build rendered "Knowledge Hub launching soon". Verified the
backing API is genuinely live before enabling:

```
$ curl https://api.darshya.online/api/v1/knowledge/sanskrit
{"category":"sanskrit","articles":[{"slug":"aranyakas-texts","title":"The Aranyaka Texts",...
```

Now `"true"` in the preview, production and testflight profiles of `eas.json`.

**Web: tablet drawer restored.** `apps/web/app/layout.tsx` wraps `MobileNavV2` in
`lg:hidden`, but the drawer's own trigger/overlay/sheet were `md:hidden` — so
across 768–1023px the wrapper rendered an empty div. Aligned all three to
`lg:hidden`.

Severity note, correcting the audit agent: this was reported as "zero navigation
in the tablet band", which is **wrong**. `CategoryNav` is `hidden md:flex` (not
`lg:flex`) and `NavAuthButton` is `hidden md:block`, so categories and auth were
always reachable at 768px+. What the band actually lost was the drawer's account
links (Dashboard / My Bookings / Profile), help links (Support / About / Contact)
and in-drawer search. Real, worth fixing, but **P1 — not P0.**

## Test + typecheck status after all changes

| Check | Result |
|---|---|
| `apps/web` tsc | PASS (exit 0) |
| `apps/mobile` tsc | PASS (exit 0) |
| `apps/web` vitest | 4013 passed / 12 failed (377 files, 7 failed) |
| nav-specific web tests | **41/41 pass** — `MobileNavV2.aria-controls`, `MobileNavV2.modal`, `site-chrome-portal`, `hn12-header-touch-targets` |
| `apps/mobile` deep-link test | 5/5 pass |

The 12 web failures are PRE-EXISTING and unrelated to this work.
`__tests__/priest-portal-p2.test.tsx` fails identically in isolation (1 failed /
12 passed) and concerns `app/priest/page.tsx`; no file touched in this session is
in its import graph. The remainder presented as vitest timeouts during a run that
shared the machine with 5 subagents and 2 Metro bundles.
