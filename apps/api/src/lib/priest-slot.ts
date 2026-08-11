import { Prisma } from '@prisma/client';

/**
 * The (pandit, calendar day, slot) serialization primitive — one definition for
 * every path that can pin a pandit to a slot.
 *
 * WHY THIS IS A SHARED MODULE (2026-08-11)
 * ----------------------------------------
 * These two functions used to live inside routes/bookings.ts, so only the two
 * callers in that file took the lock: the admin reassignment inside
 * `PATCH /bookings/:id` and the create inside `POST /bookings/from-offering`.
 * `dispatch.service.accept` — the pandit tapping the WhatsApp accept link — ran
 * its own (priestId, scheduledDate, scheduledTimeSlot) conflict `findFirst`
 * inside a plain `$transaction` with no lock at all.
 *
 * An advisory lock only serialises callers that agree to take it. Under READ
 * COMMITTED (Postgres' default; Prisma passes no isolation level) the admin's
 * locked transaction and dispatch's unlocked one each read a pre-insert
 * snapshot, both conflict checks return null, and both COMMIT. The pandit is
 * double-booked: only one puja can physically happen, video proof is mandatory,
 * so the other is undeliverable and must be refunded in full — on a Rs 10,000
 * booking the platform refunds Rs 10,000 and still eats the non-refundable
 * Razorpay MDR, and the dead booking's Commission row has to be reversed by
 * hand.
 *
 * Hoisting them here means every priestId writer can share ONE key space. A
 * lock taken on a different key is the same as no lock at all, so the key
 * function must not be re-derived per call site.
 */

/**
 * Any Prisma client that can run raw SQL — the top-level client or an open
 * interactive-transaction client. Structural on purpose so callers in
 * services/ and routes/ can pass whichever they hold without a cast.
 */
export type SlotLockClient = Pick<Prisma.TransactionClient, '$queryRawUnsafe'>;

/**
 * Stable advisory-lock key for one pandit's date+slot bucket.
 *
 * Keyed on the UTC calendar day of the DATE column (`scheduledDate` is written
 * as `new Date('YYYY-MM-DD')`, i.e. UTC midnight) so two offerings on the same
 * day share one lock — the cross-offering collision is exactly what needs
 * serialising.
 */
export function priestSlotKey(priestId: string, scheduledDate: Date, slot: string): string {
  return `puja-priest-slot:${priestId}:${scheduledDate.toISOString().slice(0, 10)}:${slot}`;
}

/**
 * Take a transaction-scoped advisory lock on a priest-slot key.
 *
 * `pg_advisory_xact_lock` is released at COMMIT, so it is safe under Supabase's
 * transaction-mode pooler (a session-level lock would leak across pooled
 * clients). MUST be the first statement inside the transaction it guards —
 * taking it after the conflict read leaves the TOCTOU window wide open.
 *
 * Best-effort by design: if the statement cannot run we log and fall through to
 * the conflict re-check inside the transaction. Degrading to the old (racy)
 * behaviour is strictly better than failing every booking.
 */
export async function lockPriestSlot(tx: SlotLockClient, key: string): Promise<void> {
  try {
    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', key);
  } catch (err) {
    console.warn('[priest-slot] advisory lock unavailable:', err);
  }
}
