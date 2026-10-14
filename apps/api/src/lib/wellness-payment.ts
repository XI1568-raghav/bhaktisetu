import { prisma } from './prisma.js';

/**
 * QA 2026-10-13 (slice L): a wellness enrolment used to store only the Razorpay ORDER
 * id, so a cancel had no payment id to refund against. `wellness_enrollments.payment_id`
 * already exists (nullable FK to `payments`), so no migration is needed: on verify /
 * webhook capture we write a `captured` Payment row and link it. Best effort and
 * idempotent - a failure leaves the enrolment paid with no link, and the refund rail
 * falls back to "owed, pay manually" (the pre-existing behaviour).
 */
export async function recordWellnessPayment(opts: {
  enrollmentId: string;
  userId: string;
  amountInr: number;
  razorpayOrderId: string | null | undefined;
  razorpayPaymentId: string | null | undefined;
  method?: string | null;
}): Promise<string | null> {
  try {
    if (!opts.razorpayPaymentId || !(opts.amountInr > 0)) return null;
    const enr = await prisma.wellnessEnrollment.findUnique({
      where: { id: opts.enrollmentId },
      select: { paymentId: true },
    });
    if (enr?.paymentId) {
      const linked = await prisma.payment.findUnique({
        where: { id: enr.paymentId },
        select: { gatewayPaymentId: true },
      });
      // Re-enrol after a cancel pays under a NEW gateway payment: relink.
      if (linked?.gatewayPaymentId === opts.razorpayPaymentId) return enr.paymentId;
    }
    const payment = await prisma.payment.create({
      data: {
        userId: opts.userId,
        amount: opts.amountInr,
        currency: 'INR',
        paymentGateway: 'razorpay',
        gatewayOrderId: opts.razorpayOrderId ?? null,
        gatewayPaymentId: opts.razorpayPaymentId,
        status: 'captured',
        method: opts.method ?? null,
        metadata: { rail: 'wellness', wellnessEnrollmentId: opts.enrollmentId },
      },
      select: { id: true },
    });
    await prisma.wellnessEnrollment.update({
      where: { id: opts.enrollmentId },
      data: { paymentId: payment.id },
    });
    return payment.id;
  } catch (err) {
    console.warn('[wellness-payment] could not record the gateway payment id:', err);
    return null;
  }
}
