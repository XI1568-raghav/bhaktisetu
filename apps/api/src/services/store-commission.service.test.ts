/**
 * store-commission.service — store attribution and the money it decides.
 *
 * The bug these tests were written for: the writer resolved the owning store by
 * looking up the order's FIRST LINE ITEM'S PRODUCT, and `DELETE
 * /store-admin/products/:id` hard-deleted products. Delete a product that heads
 * an unconfirmed order and the lookup returns null, the writer returns early,
 * and no Commission row is ever written — the store owner is silently never
 * paid, while the order still shows on their dashboard (which reads
 * `store_orders.store_profile_id`, the FK migration 20260709020000 added for
 * exactly this).
 *
 * That route soft deletes now (see store-admin.product-soft-delete.test.ts), so
 * it can no longer strand an order this way. These tests stay because products
 * hard-deleted before that change are permanently gone, and because the reason
 * to read the FK is not "deletes are dangerous" but "the order already knows".
 *
 * The order carries `storeProfileId` itself since 2026-07-09. Read that, and
 * fall back to the product only for legacy rows predating it.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { writeStoreOrderCommission } from './store-commission.service.js';

const ORDER_ID = 'so-1';
const STORE_ID = 'sp-1';
const OWNER_ID = 'user-owner';

/** The single row commission.createMany was asked to insert. */
function insertedRow() {
  expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
  // `noUncheckedIndexedAccess` is on: indexing the mock's call list yields
  // `T | undefined`, and the toHaveBeenCalledTimes(1) above does not narrow it
  // for the type checker. Assert rather than cast, so a genuinely missing call
  // fails with a readable message instead of a runtime TypeError.
  const call = prismaMock.commission.createMany.mock.calls[0];
  expect(call, 'commission.createMany was not called').toBeDefined();
  const arg = call![0];
  expect(arg.skipDuplicates, 'DI-06: the insert must stay conflict-tolerant').toBe(true);
  expect(arg.data).toHaveLength(1);
  return arg.data[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.commission.findFirst.mockResolvedValue(null);
  prismaMock.storeProfile.findUnique.mockResolvedValue({ userId: OWNER_ID, commission: 0.2 });
  prismaMock.commission.createMany.mockResolvedValue({ count: 1 });
});

