import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { paymentService } from './payment.service.js';

// Regression guard for the webhook fail-closed fix: an unset/empty
// RAZORPAY_WEBHOOK_SECRET must make handleWebhook + handleWebhookRaw REJECT
// with the "signature verification failed" message (so the route returns 400),
// never a swallowed 200 "Internal processing error". And a wrong-but-valid
// signature must also fail the timing-safe compare.

describe('Razorpay webhook signature guard', () => {
  const ORIG = process.env.RAZORPAY_WEBHOOK_SECRET;
  beforeEach(() => { delete process.env.RAZORPAY_WEBHOOK_SECRET; });
  afterEach(() => { if (ORIG !== undefined) process.env.RAZORPAY_WEBHOOK_SECRET = ORIG; });

  it('handleWebhook rejects when RAZORPAY_WEBHOOK_SECRET is unset', async () => {
    await expect(
      paymentService.handleWebhook({ event: 'payment.captured' }, 'deadbeef'),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it('handleWebhookRaw rejects when RAZORPAY_WEBHOOK_SECRET is unset', async () => {
    await expect(
      paymentService.handleWebhookRaw('{"event":"payment.captured"}', { event: 'payment.captured' }, 'deadbeef'),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it('handleWebhookRaw rejects a wrong-but-wellformed 64-hex signature', async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = 'test-secret';
    const wrong = 'a'.repeat(64);
    await expect(
      paymentService.handleWebhookRaw('{"event":"payment.captured"}', { event: 'payment.captured' }, wrong),
    ).rejects.toThrow(/signature verification failed/i);
  });

  it('handleWebhookRaw ACCEPTS a correctly-signed payload', async () => {
    const secret = 'test-secret';
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const rawBody = JSON.stringify({ event: 'unknown.event', payload: {} });
    const sig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    // unknown.event is not handled, but signature must PASS (no throw).
    const res = await paymentService.handleWebhookRaw(rawBody, JSON.parse(rawBody), sig);
    expect(res).toHaveProperty('handled');
  });
});
