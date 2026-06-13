# Webhook Handler Comprehensive Spec — All Sub-Processors

> Unified webhook architecture for Razorpay + Stripe + Resend + WhatsApp + FCM + Sentry + PostHog. Replaces ad-hoc per-vendor handlers.

## Why centralize webhooks

- Each vendor (Razorpay/Stripe/Resend/WA Cloud/FCM/Sentry/PostHog) sends webhooks
- Current state: 7 different endpoints, 7 different validation patterns, 7 different retry strategies
- Single unified handler simplifies operations + reduces bugs
- Single audit log of all incoming webhooks
- Foundation for BullMQ retry queue (per R-Q2-E-010 webhook reliability)

## Architecture

```
External webhook → /api/v1/webhooks/{vendor}/handler
  → Signature verification (per-vendor algorithm)
  → Event classification (per-vendor event types)
  → Idempotency check (event ID lookup in DB)
  → Queue job for processing (BullMQ via R-Q2-E-012)
  → ACK 200 to vendor (must be <2 seconds)
  → Worker processes async (with retry on failure)
  → Update DB + downstream services
```

## Per-vendor signature verification

### Razorpay (HMAC-SHA256)

```typescript
import crypto from 'crypto'

function verifyRazorpaySignature(rawBody: Buffer, signature: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSig)
  )
}
```

### Stripe (HMAC-SHA256 + timestamp)

```typescript
function verifyStripeSignature(rawBody: Buffer, sigHeader: string): boolean {
  const parts = sigHeader.split(',').reduce((acc, p) => {
    const [k, v] = p.split('=')
    acc[k] = v
    return acc
  }, {} as Record<string, string>)
  
  const timestamp = parts['t']
  const v1 = parts['v1']
  
  if (!timestamp || !v1) return false
  
  // Tolerance: 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  
  const signedPayload = `${timestamp}.${rawBody.toString()}`
  const expectedSig = crypto
    .createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET!)
    .update(signedPayload)
    .digest('hex')
  
  return crypto.timingSafeEqual(
    Buffer.from(v1),
    Buffer.from(expectedSig)
  )
}
```

### Resend (HMAC-SHA256 + Svix)

```typescript
import { Webhook } from 'svix'

function verifyResendSignature(rawBody: string, headers: Headers): boolean {
  const wh = new Webhook(process.env.RESEND_WEBHOOK_SECRET!)
  try {
    wh.verify(rawBody, {
      'svix-id': headers.get('svix-id')!,
      'svix-timestamp': headers.get('svix-timestamp')!,
      'svix-signature': headers.get('svix-signature')!,
    })
    return true
  } catch {
    return false
  }
}
```

### WhatsApp Cloud API (HMAC-SHA256)

```typescript
function verifyWhatsAppSignature(rawBody: Buffer, signature: string): boolean {
  const expectedSig = crypto
    .createHmac('sha256', process.env.WHATSAPP_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  
  return signature === `sha256=${expectedSig}`
}
```

## Unified handler structure

```typescript
// apps/api/src/routes/webhooks/index.ts
import { FastifyPluginAsync } from 'fastify'

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Razorpay
  fastify.post('/webhooks/razorpay', {
    config: { rawBody: true }
  }, async (req, reply) => {
    const rawBody = (req as any).rawBody as Buffer
    const signature = req.headers['x-razorpay-signature'] as string
    
    if (!verifyRazorpaySignature(rawBody, signature)) {
      return reply.status(400).send({ error: 'invalid_signature' })
    }
    
    const event = JSON.parse(rawBody.toString())
    
    // Idempotency check
    const existing = await prisma.webhookEvent.findUnique({
      where: { vendorId_eventId: { vendorId: 'razorpay', eventId: event.id } }
    })
    
    if (existing) {
      return reply.status(200).send({ ok: true, message: 'already_processed' })
    }
    
    // Save event + queue for processing
    await prisma.webhookEvent.create({
      data: {
        vendorId: 'razorpay',
        eventId: event.id,
        eventType: event.event,
        payload: event,
        status: 'queued'
      }
    })
    
    await webhookProcessQueue.add('razorpay-event', { eventId: event.id, type: event.event })
    
    return reply.status(200).send({ ok: true })
  })
  
  // Stripe — similar pattern
  fastify.post('/webhooks/stripe', { config: { rawBody: true } }, async (req, reply) => {
    // ... similar pattern
  })
  
  // Resend, WhatsApp, FCM, Sentry, PostHog — similar patterns
}
```

