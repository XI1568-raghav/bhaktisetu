import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { callRazorpayRefund } = vi.hoisted(() => ({ callRazorpayRefund: vi.fn() }));
vi.mock('../services/refund.service.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, callRazorpayRefund };
});

import Fastify from 'fastify';
import { storeOrderRoutes, __testing } from './store-orders.js';

// QA 2026-10-13 (slice G): customer cancel before shipping, admin refund of a paid store
// order, and the 6-digit Indian pincode on the shipping address.

const BUYER = { id: '11111111-1111-4111-8111-111111111111', email: 'devotee@demo.com', phone: null, fullName: 'Buyer', subscriptionTier: 'free', blocked: false };
const ADMIN = { id: '22222222-2222-4222-8222-222222222222', email: 'admin@demo.com', phone: null, fullName: 'Admin', subscriptionTier: 'free', blocked: false };
const ORDER_ID = '44444444-4444-4444-8444-444444444444';
const PRODUCT_ID = '33333333-3333-4333-8333-333333333333';
const PAY_ID = '55555555-5555-4555-8555-555555555555';

const order = (over: Record<string, unknown> = {}) => ({
  id: ORDER_ID, orderNumber: 'ORD-1', userId: BUYER.id, status: 'CONFIRMED', statusHistory: [], paymentId: PAY_ID,
  totalAmountInr: '169', trackingNumber: null, items: [{ productId: PRODUCT_ID, qty: 2, priceAtPurchase: 60 }],
  user: { fullName: 'Buyer', email: null }, ...over,
});
const payment = (over: Record<string, unknown> = {}) => ({
  id: PAY_ID, status: 'captured', amount: '169', currency: 'INR', gatewayPaymentId: 'pay_x1', refundAmount: null, metadata: {}, ...over,
});

async function call(method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: unknown) {
  const app = Fastify({ logger: false });
  await app.register(storeOrderRoutes, { prefix: '/api/v1/store' });
  const res = await app.inject({ method, url: `/api/v1/store${url}`, headers: { authorization: `Bearer ${token}` }, ...(payload === undefined ? {} : { payload: payload as never }) });
  await app.close();
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ALLOW_DEMO_TOKENS = 'true';
  prismaMock.user.findUnique.mockImplementation(async (a: any) =>
    a.where.email === 'devotee@demo.com' ? BUYER : a.where.email === 'admin@demo.com' ? ADMIN : null,
  );
  prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);
  prismaMock.storeOrder.findUnique.mockResolvedValue(order() as any);
  prismaMock.storeOrder.updateMany.mockResolvedValue({ count: 1 } as any);
  prismaMock.storeOrder.update.mockImplementation(async (a: any) => ({ id: ORDER_ID, ...a.data }));
  prismaMock.payment.findUnique.mockResolvedValue(payment() as any);
  prismaMock.payment.update.mockResolvedValue({} as any);
  prismaMock.commission.updateMany.mockResolvedValue({ count: 1 } as any);
  prismaMock.commission.count.mockResolvedValue(0);
  prismaMock.storeProduct.updateMany.mockResolvedValue({ count: 1 } as any);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
  callRazorpayRefund.mockResolvedValue({ id: 'rfnd_1', status: 'processed' });
});

describe('shipping pincode', () => {
  const base = { fullName: 'A', line1: 'L', city: 'C', state: 'S', country: 'India' };
  it.each(['411001', ' 411001 ', '110001'])('accepts %j', (pincode) => {
    expect(__testing.shippingAddressSchema.safeParse({ ...base, pincode }).success).toBe(true);
  });
  it.each(['41100', '4110011', '41100a', '', '   ', '4 1100 1', '411-001'])('rejects %j', (pincode) => {
    expect(__testing.shippingAddressSchema.safeParse({ ...base, pincode }).success).toBe(false);
  });
  it('trims the stored pincode', () => {
    const r = __testing.shippingAddressSchema.safeParse({ ...base, pincode: ' 411001 ' });
    expect(r.success && r.data.pincode).toBe('411001');
  });
  it('still refuses a non-Indian country', () => {
    expect(__testing.shippingAddressSchema.safeParse({ ...base, pincode: '411001', country: 'US' }).success).toBe(false);
  });
});

