import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-13 (F453) — the store-order rail is the fourth money rail, and it had no
 * trail at all.
 *
 * OPS-05 wired thirteen call sites across payment / refund / payout /
 * commission / donation. The store-order rail was left out on purpose:
 * `store.service.ts`, `store-orders.ts` and `store.ts` were dirty from another
 * session, and wiring audit calls into a rail being rewritten is how two
 * sessions destroy each other's work. The intent was never in doubt —
 * `MoneySubjectType` has declared `'store_order'` since OPS-05 landed
 * (lib/audit-money.ts:109) and the WEBHOOK store rail already records
 * PAYMENT_CAPTURED against it (payment.service.ts:1580).
 *
 * What had no coverage is the CLIENT rail, both halves of it:
 *
 *   :1034 createStoreOrderRazorpay  opens a real Razorpay order and writes a
 *                                   Payment row at `initiated` — no
 *                                   PAYMENT_INITIATED.
 *   :1129 verifyStoreOrderPayment   captures the Payment, flips the StoreOrder
 *                                   to CONFIRMED and mints the store owner's
 *                                   commission — no PAYMENT_VERIFIED and no
 *                                   COMMISSION_MINTED.
 *
 * So for a disputed store order nothing in the product could say when checkout
 * opened, which rail confirmed it, or that an owner had been credited.
 *
 * THE POST-COMMIT RULE IS THE POINT, AND IT IS TESTED IN BOTH DIRECTIONS.
 * `recordMoneyEvent` takes no `tx` deliberately (lib/audit-money-callsites.ts:19)
 * because a failed audit INSERT inside the caller's transaction aborts the whole
 * Postgres transaction — Prisma issues no per-query savepoint, so catching in
 * JavaScript does not recover it. An audit row is evidence about money; it may
 * never become a reason to lose the money. Two separate properties follow, and
 * one does not imply the other:
 *
 *   (a) the event is written AFTER the money transaction commits;
 *   (b) a THROWING audit writer cannot roll the money write back.
 *
 * A call site could satisfy (a) and still fail (b) by `await`ing a rejecting
 * writer outside the transaction and letting the rejection escape the method.
 * Both are asserted below.
 *
 * NON-VACUITY. Against pre-fix HEAD every assertion in the first two describe
 * blocks fails with `expected [] to have a length of 1` — no store-order money
 * event of any type was recorded, because there were no call sites. The
 * post-commit and audit-cannot-roll-back tests are vacuous pre-fix for the same
 * reason (nothing to order, nothing to throw from), which is why they are
 * written against the fixed call sites and confirmed by inverting the fix — see
 * the report.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

// MONEY_EVENTS stays real — asserting the literal event string would let a
// renamed constant pass a test that no longer describes the shipped event.
vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

const generateInvoiceMock = vi.fn().mockResolvedValue(Buffer.from('%PDF-1.4 mock'));
const sendEmailMock = vi.fn().mockResolvedValue(undefined);
vi.mock('../lib/pdf-invoice.js', () => ({ generateInvoice: generateInvoiceMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: sendEmailMock }));

const ORIG_ENV = { ...process.env };

beforeAll(async () => {
  vi.resetModules();
  await import('./payment.service.js');
}, 120_000);

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
  // Default: pass the tx callback the same mock client, as the real client does.
  prismaMock.$transaction.mockImplementation(((fn: (tx: unknown) => Promise<unknown>) =>
    fn(prismaMock)) as never);
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

function recordedEvents(): Array<Record<string, unknown>> {
  return recordMoneyEventSpy.mock.calls.map(
    (c) => (c as unknown as [Record<string, unknown>])[0],
  );
}

function eventsOfType(type: string): Array<Record<string, unknown>> {
  return recordedEvents().filter((e) => e.eventType === type);
}

/** A PENDING store order ready for checkout. */
function arrangePendingOrder() {
  prismaMock.storeOrder.findUnique.mockResolvedValue({
    id: 'so-1',
    orderNumber: 'ORD-9001',
    userId: 'user-1',
    status: 'PENDING',
    totalAmountInr: 1234.5,
    paymentId: null,
  } as never);
  prismaMock.payment.create.mockResolvedValue({ id: 'pmt-new' } as never);
  prismaMock.storeOrder.update.mockResolvedValue({} as never);
}

