import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { applyCapturedPayment, finalizeConsultationPaymentFromWebhook } = vi.hoisted(() => ({
  applyCapturedPayment: vi.fn(async () => ({ handled: true, event: 'payment.captured' })),
  finalizeConsultationPaymentFromWebhook: vi.fn(async () => ({ handled: true })),
}));
vi.mock('../services/payment.service.js', () => ({
  paymentService: { applyCapturedPayment },
}));
vi.mock('../routes/consultation.js', () => ({
  finalizeConsultationPaymentFromWebhook,
}));

import { reconcilePayments } from './reconcile-payments.js';

/**
 * PAY-06 (2026-08-20, P1) — no reconciliation job existed anywhere.
 *
 * Nothing in the platform ever looked for a `Payment` stuck at `initiated`
 * with a real capture behind it, and nothing ever asked Razorpay what actually
 * settled. The whole confirmation design assumed the browser survives to call
 * /verify, with the webhook as the only backstop — and the webhook is exactly
 * what a missing RAZORPAY_WEBHOOK_SECRET, an unsubscribed event, or a three-day
 * outage takes away. Money captured with nothing behind it is invisible.
 */

const ORIG_ENV = { ...process.env };
const HOURS = 60 * 60 * 1000;

function razorpayReply(payments: Array<Record<string, unknown>>) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ count: payments.length, items: payments }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_live_x';
  process.env.RAZORPAY_KEY_SECRET = 'secret';
  prismaMock.payment.findMany.mockResolvedValue([]);
  prismaMock.payment.update.mockResolvedValue({});
  prismaMock.payment.count.mockResolvedValue(0);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
});

describe('PAY-06 — reconcilePayments', () => {
  it('skips cleanly when Razorpay credentials are absent', async () => {
    delete process.env.RAZORPAY_KEY_ID;
    const res = await reconcilePayments();
    expect(res.skipped).toBe(true);
    expect(res.reason).toMatch(/razorpay/i);
  });

  it('RECOVERS a Payment stuck at initiated that Razorpay says was captured', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { id: 'pmt-1', gatewayOrderId: 'order_stuck', createdAt: new Date(Date.now() - 2 * HOURS) },
    ]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        razorpayReply([{ id: 'pay_real', status: 'captured', method: 'upi' }]),
      ),
    );

    const res = await reconcilePayments();
    expect(applyCapturedPayment).toHaveBeenCalledWith('order_stuck', 'pay_real', 'upi');
    expect(res.recoveredPayments).toBe(1);
    expect(res.scannedPayments).toBe(1);
  });

  it('does NOT touch a stuck Payment Razorpay has not captured', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { id: 'pmt-1', gatewayOrderId: 'order_stuck', createdAt: new Date(Date.now() - 2 * HOURS) },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => razorpayReply([])));

    const res = await reconcilePayments();
    expect(applyCapturedPayment).not.toHaveBeenCalled();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(res.recoveredPayments).toBe(0);
  });

  it('marks a long-abandoned uncaptured Payment failed, but only after the abandon window', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { id: 'pmt-old', gatewayOrderId: 'order_old', createdAt: new Date(Date.now() - 48 * HOURS) },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => razorpayReply([])));

    const res = await reconcilePayments();
    expect(res.failedPayments).toBe(1);
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pmt-old' },
        data: expect.objectContaining({ status: 'failed' }),
      }),
    );
  });

  it('never writes anything when the Razorpay lookup itself fails', async () => {
    prismaMock.payment.findMany.mockResolvedValue([
      { id: 'pmt-old', gatewayOrderId: 'order_old', createdAt: new Date(Date.now() - 48 * HOURS) },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));

    const res = await reconcilePayments();
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(applyCapturedPayment).not.toHaveBeenCalled();
    expect(res.errors).toBeGreaterThan(0);
  });

  it('RECOVERS a consultation parked in payment_review that Razorpay says was paid', async () => {
    const row = {
      id: 'consult-1',
      reference: 'AC-1',
      status: 'payment_review',
      razorpay_order_id: 'order_consult',
      astrologer_name: 'Acharya',
      created_at: new Date(Date.now() - 2 * HOURS),
    };
    prismaMock.$queryRawUnsafe.mockResolvedValue([row]);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => razorpayReply([{ id: 'pay_consult', status: 'captured' }])),
    );

    const res = await reconcilePayments();
    expect(finalizeConsultationPaymentFromWebhook).toHaveBeenCalled();
    expect(res.recoveredConsultations).toBe(1);
  });

  it('cancels a long-abandoned consultation only once Razorpay confirms no capture', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'consult-2',
        reference: 'AC-2',
        status: 'payment_review',
        razorpay_order_id: 'order_dead',
        astrologer_name: 'Acharya',
        created_at: new Date(Date.now() - 48 * HOURS),
      },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => razorpayReply([])));

    const res = await reconcilePayments();
    expect(res.cancelledConsultations).toBe(1);
    const cancelled = prismaMock.$executeRawUnsafe.mock.calls.some((c: unknown[]) =>
      /status\s*=\s*'cancelled'/i.test(String(c[0])),
    );
    expect(cancelled).toBe(true);
  });

  it('leaves a recently-parked consultation with no capture alone', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        id: 'consult-3',
        reference: 'AC-3',
        status: 'payment_review',
        razorpay_order_id: 'order_recent',
        astrologer_name: 'Acharya',
        created_at: new Date(Date.now() - 1 * HOURS),
      },
    ]);
    vi.stubGlobal('fetch', vi.fn(async () => razorpayReply([])));

    const res = await reconcilePayments();
    expect(res.cancelledConsultations).toBe(0);
    expect(finalizeConsultationPaymentFromWebhook).not.toHaveBeenCalled();
  });
});
