# Tasks — Darshya

> Live task ledger. Update when claiming, completing, or blocking tasks.
> Survives /compact and /clear.
> Last updated: 2026-05-13.

## In progress

_(none claimed)_

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| ~~E1~~ | ~~Verify Cloudflare Pages redeploy after `2fe686b` succeeds~~ | ✅ 2026-05-13 — all 4 routes 200, no prerender bail, API JSON live. |
| E2 | Wire FCM server key when user provides | Paste `FCM_SERVER_KEY` to Render env. Native push will go live automatically (env-or-noop). |
| ~~E3~~ | ~~Wire Sentry DSN to Cloudflare Pages env~~ | ✅ 2026-05-13 runbook shipped — `docs/cf-pages-env-wiring-2026-05-13.md`. User-action gate. |
| ~~E4~~ | ~~Wire PostHog key to Cloudflare Pages env~~ | ✅ 2026-05-13 same runbook. User-action gate. |
| E5 | Mobile Phase 1 — foundation + auth | See `docs/mobile-plan.md`. ~4-5h. |
| AR | NRI premium tier landing | ✅ 2026-05-13 — `/nri` page + nav link. Commit `e881543`. |

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
| ~~U10~~ | ~~Demo video MP4 stitching~~ | ✅ 2026-05-13 — Playwright spec + bash stitch script + recipe doc shipped. User runs `bash scripts/build-demo-video.sh` after installing ffmpeg. |

## Recently completed

| Date | Task | Commit |
|---|---|---|
| 2026-05-13 | Demo-video Playwright spec + ffmpeg stitch script + recipe doc (U10) | `4c48e9a` |
| 2026-05-13 | NRI Premium landing page + nav link (P3 / AR) | `e881543` |
| 2026-05-13 | Sentry + PostHog Cloudflare Pages env wiring runbook (E3+E4) | `e881543` |
| 2026-05-13 | Security credential rotation runbook (Resend + Supabase + ALLOW_DEMO_TOKENS) | `e881543` |
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
