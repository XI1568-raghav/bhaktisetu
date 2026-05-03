# E2E Tests (Playwright)

TD2 critical-path Playwright suite living in `tests/e2e/`. Pre-existing
exploratory specs under `e2e/` are still picked up by the same config.

## What's covered

| Spec | Flow |
|---|---|
| `booking-flow.spec.ts` | Pujas list -> detail -> book -> demo Razorpay -> confirmation |
| `donation-flow.spec.ts` | Gaushala list -> donate ~Rs.501 -> 80G receipt path |
| `astro-chat.spec.ts` | Ask Pandit -> 5 free messages -> paywall on 6th |
| `signup-login.spec.ts` | Signup, demo login, role redirect, logout |
| `navigation.spec.ts` | Home -> temples -> temple detail -> darshan -> back home |

Both Desktop Chrome and iPhone 13 (mobile-safari) projects run by default.

## Run locally

```bash
# Install browsers (first time only)
pnpm exec playwright install --with-deps chromium webkit

# Default: hits https://darshya.online
pnpm exec playwright test tests/e2e

# Hit a local dev server
PLAYWRIGHT_BASE_URL=http://localhost:3000 pnpm exec playwright test tests/e2e

# One spec, headed, with the Inspector
pnpm exec playwright test tests/e2e/booking-flow.spec.ts --headed --debug

# Only chromium project
pnpm exec playwright test tests/e2e --project=chromium

# View the last HTML report
pnpm exec playwright show-report
```

Demo credentials default to `devotee@demo.com` / `demo123`. Override with
`E2E_DEMO_EMAIL` / `E2E_DEMO_PASSWORD`. Most flows use the in-app
"Demo Sign In" shortcut on `/auth/login` so no real OTP is sent.

## CI behaviour

`.github/workflows/e2e.yml` runs on PR + push to `main` and
`rebrand/darshya`, defaults to `https://darshya.online`, and uploads the
HTML report (and traces on failure) as artifacts. The job is configured
with `continue-on-error: true` plus `retries: 2` so an intermittent
production outage does not red-flag the pipeline. Investigate the
uploaded report before assuming a flake.

## Debugging failures

1. Download the `playwright-report-*` artifact from the failed run.
2. `pnpm exec playwright show-report path/to/extracted/report` to open
   the trace viewer with screenshots, console logs, and network calls.
3. For local repro, set `PWDEBUG=1` and rerun the failing spec.
4. If a flow regresses because of a UI/copy change, prefer updating the
   selector to a `data-testid` rather than chasing brittle text.

## Adding new specs

- Drop a `*.spec.ts` file into `tests/e2e/`.
- Follow the existing pattern: `test.skip(!res || res.status() >= 500, 'Site unavailable')`
  at the top of every test so the suite degrades gracefully when the
  target environment is down.
- Keep each file under ~200 lines. Split flows that grow beyond that.
- Prefer `data-testid` or stable ARIA labels over copy-based locators.
- Avoid real third-party charges — use demo Razorpay paths or stub the
  network at the `/api/v1/payments/*` boundary with `page.route(...)`.
