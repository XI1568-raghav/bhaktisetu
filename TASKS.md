# Tasks — Darshya

> Live task ledger. Completed history in `docs/tasks-history.md`.
> Last updated: 2026-05-17.

## HANDOFF (2026-05-17, post signup-role wire + memory trim)

**Just finished**:
- Signup persists primary role + stub provider profile e2e (commit `a103379`). Admin user list + approvals queue populated for all 6 provider roles.
- Memory trim: PROJECT_CONTEXT/ROADMAP/TASKS slimmed to cut per-turn token load. Detail moved to `docs/project-context-detail.md`, `docs/roadmap-archive.md`, `docs/tasks-history.md`.

**Current task** — none claimed.

**Next 2-3 steps**:
1. User runs the 3 runbooks (security rotation, CF Pages env paste, demo-video bash). Code shipped; activation gated on user dashboard clicks.
2. **E2 — wire FCM server key** if user pastes `FCM_SERVER_KEY` to Render. Native push activates automatically.
3. **Tripwire watch** — once PostHog wired, measure NRI Day-30 retention, blended CAC, NRI annual:per-puja ratio against `ROADMAP.md` thresholds.

## In progress

_(none claimed)_

## Pending — engineering

| # | Task | Notes |
|---|---|---|
| E2 | Wire FCM server key when user provides | Paste `FCM_SERVER_KEY` to Render. Native push goes live automatically (env-or-noop). |

## Pending — user-action gates (BLOCKED on user)

| # | Task | Why blocked |
|---|---|---|
| U1 | Razorpay live KYC | User submits business docs |
| U2 | Stripe NRI KYC | US/UK/CA/AU activation |
| U3 | Apple Developer Program ($99/yr) | User $$ |
| U4 | Google Play Console ($25) | User $$ |
| U5 | WhatsApp Meta Cloud API verification | Meta business profile |
| U6 | Affiliate program signups (Amazon/Flipkart/MMT) | User application |
| U7 | Rotate Supabase DB password + update Render `DATABASE_URL` | Security hygiene |
| U8 | Unset `ALLOW_DEMO_TOKENS` on Render after investor demos | Prod hardening |
| U9 | `REDIS_URL` paste from Upstash free tier | Cache activation (optional) |

## Recently completed (top 3 — full history in `docs/tasks-history.md`)

| Date | Task | Commit |
|---|---|---|
| 2026-05-17 | Persist primary role + stub provider profile on signup (admin approvals e2e) | `a103379` |
| 2026-05-17 | Signup web↔API role enum mapping (priest↔pandit) | `8b87dfb` |
| 2026-05-17 | AiChat first-message reply bug | `7bf0bda` |

## Conventions

- Add row under **Pending** when task identified, not when work starts.
- Move to **In progress** with date + agent name on claim.
- Move to **Recently completed** with commit SHA on done. Keep top 3 only; older history → `docs/tasks-history.md`.
- Mark blockers `BLOCKED on X`. Don't silently leave half-done work without status.