/** A verified checkout whose transaction captures, confirms and mints. */
function arrangeVerifiableOrder() {
  prismaMock.payment.findFirst.mockResolvedValue({
    id: 'pmt-1',
    amount: 1234.5,
    currency: 'INR',
    status: 'initiated',
    storeOrders: [
      {
        id: 'so-1',
        orderNumber: 'ORD-9001',
        status: 'PENDING',
        statusHistory: [],
        userId: 'user-1',
      },
    ],
  } as never);
  prismaMock.payment.update.mockResolvedValue({} as never);
  prismaMock.storeOrder.update.mockResolvedValue({} as never);
  // `commission.findFirst` is read TWICE per verify, and the two reads must
  // answer differently or the directional tests below stop testing anything:
  //   1. inside the tx, by writeStoreOrderCommission's idempotency guard — it
  //      must see NOTHING, or it returns early and never mints;
  //   2. after commit, by recordStoreOrderCommissionMinted — it must SEE the
  //      row, or the helper returns early, records no event, and every
  //      assertion about when the event lands passes vacuously.
  prismaMock.commission.findFirst.mockReset();
  prismaMock.commission.findFirst
    .mockResolvedValueOnce(null as never)
    .mockResolvedValue({
      id: 'cm-store-1',
      amount: 987.6,
      providerId: 'store-owner-1',
    } as never);
  prismaMock.storeOrder.findUnique.mockResolvedValue({
    id: 'so-1',
    orderNumber: 'ORD-9001',
    totalAmountInr: 1234.5,
    items: [{ productId: 'p-1', qty: 1, priceAtPurchase: 1234.5, name: 'Diya' }],
    storeProfileId: 'sp-1',
    user: { fullName: 'User One', email: 'user-1@example.com' },
    shippingAddress: {
      fullName: 'User One',
      line1: '12 Ashok Rd',
      city: 'Delhi',
      pincode: '110001',
      country: 'India',
    },
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
  } as never);
  prismaMock.storeProfile.findUnique.mockResolvedValue({
    userId: 'store-owner-1',
    commission: 0.2,
  } as never);
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 } as never);
}

describe('OPS-13 — the store-order checkout open is on the money trail', () => {
  it('records PAYMENT_INITIATED when a Razorpay order is opened for a store order', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangePendingOrder();

    const out = await service.createStoreOrderRazorpay('so-1', 'user-1');

    const initiated = eventsOfType(MONEY_EVENTS.PAYMENT_INITIATED);
    expect(initiated).toHaveLength(1);

    const event = initiated[0]!;
    // The subject is the ORDER, matching the store rail's existing webhook
    // event at payment.service.ts:1583 rather than the puja rail's 'payment'.
    expect(event.subjectType).toBe('store_order');
    expect(event.subjectId).toBe('so-1');
    expect(event.paymentId).toBe('pmt-new');
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe('user-1');
    expect(event.statusAfter).toBe('initiated');
    // RUPEES off the stored DECIMAL(10,2) — never the paise figure handed to
    // the gateway, which both overflows the column and breaks summing.
    expect(String(event.amount)).toBe('1234.5');
    expect(event.gatewayOrderId).toBe(out.orderId);
    expect(event.idempotencyKey).toBe(out.orderId);
  });

  it('records nothing when the idempotent reuse path returns an existing order', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-9001',
      userId: 'user-1',
      status: 'PENDING',
      totalAmountInr: 500,
      paymentId: 'pmt-existing',
    } as never);
    prismaMock.payment.findUnique.mockResolvedValue({
      id: 'pmt-existing',
      gatewayOrderId: 'order_existing_xyz',
      status: 'initiated',
      amount: 500,
      currency: 'INR',
    } as never);

    await service.createStoreOrderRazorpay('so-1', 'user-1');

    // A refresh mid-checkout opens no order and writes no Payment row. An
    // event here would put one checkout on the trail once per page reload.
    expect(recordedEvents()).toEqual([]);
  });

  it('records nothing when a guard rejects before any row is written', async () => {
    const service = await loadService();
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: 'so-1',
      orderNumber: 'ORD-9001',
      userId: 'owner-1',
      status: 'PENDING',
      totalAmountInr: 500,
      paymentId: null,
    } as never);

    await expect(service.createStoreOrderRazorpay('so-1', 'attacker')).rejects.toThrow(
      /not authorized/,
    );
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });
});

