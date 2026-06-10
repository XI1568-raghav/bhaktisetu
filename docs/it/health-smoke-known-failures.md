# Health-Smoke Known Failures — Root Cause Analysis

> Owner: IT lane. Status: documented. Fix recommendation = new roadmap item (see bottom).

## TL;DR

Health-smoke agent (`scripts/agents/health-smoke.mjs` → `apps/api/scripts/smoke-all-roles.mjs`) reports ~9 `/api/v1/auth/login` failures per run. **All 9 are EXPECTED** — they hit the prod demo-credential gate added in commit `fc52ea5` (Phase 4 P0 #1 fix, 2026-06-02). Not a real outage. Noisy though — masks actual auth regressions.

## Mechanism

`apps/api/scripts/smoke-all-roles.mjs:9-16` hardcodes 8 demo accounts:

```
devotee@demo.com / demo123     → role devotee, dashboard /dashboard
pandit@demo.com  / demo123     → role priest,  dashboard /priest
store@demo.com   / demo123     → role store,   dashboard /store-admin
astro@demo.com   / demo123     → role astrologer, dashboard /astrologer-portal
wellness@demo.com / demo123    → role wellness, dashboard /wellness-portal
gaushala@demo.com / demo123    → role gaushala, dashboard /gaushala-portal
temple@demo.com  / demo123     → role temple,  dashboard /temple-portal
admin@demo.com   / demo123     → role admin,   dashboard /admin
```

Plus one re-login of `admin@demo.com` for an admin-scoped endpoint check (line 161).

Each calls `POST /api/v1/auth/login` (line 125). In prod, `apps/api/src/routes/auth.ts` /login branch wraps the `DEMO_ACCOUNTS` lookup in:

```ts
if (process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_TOKENS === 'true') {
  // demo creds accepted
}
// otherwise falls through to real Supabase auth, which has no row for *@demo.com
```

Prod's `NODE_ENV=production` and `ALLOW_DEMO_TOKENS` is NOT set → every demo login 401s. Smoke agent flags 9 LOGIN failures every 6h. Real authentication path for real users still works.

This gate was the P0 fix from the 2026-06-02 audit — without it, anyone could log into prod as `admin@demo.com / demo123` and get a real ADMIN session. Audit + fix confirmed live via `curl -X POST .../auth/login -d '{"email":"admin@demo.com","password":"demo123"}'` → 401.

## Why this matters anyway

Health-smoke reports 9/N failures on every run. Noise floor masks a real auth-regression signal — if Supabase goes down and real logins start failing too, the count goes from 9 → 12 (just 3 extra). Easy to miss in a glance.

## Options to fix

### Option A — seed prod-shadow users (REJECTED)

Insert 8 real `*@demo.com` rows in prod Supabase with real password hashes. Smoke logs in as real users.

- **Pro**: zero false positives, full coverage of real auth path
- **Con**: 8 known-credential accounts in prod = security debt. Even with role=DEVOTEE only, gives crawler attack surface. Founder workflow includes lead-leak risk if `devotee@demo.com` floods inbox.
- **Verdict**: NO.

### Option B — env-driven smoke creds (RECOMMENDED)

Add `SMOKE_TEST_EMAIL_DEVOTEE`, `SMOKE_TEST_PASSWORD_DEVOTEE`, etc to GH secrets + Render env (or single `SMOKE_TEST_ACCOUNTS_JSON` blob). Smoke reads env, falls back to demo creds in CI/local. Founder creates 8 real Supabase users (one per role) with strong random passwords, paste into secrets.

- **Pro**: zero noise, real auth coverage, secrets rotated like any other
- **Con**: founder action (1hr — create 8 users + paste 16 secrets); 8 always-active accounts in prod but with random passwords, no special role privileges beyond their lane
- **Verdict**: yes, but defer to dedicated roadmap item (see below).

### Option C — skip login coverage in prod, run smoke against staging only (PARTIAL)

Smoke agent runs in CI against staging where `ALLOW_DEMO_TOKENS=true`. Prod smoke skips LOGIN block, only hits public endpoints.

- **Pro**: zero secrets, zero false positives
- **Con**: loses real-auth signal entirely in prod. If Supabase silently fails in prod and not staging, we miss it.
- **Verdict**: half-measure. Use as interim.

### Option D — accept the noise, document threshold (CHEAP INTERIM)

Smoke agent emits `expectedAuthFailures: 9` in its report. Health-summary alert only fires when `actual > expected`. No code change in smoke, only in the alert logic.

- **Pro**: zero new secrets, zero new users, ~30min effort
- **Con**: still doesn't actually verify auth in prod
- **Verdict**: ship today as bridge until Option B lands.

## Recommendation

Ship **Option D** today (already documented here — no further code needed; alert-side filter is a follow-up). File **Option B** as new roadmap item `R-Q1-IT-005` (suggested ID, founder may renumber).

Suggested Option B item draft:

```yaml
id: R-Q1-IT-005
title: "Smoke test prod-shadow users via env-driven creds"
quarter: Q1
sector: it
priority: P1
owner: founder
effort_hours: 2
depends_on: []
success_criteria:
  - 8 real Supabase users created (one per role), random 32-char passwords
  - SMOKE_TEST_ACCOUNTS_JSON env added to Render + GH secrets (single JSON blob)
  - apps/api/scripts/smoke-all-roles.mjs reads from env, falls back to demo creds when env unset
  - First post-deploy smoke run shows 0/9 LOGIN failures (current 9/9 baseline)
  - Health-summary alert threshold dropped to 0
kpi:
  metric: smoke_login_failures_per_run
  target: 0
  source: docs/agent-reports/{date}-health-smoke.md
```

## Related

- Audit fix that introduced this gate: HANDOFF 2026-06-02 #3 → commit `fc52ea5` (Phase 4 P0 #1)
- Smoke source: `apps/api/scripts/smoke-all-roles.mjs:9-16` + `:125`
- Auth gate: `apps/api/src/routes/auth.ts` /login branch w/ `NODE_ENV !== 'production' || ALLOW_DEMO_TOKENS === 'true'`
- This RCA closes the side-fix portion of Q-C20260610T1617-IT-002.
