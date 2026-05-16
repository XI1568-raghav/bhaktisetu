# Roadmap — Darshya

> Slim. History + long-term in `docs/roadmap-archive.md`.
> Last updated: 2026-05-17.

## Open user-action gates (block live activation)

| Gate | What user must do | Blocker for |
|---|---|---|
| Razorpay live KYC | Submit business docs in Razorpay dashboard | Domestic real payments |
| Stripe NRI KYC | US/UK/CA/AU activation in Stripe | NRI real payments |
| Apple Developer Program | $99/yr signup | iOS build, App Store |
| Google Play Console | $25 one-time signup | Play Store APK |
| FCM server key | Firebase project + paste `FCM_SERVER_KEY` to Render | Native push live |
| Sentry DSN | Paste `NEXT_PUBLIC_SENTRY_DSN` to CF Pages + `SENTRY_DSN` to Render. `docs/cf-pages-env-wiring-2026-05-13.md` | Error capture in prod |
| WhatsApp Meta Cloud API | Business verification | Outbound WA blasts |
| PostHog project key | Paste `NEXT_PUBLIC_POSTHOG_KEY` to CF Pages. Same runbook as Sentry | Funnel dashboards |
| Affiliate programs | Sign up Amazon/Flipkart/MMT (yatra) | Commission revenue |
| Supabase password rotation | Reset + update Render `DATABASE_URL`. `docs/security-rotation-2026-05-13.md` | Security hygiene |
| Unset `ALLOW_DEMO_TOKENS` | Render env → delete after investor demos. Same runbook | Prod auth hardening |
| Resend API key rotation | Old key leaked. Same runbook | Email security |
| Demo MP4 capture run | Install ffmpeg + Playwright Chromium; `bash scripts/build-demo-video.sh`. `docs/demo-video-recipe-2026-05-13.md` | Razorpay/Stripe/Meta KYC + investor outreach |

## Active multi-session plans

- **Mobile App Full Parity** — `docs/mobile-plan.md` (~25-35h across 4-6 sessions). Phase 1-5 substantially shipped (audited 2026-05-13).
- **Mobile parity audit** — `docs/mobile-parity-audit.md`.

## Strategy tripwires (summary)

Two breaches in same week → fold to NRI-only SKU. Thresholds + full table in `docs/roadmap-archive.md`.

- NRI Day-30 retention < 25% by week 8
- Blended NRI CAC > $40 by week 8
- NRI annual:per-puja ratio < 1:3 by week 12
- Sri Mandir launches USD premium tier (any time)

## Future direction

Q3 2026 candidates + 8 revenue lines + long-term bets → `docs/roadmap-archive.md`.

## How to update this file

When phases progress or priorities shift — add a row. Don't write roadmap thinking in chat. Reference deeper plans by file path; don't inline them.
