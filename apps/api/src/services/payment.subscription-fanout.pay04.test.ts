import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/pdf-invoice.js', () => ({
  generateInvoice: vi.fn(async () => Buffer.from('%PDF-1.4 mock')),
}));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }));

/**
 * PAY-04 (2026-08-21, P0/money) — the MIRROR half.
 *
 * `subscription.*` can only ever be delivered to one of two urls, and the
 * runbook's webhook table has a row for each. Before this fix each url drove
 * exactly ONE of the two subscription stores:
 *
 *   /api/v1/payments/webhook       →  recurring_subscriptions only
 *   /api/v1/subscriptions/webhook  →  MarketplaceSubscription only
 *
 * so whichever url the owner chose, one store was left permanently stale. The
 * runbook picked /subscriptions/webhook, which is why recurring UPI Autopay
 * mandates never activated; the opposite mistake would silently stop
 * provisioning every paid marketplace role plan instead.
 *
 * This pins the payments-side half of the fan-out: a subscription event that
 * reaches the PAYMENTS dispatcher drives BOTH stores.
 */

const SECRET = 'test_webhook_secret';
const RZP_SUB_ID = 'sub_PAY04MIRROR';
const ORIG_ENV = { ...process.env };

async function fire(event: string, subId: string | null = RZP_SUB_ID) {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  const service = new mod.PaymentService();
  const payload = {
    event,
    payload: { subscription: { entity: subId ? { id: subId } : {} } },
  };
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
  return service.handleWebhookRaw(raw, payload, sig);
}

function recurringStatusUpdate(): unknown[] | undefined {
  const call = prismaMock.$executeRawUnsafe.mock.calls.find((c: unknown[]) =>
    /UPDATE\s+recurring_subscriptions\s+SET\s+status/i.test(String(c[0])),
  );
  return call?.slice(1);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = SECRET;
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.transaction.findMany.mockResolvedValue([]);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe('PAY-04 — the payments webhook drives both subscription stores', () => {
  it('writes the recurring mandate status', async () => {
    await fire('subscription.activated');
    expect(recurringStatusUpdate()).toEqual(['active', RZP_SUB_ID]);
  });

  it('ALSO drives the marketplace subscription rail', async () => {
    await fire('subscription.charged');
    // subscription.service.handleSubscriptionEvent resolves the local owner of
    // the mandate by scanning SUBSCRIPTION transactions. No other code on this
    // path touches transaction.findMany, so this is the rail's fingerprint.
    expect(prismaMock.transaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { type: 'SUBSCRIPTION' } }),
    );
  });

  it('a marketplace-rail failure does not lose the recurring write', async () => {
    prismaMock.transaction.findMany.mockRejectedValue(new Error('db down'));

    const out = await fire('subscription.activated');

    expect(recurringStatusUpdate()).toEqual(['active', RZP_SUB_ID]);
    expect(out.handled).toBe(true);
  });

  it('a recurring-store failure does not lose the marketplace rail', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('relation missing'));

    await fire('subscription.activated');

    expect(prismaMock.transaction.findMany).toHaveBeenCalled();
  });

  it('an unsigned delivery reaches neither store', async () => {
    vi.resetModules();
    const mod = await import('./payment.service.js');
    const service = new mod.PaymentService();
    const payload = {
      event: 'subscription.activated',
      payload: { subscription: { entity: { id: RZP_SUB_ID } } },
    };
    const raw = JSON.stringify(payload);

    await expect(
      service.handleWebhookRaw(raw, payload, 'deadbeef'),
    ).rejects.toThrow(/signature verification failed/i);

    expect(recurringStatusUpdate()).toBeUndefined();
    expect(prismaMock.transaction.findMany).not.toHaveBeenCalled();
  });
});
