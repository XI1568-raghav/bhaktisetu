import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { withGatewayTimeout } from '../lib/razorpay-timeout.js';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { PaymentGatewayError, PAYMENT_GATEWAY_USER_MESSAGE, describeGatewayFailure } from '../lib/payment-gateway-error.js';
export { PaymentGatewayError, PAYMENT_GATEWAY_USER_MESSAGE, describeGatewayFailure };
import { platformRateOf } from '../lib/commission-math.js';
import { writeTemplePayoutOnConfirm } from './temple-payout.service.js';
// P0 #S-04 (2026-07-09): the store path never wrote commissions, so store
// owners' earnings sat at ₹0. The writer that closed it was then copied into
// BOTH this file and store-commission.service.ts — which calls itself "the
// single shared writer" — so the same money arithmetic existed twice and the
// same attribution bug had to be fixed twice (2026-09-02: a hard-deleted
// product silently cancelled the owner's commission). One copy now.
import { writeStoreOrderCommission } from './store-commission.service.js';
import {
  reverseBookingLedger,
  reduceBookingLedgerForPartialRefund,
  // OPS-05: the SHARED COMMISSION_REVERSED emitter. It lives beside the unwind
  // it describes so the four rails that unwind cannot drift into three
  // different audit stories — which is the same failure mode the unwind itself
  // was extracted to end (DI-01).
  recordLedgerReversal,
  type LedgerReversalResult,
  type PartialLedgerResult,
} from './ledger-reversal.service.js';
// PAY-03: ONE implementation of the "which Razorpay refund ids have already
// been applied to this Payment" rule, shared by both refund rails and the
// refund webhook. Two copies of a money rule is exactly how this finding
// happened — do not inline it.
import { appendRefundId } from './refund.service.js';
// OPS-05: the durable money trail. `recordMoneyEvent` never throws, never
// rejects and never joins the caller's transaction, so every call below is
// safe to `void` — a logging failure must not roll back a real capture. Record
// AFTER the write it describes, and after a `$transaction` has RESOLVED.
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';
// DI-09: the narrowing for the error a UNIQUE index raises. It has lived in
// wallet.service.ts since the wallet was written and had ZERO call sites — it
// was correct, dead and undefended. `createPriestPayout` is its first real
// user; see the P2002 branch there for why a bare `err.code === 'P2002'` check
// is not good enough on a money path.
import { isUniqueViolation } from './wallet.service.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';
import { deliverOrQueue, type OutboxMail } from '../lib/email-outbox.js';
import { esc } from '../lib/html-escape.js';
// PBO-11: donation webhook backstop. Donations write no prisma.payment row, so
// the booking webhook path never reaches them; these helpers let
// processWebhookEvent resolve + finalize a donation when no Payment matches.
import { findDonationByOrderId, finalizeDonationReceipt } from '../routes/donations.js';
import { handleSubscriptionEvent } from './recurring.service.js';

/**
 * Send a puja-booking payment receipt to the devotee. Best-effort: any failure
 * (PDF, email, or DB read) is swallowed and logged so it can never block
 * the payment-confirmation flow this is called from.
 */
/** The receipt email for a puja booking, rebuilt from the booking id alone (outbox retry too). */
export async function composePujaBookingInvoiceMail(bookingId: string): Promise<OutboxMail | null> {
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
  if (!booking || !booking.user.email) return null;
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
  return {
    to: booking.user.email,
    subject: `Darshya payment receipt — ${booking.bookingNumber}`,
    html: `<p>Namaste ${esc(booking.user.fullName)},</p><p>Your payment receipt for booking <strong>${esc(booking.bookingNumber)}</strong> is attached.</p>`,
    text: `Payment receipt for booking ${booking.bookingNumber} attached.`,
    attachments: [
      { filename: `receipt-${booking.bookingNumber}.pdf`, content: pdf },
    ],
  };
}

async function sendPujaBookingInvoice(bookingId: string): Promise<void> {
  try {
    const mail = await composePujaBookingInvoiceMail(bookingId);
    if (!mail) return;
    // Inline attempt, then the email outbox retries a failure (lib/email-outbox.ts).
    await deliverOrQueue(mail, { kind: 'puja_invoice', refId: bookingId });
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
 * OPS-13 — record COMMISSION_MINTED for a store order whose owner commission
 * was just written. The store-order twin of `recordProviderEarningMinted`
 * (lib/audit-money-callsites.ts), and it exists for the same two reasons that
 * one does.
 *
 *   1. It must run AFTER the caller's transaction commits. `recordMoneyEvent`
 *      takes no `tx` on purpose: a failed audit INSERT inside a Postgres
 *      transaction aborts the whole transaction, and Prisma issues no
 *      per-query savepoint, so catching in JavaScript does not recover it.
 *      Logging from inside would let a broken audit table roll back a capture
 *      Razorpay has already taken.
 *   2. It must recover the commission id, which only exists after the write.
 *      `writeStoreOrderCommission` returns `void` — it cannot hand one back —
 *      so the row is re-read once the transaction is durable.
 *
 * Re-read rather than recomputed. The amount on the trail must be the amount in
 * the ledger; recomputing `total * (1 - platformRate)` here would make this a
 * SECOND writer of the same money figure, and the two would drift the first
 * time the rate changed.
 *
 * NEVER THROWS, same contract as `recordMoneyEvent` itself, extended to cover
 * the lookup. Both call sites are past the point of no return: the money is
 * captured and the order is CONFIRMED.
 *
 * Callers must invoke this only when their own transaction actually minted
 * (`shouldConfirm`). Calling it unconditionally would log a mint on every
 * replayed verify of an already-CONFIRMED order — the event's idempotency key
 * would collapse the duplicates, but the trail must not depend on that to be
 * truthful about which call did the work.
 */
async function recordStoreOrderCommissionMinted(
  storeOrderId: string,
  rail: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const commission = (await prisma.commission.findFirst({
      where: { storeOrderId },
      select: { id: true, amount: true, providerId: true },
      orderBy: { createdAt: 'desc' },
    })) as { id: string; amount: unknown; providerId: string | null } | null;

    // No row means the mint did not survive, or `writeStoreOrderCommission`
    // returned early (a legacy order it could not attribute to a store). A
    // trail row keyed on a commission id that is not real is worse than a gap —
    // this log is evidence.
    if (!commission?.id) return;

    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_MINTED,
      actorType: 'system',
      subjectType: 'commission',
      subjectId: commission.id,
      commissionId: commission.id,
      // `Commission.amount` is the PROVIDER's earning in rupees — here the
      // store owner's share, not the order total and not the platform's cut.
      // One column, one meaning (lib/commission-math.ts).
      amount: commission.amount as never,
      statusAfter: 'PENDING',
      // The bare natural key; recordMoneyEvent namespaces it by event type.
      idempotencyKey: commission.id,
      note: `store owner earning minted via ${rail}`,
      metadata: {
        rail,
        storeOrderId,
        ...(commission.providerId ? { providerId: commission.providerId } : {}),
        ...metadata,
      },
    });
  } catch (err) {
    // The lookup can fail even though recordMoneyEvent cannot. Swallow it for
    // the same reason recordMoneyEvent swallows: the capture has already
    // committed, and nothing about logging it may surface as a failure.
    console.warn(
      '[payment.service] failed to record store-order commission mint for',
      storeOrderId,
      err instanceof Error ? err.message : String(err),
    );
  }
}

/**
 * Best-effort store-order invoice (mirrors sendPujaBookingInvoice). Called
 * after Razorpay capture flips the order to CONFIRMED. Any failure is
 * swallowed so payment confirmation never blocks on email/PDF errors.
 */
export async function composeStoreOrderInvoiceMail(storeOrderId: string): Promise<OutboxMail | null> {
  const order = await prisma.storeOrder.findUnique({
    where: { id: storeOrderId },
    include: { user: { select: { fullName: true, email: true } } },
  });
  if (!order || !order.user.email) return null;
  type Item = { productId?: string; qty?: number; priceAtPurchase?: number; name?: string };
  type Addr = {
    fullName?: string; line1?: string; line2?: string; city?: string;
    state?: string; pincode?: string; country?: string;
  };
  const items: Item[] = Array.isArray(order.items)
    ? (order.items as unknown as Item[])
    : [];
  // QA 2026-10-13: order.items stores {productId, qty, priceAtPurchase} with no
  // name, so the receipt's description column printed the product's UUID; and
  // the delivery fee (part of totalAmountInr) was not itemised, so the lines did
  // not add up to the printed total. Resolve names, and add the fee as its own line.
  const ids = items.map((it) => it.productId).filter((id): id is string => typeof id === 'string');
  let named: Array<{ id: string; name: string }> = [];
  if (ids.length) {
    try {
      named = (await prisma.storeProduct.findMany({ where: { id: { in: ids } }, select: { id: true, name: true }, take: ids.length })) ?? [];
    } catch {
      named = [];
    }
  }
  const nameById = new Map(named.map((p) => [p.id, p.name]));
  const lineItems = items.map((it) => ({
    name: typeof it.name === 'string' ? it.name : (nameById.get(it.productId ?? '') ?? 'Store item'),
    qty: Number(it.qty ?? 1),
    priceInr: Number(it.priceAtPurchase ?? 0),
  }));
  const itemsSubtotal = lineItems.reduce((a, l) => a + l.qty * l.priceInr, 0);
  const feeInr = Math.round((Number(order.totalAmountInr) - itemsSubtotal) * 100) / 100;
  if (feeInr > 0) lineItems.push({ name: 'Delivery & handling', qty: 1, priceInr: feeInr });
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
  return {
    to: order.user.email,
    subject: `Darshya payment receipt — ${order.orderNumber}`,
    html: `<p>Namaste ${esc(order.user.fullName)},</p><p>Your payment receipt for order <strong>${esc(order.orderNumber)}</strong> is attached.</p>`,
    text: `Payment receipt for order ${order.orderNumber} attached.`,
    attachments: [
      { filename: `receipt-${order.orderNumber}.pdf`, content: pdf },
    ],
  };
}

