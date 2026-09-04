import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// generateInvoice + sendEmail are side-effectful (PDF + SMTP). Mock them so
// the test asserts the invoice path was actually reached instead of silently
// swallowing a TypeError from an unmocked storeOrder.findUnique.
const generateInvoiceMock = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock'));
const sendEmailMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../lib/pdf-invoice.js', () => ({ generateInvoice: generateInvoiceMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: sendEmailMock }));

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

// The first dynamic import transpiles the whole payment.service dependency tree,
// which on a loaded machine costs longer than the 30s default timeout. Without
// this, that cost is billed to whichever test happens to run first — here
// 'throws when store order does not exist', which then fails as a timeout while
// asserting something unrelated. Same fix already applied in payment.service.test.ts.
beforeAll(async () => {
  vi.resetModules();
  await import('./payment.service.js');
}, 120_000);

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

// ─── createStoreOrderRazorpay ──────────────────────────────────────────────────

describe('PaymentService.createStoreOrderRazorpay', () => {
  it('throws when store order does not exist', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue(null);

    await expect(service.createStoreOrderRazorpay('missing', 'user-1')).rejects.toThrow(
      /Store order not found/,
    );
  });

  it('throws when caller is not the owner (forged :id guard)', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-1',
      userId: 'owner-1',
      status: 'PENDING',
      totalAmountInr: 500,
      paymentId: null,
    });

    await expect(service.createStoreOrderRazorpay('so-1', 'attacker')).rejects.toThrow(
      /not authorized/,
    );
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('refuses to re-initiate for a non-PENDING order', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-1',
      userId: 'user-1',
      status: 'CONFIRMED',
      totalAmountInr: 500,
      paymentId: null,
    });

    await expect(service.createStoreOrderRazorpay('so-1', 'user-1')).rejects.toThrow(/PENDING/);
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
  });

  it('reuses existing initiated Payment (idempotency on refresh)', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-1',
      userId: 'user-1',
      status: 'PENDING',
      totalAmountInr: 500,
      paymentId: 'pmt-existing',
    });
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'pmt-existing',
      gatewayOrderId: 'order_existing_xyz',
      status: 'initiated',
      amount: 500,
      currency: 'INR',
    });

    const out = await service.createStoreOrderRazorpay('so-1', 'user-1');

    expect(out).toEqual({
      orderId: 'order_existing_xyz',
      amount: 50000, // paise
      currency: 'INR',
      paymentId: 'pmt-existing',
      razorpayKeyId: 'rzp_test_demo',
    });
    expect(prismaMock.payment.create).not.toHaveBeenCalled();
    expect(prismaMock.storeOrder.update).not.toHaveBeenCalled();
  });

  it('creates Razorpay order + Payment row + links via storeOrder.update', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-1',
      userId: 'user-1',
      status: 'PENDING',
      totalAmountInr: 1234.5,
      paymentId: null,
    });
    prismaMock.payment.create.mockResolvedValue({ id: 'pmt-new' });
    prismaMock.storeOrder.update.mockResolvedValue({});

    const out = await service.createStoreOrderRazorpay('so-1', 'user-1');

    // Demo proxy returns id `order_demo_<ts>` — assert prefix only.
    expect(out.orderId).toMatch(/^order_demo_/);
    expect(out.amount).toBe(123450); // 1234.50 INR → paise
    expect(out.currency).toBe('INR');
    expect(out.paymentId).toBe('pmt-new');
    expect(out.razorpayKeyId).toBe('rzp_test_demo');

    expect(prismaMock.payment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          paymentGateway: 'razorpay',
          status: 'initiated',
          currency: 'INR',
        }),
      }),
    );
    expect(prismaMock.storeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'so-1' },
        data: { paymentId: 'pmt-new' },
      }),
    );
  });
});

// ─── verifyStoreOrderPayment ───────────────────────────────────────────────────

