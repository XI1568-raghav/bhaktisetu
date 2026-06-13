# Sentry Quota Tuning — Sampling + Filters Under Free Tier 5K Events

> **Roadmap item**: R-Q2-IT-001 (P1) · **Authored**: 2026-06-13 · **Extends**: R-Q1-IT-003 Sentry setup

## Goal

Tune Sentry sampling + filters to stay under free tier 5K events/mo at 10K MAU. Targets <80% of 5K cap monthly.

## Current state (R-Q1-IT-003 setup)

- `tracesSampleRate: 0.1` (10% performance sampling)
- 5K events/mo free tier
- At 10K MAU + 100K page views/mo: estimated ~3-4K events/mo currently

## Tuning levers

### 1. Error grouping (reduces duplicates)
- Sentry auto-groups by fingerprint
- Confirm fingerprint includes file:line, NOT full stack hash (default OK)

### 2. Sample rate adjustment
- `tracesSampleRate: 0.1` → keep for now (safe)
- Increase to `0.2` only after first quota review w/ headroom

### 3. Error filtering (drop noise)

`beforeSend` in Sentry init:
```typescript
beforeSend(event) {
  // Drop expected errors
  if (event.exception?.values?.[0]?.value?.includes('NetworkError')) return null
  if (event.exception?.values?.[0]?.value?.includes('Failed to fetch')) return null
  if (event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) return null  // CF Pages chunk lazy-load
  if (event.exception?.values?.[0]?.type === 'AbortError') return null  // user navigated away
  
  // Drop bot traffic
  if (event.request?.headers?.['user-agent']?.match(/bot|crawler|spider/i)) return null
  
  // Drop dev / test env
  if (event.environment !== 'production') return null
  
  return event
}
```

### 4. Per-route ignore list
- `/api/v1/health` — health pings (UptimeRobot generates 1K/mo)
- `/api/v1/cron/*` — internal cron endpoints
- `/_next/static/*` — Next.js static assets

### 5. Performance event filtering
- `tracesSampler` function to skip routes
- Skip `/api/v1/health` + static assets entirely

## Quota dashboard

- Sentry Dashboard → Usage → set alert at 80% of 5K = 4K
- Email founder on 80% threshold
- Auto-downgrade sample rate to 0.05 if hit

## Engineering tickets

- R-Q2-IT-001a: beforeSend filter implementation
- R-Q2-IT-001b: tracesSampler skip list
- R-Q2-IT-001c: Quota alert at 4K threshold
- R-Q2-IT-001d: Monthly quota review SOP

## Closes

R-Q2-IT-001 — spec shipped.
