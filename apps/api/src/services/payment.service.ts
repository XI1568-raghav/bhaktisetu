import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { platformRateOf } from '../lib/commission-math.js';
import { writeTemplePayoutOnConfirm } from './temple-payout.service.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';
// PBO-11: donation webhook backstop. Donations write no prisma.payment row, so
// the booking webhook path never reaches them; these helpers let
// processWebhookEvent resolve + finalize a donation when no Payment matches.
import { findDonationByOrderId, finalizeDonationReceipt } from '../routes/donations.js';
import { handleSubscriptionEvent } from './recurring.service.js';

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

/**
 * RV-04 / S2C-15 (fixed 2026-08-11, owner-approved).
 *
 * A `Commission` row is what the payout engine pays a provider from:
 * `getPayoutBalance` sums `Commission.amount` for `providerId`. This writer got
 * BOTH of its fields wrong, in opposite directions:
 *
 *  1. `providerId: booking.priestId` wrote a **Priest.id**, while every read
 *     passes a **User.id** (`routes/payout-requests.ts` uses
 *     `request.currentUser!.id`). The rows were therefore orphaned — they
 *     matched no provider's balance, which is the only reason nobody was
 *     mispaid: pandits saw ₹0 rather than the wrong number.
 *  2. `amount: booking.platformCommission` wrote the **platform's 20% cut**
 *     into the field the payout engine treats as the **provider's earning**.
 *     `PujaBooking.priestPayout` — the pandit's 80%, computed and persisted at
 *     booking creation — is the correct value.
 *
 * Both halves had to change together, and that is why this sat open: repairing
 * the key alone would have connected every pandit to a row carrying the
 * platform's share, turning a visible ₹0 into a silent 75% underpayment
 * (₹1,100 puja → ₹220 paid where ₹880 is owed).
 *
 * The identical pair of defects was mirrored in booking.service's own confirm
 * writer and is fixed in the same change — a single writer moving alone would
 * desync the ledger.
 *
 * Existing orphaned rows are deliberately left as they are (owner decision): no
 * backfill, so this creates no retroactive payable. They stay unmatched and
 * inert exactly as before.
 */
async function writePujaCommissionOnConfirm(
  bookingId: string,
  tx: TxClient = prisma,
): Promise<void> {
  const booking = await tx.pujaBooking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      priceAmount: true,
      priestPayout: true,
      priestId: true,
      priest: { select: { userId: true } },
    },
  });
  if (!booking || !booking.priestId) return;
  // No linked User → no payable provider. Writing the row anyway is what
  // produced the orphans this fix exists to stop creating.
  const providerUserId = booking.priest?.userId;
  if (!providerUserId) return;

  const existing = await tx.commission.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (existing) return;
  // Decimal.js arithmetic — never coerce money to JS Number for the
  // ledger. percentage column is Decimal(5,4); it gets rounded by the
  // DB driver but the *input* must already be exact rational division.
  //
  // Column conventions are fixed in lib/commission-math.ts: `amount` is the
  // PROVIDER's earning, `percentage` is the PLATFORM's take rate. An earlier
  // pass of this fix wrote the provider's share into `percentage` too, which
  // silently inverted /astrologer-portal/earnings — one column, one meaning.
  const price = new Prisma.Decimal(booking.priceAmount as Prisma.Decimal);
  const providerEarning = new Prisma.Decimal(booking.priestPayout as Prisma.Decimal);
  const percentage = platformRateOf(price.sub(providerEarning), price);
  await tx.commission.create({
    data: {
      bookingId: booking.id,
      providerId: providerUserId,
      amount: providerEarning,
      percentage,
      status: 'PENDING',
    },
  });
}

// P0 #PBO-12 (2026-07-09): single post-confirm side-effect block. The client
// verify path ran commission + invoice + referral reward, but BOTH webhook
// paths (Razorpay payment.captured, and the since-removed Stripe
// payment_intent.succeeded) ran only
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
  // Booking revamp: snapshot the cancellation policy + notify the devotee +
  // kick off dispatch if this booking requested a speed tier (T1/T2/T3). All
  // fire-and-forget — none of these may roll back a captured payment.
  void (async () => {
    try {
      const { cancellationService } = await import('./cancellation.service.js');
      const { notifyDevotee, buildBookingCtx } = await import('./booking-notify.service.js');
      const { dispatchService } = await import('./dispatch.service.js');
      await cancellationService.snapshotPolicy(bookingId);
      const b = await prisma.pujaBooking.findUnique({
        where: { id: bookingId },
        include: {
          pujaType: { select: { name: true } },
          temple: { select: { name: true } },
          user: { select: { id: true, fullName: true, phone: true } },
        },
      });
      if (b) {
        await notifyDevotee('confirmed', buildBookingCtx(b as never));
        const tier = (b as { dispatchTier?: string }).dispatchTier;
        if (tier && tier !== 'scheduled') {
          await dispatchService.broadcast(bookingId, tier as 'instant' | 'one_hour' | 'senior');
        }
      }
    } catch (err) {
      console.warn('[payment.service] post-confirm dispatch/notify failed:', err);
    }
  })();
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