describe('POST /orders/:id/cancel (customer)', () => {
  it('cancels a paid, unshipped order: restock, owner earning reversed, refund queued', async () => {
    const res = await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee', { reason: 'changed mind' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ cancelled: true, status: 'CANCELLED', refundOwedInr: 169, refundStatus: 'pending_admin_approval', commissionReversed: 1 });
    expect(prismaMock.storeOrder.updateMany.mock.calls[0]![0]).toMatchObject({ where: { id: ORDER_ID, status: 'CONFIRMED' }, data: { status: 'CANCELLED' } });
    expect(prismaMock.storeProduct.updateMany).toHaveBeenCalledWith({ where: { id: PRODUCT_ID, deletedAt: null }, data: { stock: { increment: 2 } } });
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({ where: { storeOrderId: ORDER_ID, status: 'PENDING' }, data: { status: 'REVERSED' } });
    expect(callRazorpayRefund).not.toHaveBeenCalled();
  });

  it('an unpaid order is cancelled with nothing owed', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'PENDING', paymentId: null }) as any);
    const res = await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee');
    expect(res.json()).toMatchObject({ cancelled: true, refundOwedInr: 0, refundStatus: 'none' });
    expect(prismaMock.storeProduct.updateMany).toHaveBeenCalled();
  });

  it('is idempotent: an already cancelled order is a 200 no-op that touches nothing', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    const res = await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee');
    expect(res.statusCode).toBe(200);
    expect(res.json().alreadyCancelled).toBe(true);
    expect(prismaMock.storeOrder.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.storeProduct.updateMany).not.toHaveBeenCalled();
  });

  it.each(['SHIPPED', 'DELIVERED'])('refuses a %s order with 409', async (status) => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status }) as any);
    const res = await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee');
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('order_not_cancellable');
    expect(prismaMock.storeProduct.updateMany).not.toHaveBeenCalled();
  });

  it('loses a race with a concurrent ship gracefully (claim fails -> 409, no restock)', async () => {
    prismaMock.storeOrder.updateMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.storeOrder.findUnique
      .mockResolvedValueOnce(order() as any)
      .mockResolvedValueOnce({ status: 'SHIPPED' } as any);
    const res = await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee');
    expect(res.statusCode).toBe(409);
    expect(prismaMock.storeProduct.updateMany).not.toHaveBeenCalled();
  });

  it("refuses another customer's order with 403 and a malformed id with 400", async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ userId: 'someone-else' }) as any);
    expect((await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee')).statusCode).toBe(403);
    expect((await call('POST', '/orders/nope/cancel', 'demo-devotee')).statusCode).toBe(400);
  });

  it('404s an unknown order', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/orders/${ORDER_ID}/cancel`, 'demo-devotee')).statusCode).toBe(404);
  });
});

describe('POST /orders/:id/refund (admin)', () => {
  it('default (policy) refunds a CANCELLED paid order in full through the gateway and unwinds the books', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    const res = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', { reason: 'cancelled before shipping' });
    expect(res.statusCode).toBe(200);
    expect(callRazorpayRefund).toHaveBeenCalledWith('pay_x1', 16900, expect.objectContaining({ storeOrderId: ORDER_ID }));
    expect(res.json().refund).toMatchObject({ refundId: 'rfnd_1', amountInr: 169, status: 'REFUNDED' });
    const pay = prismaMock.payment.update.mock.calls.at(-1)![0] as any;
    expect(pay.data).toMatchObject({ status: 'refunded', refundAmount: 169 });
    expect(pay.data.metadata.refundIds).toEqual(['rfnd_1']);
    expect((prismaMock.storeOrder.update.mock.calls.at(-1)![0] as any).data.status).toBe('REFUNDED');
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({ where: { storeOrderId: ORDER_ID, status: 'PENDING' }, data: { status: 'REVERSED' } });
    // already restocked at cancel time: a refund must not restock again
    expect(prismaMock.storeProduct.updateMany).not.toHaveBeenCalled();
  });

  it('policy mode refuses an order that was not cancelled; explicit full is allowed', async () => {
    const r1 = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {});
    expect(r1.statusCode).toBe(409);
    expect(r1.json().code).toBe('order_not_cancelled');
    expect(callRazorpayRefund).not.toHaveBeenCalled();
    const r2 = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', { refundType: 'full' });
    expect(r2.statusCode).toBe(200);
    expect(callRazorpayRefund).toHaveBeenCalledTimes(1);
  });

  it('double-refund guard: a REFUNDED order and a fully refunded payment both skip the gateway', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'REFUNDED' }) as any);
    const a = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', { refundType: 'full' });
    expect(a.json().refund).toMatchObject({ skipped: true, code: 'already_refunded' });
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    prismaMock.payment.findUnique.mockResolvedValue(payment({ refundAmount: '169' }) as any);
    const b = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {});
    expect(b.json().refund).toMatchObject({ skipped: true, code: 'payment_already_refunded' });
    expect(callRazorpayRefund).not.toHaveBeenCalled();
  });

  it('only the still-refundable balance is sent (cumulative refunds)', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    prismaMock.payment.findUnique.mockResolvedValue(payment({ status: 'partially_refunded', refundAmount: '100' }) as any);
    await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {});
    expect(callRazorpayRefund.mock.calls[0]![1]).toBe(6900);
  });

  it('a gateway failure answers 502, changes neither the order nor the payment status, and is audited', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    callRazorpayRefund.mockResolvedValue({ error: { description: 'gateway down' } });
    const res = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {});
    expect(res.statusCode).toBe(502);
    expect(prismaMock.storeOrder.update).not.toHaveBeenCalled();
    expect((prismaMock.payment.update.mock.calls[0]![0] as any).data.status).toBeUndefined();
    const audit = prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => c.join('|')).join('\n');
    expect(audit).toMatch(/refund\.failed/);
  });

  it('refuses an order with no captured online payment (nothing to send back)', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED', paymentId: null }) as any);
    const res = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {});
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('no_captured_payment');
    prismaMock.payment.findUnique.mockResolvedValue(payment({ status: 'initiated' }) as any);
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    expect((await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {})).statusCode).toBe(409);
    expect(callRazorpayRefund).not.toHaveBeenCalled();
  });

  it('a commission already paid out is flagged, never clawed back', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as any);
    prismaMock.commission.count.mockResolvedValue(1);
    const res = await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {});
    expect(res.json().refund).toMatchObject({ commissionReversed: 0, ledgerManualReview: 1 });
  });

  it('rejects partial refunds and extra fields, and is admin only', async () => {
    expect((await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', { refundType: 'partial' })).statusCode).toBe(400);
    expect((await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', { amountInr: 5 })).statusCode).toBe(400);
    expect((await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-devotee', {})).statusCode).toBe(403);
    expect((await call('POST', '/orders/nope/refund', 'demo-admin', {})).statusCode).toBe(400);
    prismaMock.storeOrder.findUnique.mockResolvedValue(null);
    expect((await call('POST', `/orders/${ORDER_ID}/refund`, 'demo-admin', {})).statusCode).toBe(404);
  });
});

describe('POST /orders/:id/refund/reject and the pending queue', () => {
  it('needs a reason, records it on the order and the payment, and refuses a refunded order', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'CANCELLED' }) as any);
    expect((await call('POST', `/orders/${ORDER_ID}/refund/reject`, 'demo-admin', {})).statusCode).toBe(400);
    const ok = await call('POST', `/orders/${ORDER_ID}/refund/reject`, 'demo-admin', { reason: 'Parcel already dispatched' });
    expect(ok.statusCode).toBe(200);
    const hist = (prismaMock.storeOrder.update.mock.calls[0]![0] as any).data.statusHistory;
    expect(hist.at(-1).note).toMatch(/^\[refund-rejected\] Parcel/);
    expect((prismaMock.payment.update.mock.calls[0]![0] as any).data.metadata.refundRejectedReason).toBe('Parcel already dispatched');
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'REFUNDED' }) as any);
    expect((await call('POST', `/orders/${ORDER_ID}/refund/reject`, 'demo-admin', { reason: 'too late' })).statusCode).toBe(409);
  });

  it('the pending queue drops requests already rejected and is admin only', async () => {
    const rejected = order({ status: 'CANCELLED', statusHistory: [{ note: '[refund-rejected] no' }] });
    const open = order({ id: 'o2', status: 'CANCELLED', statusHistory: [{ note: 'Cancelled by customer [refund-requested]' }] });
    prismaMock.storeOrder.findMany.mockResolvedValue([rejected, open] as any);
    const res = await call('GET', '/orders/refunds/pending', 'demo-admin');
    expect(res.json().data.map((o: any) => o.id)).toEqual(['o2']);
    expect((await call('GET', '/orders/refunds/pending', 'demo-devotee')).statusCode).toBe(403);
  });
});

describe('PATCH /orders/:id/status cannot fake a refund of an online payment', () => {
  it('refuses REFUNDED for an order whose payment is captured', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'DELIVERED' }) as any);
    const res = await call('PATCH', `/orders/${ORDER_ID}/status`, 'demo-admin', { status: 'REFUNDED' });
    expect(res.statusCode).toBe(409);
    expect(res.json().code).toBe('use_refund_endpoint');
    expect(prismaMock.storeOrder.update).not.toHaveBeenCalled();
  });

  it('still allows REFUNDED when no online payment was captured (cash on delivery)', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order({ status: 'DELIVERED', paymentId: null }) as any);
    const res = await call('PATCH', `/orders/${ORDER_ID}/status`, 'demo-admin', { status: 'REFUNDED' });
    expect(res.statusCode).toBe(200);
  });
});
