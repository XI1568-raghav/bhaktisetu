# Mobile EAS Setup Playbook

End-to-end checklist for taking Darshya mobile from Expo Go demo to installable APK / TestFlight build. Run this only after the $124/yr developer accounts are paid for.

## Status (2026-05-02)

- `apps/mobile/app.json` is fully polished: bundle id `com.darshya.app`, permissions, push-notification config, runtime version policy
- `apps/mobile/eas.json` profiles ready: `development`, `preview`, `production`, plus `submit` skeleton
- `extra.eas.projectId` is **already populated** (`d928b3ea-9a55-42cf-87b3-911021f486bc`) — `eas init` is **not** required
- API URL points to `https://api.darshya.online` for `preview` and `production` profiles
- Pre-existing React 19 / `@types/react@19` JSX typing issue affects `pnpm turbo type-check --filter=@poojly/mobile` — does not block EAS cloud builds (Metro bundles JS, doesn't typecheck)

## Blockers requiring user action ($124/yr)

| Step | Cost | Where |
|------|------|-------|
| Apple Developer Program | $99/yr | https://developer.apple.com/programs/enroll |
| Google Play Console | $25 one-time | https://play.google.com/console/signup |

Until these are paid, you can still produce **internal preview APKs** (no Play Store) and **iOS simulator builds** (no Apple account) via the `preview` and `development` profiles.

## Step-by-step

### Step 1 — Apple Developer Program
- Visit https://developer.apple.com/programs/enroll
- Pay $99 USD/yr (Indian cards work; ~₹8,300)
- Wait 24-48h for approval
- Note your **Team ID** (Membership tab)

### Step 2 — Google Play Console
- Visit https://play.google.com/console/signup
- Pay $25 one-time (~₹2,100)
- Approval typically <24h
- Create a service account in Google Cloud → IAM, grant Play Console "Release manager" role, download `service-account.json`, save to `apps/mobile/play-store-key.json` (gitignored)

### Step 3 — Login to EAS
```bash
cd apps/mobile
pnpm dlx eas-cli@latest login
# Username: darshya  (matches expo.owner in app.json)
```

### Step 4 — Verify project link (skip eas init)
The `projectId` is already set. Confirm:
```bash
pnpm dlx eas-cli@latest project:info
```
If it errors with "project not found", THEN run `pnpm dlx eas-cli@latest init` (interactive — accept the existing slug `darshya`).

### Step 5 — First preview build (no developer accounts needed)
```bash
pnpm run build:android:preview
```
- Cloud build: ~25 min on free tier
- Output: signed APK download URL
- Install: `adb install darshya-preview.apk` or share URL with testers

```bash
pnpm run build:ios:dev
```
- Builds for iOS Simulator (no Apple cert needed)
- Output: `.app` bundle — drag onto open Simulator window

### Step 6 — Production builds (after Step 1 + 2 approved)
```bash
pnpm run build:android:prod   # AAB for Play Store
pnpm run build:ios:prod       # IPA for App Store
```

EAS will prompt to generate iOS distribution certs and provisioning profiles — accept all defaults (managed credentials).

### Step 7 — Submit to stores
```bash
pnpm run submit:android       # uses play-store-key.json
pnpm run submit:ios           # prompts for App Store Connect API key
```

Before `submit:ios`, fill `eas.json` → `submit.production.ios`:
```json
{
  "appleId": "your@email.com",
  "ascAppId": "1234567890",
  "appleTeamId": "ABCDEF1234"
}
```

## Push notifications (FCM / APNs)

Darshya mobile shares the same Firebase project as Kirti Job (per memory), reusing the `darshya` Firebase project. Configuration order:

1. Firebase Console → Project Settings → General → Add Android app with package `com.darshya.app`
2. Download `google-services.json`, save to `apps/mobile/google-services.json` (gitignored)
3. Add to `app.json` under `expo.android.googleServicesFile`: `"./google-services.json"`
4. iOS APNs: Apple Developer → Certificates → Create APNs key, upload to Firebase Console
5. Re-run `pnpm run build:android:preview` to embed FCM credentials

This is deferred to Layer S — push notifications can be wired without FCM for now using Expo Push (which proxies to FCM/APNs).

## Verifying a build

After EAS build completes:
1. Download APK/IPA from the build URL
2. Install on real device
3. Open app — should land on Darshya splash → home
4. Verify API call works: `Network` tab in dev tools should show `https://api.darshya.online/api/v1/...`
5. Check Sentry receives a synthetic error (after `EXPO_PUBLIC_SENTRY_DSN` is set)

## Common issues

| Error | Fix |
|-------|-----|
| `Project not found` on `eas build` | Run `eas project:info` then `eas init` |
| `EAS_BUILD_PROFILE` undefined | Pass `--profile preview` explicitly |
| Android build fails on icon | Ensure `assets/adaptive-icon.png` is 1024x1024 PNG |
| iOS build fails on bundle id | Bundle id must be unique across App Store — `com.darshya.app` is reserved |
| `Owner mismatch` | `pnpm dlx eas-cli@latest whoami` must equal `expo.owner` in app.json |

## Cost summary

| Item | Cost | Frequency |
|------|------|-----------|
| Expo EAS Free tier | $0 | 30 builds/mo, indefinite |
| Apple Developer | $99 | Yearly |
| Google Play | $25 | One-time |
| **Total year 1** | **$124** | — |

## Next steps after first preview build

1. Distribute APK URL to 5-10 internal testers
2. Wire push notifications (Layer S)
3. Submit OTA update via `pnpm dlx eas-cli@latest update --branch preview` (no rebuild needed for JS-only changes)
4. Move to TestFlight (iOS) and Internal Testing (Play) once accounts approved