// Exported for the recurring-subscription mandate flow (razorpay.subscriptions
// .create) so that feature shares the single demo/live client instead of
// re-instantiating with its own env parsing. Demo-mode proxy returns synthetic
// ids for any method, so mandate creation is a safe no-op there.
export { razorpay, isDemoPayment };

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
  /** RV-12: which cancellation tier produced `amount` (absent when the caller named the amount). */
  tierLabel?: string;
  /** RV-12: the tier's refundFraction (0..1). Absent when the caller named the amount. */
  refundFraction?: number;
}

/** RV-12 (2026-08-10): options for the admin refund path. See PaymentService.processRefund. */
export interface AdminRefundOptions {
  /**
   * Explicit refund amount in INR (partial refund). Clamped to whatever is
   * still refundable on the payment. Omit to apply the booking's cancellation
   * ladder instead.
   */
  amountInr?: number;
  /**
   * Force a 100% refund of everything still refundable, bypassing the ladder.
   * This is the PANDIT-FAULT / platform-fault path — policy
   * `panditCancelRefundFraction` is 1.0, the devotee is always made whole.
   */
  fullRefund?: boolean;
  /** Reason recorded on the Payment metadata + Razorpay notes. Defaults to the booking's. */
  reason?: string;
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
        // RV-03: the temple's 5% share, in the SAME transaction as the
        // commission that earned it. Without this call temples receive Rs 0.00
        // on every paid booking — the writer exists but nothing reaches it.
        await writeTemplePayoutOnConfirm(payment.booking!.id, tx);
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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Fail CLOSED with the signature message so the route returns 400 (never
      // 200-swallow). An unset secret must reject, not "process" the event.
      throw new Error('Webhook signature verification failed.');
    }
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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Fail CLOSED: no configured secret → reject with the signature message
      // so the route returns 400, never a 200 "Internal processing error".
      throw new Error('Webhook signature verification failed.');
    }
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
        // RV-03: the temple's 5% share, in the SAME transaction as the
        // commission that earned it. Without this call temples receive Rs 0.00
        // on every paid booking — the writer exists but nothing reaches it.
        await writeTemplePayoutOnConfirm(payment.booking!.id, tx);
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

      default: {
        // Recurring devotional subscriptions (UPI Autopay mandate lifecycle).
        // subscription.* events carry the subscription entity, not a payment.
        if (event.startsWith('subscription.')) {
          const subEntity = payload.payload?.subscription?.entity;
          await handleSubscriptionEvent(event, subEntity);
          return { handled: true, event };
        }
        // Unhandled event type — acknowledge but don't process
        return { handled: false, event };
      }
    }

    return { handled: false, event };
  }

  /**
   * Process a refund for a cancelled/refundable booking (admin path,
   * POST /api/v1/payments/:id/refund).
   *
   * RV-12 (2026-08-10): this method was structurally incapable of a partial
   * refund — it had no amount parameter at all and always sent 100% of the
   * captured amount to Razorpay, while the 100/75/50/25 cancellation ladder
   * was never referenced. On a Rs 1,100 booking cancelled 12h before the slot
   * the snapshotted policy awards the devotee 50% (Rs 550); the retained
   * Rs 550 is earmarked IN FULL as pandit compensation
   * (cancellationFeeToPriestFraction = 1.0), so a blanket 100% refund took
   * Rs 550 straight out of the pandit's pocket — and the platform still ate
   * the non-refundable Razorpay MDR on the original capture.
   *
   * Amount resolution, in precedence order:
   *   1. `opts.amountInr` — caller names the amount (partial).
   *   2. `opts.fullRefund` — force 100%: the pandit-fault / platform-fault
   *      path, where the devotee is always made whole.
   *   3. neither — apply the booking's SNAPSHOTTED cancellation ladder, the
   *      same computation refund.service's auto-refund cron performs. Only
   *      valid on a cancelled booking; anything else throws rather than guess.
   * Whatever is asked for is clamped to what is still refundable, so no path
   * can ever return more money than was taken.
   */
  async processRefund(
    bookingId: string,
    adminId?: string,
    opts: AdminRefundOptions = {}
  ): Promise<RefundResult> {
    // 1. Get booking and its captured payment
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          // RV-12: a `partially_refunded` payment is still a valid target — an
          // admin may top a partial up later — because we only ever send the
          // REMAINING balance. `refunded` stays excluded: that is the
          // double-refund guard, and it still holds.
          where: { status: { in: ['captured', 'partially_refunded'] } },
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

    // 2. Work out how much to refund. Money stays in Decimal all the way to
    //    the single paise conversion Razorpay's API requires.
    const paid = new Prisma.Decimal(payment.amount);
    const alreadyRefunded = payment.refundAmount
      ? new Prisma.Decimal(payment.refundAmount)
      : new Prisma.Decimal(0);
    const refundable = paid.minus(alreadyRefunded);

    if (refundable.lte(0)) {
      throw new Error('This payment has already been fully refunded.');
    }

    let requested: Prisma.Decimal;
    let tierLabel: string | undefined;
    let refundFraction: number | undefined;

    if (opts.amountInr !== undefined) {
      if (!Number.isFinite(opts.amountInr) || opts.amountInr <= 0) {
        throw new Error('Refund amount must be a positive number of rupees.');
      }
      requested = new Prisma.Decimal(opts.amountInr.toFixed(2));
    } else if (opts.fullRefund) {
      requested = refundable;
    } else {
      // RV-12: the ladder is a CANCELLATION instrument. On a booking that was
      // never cancelled — a dispute, a goodwill refund, or a `delivered` puja
      // whose PriestPayout already exists — it is meaningless: hoursUntilSlot
      // is negative, every tier fails its `minHoursBefore`, and
      // cancellation.service's `?? last tier` fallback would silently hand back
      // 25%. Refuse to guess with someone else's money; make the admin state
      // their intent. (Before this fix the same call silently refunded 100%.)
      if (!booking.cancelledAt && booking.status !== 'cancelled') {
        throw new Error(
          'This booking has not been cancelled, so the cancellation ladder does not apply. ' +
            'Pass an explicit refund amount, or fullRefund for a platform-fault refund.'
        );
      }
      // Dynamic import mirrors the confirm path above — keeps
      // cancellation.service out of this module's static load graph.
      const { cancellationService } = await import('./cancellation.service.js');
      const policy = await cancellationService.getPolicy(bookingId);
      const quote = cancellationService.computeDevoteeRefund({
        policy,
        scheduledDate: booking.scheduledDate,
        // scheduledDate is a DATE column (midnight); the slot carries the time.
        scheduledTimeSlot: booking.scheduledTimeSlot,
        pujaPriceInr: Number(booking.priceAmount),
        totalPaidInr: Number(payment.amount),
        // Measure the tier at the moment the devotee CANCELLED, not now. An
        // admin working the queue days later must not push them down a tier
        // for our own latency — same rule as processAutoRefunds.
        now: booking.cancelledAt ?? undefined,
      });
      requested = new Prisma.Decimal(quote.refundAmountInr.toFixed(2));
      tierLabel = quote.tierLabel;
      refundFraction = quote.refundFraction;
    }

    // Never send more than what is still refundable, whatever was asked for.
    const refundAmount = requested.gt(refundable) ? refundable : requested;
    if (refundAmount.lte(0)) {
      throw new Error(
        `No refund is due on this booking${tierLabel ? ` (${tierLabel})` : ''}.`
      );
    }

    const isFullRefund = refundAmount.plus(alreadyRefunded).gte(paid);
    const reason = opts.reason ?? booking.cancellationReason ?? 'Booking cancelled';

    // 3. Call Razorpay refund API
    const refundAmountInPaise = Number(refundAmount.mul(100).toFixed(0));

    const refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
      amount: refundAmountInPaise,
      notes: {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        adminId: adminId ?? 'system',
        reason: reason.slice(0, 250),
        tier: tierLabel ?? 'admin-specified amount',
      },
    }) as { id: string };

    const newRefundTotal = alreadyRefunded.plus(refundAmount);
    const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    // 4. Persist. Razorpay has already debited us; if the Payment write lands
    //    and the PujaBooking write does not, the devotee is refunded while the
    //    booking still looks live. Commit them together (refund.service does
    //    the same).
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          refundAmount: newRefundTotal,
          status: newPaymentStatus,
          metadata: {
            ...((payment.metadata as Record<string, unknown>) ?? {}),
            refundId: refund.id,
            refundedBy: adminId ?? 'system',
            refundedAt: new Date().toISOString(),
            refundAmountInr: refundAmount.toFixed(2),
            refundReason: reason,
            refundTier: tierLabel ?? null,
          },
        },
      });

      if (isFullRefund) {
        await tx.pujaBooking.update({
          where: { id: bookingId },
          data: {
            status: 'refunded',
            cancelledAt: booking.cancelledAt ?? new Date(),
            cancellationReason: `[refunded] ${reason}`.slice(0, 500),
          },
        });
      } else {
        await tx.pujaBooking.update({
          where: { id: bookingId },
          data: {
            // RV-12: a partial does NOT flip the booking to 'refunded' — but the
            // "[refund-requested]" marker MUST be cleared. The auto-refund cron
            // selects bookings on that marker and treats a `partially_refunded`
            // payment as still refundable, so leaving it in place would let the
            // cron refund the same booking a second time an hour later.
            cancellationReason:
              `[partially-refunded ${refundAmount.toFixed(2)}] ${reason}`.slice(0, 500),
          },
        });
      }
    });

    return {
      refundId: refund.id,
      paymentId: payment.id,
      bookingId: booking.id,
      amount: refundAmount.toNumber(),
      status: newPaymentStatus,
      ...(tierLabel ? { tierLabel } : {}),
      ...(refundFraction !== undefined ? { refundFraction } : {}),
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

    // ── The two payout rails must never both own the same booking ──────────
    //
    // Found by adversarial review 2026-08-11, and created by the RV-04 fix
    // earlier the same day. Two independent rails carry the pandit's 80%:
    //
    //   A. Commission -> PayoutRequest  (the unified rail, #233; all roles)
    //   B. PriestPayout                 (the legacy pandit-only rail, here)
    //
    // Before RV-04 these could not collide: the Commission row was keyed on a
    // Priest.id that no payout read ever matched, so it was inert and rail B
    // was the only one that paid. Repairing that key made BOTH rails live and
    // payable for the same money, with nothing cross-checking them. On a
    // Rs 5,000 booking the platform would transfer Rs 4,000 through /payouts
    // AND Rs 4,000 through /admin/bookings: Rs 8,000 out on Rs 5,000 of
    // revenue.
    //
    // The unified rail wins where it exists — it is the documented direction
    // and the only one that pays every role. Rail B stays for the bookings
    // rail A structurally cannot reach: a Commission is only minted when a
    // priest is already on the booking at `confirmed`, so temple-path and
    // dispatch-assigned (T1-T3) bookings never get one and would otherwise be
    // paid by nothing at all.
    const unifiedLedgerRow = await prisma.commission.findFirst({
      // A REVERSED row is a void earning that no provider owns any more — it
      // exists only as an audit record (a reschedule detaches the pandit and
      // reverses his commission). It must NOT hold the booking hostage: if it
      // did, the replacement pandit would be paid by neither rail, since the
      // unified rail has nothing live for him and this guard would block the
      // legacy one. Only a LIVE commission means "rail A owns this booking".
      where: { bookingId, status: { not: 'REVERSED' } },
      select: { id: true },
    });
    if (unifiedLedgerRow) {
      return {
        skipped: true as const,
        reason: 'commission-ledger-owns-this-booking' as const,
        commissionId: unifiedLedgerRow.id,
      };
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

  // markPayoutPaid — REMOVED 2026-08-11. It completed a PriestPayout (rail B)
  // and, in the same transaction, flipped the FIRST Commission row matching
  // that booking (rail A) to PAID — no `status` predicate, no
  // `payoutRequestId` predicate. It never had a caller in its life.
  //
  // Deleted rather than guarded because it was the LAST way to write across
  // the two rails, and the guard above now makes them mutually exclusive by
  // construction: a PriestPayout and a Commission can only share a booking on
  // pre-guard legacy data, which is exactly the data a cross-rail write
  // corrupts. refund.service scopes its REVERSED write to
  // `payoutRequestId: null`, so this was also the only code path able to put a
  // non-PENDING row inside an OPEN PayoutRequest. Wired to an admin "release
  // payout" button it would strand one: flipping c1 to PAID while c1 is still
  // linked to pr-1 makes payout.service.processPayout's completion guard throw
  // "1 of 2 commissions on this payout request are no longer PENDING" forever,
  // and the only exit — reject — unlinks both rows, at which point the PAID one
  // drops out of getPayoutBalance and the provider's Rs 4,000 is simply gone.
  //
  // Consequence worth keeping true: this service now MINTS commission rows
  // (both writers create them PENDING) and never mutates an existing one's
  // status. Commission lifecycle belongs to payout.service and refund.service.
  // See the prototype-surface lock in payment.service.test.ts.

  // createStripeOrder — REMOVED 2026-08-11 with the Stripe rail (owner
  // directive). It opened a USD PaymentIntent for NRI puja bookings priced off
  // PujaType.nriPrice. Its route (POST /bookings/create-stripe-order) went in
  // Batch 1 with RV-01; this removes the service method behind it so no caller
  // can resurrect a USD charge path. Razorpay + INR only.

  // handleStripeWebhook — REMOVED 2026-08-11 with the Stripe rail. It verified
  // Stripe's HMAC over the raw bytes and handled payment_intent.succeeded /
  // .payment_failed / charge.refunded. With no Stripe charge path left there is
  // nothing to receive: any inbound event would reference a Payment row this
  // platform can no longer create. Its route (POST /payments/webhook/stripe) is
  // removed in the same change — an unauthenticated endpoint that outlives its
  // sender is attack surface, not a safety net.

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
