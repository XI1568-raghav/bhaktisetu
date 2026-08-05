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
import {
  notifyDevotee,
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

const ACCEPTANCE_FLOOR = 0.85; // Lyft's published acceptance-rate floor anchor.

type TierKey = keyof typeof TIER_CONFIG;

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
   * then rating). Geo-filters to serviceRadiusKm when the booking has a
   * delivery/prasad address with lat/lng; otherwise falls back to city match.
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

    // Geo-filter when we have both booking + priest coordinates.
    let filtered = priests;
    if (opts.bookingLat != null && opts.bookingLng != null) {
      const withDist = priests
        .filter((p) => p.lat != null && p.lng != null)
        .map((p) => ({
          p,
          d: haversineKm(opts.bookingLat!, opts.bookingLng!, p.lat!, p.lng!),
        }))
        .filter((x) => x.d <= (x.p.serviceRadiusKm ?? 15))
        .sort((a, b) => a.d - b.d);
      filtered = withDist.map((x) => x.p);
    } else if (opts.bookingCity) {
      const city = opts.bookingCity.toLowerCase();
      const inCity = priests.filter((p) => p.city?.toLowerCase() === city);
      if (inCity.length) filtered = inCity;
    }

    return filtered
      .slice(0, cfg.candidateCount)
      .map((p) => ({ id: p.id, displayName: p.displayName, userId: p.userId }));
  }

  /**
   * Broadcast a booking to candidate priests. Writes DispatchOffer rows, sets
   * booking.offerExpiresAt, and fires a one-tap-accept WhatsApp+push to each.
   * Returns the number of offers sent.
   */
  async broadcast(bookingId: string, tier: TierKey, round = 1): Promise<number> {
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
        acceptUrl: `${acceptBase}/priest/bookings/${bookingId}?accept=1`,
        expiresInSec: cfg.acceptWindowSec,
      }).catch(() => undefined);
    }

    return candidates.length;
  }

  /**
   * A priest accepts a dispatch offer. Transactional: the first priest to
   * accept wins; siblings are superseded; booking → priest_assigned. Throws if
   * the offer is no longer open or the booking is already taken.
   */
  async accept(bookingId: string, priestId: string): Promise<{ bookingId: string; priestId: string }> {
    const now = new Date();
    return prisma.$transaction(async (tx) => {
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

      const booking = await tx.pujaBooking.findUnique({ where: { id: bookingId } });
      if (!booking) throw new Error('Booking not found.');
      if (booking.status !== 'confirmed' || booking.priestId) {
        throw new Error('This booking has already been assigned.');
      }

      // Double-booking guard (same date+slot) — mirrors priest.service.
      const conflict = await tx.pujaBooking.findFirst({
        where: {
          priestId,
          scheduledDate: booking.scheduledDate,
          scheduledTimeSlot: booking.scheduledTimeSlot,
          status: { notIn: ['cancelled', 'refunded'] },
          id: { not: bookingId },
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
      await tx.pujaBooking.update({
        where: { id: bookingId },
        data: { priestId, status: 'priest_assigned', assignedVia: 'broadcast', offerExpiresAt: null },
      });

      return { bookingId, priestId };
    }).then(async (res) => {
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
   * Cron sweep (wire into master-cron). Marks expired sent offers; for each
   * booking that still has no accepted offer and no priest, either rebroadcasts
   * (bounded) or escalates: notifies the devotee we're re-matching / offering a
   * refund, and leaves the booking confirmed for admin pickup.
   * Returns a small result for the cron report.
   */
  async sweepExpiredOffers(): Promise<{ expired: number; rebroadcast: number; escalated: number }> {
    const now = new Date();
    const expiredOffers = await prisma.dispatchOffer.updateMany({
      where: { state: 'sent', expiresAt: { lt: now } },
      data: { state: 'expired', respondedAt: now },
    });

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
      const tier = b.dispatchTier as TierKey;
      const cfg = TIER_CONFIG[tier];
      const sentCount = await prisma.dispatchOffer.count({
        where: { bookingId: b.id },
      });
      const rounds = Math.ceil(sentCount / cfg.candidateCount) || 1;
      if (rounds < cfg.maxRounds) {
        const n = await this.broadcast(b.id, tier, rounds + 1).catch(() => 0);
        if (n > 0) rebroadcast++;
        else escalated++; // no more candidates — escalate
      } else {
        escalated++;
      }
      if (rounds >= cfg.maxRounds || escalated) {
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

    return { expired: expiredOffers.count, rebroadcast, escalated };
  }
}

export const dispatchService = new DispatchService();
