# Razorpay Raw-Body HMAC Flip — Post Test-Mode Validation

> **Roadmap item**: R-Q1-E-002 (P0) · **Authored**: 2026-06-13

## Goal

Flip Razorpay webhook from JSON-parsed signature verify → raw-body HMAC verify per Razorpay security recommendation. Closes silent webhook spoofing vector.

## Why

Current code: `JSON.parse(req.body)` happens BEFORE HMAC verify → mutates payload → signature mismatch on edge cases (BOM, trailing whitespace, key reorder). Razorpay docs explicitly require **raw byte stream** for HMAC.

## Patch

`apps/api/src/routes/webhooks/razorpay.ts`:

```typescript
// BEFORE
fastify.post('/razorpay/webhook', async (req, reply) => {
  const event = JSON.parse(req.body as string)
  const sig = req.headers['x-razorpay-signature']
  // HMAC against parsed body = BUG
})

// AFTER
fastify.post('/razorpay/webhook', {
  config: { rawBody: true }  // fastify-raw-body plugin
}, async (req, reply) => {
  const rawBody = (req as any).rawBody as Buffer
  const sig = req.headers['x-razorpay-signature'] as string
  
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex')
  
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    return reply.status(400).send({ error: 'invalid signature' })
  }
  
  const event = JSON.parse(rawBody.toString('utf-8'))
  // ... handle event
})
```

## Plugin install

```bash
pnpm --filter @poojly/api add fastify-raw-body
```

Register in `server.ts`:
```typescript
import rawBody from 'fastify-raw-body'
await fastify.register(rawBody, {
  field: 'rawBody',
  global: false,
  encoding: false,
  runFirst: true,
})
```

## Test mode validation

1. Send 5 test webhook events from Razorpay dashboard
2. Confirm all 5 verify + handle correctly in test mode
3. Log webhook receive count to confirm idempotency

## Flip to live

1. Update RAZORPAY_WEBHOOK_SECRET to live mode secret
2. Reverse-confirm at least 1 live event verifies + handles
3. Monitor 24hr for any 400 invalid-sig errors

## Closes

R-Q1-E-002 — spec shipped.