describe('writeStoreOrderCommission', () => {
  it('resolves the store from the order itself, without touching the product', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal(1000),
      storeProfileId: STORE_ID,
      items: [{ productId: 'prod-1', qty: 1, priceAtPurchase: 1000 }],
    });

    await writeStoreOrderCommission(ORDER_ID);

    expect(
      prismaMock.storeProduct.findUnique,
      'the order knows its own store — the product lookup is legacy-only',
    ).not.toHaveBeenCalled();
    expect(prismaMock.storeProfile.findUnique).toHaveBeenCalledWith({
      where: { id: STORE_ID },
      select: { userId: true, commission: true },
    });
    expect(insertedRow()).toMatchObject({ storeOrderId: ORDER_ID, providerId: OWNER_ID });
  });

  it('still pays the owner when the order\'s first product has been deleted', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal(1000),
      storeProfileId: STORE_ID,
      items: [{ productId: 'deleted-product', qty: 1, priceAtPurchase: 1000 }],
    });
    // A product hard-deleted before 2026-09-02: the row is simply gone.
    prismaMock.storeProduct.findUnique.mockResolvedValue(null);

    await writeStoreOrderCommission(ORDER_ID);

    const row = insertedRow();
    expect(row.providerId).toBe(OWNER_ID);
    expect(new Prisma.Decimal(row.amount).toString()).toBe('800');
  });

  it('falls back to the first line item for legacy rows with no storeProfileId', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal(1000),
      storeProfileId: null, // pre-2026-07-09, and the backfill never ran
      items: [{ productId: 'prod-1', qty: 1, priceAtPurchase: 1000 }],
    });
    prismaMock.storeProduct.findUnique.mockResolvedValue({ storeProfileId: STORE_ID });

    await writeStoreOrderCommission(ORDER_ID);

    expect(prismaMock.storeProduct.findUnique).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      select: { storeProfileId: true },
    });
    expect(insertedRow()).toMatchObject({ providerId: OWNER_ID });
  });

  it('writes nothing when neither the order nor the product names a store', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal(1000),
      storeProfileId: null,
      items: [{ productId: 'deleted-product', qty: 1, priceAtPurchase: 1000 }],
    });
    prismaMock.storeProduct.findUnique.mockResolvedValue(null);

    await writeStoreOrderCommission(ORDER_ID);

    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('is idempotent — a second confirm does not double-write', async () => {
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'com-existing' });

    await writeStoreOrderCommission(ORDER_ID);

    expect(prismaMock.storeOrder.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('writes the doctrine columns: amount = provider earning, percentage = platform rate', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal('999.99'),
      storeProfileId: STORE_ID,
      items: [],
    });
    prismaMock.storeProfile.findUnique.mockResolvedValue({
      userId: OWNER_ID,
      commission: new Prisma.Decimal('0.2000'),
    });

    await writeStoreOrderCommission(ORDER_ID);

    const row = insertedRow();
    // 999.99 * (1 - 0.20). Exact in Decimal; 799.9920000000001 in JS float.
    expect(new Prisma.Decimal(row.amount).toString()).toBe('799.992');
    expect(new Prisma.Decimal(row.percentage).toString()).toBe('0.2');
    expect(row.status).toBe('PENDING');
  });

  it('an empty cart still resolves through the order, and costs no product lookup', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal(500),
      storeProfileId: STORE_ID,
      items: [],
    });

    await writeStoreOrderCommission(ORDER_ID);

    expect(prismaMock.storeProduct.findUnique).not.toHaveBeenCalled();
    expect(insertedRow()).toMatchObject({ providerId: OWNER_ID });
  });

  it('records a zero rate for a zero-total order rather than a phantom take', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue({
      id: ORDER_ID,
      totalAmountInr: new Prisma.Decimal(0),
      storeProfileId: STORE_ID,
      items: [],
    });

    await writeStoreOrderCommission(ORDER_ID);

    const row = insertedRow();
    expect(new Prisma.Decimal(row.amount).toString()).toBe('0');
    expect(new Prisma.Decimal(row.percentage).toString()).toBe('0');
  });
});

/**
 * Customer test 2026-10-05 (store owner). A cash-on-delivery order has no
 * payment: the seller collects the cash. Confirming it from the seller's status
 * screen still wrote an 80% Commission the platform would then pay out, so a COD
 * order for Rs 289 made the platform owe Rs 231.20 it never received (and a store
 * owner could place and confirm COD orders to themselves, then request payouts).
 * The manual-confirm path now asks for `requirePayment`; the Razorpay paths,
 * where the capture is the payment, are unchanged.
 */
describe('writeStoreOrderCommission with requirePayment (manual/COD confirm)', () => {
  const order = (paymentId: string | null) => ({
    id: ORDER_ID,
    paymentId,
    totalAmountInr: new Prisma.Decimal(289),
    storeProfileId: STORE_ID,
    items: [],
  });

  it('writes nothing when the order has no payment', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order(null));
    await writeStoreOrderCommission(ORDER_ID, prismaMock as never, { requirePayment: true });
    expect(prismaMock.commission.createMany).not.toHaveBeenCalled();
  });

  it('still writes when the order carries a payment', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order('pay-1'));
    await writeStoreOrderCommission(ORDER_ID, prismaMock as never, { requirePayment: true });
    expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
  });

  it('without the option, behaviour is unchanged (payment paths)', async () => {
    prismaMock.storeOrder.findUnique.mockResolvedValue(order(null));
    await writeStoreOrderCommission(ORDER_ID);
    expect(prismaMock.commission.createMany).toHaveBeenCalledTimes(1);
  });
});