async function sendStoreOrderInvoice(storeOrderId: string): Promise<void> {
  try {
    const mail = await composeStoreOrderInvoiceMail(storeOrderId);
    if (!mail) return;
    await deliverOrQueue(mail, { kind: 'store_invoice', refId: storeOrderId });
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
/**
 * What a mint produced, handed back so the CALLER can put it on the money
 * trail after its transaction commits (OPS-05).
 *
 * The row is created inside the caller's `$transaction`, but the audit write
 * must not be: `recordMoneyEvent` deliberately accepts no `tx`, because a
 * failed audit INSERT inside the caller's transaction aborts it in Postgres
 * and would roll back a real capture. So the mint is returned rather than
 * logged here, and every caller records it after its `$transaction` resolves.
 * `null` means no row was written — an existing commission, no pandit, or a
 * pandit with no linked User — and callers must NOT log a mint for it.
 */
interface MintedCommission {
  commissionId: string;
  providerId: string;
  /** The PROVIDER's earning in rupees — `Commission.amount`, per commission-math. */
  amount: Prisma.Decimal;
}

async function writePujaCommissionOnConfirm(
  bookingId: string,
  tx: TxClient = prisma,
): Promise<MintedCommission | null> {
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
  if (!booking || !booking.priestId) return null;
  // No linked User → no payable provider. Writing the row anyway is what
  // produced the orphans this fix exists to stop creating.
  const providerUserId = booking.priest?.userId;
  if (!providerUserId) return null;

  const existing = await tx.commission.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (existing) return null;
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
  // DI-06: `createMany({ skipDuplicates })`, not `create`, and the difference
  // is the whole point of the fix.
  //
  // migrations/20260824000000_di0607_money_key_indexes added the UNIQUE index
  // `commissions_booking_id_key`, which is the right constraint — the findFirst
  // above was an application-level TOCTOU with nothing behind it. But a
  // constraint changes what the LOSER of that race experiences. Both
  // confirmation rails (POST /payments/verify and the Razorpay webhook) can be
  // in flight for one booking at once — that is why `claimCaptureTransition`
  // exists, and its comment records the decision to leave the ledger writes
  // ungated because they "carry their own findFirst idempotency guards". Under
  // a bare `create`, the second INSERT now raises 23505 → P2002, and because
  // P1-12 moved this writer INSIDE the caller's `$transaction`, that aborts the
  // whole Postgres transaction: catching the error in JavaScript does not
  // recover it (Prisma issues no per-query savepoint), so the capture, the
  // booking confirm and the temple share roll back with it, and the caller
  // answers 500 for money Razorpay has already taken.
  //
  // `skipDuplicates` compiles to `INSERT ... ON CONFLICT DO NOTHING`, which is
  // not an error and therefore cannot poison the transaction. The loser writes
  // nothing — precisely what the findFirst guard was reaching for.
  //
  // It is equally correct where the constraint does NOT exist: that migration
  // creates each UNIQUE index only after proving the key is clean and announces
  // a skip with RAISE WARNING, so on a dirty table there may be no constraint
  // at all. With none, ON CONFLICT never fires and the guard above does all the
  // work, exactly as before.
  const inserted = (await tx.commission.createMany({
    data: [
      {
        bookingId: booking.id,
        providerId: providerUserId,
        amount: providerEarning,
        percentage,
        status: 'PENDING',
      },
    ],
    skipDuplicates: true,
  })) as { count?: number } | undefined;

  // `count: 0` means the conflict fired: the other rail owns this booking's
  // commission. That is idempotent success, not failure — but this transaction
  // minted nothing, so it must not hand the caller a mint to log. Reporting one
  // would put a second COMMISSION_MINTED on the money trail for one earning.
  if (inserted?.count !== 1) return null;

  // `createMany` returns only a count on PostgreSQL, so the id comes from a
  // read-back on the key we just inserted — a single index lookup, on the
  // index DI-07 added (`commissions_booking_id_idx`).
  const created = (await tx.commission.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  })) as { id: string } | null | undefined;

  // OPS-05: hand the mint back rather than logging it here — see
  // MintedCommission. A driver that returns nothing (a mock) must not be
  // reported as a mint the caller can key an audit row on.
  if (!created?.id) return null;
  return { commissionId: created.id, providerId: providerUserId, amount: providerEarning };
}

/**
 * PAY-09 (2026-08-20, P3): claim the initiated → captured transition.
 *
 * Both confirmation rails — POST /payments/verify and the Razorpay webhook —
 * computed `shouldConfirm` from a read taken BEFORE their transaction. Two
 * overlapping reads both see `pending_payment`, both transactions commit, and
 * both then fire the post-confirm side-effects: two payment receipts, two
 * "confirmed" notifications, two referral-reward attempts for one booking.
 *
 * This conditional UPDATE is the single-winner gate. Exactly one transaction
 * moves the row off `captured`, whichever one gets there first, and it reports
 * 1; the loser reports 0. Run INSIDE the caller's transaction so the claim and
 * the confirm commit or roll back together.
 *
 * Deliberately gates ONLY the notices. The ledger writes stay ungated — they
 * carry their own findFirst idempotency guards, and skipping them on a lost
 * race would risk a booking with no commission row, which is far worse than a
 * duplicate email.
 *
 * A non-numeric result (no such row) counts as NOT won: silence is the safe
 * failure for a duplicate-suppression gate.
 */
async function claimCaptureTransition(tx: TxClient, paymentId: string): Promise<boolean> {
  try {
    const claimed = await tx.$executeRawUnsafe(
      `UPDATE payments SET status = 'captured' WHERE id = $1::uuid AND status <> 'captured';`,
      paymentId,
    );
    return Number(claimed) === 1;
  } catch {
    return false;
  }
}

/** PAY-02: the StoreOrder shape both the client-verify and webhook rails confirm. */
interface StoreOrderConfirmRow {
  id: string;
  orderNumber: string;
  status: string;
  statusHistory: unknown;
  userId: string;
}

/**
 * PAY-08 (2026-08-20, P2): re-check slot capacity at CAPTURE time.
 *
 * `activeSlotHoldWhere` stops counting an unpaid `pending_payment` booking
 * against its slot once the row is older than `UNPAID_HOLD_MINUTES` — that is
 * deliberate (an abandoned checkout must not burn a pandit's calendar), but it
 * means the slot can legitimately be resold to someone else while a Razorpay
 * capture is still in flight. Razorpay retries a webhook for up to 24 hours, so
 * a capture landing after the hold lapsed used to confirm the stale booking
 * into a slot that was already full, in complete silence.
 *
 * Returns a human-readable note when confirming would oversell, or null.
 *
 * Deliberately advisory: the caller still confirms. A devotee who has paid must
 * not be stranded, and an oversold slot is something an operator can move; what
 * was missing was any detection at all. Fails OPEN (returns null) on any error —
 * a diagnostic must never be able to block a capture.
 *
 * BOTH capture→confirm anchors are covered (extended 2026-08-21). A PujaBooking
 * is anchored either on `templePujaOfferingId` (temple catalog) or on
 * `priestPujaOfferingId` (pandit-direct) — two different columns on the same
 * row, each with its own `maxBookingsPerSlot`. The first pass handled only the
 * temple column and returned null for a pandit booking, which left the
 * STRICTEST capacity in the product (PriestPujaOffering.maxBookingsPerSlot
 * defaults to 1 — one devotee per pandit per slot) as the one case with no
 * detection at all. The predicate below mirrors booking.service's own
 * `capacityWhere` (booking.service.ts:1326) rather than inventing a second
 * definition of "the same slot".
 */
