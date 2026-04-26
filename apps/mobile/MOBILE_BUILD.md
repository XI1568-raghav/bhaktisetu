# Darshya Mobile — Build & Release Guide

EAS Build config for generating testable APK (Android) and IPA (iOS) artifacts.

## Prerequisites

- Expo account (free tier works for dev/preview builds)
- Apple Developer account ($99/yr) required only for TestFlight / App Store
- Google Play Developer account ($25 one-time) required only for Play Store submission

> **Warning — missing assets:** `apps/mobile/assets/` is currently empty. Production builds will use Expo's default icon/splash. Before going live, add:
> - `assets/icon.png` (1024x1024 PNG)
> - `assets/adaptive-icon.png` (1024x1024 PNG, foreground for Android)
> - `assets/splash.png` (1242x2436 PNG)
> - `assets/favicon.png` (48x48 PNG for web)
> Then wire them in `app.json` under `expo.icon`, `expo.splash.image`, `expo.android.adaptiveIcon.foregroundImage`, `expo.web.favicon`.

## One-time setup

```bash
cd apps/mobile
npx expo login              # Login to Expo account (free tier available)
npx eas init                # Link project to Expo (creates projectId, writes it to app.json)
npx eas build:configure     # Verifies eas.json
```

After `eas init` runs, `app.json` → `expo.extra.eas.projectId` will be populated. Commit that change.

## Build APK for testing (installs on any Android device)

```bash
pnpm run build:android:preview
# Cloud build takes 10-15 min. EAS gives a download URL.
# Install on device: adb install poojly-preview.apk
# Or scan QR on Expo Orbit
```

The `preview` profile builds a signed APK (not an AAB) with `EXPO_PUBLIC_API_URL=https://bhaktisetu.onrender.com`. Share the download URL with testers — no Play Store needed.

## Build iOS (requires Apple Developer account $99/yr for TestFlight)

```bash
pnpm run build:ios:prod
```

For simulator testing (no Apple account needed):

```bash
pnpm run build:ios:dev
```

The `development` iOS profile builds for the iOS simulator. Drag the `.app` bundle onto an open Simulator window to install.

## Development client builds (for `expo-dev-client` workflows)

```bash
pnpm run build:android:dev   # APK with dev client
pnpm run build:ios:dev       # iOS simulator build with dev client
```

## Local APK build (no EAS credits used, needs Android SDK)

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleDebug
# APK at: android/app/build/outputs/apk/debug/app-debug.apk
```

Requires Android Studio / SDK installed locally. `prebuild` generates the native `android/` directory — do not commit it.

## Submit to stores

```bash
pnpm run submit:android      # Google Play (requires service-account.json)
pnpm run submit:ios          # App Store Connect (needs ascAppId in eas.json)
```

Before running `submit:ios`, fill `submit.production.ios.ascAppId` in `eas.json` with the numeric App Store Connect app ID.

## Environment variables

Copy `.env.example` to `.env.local` for local dev:

```bash
cp .env.example .env.local
```

Only variables prefixed with `EXPO_PUBLIC_` are embedded in the client bundle. Build profiles in `eas.json` override these for preview/production (pointing at `https://bhaktisetu.onrender.com`).

## Build profiles summary

| Profile       | Android     | iOS          | API URL                    |
|---------------|-------------|--------------|----------------------------|
| `development` | APK (debug) | Simulator    | from local `.env`          |
| `preview`     | APK         | Device IPA   | `https://bhaktisetu.onrender.com`   |
| `production`  | AAB         | Device IPA   | `https://bhaktisetu.onrender.com`   |
