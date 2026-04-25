# Darshya Mobile App — Distribution Guide

## Overview

The Darshya mobile app (Expo SDK 52, React Native 0.76) supports three distribution channels:

| Channel | Platform | Cost | Setup time |
|---------|----------|------|------------|
| EAS Build → APK | Android | Free (15 builds/month) | ~20 min |
| Expo Web Export | iOS + Android (browser) | Free | ~5 min |
| TestFlight | iOS (native) | $99/yr Apple Dev account | ~2 hours |

---

## Option 1 — Android APK via EAS Build (Recommended for Android demo)

This produces a downloadable `.apk` file anyone with an Android phone can install.

### Prerequisites
- An Expo account (free) at https://expo.dev
- Node.js 18+ and pnpm installed

### Step 1: Initialise EAS project (one-time)
```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```
`eas init` will auto-populate the `projectId` field in `app.json`. Commit this change.

### Step 2: Build the APK
```bash
npx eas-cli@latest build --profile preview --platform android
```
- Build runs in the cloud (no local Android SDK needed)
- Takes ~10–15 minutes
- When complete, the CLI prints a **download URL** for the `.apk`
- The URL is also visible in the EAS dashboard at https://expo.dev

### Step 3: Share with testers
Send the APK download link. Testers:
1. Open the link on their Android phone
2. Allow "Install from unknown sources" if prompted
3. Install and open Darshya

### Free tier limits
- 15 Android builds/month
- 15 iOS builds/month (simulator only on free tier)
- No expiry on builds once created

### Using the pre-configured npm scripts
```bash
# From the monorepo root:
pnpm --filter @poojly/mobile build:android:preview
```

---

## Option 2 — Expo Web Export (Free iOS + Android browser demo)

This builds the app as a Progressive Web App (PWA). iOS users can open it in Safari and add it to their home screen for a near-native feel.

### Build
```bash
cd apps/mobile
npx expo export --platform web
# Output goes to: apps/mobile/dist/
```

### Deploy to Vercel (free)
```bash
# Install Vercel CLI if needed:
npm i -g vercel

# Deploy from the dist folder:
cd dist
vercel --prod
```
Vercel gives you a URL like `https://poojly-demo.vercel.app`. Share this with anyone.

### Deploy to Netlify (alternative, also free)
1. Go to https://app.netlify.com/drop
2. Drag and drop the `apps/mobile/dist/` folder
3. Netlify instantly gives you a shareable URL

### iOS home screen install (tell your testers)
1. Open the Vercel/Netlify URL in Safari on iPhone
2. Tap the **Share** icon → **Add to Home Screen**
3. The app icon appears on the home screen and opens full-screen

---

## Option 3 — TestFlight (iOS native, requires Apple Developer account)

1. Enrol at https://developer.apple.com/programs/ ($99/year)
2. Run `npx eas-cli@latest build --profile production --platform ios`
3. Run `npx eas-cli@latest submit --platform ios`
4. Add testers in App Store Connect → TestFlight

---

## Quick Reference

```bash
# Android APK (EAS cloud build)
cd apps/mobile && npx eas-cli@latest build --profile preview --platform android

# Web export (PWA for iOS demo)
cd apps/mobile && npx expo export --platform web && cd dist && vercel --prod

# Local development (Expo Go app on phone)
pnpm --filter @poojly/mobile dev
# Scan QR code with Expo Go (iOS/Android)
```

---

## Expo Go (Instant dev testing — no build needed)

For quick testing during development:
1. Install **Expo Go** from the App Store or Play Store
2. Run `pnpm --filter @poojly/mobile dev` from the monorepo root
3. Scan the QR code printed in the terminal
4. The app loads instantly on your phone — live reloads on save

> Note: Expo Go works with Expo SDK 52 but some native modules may behave differently than in a standalone build.
