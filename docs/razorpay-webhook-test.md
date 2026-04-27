# Razorpay webhook — flipping to raw-body verification

> Why this matters: HMAC over `JSON.stringify(payload)` (the legacy
> path) is not a real signature check — it relies on Node's serializer
> producing the exact bytes Razorpay signed. Raw-body verification is
> the correct path. We shipped both behind `RAZORPAY_VERIFY_RAW` so we
> can flip it on with confidence.

## State on disk after the security pass

- `RAZORPAY_VERIFY_RAW=false` (default, unset) → legacy
  `JSON.stringify` path. **Currently in prod.**
- `RAZORPAY_VERIFY_RAW=true` → raw-body HMAC + timing-safe compare.

`fastify-raw-body` is registered globally with `global: false`. The
`/api/v1/payments/webhook` route opts in via `config: { rawBody: true }`,
so `request.rawBody` is the literal string Razorpay sent.

## Test procedure (~10 minutes)

### 1. Use Razorpay test mode

In the Razorpay dashboard, switch to **Test mode** (top-left toggle).
Test-mode webhooks fire on test-mode payments only — no real money,
no risk to live bookings.

### 2. Point a test webhook at staging or a tunnel

Two options depending on whether you have staging:

**a) If you have a staging Render service**: point a test-mode webhook
at `https://<staging>.onrender.com/api/v1/payments/webhook`. Set
`RAZORPAY_VERIFY_RAW=true` on staging only.

**b) If you don't**: tunnel local API to the public internet:

```bash
# Terminal 1
pnpm --filter @poojly/api dev

# Terminal 2 — pick one
ngrok http 4000          # https://<random>.ngrok.app
# or
cloudflared tunnel --url http://localhost:4000
```

Set `RAZORPAY_VERIFY_RAW=true` in `apps/api/.env` and restart the dev
server. Add the tunnel URL + `/api/v1/payments/webhook` as a test-mode
webhook in Razorpay dashboard. **Active events**: `payment.captured`,
`payment.failed`. **Webhook secret**: paste into `apps/api/.env` as
`RAZORPAY_WEBHOOK_SECRET` (same env var as prod).

### 3. Trigger a test payment

In Razorpay dashboard → Test mode → Orders → create an order, then
checkout it from a test card (e.g. `4111 1111 1111 1111`, any future
expiry, any CVV).

### 4. Verify the API logged a verified webhook

Watch API logs:

```bash
# Look for these lines in order:
# 1. POST /api/v1/payments/webhook 200 (no signature-failure warning)
# 2. Webhook event: payment.captured (or whatever Razorpay sent)
```

If you see `Webhook signature verification failed` in the logs while
`RAZORPAY_VERIFY_RAW=true`, **do not flip prod** — investigate first.
Most common cause: the webhook secret in `.env` doesn't match the one
shown in the Razorpay dashboard for *that* webhook.

### 5. Flip prod

Once test-mode passes:

1. Render → bhaktisetu-api → Environment → add
   `RAZORPAY_VERIFY_RAW=true`. Save → service restarts.
2. Wait for next live payment (or a real webhook retry from a recent
   payment) and confirm the same logs in prod.
3. After a successful prod webhook with raw verification, you can
   delete the legacy `handleWebhook` method in `payment.service.ts`
   in a follow-up cleanup PR. Until then, both paths coexist.

## Rollback

If anything goes wrong after flipping prod, set
`RAZORPAY_VERIFY_RAW=false` (or unset) on Render → service restarts →
back to legacy path within 30 s. No code change required.

## Why timing-safe compare matters

The raw path uses `crypto.timingSafeEqual`, not string `===`. A naive
string compare on HMAC output leaks how many initial characters
matched via response-time differences — a remote attacker can use that
to brute-force the signature one character at a time. Timing-safe
compare branches in constant time.

## What the legacy path was doing wrong

```ts
// OLD
const expected = crypto.createHmac('sha256', secret)
  .update(JSON.stringify(payload))   // ← reconstructs bytes; not what Razorpay signed
  .digest('hex');
if (expected !== signature) throw ...;
```

This worked in practice only because Razorpay serializes JSON without
whitespace and Node does too, *and* both sort keys identically *most*
of the time. There is no formal guarantee. A subtle change in either
serializer (or in a future Razorpay payload that includes nested
floats / non-ASCII) would silently break verification, and we'd reject
all legitimate webhooks until someone noticed bookings weren't
confirming.

The raw path eliminates that whole class of bug.
