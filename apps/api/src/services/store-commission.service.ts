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
    select: { id: true, totalAmountInr: true, items: true },
  });
  if (!order) return;

  const items = Array.isArray(order.items) ? (order.items as Array<{ productId?: string }>) : [];
  const firstProductId = items.find((it) => it?.productId)?.productId;
  if (!firstProductId) return;

  const product = await tx.storeProduct.findUnique({
    where: { id: firstProductId },
    select: { storeProfileId: true },
  });
  if (!product?.storeProfileId) return;

  const storeProfile = await tx.storeProfile.findUnique({
    where: { id: product.storeProfileId },
    select: { userId: true, commission: true },
  });
  if (!storeProfile) return;

  const total = new Prisma.Decimal(order.totalAmountInr as Prisma.Decimal);
  const platformRate = new Prisma.Decimal(storeProfile.commission as Prisma.Decimal);
  const storeShare = total.mul(new Prisma.Decimal(1).minus(platformRate));
  const percentage = total.gt(0) ? platformRate : new Prisma.Decimal(0);

  await tx.commission.create({
    data: {
      storeOrderId: order.id,
      providerId: storeProfile.userId,
      amount: storeShare,
      percentage,
      status: 'PENDING',
    },
  });
}
