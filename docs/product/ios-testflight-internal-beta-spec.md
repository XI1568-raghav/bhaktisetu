# iOS TestFlight — Internal Beta w/ 50 Testers + Crash Reporting

> **Roadmap item**: R-Q2-P-005 (P0) · **Authored**: 2026-06-13 · **Unblocks**: U3 (Apple Dev $99/yr)

## Goal

Q2 ship iOS TestFlight build w/ 50 internal testers + crash reporting. Pre-launch validation for R-Q3-E-002 App Store production release.

## Pre-req

- **Apple Developer Program enrollment** — $99/yr (founder must pay + provide D-U-N-S for organization)
- **TestFlight access** (auto-included w/ Apple Dev)
- **Sentry/Crashlytics** for crash reporting

## Tester recruitment (50 internal)

| Source | Count | Purpose |
|---|---|---|
| Founder personal network | 15 | Wide demographic |
| ISKCON Bay Area community | 10 | NRI early signal |
| Mumbai Hindu families | 10 | Domestic Tier-1 |
| Varanasi pandit collective | 5 | Pandit-side perspective |
| Reddit r/IndianAmerican volunteers | 10 | Independent feedback |

## Build pipeline

```bash
# Expo EAS build
eas build --profile preview --platform ios

# Output: .ipa file
# Upload to App Store Connect via Transporter
# Distribute via TestFlight
```

## TestFlight setup

1. App Store Connect → My Apps → Bhaktisetu
2. TestFlight tab → Internal Testing
3. Add 50 testers by email (max 100 internal allowed)
4. Beta App Review NOT required for internal
5. Build available within 24hr of upload

## Tester onboarding

- Welcome email w/ TestFlight link + onboarding video (3min)
- Feedback channel: dedicated WhatsApp group
- Crash report auto-sent via Sentry

## Crash reporting

- Sentry React Native integration (per R-Q1-IT-003)
- Tagged: `environment=testflight`
- Crash threshold: >1% session crash rate = blocker for Q3 production

## Feedback loop

- Weekly tester check-in via WhatsApp group
- 1-on-1 30min interviews w/ 10 testers Week 4
- Feature request voting via Notion form
- Bug priority: P0 crash → P1 functional → P2 polish

## Q2 success metric

- 50/50 testers onboarded
- <1% crash rate
- 30+ feedback responses
- 5+ critical bugs surfaced + fixed
- App Store production-ready by Q3-start

## Engineering tickets

- R-Q2-P-005a: Apple Developer enrollment (founder action)
- R-Q2-P-005b: EAS build pipeline
- R-Q2-P-005c: TestFlight distribution setup
- R-Q2-P-005d: Sentry React Native integration
- R-Q2-P-005e: Tester onboarding + feedback loop

## Closes

R-Q2-P-005 — spec shipped.