async function slotOversoldNote(booking: {
  id: string;
  createdAt: Date;
  templePujaOfferingId: string | null;
  priestPujaOfferingId?: string | null;
  scheduledDate: Date | null;
  scheduledTimeSlot: string | null;
}): Promise<string | null> {
  try {
    // Temple anchor wins when both are somehow set: it is the column
    // booking.service's create path checks capacity against.
    const anchor: { column: 'templePujaOfferingId' | 'priestPujaOfferingId'; id: string } | null =
      booking.templePujaOfferingId
        ? { column: 'templePujaOfferingId', id: booking.templePujaOfferingId }
        : booking.priestPujaOfferingId
          ? { column: 'priestPujaOfferingId', id: booking.priestPujaOfferingId }
          : null;

    if (
      !anchor ||
      !booking.scheduledDate ||
      !booking.scheduledTimeSlot ||
      !booking.createdAt
    ) {
      return null;
    }
    // Importing booking.service statically would close a cycle (booking.service
    // imports this module). The import only happens on the rare late-capture
    // path, never on the common one.
    const { activeSlotHoldWhere, UNPAID_HOLD_MINUTES } = await import(
      './booking.service.js'
    );
    const heldForMs = Date.now() - new Date(booking.createdAt).getTime();
    if (heldForMs < UNPAID_HOLD_MINUTES * 60_000) return null;

    const offering =
      anchor.column === 'templePujaOfferingId'
        ? await prisma.templePujaOffering.findUnique({
            where: { id: anchor.id },
            select: { maxBookingsPerSlot: true },
          })
        : await prisma.priestPujaOffering.findUnique({
            where: { id: anchor.id },
            select: { maxBookingsPerSlot: true },
          });
    const max = Number(offering?.maxBookingsPerSlot ?? 1);
    const others = Number(
      (await prisma.pujaBooking.count({
        where: {
          [anchor.column]: anchor.id,
          scheduledDate: booking.scheduledDate,
          scheduledTimeSlot: booking.scheduledTimeSlot,
          id: { not: booking.id },
          ...activeSlotHoldWhere(),
        },
      })) ?? 0,
    );
    if (!Number.isFinite(others) || others < max) return null;
    const anchorLabel = anchor.column === 'priestPujaOfferingId' ? 'pandit' : 'temple';
    return `${anchorLabel} slot already holds ${others} of ${max} bookings (capture landed ${Math.round(
      heldForMs / 60_000,
    )} min after the booking was created)`;
  } catch {
    return null;
  }
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
        // A temple offering's "Assigned Priest" routes the booking to that
        // pandit instead of the open pool; any miss leaves it in the pool.
        const pinned = await dispatchService.assignPinnedPriest(bookingId);
        const tier = (b as { dispatchTier?: string }).dispatchTier;
        if (!pinned.assigned && tier && tier !== 'scheduled') {
          await dispatchService.broadcast(bookingId, tier as 'instant' | 'one_hour' | 'senior');
        }
      }
    } catch (err) {
      console.warn('[payment.service] post-confirm dispatch/notify failed:', err);
    }
  })();
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
  : withGatewayTimeout(new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret }));

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
  /** PAY-03: set when a refund event carried an id already applied to the Payment. */
  duplicate?: boolean;
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

    let razorpayOrder: { id: string };
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: booking.currency,
        receipt: booking.bookingNumber,
        notes: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          userId,
        },
      });
    } catch (err) {
      const f = describeGatewayFailure(err);
      console.error(
        '[payment.service] razorpay.orders.create failed',
        JSON.stringify({ bookingNumber: booking.bookingNumber, amountInPaise, currency: booking.currency, gatewayStatus: f.status, gatewayCode: f.code, gatewayReason: f.reason }),
      );
      throw new PaymentGatewayError(PAYMENT_GATEWAY_USER_MESSAGE, f.status, f.code, f.reason);
    }

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

    // OPS-05 — rupees, never the paise figure sent to the gateway.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_INITIATED,
      actorType: 'devotee',
      actorId: userId,
      subjectType: 'payment',
      subjectId: payment.id,
      bookingId: booking.id,
      paymentId: payment.id,
      amount: booking.priceAmount,
      currency: booking.currency,
      gateway: 'razorpay',
      gatewayOrderId: razorpayOrder.id,
      statusAfter: 'initiated',
      idempotencyKey: razorpayOrder.id,
      note: `Razorpay order opened for ${booking.bookingNumber}`,
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
          // PAY-08: the slot coordinates ride along so this rail can run the
          // same capacity re-check the webhook rail runs. `createdAt` is what
          // tells us the unpaid hold has lapsed; both offering columns are
          // needed because a booking is anchored on the temple catalog OR on a
          // pandit's own catalog.
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            userId: true,
            createdAt: true,
            templePujaOfferingId: true,
            priestPujaOfferingId: true,
            scheduledDate: true,
            scheduledTimeSlot: true,
          },
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

    // DI-09: never repoint a captured payment at a different gateway id.
    //
    // The update below used to stamp `gatewayPaymentId` unconditionally. Two
    // correctly-signed verify calls for the same order with DIFFERENT payment
    // ids both returned 200 and the second silently overwrote the first, which
    // matters because refund.service issues refunds against
    // `captured.gatewayPaymentId` — after an overwrite the refund targets
    // whichever id was seen last, not the one that actually took the money, and
    // the record of which payment settled the booking is gone. A gateway retry
    // carrying a new id is enough to trigger it.
    //
    // Replaying the SAME id stays idempotent (below). A different one is two
    // successful captures against one order: a reconciliation problem, so it is
    // refused with both ids in the message rather than absorbed.
    if (
      payment.status === 'captured' &&
      payment.gatewayPaymentId &&
      payment.gatewayPaymentId !== razorpayPaymentId
    ) {
      console.error(
        `[payment][DI-09] verify-payment replay with a conflicting gateway id on payment ${payment.id} ` +
          `(order ${razorpayOrderId}): captured as ${payment.gatewayPaymentId}, now presented ${razorpayPaymentId}. ` +
          'Refusing to overwrite — reconcile in the Razorpay dashboard.',
      );
      throw new Error(
        `This booking already captured under payment ${payment.gatewayPaymentId}; ` +
          `${razorpayPaymentId} is a different payment. Refusing to overwrite the settled id — ` +
          'please reconcile this order before retrying.',
      );
    }

    // 3+4. Capture payment and confirm booking atomically — a crash
    // between the two updates previously left a captured Payment with a
    // pending_payment Booking until the webhook retried.
    const shouldConfirm = payment.booking.status === 'pending_payment';
    // PAY-08: the client-verify rail confirms too, and it is NOT immune to the
    // late-capture race the webhook rail guards. This is the browser callback
    // from the Razorpay modal; the unpaid hold is only UNPAID_HOLD_MINUTES (30)
    // long, so a devotee who is interrupted mid-checkout and finishes paying an
    // hour later arrives HERE, into a slot that may already have been resold.
    // Read before the transaction so it never runs inside one.
    const oversold = shouldConfirm ? await slotOversoldNote(payment.booking) : null;
    // QA 2026-10-13: money for a booking that was cancelled while the checkout
    // was still open. The gateway really took it, so the capture is recorded,
    // but the booking must not silently stay cancelled with nobody owed a
    // refund: flag it for the admin queue and tell the devotee plainly.
    const paidAfterCancel =
      payment.booking.status === 'cancelled' || payment.booking.status === 'refunded';
    // OPS-05: carried OUT of the transaction so the mint can be recorded after
    // it commits. Nothing may be logged from inside — a failed audit INSERT in
    // the caller's tx aborts it in Postgres and rolls back the capture.
    let mintedCommission: MintedCommission | null = null;
    // PAY-09: single-winner claim — see claimCaptureTransition. Without it this
    // rail and the webhook, racing on the same booking, each sent the devotee a
    // payment receipt and a confirmation.
    let capturedNow = false;
    await prisma.$transaction(async (tx) => {
      capturedNow = await claimCaptureTransition(tx, payment.id);
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'captured',
          gatewayPaymentId: razorpayPaymentId,
          ...(oversold
            ? {
                metadata: {
                  ...((payment.metadata as Record<string, unknown>) ?? {}),
                  slotOversoldAt: new Date().toISOString(),
                  slotOversoldNote: oversold,
                  needsAdminReview: 'slot-capacity',
                },
              }
            : paidAfterCancel
              ? {
                  metadata: {
                    ...((payment.metadata as Record<string, unknown>) ?? {}),
                    paidAfterCancelAt: new Date().toISOString(),
                    needsAdminReview: 'paid-after-cancel',
                  },
                }
              : {}),
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
        mintedCommission = await writePujaCommissionOnConfirm(payment.booking!.id, tx);
        // RV-03: the temple's 5% share, in the SAME transaction as the
        // commission that earned it. Without this call temples receive Rs 0.00
        // on every paid booking — the writer exists but nothing reaches it.
        await writeTemplePayoutOnConfirm(payment.booking!.id, tx);
      }
    });

    if (paidAfterCancel) {
      console.error(
        '[payment.service] paid_after_cancel',
        JSON.stringify({ bookingId: payment.booking!.id, paymentId: payment.id, gatewayOrderId: razorpayOrderId }),
      );
      throw new Error(
        'Your payment was received, but this booking had already been cancelled. ' +
          'We have flagged it for a full refund. You do not need to pay again.',
      );
    }

    if (oversold) {
      // Same marker string the webhook rail emits, so one grep
      // (`slot_oversold_capture`) and one reconciliation query cover all
      // confirm rails instead of the queue silently missing a third of them.
      console.error(
        '[payment.service][PAY-08] slot_oversold_capture',
        JSON.stringify({
          event: 'slot_oversold_capture',
          rail: 'client-verify',
          bookingId: payment.booking!.id,
          paymentId: payment.id,
          gatewayOrderId: razorpayOrderId,
          note: oversold,
        }),
      );
    }

    // OPS-05 — the provider's earning, recorded AFTER the transaction commits.
    // COMMISSION_REVERSED was already on the trail and COMMISSION_MINTED was
    // not, so a reconstructed dispute showed an earning being VOIDED that never
    // appeared to have been CREATED. `mintedCommission` is null whenever no row
    // was written (already minted, no pandit, pandit with no linked User), and
    // a null must never be logged as a mint.
    if (mintedCommission) {
      const minted: MintedCommission = mintedCommission;
      void recordMoneyEvent({
        eventType: MONEY_EVENTS.COMMISSION_MINTED,
        actorType: 'system',
        subjectType: 'commission',
        subjectId: minted.commissionId,
        bookingId: payment.booking!.id,
        paymentId: payment.id,
        commissionId: minted.commissionId,
        // Commission.amount is the PROVIDER's earning (lib/commission-math.ts),
        // in rupees. Not the booking price, not the platform's cut.
        amount: minted.amount,
        currency: payment.currency,
        statusAfter: 'PENDING',
        idempotencyKey: minted.commissionId,
        note: 'provider earning minted on the client-verify confirm rail',
        metadata: {
          rail: 'client-verify',
          providerId: minted.providerId,
          gatewayPaymentId: razorpayPaymentId,
        },
      });
    }

    // OPS-05 — the client-verify rail, recorded AFTER the transaction commits.
    // `payment.status` is the pre-image read before the update; it is the one
    // fact the mutable status column can never answer afterwards, and the
    // reason a dispute can tell "verified then captured" from "captured twice".
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_VERIFIED,
      actorType: userId ? 'devotee' : 'system',
      actorId: userId ?? null,
      subjectType: 'payment',
      subjectId: payment.id,
      bookingId: payment.booking!.id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      gateway: 'razorpay',
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      statusBefore: payment.status,
      statusAfter: 'captured',
      idempotencyKey: razorpayPaymentId,
      note: 'client-verify rail (POST /payments/verify)',
      metadata: {
        rail: 'client-verify',
        confirmedBooking: shouldConfirm,
        capturedNow,
        ...(oversold ? { slotOversoldNote: oversold } : {}),
      },
    });

    // Post-commit side-effects (invoice email + referral reward) are network
    // calls that must NOT roll back a captured payment — fire-and-forget.
    const booking = payment.booking!;
    // PAY-09 — see the webhook rail for why `payment.status === 'captured'` is
    // an escape hatch rather than a hole.
    if (shouldConfirm && (capturedNow || payment.status === 'captured')) {
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
    let razorpayOrder: { id: string };
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.orderNumber,
        notes: {
          storeOrderId: order.id,
          orderNumber: order.orderNumber,
          userId,
        },
      });
    } catch (err) {
      const f = describeGatewayFailure(err);
      console.error(
        '[payment.service] razorpay.orders.create failed (store)',
        JSON.stringify({ orderNumber: order.orderNumber, gatewayStatus: f.status, gatewayCode: f.code, gatewayReason: f.reason }),
      );
      throw new PaymentGatewayError(PAYMENT_GATEWAY_USER_MESSAGE, f.status, f.code, f.reason);
    }

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

    // OPS-13 — the store-order rail joins the money trail. A REAL Razorpay
    // order has just been opened and a Payment row written at `initiated`; the
    // puja rail has recorded exactly this since OPS-05 (:756) and the store
    // rail recorded nothing, so "when did checkout open for this order" was
    // unanswerable from anything the product stores.
    //
    // `subjectType: 'store_order'` matches the store rail's existing webhook
    // event rather than the puja rail's 'payment': `MoneySubjectType` declares
    // 'store_order' (lib/audit-money.ts:109) and PAYMENT_CAPTURED on the
    // webhook path already keys on the order. One rail, one subject.
    //
    // RUPEES off the stored DECIMAL(10,2), never `amountInPaise` — a paise
    // figure both overflows the audit column and silently breaks every sum
    // taken over the trail.
    //
    // Deliberately NOT emitted on the idempotent-reuse branch above: a refresh
    // mid-checkout opens no order and writes no row, and an event there would
    // put one checkout on the trail once per page reload.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_INITIATED,
      actorType: 'devotee',
      actorId: userId,
      subjectType: 'store_order',
      subjectId: order.id,
      paymentId: payment.id,
      amount: order.totalAmountInr,
      currency: 'INR',
      gateway: 'razorpay',
      gatewayOrderId: razorpayOrder.id,
      statusAfter: 'initiated',
      idempotencyKey: razorpayOrder.id,
      note: `Razorpay order opened for store order ${order.orderNumber}`,
      metadata: { rail: 'store-order-create', orderNumber: order.orderNumber },
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
        await writeStoreOrderCommission(storeOrder.id, tx);
      }
    });

    // OPS-13 — everything below runs AFTER the transaction has RESOLVED, and
    // that placement is the whole design, not a formatting choice. The audit
    // writer takes no `tx` because a failed INSERT inside a Postgres
    // transaction aborts it outright; logging from inside would let a missing
    // `money_audit_events` table roll back a capture the gateway has already
    // taken.
    if (shouldConfirm) {
      // The store owner's earning. Awaited rather than `void`ed: it re-reads
      // the commission row before it can log, and it swallows everything by
      // contract, so awaiting costs a round trip and buys the guarantee that
      // the trail row is down before this method answers.
      await recordStoreOrderCommissionMinted(storeOrder.id, 'store-client-verify', {
        gatewayPaymentId: razorpayPaymentId,
      });
      void sendStoreOrderInvoice(storeOrder.id);
    }

    // OPS-13 — the client-verify rail. `payment.status` is the pre-image read
    // before the update, and it is the one fact the mutable status column can
    // never answer afterwards: it is what separates "verified then captured"
    // from "captured twice" when a store order is disputed.
    //
    // PAYMENT_VERIFIED and NOT also PAYMENT_CAPTURED, matching the puja
    // client-verify rail (:987) and the two-rail split audit-money.ts:303
    // documents. The webhook records PAYMENT_CAPTURED for store orders already
    // (:1580) keyed on the SAME razorpay_payment_id, and the audit insert is
    // ON CONFLICT DO NOTHING — so a capture event emitted here would silently
    // erase the webhook's row, which is the one that records the GATEWAY as
    // the actor. The capture fact is carried by `statusAfter` instead.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_VERIFIED,
      actorType: 'devotee',
      actorId: userId,
      subjectType: 'store_order',
      subjectId: storeOrder.id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      gateway: 'razorpay',
      gatewayOrderId: razorpayOrderId,
      gatewayPaymentId: razorpayPaymentId,
      statusBefore: payment.status,
      statusAfter: 'captured',
      idempotencyKey: razorpayPaymentId,
      note: `client-verify rail (store order ${storeOrder.orderNumber})`,
      metadata: {
        rail: 'store-client-verify',
        orderNumber: storeOrder.orderNumber,
        confirmedOrder: shouldConfirm,
      },
    });

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
    this.assertWebhookSignature(JSON.stringify(payload), signature);
    return this.processWebhookEvent(payload);
  }

  /**
   * PAY-07 (2026-08-20, P2): the signature check on its own.
   *
   * The route has to be able to verify BEFORE it writes the webhook-idempotency
   * record. Recording first means an unsigned request can claim a real event's
   * id — the record lands, the request is rejected, and Razorpay's genuine
   * delivery is then dismissed as a duplicate and dropped in silence. That is
   * the exact reason the Stripe webhook route was deleted on 2026-08-11, and
   * the same ordering was left standing here.
   *
   * `signedPayload` is whatever Razorpay signed: the raw request bytes on the
   * (default) raw path, the re-serialised JSON on the legacy path. Both
   * handlers below route through this so the two can never drift apart.
   *
   * Throws the "signature verification failed" message the route maps to 400 —
   * including when the secret is UNSET, which must reject, never "process".
   */
  assertWebhookSignature(signedPayload: string, signature: string): void {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      // Fail CLOSED with the signature message so the route returns 400 (never
      // 200-swallow). An unset secret must reject, not "process" the event.
      throw new Error('Webhook signature verification failed.');
    }
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    // Timing-safe compare to defeat any timing-oracle attack on the HMAC
    // equality check. Both sides are hex strings of the same length; if not,
    // force a mismatch.
    const expBuf = Buffer.from(expectedSignature, 'utf8');
    const sigBuf = Buffer.from(signature ?? '', 'utf8');
    if (expBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expBuf, sigBuf)) {
      throw new Error('Webhook signature verification failed.');
    }
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
    this.assertWebhookSignature(rawBody, signature);
    return this.processWebhookEvent(payload);
  }

  /**
   * Private: dispatch the verified webhook payload to the right
   * downstream Prisma updates. Both verification paths converge here.
   */
  /**
   * PAY-06 (2026-08-20, P1): apply a capture we DISCOVERED by polling Razorpay
   * rather than one Razorpay pushed to us.
   *
   * The whole confirmation design assumed the browser survives long enough to
   * call /verify, with the webhook as the only backstop — and nothing anywhere
   * ever went looking for a Payment stuck at `initiated` with a real capture
   * behind it. jobs/reconcile-payments.ts now does, and routes what it finds
   * through THIS method so the recovery path and the webhook path are the same
   * code. A second copy of "what confirming a capture means" is precisely the
   * drift that produced PAY-02.
   */
  async applyCapturedPayment(
    gatewayOrderId: string,
    gatewayPaymentId: string,
    method?: string | null,
  ): Promise<WebhookResult> {
    return this.processWebhookEvent({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: { id: gatewayPaymentId, order_id: gatewayOrderId, method: method ?? null },
        },
      },
    });
  }

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
            // PAY-08: the slot coordinates + createdAt let the confirm re-check
            // capacity — see slotOversoldNote. BOTH offering columns are
            // selected: a booking is anchored on the temple catalog OR on a
            // pandit's own catalog, and omitting the pandit column made the
            // re-check silently return null for every pandit-direct booking.
            booking: {
              select: {
                id: true,
                status: true,
                userId: true,
                createdAt: true,
                templePujaOfferingId: true,
                priestPujaOfferingId: true,
                scheduledDate: true,
                scheduledTimeSlot: true,
              },
            },
            // PAY-02 (2026-08-20, P0): a store order's Payment carries
            // `bookingId === null` BY DESIGN — Payment.bookingId is nullable
            // precisely so non-puja payments can use the same table. Every
            // downstream effect in this handler was gated on `!!payment.booking`,
            // so for a store order the webhook marked the Payment `captured` and
            // then did nothing at all: StoreOrder stayed PENDING forever, the
            // store owner's Commission was never written, no invoice was sent,
            // and nothing was ever shipped. Resolving the linked order here lets
            // the webhook run the SAME transaction verifyStoreOrderPayment runs.
            storeOrders: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                statusHistory: true,
                userId: true,
              },
            },
          },
        });

        // QA 2026-10-13: a signed capture whose amount differs from the order we
        // opened (a Rs 1 capture against a Rs 1,151 booking) used to confirm the
        // booking and mint the provider's full earning. Razorpay itself charges
        // exactly the order amount, so a mismatch means a wrong/forged event or a
        // reconciliation problem: record the capture for the admin queue, confirm
        // nothing, and let the operator decide.
        if (payment && paymentEntity.amount != null) {
          const expectedPaise = Math.round(Number(payment.amount) * 100);
          if (Number(paymentEntity.amount) !== expectedPaise) {
            console.error(
              '[payment][amount-mismatch] webhook capture refused',
              JSON.stringify({ paymentId: payment.id, orderId: paymentEntity.order_id, expectedPaise, gotPaise: paymentEntity.amount }),
            );
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                metadata: {
                  ...((payment.metadata as Record<string, unknown>) ?? {}),
                  needsAdminReview: 'amount-mismatch',
                  amountMismatch: { expectedPaise, gotPaise: Number(paymentEntity.amount), gatewayPaymentId: paymentEntity.id ?? null },
                },
              },
            });
            return { handled: false, event };
          }
        }

        if (payment) {
          const storeOrder =
            (payment as { storeOrders?: StoreOrderConfirmRow[] }).storeOrders?.[0] ?? null;

          if (payment.booking) {
            const shouldConfirm = payment.booking.status === 'pending_payment';
            // PAY-08: a capture can land long after the unpaid hold lapsed, and
            // an lapsed hold stops counting against capacity — so the slot may
            // already have been resold. Checked before the transaction so the
            // read never runs inside it.
            const oversold = shouldConfirm
              ? await slotOversoldNote(payment.booking)
              : null;
            // P1-12: capture + confirm + commission ledger write in ONE
            // transaction. The old webhook path ran payment.update + booking.update
            // as two separate queries (a crash between them left a captured Payment
            // with a pending booking) and wrote the commission AFTER with a
            // swallowed catch. Now any failure rolls back the whole block.
            let capturedNow = false;
            // OPS-05: carried OUT of the transaction, same contract as the
            // client-verify rail — the mint is recorded only after commit.
            let mintedCommission: MintedCommission | null = null;
            await prisma.$transaction(async (tx) => {
              capturedNow = await claimCaptureTransition(tx, payment.id);
              await tx.payment.update({
                where: { id: payment.id },
                data: {
                  status: 'captured',
                  gatewayPaymentId: paymentEntity.id,
                  method: paymentEntity.method ?? null,
                  ...(oversold
                    ? {
                        metadata: {
                          ...((payment.metadata as Record<string, unknown>) ?? {}),
                          slotOversoldAt: new Date().toISOString(),
                          slotOversoldNote: oversold,
                          needsAdminReview: 'slot-capacity',
                        },
                      }
                    : {}),
                },
              });
              if (shouldConfirm) {
                await tx.pujaBooking.update({
                  where: { id: payment.booking!.id },
                  data: { status: 'confirmed' },
                });
                // P1-12: commission ledger row inside the tx.
                mintedCommission = await writePujaCommissionOnConfirm(payment.booking!.id, tx);
                // RV-03: the temple's 5% share, in the SAME transaction as the
                // commission that earned it. Without this call temples receive
                // Rs 0.00 on every paid booking — the writer exists but nothing
                // reaches it.
                await writeTemplePayoutOnConfirm(payment.booking!.id, tx);
              }
            });

            // OPS-05 — the provider's earning, minted on the gateway rail.
            // Same contract as the client-verify rail: after commit, never on
            // a null. Only ONE of the two rails ever mints for a booking — the
            // loser's writePujaCommissionOnConfirm hits its findFirst guard and
            // returns null — so the trail names which rail actually did it.
            if (mintedCommission) {
              const minted: MintedCommission = mintedCommission;
              void recordMoneyEvent({
                eventType: MONEY_EVENTS.COMMISSION_MINTED,
                actorType: 'gateway',
                subjectType: 'commission',
                subjectId: minted.commissionId,
                bookingId: payment.booking.id,
                paymentId: payment.id,
                commissionId: minted.commissionId,
                amount: minted.amount,
                currency: payment.currency,
                statusAfter: 'PENDING',
                idempotencyKey: minted.commissionId,
                note: 'provider earning minted on the Razorpay webhook confirm rail',
                metadata: {
                  rail: 'webhook',
                  providerId: minted.providerId,
                  gatewayPaymentId: paymentEntity.id,
                },
              });
            }

            // OPS-05 — the gateway rail. `actorType:'gateway'` is the whole
            // point of that enum: "Razorpay told us" is a different fact from
            // "the devotee's browser told us", and folding the two together is
            // what makes "which rail got there first" unanswerable in a
            // dispute. Keyed on the gateway payment id, which the writer
            // namespaces by event type — so this row coexists with the
            // PAYMENT_VERIFIED row carrying the same id instead of erasing it.
            void recordMoneyEvent({
              eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
              actorType: 'gateway',
              subjectType: 'payment',
              subjectId: payment.id,
              bookingId: payment.booking.id,
              paymentId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              gateway: 'razorpay',
              gatewayOrderId: paymentEntity.order_id,
              gatewayPaymentId: paymentEntity.id,
              statusBefore: payment.status,
              statusAfter: 'captured',
              idempotencyKey: paymentEntity.id,
              note: `razorpay webhook ${event}`,
              metadata: {
                rail: 'webhook',
                method: paymentEntity.method ?? null,
                confirmedBooking: shouldConfirm,
                capturedNow,
                ...(oversold ? { slotOversoldNote: oversold } : {}),
              },
            });

            if (oversold) {
              // Deliberately NOT a refusal to confirm: the devotee has already
              // paid, and stranding a paid booking is a worse failure than an
              // oversold slot an operator can move. What was missing was the
              // CHECK — the capture used to be applied to a resold slot in total
              // silence. Greppable by `slot_oversold_capture`, and surfaced in
              // the daily reconciliation sweep (jobs/reconcile-payments.ts).
              console.error(
                '[payment.service][PAY-08] slot_oversold_capture',
                JSON.stringify({
                  event: 'slot_oversold_capture',
                  bookingId: payment.booking.id,
                  paymentId: payment.id,
                  gatewayOrderId: paymentEntity.order_id,
                  note: oversold,
                }),
              );
            }

            // PBO-12: post-commit fire-and-forget side-effects (invoice email +
            // referral reward). Prod confirms via webhook, so the referee credit
            // MUST run here. Network calls — never inside the tx.
            //
            // PAY-09: gated on the capture transition, so only the transaction
            // that actually performed it announces it. Client verify and this
            // handler racing on the same booking used to send the devotee two
            // payment receipts and two confirmations.
            //
            // `alreadyCaptured` keeps the RECOVERY path loud: a Payment that was
            // already `captured` while its booking sat `pending_payment` (what
            // jobs/reconcile-payments.ts exists to find) has no competing racer,
            // so its claim returns 0 and the devotee would otherwise be
            // confirmed in silence.
            if (shouldConfirm && (capturedNow || payment.status === 'captured')) {
              await fireAndForgetPostConfirmSideEffects(
                payment.booking!.id,
                payment.booking!.userId,
              );
            }
          } else if (storeOrder) {
            // PAY-02: the store-order rail, byte-for-byte the same work
            // verifyStoreOrderPayment does — capture, PENDING → CONFIRMED with a
            // statusHistory entry, and the store-owner Commission INSIDE the
            // transaction (a failure must roll back the capture, never leave a
            // captured payment with no ledger row).
            const shouldConfirm = storeOrder.status === 'PENDING';
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
                const existingHistory = Array.isArray(storeOrder.statusHistory)
                  ? storeOrder.statusHistory
                  : [];
                await tx.storeOrder.update({
                  where: { id: storeOrder.id },
                  data: {
                    status: 'CONFIRMED',
                    statusHistory: [
                      ...existingHistory,
                      {
                        status: 'CONFIRMED',
                        changedAt: new Date().toISOString(),
                        changedBy: 'razorpay-webhook',
                        note: 'Razorpay webhook payment.captured',
                      },
                    ] as Prisma.InputJsonValue[],
                  },
                });
                await writeStoreOrderCommission(storeOrder.id, tx);
              }
            });
            // OPS-05 — same capture event, the store-order rail.
            void recordMoneyEvent({
              eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
              actorType: 'gateway',
              subjectType: 'store_order',
              subjectId: storeOrder.id,
              paymentId: payment.id,
              amount: payment.amount,
              currency: payment.currency,
              gateway: 'razorpay',
              gatewayOrderId: paymentEntity.order_id,
              gatewayPaymentId: paymentEntity.id,
              statusBefore: payment.status,
              statusAfter: 'captured',
              idempotencyKey: paymentEntity.id,
              note: `razorpay webhook ${event} (store order ${storeOrder.orderNumber})`,
              metadata: { rail: 'webhook-store-order', confirmedOrder: shouldConfirm },
            });
            if (shouldConfirm) {
              // OPS-13 — the same gap as the client rail, on the rail that
              // actually confirms most store orders in production. This
              // transaction just minted the store owner's commission and
              // recorded only the capture, so an owner's earning appeared on
              // the ledger with nothing on the trail saying where it came
              // from. Post-commit, and keyed on the commission id — so if the
              // client rail also reaches the same order the two collapse to
              // one row rather than double-counting one earning.
              await recordStoreOrderCommissionMinted(storeOrder.id, 'webhook-store-order', {
                gatewayPaymentId: paymentEntity.id,
                webhookEvent: event,
              });
              void sendStoreOrderInvoice(storeOrder.id);
            }
          } else {
            // A Payment row with neither a booking nor a store order behind it
            // (legacy/orphan). Record the capture; there is nothing to confirm.
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: 'captured',
                gatewayPaymentId: paymentEntity.id,
                method: paymentEntity.method ?? null,
              },
            });
          }
        } else {
          // PBO-11 (2026-07-09): donation webhook backstop. Donations create no
          // prisma.payment row (raw INSERT), so when no Payment matches this
          // order id, try to resolve a donation by razorpay_order_id and
          // finalize it. Without this, a donor who closes the browser before
          // client-verify leaves money captured but the donation stuck
          // 'created' with no receipt. Idempotent via finalizeDonationReceipt.
          const donation = await findDonationByOrderId(paymentEntity.order_id);
          if (
            donation &&
            donation.status !== 'paid' &&
            paymentEntity.amount != null &&
            Math.round(Number(donation.amount_inr) * 100) !== Number(paymentEntity.amount)
          ) {
            // Same refusal as the booking rail: a capture that is not for the
            // amount we opened must not mint a receipt (an 80G receipt for the
            // wrong rupee figure is a tax document).
            console.error(
              '[payment][amount-mismatch] donation webhook capture refused',
              JSON.stringify({ donationId: donation.id, orderId: paymentEntity.order_id, gotPaise: paymentEntity.amount }),
            );
            return { handled: false, event };
          }
          if (donation && donation.status !== 'paid') {
            await finalizeDonationReceipt(donation, paymentEntity.id, undefined);
          } else if (!donation) {
            // PAY-01 (2026-08-20, P0): the SAME structural gap, one rail over.
            // Astrologer consultations also write no prisma.payment row — the
            // route raw-INSERTs into astrologer_consultations carrying only
            // razorpay_order_id — so this handler could resolve donations and
            // donations only. A devotee who paid and closed the tab was never
            // confirmed, and jobs/consultation-expire.ts then flipped the row to
            // 'cancelled' 30 minutes later: money captured, record says the
            // consultation was never ordered, no refund, no notice.
            //
            // The backstop claims pending_payment / payment_review / cancelled
            // rows, so it also RECOVERS one the expiry cron already destroyed.
            // Dynamic import for the same reason findDonationByOrderId is a
            // route export: it keeps fastify + the astrologer notifier out of
            // this module's static load graph.
            try {
              const consult = await import('../routes/consultation.js');
              const row = await consult.findConsultationByOrderId(
                paymentEntity.order_id,
              );
              if (row) {
                if (
                  paymentEntity.amount != null &&
                  Math.round(Number(row.amount_inr) * 100) !== Number(paymentEntity.amount)
                ) {
                  console.error(
                    '[payment][amount-mismatch] consultation webhook capture refused',
                    JSON.stringify({ consultationId: row.id, gotPaise: paymentEntity.amount }),
                  );
                  return { handled: false, event };
                }
                await consult.finalizeConsultationPaymentFromWebhook(
                  row,
                  paymentEntity.id,
                );
              } else {
                const wellness = await import('../routes/wellness-sessions.js');
                await wellness.finalizeWellnessEnrollmentFromWebhook(
                  paymentEntity.order_id,
                  paymentEntity.amount ?? null,
                );
              }
            } catch (err) {
              console.error(
                '[payment.service][PAY-01] consultation webhook backstop failed:',
                err,
              );
            }
          }
        }

        return { handled: true, event };
      }

      case 'payment.failed': {
        if (!paymentEntity) break;

        const payment = await prisma.payment.findFirst({
          where: { gatewayOrderId: paymentEntity.order_id },
        });

        // QA 2026-10-13: a devotee may attempt the same order several times and
        // Razorpay does not order webhook delivery. A `payment.failed` for an
        // earlier attempt arriving after the successful capture used to flip the
        // captured Payment to 'failed' and overwrite its gateway payment id, so
        // the refund rail then found "no captured payment" for money we hold.
        const settled = ['captured', 'refunded', 'partially_refunded'];
        if (payment && settled.includes(payment.status)) {
          return { handled: true, event, duplicate: true };
        }

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

          // OPS-05 — a failure is a money event too: it is the row that
          // explains why a booking the devotee insists they paid for never
          // confirmed.
          void recordMoneyEvent({
            eventType: MONEY_EVENTS.PAYMENT_FAILED,
            actorType: 'gateway',
            subjectType: 'payment',
            subjectId: payment.id,
            bookingId: payment.bookingId,
            paymentId: payment.id,
            amount: payment.amount,
            currency: payment.currency,
            gateway: 'razorpay',
            gatewayOrderId: paymentEntity.order_id,
            gatewayPaymentId: paymentEntity.id,
            statusBefore: payment.status,
            statusAfter: 'failed',
            idempotencyKey: paymentEntity.id,
            note: paymentEntity.error_description ?? `razorpay webhook ${event}`,
            metadata: {
              failureCode: paymentEntity.error_code ?? null,
              method: paymentEntity.method ?? null,
            },
          });
        }

        return { handled: true, event };
      }

      // PAY-05 (2026-08-20): `refund.processed` is handled alongside
      // `refund.created`. Razorpay accounts differ in which of the two they
      // emit, and subscribing the wrong one silently disables this whole rail —
      // see docs/razorpay-live-activation.md for the events the owner must
      // subscribe. Handling both makes the code indifferent to that choice.
      case 'refund.created':
      case 'refund.processed': {
        const refundEntity = payload.payload?.refund?.entity;
        if (!refundEntity) break;

        const payment = await prisma.payment.findFirst({
          where: { gatewayPaymentId: refundEntity.payment_id },
        });

        if (payment) {
          // PAY-03: `Payment.refundAmount` is CUMULATIVE. This branch used to
          // OVERWRITE it with the last refund, so after a second partial the
          // admin rail — which computes what is still refundable as
          // `paid - alreadyRefunded` — believed far more was refundable than
          // actually was, and the proportional ledger unwind under-reversed.
          //
          // Dedupe on the Razorpay refund id: both refund rails append the id
          // they created to `metadata.refundIds`, so an event for a refund we
          // raised ourselves is recognised and NOT counted twice. An id we have
          // never seen is a refund raised directly in the Razorpay dashboard —
          // exactly the case this handler exists for.
          const seen = appendRefundId(payment.metadata, null);
          if (refundEntity.id && seen.includes(refundEntity.id)) {
            return { handled: true, event, duplicate: true };
          }

          const paid = new Prisma.Decimal(payment.amount);
          const alreadyRefunded = payment.refundAmount
            ? new Prisma.Decimal(payment.refundAmount)
            : new Prisma.Decimal(0);
          // refund amount from Razorpay is in paise
          const thisRefund = new Prisma.Decimal(refundEntity.amount ?? 0).div(100);
          const refundableBefore = paid.minus(alreadyRefunded);
          const applied = thisRefund.gt(refundableBefore) ? refundableBefore : thisRefund;
          const newRefundTotal = alreadyRefunded.plus(applied);
          const isFullRefund = newRefundTotal.gte(paid);

          // OPS-05: captured out of the transaction, recorded after it commits.
          let webhookFullReversal: LedgerReversalResult | null = null;
          let webhookPartialReversal: PartialLedgerResult | null = null;
          let webhookUnwindReason = '';

          await prisma.$transaction(async (tx) => {
            await tx.payment.update({
              where: { id: payment.id },
              data: {
                refundAmount: newRefundTotal,
                status: isFullRefund ? 'refunded' : 'partially_refunded',
                metadata: {
                  ...((payment.metadata as Record<string, unknown>) ?? {}),
                  refundIds: appendRefundId(payment.metadata, refundEntity.id),
                  refundId: refundEntity.id ?? null,
                  refundedAt: new Date().toISOString(),
                  refundSource: `razorpay-webhook:${event}`,
                },
              },
            });

            // PAY-05: UNWIND THE PROVIDER LEDGER. This branch called neither
            // reverseBookingLedger nor reduceBookingLedgerForPartialRefund, so a
            // refund raised in the Razorpay dashboard left the pandit's earning
            // and the temple's share fully withdrawable on money already handed
            // back — the DI-01/DI-02 defect, reachable through a third door.
            // Same shared module both rails use; never a fourth copy.
            if (payment.bookingId && applied.gt(0)) {
              const reason = `Razorpay ${event} ${refundEntity.id ?? ''}`.trim();
              webhookUnwindReason = reason;
              if (isFullRefund) {
                webhookFullReversal = await reverseBookingLedger(tx, payment.bookingId, reason);
              } else {
                webhookPartialReversal = await reduceBookingLedgerForPartialRefund(
                  tx,
                  payment.bookingId,
                  {
                    refundAmount: applied,
                    refundableBefore,
                    reason,
                  },
                );
              }
            }
          });

          // OPS-05 — recorded AFTER the transaction commits. This is the branch
          // for a refund raised directly in the Razorpay dashboard, where the
          // platform has no other record of who authorised it; without this row
          // the trail shows a capture followed by an unexplained balance change.
          void recordMoneyEvent({
            eventType: MONEY_EVENTS.REFUND_COMPLETED,
            actorType: 'gateway',
            subjectType: 'payment',
            subjectId: payment.id,
            bookingId: payment.bookingId,
            paymentId: payment.id,
            amount: applied,
            currency: payment.currency,
            gateway: 'razorpay',
            gatewayPaymentId: refundEntity.payment_id ?? payment.gatewayPaymentId,
            gatewayRefundId: refundEntity.id ?? null,
            statusBefore: payment.status,
            statusAfter: isFullRefund ? 'refunded' : 'partially_refunded',
            idempotencyKey: refundEntity.id ?? null,
            note: `razorpay webhook ${event}`,
            metadata: {
              rail: 'razorpay-webhook',
              refundedTotal: newRefundTotal.toFixed(2),
              refundableBefore: refundableBefore.toFixed(2),
            },
          });

          // OPS-05 — the ledger unwind this branch performs, recorded through
          // the SAME shared emitter the admin rail uses. This is the rail with
          // the least surrounding context of all four: a refund raised straight
          // in the Razorpay dashboard leaves no request, no admin id and no
          // reason of ours, so if the claw-back is not recorded here the trail
          // shows a gateway refund and a provider balance that changed for no
          // reason anyone can point at. Awaited for the durability probe; never
          // throws.
          if (payment.bookingId) {
            await recordLedgerReversal({
              bookingId: payment.bookingId,
              rail: 'razorpay-webhook',
              reason: webhookUnwindReason || `razorpay webhook ${event}`,
              // A dashboard refund is Razorpay acting, not our admin panel —
              // 'gateway' is a different fact from 'admin' and folding the two
              // together is what makes a refund trail useless in a dispute.
              actorType: 'gateway',
              actorId: null,
              paymentId: payment.id,
              currency: payment.currency,
              gatewayRefundId: refundEntity.id ?? null,
              idempotencyKey: refundEntity.id ?? null,
              full: webhookFullReversal,
              partial: webhookPartialReversal,
            });
          }
        }

        return { handled: true, event };
      }

      default: {
        // Recurring devotional subscriptions (UPI Autopay mandate lifecycle).
        // subscription.* events carry the subscription entity, not a payment.
        //
        // PAY-04 (2026-08-21): the MIRROR of the fan-out in
        // routes/subscriptions.ts. This branch used to drive the recurring
        // mandate store ONLY, so an owner who subscribed `subscription.*` to
        // the payments url instead — the runbook's table has two rows and
        // nothing stops a mistake — silently stopped provisioning every paid
        // marketplace role plan. Both endpoints now drive both stores; the
        // shared `razorpay` dedupe namespace makes subscribing both urls safe.
        if (event.startsWith('subscription.')) {
          const subEntity = payload.payload?.subscription?.entity;
          const mandate = await handleSubscriptionEvent(event, subEntity);

          // Dynamic import: keeps subscription.service out of this module's
          // static graph (payment.service is imported by half the domain) and
          // is only paid on the rare subscription event, never on a capture.
          let marketplaceHandled = false;
          try {
            const { subscriptionService } = await import('./subscription.service.js');
            const r = await subscriptionService.handleSubscriptionEvent(event, payload);
            marketplaceHandled = r.handled;
          } catch (err) {
            console.error(
              '[payment.service][PAY-04] marketplace subscription rail failed',
              JSON.stringify({ event, subscriptionId: subEntity?.id ?? null }),
              err,
            );
          }
          return { handled: mandate.handled || marketplaceHandled, event };
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

    let refund: { id: string };
    try {
      refund = await razorpay.payments.refund(payment.gatewayPaymentId, {
        amount: refundAmountInPaise,
        notes: {
          bookingId: booking.id,
          bookingNumber: booking.bookingNumber,
          adminId: adminId ?? 'system',
          reason: reason.slice(0, 250),
          tier: tierLabel ?? 'admin-specified amount',
        },
      }) as { id: string };
    } catch (err) {
      // OPS-05 — a refund the gateway REFUSED on the ADMIN rail.
      //
      // This call was previously naked: the throw propagated straight out of
      // `processRefund` and the attempt left NOTHING behind. Not a Payment
      // metadata crumb (the write below the gateway call never runs), not a
      // status change, not a row. `refund.service.ts` has recorded this since
      // the first OPS-05 pass — the admin rail is the one that did not, which
      // is the worse gap of the two: this rail is the one a human drives, so
      // "who tried to refund whom, and what did Razorpay say" is exactly the
      // question a dispute asks and the one nothing could answer.
      //
      // Awaited, not `void`ed. `recordMoneyEvent` never throws by contract, and
      // we are about to rethrow and end the request — a detached write would
      // race the failure out of the process.
      await recordMoneyEvent({
        eventType: MONEY_EVENTS.REFUND_FAILED,
        actorType: adminId ? 'admin' : 'system',
        actorId: adminId ?? null,
        subjectType: 'payment',
        subjectId: payment.id,
        bookingId: booking.id,
        paymentId: payment.id,
        amount: refundAmount,
        currency: payment.currency,
        gateway: 'razorpay',
        gatewayPaymentId: payment.gatewayPaymentId,
        // Unchanged on both sides: the gateway refused, so nothing moved.
        statusBefore: payment.status,
        statusAfter: payment.status,
        note: err instanceof Error ? err.message : String(err),
        metadata: {
          rail: 'admin',
          tierLabel: tierLabel ?? null,
          refundFraction: refundFraction ?? null,
          refundableBeforeInr: refundable.toFixed(2),
          requestedInr: refundAmount.toFixed(2),
          reason,
        },
      });
      throw err;
    }

    // OPS-05 — the gateway ACCEPTED, so the money has already left. Recorded
    // here, before the local transaction, for the same reason refund.service
    // records at this point: if the `$transaction` below fails, the devotee has
    // still been refunded and the Payment row still says `captured`. That
    // divergence is precisely the state an audit trail exists to show, and
    // REFUND_COMPLETED (emitted only after the commit) cannot show it.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_INITIATED,
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId ?? null,
      subjectType: 'payment',
      subjectId: payment.id,
      bookingId: booking.id,
      paymentId: payment.id,
      amount: refundAmount,
      currency: payment.currency,
      gateway: 'razorpay',
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayRefundId: refund.id,
      statusBefore: payment.status,
      idempotencyKey: refund.id,
      note: reason,
      metadata: {
        rail: 'admin',
        tierLabel: tierLabel ?? null,
        refundFraction: refundFraction ?? null,
        refundableBeforeInr: refundable.toFixed(2),
      },
    });

    const newRefundTotal = alreadyRefunded.plus(refundAmount);
    const newPaymentStatus = isFullRefund ? 'refunded' : 'partially_refunded';

    // OPS-05: the unwind's OWN result, captured out of the transaction so the
    // COMMISSION_REVERSED row can be written after it commits. Declared here
    // rather than returned from the `$transaction` callback because the two
    // branches produce two different shapes and only one of them runs.
    let fullReversal: LedgerReversalResult | null = null;
    let partialReversal: PartialLedgerResult | null = null;

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
            // PAY-03: every Razorpay refund id applied to this capture, so the
            // refund webhook recognises the one this rail just created and does
            // not accumulate it a second time.
            refundIds: appendRefundId(payment.metadata, refund.id),
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

        // Unwind the ledger IN THE SAME TRANSACTION as the refund.
        //
        // This rail refunded the devotee and left the pandit's 80% and the
        // temple's share PENDING and fully withdrawable — so a refunded booking
        // still paid the provider. Proven end to end: BS-20260812-J3M76 was
        // refunded Rs 1,151 here, then a Rs 770 payout request was raised
        // against that same booking. ~172% of the booking value out the door,
        // silently. refund.service has reversed correctly since RV-02; this
        // rail was simply never backported, so the two now share one
        // implementation instead of two copies that can drift again.
        fullReversal = await reverseBookingLedger(tx, bookingId, reason);
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

        // DI-02 (2026-08-12): UNWIND THE LEDGER PROPORTIONALLY.
        //
        // This branch used to touch nothing but cancellationReason, and the
        // sibling rail's reversal was gated on `refundType === 'full'` too — so
        // NEITHER rail reversed a partial. The cancellation ladder
        // (100/75/50/25/0) makes a fractional refund the designed common path,
        // which meant every mid-ladder cancellation paid the provider in full
        // on revenue the platform had handed back: Rs 825 refunded on a
        // Rs 1,100 puja while the pandit kept all Rs 770 and the temple Rs 55.
        //
        // `refundable` is what was still refundable BEFORE this call
        // (paid - alreadyRefunded), which is what makes successive partials
        // compose to the same ledger as one combined refund.
        partialReversal = await reduceBookingLedgerForPartialRefund(tx, bookingId, {
          refundAmount,
          refundableBefore: refundable,
          reason,
        });
      }
    });

    // OPS-05 — the admin refund rail, recorded AFTER the transaction commits.
    // This is THE row the finding was written for: "who initiated the refund,
    // and when, and on whose authority" was previously only `metadata.refundedBy`,
    // which the next refund on the same capture overwrites. `statusBefore` is
    // the pre-image read at the top of this method.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.REFUND_COMPLETED,
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId ?? null,
      subjectType: 'payment',
      subjectId: payment.id,
      bookingId: booking.id,
      paymentId: payment.id,
      amount: refundAmount,
      currency: payment.currency,
      gateway: 'razorpay',
      gatewayPaymentId: payment.gatewayPaymentId,
      gatewayRefundId: refund.id,
      statusBefore: payment.status,
      statusAfter: newPaymentStatus,
      idempotencyKey: refund.id,
      note: reason,
      metadata: {
        rail: 'admin',
        tierLabel: tierLabel ?? null,
        refundFraction: refundFraction ?? null,
        refundedTotal: newRefundTotal.toFixed(2),
        fullyRefunded: isFullRefund,
      },
    });

    // OPS-05 — and the SECOND half of the same story. REFUND_COMPLETED above
    // says the devotee got money back; it says nothing about whether the
    // pandit's 80% and the temple's share were clawed back with it. Those are
    // separate facts and the second one is the disputable one: booking
    // BS-20260812-J3M76 was refunded ₹1,151 on this rail and a ₹770 payout was
    // still raised against it. `recordLedgerReversal` is the shared emitter in
    // ledger-reversal.service.ts — it skips when nothing moved, and it records
    // even when the unwind was BLOCKED by an already-settled row, which is the
    // double-pay case and the one that must never be silent.
    //
    // Awaited, not `void`ed: the emitter's full path re-reads committed rows to
    // prove the reversal survived, so it must not race the response. It never
    // throws (same contract as `recordMoneyEvent`).
    await recordLedgerReversal({
      bookingId: booking.id,
      rail: 'admin',
      reason,
      actorType: adminId ? 'admin' : 'system',
      actorId: adminId ?? null,
      paymentId: payment.id,
      currency: payment.currency,
      gatewayRefundId: refund.id,
      // Bare natural key — the emitter namespaces it by event type, so sharing
      // the refund id with REFUND_COMPLETED above yields two rows, not one.
      idempotencyKey: refund.id,
      full: fullReversal,
      partial: partialReversal,
    });

    // NOTIF-04 (2026-08-12): TELL THE DEVOTEE. This rail was 100% silent.
    //
    // refund.service's rail at least emailed devotees who had an address. This
    // one — the admin panel's — sent nothing at all: no email, no push, no
    // WhatsApp. An admin could refund a booking and the devotee's only notice
    // was their bank statement days later. No `emailAlreadySent` flag is passed
    // because there is no email here to duplicate; the notifier owns the
    // written notice on this path.
    //
    // Fired after the transaction commits, never inside it. Awaited so a throw
    // cannot escape as an unhandled rejection, and caught so a notification can
    // never fail a refund Razorpay has already made.
    try {
      const { notifyRefundProcessed } = await import('./booking-notify.service.js');
      await notifyRefundProcessed({
        bookingId: booking.id,
        // Decimal -> string, never Number(): the devotee is shown the stored figure.
        amountInr: refundAmount.toFixed(2),
      });
    } catch (err) {
      console.warn('[payment.service] refund notification failed:', err);
    }

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
    // and the only one that pays every role.
    //
    // UPDATED 2026-08-19 (DI-05). The paragraph that used to sit here said rail
    // B stays "for the bookings rail A structurally cannot reach: a Commission
    // is only minted when a priest is already on the booking at `confirmed`, so
    // temple-path and dispatch-assigned (T1-T3) bookings never get one." That is
    // NO LONGER TRUE and had become the most misleading comment in the payout
    // code: booking.service re-mints on EARNING_ATTACH_STATUSES, and
    // services/provider-earning-mint.ts now also mints on the two assignment
    // paths that bypass it (dispatch.service.accept and
    // priest.service.acceptBooking). Temple-path and dispatch-assigned bookings
    // DO get a Commission now — which is exactly why this guard fires for them.
    //
    // Rail B is therefore a LEGACY rail carrying rows written before those
    // mints existed, not a structural complement to rail A. And the exclusion is
    // SYMMETRIC now: this guard refuses to write a sidecar row when a live
    // Commission exists, and the mint refuses to write a Commission when a
    // PriestPayout exists. It used to be one-way, so a booking already on rail B
    // minted onto rail A at its next status move and was payable twice.
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
      // OPS-05 — record the SKIP, not just the write. This branch is the guard
      // WORKING, and it is the fact a "why was this pandit never paid on rail
      // B" question turns on. Without a row here the trail is silent, and
      // silence is indistinguishable from the call never having been made.
      void recordMoneyEvent({
        eventType: MONEY_EVENTS.PAYOUT_REJECTED,
        actorType: 'system',
        subjectType: 'booking',
        subjectId: bookingId,
        bookingId,
        commissionId: unifiedLedgerRow.id,
        amount: booking.priestPayout,
        currency: booking.currency,
        statusAfter: 'skipped',
        // No payout row exists to key on, and the decision is once-per-booking.
        idempotencyKey: bookingId,
        note: 'legacy PriestPayout rail refused — the unified rail (Commission) owns this booking',
        metadata: {
          rail: 'legacy-priest-payout',
          outcome: 'commission-ledger-owns-this-booking',
          bookingStatus: booking.status,
          priestId: booking.priestId,
        },
      });

      return {
        skipped: true as const,
        reason: 'commission-ledger-owns-this-booking' as const,
        commissionId: unifiedLedgerRow.id,
      };
    }

    // ── DI-09 (F455): the guard above is a TOCTOU, and the constraint is what
    //    actually stops the second row — so the LOSER's experience is the fix.
    //
    // `priest_payouts_booking_id_key` has been live in production since
    // migrations/20260902000000_di06_priest_payout_booking_key, and the
    // `findFirst` at the top of this method is separated from this INSERT by
    // three further awaits with no transaction and no lock around them. Two
    // concurrent calls both read "no payout" and both arrive here; the index
    // rejects the second with 23505 -> P2002.
    //
    // Unhandled, that P2002 leaves this method as a raw
    // PrismaClientKnownRequestError. Nothing between here and the HTTP layer
    // translates it, so the caller gets a 500 — for a condition this very
    // method already has a considered answer for, thirty lines up. And the two
    // callers that reach it are unattended status transitions
    // (booking.service.ts:1008 and :1746), where a 500 is a failed booking
    // transition rather than a failed payout.
    //
    // The translation below is deliberately the SAME sentence the guard throws,
    // built from the winner's row. Both orderings of the race are one fact — a
    // payout already exists for this booking — and they must be indistinguishable
    // to every caller. What it must NOT do is succeed: returning the winner's
    // row as though this call created it would put a second
    // PRIEST_PAYOUT_CREATED on the money trail for one payout, and the caller
    // would log a mint it did not make.
    //
    // Narrowed with `isUniqueViolation` rather than a bare code check so a
    // P2003 (foreign key) or P2025 (record not found) — neither of which is a
    // duplicate — keeps propagating untouched. Reporting "already exists" for a
    // real fault on a money path is worse than the 500 this replaces.
    let payout;
    try {
      payout = await prisma.priestPayout.create({
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
    } catch (err) {
      if (!isUniqueViolation(err)) throw err;

      // Re-read so the message carries the WINNER's status, exactly as the
      // guard's does. `?? 'unknown'` covers the vanishingly rare case where the
      // winning row was deleted between its INSERT and this SELECT: the write
      // still did not happen here, so this call still must not report success.
      const winner = (await prisma.priestPayout.findFirst({
        where: { bookingId },
        select: { id: true, status: true },
      })) as { id: string; status: string } | null;

      throw new Error(
        `A payout already exists for this booking (status: ${winner?.status ?? 'unknown'}).`,
      );
    }

    // OPS-05 — rail B had no audit trail at all. `PRIEST_PAYOUT_CREATED` was a
    // declared event with no call site anywhere in the repo, so the moment a
    // booking landed on the LEGACY rail went unrecorded while the unified
    // rail's reversal was logged. Recorded AFTER the row lands, and `void`ed:
    // this is the last statement before the return and no money outcome may
    // depend on the log. Rupees, not paise — `priestPayout` is DECIMAL(10,2).
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.PRIEST_PAYOUT_CREATED,
      actorType: 'system',
      subjectType: 'payout',
      subjectId: payout.id,
      bookingId,
      payoutId: payout.id,
      amount: booking.priestPayout,
      currency: booking.currency,
      // There is no prior payout — the guard above throws when one exists — so
      // the pre-image is the absence of a row, not a status.
      statusBefore: null,
      statusAfter: 'pending',
      idempotencyKey: payout.id,
      note: 'legacy PriestPayout rail (rail B) minted',
      metadata: {
        rail: 'legacy-priest-payout',
        payoutMethod: 'bank_transfer',
        bookingStatus: booking.status,
        bookingNumber: booking.bookingNumber,
        priestId: booking.priestId,
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
