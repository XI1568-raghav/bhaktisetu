/**
 * dispatch.service.ts — the booking dispatch brain (booking revamp 2026-08-04).
 *
 * Before this, "assignment" was one of: priest self-picks from an implicit
 * queue, a temple manager pins assignedPriestId, a /from-offering booking bakes
 * priestId in at create time, or an admin reassigns. There was NO broadcast,
 * NO timeout, NO auto-reassign — the exact reason a devotee whose pandit is
 * busy or slow to respond gets left hanging and leaves.
 *
 * This service implements the tiered dispatch model:
 *   T1 instant   — broadcast to N on-duty pandits, ~60s accept window, auto-reassign
 *   T2 one_hour  — offer to qualified pool, 1-hour SLA
 *   T3 senior    — hand-picked 15+yr pandits, 3-4hr expected reply
 *   T4 scheduled — today's self-accept pool (no broadcast; booking stays in
 *                  `confirmed` and priests self-pick as before)
 *
 * Design:
 *  - selectCandidates: geo (haversine within serviceRadiusKm when both sides
 *    have lat/lng) + tier + on-duty/last-seen freshness + acceptanceRate +
 *    rating ordering. Cap N per tier (Uber batches ~5-8; DoorDash windows are
 *    ~50s, we use 60s for a non-driving provider).
 *  - broadcast: write N DispatchOffer rows, set booking.offerExpiresAt, fire
 *    WhatsApp + push with a one-tap accept link.
 *  - accept: TRANSACTIONAL — mark the winning offer accepted, supersede all
 *    sibling sent offers, set priestId + assignedVia, transition
 *    confirmed→priest_assigned. Reuses the double-booking guard semantics.
 *  - sweepExpiredOffers (cron): mark expired sent offers; if the booking has
 *    no accepted offer and no priest, rebroadcast (bounded rounds) else
 *    escalate to admin + notify devotee (reassign / refund option).
 *  - updateAcceptanceRate: rolling over the priest's recent offers; the
 *    selection query orders by it, so low-acceptance pandits naturally sink.
 */

import { prisma } from '../lib/prisma.js';
import { priestSlotKey, lockPriestSlot } from '../lib/priest-slot.js';
import { mintProviderEarningForBooking } from './provider-earning-mint.js';
// OPS-05 — the durable money trail. Post-commit only; never inside a tx.
import { recordProviderEarningMinted } from '../lib/audit-money-callsites.js';
import { activeSlotHoldWhere } from './booking.service.js';
import {
  notifyDevotee,
  notifyPriest,
  sendOfferToPriest,
  buildBookingCtx,
  priestContact,
} from './booking-notify.service.js';

// Per-tier knobs. acceptWindowSec anchors: Uber 15s / DoorDash 50s — a pandit
// isn't driving, so 60s for instant is defensible; T2/T3 are deliberate.
const TIER_CONFIG: Record<
  'instant' | 'one_hour' | 'senior',
  { candidateCount: number; acceptWindowSec: number; maxRounds: number; onDutyOnly: boolean }
> = {
  instant: { candidateCount: 6, acceptWindowSec: 60, maxRounds: 2, onDutyOnly: true },
  one_hour: { candidateCount: 3, acceptWindowSec: 3600, maxRounds: 2, onDutyOnly: false },
  senior: { candidateCount: 2, acceptWindowSec: 14400, maxRounds: 1, onDutyOnly: false },
};

// S3-13 (2026-08-11): there used to be an `ACCEPTANCE_FLOOR = 0.85` here,
// annotated as Lyft's published floor. Nothing ever read it — selectCandidates
// ORDERS BY acceptanceRate but has never filtered on it — so the constant read
// as shipped policy that was not shipped.
//
// Deleted rather than enforced, deliberately. A hard floor is a deep-pool
// policy: on this pool it turns two declines into permanent exclusion from the
// instant tier, and an empty candidate set is not a neutral outcome here —
// broadcast returns 0 without setting offerExpiresAt, so the booking becomes
// invisible to sweepExpiredOffers and is never dispatched at all (the same dead
// end the geo filter used to cause, fixed below). Acceptance rate stays a SOFT
// signal: it is the first orderBy key, so a low-acceptance pandit sinks below
// every willing one and is offered work only when nobody better is available —
// which is what we want while supply is thin. Revisit as a hard filter when the
// pool per tier per city is deep enough that dropping the bottom decile still
// fills a batch.

