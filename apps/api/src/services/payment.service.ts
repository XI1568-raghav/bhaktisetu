import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';

// ─── Razorpay client ────────────────────────────────────────────────────────────

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isDemoPayment = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo';

const razorpay = isDemoPayment
  ? (new Proxy({} as Razorpay, {
      get: (_target, prop) => {
        if (prop === 'orders') return { create: async (opts: any) => ({ id: `order_demo_${Date.now()}`, ...opts }) };
        if (prop === 'payments') return {
          refund: async () => ({ id: `rfnd_demo_${Date.now()}` }),
          fetch: async () => ({ id: 'pay_demo', status: 'captured' }),
        };
        return () => ({ id: 'demo' });
      },
    }) as unknown as Razorpay)
  : new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

// ─── Types ──────────────────────────────────────────────────────────────────────

interface CreateOrderResult {
  orderId: string;
  amount: number;
  currency: string;
  paymentId: string;
  razorpayKeyId: string;
}

interface VerifyPaymentResult {
  verified: boolean;
  bookingId: string;
  bookingNumber: string;
}

interface WebhookResult {
  handled: boolean;
  event?: string;
}

interface RefundResult {
  refundId: string;
  paymentId: string;
  bookingId: string;
  amount: number;
  status: string;
}

// ─── PaymentService ─────────────────────────────────────────────────────────────

export class PaymentService {
  /**
   * Create a Razorpay order for a pending booking.
   * Persists a Payment record in the database with status "initiated".
   */
  async createRazorpayOrder(
    bookingId: string,
    userId: string
  ): Promise<CreateOrderResult> {
    // 1. Get booking and validate state
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingNumber: true,
        userId: true,
        status: true,
        priceAmount: true,
        currency: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to pay for this booking.');
    }

    if (booking.status !== 'pending_payment') {
      throw new Error(
        `Payment can only be initiated for bookings in "pending_payment" status. Current: "${booking.status}".`
      );
    }

