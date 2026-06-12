# Sentry DSN Setup — CF Pages + Render

> **Roadmap item**: R-Q1-IT-003 (P1) · **Authored**: 2026-06-13

## Goal

Sentry error capture live for web (CF Pages) + API (Render). Closes "we can't see prod errors" blind spot.

## Setup

### Sentry account (free tier)

- Free: 5K events/mo / 1 user / 1 project
- Sufficient until 10K MAU (R-Q2-IT-001 quota tuning handles scaling)
- Sign up: sentry.io w/ founder email

### Projects

1. **bhaktisetu-web** — Next.js project type
2. **bhaktisetu-api** — Node.js project type

### DSN per project

- web DSN: `https://xxx@oXXX.ingest.sentry.io/PROJECT_ID`
- api DSN: `https://yyy@oYYY.ingest.sentry.io/PROJECT_ID`

## Web wire

```bash
pnpm --filter @poojly/web add @sentry/nextjs
```

`apps/web/sentry.client.config.ts` + `.server.config.ts` + `.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,  // 10% sampling
  environment: process.env.NODE_ENV,
  beforeSend(event) {
    if (event.exception?.values?.[0]?.value?.includes('NetworkError')) return null
    return event
  },
})
```

CF Pages env:
- `NEXT_PUBLIC_SENTRY_DSN` = web DSN

## API wire

```bash
pnpm --filter @poojly/api add @sentry/node
```

`apps/api/src/server.ts`:

```typescript
import * as Sentry from '@sentry/node'
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
  })
}
fastify.setErrorHandler((err, req, reply) => {
  Sentry.captureException(err)
  reply.status(err.statusCode ?? 500).send({ message: err.message })
})
```

Render env: `SENTRY_DSN` = api DSN.

## Alerts

- Sentry → Issues → New issue alert: email founder on new error w/ >10 occurrences/hour
- Sentry → Slack integration → #ops channel for all P0 errors

## Engineering tickets

- R-Q1-IT-003a: Sentry account + 2 projects
- R-Q1-IT-003b: Web wire (3 config files + env)
- R-Q1-IT-003c: API wire (server.ts + env)
- R-Q1-IT-003d: Alert rules configured

## Closes

R-Q1-IT-003 — spec shipped.