type TierKey = keyof typeof TIER_CONFIG;

/**
 * NOTIF-10 — act on the accept window we actually sold.
 *
 * `instant` promises a 60-SECOND accept window, but nothing acted on an expired
 * offer except sweepExpiredOffers, which ran as tick 13 of an 18-tick chain on a
 * 30-minute cadence (jobs/scheduler.ts DEFAULT_INTERVAL_MS). So round 2 of a
 * 60-second offer landed up to 30 minutes late, and the devotee's "we're
 * re-matching" notice up to an hour late — on the tier sold as the paid
 * differentiator against SmartPuja/Harivara. cancellation.service's
 * `offerExpiresAt: new Date()  // trigger immediate re-broadcast` had the word
 * "immediate" doing work the scheduler did not do.
 *
 * So every broadcast arms a timer for its own window instead of waiting to be
 * polled. Properties that make this safe:
 *   - `unref()` — never holds the process open, never delays a shutdown;
 *   - one timer per booking, replaced on rebroadcast, cleared once it fires;
 *   - the work is `sweepBookingOffers`, which is idempotent and re-reads state,
 *     so a timer that fires late, twice, or alongside the cron changes nothing;
 *   - the cron sweep REMAINS the safety net — a process restart drops the
 *     timers, and the sweep is what catches those bookings.
 */
const offerTimers = new Map<string, NodeJS.Timeout>();

/** Small grace so the timer never fires a hair before `expiresAt`. */
const OFFER_TIMEOUT_GRACE_MS = 2_000;

/** Test seam — drop every armed timer so a suite cannot leak one into the next. */
export function __clearOfferTimersForTests(): void {
  for (const t of offerTimers.values()) clearTimeout(t);
  offerTimers.clear();
}