    // Check if there is already an active (initiated/authorized) payment for this booking
    const existingPayment = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        status: { in: ['initiated', 'authorized'] },
      },
      select: { id: true, gatewayOrderId: true },
    });

    if (existingPayment && existingPayment.gatewayOrderId) {
      // Return the existing order rather than creating a duplicate
      return {
        orderId: existingPayment.gatewayOrderId,
        amount: Number(booking.priceAmount) * 100,
        currency: booking.currency,
        paymentId: existingPayment.id,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
      };
    }

    // 2. Create Razorpay order (amount in paise)
    const amountInPaise = Math.round(Number(booking.priceAmount) * 100);

    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: booking.currency,
      receipt: booking.bookingNumber,
      notes: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId,
      },
    });

    // 3. Persist Payment record
    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: booking.priceAmount,
        currency: booking.currency,
        paymentGateway: 'razorpay',
        gatewayOrderId: razorpayOrder.id,
        status: 'initiated',
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          receipt: booking.bookingNumber,
        },
      },
      select: { id: true },
    });

    return {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: booking.currency,
      paymentId: payment.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID!,
    };
  }

  /**
   * Verify the Razorpay payment signature after the client-side checkout completes.
   * If valid, marks the payment as captured and confirms the booking.
   */
  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
  ): Promise<VerifyPaymentResult> {
    // 1. Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new Error('Payment verification failed: invalid signature.');
    }

    // 2. Find the payment record by gateway order ID
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: razorpayOrderId },
      include: {
        booking: {
          select: { id: true, bookingNumber: true, status: true },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment record not found for the given order.');
    }

    if (!payment.booking) {
      throw new Error('No booking linked to this payment.');
    }

    // 3. Update payment to captured
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'captured',
        gatewayPaymentId: razorpayPaymentId,
      },
    });

    // 4. Confirm the booking if still pending
    if (payment.booking.status === 'pending_payment') {
      await prisma.pujaBooking.update({
        where: { id: payment.booking.id },
        data: { status: 'confirmed' },
      });
    }

    return {
      verified: true,
      bookingId: payment.booking.id,
      bookingNumber: payment.booking.bookingNumber,
    };
  }

  /**
   * Handle Razorpay webhook events.
   * Verifies the webhook signature and processes the event.
   */
  async handleWebhook(
    payload: Record<string, any>,
    signature: string
  ): Promise<WebhookResult> {
    // 1. Verify webhook signature
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Webhook signature verification failed.');
    }

    const event = payload.event as string;
    const paymentEntity = payload.payload?.payment?.entity;

    // 2. Process based on event type
    switch (event) {
      case 'payment.captured': {
        if (!paymentEntity) break;

        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId: paymentEntity.order_id },
          include: {
            booking: { select: { id: true, status: true } },
          },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'captured',
              gatewayPaymentId: paymentEntity.id,
              method: paymentEntity.method ?? null,
            },
          });

          if (payment.booking && payment.booking.status === 'pending_payment') {
            await prisma.pujaBooking.update({
              where: { id: payment.booking.id },
              data: { status: 'confirmed' },
            });
          }
        }

        return { handled: true, event };
      }

      case 'payment.failed': {
        if (!paymentEntity) break;

        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId: paymentEntity.order_id },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'failed',
              gatewayPaymentId: paymentEntity.id,
              method: paymentEntity.method ?? null,
              metadata: {
                ...(payment.metadata as Record<string, any> ?? {}),
                failureReason: paymentEntity.error_description,
                failureCode: paymentEntity.error_code,
              },
            },
          });
        }

        return { handled: true, event };
      }

      case 'refund.created': {
        const refundEntity = payload.payload?.refund?.entity;
        if (!refundEntity) break;

        const payment = await prisma.payment.findFirst({
          where: { gatewayPaymentId: refundEntity.payment_id },
        });

        if (payment) {
          // refund amount from Razorpay is in paise
          const refundAmountDecimal = refundEntity.amount / 100;

          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              refundAmount: refundAmountDecimal,
              status:
                refundAmountDecimal >= Number(payment.amount)
                  ? 'refunded'
                  : 'partially_refunded',
            },
          });
        }

        return { handled: true, event };
      }

      default:
        // Unhandled event type — acknowledge but don't process
        return { handled: false, event };
    }

    return { handled: false, event };
  }

  /**
   * Process a full refund for a cancelled/refundable booking.
   */
  async processRefund(bookingId: string, adminId?: string): Promise<RefundResult> {
    // 1. Get booking and its captured payment
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: 'captured' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.payments.length === 0) {
      throw new Error('No captured payment found for this booking.');
    }

    const payment = booking.payments[0]!;

    if (!payment.gatewayPaymentId) {
      throw new Error('No gateway payment ID found. Cannot process refund.');
    }

    // 2. Call Razorpay refund API
    const refundAmountInPaise = Math.round(Number(payment.amount) * 100);

    const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
      amount: refundAmountInPaise,
      notes: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        adminId: adminId ?? 'system',
        reason: booking.cancellationReason ?? 'Booking cancelled',
      },
    }) as { id: string };

    // 3. Update payment record
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundAmount: payment.amount,
        status: 'refunded',
        metadata: {
          ...((payment.metadata as Record<string, unknown>) ?? {}),
          refundId: refund.id,
          refundedBy: adminId ?? 'system',
          refundedAt: new Date().toISOString(),
        },
      },
    });

    // 4. Update booking status
    await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: { status: 'refunded' },
    });

    return {
      refundId: refund.id,
      paymentId: payment.id,
      bookingId: booking.id,
      amount: Number(payment.amount),
      status: 'refunded' as const,
    };
  }

  /**
   * Create a PriestPayout record for a completed booking.
   * The booking must be in video_uploaded or delivered status.
   */
  async createPriestPayout(bookingId: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        priestId: true,
        priestPayout: true,
        currency: true,
        bookingNumber: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (!['video_uploaded', 'delivered'].includes(booking.status)) {
      throw new Error(
        `Priest payout can only be created for bookings in "video_uploaded" or "delivered" status. Current: "${booking.status}".`
      );
    }

    if (!booking.priestId) {
      throw new Error('No priest assigned to this booking.');
    }

    // Check if payout already exists
    const existingPayout = await prisma.priestPayout.findFirst({
      where: { bookingId },
      select: { id: true, status: true },
    });

    if (existingPayout) {
      throw new Error(
        `A payout already exists for this booking (status: ${existingPayout.status}).`
      );
    }

    const payout = await prisma.priestPayout.create({
      data: {
        priestId: booking.priestId,
        bookingId,
        amount: booking.priestPayout,
        status: 'pending',
        payoutMethod: 'bank_transfer', // Default method
      },
      include: {
        priest: {
          select: { id: true, displayName: true },
        },
        booking: {
          select: { bookingNumber: true },
        },
      },
    });

    return payout;
  }

  /**
   * Get the payment record(s) for a specific booking.
   */
  async getPaymentByBookingId(bookingId: string) {
    const payments = await prisma.payment.findMany({
      where: { bookingId },
      select: {
        id: true,
        amount: true,
        currency: true,
        paymentGateway: true,
        gatewayPaymentId: true,
        gatewayOrderId: true,
        status: true,
        method: true,
        refundAmount: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (payments.length === 0) {
      return null;
    }

    return payments;
  }
}

export const paymentService = new PaymentService();
