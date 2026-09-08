# Monitoring + Observability Stack Spec

> **PROPOSAL, NOT A DEPLOYED STACK — corrected 2026-09-08 (`OPS-10`).** The "Stack
> overview" table below reads as an inventory of what is running. It is not. Checked
> against the repository on 2026-09-08: **Logflare** appears in no source file, no
> workflow and no env var — there is no centralised log aggregation. **StatusPage** is
> not purchased and no public status page exists; `status.bhaktisetu.com` does not
> serve (`docs/cs/crisis-communications-playbook.md`). **UptimeRobot** is an unstarted
> founder action (`docs/it/uptime-setup.md`), and the DR runbook records "External
> uptime monitor: **None wired in this repository**". **Sentry** has an SDK integration
> but `SENTRY_DSN` is `.optional()` (`apps/api/src/lib/env.ts:71`) and appears nowhere in
> `render.yaml`, so whether it is receiving events in production is `[verify]`.
> **PostHog** is wired in code and gated on `NEXT_PUBLIC_POSTHOG_KEY`, which is unset in
> production — recorded in the source itself at `apps/web/app/page.tsx:585` and absent
> from `render.yaml`'s build env — so every `capture()` is a no-op. The SLO table
> below is therefore an aspiration with nothing measuring it — no alert fires from any
> of these numbers today. Ground truth: `docs/runbooks/disaster-recovery.md`,
> `.github/workflows/`, `render.yaml`.

> Unified monitoring architecture across Bhaktisetu infrastructure. Foundation for Series-A reliability story.

## Stack overview

| Tool | Purpose | Cost |
|---|---|---|
| Sentry | Error tracking + crash reports | Free tier (5K events/mo) |
| PostHog | Product analytics + A/B tests | Free tier (1M events/mo) |
| Cloudflare Analytics | Web traffic + edge metrics | Free |
| UptimeRobot | External uptime monitoring | Free (50 monitors / 5min) |
| Render | API health + deploy logs | Included with Render plan |
| Supabase Dashboard | DB metrics + slow query log | Included with Supabase plan |
| Logflare | Centralized log aggregation | Free tier (250K events/mo) |
| StatusPage | Public-facing status page | $30/mo (paid post-funding) |

## SLO definitions (per R-Q3-E-013)

| Service | SLO | Window | Error budget |
|---|---|---|---|
| api.darshya.online | 99.9% uptime | 30d | 43 min |
| darshya.online | 99.95% uptime | 30d | 21 min |
| Booking E2E | 99.5% success | 30d | 3,600 errors / 720K |
| Razorpay payment | 99.8% success | 30d | 1,000 errors / 500K |
| Video proof upload | 95% success in 24hr | 30d | 5% miss |
| WhatsApp notification | 99% delivery | 30d | 1% miss |
| Email transactional | 98% delivery | 30d | 2% miss |

## Burn-rate alerts

- 50% burn: warning email to founder
- 75% burn: SMS + investigate
- 90% burn: SMS + page (drop low-priority work)
- 100% burn: incident response activated

## Per-vendor monitoring setup

### Sentry

```typescript
// apps/api/src/server.ts
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    if (event.exception?.values?.[0]?.value?.includes('NetworkError')) return null
    return event
  },
  release: process.env.RELEASE_SHA
})

fastify.setErrorHandler((err, req, reply) => {
  Sentry.captureException(err)
  // ... existing error handling
})
```

```typescript
// apps/web/sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    // Filter noise per R-Q3-IT-001
    if (event.exception?.values?.[0]?.value?.match(/ChunkLoadError|NetworkError|AbortError/)) return null
    return event
  }
})
```

### PostHog

```typescript
// apps/web/components/PostHogProvider.tsx (per R-Q1-M-003)
import posthog from 'posthog-js'

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
  capture_pageview: true,
  capture_pageleave: true,
  autocapture: true,
  session_recording: { maskAllInputs: true },
  person_profiles: 'identified_only'
})
```

### UptimeRobot — 5 critical monitors (per R-Q1-IT-001)

1. API health: https://api.darshya.online/health (5min interval, SMS + email)
2. Web home: https://darshya.online (5min, SMS + email)
3. Web /pujas: https://darshya.online/pujas (10min, email)
4. API /v1/pujas/types: https://api.darshya.online/api/v1/pujas/types (10min, email)
5. API /v1/auth/login: https://api.darshya.online/api/v1/auth/login (30min, email, POST keyword fallback)

### Cloudflare Analytics

- Free Web Analytics enabled per R-Q3-IT-002
- Server-side, no client JS load
- Pageview + bot detection + DDoS metrics
- Workers Analytics deferred Q4 (cost-conscious)

### Logflare (centralized logs)

```typescript
// apps/api/src/server.ts
import logflare from 'logflare'

const logger = logflare({
  apiKey: process.env.LOGFLARE_API_KEY!,
  source: 'bhaktisetu-api',
  level: 'info',
  redactKeys: ['password', 'token', 'authorization']
})

fastify.addHook('onRequest', (req, reply, done) => {
  logger.info({ url: req.url, method: req.method, ip: req.ip }, 'request')
  done()
})
```

## Custom Bhaktisetu metric dashboard

### `/admin/observability` (real-time)

- API p95/p99 latency per endpoint
- Booking funnel conversion rate (per R-Q1-E-008)
- Razorpay payment success rate (24hr rolling)
- Video proof upload SLA compliance (last 7 days)
- Pandit performance scoring (per R-Q3-E-013)
- WhatsApp + email delivery rates

### Slack alerts

- Sentry P0 error → #ops channel immediate
- UptimeRobot down → #ops channel + SMS
- SLO burn rate >75% → #ops channel + founder DM
- Pandit no-show pattern (3+ in 24hr) → #ops channel
- Razorpay payment failure spike (>5% in single hour) → #ops channel + founder

## Founder review cadence

- Daily 5-min: morning Sentry + UptimeRobot status check
- Weekly 30-min: PostHog funnel + cohort review
- Quarterly 4-hour: full observability audit + tool optimization

## Q4 + Series A scaling

- Q4: Render Standard tier (per R-Q4-E-003) = +better observability
- Q4: Cyber liability insurance + monitoring covered
- Q1 2027 (post-Series A): Datadog evaluation (full APM) vs current open-source stack
- Q3 2027: SRE function dedicated (1 hire) for SLO management

## Cost summary (current)

- Sentry: $0 (free tier)
- PostHog: $0 (free tier)
- Cloudflare: $0
- UptimeRobot: $0
- Render: included in plan
- Supabase: included in plan
- Logflare: $0 (free tier)
- **Total**: $0 currently, scales to ~$200/mo at 100K MAU

## Vendor switching risk

- Sentry alternative: Bugsnag, Datadog
- PostHog alternative: Mixpanel, Amplitude
- UptimeRobot alternative: Pingdom, StatusCake
- All vendors evaluated quarterly; switch decisions based on price + reliability
