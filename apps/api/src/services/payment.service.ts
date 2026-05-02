import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';
import { getStripe, isStripeDemoMode } from '../lib/stripe.js';

/**
 * Send a puja-booking tax invoice to the devotee. Best-effort: any failure
 * (PDF, email, or DB read) is swallowed and logged so it can never block
 * the payment-confirmation flow this is called from.
 */
async function sendPujaBookingInvoice(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        bookingNumber: true,
        priceAmount: true,
        createdAt: true,
        user: { select: { fullName: true, email: true } },
        temple: { select: { name: true, city: true } },
        pujaType: { select: { name: true } },
      },
    });
    if (!booking || !booking.user.email) return;
    const pdf = await generateInvoice({
      type: 'puja_booking',
      bookingNumber: booking.bookingNumber,
      devoteeName: booking.user.fullName,
      pujaName: booking.pujaType.name,
      templeName: booking.temple.name,
      templeCity: booking.temple.city,
      amountInr: Number(booking.priceAmount),
      createdAt: booking.createdAt.toISOString().slice(0, 10),
    });
    await sendEmail({
      to: booking.user.email,
      subject: `Darshya tax invoice — ${booking.bookingNumber}`,
      html: `<p>Namaste ${booking.user.fullName},</p><p>Your tax invoice for booking <strong>${booking.bookingNumber}</strong> is attached.</p>`,
      text: `Tax invoice for booking ${booking.bookingNumber} attached.`,
      attachments: [
        { filename: `invoice-${booking.bookingNumber}.pdf`, content: pdf },
      ],
    });
  } catch (err) {
    console.warn('[payment.service] sendPujaBookingInvoice failed:', err);
  }
}

/**
 * Insert a Commission row when a PujaBooking flips to confirmed. The
 * platform's cut (priceAmount * (1 - priest commission share)) was already
 * computed at booking-create time and stored on the booking row. We
 * mirror it into the Commission ledger so /admin/commissions has a single
 * source of truth for accounting and payout reconciliation.
 *
 * Idempotent — uses a unique-on-bookingId guard via findFirst, so a
 * webhook retry after a verifyPayment success won't double-write.
 */
