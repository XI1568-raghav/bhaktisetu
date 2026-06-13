# Testing + Quality Assurance Spec

> Comprehensive QA architecture for Bhaktisetu. Foundation for Series A reliability story + scaling without breaking.

## Why this matters

- 30+ critical user flows (booking + payment + live darshan + etc.)
- Solo founder cannot manually test every release
- Series A investors require automated test coverage story
- Customer trust = no breaking changes shipped to production

## Test stack

| Type | Tool | Coverage target |
|---|---|---|
| Unit tests | Vitest | 80%+ for business logic |
| Integration tests | Vitest + Supertest | 70%+ for API routes |
| E2E tests | Playwright | 100% of critical flows |
| Visual regression | Chromatic / Percy | Top 20 pages |
| Performance | Lighthouse CI | All pillar pages |
| Accessibility | axe-core | WCAG 2.2 AA |
| Security | Snyk + Bandit equivalents | Quarterly |
| Load testing | k6 | Pre-festival peak |

## Per-test category implementation

### Unit tests (apps/web + apps/api)

```typescript
// apps/api/src/services/__tests__/wallet.test.ts
import { describe, it, expect, vi } from 'vitest'
import { walletService } from '../wallet'

describe('Wallet Service', () => {
  it('credits wallet correctly', async () => {
    const result = await walletService.credit({
      userId: 'user_123', amountPaise: 10000, reason: 'test'
    })
    expect(result.newBalance).toBe(10000)
  })
  
  it('handles concurrent credit attempts (no double-credit)', async () => {
    const promises = Array(10).fill(null).map(() => 
      walletService.credit({ userId: 'user_123', amountPaise: 1000, reason: 'concurrent_test', idempotencyKey: 'same_key' })
    )
    await Promise.all(promises)
    const wallet = await getWallet('user_123')
    expect(wallet.balance).toBe(1000) // Only one credit due to idempotency
  })
})
```

### Integration tests (API endpoints)

```typescript
// apps/api/src/routes/__tests__/referrals.test.ts (per referral spec)
import { build } from '../testing/helpers'

describe('Referrals API', () => {
  it('GET /me returns code + zero counts for new user', async () => {
    const { app, token } = await buildWithAuth()
    const res = await app.inject({
      method: 'GET', url: '/api/v1/referrals/me',
      headers: { authorization: `Bearer ${token}` }
    })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toMatchObject({
      code: expect.stringMatching(/^[a-z0-9]{20,}$/),
      pendingCount: 0, claimedCount: 0, creditsEarnedInr: 0
    })
  })
  
  // 5 more tests per referral spec
})
```

### E2E tests (Playwright)

```typescript
// apps/web/e2e/booking-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Booking Flow E2E', () => {
  test('User can book Rudrabhishek puja successfully', async ({ page }) => {
    // 1. Login
    await page.goto('https://staging.darshya.online/auth/login')
    await page.fill('[name=email]', 'e2e-test@bhaktisetu.com')
    await page.fill('[name=password]', 'test_password')
    await page.click('button[type=submit]')
    
    // 2. Navigate to puja
    await page.goto('https://staging.darshya.online/pujas/rudrabhishek')
    
    // 3. Click book
    await page.click('button:has-text("Book Now")')
    
    // 4. Fill devotee info
    await page.fill('[name=devotee_name]', 'E2E Test')
    await page.fill('[name=phone]', '+91-9999999999')
    
    // 5. Select pandit
    await page.click('[data-pandit-id]:first-child')
    
    // 6. Confirm details
    await page.click('button:has-text("Proceed to Payment")')
    
    // 7. Skip actual payment (test mode)
    await expect(page).toHaveURL(/\/booking\/BS-/)
    await expect(page.locator('h1')).toContainText('Booking Confirmed')
  })
})
```

### Visual regression (Chromatic)

```typescript
// .storybook/main.ts
// Capture screenshots of top 20 pages
// CI uploads to Chromatic, alerts on unintended visual changes
```

### Performance (Lighthouse CI)

```yaml
# .github/workflows/lighthouse.yml
on:
  pull_request:
    paths: [apps/web/**]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - run: lhci autorun
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            https://staging.darshya.online/
            https://staging.darshya.online/pujas
            https://staging.darshya.online/today
          assert: |
            - categories.performance >= 90
            - categories.accessibility >= 95
            - categories.best-practices >= 95
            - categories.seo >= 95
```

### Accessibility (axe-core)

```typescript
// apps/web/e2e/a11y.spec.ts
import { test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('Home page passes WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze()
  
  expect(results.violations).toHaveLength(0)
})
```

### Security (Snyk + manual quarterly)

```bash
# Weekly automated
pnpm audit --audit-level=moderate
snyk test --severity-threshold=high

# Quarterly external pen test
# - Bhaktisetu retains ₹50K-100K Q3 tier-2 firm
# - Focused on authentication + payment + DPDP
```

### Load testing (k6) — pre-festival

```javascript
// load-test.k6.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up
    { duration: '30m', target: 1000 },  // Sustained 1000 concurrent
    { duration: '5m', target: 0 }       // Ramp down
  ]
}

export default function () {
  const r = http.get('https://staging.darshya.online/pujas/rudrabhishek')
  check(r, { 'status is 200': (r) => r.status === 200 })
  sleep(1)
}
```

## CI/CD integration

```yaml
# .github/workflows/test.yml
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test:unit
      - uses: codecov/codecov-action@v3
  
  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test:integration
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install
      - run: pnpm test:e2e
      - uses: microsoft/playwright-github-action@v1
  
  lighthouse-ci:
    runs-on: ubuntu-latest
    needs: e2e-tests
    steps:
      - uses: treosh/lighthouse-ci-action@v9
```

## Critical user flows (E2E test coverage required)

1. User signup + email verification
2. User login + password reset
3. Browse pujas + filter + sort
4. Book single puja + Razorpay test payment
5. View booking history + cancel
6. View video proof
7. Book gift puja for someone else
8. Wallet balance + redeem credit
9. NRI USD pricing display + Stripe test payment
10. AI Pandit Q&A (free tier 3 questions)
11. AI Pandit Q&A (Bhakti Pro subscription)
12. Subscribe to Adopt-a-Cow
13. View subscription + cancel
14. Live darshan playback + viewer count
15. Founder login + access /admin

## Test data management

- E2E test DB seeded with fixture data
- Test users: e2e-test-1@bhaktisetu.com through e2e-test-20@bhaktisetu.com
- Test wallet balance: ₹1,000 each user
- Test bookings: pre-existing for testing video proof + refund flows
- Reset DB nightly via cron

## Coverage targets

- Year 1 (current): 60% overall
- Year 2 target: 75% overall + 95% critical flows
- Year 3 target: 85% overall + 100% critical flows

## Founder discipline

- All PRs must pass unit + integration tests
- Critical flow E2E required for production deploy
- Quarterly security audit
- Annual external accessibility audit
- Per-festival load testing

## Cost summary

- CI: GitHub Actions free tier (sufficient currently)
- Chromatic: $0 (free tier 5K snapshots/month)
- Snyk: $0 (free tier scan-on-PR)
- Lighthouse CI: $0
- Playwright: $0
- Pen test annual: ₹50K-100K
- Total: <$500/year incremental cost

## Engineering tickets

- Q3 2026: Setup full test suite + CI pipeline
- Q4 2026: 60% coverage target + critical flow E2E
- Q1 2027: External security audit
- Q2 2027: 75% coverage + load test framework
- Annually: Pen test + accessibility audit