describe('OPS-13 — the store-order capture and the owner’s earning are on the trail', () => {
  it('records PAYMENT_VERIFIED for the client-verify rail', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangeVerifiableOrder();

    await service.verifyStoreOrderPayment('order_demo_x', 'pay_Rx01', 'demo', 'user-1');

    const verified = eventsOfType(MONEY_EVENTS.PAYMENT_VERIFIED);
    expect(verified).toHaveLength(1);

    const event = verified[0]!;
    expect(event.subjectType).toBe('store_order');
    expect(event.subjectId).toBe('so-1');
    expect(event.paymentId).toBe('pmt-1');
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe('user-1');
    // The pre-image the mutable status column can never answer afterwards —
    // the one fact that separates "verified then captured" from "captured twice".
    expect(event.statusBefore).toBe('initiated');
    expect(event.statusAfter).toBe('captured');
    expect(event.gatewayPaymentId).toBe('pay_Rx01');
    expect(event.idempotencyKey).toBe('pay_Rx01');
  });

  it('does NOT record PAYMENT_CAPTURED on the client rail — that key belongs to the webhook', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangeVerifiableOrder();

    await service.verifyStoreOrderPayment('order_demo_x', 'pay_Rx01', 'demo', 'user-1');

    // Both rails would key PAYMENT_CAPTURED on the same razorpay_payment_id,
    // and recordMoneyEvent's key is ON CONFLICT DO NOTHING — so a capture event
    // from here would silently ERASE the webhook's, which is the row that
    // records the gateway as the actor. The puja client rail makes the same
    // choice (payment.service.ts:987): VERIFIED here, CAPTURED from the webhook.
    expect(eventsOfType(MONEY_EVENTS.PAYMENT_CAPTURED)).toEqual([]);
  });

  it('records COMMISSION_MINTED for the store owner’s earning', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangeVerifiableOrder(); // arranges the in-tx miss + the post-commit re-read

    await service.verifyStoreOrderPayment('order_demo_x', 'pay_Rx01', 'demo', 'user-1');

    const minted = eventsOfType(MONEY_EVENTS.COMMISSION_MINTED);
    expect(minted).toHaveLength(1);

    const event = minted[0]!;
    expect(event.subjectType).toBe('commission');
    expect(event.subjectId).toBe('cm-store-1');
    expect(event.commissionId).toBe('cm-store-1');
    // Commission.amount is the PROVIDER's earning in rupees — here the store
    // owner's 80% of 1234.50, not the platform's cut and not the order total.
    expect(String(event.amount)).toBe('987.6');
    expect(event.idempotencyKey).toBe('cm-store-1');
  });

  it('claims no mint when the order was already CONFIRMED (no commission written)', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const service = await loadService();
    arrangeVerifiableOrder();
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      amount: 1234.5,
      currency: 'INR',
      status: 'captured',
      storeOrders: [
        {
          id: 'so-1',
          orderNumber: 'ORD-9001',
          status: 'CONFIRMED', // shouldConfirm === false
          statusHistory: [],
          userId: 'user-1',
        },
      ],
    } as never);

    await service.verifyStoreOrderPayment('order_demo_x', 'pay_Rx01', 'demo', 'user-1');

    // No commission was minted by THIS call, so none may be claimed. The
    // verification itself still happened and is still recorded.
    expect(eventsOfType(MONEY_EVENTS.COMMISSION_MINTED)).toEqual([]);
    expect(eventsOfType(MONEY_EVENTS.PAYMENT_VERIFIED)).toHaveLength(1);
  });
});

describe('OPS-13 — the trail is written after the money, and can never undo it', () => {
  it('writes no event until the capture transaction has committed', async () => {
    const service = await loadService();
    arrangeVerifiableOrder();

    let eventsSeenInsideTx = -1;
    prismaMock.$transaction.mockImplementation((async (fn: (tx: unknown) => Promise<unknown>) => {
      const out = await fn(prismaMock);
      // Sampled at the last moment INSIDE the transaction callback. An audit
      // INSERT that failed here would abort the whole Postgres transaction and
      // roll the capture back with it, so the count must still be zero.
      eventsSeenInsideTx = recordMoneyEventSpy.mock.calls.length;
      return out;
    }) as never);

    await service.verifyStoreOrderPayment('order_demo_x', 'pay_Rx01', 'demo', 'user-1');

    expect(eventsSeenInsideTx).toBe(0);
    // ...and they are there once it committed.
    expect(recordMoneyEventSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it('a THROWING audit writer cannot roll back the capture', async () => {
    const service = await loadService();
    arrangeVerifiableOrder();
    // recordMoneyEvent is contractually non-throwing, but a call site that
    // awaited a rejecting writer would still take the money path down with it.
    // Every store-order call site must survive this.
    recordMoneyEventSpy.mockRejectedValue(new Error('money_audit_events does not exist') as never);

    const out = await service.verifyStoreOrderPayment(
      'order_demo_x',
      'pay_Rx01',
      'demo',
      'user-1',
    );

    // The money write stands.
    expect(out).toEqual({ verified: true, storeOrderId: 'so-1', orderNumber: 'ORD-9001' });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pmt-1' },
        data: expect.objectContaining({ status: 'captured' }),
      }),
    );
    expect(prismaMock.storeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'so-1' },
        data: expect.objectContaining({ status: 'CONFIRMED' }),
      }),
    );
    expect(prismaMock.commission.createMany).toHaveBeenCalled();
  });

  it('a THROWING audit writer cannot fail the checkout open either', async () => {
    const service = await loadService();
    arrangePendingOrder();
    recordMoneyEventSpy.mockRejectedValue(new Error('money_audit_events does not exist') as never);

    const out = await service.createStoreOrderRazorpay('so-1', 'user-1');

    expect(out.paymentId).toBe('pmt-new');
    expect(prismaMock.storeOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'so-1' }, data: { paymentId: 'pmt-new' } }),
    );
  });
});