describe('PaymentService.verifyStoreOrderPayment', () => {
  // Dedicated loader for non-demo mode so signature check actually fires.
  async function loadServiceLive() {
    vi.resetModules();
    process.env.RAZORPAY_KEY_ID = 'rzp_live_test';
    process.env.RAZORPAY_KEY_SECRET = 'live_secret_key';
    const mod = await import('./payment.service.js');
    return new mod.PaymentService();
  }

  it('throws on invalid signature in live mode', async () => {
    const service = await loadServiceLive();
    await expect(
      service.verifyStoreOrderPayment('order_x', 'pay_x', 'wrong_sig', 'user-1'),
    ).rejects.toThrow(/invalid signature/);
    // Reset to demo for subsequent tests in this describe block.
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  });

  it('rejects a non-demo order id in demo mode (P0 #S-05)', async () => {
    const service = await loadService();
    // A real-looking order id must not be confirmable via the demo path even
    // with the demo signature sentinel.
    await expect(
      service.verifyStoreOrderPayment('order_real_xyz', 'pay_x', 'demo', 'user-1'),
    ).rejects.toThrow(/invalid demo signature/);
  });

  it('rejects the wrong demo signature sentinel (P0 #S-05)', async () => {
    const service = await loadService();
    await expect(
      service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'not-demo', 'user-1'),
    ).rejects.toThrow(/invalid demo signature/);
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  });

  it('throws when no payment record matches the gateway order id', async () => {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'demo', 'user-1'),
    ).rejects.toThrow(/Payment record not found/);
  });

  it('throws when payment has no linked store order', async () => {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      storeOrders: [],
    });

    await expect(
      service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'demo', 'user-1'),
    ).rejects.toThrow(/No store order linked/);
  });

  it('throws when caller is not the order owner', async () => {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      storeOrders: [
        {
          id: 'so-1',
          orderNumber: 'ORD-1',
          status: 'PENDING',
          statusHistory: [],
          userId: 'owner-1',
        },
      ],
    });

    await expect(
      service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'demo', 'attacker'),
    ).rejects.toThrow(/not authorized/);
    expect(prismaMock.payment.update).not.toHaveBeenCalled();
    expect(prismaMock.storeOrder.update).not.toHaveBeenCalled();
  });

  it('captures payment + flips PENDING→CONFIRMED + appends statusHistory', async () => {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      storeOrders: [
        {
          id: 'so-1',
          orderNumber: 'ORD-1',
          status: 'PENDING',
          statusHistory: [{ status: 'PENDING', changedAt: '2026-05-01T00:00:00.000Z' }],
          userId: 'user-1',
        },
      ],
    });
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.storeOrder.update.mockResolvedValue({});
    // sendStoreOrderInvoice reads the full order + user. Previously this was
    // unmocked → findUnique returned undefined → TypeError swallowed by the
    // invoice's try/catch → test passed but the invoice path had ZERO real
    // coverage. Mock it now so the fire-and-forget invoice actually runs.
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-1',
      user: { fullName: 'User One', email: 'user-1@example.com' },
      items: [{ productId: 'p-1', qty: 2, priceAtPurchase: 250, name: 'Diya' }],
      shippingAddress: {
        fullName: 'User One',
        line1: '12 Ashok Rd',
        city: 'Delhi',
        pincode: '110001',
        country: 'India',
      },
      totalAmountInr: 500,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    // writeStoreOrderCommissionOnConfirm walks product → storeProfile →
    // commission.create. Mock the chain so the tx callback completes.
    prismaMock.storeProduct.findUnique.mockResolvedValue({ storeProfileId: 'sp-1' });
    prismaMock.storeProfile.findUnique.mockResolvedValue({
      userId: 'store-owner-1',
      commission: 0.2,
    });
    prismaMock.commission.create.mockResolvedValue({});
    generateInvoiceMock.mockClear();
    sendEmailMock.mockClear();

    const out = await service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'demo', 'user-1');

    expect(out).toEqual({
      verified: true,
      storeOrderId: 'so-1',
      orderNumber: 'ORD-1',
    });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pmt-1' },
        data: { status: 'captured', gatewayPaymentId: 'pay_x' },
      }),
    );
    const updateArgs = prismaMock.storeOrder.update.mock.calls[0]![0];
    expect(updateArgs.where).toEqual({ id: 'so-1' });
    expect(updateArgs.data.status).toBe('CONFIRMED');
    expect(updateArgs.data.statusHistory).toHaveLength(2);
    expect(updateArgs.data.statusHistory[1]).toMatchObject({
      status: 'CONFIRMED',
      changedBy: 'user-1',
      note: 'Razorpay payment verified',
    });
    // The invoice is fired `void` (fire-and-forget). Flush the microtask queue
    // so the assertion sees the sendEmail call. This is the line that would
    // have caught the swallowed TypeError before this fix.
    await new Promise((resolve) => setImmediate(resolve));
    expect(generateInvoiceMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0]![0]).toMatchObject({
      to: 'user-1@example.com',
      subject: 'Darshya payment receipt — ORD-1',
    });
    // LEG-10: the attached PDF is a payment receipt, not a statutory GST tax
    // invoice — Darshya has no GSTIN, so calling it one in the subject line
    // told the customer they had received a document we cannot legally issue.
    // Fixing the PDF alone was not enough; the mail that carries it must not
    // re-introduce the claim.
    expect(sendEmailMock.mock.calls[0]![0].subject).not.toMatch(/tax invoice/i);
  });

  it('does not re-flip an already CONFIRMED order (replay safety)', async () => {
    const service = await loadService();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      storeOrders: [
        {
          id: 'so-1',
          orderNumber: 'ORD-1',
          status: 'CONFIRMED',
          statusHistory: [],
          userId: 'user-1',
        },
      ],
    });
    prismaMock.payment.update.mockResolvedValue({});

    await service.verifyStoreOrderPayment('order_demo_x', 'pay_x', 'demo', 'user-1');

    expect(prismaMock.payment.update).toHaveBeenCalled();
    expect(prismaMock.storeOrder.update).not.toHaveBeenCalled();
  });

  it('accepts valid HMAC signature in live mode', async () => {
    const service = await loadServiceLive();
    const sig = hmacHex('live_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      storeOrders: [
        {
          id: 'so-1',
          orderNumber: 'ORD-1',
          status: 'PENDING',
          statusHistory: [],
          userId: 'user-1',
        },
      ],
    });
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.storeOrder.update.mockResolvedValue({});
    // Commission chain + invoice fire-and-forget both run on the CONFIRMED
    // path — mock them so the tx callback + invoice don't throw unhandled.
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-1',
      user: { fullName: 'User One', email: 'user-1@example.com' },
      items: [{ productId: 'p-1', qty: 1, priceAtPurchase: 100, name: 'Diya' }],
      shippingAddress: { city: 'Delhi' },
      totalAmountInr: 100,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    prismaMock.storeProduct.findUnique.mockResolvedValue({ storeProfileId: 'sp-1' });
    prismaMock.storeProfile.findUnique.mockResolvedValue({
      userId: 'store-owner-1',
      commission: 0.2,
    });
    prismaMock.commission.create.mockResolvedValue({});

    const out = await service.verifyStoreOrderPayment('order_x', 'pay_x', sig, 'user-1');
    expect(out.verified).toBe(true);
    process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
    process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  });
});