async function writePujaCommissionOnConfirm(bookingId: string): Promise<void> {
  try {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        priceAmount: true,
        platformCommission: true,
        priestId: true,
      },
    });
    if (!booking || !booking.priestId) return;
    const existing = await prisma.commission.findFirst({
      where: { bookingId: booking.id },
      select: { id: true },
    });
    if (existing) return;
    const priceNum = Number(booking.priceAmount);
    const commissionNum = Number(booking.platformCommission);
    const percentage = priceNum > 0 ? commissionNum / priceNum : 0;
    await prisma.commission.create({
      data: {
        bookingId: booking.id,
        providerId: booking.priestId,
        amount: booking.platformCommission,
        percentage,
        status: 'PENDING',
      },
    });
  } catch (err) {
    console.warn('[payment.service] writePujaCommissionOnConfirm failed:', err);
  }
}

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
      await writePujaCommissionOnConfirm(payment.booking.id);
      void sendPujaBookingInvoice(payment.booking.id);
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

    return this.processWebhookEvent(payload);
  }

  /**
   * Like handleWebhook, but verifies the HMAC against the literal bytes
   * Razorpay sent rather than a re-serialised JSON. This is the correct
   * verification path; gated on RAZORPAY_VERIFY_RAW so it can be tested
   * against Razorpay's test-mode webhook before flipping prod over.
   */
  async handleWebhookRaw(
    rawBody: string,
    payload: Record<string, any>,
    signature: string
  ): Promise<WebhookResult> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    // Use timing-safe compare to defeat any timing-oracle attacks on the
    // HMAC equality check. Both sides are hex strings of the same length;
    // if not, force a mismatch.
    const a = Buffer.from(expectedSignature, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!ok) {
      throw new Error('Webhook signature verification failed.');
    }

    return this.processWebhookEvent(payload);
  }

  /**
   * Private: dispatch the verified webhook payload to the right
   * downstream Prisma updates. Both verification paths converge here.
   */
  private async processWebhookEvent(
    payload: Record<string, any>
  ): Promise<WebhookResult> {
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
            await writePujaCommissionOnConfirm(payment.booking.id);
            void sendPujaBookingInvoice(payment.booking.id);
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
   * Mark a PriestPayout as completed and flip the matching Commission row
   * to PAID. Called from the admin "release payout" flow once the bank
   * transfer has been initiated. Both writes happen in a single
   * transaction so the ledger stays consistent.
   */
  async markPayoutPaid(payoutId: string) {
    return prisma.$transaction(async (tx) => {
      const payout = await tx.priestPayout.findUnique({
        where: { id: payoutId },
        select: { id: true, status: true, bookingId: true },
      });
      if (!payout) {
        throw new Error('Payout not found.');
      }
      if (payout.status === 'completed') {
        return payout;
      }
      const updated = await tx.priestPayout.update({
        where: { id: payout.id },
        data: { status: 'completed', processedAt: new Date() },
      });
      const commission = await tx.commission.findFirst({
        where: { bookingId: payout.bookingId },
        select: { id: true },
      });
      if (commission) {
        await tx.commission.update({
          where: { id: commission.id },
          data: { status: 'PAID', paidAt: new Date() },
        });
      }
      return updated;
    });
  }

  /**
   * Create a Stripe PaymentIntent for an NRI booking, billed in USD.
   *
   * Pricing source: PujaType.nriPrice (USD-denominated). The booking row
   * itself stores `priceAmount` in INR for accounting consistency, so the
   * USD amount is computed fresh here from nriPrice and stored on the
   * Payment row + metadata for reconciliation.
   *
   * Demo mode (no STRIPE_SECRET_KEY): returns a synthetic pi_demo_* id +
   * client_secret so the web checkout flow stays exercisable.
   */
  async createStripeOrder(
    bookingId: string,
    userId: string,
  ): Promise<{
    orderId: string;
    paymentIntentId: string;
    clientSecret: string | null;
    amount: number;
    currency: 'USD';
    paymentId: string;
    publishableKey: string;
    demo: boolean;
  }> {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingNumber: true,
        userId: true,
        status: true,
        pujaType: { select: { nriPrice: true } },
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
        `Payment can only be initiated for bookings in "pending_payment" status. Current: "${booking.status}".`,
      );
    }

    const usdAmount = Number(booking.pujaType.nriPrice);
    if (!usdAmount || usdAmount <= 0) {
      throw new Error('Puja does not have a valid NRI (USD) price configured.');
    }

    // Re-use existing initiated/authorized Stripe payment if present,
    // mirroring the Razorpay path for idempotency under retries.
    const existing = await prisma.payment.findFirst({
      where: {
        bookingId: booking.id,
        paymentGateway: 'stripe',
        status: { in: ['initiated', 'authorized'] },
      },
      select: { id: true, gatewayOrderId: true, metadata: true },
    });

    const stripe = await getStripe();
    const amountInCents = Math.round(usdAmount * 100);

    if (existing && existing.gatewayOrderId) {
      const meta = (existing.metadata as Record<string, any> | null) ?? {};
      return {
        orderId: existing.gatewayOrderId,
        paymentIntentId: existing.gatewayOrderId,
        clientSecret: typeof meta.clientSecret === 'string' ? meta.clientSecret : null,
        amount: amountInCents,
        currency: 'USD',
        paymentId: existing.id,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
        demo: isStripeDemoMode,
      };
    }

    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'usd',
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        userId,
      },
      automatic_payment_methods: { enabled: true },
    });

    const payment = await prisma.payment.create({
      data: {
        userId,
        bookingId: booking.id,
        amount: usdAmount,
        currency: 'USD',
        paymentGateway: 'stripe',
        gatewayOrderId: intent.id,
        status: 'initiated',
        metadata: {
          stripePaymentIntentId: intent.id,
          clientSecret: intent.client_secret,
          receipt: booking.bookingNumber,
        },
      },
      select: { id: true },
    });

    return {
      orderId: intent.id,
      paymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      amount: amountInCents,
      currency: 'USD',
      paymentId: payment.id,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
      demo: isStripeDemoMode,
    };
  }

  /**
   * Verify a Stripe webhook payload + dispatch downstream effects. Mirror
   * of handleWebhookRaw — HMAC over the literal bytes Stripe sent, using
   * the SDK's constructEvent helper which is timing-safe internally.
   *
   * Handled events:
   *   payment_intent.succeeded -> mark Payment captured + booking confirmed
   *   payment_intent.payment_failed -> mark Payment failed
   *   charge.refunded -> mark Payment refunded / partially_refunded
   */
  async handleStripeWebhook(
    rawBody: string | Buffer,
    signature: string,
  ): Promise<WebhookResult> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    const stripe = await getStripe();
    let event: { type: string; data: { object: Record<string, any> } };
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      throw new Error('Webhook signature verification failed.');
    }

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId: intent.id, paymentGateway: 'stripe' },
          include: { booking: { select: { id: true, status: true } } },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'captured',
              gatewayPaymentId: intent.id,
              method: typeof intent.payment_method_types?.[0] === 'string'
                ? intent.payment_method_types[0]
                : 'card',
            },
          });
          if (payment.booking && payment.booking.status === 'pending_payment') {
            await prisma.pujaBooking.update({
              where: { id: payment.booking.id },
              data: { status: 'confirmed' },
            });
            await writePujaCommissionOnConfirm(payment.booking.id);
            void sendPujaBookingInvoice(payment.booking.id);
          }
        }
        return { handled: true, event: event.type };
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId: intent.id, paymentGateway: 'stripe' },
        });
        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              status: 'failed',
              gatewayPaymentId: intent.id,
              metadata: {
                ...((payment.metadata as Record<string, any>) ?? {}),
                failureReason: intent.last_payment_error?.message,
                failureCode: intent.last_payment_error?.code,
              },
            },
          });
        }
        return { handled: true, event: event.type };
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const intentId = charge.payment_intent as string | undefined;
        if (!intentId) return { handled: false, event: event.type };
        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId: intentId, paymentGateway: 'stripe' },
        });
        if (payment) {
          const refundedCents = Number(charge.amount_refunded ?? 0);
          const refundedUsd = refundedCents / 100;
          const fullyRefunded = refundedUsd >= Number(payment.amount);
          await prisma.payment.update({
            where: { id: payment.id },
            data: {
              refundAmount: refundedUsd,
              status: fullyRefunded ? 'refunded' : 'partially_refunded',
            },
          });
        }
        return { handled: true, event: event.type };
      }

      default:
        return { handled: false, event: event.type };
    }
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
