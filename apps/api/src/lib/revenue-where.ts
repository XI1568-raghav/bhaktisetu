import type { Prisma } from '@prisma/client';

/**
 * Which captured payments are revenue.
 *
 * A booking cancelled after payment keeps its `captured` Payment row until the
 * refund is actually issued, so a plain `status: 'captured'` sum counted money
 * the platform has already committed to give back. Revenue is captured money
 * whose booking is not cancelled (payments with no booking, e.g. store or
 * wellness, are unaffected — the explicit null branch matters because
 * `not` on a nullable relation drops NULLs in SQL).
 */
export const REVENUE_PAYMENT_WHERE: Prisma.PaymentWhereInput = {
  status: 'captured',
  OR: [{ bookingId: null }, { booking: { status: { not: 'cancelled' } } }],
};

/** Captured money sitting on a cancelled booking: owed back, not yet refunded. */
export const PENDING_REFUND_PAYMENT_WHERE: Prisma.PaymentWhereInput = {
  status: 'captured',
  booking: { status: 'cancelled' },
};
