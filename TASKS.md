# Tasks — Darshya

> Live task ledger. Update when claiming, completing, or blocking tasks.
> Survives /compact and /clear.
> Last updated: 2026-05-13.

## HANDOFF (2026-05-13, post mobile-parity audit + UX polish)

**Just finished** — mobile parity audit + Phase 5 polish:
- Audit found Mobile Phase 1-5 substantially shipped (auth context, role groups, all devotee tabs wired to API, all role portals wired except shared lib screens which use lib/inbox + lib/subscription-screen). Memory `project_darshya.md` was 9 days stale; reality far ahead.
- API tests: 401/401 green (memory said 312/501 — outdated).
- Pull-to-refresh added to 4 screens that used raw ScrollView with React Query: `horoscope.tsx`, `upgrade.tsx`, `yatra-detail.tsx`, `darshan-player.tsx`. Form-only screens (`weddings`, `weddings-muhurat`, `kundli`) skipped — mutation-only, nothing to refetch.

**Current task** — none claimed. Ledger clean.

**Next 2-3 steps** (in priority order):
1. **Refresh stale memory `project_darshya.md`** — current state diverges from 9-day-old snapshot. Update with E5 done, 401/401 tests, mobile parity status.
2. **E2 — wire FCM server key** if user pastes `FCM_SERVER_KEY` to Render. Env-or-noop, native push activates automatically.
3. **U-action push** — nudge user to actually run the 3 runbooks (security rotation, CF Pages env paste, demo-video bash). Code is shipped; activation gated only on user dashboard clicks.

**Tripwire watch** — once PostHog wired (depends on user action #3), start measuring NRI Day-30 retention, blended CAC, NRI annual:per-puja ratio against `ROADMAP.md` thresholds. Two breaches in same week → pivot to NRI-only SKU.

## In progress

_(none claimed)_

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| ~~E1~~ | ~~Verify Cloudflare Pages redeploy after `2fe686b` succeeds~~ | ✅ 2026-05-13 — all 4 routes 200, no prerender bail, API JSON live. |
| E2 | Wire FCM server key when user provides | Paste `FCM_SERVER_KEY` to Render env. Native push will go live automatically (env-or-noop). |
| ~~E3~~ | ~~Wire Sentry DSN to Cloudflare Pages env~~ | ✅ 2026-05-13 runbook shipped — `docs/cf-pages-env-wiring-2026-05-13.md`. User-action gate. |
| ~~E4~~ | ~~Wire PostHog key to Cloudflare Pages env~~ | ✅ 2026-05-13 same runbook. User-action gate. |
| ~~E5~~ | ~~Mobile Phase 1 — foundation + auth~~ | ✅ Auth context, role groups, all 5 portal tab layouts shipped. Devotee tabs wired to real API. Mock fallbacks for offline. |
| ~~E6~~ | ~~Mobile Phase 5 — pull-to-refresh polish~~ | ✅ 2026-05-13 — horoscope/upgrade/yatra-detail/darshan-player. Other screens already use PortalScreen wrapper (built-in refresh). |
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
| 2026-05-13 | Mobile pull-to-refresh on 4 raw-ScrollView devotee screens (E6) | (this commit) |
| 2026-05-13 | Mobile parity audit — confirmed Phase 1-5 substantially shipped (E5) | n/a |
| 2026-05-13 | Demo-video Playwright spec + ffmpeg stitch script + recipe doc (U10) | `4c48e9a` |
| 2026-05-13 | NRI Premium landing page + nav link (P3 / AR) | `e881543` |
| 2026-05-13 | Sentry + PostHog Cloudflare Pages env wiring runbook (E3+E4) | `e881543` |
| 2026-05-13 | Security credential rotation runbook (Resend + Supabase + ALLOW_DEMO_TOKENS) | `e881543` |
| 2026-05-13 | Persistent project memory layer (PROJECT_CONTEXT, ROADMAP, TASKS) wired into CLAUDE.md via @-imports | `e4aabda` |
| 2026-05-13 | Wrap `useSearchParams` consumers in Suspense (Cloudflare prerender fix) | `2fe686b` |
| 2026-05-12 | AuthGuard wraps + URL filter persistence + Razorpay store-checkout | `aa0c027` |
| 2026-05 | API P0/P1 sweep — Zod boundaries, role guards, decimal money, dashboards | `4244ced` |
| 2026-05 | Hard-fail payment demo proxy in production (P0 #7) | `bef8b42` |

## Conventions for this file

- Add a row under **Pending** when a task is identified, not when work starts.
- Move to **In progress** with date + agent name when claiming.
- Move to **Recently completed** with commit SHA when done. Keep last 10 only — older history lives in `git log`.
- Mark blockers with `BLOCKED on X`. Don't silently leave half-done work without status.
