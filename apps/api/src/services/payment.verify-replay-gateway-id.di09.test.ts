import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    payments = { refund: vi.fn(), fetch: vi.fn() };
    orders = { create: vi.fn() };
  },
}));

/**
 * DI-09 — a replayed verify-payment repointed every future refund.
 *
 * Driven against the running API: two verify-payment calls for the same
 * booking with DIFFERENT razorpayPaymentIds, each correctly signed. Both
 * returned HTTP 200, and direct SQL then showed ONE Payment row whose
 * gateway_payment_id had been overwritten from `pay_probe_alt_1_…` to
 * `pay_probe_alt_2_…`. The first id was gone.
 *
 * refund.service issues refunds against `captured.gatewayPaymentId`, so after
 * an overwrite a refund targets whichever id was seen last rather than the one
 * that actually captured — and the audit trail of which payment settled the
 * booking is destroyed. A legitimate gateway retry carrying a new id is enough
 * to trigger it.
 *
 * Two behaviours are pinned:
 *   - Replaying the SAME id on a captured payment stays idempotent (200, and
 *     the stored id is not rewritten).
 *   - A DIFFERENT id on a captured payment is refused, loudly, naming both ids
 *     — that is a reconciliation problem, not something to silently absorb.
 */

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

function sigFor(orderId: string, paymentId: string): string {
  return crypto
    .createHmac('sha256', 'test_secret_key')
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

/** A payment that already captured under `pay_first`, booking already confirmed. */
function capturedPayment() {
  prismaMock.payment.findFirst.mockResolvedValue({
    id: 'pmt-1',
    status: 'captured',
    gatewayPaymentId: 'pay_first',
    booking: {
      id: 'bk-1',
      bookingNumber: 'BS-20260812-AAAAA',
      status: 'confirmed',
      userId: 'user-1',
    },
  } as never);
  prismaMock.payment.update.mockResolvedValue({} as never);
  prismaMock.pujaBooking.update.mockResolvedValue({} as never);
}

/** Every `data` object handed to payment.update across the call. */
function paymentUpdatePayloads(): Array<Record<string, unknown>> {
  return prismaMock.payment.update.mock.calls.map(
    (c: unknown[]) => (c[0] as { data: Record<string, unknown> }).data,
  );
}

describe('DI-09 — a captured payment never has its gateway id rewritten', () => {
  it('refuses a second, different payment id against an already-captured payment', async () => {
    const service = await loadService();
    capturedPayment();

    await expect(
      service.verifyPayment('order_x', 'pay_second', sigFor('order_x', 'pay_second')),
    ).rejects.toThrow(/pay_first/);

    // The stored id must survive untouched — nothing may be written at all.
    expect(paymentUpdatePayloads()).toEqual([]);
  });

  it('names both ids so the row can be reconciled without reading the code', async () => {
    const service = await loadService();
    capturedPayment();

    await expect(
      service.verifyPayment('order_x', 'pay_second', sigFor('order_x', 'pay_second')),
    ).rejects.toThrow(/pay_second/);
  });

  it('stays idempotent when the SAME id is replayed', async () => {
    const service = await loadService();
    capturedPayment();

    const out = await service.verifyPayment(
      'order_x',
      'pay_first',
      sigFor('order_x', 'pay_first'),
    );

    expect(out).toMatchObject({ verified: true, bookingId: 'bk-1' });
    // Re-writing the identical value is harmless but pointless; what matters is
    // that no payload carries a gateway id OTHER than the captured one.
    for (const data of paymentUpdatePayloads()) {
      if ('gatewayPaymentId' in data) expect(data.gatewayPaymentId).toBe('pay_first');
    }
  });

  it('still stamps the gateway id on the FIRST capture', async () => {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      status: 'initiated',
      gatewayPaymentId: null,
      booking: {
        id: 'bk-1',
        bookingNumber: 'BS-20260812-AAAAA',
        status: 'pending_payment',
        userId: 'user-1',
      },
    } as never);
    prismaMock.payment.update.mockResolvedValue({} as never);
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);

    await service.verifyPayment('order_x', 'pay_first', sigFor('order_x', 'pay_first'));

    expect(paymentUpdatePayloads()).toContainEqual(
      expect.objectContaining({ status: 'captured', gatewayPaymentId: 'pay_first' }),
    );
  });
});
