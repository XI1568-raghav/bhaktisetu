import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';
import { getStripe, isStripeDemoMode } from '../lib/stripe.js';
// PBO-11: donation webhook backstop. Donations write no prisma.payment row, so
// the booking webhook path never reaches them; these helpers let
// processWebhookEvent resolve + finalize a donation when no Payment matches.
import { findDonationByOrderId, finalizeDonationReceipt } from '../routes/donations.js';

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
 * R-Q2-M-011 Tier-2 referral reward hook.
 *
 * Called from verifyPayment side-effects when a PujaBooking flips to
 * `confirmed`. If the booking's user (the referee) has a `signed_up` or
 * `qualifying` ReferralClaim, credit the referrer's wallet +₹100 and flip
 * the claim to `rewarded`. Idempotent via wallet's (userId, idempotencyKey)
 * unique constraint — webhook retries are safe.
 *
 * MUST swallow all errors — referral plumbing failure cannot block
 * booking confirmation (hard rule per spec).
 *
 * Reward fires only on the referee's FIRST confirmed booking. Subsequent
 * confirmed bookings by the same user re-find the same claim row, see
 * status='rewarded', and short-circuit (no double credit).
 */
async function tryRewardReferralForBooking(refereeUserId: string, bookingId: string): Promise<void> {
  try {
    const claim = await (prisma as unknown as {
      referralClaim: {
        findFirst: (args: unknown) => Promise<{
          id: string;
          status: string;
          referrerId: string;
        } | null>;
      };
    }).referralClaim.findFirst({
      where: {
        refereeId: refereeUserId,
        status: { in: ['signed_up', 'qualifying'] },
      },
      orderBy: { createdAt: 'asc' }, // oldest first — earliest referral wins
    });
    if (!claim) return; // no eligible referral; common path

    const { WalletService } = await import('./wallet.service.js');
    const wallet = new WalletService(prisma);
    const rewardPaise = Number(process.env.REFERRAL_REWARD_PAISE) || 10000;
    const idempotencyKey = `referral-reward-${claim.id}`;

    const creditResult = await wallet.creditUser({
      userId: claim.referrerId,
      deltaPaise: rewardPaise,
      reason: 'referral_reward',
      idempotencyKey,
      refType: 'referral_claim',
      refId: claim.id,
      notes: `Auto-reward on referee booking ${bookingId}`,
    });

    await (prisma as unknown as {
      referralClaim: { update: (args: unknown) => Promise<unknown> };
    }).referralClaim.update({
      where: { id: claim.id },
      data: {
        status: 'rewarded',
        rewardAmount: rewardPaise / 100,
        rewardCurrency: 'INR',
        rewardedAt: new Date(),
        rewardLedgerId: creditResult.ledgerEntryId,
        bookingId,
      },
    });

    console.log(
      `[payment.service] referral rewarded: claim=${claim.id} referrer=${claim.referrerId} ledger=${creditResult.ledgerEntryId} reused=${creditResult.reused}`,
    );
  } catch (err) {
    // Swallow — referral failure MUST NOT fail booking confirmation.
    console.warn('[payment.service] tryRewardReferralForBooking failed:', err);
  }
}

/**
 * Best-effort store-order invoice (mirrors sendPujaBookingInvoice). Called
 * after Razorpay capture flips the order to CONFIRMED. Any failure is
 * swallowed so payment confirmation never blocks on email/PDF errors.
 */
