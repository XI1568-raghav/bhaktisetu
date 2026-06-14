# R-Q2-P-005 — iOS TestFlight Internal Beta Handoff

> **Status**: founder-action-required · **Created**: 2026-06-14 · **Source spec**: `docs/product/ios-testflight-internal-beta-spec.md`

## What ships in this PR

- `apps/mobile/eas.json` — added explicit `testflight` build profile (iOS-only, internal distribution, production env)
- `docs/product/R-Q2-P-005-handoff.md` — this handoff doc

## What CANNOT be automated (founder-only)

| Step | Owner | Cost | Time |
|---|---|---|---|
| Apple Developer Program enrollment | Founder | $99/yr | 24-48hr review |
| D-U-N-S Number (org enrollment) | Founder | Free | 7-14 days |
| App Store Connect app record creation | Founder | $0 | 15 min |
| TestFlight 50-tester email collection | Founder | $0 | ongoing |
| Sentry React Native DSN paste | Founder | $0 (free tier) | 5 min |

See pre-req block in `docs/product/ios-testflight-internal-beta-spec.md`.

## What an agent CAN do after founder unblocks

1. Wire `EXPO_PUBLIC_SENTRY_DSN` to `apps/mobile/app/_layout.tsx` Sentry init (R-Q1-IT-003 already shipped foundation)
2. Add `apps/mobile/scripts/eas-build-testflight.sh` wrapper
3. Generate tester onboarding email template (`docs/marketing/testflight-welcome-email.md`)
4. WhatsApp group invite link generator

## How to run testflight build (post-enrollment)

```bash
cd apps/mobile
eas login                          # founder Apple ID
eas build:configure                # one-time
eas build --profile testflight --platform ios
# Output: .ipa uploaded to App Store Connect automatically
# Founder: log in to App Store Connect → TestFlight → add 50 internal testers
```

## KPI tracker

- `ios_testflight_users` (manual, target 50) — populated via `docs/roadmap/_manual-kpis.yml` once first build distributed.

## Closes

Engineering deliverable for R-Q2-P-005 within agent scope. Founder action remaining: Apple Dev enrollment + Sentry DSN + tester emails.
