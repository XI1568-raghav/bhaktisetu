import { Prisma } from '@prisma/client';
import { platformRateOf } from '../lib/commission-math.js';

/**
 * provider-earning-mint.ts — DI-05, the ONE place a provider earning is minted
 * when a pandit is attached to an already-paid booking.
 *
 * WHY THIS FILE EXISTS
 *
 * Commission rows are minted at CONFIRM time keyed to whoever is on the booking
 * then. On the temple booking path nobody is — the pandit is attached later —
 * so `writePujaCommissionOnConfirm` hit its `if (!booking.priestId) return` and
 * nothing ever re-ran it. booking.service.updateBookingStatus grew a re-mint on
 * EARNING_ATTACH_STATUSES to fix that, but TWO assignment paths never enter
 * updateBookingStatus at all — they write `priestId` + `status:'priest_assigned'`
 * with a raw `pujaBooking.update`:
 *
 *   1. dispatch.service.acceptOffer   — the pandit wins a broadcast offer
 *   2. priest.service.acceptBooking   — the pandit accepts in his own portal
 *
 * Both transitions land on `priest_assigned`, which IS in EARNING_ATTACH_STATUSES
 * — the mint was meant to fire on exactly these — so a pandit who took either
 * door had no Commission AND no PriestPayout, and GET /priest/payouts answered
 * him Rs 0. That is the finding's own screen, and it stayed reachable after the
 * first fix landed.
 *
 * The guard triple was previously hand-copied inline. Hand-copied guards are
 * what produced the divergence in the first place, so it lives here once and
 * every minting caller imports it.
 *
 * THE GUARDS, and why each one is load-bearing:
 *
 *   1. unified rail already owns it  — idempotency. The same `findFirst` on
 *      bookingId both minting writers use. Re-running an assignment (a retry, a
 *      re-accept, a status bounce) must never mint a second payable.
 *   2. LEGACY rail already owns it   — the double-payable guard. payment.service
 *      .createPriestPayout already refuses to write a PriestPayout when a live
 *      Commission exists, but the mint never checked the opposite direction, so
 *      the exclusion was ONE-WAY. `video_uploaded -> delivered` is a legal
 *      transition and both are in EARNING_ATTACH_STATUSES, so a legacy booking
 *      already carrying a PriestPayout row minted a Commission on its next move
 *      and the pandit held rows on BOTH rails for the same money. Now the
 *      exclusion is symmetric: whichever rail got there first keeps the booking.
 *   3. a CAPTURED payment exists     — never mint withdrawable balance for an
 *      unpaid booking (the S3-08 hole, on the transition instead of the confirm).
 *   4. the Priest has a linked User  — RV-04. A Commission whose providerId is a
 *      Priest.id no payout read ever matches is an orphan that pays nobody.
 *
 * Ordering: callers MUST call this AFTER the `priestId` write has landed in the
 * same transaction, and MUST pass the post-update booking. Minting off a
 * pre-update snapshot reads `priestId: null` and silently does nothing — the
 * exact shape of the original bug.
 *
 * Money invariants (lib/commission-math.ts — one column, one meaning):
 *   `amount`     = the PROVIDER's earning, read from the `priestPayout` column.
 *                  NEVER recomputed here; recomputing is how two writers drift.
 *   `percentage` = the PLATFORM's take rate against the same fee-inclusive base
 *                  every other writer uses.
 */

/** Why a mint did or did not happen. Returned so callers can log/assert it. */
export type MintOutcome =
  | 'minted'
  | 'no-provider-on-booking'
  | 'already-on-unified-rail'
  | 'already-on-legacy-rail'
  | 'no-captured-payment'
  | 'provider-has-no-user';

/**
 * The post-update booking shape the mint needs. Deliberately structural rather
 * than `PujaBooking` so callers can pass a narrow `select` and so the compiler
 * tells them when they forgot to select a column the mint reads.
 */
export interface MintableBooking {
  id: string;
  priestId: string | null;
  priceAmount: Prisma.Decimal | number | string;
  priestPayout: Prisma.Decimal | number | string | null;
}

/**
 * The slice of a Prisma transaction client this needs. Typed structurally so a
 * `Prisma.TransactionClient` satisfies it without importing the full client
 * type into every caller.
 */
export interface MintTxClient {
  commission: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
    create(args: unknown): Promise<unknown>;
  };
  priestPayout: {
    findFirst(args: unknown): Promise<{ id: string } | null>;
  };
  payment: {
    count(args: unknown): Promise<number>;
  };
  priest: {
    findUnique(args: unknown): Promise<{ userId: string | null } | null>;
  };
}

export async function mintProviderEarningForBooking(
  tx: MintTxClient,
  booking: MintableBooking,
): Promise<MintOutcome> {
  if (!booking.priestId) return 'no-provider-on-booking';

  // Guard 1 — unified rail idempotency. Unfiltered on status ON PURPOSE: a
  // REVERSED row is still this booking's history on the unified rail, and
  // re-minting alongside it would resurrect an earning an admin voided.
  const alreadyOwned = await tx.commission.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (alreadyOwned) return 'already-on-unified-rail';

  // Guard 2 — legacy rail. The mirror of payment.service.createPriestPayout's
  // `unifiedLedgerRow` check. Without this the two rails are only ONE-WAY
  // exclusive and the same booking is payable twice.
  const legacyRail = await tx.priestPayout.findFirst({
    where: { bookingId: booking.id },
    select: { id: true },
  });
  if (legacyRail) return 'already-on-legacy-rail';

  // Guard 3 — money actually arrived.
  const capturedForEarning = await tx.payment.count({
    where: { bookingId: booking.id, status: 'captured' },
  });
  if (!(capturedForEarning > 0)) return 'no-captured-payment';

  // Guard 4 — the provider is payable at all.
  const priestUser = await tx.priest.findUnique({
    where: { id: booking.priestId },
    select: { userId: true },
  });
  if (!priestUser?.userId) return 'provider-has-no-user';

  const price = new Prisma.Decimal(booking.priceAmount as Prisma.Decimal);
  const providerEarning = new Prisma.Decimal((booking.priestPayout ?? 0) as Prisma.Decimal);

  await tx.commission.create({
    data: {
      bookingId: booking.id,
      providerId: priestUser.userId,
      amount: providerEarning,
      percentage: platformRateOf(price.sub(providerEarning), price),
      status: 'PENDING',
    },
  });

  return 'minted';
}
