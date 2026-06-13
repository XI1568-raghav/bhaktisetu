# Background Job Queue — BullMQ + Upstash for Email/WA/Payouts

> **Roadmap item**: R-Q2-E-012 (P2) · **Authored**: 2026-06-13

## Goal

Q2 ship BullMQ background job queue on Upstash Redis. Offload email + WhatsApp + Razorpay payouts.

## Queues

| Queue | Use case | Concurrency |
|---|---|---|
| email | Resend transactional sends | 10 |
| whatsapp | WA Cloud API sends (R-Q1-M-010) | 5 |
| payouts | Razorpay pandit weekly batch | 1 (sequential for idempotency) |
| video-proof | Async video transcode + upload | 3 |
| webhook-retry | Razorpay/Stripe failed webhook retry (R-Q2-E-010) | 5 |

## Setup

```bash
pnpm --filter @poojly/api add bullmq ioredis
```

```typescript
// apps/api/src/queues/email.ts
import { Queue } from 'bullmq'
const emailQueue = new Queue('email', { connection: { url: process.env.UPSTASH_REDIS_URL } })
emailQueue.add('booking-confirmation', { to, subject, html }, { attempts: 3, backoff: { type: 'exponential', delay: 5000 } })
```

## Worker

`apps/api/src/workers/email.ts` — runs in same Render service:

```typescript
import { Worker } from 'bullmq'
new Worker('email', async (job) => {
  await sendEmail(job.data)
}, { connection: redis })
```

## Upstash free tier

- 10K commands/day free
- Estimated Q2 load: 5K commands/day → within free
- Q3 scale: paid tier ($10/mo)

## Engineering tickets

- R-Q2-E-012a: Upstash Redis setup
- R-Q2-E-012b: 5 queue definitions
- R-Q2-E-012c: 5 worker implementations
- R-Q2-E-012d: Admin BullMQ dashboard (built-in)

## Closes

R-Q2-E-012 — spec shipped.