async function sendStoreOrderInvoice(storeOrderId: string): Promise<void> {
  try {
    const order = await prisma.storeOrder.findUnique({
      where: { id: storeOrderId },
      include: { user: { select: { fullName: true, email: true } } },
    });
    if (!order || !order.user.email) return;
    type Item = { productId?: string; qty?: number; priceAtPurchase?: number; name?: string };
    type Addr = {
      fullName?: string; line1?: string; line2?: string; city?: string;
      state?: string; pincode?: string; country?: string;
    };
    const items: Item[] = Array.isArray(order.items)
      ? (order.items as unknown as Item[])
      : [];
    const lineItems = items.map((it) => ({
      name: typeof it.name === 'string' ? it.name : (it.productId ?? 'Item'),
      qty: Number(it.qty ?? 1),
      priceInr: Number(it.priceAtPurchase ?? 0),
    }));
    const addr = order.shippingAddress as unknown as Addr;
    const addrStr = [
      addr?.fullName, addr?.line1, addr?.line2, addr?.city,
      addr?.state, addr?.pincode, addr?.country,
    ].filter(Boolean).join(', ');
    const pdf = await generateInvoice({
      type: 'store_order',
      orderNumber: order.orderNumber,
      customerName: order.user.fullName,
      items: lineItems,
      shippingAddress: addrStr,
      totalInr: Number(order.totalAmountInr),
      createdAt: order.createdAt.toISOString().slice(0, 10),
    });
    await sendEmail({
      to: order.user.email,
      subject: `Darshya tax invoice — ${order.orderNumber}`,
      html: `<p>Namaste ${order.user.fullName},</p><p>Your tax invoice for order <strong>${order.orderNumber}</strong> is attached.</p>`,
      text: `Tax invoice for order ${order.orderNumber} attached.`,
      attachments: [
        { filename: `invoice-${order.orderNumber}.pdf`, content: pdf },
      ],
    });
  } catch (err) {
    console.warn('[payment.service] sendStoreOrderInvoice failed:', err);
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
 *
 * P1-12 (2026-07-10): accepts an optional `tx` client so the commission write
 * can run INSIDE the same `$transaction` as the capture+confirm. Previously it
 * ran after the tx committed and SWALLOWED errors — a silent failure meant a
 * confirmed booking with no payout-ledger row (priest never credited). Now a
 * failure propagates and rolls back the whole capture+confirm+commission.
 */
type TxClient = Prisma.TransactionClient | typeof prisma;

async function writePujaCommissionOnConfirm(
  bookingId: string,
  tx: TxClient = prisma,
): Promise<void> {
  const booking = await tx.pujaBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      priceAmount: true,
      platformCommission: true,
      priestId: true,
    },
  });
  if (!booking || !booking.priestId) return;
  const existing = await tx.commission.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (existing) return;
  // Decimal.js arithmetic — never coerce money to JS Number for the
  // ledger. percentage column is Decimal(5,4); it gets rounded by the
  // DB driver but the *input* must already be exact rational division.
  const price = new Prisma.Decimal(booking.priceAmount as Prisma.Decimal);
  const commission = new Prisma.Decimal(booking.platformCommission as Prisma.Decimal);
  const percentage = price.gt(0)
    ? commission.div(price)
    : new Prisma.Decimal(0);
  await tx.commission.create({
    data: {
      bookingId: booking.id,
      providerId: booking.priestId,
      amount: commission,
      percentage,
      status: 'PENDING',
    },
  });
}

// P0 #PBO-12 (2026-07-09): single post-confirm side-effect block. The client
// verify path ran commission + invoice + referral reward, but BOTH webhook
// paths (Razorpay payment.captured + Stripe payment_intent.succeeded) ran only
// commission + invoice — referral reward was skipped, so in production (which
// confirms via webhook, not client-verify) referees were never credited. This
// helper is the one place all three confirmation paths call so the side-effects
// can never drift apart again.
//
// P1-12 (2026-07-10): the COMMISSION ledger write is now part of the caller's
// `$transaction` (pass `tx` to `writePujaCommissionOnConfirm` directly inside
// the tx callback — see each call site). This helper retains ONLY the
// post-commit fire-and-forget side-effects (invoice email + referral reward)
// that must NOT run inside the tx (network calls that shouldn't roll back a
// captured payment). Callers do: `await writePujaCommissionOnConfirm(id, tx)`
// inside the tx, then `fireAndForgetPostConfirmSideEffects(id, userId)` after.
async function fireAndForgetPostConfirmSideEffects(
  bookingId: string,
  userId: string,
): Promise<void> {
  void sendPujaBookingInvoice(bookingId);
  // Fire-and-forget — referral reward MUST NOT fail booking confirmation.
  void tryRewardReferralForBooking(userId, bookingId);
}

