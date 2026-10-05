import { Prisma, BookingStatus, PayoutStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { BookingService } from './booking.service.js';
import { notifyUser } from '../routes/notifications.js';
import { notifyDevotee, buildBookingCtx } from './booking-notify.service.js';
import { mintProviderEarningForBooking } from './provider-earning-mint.js';
// OPS-05 — the durable money trail. Post-commit only; never inside a tx.
import { recordProviderEarningMinted } from '../lib/audit-money-callsites.js';
import { pujaStartLockedMessage, pujaStartUnlockAt } from '../lib/puja-start-window.js';

/** A request that is valid but not allowed yet (or any more); the route sends it as 409. */
export class PujaStateConflictError extends Error {
  readonly statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = 'PujaStateConflictError';
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * PF-07 (prod sweep 2026-08-12): the pandit portal's tab strip is not a list of
 * raw statuses — "Completed" covers the three delivered-side states. The map
 * lives here so the badge count and the rows behind it are computed from the
 * SAME definition, server-side. Previously the page filtered and counted a
 * 20-row page client-side and presented that as the total: a pandit with 25
 * accepted jobs was told he had 15.
 */
export const PRIEST_BOOKING_VIEWS = {
  all: null,
  confirmed: ['confirmed'],
  priest_assigned: ['priest_assigned'],
  in_progress: ['in_progress'],
  completed: ['completed', 'video_uploaded', 'delivered'],
} as const satisfies Record<string, readonly BookingStatus[] | null>;

export type PriestBookingView = keyof typeof PRIEST_BOOKING_VIEWS;

/**
 * A paid, unassigned booking as an approved pandit sees it. No devotee identity
 * and no devotee-side price; `priestEarningInr` is the pandit's own take-home.
 */
export interface OpenRequest {
  id: string;
  bookingNumber: string | null;
  scheduledDate: Date;
  scheduledTimeSlot: string | null;
  devoteeCount: number;
  /** What this pandit is paid for the booking: the stored Commission.amount (puja fee x pandit share, platform fee excluded). */
  priestEarningInr: number;
  pujaName: string;
  templeName: string;
  city: string;
}

export interface PriestBookingsFilters {
  status?: BookingStatus;
  view?: PriestBookingView;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export type AssignedBookingResult =
  | { ok: true; booking: unknown }
  | { ok: false; reason: 'not_found' | 'forbidden' };

/**
 * One select shared by the list and the by-id read so the two can never drift.
 *
 * PF-10: `platformCommission` was missing, so the detail page's Price Breakdown
 * rendered "Platform Commission -₹NaN" — on the one screen where a pandit
 * checks what the platform takes. `rating`/`reviewText` were missing for the
 * same reason: the Devotee Review block could never render.
 */
const assignedBookingSelect = {
  id: true,
  bookingNumber: true,
  status: true,
  scheduledDate: true,
  scheduledTimeSlot: true,
  priceAmount: true,
  currency: true,
  platformCommission: true,
  priestPayout: true,
  devoteeNames: true,
  sankalpDetails: true,
  specialInstructions: true,
  videoProofUrl: true,
  videoUploadedAt: true,
  rating: true,
  reviewText: true,
  createdAt: true,
  temple: {
    select: { id: true, name: true, nameLocal: true, slug: true, city: true, state: true },
  },
  pujaType: {
    select: { id: true, name: true, nameLocal: true, slug: true, durationMinutes: true },
  },
  user: {
    select: { id: true, fullName: true, phone: true },
  },
} as const;

export interface PayoutFilters {
  status?: PayoutStatus;
  page?: number;
  limit?: number;
}

export interface UpdatePriestProfileInput {
  displayName?: string;
  bio?: string;
  specializations?: string[];
  languages?: string[];
  experienceYears?: number;
  avatarUrl?: string;
}

// ─── PriestService ──────────────────────────────────────────────────────────────

export class PriestService {
  private bookingService = new BookingService();

  /**
   * Get the priest record for a given userId.
   */
  private async getPriestByUserId(userId: string) {
    const priest = await prisma.priest.findUnique({
      where: { userId },
    });
    if (!priest) {
      throw new Error('Priest account not found.');
    }
    return priest;
  }

  /**
   * Get priest dashboard summary: earnings, booking counts, rating stats.
   */
  async getDashboard(priestId: string) {
    const priest = await prisma.priest.findUnique({
      where: { id: priestId },
      select: {
        id: true,
        displayName: true,
        ratingAvg: true,
        ratingCount: true,
        avatarUrl: true,
        // PF-14: the dashboard payload carried no on-duty state, so the portal's
        // instant-dispatch toggle initialised to `false` on every load. A pandit
        // who WAS in the pool saw "Go on duty", and switching himself off took
        // two clicks — the first of which sent isOnDuty:true and re-armed him
        // for 1-minute-SLA offers.
        isOnDuty: true,
        lastSeenAt: true,
      },
    });

    if (!priest) {
      throw new Error('Priest not found.');
    }

    // Earnings summary
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalEarnings, monthEarnings, pendingPayouts] = await Promise.all([
      prisma.priestPayout.aggregate({
        where: { priestId, status: 'completed' },
        _sum: { amount: true },
      }),
      prisma.priestPayout.aggregate({
        where: {
          priestId,
          status: 'completed',
          processedAt: { gte: firstOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.priestPayout.aggregate({
        where: { priestId, status: { in: ['pending', 'processing'] } },
        _sum: { amount: true },
      }),
    ]);

    // Booking counts
    const [totalBookings, upcomingBookings, completedBookings] = await Promise.all([
      prisma.pujaBooking.count({ where: { priestId } }),
      prisma.pujaBooking.count({
        where: {
          priestId,
          status: { in: ['confirmed', 'priest_assigned', 'in_progress'] },
          scheduledDate: { gte: now },
        },
      }),
      prisma.pujaBooking.count({
        where: {
          priestId,
          status: { in: ['completed', 'video_uploaded', 'delivered'] },
        },
      }),
    ]);

    // Upcoming bookings (next 5)
    const upcomingList = await prisma.pujaBooking.findMany({
      where: {
        priestId,
        status: { in: ['confirmed', 'priest_assigned', 'in_progress'] },
        scheduledDate: { gte: now },
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        devoteeNames: true,
        priceAmount: true,
        priestPayout: true,
        temple: { select: { id: true, name: true, city: true } },
        pujaType: { select: { id: true, name: true } },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 5,
    });

    return {
      priest: {
        id: priest.id,
        displayName: priest.displayName,
        avatarUrl: priest.avatarUrl,
        ratingAvg: priest.ratingAvg,
        ratingCount: priest.ratingCount,
        // PF-14: always present, never undefined — the client seeds its toggle
        // from this and a missing key is indistinguishable from "off".
        isOnDuty: priest.isOnDuty ?? false,
        lastSeenAt: priest.lastSeenAt ?? null,
      },
      earnings: {
        total: totalEarnings._sum.amount ?? 0,
        thisMonth: monthEarnings._sum.amount ?? 0,
        pending: pendingPayouts._sum.amount ?? 0,
      },
      bookings: {
        total: totalBookings,
        upcoming: upcomingBookings,
        completed: completedBookings,
      },
      upcomingBookings: upcomingList,
    };
  }

  /**
   * Get paginated bookings assigned to this priest with optional filters.
   */
  async getAssignedBookings(priestId: string, filters?: PriestBookingsFilters) {
    const { status, view, dateFrom, dateTo, page = 1, limit = 20 } = filters ?? {};

    // The tab counts must describe the pandit's whole book, not the page the
    // client happens to be looking at, so they are computed over this where
    // clause — everything except the status filter.
    const scopeWhere: Prisma.PujaBookingWhereInput = { priestId };

    if (dateFrom || dateTo) {
      scopeWhere.scheduledDate = {};
      if (dateFrom) {
        (scopeWhere.scheduledDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (scopeWhere.scheduledDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
      }
    }

    const where: Prisma.PujaBookingWhereInput = { ...scopeWhere };

    const viewStatuses = view ? PRIEST_BOOKING_VIEWS[view] : null;
    if (status) {
      where.status = status;
    } else if (viewStatuses) {
      where.status = { in: [...viewStatuses] };
    }

    const skip = (page - 1) * limit;

    const [bookings, total, grouped] = await Promise.all([
      prisma.pujaBooking.findMany({
        where,
        select: assignedBookingSelect,
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pujaBooking.count({ where }),
      prisma.pujaBooking.groupBy({
        by: ['status'],
        where: scopeWhere,
        _count: { _all: true },
      }),
    ]);

    const byStatus = new Map<string, number>();
    for (const row of (grouped ?? []) as Array<{ status: string; _count?: { _all?: number } }>) {
      byStatus.set(row.status, row._count?._all ?? 0);
    }
    const sumOf = (statuses: readonly BookingStatus[]) =>
      statuses.reduce((n, s) => n + (byStatus.get(s) ?? 0), 0);

    const counts = {
      all: [...byStatus.values()].reduce((n, v) => n + v, 0),
      confirmed: sumOf(PRIEST_BOOKING_VIEWS.confirmed),
      priest_assigned: sumOf(PRIEST_BOOKING_VIEWS.priest_assigned),
      in_progress: sumOf(PRIEST_BOOKING_VIEWS.in_progress),
      completed: sumOf(PRIEST_BOOKING_VIEWS.completed),
    };

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      counts,
    };
  }

  /**
   * PF-08: read ONE assigned booking.
   *
   * The detail page used to fetch the whole (20-row default) list and
   * `.find()` the id client-side, so every booking from row 21 down rendered
   * an empty shell — and that page holds the only video-proof control, so
   * those bookings could never be completed.
   */
  async getAssignedBookingById(priestId: string, bookingId: string): Promise<AssignedBookingResult> {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { ...assignedBookingSelect, priestId: true },
    });

    if (!booking) return { ok: false, reason: 'not_found' };
    if (booking.priestId !== priestId) return { ok: false, reason: 'forbidden' };

    const { priestId: _assigned, ...rest } = booking;
    void _assigned;
    // The page disables Start from these instead of letting the click fail.
    const startLockedMessage = pujaStartLockedMessage(rest.scheduledDate, rest.scheduledTimeSlot);
    return {
      ok: true,
      booking: {
        ...rest,
        startUnlocksAt: pujaStartUnlockAt(rest.scheduledDate, rest.scheduledTimeSlot).toISOString(),
        startLockedMessage,
      },
    };
  }

  /**
   * Priest accepts a booking — transitions status to priest_assigned.
   */
  /**
   * Paid bookings nobody has picked up yet: `confirmed`, no pandit, still ahead.
   *
   * The default dispatch tier is "scheduled" (T4), where the booking stays
   * `confirmed` and pandits self-pick. Until this existed there was nothing to
   * pick from: getAssignedBookings filters on `{ priestId }`, so an unassigned
   * booking was invisible to every pandit, and a customer who paid for a puja
   * waited on a pandit who could not see it.
   *
   * Only an approved, active pandit gets a list. It carries the minimum needed
   * to decide (puja, temple, date, slot, how many devotees, what the pandit
   * earns) and deliberately no devotee names, gotras, sankalp, address or
   * devotee-side price: those are released to the pandit who accepts, not to
   * every approved pandit on the platform.
   */
  async getOpenRequests(priestId: string, limit = 50) {
    const priest = await prisma.priest.findUnique({
      where: { id: priestId },
      select: { isVerified: true, status: true },
    });
    if (!priest || !priest.isVerified || priest.status !== 'active') {
      return { eligible: false as const, requests: [] as OpenRequest[] };
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const rows = await prisma.pujaBooking.findMany({
      where: { status: 'confirmed', priestId: null, scheduledDate: { gte: startOfToday } },
      orderBy: [{ scheduledDate: 'asc' }, { createdAt: 'asc' }],
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        devoteeNames: true,
        priestPayout: true,
        pujaType: { select: { name: true } },
        temple: { select: { name: true, city: true, state: true } },
      },
    });

    return {
      eligible: true as const,
      requests: rows.map((r): OpenRequest => ({
        id: r.id,
        bookingNumber: r.bookingNumber,
        scheduledDate: r.scheduledDate,
        scheduledTimeSlot: r.scheduledTimeSlot,
        devoteeCount: Array.isArray(r.devoteeNames) ? r.devoteeNames.length : 0,
        // `priestPayout` is exactly what acceptBooking mints into Commission.amount
        // (puja fee x pandit share, platform fee excluded); Decimal until the last step.
        priestEarningInr: new Prisma.Decimal(r.priestPayout ?? 0).toDecimalPlaces(2).toNumber(),
        pujaName: r.pujaType?.name ?? 'Puja',
        templeName: r.temple?.name ?? 'Temple',
        city: r.temple?.city ?? '',
      })),
    };
  }

  async acceptBooking(bookingId: string, priestId: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        priestId: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    // Either the priest is already assigned, or we assign them now
    if (booking.priestId && booking.priestId !== priestId) {
      throw new Error('This booking is assigned to a different priest.');
    }

    if (booking.status !== 'confirmed' && booking.status !== 'priest_assigned') {
      throw new Error(
        `Cannot accept booking in "${booking.status}" status. Booking must be in "confirmed" status.`
      );
    }

    // Taking an UNASSIGNED booking is a self-pick, so the picker must be an
    // approved, active pandit. A booking already assigned to this pandit (a
    // temple pinned them) was vetted when it was assigned and is not re-checked.
    if (!booking.priestId) {
      const picker = await prisma.priest.findUnique({
        where: { id: priestId },
        select: { isVerified: true, status: true },
      });
      if (!picker || !picker.isVerified || picker.status !== 'active') {
        throw new Error('Your pandit profile is not approved yet, so you cannot take new bookings.');
      }
    }

    // Double-booking guard: a priest can only hold one active booking per
    // (date, slot). Excludes the booking being accepted itself, and any
    // already-cancelled/refunded slots. DB schema does not enforce this
    // (TemplePriest is the only @@unique we have); the check lives here so
    // it covers the only path that writes priestId. If we ever add an
    // admin-assign path, gate it through this same method.
    const conflict = await prisma.pujaBooking.findFirst({
      where: {
        priestId,
        scheduledDate: booking.scheduledDate,
        scheduledTimeSlot: booking.scheduledTimeSlot,
        status: { notIn: ['cancelled', 'refunded'] },
        id: { not: bookingId },
      },
      select: { id: true, bookingNumber: true },
    });
    if (conflict) {
      throw new Error(
        `You already have another booking (${conflict.bookingNumber}) at this date and time slot.`
      );
    }

    // DI-05: the assignment and the earning mint are ONE transaction.
    //
    // This was a bare `prisma.pujaBooking.update`. Like the dispatch-accept
    // path it writes priestId + status:'priest_assigned' WITHOUT going through
    // booking.service.updateBookingStatus, so the re-mint gated on
    // EARNING_ATTACH_STATUSES never fired — even though 'priest_assigned' is in
    // that set and this is exactly the transition it was written for. A pandit
    // who accepted a booking in his OWN PORTAL ended up with no Commission and
    // no PriestPayout, and /priest/payouts told him he had earned nothing.
    //
    // Wrapped in a transaction so a mint can never commit against an assignment
    // that rolled back (money owed to nobody), and so the mint reads the
    // post-write row. All four guards live in provider-earning-mint.ts.
    // OPS-05: carried out of the transaction so the mint is recorded only once
    // the assignment is durable — recordMoneyEvent takes no `tx` on purpose.
    let mintOutcome = 'no-provider-on-booking';
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          priestId,
          status: 'priest_assigned',
        },
        include: {
          temple: { select: { id: true, name: true } },
          pujaType: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, phone: true } },
          priest: { select: { displayName: true } },
        },
      });

      // `include` returns every scalar, so priceAmount/priestPayout are on the
      // row without a second read. Tests that mock update() with a partial row
      // simply fall out at the mint's first guard rather than throwing.
      mintOutcome = await mintProviderEarningForBooking(tx, {
        id: row.id ?? bookingId,
        priestId: row.priestId ?? null,
        priceAmount: row.priceAmount ?? 0,
        priestPayout: row.priestPayout ?? 0,
      });

      return row;
    });

    // OPS-05: the pandit accepted in his own portal — the second of the two
    // DI-05 doors that used to leave him with no ledger row at all. Recorded
    // after the transaction commits; a no-op unless a row was actually minted.
    await recordProviderEarningMinted({
      bookingId,
      outcome: mintOutcome,
      rail: 'priest-portal-accept-booking',
      actorType: 'provider',
    });

    // D6: notify the devotee their pandit is confirmed. Push + WhatsApp are
    // both fire-and-forget — a notification failure must never fail the accept.
    // Optional-chained: tests mock update() without the user include.
    if (updated.user?.id) {
      void notifyUser(updated.user.id, {
        title: 'Pandit confirmed',
        body: `${updated.priest?.displayName ?? 'Your pandit'} will perform your ${updated.pujaType.name}.`,
        url: `/bookings/${updated.id}`,
      }).catch(() => undefined);
      void notifyDevotee('assigned', buildBookingCtx(updated as never)).catch(() => undefined);
    }

    return updated;
  }

  /**
   * P0 #pp-05 (2026-07-09): Priest rejects/declines an assigned booking.
   * Previously a priest could accept/start/complete but never release — a
   * booking stuck with an unwilling priest had no escape valve short of an
   * admin cancel. This transitions `priest_assigned` (or `confirmed` when the
   * priest was soft-assigned) back to `confirmed` with priestId cleared, so
   * the booking re-enters the assignment queue. In-progress/completed/cancelled
   * bookings refuse (irreversible). The devotee is notified via the existing
   * booking-event email path (caller-side, see route).
   */
  async rejectBooking(bookingId: string, priestId: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, priestId: true, userId: true, bookingNumber: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    // Only the assigned priest may reject. A confirmed-but-unassigned booking
    // has no priest to reject it — that's a queue/assignment concern.
    if (booking.priestId && booking.priestId !== priestId) {
      throw new Error('This booking is assigned to a different priest.');
    }

    if (
      booking.status !== 'priest_assigned' &&
      booking.status !== 'confirmed'
    ) {
      throw new Error(
        `Cannot reject a booking in "${booking.status}" status. Only assigned or confirmed bookings can be released.`
      );
    }

    // DI-05 residue: RELEASING a booking must void the earning it minted.
    //
    // `acceptBooking` above now mints a Commission the moment a pandit attaches
    // to a paid temple booking. This method is that transition's exact inverse
    // — and it used to write `priestId: null` while leaving the ledger alone,
    // so DI-05's own fix opened a hole DI-05's own screen then reported:
    //
    //   1. The releasing pandit kept a live PENDING Commission on a booking he
    //      walked away from. getPayoutBalance counts exactly
    //      { status: PENDING, payoutRequestId: null } as `availableInr`, so it
    //      was withdrawable via POST /payouts/request.
    //   2. The REPLACEMENT pandit was then paid by neither rail: the mint's
    //      guard 1 sees the stale row and bails 'already-on-unified-rail', and
    //      createPriestPayout refuses the sidecar row for the same reason. He
    //      does the puja and /priest/payouts answers him Rs 0.
    //
    // The two other detach paths already handle this — booking.service
    // .rescheduleBooking reverses, routes/bookings.ts PATCH re-points — and
    // this one had neither.
    //
    // REVERSE, never delete: a voided earning is an accounting event, and the
    // read surfaces already exclude REVERSED (routes/priest.ts unifiedBaseWhere,
    // payment.service.createPriestPayout), so the replacement pandit is payable
    // on either rail.
    //
    // Only the LEGACY rail is untouched here, and deliberately: PriestPayout is
    // written at video_uploaded/delivered, and this method refuses any status
    // past `priest_assigned`, so no sidecar row can exist yet.
    const hadPriest = Boolean(booking.priestId);

    const updated = await prisma.$transaction(async (tx) => {
      if (hadPriest) {
        // Money that has left, or is mid-transfer, cannot be voided by a
        // pandit clicking Release — refuse rather than half-apply, the same
        // call rescheduleBooking makes.
        //
        // Narrower than reschedule's predicate on purpose. That one blocks on
        // `status: { not: 'PENDING' }`, which also catches an ALREADY-REVERSED
        // row — void money, not settled money. A booking whose earning was
        // reversed by an earlier reschedule would then be permanently
        // un-releasable. Settled means PAID, or linked to a live PayoutRequest.
        const settled = await tx.commission.findFirst({
          where: {
            bookingId,
            OR: [{ status: 'PAID' }, { payoutRequestId: { not: null } }],
          },
          select: { id: true },
        });
        if (settled) {
          throw new Error(
            'This booking cannot be released: your earning for it has already been paid out or is inside a payout request. Please contact support.',
          );
        }

        await tx.commission.updateMany({
          where: { bookingId, status: 'PENDING', payoutRequestId: null },
          data: { status: 'REVERSED' },
        });
      }

      return tx.pujaBooking.update({
        where: { id: bookingId },
        data: {
          // Clear the assignment + drop back to confirmed so the assignment
          // queue can re-pick it. priestId null = unassigned.
          priestId: null,
          status: 'confirmed',
        },
        include: {
          temple: { select: { id: true, name: true } },
          pujaType: { select: { id: true, name: true } },
          user: { select: { id: true, fullName: true, phone: true } },
        },
      });
    });

    // D6: tell the devotee we're re-matching them (transparency beats silence).
    if (updated.user?.id) {
      void notifyUser(updated.user.id, {
        title: 'Re-assigning your pandit',
        body: `Your ${updated.pujaType.name} booking is being matched to another pandit. We'll confirm shortly.`,
        url: `/bookings/${updated.id}`,
      }).catch(() => undefined);
      void notifyDevotee('reassigned', buildBookingCtx(updated as never)).catch(() => undefined);
    }

    return updated;
  }

  /**
   * Priest starts the puja — transitions to in_progress.
   */
  async startPuja(bookingId: string, priestId: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, priestId: true, scheduledDate: true, scheduledTimeSlot: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.priestId !== priestId) {
      throw new Error('You are not assigned to this booking.');
    }

    // Starting early makes the earning payable for a puja that has not happened.
    const locked = pujaStartLockedMessage(booking.scheduledDate, booking.scheduledTimeSlot);
    if (locked) throw new PujaStateConflictError(locked);

    return this.bookingService.updateBookingStatus(bookingId, 'in_progress');
  }

  /**
   * Priest completes the puja — transitions to completed.
   */
  async completePuja(bookingId: string, priestId: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, priestId: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.priestId !== priestId) {
      throw new Error('You are not assigned to this booking.');
    }

    if (booking.status !== 'in_progress') {
      throw new PujaStateConflictError('Start the puja before marking it complete.');
    }

    return this.bookingService.updateBookingStatus(bookingId, 'completed');
  }

  /**
   * Priest uploads video proof — delegates to BookingService.
   *
   * PF-06 (prod sweep 2026-08-12): one exception. A booking already in
   * `video_uploaded` used to be un-fixable: BookingService.uploadVideoProof
   * only accepts `completed`, so a pandit who pasted a blank/junk URL (the
   * route accepted any non-empty string) got 400 on every retry, while the
   * delivery gate — which trims the stored value — refused to move the booking
   * to `delivered`. The booking was bricked: no video for the devotee, no
   * close-out, and support had to run curl. Live DB at the time of the sweep
   * held five such rows ("   ", "not-a-url-at-all", …).
   *
   * The replace path writes ONLY the proof URL and its server stamp. It does
   * not touch `status` (the transition already happened) and therefore does not
   * re-enter the payout hook — the earning was minted on the first upload and
   * createPriestPayout must not be invited to run twice.
   */
  async uploadVideoProof(bookingId: string, priestId: string, videoUrl: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true, priestId: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }
    if (booking.priestId !== priestId) {
      throw new Error('Only the assigned priest can upload video proof for this booking.');
    }

    if (booking.status === 'video_uploaded') {
      return prisma.pujaBooking.update({
        where: { id: bookingId },
        data: { videoProofUrl: videoUrl, videoUploadedAt: new Date() },
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          videoProofUrl: true,
          videoUploadedAt: true,
        },
      });
    }

    return this.bookingService.uploadVideoProof(bookingId, priestId, videoUrl);
  }

  /**
   * Get paginated payout history for a priest.
   */
  async getPayoutHistory(priestId: string, filters?: PayoutFilters) {
    const { status, page = 1, limit = 20 } = filters ?? {};

    const where: Prisma.PriestPayoutWhereInput = { priestId };

    if (status) {
      where.status = status;
    }

    const skip = (page - 1) * limit;

    const [payouts, total, summary] = await Promise.all([
      prisma.priestPayout.findMany({
        where,
        select: {
          id: true,
          amount: true,
          status: true,
          payoutMethod: true,
          payoutReference: true,
          processedAt: true,
          createdAt: true,
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              pujaType: { select: { name: true } },
              temple: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.priestPayout.count({ where }),
      // PF-12: this used to aggregate EVERY PriestPayout regardless of status
      // and label the result "Total Earned". The dashboard's earnings card
      // aggregates `completed` only, so the same pandit read Rs 2,310 earned on
      // /priest/payouts and Rs 0 on /priest — three pending rows presented as
      // money he had been paid. One definition, on both screens: earned means
      // settled. Pending is reported separately, below.
      prisma.priestPayout.aggregate({
        where: { priestId, status: 'completed' },
        _sum: { amount: true },
      }),
    ]);

    // Pending amount
    const pendingAgg = await prisma.priestPayout.aggregate({
      where: { priestId, status: { in: ['pending', 'processing'] } },
      _sum: { amount: true },
    });

    // Last completed payout
    const lastPayout = await prisma.priestPayout.findFirst({
      where: { priestId, status: 'completed' },
      orderBy: { processedAt: 'desc' },
      select: { amount: true, processedAt: true },
    });

    return {
      payouts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalEarned: summary._sum.amount ?? 0,
        pending: pendingAgg._sum.amount ?? 0,
        lastPayout: lastPayout
          ? { amount: lastPayout.amount, date: lastPayout.processedAt }
          : null,
      },
    };
  }

  /**
   * Get priest profile with temples and stats.
   */
  async getProfile(priestId: string) {
    const priest = await prisma.priest.findUnique({
      where: { id: priestId },
      include: {
        user: {
          select: {
            fullName: true,
            phone: true,
            email: true,
          },
        },
        temples: {
          include: {
            temple: {
              select: { id: true, name: true, city: true, state: true, slug: true },
            },
          },
        },
      },
    });

    if (!priest) {
      throw new Error('Priest not found.');
    }

    // Get aggregate stats
    const [totalBookings, completedBookings] = await Promise.all([
      prisma.pujaBooking.count({ where: { priestId } }),
      prisma.pujaBooking.count({
        where: { priestId, status: { in: ['completed', 'video_uploaded', 'delivered'] } },
      }),
    ]);

    return {
      id: priest.id,
      userId: priest.userId,
      displayName: priest.displayName,
      bio: priest.bio,
      avatarUrl: priest.avatarUrl,
      specializations: priest.specializations,
      languages: priest.languages,
      experienceYears: priest.experienceYears,
      aadhaarVerified: priest.aadhaarVerified,
      isVerified: priest.isVerified,
      verificationStatus: priest.verificationStatus,
      ratingAvg: priest.ratingAvg,
      ratingCount: priest.ratingCount,
      commissionRate: priest.commissionRate,
      status: priest.status,
      user: priest.user,
      temples: priest.temples.map((tp) => ({
        ...tp.temple,
        isPrimary: tp.isPrimary,
      })),
      stats: {
        totalBookings,
        completedBookings,
      },
      createdAt: priest.createdAt,
    };
  }

  /**
   * Update priest profile fields.
   */
  async updateProfile(priestId: string, data: UpdatePriestProfileInput) {
    const updateData: Prisma.PriestUpdateInput = {};

    if (data.displayName !== undefined) updateData.displayName = data.displayName;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.specializations !== undefined) updateData.specializations = data.specializations;
    if (data.languages !== undefined) updateData.languages = data.languages;
    if (data.experienceYears !== undefined) updateData.experienceYears = data.experienceYears;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    const updated = await prisma.priest.update({
      where: { id: priestId },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        specializations: true,
        languages: true,
        experienceYears: true,
        ratingAvg: true,
        ratingCount: true,
        isVerified: true,
        verificationStatus: true,
        updatedAt: true,
      },
      data: updateData,
    });

    return updated;
  }
}

export const priestService = new PriestService();
