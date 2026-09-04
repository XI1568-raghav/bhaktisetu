/**
 * store-commission.service.ts — single shared writer for store-order
 * commission rows (store-owner revamp 2026-08-05).
 *
 * WHY: store commissions only wrote on the Razorpay-verify path
 * (payment.service writeStoreOrderCommissionOnConfirm). The COD path and the
 * admin manual payment-confirm path flipped orders to CONFIRMED with NO
 * Commission row — those orders leaked from the store owner's earnings ledger.
 *
 * This helper is idempotent (findFirst on storeOrderId) and callable from any
 * confirm path. The amount written is the STORE OWNER's share
 * (total * (1 - platformRate)); percentage is the platform's rate for the
 * ledger. storeProfile.commission defaults to 0.20 (20% platform / 80% owner)
 * — competitive with Amazon/Flipkart's 5-15% + closing/shipping/GST stack
 * (effective 20-30%) and far below service-marketplace splits.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

type TxClient = Prisma.TransactionClient | typeof prisma;

export async function writeStoreOrderCommission(
  storeOrderId: string,
  tx: TxClient = prisma,
): Promise<void> {
  const existing = await tx.commission.findFirst({
    where: { storeOrderId },
    select: { id: true },
  });
  if (existing) return;

  const order = await tx.storeOrder.findUnique({
    where: { id: storeOrderId },
    select: { id: true, totalAmountInr: true, items: true, storeProfileId: true },
  });
  if (!order) return;

  // Attribution comes off the order itself. P0 #S-11 (migration
  // 20260709020000) added `store_orders.store_profile_id` for exactly this, and
  // routes/store-orders.ts has written it at order creation since 2026-07-09.
  //
  // The old route — first line item -> product -> store — is not merely
  // indirect, it loses money: DELETE /store-admin/products/:id hard-deletes,
  // so deleting a product that heads an unconfirmed order made this lookup
  // return null and this function return early with NO Commission row. The
  // owner was then never paid, while the order still appeared on their
  // dashboard, which reads the FK. Keep the product path for legacy rows only.
  let storeProfileId = order.storeProfileId;
  if (!storeProfileId) {
    // Orders predating S-11. The migration's own backfill never populated them:
    // its UPDATE could not parse until 2026-09-02 (see the migration file), so
    // these rows are resolvable only through their line items.
    const items = Array.isArray(order.items) ? (order.items as Array<{ productId?: string }>) : [];
    const firstProductId = items.find((it) => it?.productId)?.productId;
    if (!firstProductId) return;

    const product = await tx.storeProduct.findUnique({
      where: { id: firstProductId },
      select: { storeProfileId: true },
    });
    if (!product?.storeProfileId) return;
    storeProfileId = product.storeProfileId;
  }

  const storeProfile = await tx.storeProfile.findUnique({
    where: { id: storeProfileId },
    select: { userId: true, commission: true },
  });
  if (!storeProfile) return;

  const total = new Prisma.Decimal(order.totalAmountInr as Prisma.Decimal);
  const platformRate = new Prisma.Decimal(storeProfile.commission as Prisma.Decimal);
  const storeShare = total.mul(new Prisma.Decimal(1).minus(platformRate));
  const percentage = total.gt(0) ? platformRate : new Prisma.Decimal(0);

  // DI-06 (F367): `createMany({ skipDuplicates })`, not `create`. Migration
  // 20260824000000 adds UNIQUE `commissions_store_order_id_key`, and this
  // writer runs inside the caller's `$transaction` — a bare INSERT losing that
  // race would raise 23505/P2002, and a statement error aborts the whole
  // Postgres transaction (Prisma issues no savepoint), rolling back a real
  // capture. `skipDuplicates` compiles to ON CONFLICT DO NOTHING, which is not
  // an error, so the loser writes nothing and the transaction survives. Where
  // the constraint is absent this is byte-for-byte the old behaviour. The full
  // rationale lives at payment.service.writePujaCommissionOnConfirm.
  await tx.commission.createMany({
    data: [
      {
        storeOrderId: order.id,
        providerId: storeProfile.userId,
        amount: storeShare,
        percentage,
        status: 'PENDING',
      },
    ],
    skipDuplicates: true,
  });
}
