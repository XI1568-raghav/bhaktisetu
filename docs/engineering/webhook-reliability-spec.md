# Webhook Reliability — Razorpay/Stripe Idempotency Keys + Retry Queue

> **Roadmap item**: R-Q2-E-010 (P1) · **Authored**: 2026-06-13

## Goal

Hardened webhook handling: NO double-processing, NO dropped events, NO data corruption on retry. Razorpay + Stripe both.

## Idempotency design

Every webhook event has:
- `event_id` (gateway-provided unique)
- `event_type` (e.g. `payment.captured`)
- `payload`

Idempotency table:

```prisma
model WebhookEvent {
  id              String   @id @default(uuid()) @db.Uuid
  gateway         String   // "razorpay" | "stripe"
  eventId         String   @map("event_id")
  eventType       String   @map("event_type")
  payload         Json
  signature       String
  receivedAt      DateTime @default(now()) @map("received_at")
  processedAt     DateTime? @map("processed_at")
  processingError String?  @map("processing_error")
  retryCount      Int      @default(0) @map("retry_count")

  @@unique([gateway, eventId])
  @@index([processedAt])
  @@map("webhook_events")
}
```

## Handler flow

```typescript
async function handleWebhook(req) {
  const sig = req.headers['x-razorpay-signature'];
  verifyHmac(sig, req.rawBody); // or throw 401

  const event = JSON.parse(req.rawBody);

  // 1. UPSERT WebhookEvent (idempotent on gateway+eventId)
  const wh = await prisma.webhookEvent.upsert({
    where: { gateway_eventId: { gateway: 'razorpay', eventId: event.id } },
    create: { gateway: 'razorpay', eventId: event.id, eventType: event.event, payload: event, signature: sig },
    update: {} // no-op if exists
  });

  // 2. If already processed, return 200 immediately
  if (wh.processedAt) return reply.code(200).send({ status: 'duplicate' });

  // 3. Enqueue for processing (BullMQ on Upstash Redis OR cron-based)
  await enqueueProcessing(wh.id);

  // 4. ACK 200 immediately to gateway (don't make Razorpay wait)
  return reply.code(200).send({ status: 'enqueued' });
}
```

## Retry queue

- Background processor consumes WebhookEvent rows w/ processedAt=null
- Per event: invoke business logic (payment.captured → booking.confirm, etc.)
- On success: set processedAt = now()
- On failure: retryCount++, log error, requeue (exp backoff: 1min, 5min, 30min, 3hr)
- After 5 retries: alert founder + leave in "failed" state for manual review

## Replay tool

Admin endpoint `/api/v1/admin/webhooks/replay/:eventId` — re-runs business logic for a specific event. Useful for handler-bug recovery without asking gateway to resend.

## Engineering tickets

- R-Q2-E-010a: WebhookEvent Prisma model + migration
- R-Q2-E-010b: handler refactor (upsert + enqueue + ack)
- R-Q2-E-010c: background processor (BullMQ OR cron)
- R-Q2-E-010d: admin replay tool
- R-Q2-E-010e: tests for idempotency edge cases (concurrent duplicates, mid-process crash)

## Closes

R-Q2-E-010 — spec shipped.
