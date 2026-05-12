# Tasks — Darshya

> Live task ledger. Update when claiming, completing, or blocking tasks.
> Survives /compact and /clear.
> Last updated: 2026-05-13.

## In progress

_(none claimed)_

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E1 | Verify Cloudflare Pages redeploy after `2fe686b` succeeds | Push happened 2026-05-13. Check `/temples`, `/astrology`, `/priest/bookings` render in prod. |
| E2 | Wire FCM server key when user provides | Paste `FCM_SERVER_KEY` to Render env. Native push will go live automatically (env-or-noop). |
| E3 | Wire Sentry DSN to Cloudflare Pages env | Capture errors in prod web. |
| E4 | Wire PostHog key to Cloudflare Pages env | Funnel dashboards. |
| E5 | Mobile Phase 1 — foundation + auth | See `docs/mobile-plan.md`. ~4-5h. |

## Pending — user-action gates (BLOCKED on user)

| # | Task | Why blocked |
|---|---|---|
| U1 | Razorpay live KYC | User must submit business docs in Razorpay dashboard |
| U2 | Stripe NRI KYC | US/UK/CA/AU activation in Stripe |
| U3 | Apple Developer Program signup ($99/yr) | Blocked on user $$ |
| U4 | Google Play Console signup ($25) | Blocked on user $$ |
| U5 | WhatsApp Meta Cloud API business verification | Meta business profile |
| U6 | Affiliate program signups (Amazon/Flipkart/MMT) | User application |
| U7 | Rotate Supabase DB password + update Render `DATABASE_URL` | Security hygiene |
| U8 | Unset `ALLOW_DEMO_TOKENS` on Render after investor demos | Prod hardening |
| U9 | `REDIS_URL` paste from Upstash free tier | Cache activation (optional) |
| U10 | Demo video MP4 stitching | Needs ffmpeg local install |

## Recently completed

| Date | Task | Commit |
|---|---|---|
| 2026-05-13 | Persistent project memory layer (PROJECT_CONTEXT, ROADMAP, TASKS) wired into CLAUDE.md via @-imports | `e4aabda` |
| 2026-05-13 | Wrap `useSearchParams` consumers in Suspense (Cloudflare prerender fix) | `2fe686b` |
| 2026-05-12 | AuthGuard wraps + URL filter persistence + Razorpay store-checkout | `aa0c027` |
| 2026-05 | API P0/P1 sweep — Zod boundaries, role guards, decimal money, dashboards | `4244ced` |
| 2026-05 | Hard-fail payment demo proxy in production (P0 #7) | `bef8b42` |
| 2026-05 | `User.blocked` field + middleware gate (P0 #6) | `ea6b3c2` |
| 2026-05 | Regression-lock priest payout video-proof gate (P0 #5) | `2a9e83c` |
| 2026-05 | Booking past-date guard + priest double-booking guard | `e67efd4` |
| 2026-04-29 | Launch readiness pass — security, tests, mobile APK, SEO | `84a179c` (squash of 20 commits) |

## Conventions for this file

- Add a row under **Pending** when a task is identified, not when work starts.
- Move to **In progress** with date + agent name when claiming.
- Move to **Recently completed** with commit SHA when done. Keep last 10 only — older history lives in `git log`.
- Mark blockers with `BLOCKED on X`. Don't silently leave half-done work without status.
