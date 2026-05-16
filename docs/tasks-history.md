# Tasks — History (load on demand)

> Completed task spillover from `TASKS.md`. Keep last ~30 here; older history lives in `git log`.

| Date | Task | Commit |
|---|---|---|
| 2026-05-17 | Persist primary role + stub provider profile on signup (admin approvals queue wired e2e) | `a103379` |
| 2026-05-17 | Signup web↔API role enum mapping (priest↔pandit) | `8b87dfb` |
| 2026-05-17 | AiChat first-message reply bug | `7bf0bda` |
| 2026-05-13 | Mobile pull-to-refresh on 4 raw-ScrollView devotee screens (E6) | `d5bc036` |
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

## HANDOFF history

### 2026-05-13 — post mobile-parity audit + UX polish
- Audit found Mobile Phase 1-5 substantially shipped (auth context, role groups, all devotee tabs wired). Memory was 9 days stale.
- API tests: 401/401 green (memory said 312/501 — outdated).
- Pull-to-refresh added to 4 raw-ScrollView screens.
