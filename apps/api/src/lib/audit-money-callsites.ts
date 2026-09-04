import { prisma } from './prisma.js';
import { MONEY_EVENTS, recordMoneyEvent, type MoneyActorType } from './audit-money.js';

/**
 * audit-money-callsites.ts — OPS-05, the post-commit half of a mint.
 *
 * `lib/audit-money.ts` is a pure writer: it knows columns, redaction and
 * idempotency, and deliberately nothing about bookings. This file holds the
 * one piece of domain glue that would otherwise be hand-copied into three
 * services — and hand-copied guards are exactly what produced the DI-05
 * divergence this trail exists to make visible.
 *
 * WHY A HELPER AND NOT AN INLINE CALL
 *
 * `services/provider-earning-mint.ts` mints inside the CALLER's transaction and
 * returns a `MintOutcome` string — 'minted', or one of five reasons it did not.
 * It does not return the row. So a call site that wants to log the mint has two
 * constraints it cannot satisfy inline:
 *
 *   1. It must log AFTER the transaction commits. `recordMoneyEvent` takes no
 *      `tx` on purpose: a failed audit INSERT inside the caller's transaction
 *      aborts the whole transaction in Postgres, so logging from inside would
 *      let a broken audit table roll back a pandit's assignment.
 *   2. It must recover the commission id, which only exists after the write,
 *      by re-reading the booking's commission once the tx is durable.
 *
 * Both are the same two lines at all three sites (booking.service's re-mint,
 * dispatch.service.acceptOffer, priest.service.acceptBooking), so they live
 * here once.
 *
 * NEVER THROWS. Same contract as `recordMoneyEvent` itself, extended to cover
 * the lookup: an assignment must not fail because the log of it failed.
 */

export interface ProviderEarningMintedInput {
  bookingId: string;
  /** The `MintOutcome` returned by `mintProviderEarningForBooking`. */
  outcome: string;
  /** Which code path minted, e.g. 'dispatch-accept-offer'. Lands in metadata. */
  rail: string;
  actorType?: MoneyActorType;
  actorId?: string | null;
  note?: string;
}

/**
 * Record `COMMISSION_MINTED` for a booking whose earning was just minted.
 *
 * Call AFTER the transaction that minted has resolved. A no-op for every
 * outcome other than 'minted' — a skipped mint wrote no row, and
 * 'already-on-unified-rail' in particular means an EARLIER call minted and
 * already logged it, so recording here would double-count the same earning.
 */
export async function recordProviderEarningMinted(
  input: ProviderEarningMintedInput,
): Promise<void> {
  try {
    if (input?.outcome !== 'minted' || !input.bookingId) return;

    // The row the mint just wrote. Re-read rather than recomputed: the amount
    // in the trail must be the amount in the ledger, and recomputing it here
    // would make this a second writer of the same money figure.
    const commission = (await prisma.commission.findFirst({
      where: { bookingId: input.bookingId },
      select: { id: true, amount: true, providerId: true },
      orderBy: { createdAt: 'desc' },
    })) as { id: string; amount: unknown; providerId: string | null } | null;

    // No row means the mint did not survive, or the caller mislabelled the
    // outcome. A trail row keyed on a commission id that is not real is worse
    // than a gap — this log is evidence.
    if (!commission?.id) return;

    await recordMoneyEvent({
      eventType: MONEY_EVENTS.COMMISSION_MINTED,
      actorType: input.actorType ?? 'system',
      actorId: input.actorId ?? null,
      subjectType: 'commission',
      subjectId: commission.id,
      bookingId: input.bookingId,
      commissionId: commission.id,
      // `Commission.amount` is the PROVIDER's earning in rupees
      // (lib/commission-math.ts — one column, one meaning).
      amount: commission.amount as never,
      statusAfter: 'PENDING',
      // The bare natural key; recordMoneyEvent namespaces it by event type.
      idempotencyKey: commission.id,
      note: input.note ?? `provider earning minted via ${input.rail}`,
      metadata: {
        rail: input.rail,
        mintOutcome: input.outcome,
        ...(commission.providerId ? { providerId: commission.providerId } : {}),
      },
    });
  } catch (err) {
    // The lookup can fail even though recordMoneyEvent cannot. Swallow it for
    // the same reason recordMoneyEvent swallows: a money transaction has
    // already committed, and nothing about logging it may surface as a failure.
    console.warn(
      '[audit-money] failed to record commission mint for booking',
      input?.bookingId,
      err instanceof Error ? err.message : String(err),
    );
  }
}
