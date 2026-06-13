# API Rate Limiting — Per-User + Per-IP

> **Roadmap item**: R-Q2-E-013 (P2) · **Authored**: 2026-06-13

## Goal

Q2 ship Fastify rate-limit per-user + per-IP across API. Prevent abuse + DDoS protection.

## Setup

```bash
pnpm --filter @poojly/api add @fastify/rate-limit
```

```typescript
// apps/api/src/server.ts
await fastify.register(import('@fastify/rate-limit'), {
  max: 100,
  timeWindow: '1 minute',
  keyGenerator: (req) => req.user?.id ?? req.ip,  // per-user if auth'd, else per-IP
  redis: redis,  // shared w/ BullMQ (R-Q2-E-012)
})
```

## Per-route overrides

| Route | Limit |
|---|---|
| /auth/login | 5/min per IP |
| /auth/signup | 3/min per IP |
| /waitlist | 5/hour per IP |
| /booking/create | 20/hour per user |
| /ai-pandit/ask | tier-gated (R-Q2-E-001) |
| All other | 100/min default |

## 429 response

`Retry-After: 60` header + JSON `{ error: 'Rate limit exceeded. Try in 60s.' }`

## Engineering tickets

- R-Q2-E-013a: Plugin registration
- R-Q2-E-013b: Per-route overrides
- R-Q2-E-013c: Redis-backed share w/ BullMQ
- R-Q2-E-013d: Sentry alert if 429 rate >5% sustained

## Closes

R-Q2-E-013 — spec shipped.
