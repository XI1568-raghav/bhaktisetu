# User-action activation gates — Darshya

> Single source of truth. ROADMAP.md + TASKS.md reference this file.
> Last updated: 2026-05-17.

These gates block live activation. Each requires user action (KYC, paid signup, env paste) — agents can't unblock. Code is shipped + env-or-noop on every integration.

| # | Gate | What user must do | Blocker for | Runbook |
|---|---|---|---|---|
| U1 | Razorpay live KYC | Submit business docs in Razorpay dashboard | Domestic real payments | — |
| U2 | Stripe NRI KYC | US/UK/CA/AU activation in Stripe | NRI real payments | — |
| U3 | Apple Developer Program ($99/yr) | Pay + enroll | iOS build, App Store | — |
| U4 | Google Play Console ($25) | Pay + signup | Play Store APK | — |
| U5 | FCM server key | Firebase project + paste `FCM_SERVER_KEY` to Render | Native push live | `docs/env-vars.md` |
| U6 | Sentry DSN | Paste `NEXT_PUBLIC_SENTRY_DSN` to CF Pages + `SENTRY_DSN` to Render | Error capture in prod | `docs/cf-pages-env-wiring-2026-05-13.md` |
| U7 | WhatsApp Meta Cloud API | Business verification | Outbound WA blasts | — |
| U8 | PostHog project key | Paste `NEXT_PUBLIC_POSTHOG_KEY` to CF Pages | Funnel dashboards | Same runbook as U6 |
| U9 | Affiliate programs | Sign up Amazon/Flipkart/MMT (yatra) | Commission revenue | — |
| U10 | Supabase password rotation | Reset + update Render `DATABASE_URL` | Security hygiene | `docs/security-rotation-2026-05-13.md` |
| U11 | Unset `ALLOW_DEMO_TOKENS` | Render env → delete after investor demos | Prod auth hardening | Same as U10 |
| U12 | Rotate Resend API key | Old key leaked — generate new, paste to Render | Email security | Same as U10 |
| U13 | Demo MP4 capture run | Install ffmpeg + Playwright Chromium; `bash scripts/build-demo-video.sh` | Razorpay/Stripe/Meta KYC + investor outreach | `docs/demo-video-recipe-2026-05-13.md` |
| U14 | `REDIS_URL` paste from Upstash free tier | Sign up + paste | Cache activation (optional) | — |
| U15 | `ALLOW_DEMO_PAYMENTS=true` until U1 | Render env — set to keep API alive | API boot in prod | — |
