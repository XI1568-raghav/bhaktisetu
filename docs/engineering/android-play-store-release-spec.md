# Android Play Store Production Release — Public Listing + 1K Install Target

> **Roadmap item**: R-Q3-E-003 (P0) · **Authored**: 2026-06-13

## Goal

Q3 ship Bhaktisetu Android app to Google Play production. 1K install target month-1.

## Pre-req

- Google Play Developer account ($25 one-time, U4 unblock)
- Apple version live (R-Q3-E-002 reference)
- Expo EAS build pipeline (per R-Q2-E-004 mobile parity)

## Build pipeline

```bash
# Expo EAS build for Android
eas build --profile production --platform android

# Output: .aab Android App Bundle
# Upload to Play Console via Play Store
```

## Play Store metadata

- **Name**: Bhaktisetu — Hindu Devotional Super-App
- **Short description**: Live darshan, verified pandit puja booking, NRI dual-currency (80 chars)
- **Full description**: 4000 chars w/ feature list + 80G clarification + pandit-verification statement
- **Category**: Lifestyle (primary), Religion (secondary)
- **Content rating**: 4+ via questionnaire
- **Pricing**: Free
- **Graphics assets**: 1024x500 banner + 8 screenshots + 1 promo video

## Play Store optimization

- ASO keywords: puja, darshan, hindu, vedic, temple, tirupati, kashi, NRI india, mantra, aarti
- Localized listing: Hindi + Tamil + Telugu + Bengali + Marathi (5 langs)
- Reviews: incentivize early ratings (in-app prompt after 3rd successful booking)

## Differentiated vs iOS

- Wider device support (low-end Android relevant for Tier-2/3 India users)
- Lower-spec phone optimization (image compression, offline cache)
- Hindi-default option (vs English-default iOS)
- WhatsApp deep-link tighter integration (Android native)

## Engineering tickets

- R-Q3-E-003a: Google Play Developer enrollment
- R-Q3-E-003b: EAS Android build pipeline
- R-Q3-E-003c: Play Store assets + metadata
- R-Q3-E-003d: 5-lang localization
- R-Q3-E-003e: Review prompt UX

## Q3 success metric

- Play Store live
- 1000+ installs month-1
- 4.0+ star rating
- <0.5% crash rate (Android more diverse hardware)

## Closes

R-Q3-E-003 — spec shipped.