/** Haversine distance in km between two lat/lng points. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export class DispatchService {
  /**
   * Pick the best candidate priests for a booking at a tier. Returns priest
   * rows ordered by suitability (acceptanceRate, then lastSeenAt freshness,
   * then rating). Narrows to serviceRadiusKm when the booking has a
   * delivery/prasad address with lat/lng, falls back to a city match, and falls
   * back again to the unfiltered pool — each narrowing applies only if it leaves
   * somebody. Returning nobody is never the right answer while any qualified
   * pandit exists (see the comment on the filter).
   */
  async selectCandidates(opts: {
    tier: TierKey;
    bookingLat?: number | null;
    bookingLng?: number | null;
    bookingCity?: string | null;
    specializations?: string[];
    excludePriestIds?: string[];
  }): Promise<Array<{ id: string; displayName: string; userId: string }>> {
    const cfg = TIER_CONFIG[opts.tier];
    const freshSince = new Date(Date.now() - 15 * 60 * 1000); // on-duty + seen in last 15m

    const priests = await prisma.priest.findMany({
      where: {
        status: 'active',
        isVerified: true,
        verificationStatus: 'approved',
        tier: opts.tier === 'instant' ? 'instant_pool' : opts.tier === 'one_hour' ? 'verified' : 'senior',
        ...(cfg.onDutyOnly ? { isOnDuty: true, lastSeenAt: { gte: freshSince } } : {}),
        ...(opts.excludePriestIds?.length ? { id: { notIn: opts.excludePriestIds } } : {}),
        ...(opts.specializations?.length
          ? { specializations: { hasSome: opts.specializations } }
          : {}),
      },
      select: {
        id: true,
        displayName: true,
        userId: true,
        lat: true,
        lng: true,
        city: true,
        serviceRadiusKm: true,
        acceptanceRate: true,
        lastSeenAt: true,
        ratingAvg: true,
      },
      orderBy: [{ acceptanceRate: 'desc' }, { ratingAvg: 'desc' }],
      take: cfg.candidateCount * 3, // over-fetch, then geo-filter
    });

    // S3-12 (2026-08-11): geo is a REFINEMENT, never a replacement.
    //
    // This used to be `filtered = withDist.map(...)` unconditionally whenever the
    // booking had coordinates, with the city match sitting in an `else if` that
    // could therefore never run. `Priest.lat`/`lng` are `Float?` and nothing in
    // the onboarding flow populates them, so the coordinate-less pool — i.e. the
    // whole pool today — was dropped outright, and every booking whose
    // prasadAddress carries lat/lng (broadcast passes them) selected ZERO
    // candidates. broadcast then returns 0 having written no offers and, crucially,
    // without setting `offerExpiresAt`; sweepExpiredOffers only picks up bookings
    // with `offerExpiresAt < now`, so the booking is invisible to the sweep
    // forever. A paid T1 "instant" booking was silently never dispatched and never
    // escalated — the exact failure the tiered engine exists to eliminate.
    //
    // So: try radius, fall back to city, fall back to the unfiltered over-fetch.
    // A pandit slightly outside the radius (or with no coordinates on file) is a
    // far better outcome than nobody at all — the offer is an OFFER, and he can
    // decline.
    let filtered: typeof priests | null = null;
    if (opts.bookingLat != null && opts.bookingLng != null) {
      const withDist = priests
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({
          p,
          d: haversineKm(opts.bookingLat!, opts.bookingLng!, p.lat!, p.lng!),
        }))
        .filter((x) => x.d <= (x.p.serviceRadiusKm ?? 15))
        .sort((a, b) => a.d - b.d);
      if (withDist.length) filtered = withDist.map((x) => x.p);
    }
    if (!filtered && opts.bookingCity) {
      const city = opts.bookingCity.toLowerCase();
      const inCity = priests.filter((p) => p.city?.toLowerCase() === city);
      if (inCity.length) filtered = inCity;
    }

    return (filtered ?? priests)
      .slice(0, cfg.candidateCount)
      .map((p) => ({ id: p.id, displayName: p.displayName, userId: p.userId }));
  }

  /**
   * Broadcast a booking to candidate priests. Writes DispatchOffer rows, sets
   * booking.offerExpiresAt, and fires a one-tap-accept WhatsApp+push to each.
   * Returns the number of offers sent.
   *
   * S3-13 (2026-08-11): took a `round = 1` parameter that was never read — the
   * sweep passed `rounds + 1` and it was discarded, so nothing recorded which
   * round an offer belonged to. Dropped instead of persisted: a `round` column on
   * DispatchOffer needs a migration, and the sweep can count rounds exactly
   * without one (see sweepExpiredOffers).
   */
  async broadcast(bookingId: string, tier: TierKey): Promise<number> {
    const cfg = TIER_CONFIG[tier];
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        pujaType: { select: { name: true } },
        temple: { select: { name: true } },
        user: { select: { id: true, fullName: true, phone: true } },
        prasadAddress: { select: { lat: true, lng: true, city: true } },
      },
    });
    if (!booking) throw new Error('Booking not found.');
    if (booking.status !== 'confirmed') {
      // Only broadcast an unassigned, confirmed booking.
      return 0;
    }

    // Exclude priests already offered (and declined/expired) this booking.
    const prior = await prisma.dispatchOffer.findMany({
      where: { bookingId },
      select: { priestId: true },
    });
    const excludePriestIds = prior.map((o) => o.priestId);

    const candidates = await this.selectCandidates({
      tier,
      bookingLat: booking.prasadAddress?.lat ?? null,
      bookingLng: booking.prasadAddress?.lng ?? null,
      bookingCity: booking.prasadAddress?.city ?? null,
      excludePriestIds,
    });
    if (!candidates.length) return 0;

    const expiresAt = new Date(Date.now() + cfg.acceptWindowSec * 1000);
    const acceptBase = process.env.WEB_BASE_URL ?? 'https://darshya.online';

    await prisma.$transaction(async (tx) => {
      for (const c of candidates) {
        await tx.dispatchOffer.create({
          data: { bookingId, priestId: c.id, expiresAt },
        });
      }
      await tx.pujaBooking.update({
        where: { id: bookingId },
        data: { dispatchTier: tier, offerExpiresAt: expiresAt },
      });
    });

    // Fire-and-forget per-candidate offer notifications.
    for (const c of candidates) {
      const contact = await priestContact(c.id).catch(() => null);
      void sendOfferToPriest({
        priestPhone: contact?.phone ?? null,
        priestUserId: c.userId,
        bookingId,
        pujaName: booking.pujaType.name,
        // PJ-04: the accept intent lives in the PATH, never the query string.
        // apps/web/middleware.ts:221 bounces an unauthenticated portal request
        // to /auth/login with `redirect=pathname` — pathname only — so a
        // `?accept=1` on a WhatsApp link tapped from a signed-out phone is gone
        // before the login form renders, and the pandit lands on the plain
        // booking view, which is assigned-only and 403s for an offer he has not
        // accepted. `/priest/bookings/:id/accept` round-trips that bounce
        // unchanged. Served by apps/web/app/priest/bookings/[id]/accept/page.tsx.
        acceptUrl: `${acceptBase}/priest/bookings/${bookingId}/accept`,
        expiresInSec: cfg.acceptWindowSec,
      }).catch(() => undefined);
    }

    this.armOfferTimeout(bookingId, cfg.acceptWindowSec);

    return candidates.length;
  }

  /**
   * Arm the per-booking offer timeout. Overridable/spy-able; see offerTimers.
   */
  armOfferTimeout(bookingId: string, acceptWindowSec: number): void {
    const existing = offerTimers.get(bookingId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      offerTimers.delete(bookingId);
      void this.sweepBookingOffers(bookingId).catch((err) =>
        console.warn('[dispatch] offer timeout sweep failed:', err),
      );
    }, acceptWindowSec * 1000 + OFFER_TIMEOUT_GRACE_MS);
    // Never keep the API process alive for a pending offer window.
    timer.unref?.();
    offerTimers.set(bookingId, timer);
  }

  /**
   * A priest accepts a dispatch offer. Transactional: the first priest to
   * accept wins; siblings are superseded; booking → priest_assigned. Throws if
   * the offer is no longer open or the booking is already taken.
   */
  async accept(bookingId: string, priestId: string): Promise<{ bookingId: string; priestId: string }> {
    const now = new Date();
    // OPS-05: the mint happens inside the transaction below, but the audit row
    // must be written after it commits (recordMoneyEvent takes no `tx` — a
    // failed audit INSERT would abort the caller's transaction and roll back
    // the assignment). Carried out on a closure variable rather than the tx
    // return value so `accept`'s public shape is unchanged.
    let mintOutcome = 'no-provider-on-booking';
    return prisma.$transaction(async (tx) => {
      // We need the date+slot to build the lock key, and the lock has to be the
      // FIRST statement in the transaction (see below), so read the booking
      // before anything else.
      const booking = await tx.pujaBooking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new Error('Booking not found.');

      // S3-01 (2026-08-11): serialise this accept against every other writer of
      // this pandit's date+slot.
      //
      // The conflict `findFirst` below has always been here, but it ran in a
      // plain `$transaction` with no lock, while the two priestId writers in
      // routes/bookings.ts (the admin reassign in PATCH /bookings/:id and the
      // create in POST /bookings/from-offering) DO take
      // `pg_advisory_xact_lock(priestSlotKey(...))`. An advisory lock only
      // serialises callers that agree to take it, so admin-vs-pandit and
      // pandit-vs-pandit were entirely unserialised: under READ COMMITTED
      // (Postgres' default; Prisma passes no isolation level) both transactions
      // read a pre-insert snapshot, both conflict checks return null, both
      // COMMIT, and the pandit is double-booked. Only one puja can physically
      // happen, video proof is mandatory, so the other is undeliverable and must
      // be refunded in full — the platform refunds the whole booking, still eats
      // the non-refundable Razorpay MDR, and the dead booking's Commission row
      // has to be reversed by hand.
      //
      // The key function lives in lib/priest-slot.ts precisely so this call site
      // and the two in routes/bookings.ts share ONE key space: a lock taken on a
      // differently-derived key is the same as no lock at all.
      await lockPriestSlot(
        tx,
        priestSlotKey(priestId, booking.scheduledDate, booking.scheduledTimeSlot),
      );

      const offer = await tx.dispatchOffer.findFirst({
        where: { bookingId, priestId, state: 'sent' },
      });
      if (!offer) throw new Error('This offer is no longer available.');
      if (offer.expiresAt < now) {
        await tx.dispatchOffer.update({
          where: { id: offer.id },
          data: { state: 'expired', respondedAt: now },
        });
        throw new Error('This offer has expired.');
      }

      if (booking.status !== 'confirmed' || booking.priestId) {
        throw new Error('This booking has already been assigned.');
      }

      // Double-booking guard (same date+slot). Re-read INSIDE the lock: whoever
      // held it before us has COMMITted by the time we get here, so this now
      // sees their row.
      //
      // S3-04: `activeSlotHoldWhere` (not a hand-copied status predicate) — an
      // abandoned `pending_payment` row older than the unpaid hold is stale
      // inventory, not a booking, and must not block a real assignment.
      const conflict = await tx.pujaBooking.findFirst({
        where: {
          priestId,
          scheduledDate: booking.scheduledDate,
          scheduledTimeSlot: booking.scheduledTimeSlot,
          id: { not: bookingId },
          ...activeSlotHoldWhere(),
        },
        select: { id: true },
      });
      if (conflict) {
        throw new Error('You already have another booking at this date and time slot.');
      }

      // Win: accept this offer, supersede the rest, assign the booking.
      await tx.dispatchOffer.update({
        where: { id: offer.id },
        data: { state: 'accepted', respondedAt: now },
      });
      await tx.dispatchOffer.updateMany({
        where: { bookingId, state: 'sent', id: { not: offer.id } },
        data: { state: 'superseded', respondedAt: now },
      });
      // QA 2026-10-13: the status check above is a read, and the slot lock is
      // per-pandit, so two different pandits accepting the same broadcast at
      // once both passed it and the later write silently took the booking. The
      // winner is whoever flips the still-unassigned row.
      const claim = await tx.pujaBooking.updateMany({
        where: { id: bookingId, status: 'confirmed', priestId: null },
        data: { priestId, status: 'priest_assigned', assignedVia: 'broadcast', offerExpiresAt: null },
      });
      if (claim.count === 0) throw new Error('This booking has already been assigned.');
      const assigned = await tx.pujaBooking.update({
        where: { id: bookingId },
        data: { priestId, status: 'priest_assigned', assignedVia: 'broadcast', offerExpiresAt: null },
        select: { id: true, priestId: true, priceAmount: true, priestPayout: true },
      });

      // DI-05: MINT THE EARNING. This path never enters
      // booking.service.updateBookingStatus, so the re-mint gated on
      // EARNING_ATTACH_STATUSES could not fire here — and 'priest_assigned' is
      // in that set, so it was meant to. A pandit who WON A BROADCAST therefore
      // held no Commission and no PriestPayout, and his own /priest/payouts
      // screen answered Rs 0 on money he was owed.
      //
      // Reads `assigned`, the row the update just returned, NOT the pre-update
      // `booking` snapshot above — that one still carries priestId: null, and
      // minting off it is the original bug wearing a new hat. Inside the same
      // transaction as the assignment, so an assignment that rolls back cannot
      // leave a payable behind. All four guards (idempotency, legacy rail,
      // captured payment, linked User) live in provider-earning-mint.ts.
      mintOutcome = await mintProviderEarningForBooking(tx, assigned);

      return { bookingId, priestId };
    }).then(async (res) => {
      // OPS-05: record the mint now the assignment is durable. A pandit who
      // WON A BROADCAST is exactly the case DI-05 was filed for, so this is
      // the mint most worth having on the trail. No-op unless it minted.
      await recordProviderEarningMinted({
        bookingId,
        outcome: mintOutcome,
        rail: 'dispatch-accept-offer',
        actorType: 'provider',
      });
      // Post-commit: notify devotee + update the winner's acceptance rate.
      const b = await prisma.pujaBooking.findUnique({
        where: { id: bookingId },
        include: {
          pujaType: { select: { name: true } },
          temple: { select: { name: true } },
          user: { select: { id: true, fullName: true, phone: true } },
          priest: { select: { displayName: true } },
        },
      });
      if (b) void notifyDevotee('assigned', buildBookingCtx(b as never)).catch(() => undefined);
      void this.updateAcceptanceRate(priestId).catch(() => undefined);
      return res;
    });
  }

  /**
   * Route a freshly PAID booking to the pandit pinned on its temple puja
   * offering ("Assigned Priest" in the temple portal), instead of the open pool.
   *
   * Called once, right after payment capture confirms the booking. It assigns
   * only when everything holds: the booking is still `confirmed` with no pandit,
   * the offering names a pandit, that pandit is verified and active, and is free
   * at that date and slot (same advisory lock + conflict check as `accept`).
   * In every other case it does nothing and the booking stays in the open pool
   * exactly as before, so a booking can never be stranded by this. It never
   * throws for the same reason. If the pandit later releases the booking the
   * existing reject path returns it to the open pool.
   */
  async assignPinnedPriest(
    bookingId: string,
  ): Promise<{ assigned: true; priestId: string } | { assigned: false; reason: string }> {
    try {
      const booking = await prisma.pujaBooking.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          status: true,
          priestId: true,
          templePujaOfferingId: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
        },
      });
      if (!booking || booking.status !== 'confirmed' || booking.priestId) {
        return { assigned: false, reason: 'not_open' };
      }
      if (!booking.templePujaOfferingId) return { assigned: false, reason: 'no_pinned_priest' };

      const offering = await prisma.templePujaOffering.findUnique({
        where: { id: booking.templePujaOfferingId },
        select: { assignedPriestId: true },
      });
      const priestId = offering?.assignedPriestId ?? null;
      if (!priestId) return { assigned: false, reason: 'no_pinned_priest' };

      const priest = await prisma.priest.findUnique({
        where: { id: priestId },
        select: { id: true, isVerified: true, status: true },
      });
      if (!priest || !priest.isVerified || priest.status !== 'active') {
        return { assigned: false, reason: 'priest_not_eligible' };
      }

      let mintOutcome = 'no-provider-on-booking';
      const outcome = await prisma.$transaction(async (tx) => {
        // Lock first: same key space as accept() and the other priestId writers.
        await lockPriestSlot(tx, priestSlotKey(priestId, booking.scheduledDate, booking.scheduledTimeSlot));

        const conflict = await tx.pujaBooking.findFirst({
          where: {
            priestId,
            scheduledDate: booking.scheduledDate,
            scheduledTimeSlot: booking.scheduledTimeSlot,
            id: { not: bookingId },
            ...activeSlotHoldWhere(),
          },
          select: { id: true },
        });
        if (conflict) return 'priest_busy' as const;

        const assigned = await tx.pujaBooking.update({
          where: { id: bookingId, status: 'confirmed', priestId: null },
          data: { priestId, status: 'priest_assigned', assignedVia: 'temple_pin', offerExpiresAt: null },
          select: { id: true, priestId: true, priceAmount: true, priestPayout: true },
        });
        // Same mint as accept(): this write bypasses updateBookingStatus.
        mintOutcome = await mintProviderEarningForBooking(tx, assigned);
        return 'assigned' as const;
      });
      if (outcome !== 'assigned') return { assigned: false, reason: outcome };

      await recordProviderEarningMinted({
        bookingId,
        outcome: mintOutcome,
        rail: 'temple-pinned-priest',
        actorType: 'system',
      });
      const b = await prisma.pujaBooking.findUnique({
        where: { id: bookingId },
        include: {
          pujaType: { select: { name: true } },
          temple: { select: { name: true } },
          user: { select: { id: true, fullName: true, phone: true } },
          priest: { select: { displayName: true } },
        },
      });
      if (b) void notifyDevotee('assigned', buildBookingCtx(b as never)).catch(() => undefined);
      return { assigned: true, priestId };
    } catch (err) {
      console.warn('[dispatch] pinned-priest routing failed; booking stays in the open pool:', err);
      return { assigned: false, reason: 'error' };
    }
  }

  /**
   * Record a decline and refresh the priest's acceptance rate. If every open
   * offer on the booking is now resolved with no winner, the next cron sweep
   * will rebroadcast/escalate.
   */
  async decline(bookingId: string, priestId: string): Promise<void> {
    await prisma.dispatchOffer.updateMany({
      where: { bookingId, priestId, state: 'sent' },
      data: { state: 'declined', respondedAt: new Date() },
    });
    void this.updateAcceptanceRate(priestId).catch(() => undefined);
  }

  /**
   * Rolling acceptance rate over the priest's last 100 resolved offers.
   * Accepted = win; declined/expired = loss; superseded is neutral (excluded).
   */
  async updateAcceptanceRate(priestId: string): Promise<number> {
    const offers = await prisma.dispatchOffer.findMany({
      where: { priestId, state: { in: ['accepted', 'declined', 'expired'] } },
      orderBy: { sentAt: 'desc' },
      take: 100,
      select: { state: true },
    });
    if (!offers.length) return 1.0;
    const wins = offers.filter((o) => o.state === 'accepted').length;
    const rate = wins / offers.length;
    await prisma.priest.update({
      where: { id: priestId },
      data: { acceptanceRate: rate },
    });
    return rate;
  }

  /**
   * Expire every `sent` offer past its window and TELL THE PANDITS.
   *
   * NOTIF-06: this used to be a bare `updateMany`, which discards the identity
   * of the offers it just closed — so `notifyPriest` had no caller anywhere in
   * the repo and `offer_timeout` was a declared BookingEvent with a written,
   * unreachable WhatsApp template. A pandit was never told his offer expired or
   * that the booking moved on; the first he knew was the request vanishing from
   * his portal. Reading the rows before closing them costs one bounded query and
   * is the only way to name the pandits.
   *
   * `bookingId` narrows to a single booking (the per-offer timeout path).
   */
  private async expireSentOffers(
    now: Date,
    bookingId?: string,
  ): Promise<number> {
    // `as const` keeps the literal from widening to `string`, which does not
    // satisfy DispatchOfferWhereInput['state'] (the OfferState enum).
    const where = {
      state: 'sent' as const,
      expiresAt: { lt: now },
      ...(bookingId ? { bookingId } : {}),
    };
    const expiring =
      (await prisma.dispatchOffer.findMany({
        where,
        select: { id: true, bookingId: true, priestId: true },
        take: 200,
      })) ?? [];
    const closed = await prisma.dispatchOffer.updateMany({
      where,
      data: { state: 'expired', respondedAt: now },
    });
    if (expiring.length) void this.notifyExpiredOfferPriests(expiring);
    return closed?.count ?? 0;
  }

  /** Fire-and-forget `offer_timeout` to each pandit whose offer just lapsed. */
  private async notifyExpiredOfferPriests(
    offers: Array<{ bookingId: string; priestId: string }>,
  ): Promise<void> {
    const bookings = new Map<string, unknown>();
    for (const o of offers) {
      try {
        if (!bookings.has(o.bookingId)) {
          bookings.set(
            o.bookingId,
            await prisma.pujaBooking.findUnique({
              where: { id: o.bookingId },
              include: {
                pujaType: { select: { name: true } },
                temple: { select: { name: true } },
                user: { select: { id: true, fullName: true, phone: true } },
              },
            }),
          );
        }
        const full = bookings.get(o.bookingId);
        if (!full) continue;
        const contact = await priestContact(o.priestId).catch(() => null);
        if (!contact) continue;
        await notifyPriest(
          contact.userId,
          contact.phone,
          'offer_timeout',
          buildBookingCtx(full as never),
        );
      } catch (err) {
        // A pandit notification must never break the sweep that reassigns the
        // devotee's booking — that is the part with money attached.
        console.warn('[dispatch] offer_timeout notify failed:', err);
      }
    }
  }

  /**
   * Cron sweep (wire into master-cron). Marks expired sent offers; for each
   * booking that still has no accepted offer and no priest, either rebroadcasts
   * (bounded) or escalates: notifies the devotee we're re-matching / offering a
   * refund, and leaves the booking confirmed for admin pickup.
   * Returns a small result for the cron report.
   *
   * Still the SAFETY NET, not the primary path: per-booking timers armed by
   * broadcast() (NOTIF-10) handle the normal case within the tier's own accept
   * window, and this catches whatever a process restart dropped.
   */
  async sweepExpiredOffers(): Promise<{ expired: number; rebroadcast: number; escalated: number }> {
    const now = new Date();
    const expiredCount = await this.expireSentOffers(now);

    // Bookings past their offer window, still unassigned & confirmed.
    const stale = await prisma.pujaBooking.findMany({
      where: {
        status: 'confirmed',
        priestId: null,
        offerExpiresAt: { lt: now },
        dispatchTier: { in: ['instant', 'one_hour', 'senior'] },
      },
      select: { id: true, dispatchTier: true },
      take: 50,
    });

    let rebroadcast = 0;
    let escalated = 0;
    for (const b of stale) {
      const r = await this.resolveUnassigned(b.id, b.dispatchTier as TierKey);
      rebroadcast += r.rebroadcast;
      escalated += r.escalated;
    }

    return { expired: expiredCount, rebroadcast, escalated };
  }

  /**
   * Resolve ONE booking whose offer window has lapsed — the per-offer timeout
   * path (NOTIF-10). Same decision as the cron sweep, scoped to one id and
   * costing no table scan, so a 60-second instant window is acted on in ~60
   * seconds instead of up to 30 minutes.
   *
   * Idempotent: it re-reads the booking and does nothing once a pandit has
   * accepted, so firing alongside the cron sweep is harmless.
   */
  async sweepBookingOffers(
    bookingId: string,
  ): Promise<{ expired: number; rebroadcast: number; escalated: number }> {
    const now = new Date();
    const expired = await this.expireSentOffers(now, bookingId);

    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, priestId: true, dispatchTier: true, offerExpiresAt: true },
    });
    if (
      !booking ||
      booking.status !== 'confirmed' ||
      booking.priestId ||
      !booking.offerExpiresAt ||
      booking.offerExpiresAt > now ||
      !['instant', 'one_hour', 'senior'].includes(String(booking.dispatchTier))
    ) {
      return { expired, rebroadcast: 0, escalated: 0 };
    }

    const r = await this.resolveUnassigned(bookingId, booking.dispatchTier as TierKey);
    return { expired, ...r };
  }

  /**
   * Rebroadcast (bounded by the tier's maxRounds) or escalate one unassigned
   * booking. Extracted so the cron sweep and the per-offer timeout make the
   * SAME decision — two copies of this would drift, and the escalation branch is
   * the one that tells a paying devotee what is happening.
   */
  private async resolveUnassigned(
    bookingId: string,
    tier: TierKey,
  ): Promise<{ rebroadcast: number; escalated: number }> {
    let rebroadcast = 0;
    let escalated = 0;
    {
      const b = { id: bookingId };
      const cfg = TIER_CONFIG[tier];

      // Rounds so far, counted EXACTLY rather than inferred.
      //
      // This used to be `Math.ceil(offerCount / cfg.candidateCount)`, which
      // drifts every time a round sends fewer offers than the tier's candidate
      // count (a thin pool, or a rebroadcast that excludes everyone already
      // offered) — two 2-offer rounds on a 6-candidate tier read as one round, so
      // the booking gets a third broadcast it was never entitled to. `expiresAt`
      // is computed ONCE per broadcast and written identically to every offer in
      // that batch, so one distinct expiresAt == one round. No schema change
      // needed for that; a `round` column would have meant a migration.
      const batches = await prisma.dispatchOffer.groupBy({
        by: ['expiresAt'],
        where: { bookingId: b.id },
      });
      const rounds = batches.length || 1;

      // S3-11 (2026-08-11): this MUST be per-iteration.
      //
      // The branch below used to read `if (rounds >= cfg.maxRounds || escalated)`
      // — `escalated` being the running COUNTER shared across all 50 bookings in
      // the sweep. Once any one booking escalated, every later booking in the
      // batch took the escalation branch regardless of its own outcome: a booking
      // that had just been successfully rebroadcast to 6 pandits with a fresh 60s
      // window had that window nulled two lines later and its devotee told "we're
      // re-matching / here's a refund option". And because the stale query
      // requires `offerExpiresAt < now`, a NULL makes the booking invisible to
      // every future sweep — no second rebroadcast, no escalation, no admin
      // pickup. A paid, confirmed booking rotted unassigned forever, on any sweep
      // where a single earlier booking happened to escalate.
      let didEscalate = false;
      if (rounds < cfg.maxRounds) {
        const n = await this.broadcast(b.id, tier).catch(() => 0);
        if (n > 0) {
          rebroadcast++;
        } else {
          // No candidates left to offer — escalate instead.
          escalated++;
          didEscalate = true;
        }
      } else {
        escalated++;
        didEscalate = true;
      }
      if (didEscalate) {
        // Tell the devotee we're re-matching; booking stays for admin.
        const full = await prisma.pujaBooking.findUnique({
          where: { id: b.id },
          include: {
            pujaType: { select: { name: true } },
            temple: { select: { name: true } },
            user: { select: { id: true, fullName: true, phone: true } },
          },
        });
        if (full) void notifyDevotee('reassigned', buildBookingCtx(full as never)).catch(() => undefined);
        // Clear the offer window so we don't loop forever on this booking.
        await prisma.pujaBooking.update({
          where: { id: b.id },
          data: { offerExpiresAt: null },
        });
      }
    }

    return { rebroadcast, escalated };
  }
}

export const dispatchService = new DispatchService();
