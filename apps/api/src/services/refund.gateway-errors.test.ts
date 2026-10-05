import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => ({ ok: true })),
  refundSuccessEmail: () => ({ subject: 's', html: 'h', text: 't' }),
}));
vi.mock('./cancellation.service.js', () => ({
  cancellationService: {
    getPolicy: vi.fn(async () => ({ tiers: [], refundDaysLabel: '5-7 business days' })),
    computeDevoteeRefund: vi.fn(() => ({ refundFraction: 1, refundAmountInr: 1100, tierLabel: 'Full' })),
  },
}));

import { processRefund } from './refund.service.js';

const BOOKING_ID = '11111111-1111-1111-1111-111111111111';

function booking(gatewayPaymentId: string) {
  return {
    id: BOOKING_ID,
    bookingNumber: 'BS-1',
    status: 'cancelled',
    cancelledAt: new Date(),
    cancellationReason: null,
    user: { email: 'd@example.com', fullName: 'Devotee' },
    pujaType: { name: 'Puja' },
    temple: { name: 'Temple' },
    payments: [{ id: 'pay-1', status: 'captured', amount: 1100, gatewayPaymentId, metadata: {} }],
  };
}

describe('refund.service gateway failures', () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking('pay_real_1') as never);
    prismaMock.payment.update.mockResolvedValue({} as never);
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.templePayout.findMany.mockResolvedValue([] as never);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('maps a gateway 404 to a plain sentence with no raw HTTP text', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/payment gateway could not process this refund/i);
    expect(r.error).toMatch(/Razorpay dashboard/);
    expect(r.error).not.toMatch(/HTTP|404/);
  });

  it('never leaks a raw upstream body or network error text', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: { description: 'SECRET_UPSTREAM_DETAIL key rzp_live_abc' } }),
      })),
    );
    const r1 = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(r1.error).not.toMatch(/SECRET_UPSTREAM_DETAIL|rzp_live/);

    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('connect ECONNREFUSED 10.0.0.1:443'); }));
    const r2 = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(r2.error).not.toMatch(/ECONNREFUSED|10\.0\.0\.1/);
    expect(r2.error).toMatch(/try again/i);
  });

  it('keeps the original detail in server logs only', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    const logged = JSON.stringify((console.error as any).mock.calls);
    expect(logged).toContain('404');
  });
});

describe('refund.service demo mode', () => {
  const origEnv = { ...process.env };
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    process.env.RAZORPAY_KEY_SECRET = 'demo';
    process.env.NODE_ENV = 'test';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking('pay_demo_123') as never);
    prismaMock.payment.update.mockResolvedValue({} as never);
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.templePayout.findMany.mockResolvedValue([] as never);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.unstubAllGlobals();
  });

  it('skips the HTTP call and marks the refund processed locally outside production', async () => {
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r.ok).toBe(true);
    expect(r.refundId).toMatch(/^rfnd_demo_/);
    expect(prismaMock.payment.update).toHaveBeenCalled();
  });

  it.each(['pay_demo_1', 'order_demo_1', 'pay_qa_7'])('payment id %s is a demo id', async (pid) => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_real';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking(pid) as never);
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(r.ok).toBe(true);
  });

  it('PRODUCTION never takes the demo path, even with demo keys and ids', async () => {
    process.env.NODE_ENV = 'production';
    fetchMock.mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.ok).toBe(false);
    expect(r.refundId).toBeUndefined();
  });

  it('a real payment id with real keys is never treated as demo', async () => {
    process.env.RAZORPAY_KEY_ID = 'rzp_test_real';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(booking('pay_real_1') as never);
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ id: 'rfnd_1', status: 'processed' }) });
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 't', refundType: 'full' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(r.refundId).toBe('rfnd_1');
  });
});