// P0 #S-04 (2026-07-09): write a Commission row for a confirmed store order.
// The puja path has written commissions since launch, but the store path never
// did — store owners' payouts were silently never recorded (earnings ₹0). This
// resolves the store from the order's first line item's product (StoreOrder
// has no direct storeProfileId FK until S-11 lands), reads the store's
// platform commission rate, and writes a PENDING Commission row for the
// store-owner's share (providerId = storeProfile.userId). Idempotent: a
// duplicate confirm (webhook + client verify) does not double-write.
async function writeStoreOrderCommissionOnConfirm(
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
    select: {
      id: true,
      totalAmountInr: true,
      items: true,
    },
  });
  if (!order) return;

  // Resolve the owning store via the first line item's product. items is
  // [{ productId, qty, priceAtPurchase }, ...]. Mixed-store carts are not
  // supported (single store per order) — see S-11 for the proper FK.
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

  // storeProfile.commission is the PLATFORM's cut (default 0.20). The store
  // owner's earnings = total * (1 - commission). The Commission row records
  // the provider's (store owner's) amount + the platform percentage for the
  // ledger. Decimal arithmetic — never coerce money to JS Number.
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

// ─── Razorpay client ────────────────────────────────────────────────────────────

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isDemoPayment = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo';

// Hard fail in production if the demo proxy would activate. The proxy
// returns synthetic order ids and webhook handlers will mark bookings
// `confirmed` against fake data — i.e. customers think they paid, priests
// see real assignments, and no money has moved. Crashing at boot makes
// ops fix the env var; staging can opt out via ALLOW_DEMO_PAYMENTS=true.
if (
  isDemoPayment &&
  process.env.NODE_ENV === 'production' &&
  process.env.ALLOW_DEMO_PAYMENTS !== 'true'
) {
  throw new Error(
    'RAZORPAY_KEY_ID is missing or set to the demo placeholder in a production environment. ' +
      'Set real Razorpay credentials or ALLOW_DEMO_PAYMENTS=true (staging only).'
  );
}

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
      // Return the existing order rather than creating a duplicate.
      // Round to integer paise — Decimal × 100 can produce 99999.999... which
      // Razorpay then rejects (or worse, truncates) on retry.
      return {
        orderId: existingPayment.gatewayOrderId,
        amount: Math.round(Number(booking.priceAmount) * 100),
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
    razorpaySignature: string,
    userId?: string,
    callerRoles?: string[]
  ): Promise<VerifyPaymentResult> {
    // 1. Verify signature (timing-safe)
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(razorpaySignature, 'utf8');
    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
      throw new Error('Payment verification failed: invalid signature.');
    }

    // 2. Find the payment record by gateway order ID
    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: razorpayOrderId },
      include: {
        booking: {
          select: { id: true, bookingNumber: true, status: true, userId: true },
        },
      },
    });

    if (!payment) {
      throw new Error('Payment record not found for the given order.');
    }

    if (!payment.booking) {
      throw new Error('No booking linked to this payment.');
    }

    // P0 #PBO-13 (2026-07-09): caller-ownership check. A valid Razorpay
    // signature only proves the payment happened — it says nothing about WHO
    // is calling verify. Without this, any authenticated user with a captured
    // signature could confirm ANY booking (asymmetric with store-order verify,
    // which IS owner-gated). Admins bypass so support can reconcile.
    if (userId && payment.booking.userId !== userId) {
      const callerIsAdmin = Array.isArray(callerRoles) && callerRoles.includes('ADMIN');
      if (!callerIsAdmin) {
        throw new Error('You are not authorized to confirm this booking.');
      }
    }

    // 3+4. Capture payment and confirm booking atomically — a crash
    // between the two updates previously left a captured Payment with a
    // pending_payment Booking until the webhook retried.
    const shouldConfirm = payment.booking.status === 'pending_payment';
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'captured',
          gatewayPaymentId: razorpayPaymentId,
        },
      });
      if (shouldConfirm) {
        await tx.pujaBooking.update({
          where: { id: payment.booking!.id },
          data: { status: 'confirmed' },
        });
        // P1-12: write the commission ledger row INSIDE the same transaction.
        // A failure here rolls back the capture+confirm (better than a silent
        // missing payout row). Idempotent via the findFirst guard inside.
        await writePujaCommissionOnConfirm(payment.booking!.id, tx);
      }
    });

    // Post-commit side-effects (invoice email + referral reward) are network
    // calls that must NOT roll back a captured payment — fire-and-forget.
    const booking = payment.booking!;
    if (shouldConfirm) {
      await fireAndForgetPostConfirmSideEffects(booking.id, booking.userId);
    }

    return {
      verified: true,
      bookingId: booking.id,
      bookingNumber: payment.booking.bookingNumber,
    };
  }

  /**
   * Create a Razorpay order for a pending store order. Mirrors the puja-
   * booking createRazorpayOrder pattern: idempotent on the existing
   * initiated/authorized Payment row pointed to by storeOrder.paymentId,
   * returns paise + key id for the web Razorpay checkout to consume.
   */
  async createStoreOrderRazorpay(
    storeOrderId: string,
    userId: string,
  ): Promise<CreateOrderResult> {
    const order = await prisma.storeOrder.findUnique({
      where: { id: storeOrderId },
      select: {
        id: true, orderNumber: true, userId: true, status: true,
        totalAmountInr: true, paymentId: true,
      },
    });
    if (!order) throw new Error('Store order not found.');
    if (order.userId !== userId) {
      throw new Error('You are not authorized to pay for this order.');
    }
    if (order.status !== 'PENDING') {
      throw new Error(
        `Payment can only be initiated for orders in "PENDING" status. Current: "${order.status}".`,
      );
    }

    // Idempotency: reuse existing initiated Razorpay order so a refresh
    // mid-checkout does not duplicate Payment rows or burn Razorpay quota.
    if (order.paymentId) {
      const existing = await prisma.payment.findUnique({
        where: { id: order.paymentId },
        select: { id: true, gatewayOrderId: true, status: true, amount: true, currency: true },
      });
      if (
        existing &&
        existing.gatewayOrderId &&
        (existing.status === 'initiated' || existing.status === 'authorized')
      ) {
        return {
          orderId: existing.gatewayOrderId,
          amount: Math.round(Number(existing.amount) * 100),
          currency: existing.currency,
          paymentId: existing.id,
          razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
        };
      }
    }

    const amountInPaise = Math.round(Number(order.totalAmountInr) * 100);
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: {
        storeOrderId: order.id,
        orderNumber: order.orderNumber,
        userId,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        userId,
        // bookingId stays null — Payment.bookingId is nullable specifically
        // for non-puja payments (store orders, donations, etc.).
        amount: order.totalAmountInr,
        currency: 'INR',
        paymentGateway: 'razorpay',
        gatewayOrderId: razorpayOrder.id,
        status: 'initiated',
        metadata: {
          razorpayOrderId: razorpayOrder.id,
          receipt: order.orderNumber,
          storeOrderId: order.id,
        },
      },
      select: { id: true },
    });

    await prisma.storeOrder.update({
      where: { id: order.id },
      data: { paymentId: payment.id },
    });

    return {
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: 'INR',
      paymentId: payment.id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? '',
    };
  }

  /**
   * Verify Razorpay signature for a store-order payment. On success: marks
   * Payment captured, flips StoreOrder PENDING → CONFIRMED with a
   * statusHistory entry, fire-and-forget invoice email. Demo gateway has
   * no secret so signature check is skipped in that mode (matches the
   * permissive demo path used elsewhere).
   */
  async verifyStoreOrderPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    userId: string,
  ): Promise<{ verified: true; storeOrderId: string; orderNumber: string }> {
    if (!isDemoPayment) {
      // P0 #PBO (2026-07-09): hard-fail on an empty/missing secret. If
      // RAZORPAY_KEY_SECRET is unset, the HMAC key is '' — a deterministic,
      // publicly-computable signature — so any attacker could forge a valid
      // verification. Never verify against an empty secret in production.
      const secret = process.env.RAZORPAY_KEY_SECRET ?? '';
      if (!secret) {
        throw new Error('Payment verification failed: server secret not configured.');
      }
      const expected = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(razorpaySignature, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new Error('Payment verification failed: invalid signature.');
      }
    } else {
      // P0 #S-05 (2026-07-09): demo mode still gates confirm. Previously the
      // signature check was skipped entirely, so any order_id matching a
      // Payment row could be confirmed with no signature at all. Now require
      // (a) the order id is a server-issued demo order (`order_demo_*`) and
      // (b) the demo signature sentinel matches. This keeps the demo checkout
      // flow working (the web client sends signature='demo') while stopping a
      // demo verify from confirming a real/prod order.
      const isDemoOrder = razorpayOrderId.startsWith('order_demo_');
      const a = Buffer.from('demo', 'utf8');
      const b = Buffer.from(razorpaySignature, 'utf8');
      const sigOk = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!isDemoOrder || !sigOk) {
        throw new Error('Payment verification failed: invalid demo signature.');
      }
    }

    const payment = await prisma.payment.findFirst({
      where: { gatewayOrderId: razorpayOrderId },
      include: {
        storeOrders: {
          select: {
            id: true, orderNumber: true, status: true,
            statusHistory: true, userId: true,
          },
        },
      },
    });
    if (!payment) throw new Error('Payment record not found for the given order.');
    const storeOrder = payment.storeOrders[0];
    if (!storeOrder) throw new Error('No store order linked to this payment.');
    if (storeOrder.userId !== userId) {
      throw new Error('You are not authorized to confirm this order.');
    }

    // Atomic: capture Payment + flip StoreOrder to CONFIRMED. A crash
    // between the two updates previously left a captured Payment with a
    // PENDING StoreOrder (no fulfilment kicked off, money already in).
    const shouldConfirm = storeOrder.status === 'PENDING';
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'captured', gatewayPaymentId: razorpayPaymentId },
      });
      if (shouldConfirm) {
        const existingHistory = Array.isArray(storeOrder.statusHistory)
          ? storeOrder.statusHistory
          : [];
        const historyEntry = {
          status: 'CONFIRMED',
          changedAt: new Date().toISOString(),
          changedBy: userId,
          note: 'Razorpay payment verified',
        };
        await tx.storeOrder.update({
          where: { id: storeOrder.id },
          data: {
            status: 'CONFIRMED',
            statusHistory: [...existingHistory, historyEntry] as Prisma.InputJsonValue[],
          },
        });
        // P1-12: write the store-owner commission row INSIDE the transaction.
        // Previously fire-and-forget after commit, swallowing failures — store
        // owners' payouts were silently never recorded. A failure now rolls
        // back the whole capture+confirm (no captured payment without a ledger
        // row). Idempotent via the findFirst guard inside.
        await writeStoreOrderCommissionOnConfirm(storeOrder.id, tx);
      }
    });
    if (shouldConfirm) {
      void sendStoreOrderInvoice(storeOrder.id);
    }

    return {
      verified: true,
      storeOrderId: storeOrder.id,
      orderNumber: storeOrder.orderNumber,
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

    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(signature, 'utf8');
    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
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
            // PBO-12: include userId so applyPostConfirmSideEffects can credit
            // the referral reward on the webhook path.
            booking: { select: { id: true, status: true, userId: true } },
          },
        });

        if (payment) {
          const shouldConfirm =
            !!payment.booking && payment.booking.status === 'pending_payment';
          // P1-12: capture + confirm + commission ledger write in ONE
          // transaction. The old webhook path ran payment.update + booking.update
          // as two separate queries (a crash between them left a captured Payment
          // with a pending booking) and wrote the commission AFTER with a
          // swallowed catch. Now any failure rolls back the whole block.
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'captured',
                gatewayPaymentId: paymentEntity.id,
                method: paymentEntity.method ?? null,
              },
            });
            if (shouldConfirm) {
              await tx.pujaBooking.update({
                where: { id: payment.booking!.id },
                data: { status: 'confirmed' },
              });
              // P1-12: commission ledger row inside the tx.
              await writePujaCommissionOnConfirm(payment.booking!.id, tx);
            }
          });

          // PBO-12: post-commit fire-and-forget side-effects (invoice email +
          // referral reward). Prod confirms via webhook, so the referee credit
          // MUST run here. Network calls — never inside the tx.
          if (shouldConfirm) {
            await fireAndForgetPostConfirmSideEffects(
              payment.booking!.id,
              payment.booking!.userId,
            );
          }
        } else {
          // PBO-11 (2026-07-09): donation webhook backstop. Donations create no
          // prisma.payment row (raw INSERT), so when no Payment matches this
          // order id, try to resolve a donation by razorpay_order_id and
          // finalize it. Without this, a donor who closes the browser before
          // client-verify leaves money captured but the donation stuck
          // 'created' with no receipt. Idempotent via finalizeDonationReceipt.
          const donation = await findDonationByOrderId(paymentEntity.order_id);
          if (donation && donation.status !== 'paid') {
            await finalizeDonationReceipt(donation, paymentEntity.id, undefined);
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

    // Business rule #4: Priest payout gated on Aadhaar verification.
    // Refuse to mint the payout row if the assigned priest has not
    // completed KYC — admin should chase the priest, not silently queue
    // money to an unverified bank account.
    const priestKyc = await prisma.priest.findUnique({
      where: { id: booking.priestId },
      select: { aadhaarVerified: true, displayName: true },
    });
    if (!priestKyc) {
      throw new Error('Assigned priest not found.');
    }
    if (!priestKyc.aadhaarVerified) {
      throw new Error(
        `Priest "${priestKyc.displayName}" has not completed Aadhaar verification. Payout blocked until KYC clears.`
      );
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
    options?: { usdAmountOverride?: number },
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

    // Allow priest-offering bookings to pass an explicit USD amount
    // (basePrice * 9 per rule #2) since they don't go through PujaType.
    // For temple-anchored bookings the override is omitted and we fall
    // back to the PujaType.nriPrice column.
    const usdAmount = options?.usdAmountOverride ?? Number(booking.pujaType.nriPrice);
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
          // PBO-12: include userId so applyPostConfirmSideEffects can credit
          // the referral reward on the webhook path.
          include: { booking: { select: { id: true, status: true, userId: true } } },
        });
        if (payment) {
          const shouldConfirm =
            !!payment.booking && payment.booking.status === 'pending_payment';
          // P1-12: capture + confirm + commission ledger write in ONE
          // transaction. Previously two separate updates + a post-commit
          // commission write that swallowed failures.
          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                status: 'captured',
                gatewayPaymentId: intent.id,
                method: typeof intent.payment_method_types?.[0] === 'string'
                  ? intent.payment_method_types[0]
                  : 'card',
              },
            });
            if (shouldConfirm) {
              await tx.pujaBooking.update({
                where: { id: payment.booking!.id },
                data: { status: 'confirmed' },
              });
              // P1-12: commission ledger row inside the tx.
              await writePujaCommissionOnConfirm(payment.booking!.id, tx);
            }
          });

          // PBO-12: post-commit fire-and-forget side-effects (invoice email +
          // referral reward). Prod confirms via webhook, so the referee credit
          // MUST run here. Network calls — never inside the tx.
          if (shouldConfirm) {
            await fireAndForgetPostConfirmSideEffects(
              payment.booking!.id,
              payment.booking!.userId,
            );
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