## Schema

```prisma
model WebhookEvent {
  id           String   @id @default(cuid())
  vendorId     String   @map("vendor_id")  // razorpay, stripe, resend, etc.
  eventId      String   @map("event_id")
  eventType    String   @map("event_type")
  payload      Json
  status       WebhookStatus @default(queued)
  processedAt  DateTime? @map("processed_at")
  retryCount   Int      @default(0) @map("retry_count")
  errorMessage String?  @map("error_message")
  createdAt    DateTime @default(now()) @map("created_at")
  
  @@unique([vendorId, eventId])
  @@index([status, createdAt])
  @@map("webhook_events")
}

enum WebhookStatus { queued processing succeeded failed dead_lettered }
```

## Worker (BullMQ)

```typescript
import { Worker } from 'bullmq'

const worker = new Worker('webhook-processing', async (job) => {
  const { eventId, type } = job.data
  
  const event = await prisma.webhookEvent.findUnique({
    where: { id: eventId }
  })
  
  if (!event) throw new Error('event_not_found')
  
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: { status: 'processing', retryCount: { increment: 1 } }
  })
  
  try {
    // Route to specific handler per vendor + event type
    await routeWebhookEvent(event)
    
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: 'succeeded', processedAt: new Date() }
    })
  } catch (err: any) {
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: event.retryCount >= 3 ? 'dead_lettered' : 'failed',
        errorMessage: err.message
      }
    })
    throw err  // Trigger BullMQ retry
  }
}, {
  connection: redis,
  concurrency: 10
})
```

## Event routing

```typescript
async function routeWebhookEvent(event: WebhookEvent) {
  const { vendorId, eventType, payload } = event
  
  switch (vendorId) {
    case 'razorpay':
      return handleRazorpayEvent(eventType, payload)
    case 'stripe':
      return handleStripeEvent(eventType, payload)
    case 'resend':
      return handleResendEvent(eventType, payload)
    case 'whatsapp':
      return handleWhatsAppEvent(eventType, payload)
    case 'fcm':
      return handleFCMEvent(eventType, payload)
    case 'sentry':
      return handleSentryEvent(eventType, payload)
    case 'posthog':
      return handlePostHogEvent(eventType, payload)
    default:
      throw new Error(`unknown_vendor: ${vendorId}`)
  }
}

async function handleRazorpayEvent(type: string, payload: any) {
  switch (type) {
    case 'payment.captured':
      return onPaymentCaptured(payload.payload.payment.entity)
    case 'subscription.charged':
      return onSubscriptionCharged(payload.payload.subscription.entity)
    case 'payment.failed':
      return onPaymentFailed(payload.payload.payment.entity)
    case 'refund.created':
      return onRefundCreated(payload.payload.refund.entity)
    default:
      console.warn('Unhandled Razorpay event type:', type)
  }
}
```

## Admin dashboard

`/admin/webhooks`:

- All webhook events listed (paginated)
- Filter by vendor + event type + status + date range
- Per-event: payload viewer, retry button, dead-letter recovery
- Health metrics: success rate per vendor, processing latency

## Retry strategy

- Initial attempt: immediate processing
- Failed attempt 1: retry in 5 minutes
- Failed attempt 2: retry in 30 minutes
- Failed attempt 3: retry in 2 hours
- Failed attempt 4+: dead-lettered, founder notification

## Monitoring

- Sentry alert on dead-lettered events
- Daily Slack summary of webhook health per vendor
- Weekly review of failed event patterns
- Quarterly vendor SLA review

## Security

- Rate limit webhook endpoints (1000/min per vendor IP)
- Reject events older than 24 hours (replay attack prevention)
- HTTPS-only enforcement
- Secret rotation: annually per vendor
- Audit log: who accessed webhook payloads, when

## Engineering tickets

- Week 1: Centralized handler structure
- Week 2: Per-vendor signature verification
- Week 3: WebhookEvent schema + Prisma migration
- Week 4: BullMQ worker + retry logic
- Week 5: Admin dashboard
- Week 6: Pilot + verification
- Week 7: Full rollout + decommission per-vendor endpoints
