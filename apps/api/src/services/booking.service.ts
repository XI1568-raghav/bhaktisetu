import { Prisma, BookingStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../routes/notifications.js';
import { ensureConversationForBooking } from './conversation.service.js';
import { paymentService } from './payment.service.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface CreateBookingInput {
  userId: string;
  templeId: string;
  pujaTypeId: string;
  templePujaOfferingId: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeSlot: string;
  devoteeNames: Array<{ name: string; gotra?: string; nakshatra?: string }>;
  sankalpDetails?: string;
  specialInstructions?: string;
  prasadDeliveryRequested: boolean;
  prasadDeliveryAddressId?: string;
  dispatchTier?: 'instant' | 'one_hour' | 'senior' | 'scheduled';
}

export interface UserBookingsFilters {
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

// P0 #PBO-3 (2026-07-09): fees that the booking wizard shows but previously
// never COLLECTED — the charged total was only the base puja price, so the
// ₹51 platform fee and the ₹150 prasad-delivery fee (when requested) leaked.
// These are the single source of truth for the amounts; the web price
// breakdown should mirror them. The Razorpay order is created from
// priceAmount (see /bookings/create-order), so folding the fees in here is
// what actually charges them at checkout.
export const PLATFORM_FEE_INR = 51;
export const PRASAD_DELIVERY_FEE_INR = 150;

// Booking revamp (2026-08-04): platform take-rate cut from 30% to 20% to win
// pandit supply. Research basis: Sri Mandir takes 20-25% from temples; the
// current hardcoded 30% (with Priest.commissionRate 0.70 ignored) is both
// uncompetitive for supply acquisition AND inconsistent. The pandit's
// Priest.commissionRate (their share, default 0.80) is now the source of truth,
// falling back to DEFAULT_PRIEST_SHARE when unset. Confirmed with founder.
export const DEFAULT_PRIEST_SHARE = 0.8;
export const DEFAULT_PLATFORM_SHARE = 0.2;

function pushMessageFor(
  status: BookingStatus,
  pujaName: string,
  templeName: string,
): { title: string; body: string } | null {
  switch (status) {
    case 'confirmed':
      return {
        title: 'Booking confirmed',
        body: `Your ${pujaName} at ${templeName} is confirmed. We'll send video proof after the puja.`,
      };
    case 'priest_assigned':
      return {
        title: 'Priest assigned',
        body: `A priest has been assigned for your ${pujaName} at ${templeName}.`,
      };
    case 'video_uploaded':
      return {
        title: 'Video proof ready',
        body: `Your ${pujaName} video is ready to view.`,
      };
    case 'cancelled':
      return {
        title: 'Booking cancelled',
        body: `Your ${pujaName} at ${templeName} has been cancelled.`,
      };
    default:
      return null;
  }
}

export interface SlotAvailability {
  time: string;
  booked: number;
  remaining: number;
  available: boolean;
}

// ─── Valid state transitions ────────────────────────────────────────────────────

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending_payment: ['confirmed', 'cancelled'],
  confirmed: ['priest_assigned', 'cancelled', 'refunded'],
  priest_assigned: ['in_progress', 'cancelled', 'refunded'],
  in_progress: ['completed', 'refunded'],
  completed: ['video_uploaded', 'refunded'],
  video_uploaded: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

// Statuses that allow cancellation by the user
const CANCELLABLE_STATUSES: BookingStatus[] = ['pending_payment', 'confirmed', 'priest_assigned'];

// ─── BookingService ─────────────────────────────────────────────────────────────

export class BookingService {
  /**
   * Generate a booking number in BS-YYYYMMDD-XXXXX format.
   */
  private generateBookingNumber(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let random = '';
    for (let i = 0; i < 5; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `BS-${yyyy}${mm}${dd}-${random}`;
  }

  /**
   * Create a new puja booking.
   * Validates offering, slot availability, calculates pricing, and persists.
   */
  async createBooking(data: CreateBookingInput) {
    // 0. Past-date guard. Zod at the route layer also enforces this, but
    // the service is reachable from cron/admin/test paths that bypass Zod,
    // so we re-check here. Compare against today at 00:00 local — same-day
    // bookings remain allowed.
    const requested = new Date(`${data.scheduledDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(requested.getTime()) || requested < today) {
      throw new Error('Cannot book a past date.');
    }

    // 1. Validate the temple puja offering exists and is active
    const offering = await prisma.templePujaOffering.findUnique({
      where: { id: data.templePujaOfferingId },
      include: {
        pujaType: true,
        temple: { select: { id: true, name: true } },
      },
    });

    if (!offering) {
      throw new Error('Temple puja offering not found.');
    }

    if (!offering.isActive) {
      throw new Error('This puja offering is currently inactive.');
    }

    // Verify temple and puja IDs match the offering
    if (offering.templeId !== data.templeId || offering.pujaTypeId !== data.pujaTypeId) {
      throw new Error('Offering does not match the specified temple and puja type.');
    }

    // 2. Validate the slot is one of the available slots for this offering
    const availableSlots = offering.availableSlots as string[];
    if (!availableSlots.includes(data.scheduledTimeSlot)) {
      throw new Error(
        `Invalid time slot "${data.scheduledTimeSlot}". Available slots: ${availableSlots.join(', ')}`,
      );
    }

    // 3. Check slot availability (count existing non-cancelled bookings)
    const scheduledDate = new Date(data.scheduledDate);
    const existingCount = await prisma.pujaBooking.count({
      where: {
        templePujaOfferingId: data.templePujaOfferingId,
        scheduledDate: scheduledDate,
        scheduledTimeSlot: data.scheduledTimeSlot,
        status: { notIn: ['cancelled', 'refunded'] },
      },
    });

    if (existingCount >= offering.maxBookingsPerSlot) {
      throw new Error(
        `No availability for the selected slot. Maximum ${offering.maxBookingsPerSlot} bookings allowed.`,
      );
    }

    // 4. Determine pricing
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { isNri: true },
    });

    if (!user) {
      throw new Error('User not found.');
    }

    const basePrice = offering.priceOverride ?? offering.pujaType.basePrice;
    const pujaPrice = user.isNri ? offering.pujaType.nriPrice : basePrice;

    // Resolve the priest's actual share. The booking may already have a priest
    // pinned (temple-pin / from-offering); when it does, read that priest's
    // commissionRate so per-pandit negotiated splits are honoured. Otherwise
    // fall back to the platform default (now 80% priest / 20% platform).
    let priestShare = DEFAULT_PRIEST_SHARE;
    const pinnedPriestId = offering.assignedPriestId ?? null;
    if (pinnedPriestId) {
      const priest = await prisma.priest.findUnique({
        where: { id: pinnedPriestId },
        select: { commissionRate: true },
      });
      if (priest && priest.commissionRate > 0 && priest.commissionRate <= 1) {
        priestShare = priest.commissionRate;
      }
    }

    // P0 #PBO-3 (2026-07-09): collect the platform + prasad fees shown in the
    // wizard. The charged total (priceAmount) is the puja price + platform fee
    // + prasad-delivery fee (when requested). Commission + priest payout are
    // computed on the PUJA price only — the fees are platform revenue / prasad
    // pass-through, not part of the priest's earned split.
    const platformFee = new Prisma.Decimal(PLATFORM_FEE_INR);
    const prasadFee = data.prasadDeliveryRequested
      ? new Prisma.Decimal(PRASAD_DELIVERY_FEE_INR)
      : new Prisma.Decimal(0);
    const priceAmount = new Prisma.Decimal(pujaPrice.toString()).add(platformFee).add(prasadFee);

    // Split on the PUJA price using the priest's actual share (default 80/20 —
    // see DEFAULT_PRIEST_SHARE). Platform keeps the remainder.
    const priestPayoutAmount = new Prisma.Decimal(pujaPrice.toString()).mul(
      new Prisma.Decimal(priestShare.toString()),
    );
    const platformCommission = new Prisma.Decimal(pujaPrice.toString()).mul(
      new Prisma.Decimal((1 - priestShare).toString()),
    );

    // 5. Generate booking number (retry on collision)
    let bookingNumber = this.generateBookingNumber();
    let attempts = 0;
    while (attempts < 5) {
      const existing = await prisma.pujaBooking.findUnique({
        where: { bookingNumber },
        select: { id: true },
      });
      if (!existing) break;
      bookingNumber = this.generateBookingNumber();
      attempts++;
    }
    if (attempts >= 5) {
      throw new Error('Failed to generate a unique booking number. Please try again.');
    }

    // 6. Validate prasad delivery address if requested
    if (data.prasadDeliveryRequested && data.prasadDeliveryAddressId) {
      const address = await prisma.userAddress.findFirst({
        where: {
          id: data.prasadDeliveryAddressId,
          userId: data.userId,
        },
        select: { id: true },
      });
      if (!address) {
        throw new Error('Prasad delivery address not found or does not belong to user.');
      }
    }

    // 7. Create the booking
    const booking = await prisma.pujaBooking.create({
      data: {
        bookingNumber,
        userId: data.userId,
        templeId: data.templeId,
        pujaTypeId: data.pujaTypeId,
        templePujaOfferingId: data.templePujaOfferingId,
        scheduledDate: scheduledDate,
        scheduledTimeSlot: data.scheduledTimeSlot,
        devoteeNames: data.devoteeNames as Prisma.InputJsonValue,
        sankalpDetails: data.sankalpDetails ?? null,
        specialInstructions: data.specialInstructions ?? null,
        priceAmount,
        currency: user.isNri ? 'USD' : 'INR',
        platformCommission,
        priestPayout: priestPayoutAmount,
        status: 'pending_payment',
        prasadDeliveryRequested: data.prasadDeliveryRequested,
        prasadDeliveryAddressId: data.prasadDeliveryAddressId ?? null,
        dispatchTier: data.dispatchTier ?? 'scheduled',
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        priceAmount: true,
        currency: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        createdAt: true,
      },
    });

    return booking;
  }

  /**
   * Transition a booking to a new status following the state machine rules.
   */
  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    data?: Record<string, any>,
  ) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: { id: true, status: true },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    const currentStatus = booking.status as BookingStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];

    if (!allowed || !allowed.includes(newStatus)) {
      throw new Error(`Invalid status transition from "${currentStatus}" to "${newStatus}".`);
    }

    // P0 #pp-01 (2026-07-09): defense-in-depth denylist. The route layer
    // already whitelists fields per-status, but this service is a shared
    // chokepoint (also called by priest.service paths), so strip the
    // financial/identity fields here too — they are server-authoritative and
    // must never be client-settable via a status PATCH.
    const FORBIDDEN_DATA_KEYS = new Set([
      'priestPayout',
      'platformCommission',
      'priceAmount',
      'userId',
      'priestId',
      'id',
    ]);
    const sanitizedData: Record<string, any> | undefined = data
      ? Object.fromEntries(Object.entries(data).filter(([k]) => !FORBIDDEN_DATA_KEYS.has(k)))
      : undefined;

    const updateData: Prisma.PujaBookingUpdateInput = {
      status: newStatus,
      ...(sanitizedData && Object.keys(sanitizedData).length > 0 ? sanitizedData : {}),
    };

    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        temple: { select: { id: true, name: true, slug: true } },
        pujaType: { select: { id: true, name: true, slug: true } },
        priest: { select: { id: true, displayName: true } },
        user: { select: { id: true } },
      },
    });

    // When a booking flips to confirmed, write a Commission ledger row so
    // /admin/commissions has a single source of truth for payout
    // reconciliation. Idempotent — guarded by findFirst on bookingId so a
    // double-confirm or webhook retry never double-writes.
    if (newStatus === 'confirmed') {
      try {
        const existing = await prisma.commission.findFirst({
          where: { bookingId: updated.id },
          select: { id: true },
        });
        if (!existing && updated.priestId) {
          const priceNum = Number(updated.priceAmount);
          const commissionNum = Number(updated.platformCommission);
          const percentage = priceNum > 0 ? commissionNum / priceNum : 0;
          await prisma.commission.create({
            data: {
              bookingId: updated.id,
              providerId: updated.priestId,
              amount: updated.platformCommission,
              percentage,
              status: 'PENDING',
            },
          });
        }
      } catch (err) {
        console.warn('[booking.service] commission write failed:', err);
      }
    }

    // P0 #pp-02 (2026-07-09): when a booking reaches video_uploaded/delivered,
    // write the PriestPayout row so the priest Earnings + Payouts dashboards
    // are not permanently ₹0. paymentService.createPriestPayout is idempotent
    // (guards on an existing payout + Aadhaar KYC) and only mints a row when
    // a priest is assigned — exactly the completion transitions it was built
    // for but never wired into. Fire-and-forget: a payout write failure must
    // never block the booking status flip (admin can reconcile from the
    // ledger). The commission row above already captured the platform cut at
    // confirm time; this is the priest's share.
    // Cross-cutting Phase 2: the TEMPLE's share of the puja. Until now a puja's
    // price split only into priest (80%) + platform (20%) — the temple got
    // nothing, the Harvard-documented "donation bypass". On confirm, record a
    // TemplePayout for the temple administration's cut so it can be settled to
    // the temple trust like any provider payout. Idempotent via findFirst.
    if (newStatus === 'confirmed') {
      try {
        const existingTemple = await prisma.templePayout.findFirst({
          where: { bookingId: updated.id },
          select: { id: true },
        });
        if (!existingTemple) {
          // Temple share from the platform's side: a slice of the puja price so
          // the temple is a first-class beneficiary, not just priest+platform.
          // TEMPLE_SHARE_RATE (default 5%) — kept small so priest+platform
          // economics are unaffected at the margin; tunable per deployment.
          const shareRate = Number(process.env.TEMPLE_SHARE_RATE ?? '0.05');
          const templeAmount = Math.round(Number(updated.priceAmount) * shareRate * 100) / 100;
          if (templeAmount > 0) {
            await prisma.templePayout.create({
              data: {
                templeId: updated.templeId,
                bookingId: updated.id,
                amount: templeAmount,
                status: 'pending',
              },
            });
          }
        }
      } catch (err) {
        console.warn('[booking.service] temple payout write failed:', err);
      }
    }

    if (newStatus === 'video_uploaded' || newStatus === 'delivered') {
      void paymentService
        .createPriestPayout(updated.id)
        .catch((err) => console.warn('[booking.service] priest payout write failed:', err));
    }

    // Push notification on key transitions. Fire-and-forget — push failure
    // must never break booking flow. notifyUser no-ops if VAPID is unset
    // or the user has no subscriptions.
    const message = pushMessageFor(newStatus, updated.pujaType.name, updated.temple.name);
    if (message) {
      void notifyUser(updated.user.id, {
        ...message,
        url: `/dashboard/bookings/${updated.id}`,
      }).catch(() => undefined);
    }

    // Auto-create the chat thread between devotee and assigned priest the
    // moment the priest is assigned. This is the post-payment service-delivery
    // handoff: devotee gets an inbox thread, priest sees it in their portal.
    if (newStatus === 'priest_assigned' && updated.priest) {
      const priestUser = await prisma.priest.findUnique({
        where: { id: updated.priest.id },
        select: { userId: true, displayName: true },
      });
      if (priestUser) {
        void ensureConversationForBooking({
          bookingId: updated.id,
          devoteeId: updated.user.id,
          providerId: priestUser.userId,
          kind: 'puja_booking',
          systemMessage: `Namaste! I'm ${priestUser.displayName}. I'll be performing your ${updated.pujaType.name} at ${updated.temple.name}. Feel free to share any sankalp details or questions here.`,
        }).catch((err) => {
          console.warn('[booking.service] ensureConversationForBooking failed:', err);
        });
      }
    }

    return updated;
  }

  /**
   * Cancel a booking on behalf of a user.
   * Validates ownership, cancellability, and the 24-hour window.
   */
  async cancelBooking(bookingId: string, userId: string, reason?: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        payments: {
          where: { status: 'captured' },
          select: { id: true, amount: true },
        },
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to cancel this booking.');
    }

    if (!CANCELLABLE_STATUSES.includes(booking.status as BookingStatus)) {
      throw new Error(`Booking cannot be cancelled in its current status "${booking.status}".`);
    }

    // Check 24-hour cancellation window (only if not pending_payment)
    if (booking.status !== 'pending_payment') {
      const scheduledDateTime = new Date(booking.scheduledDate);
      const now = new Date();
      const hoursUntilPuja = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilPuja < 24) {
        throw new Error('Cancellation is not allowed within 24 hours of the scheduled puja time.');
      }
    }

    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: reason ?? null,
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        cancelledAt: true,
        cancellationReason: true,
      },
    });

    // Return whether a refund is needed (payment was captured)
    const requiresRefund = booking.payments.length > 0;

    return {
      ...updated,
      requiresRefund,
      capturedPaymentId: requiresRefund ? booking.payments[0]!.id : null,
    };
  }

  /**
   * D7: Reschedule a booking to a new date (and optional new time slot).
   * Previously there was NO reschedule anywhere — grep for 'reschedul' across
   * apps/api returned zero matches; cancel+rebook was the only path, which both
   * loses the booking and forces a refund round-trip. Competitors (SmartPuja,
   * Aastha, Mangalnath) all offer reschedule precisely because it cuts
   * cancellations. Allowed from confirmed/priest_assigned, up to 24h before the
   * CURRENT scheduled slot. When a priest is already assigned we reset to
   * `confirmed` + clear priestId so the new slot re-enters the assignment queue
   * (the old priest may not be free at the new time).
   */
  async rescheduleBooking(
    bookingId: string,
    userId: string,
    newDate: Date,
    newTimeSlot?: string,
  ) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        priestId: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
      },
    });

    if (!booking) throw new Error('Booking not found.');
    if (booking.userId !== userId) {
      throw new Error('You are not authorized to reschedule this booking.');
    }
    if (booking.status !== 'confirmed' && booking.status !== 'priest_assigned') {
      throw new Error(
        `Booking cannot be rescheduled in its current status "${booking.status}".`
      );
    }

    // 24h notice window against the CURRENT slot (matches the cancel window).
    const hoursUntilCurrent =
      (new Date(booking.scheduledDate).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntilCurrent < 24) {
      throw new Error('Rescheduling is not allowed within 24 hours of the scheduled puja time.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      throw new Error('New date must be in the future.');
    }

    const hadPriest = !!booking.priestId;
    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        scheduledDate: newDate,
        ...(newTimeSlot ? { scheduledTimeSlot: newTimeSlot } : {}),
        // Re-queue if a priest was attached — they may not be free at the new time.
        ...(hadPriest ? { priestId: null, status: 'confirmed' } : {}),
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
      },
    });

    return { ...updated, requeuedForAssignment: hadPriest };
  }

  /**
   * Get a booking by ID with all related data.
   * Optionally verify ownership by userId.
   */
  async getBookingById(bookingId: string, userId?: string) {
    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      include: {
        temple: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            slug: true,
            city: true,
            state: true,
            images: true,
          },
        },
        pujaType: {
          select: {
            id: true,
            name: true,
            nameLocal: true,
            slug: true,
            description: true,
            category: true,
            deity: true,
            durationMinutes: true,
            images: true,
          },
        },
        priest: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
            ratingAvg: true,
            ratingCount: true,
            specializations: true,
          },
        },
        payments: {
          select: {
            id: true,
            amount: true,
            currency: true,
            status: true,
            paymentGateway: true,
            gatewayPaymentId: true,
            method: true,
            refundAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        prasadAddress: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (userId && booking.userId !== userId) {
      throw new Error('You are not authorized to view this booking.');
    }

    return booking;
  }

  /**
   * Get a paginated list of bookings for a user with optional filters.
   */
  async getUserBookings(userId: string, filters?: UserBookingsFilters) {
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = filters ?? {};

    const where: Prisma.PujaBookingWhereInput = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) {
        (where.scheduledDate as Prisma.DateTimeFilter).gte = new Date(dateFrom);
      }
      if (dateTo) {
        (where.scheduledDate as Prisma.DateTimeFilter).lte = new Date(dateTo);
      }
    }

    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.pujaBooking.findMany({
        where,
        select: {
          id: true,
          bookingNumber: true,
          status: true,
          scheduledDate: true,
          scheduledTimeSlot: true,
          priceAmount: true,
          currency: true,
          devoteeNames: true,
          videoProofUrl: true,
          rating: true,
          prasadDeliveryRequested: true,
          createdAt: true,
          temple: {
            select: {
              id: true,
              name: true,
              nameLocal: true,
              slug: true,
              city: true,
              state: true,
              images: true,
            },
          },
          pujaType: {
            select: {
              id: true,
              name: true,
              nameLocal: true,
              slug: true,
              deity: true,
              images: true,
            },
          },
          priest: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pujaBooking.count({ where }),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Upload video proof for a completed booking.
   * Only the assigned priest can upload.
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

    if (booking.status !== 'completed') {
      throw new Error(
        `Video proof can only be uploaded for bookings in "completed" status. Current: "${booking.status}".`,
      );
    }

    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        videoProofUrl: videoUrl,
        videoUploadedAt: new Date(),
        status: 'video_uploaded',
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        videoProofUrl: true,
        videoUploadedAt: true,
      },
    });

    return updated;
  }

  /**
   * Submit a review for a completed/delivered booking.
   * Updates both the booking and the priest's aggregate rating.
   */
  async submitReview(bookingId: string, userId: string, rating: number, reviewText?: string) {
    if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5.');
    }

    const booking = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        priestId: true,
        rating: true,
      },
    });

    if (!booking) {
      throw new Error('Booking not found.');
    }

    if (booking.userId !== userId) {
      throw new Error('You are not authorized to review this booking.');
    }

    if (!['delivered', 'video_uploaded'].includes(booking.status)) {
      throw new Error(
        `Reviews can only be submitted for bookings in "delivered" or "video_uploaded" status. Current: "${booking.status}".`,
      );
    }

    if (booking.rating !== null) {
      throw new Error('A review has already been submitted for this booking.');
    }

    // Update the booking with the review
    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        rating,
        reviewText: reviewText ?? null,
      },
      select: {
        id: true,
        bookingNumber: true,
        rating: true,
        reviewText: true,
      },
    });

    // Update the priest's aggregate rating atomically. The previous
    // read-modify-write (findUnique then update) raced under concurrent
    // reviews: two reviews both read ratingCount=5, both wrote 6, one
    // rating was lost. A single atomic SQL UPDATE with the running
    // average computed inside the statement serializes correctly.
    if (booking.priestId) {
      await prisma.$executeRawUnsafe(
        `UPDATE priests
         SET rating_count = rating_count + 1,
             rating_avg = ROUND(((rating_avg * rating_count) + $1::numeric) / (rating_count + 1), 2)
         WHERE id = $2::uuid`,
        rating,
        booking.priestId,
      );
    }

    return updated;
  }

  /**
   * Check slot availability for a specific temple, puja type, and date.
   * Returns each slot with booking counts and remaining capacity.
   */
  async checkSlotAvailability(templeId: string, pujaTypeId: string, date: string) {
    const offering = await prisma.templePujaOffering.findUnique({
      where: {
        templeId_pujaTypeId: {
          templeId,
          pujaTypeId,
        },
      },
      include: {
        temple: { select: { name: true, slug: true } },
        pujaType: { select: { name: true, slug: true, durationMinutes: true } },
      },
    });

    if (!offering || !offering.isActive) {
      return {
        available: false,
        message: 'This puja is not offered at the selected temple.',
        slots: [],
      };
    }

    const scheduledDate = new Date(date);

    // Count existing non-cancelled bookings per slot for the given date
    const existingBookings = await prisma.pujaBooking.groupBy({
      by: ['scheduledTimeSlot'],
      where: {
        templePujaOfferingId: offering.id,
        scheduledDate: scheduledDate,
        status: { notIn: ['cancelled', 'refunded'] },
      },
      _count: { id: true },
    });

    const bookingCountBySlot = new Map(
      existingBookings.map((b) => [b.scheduledTimeSlot, b._count.id]),
    );

    const slots: SlotAvailability[] = (offering.availableSlots as string[]).map((slot) => {
      const booked = bookingCountBySlot.get(slot) ?? 0;
      const remaining = offering.maxBookingsPerSlot - booked;
      return {
        time: slot,
        booked,
        remaining: Math.max(0, remaining),
        available: remaining > 0,
      };
    });

    const hasAvailableSlots = slots.some((s) => s.available);

    return {
      available: hasAvailableSlots,
      temple: offering.temple,
      pujaType: offering.pujaType,
      date,
      offeringId: offering.id,
      maxBookingsPerSlot: offering.maxBookingsPerSlot,
      slots,
    };
  }

  /**
   * SLA escalation (issue #179): bookings stuck `priest_assigned` more than
   * `staleHours` past their scheduled date with no `videoProofUrl` are a
   * broken service promise — the devotee paid, the priest never delivered
   * proof. Flag each for cancel + refund review.
   *
   * `BookingStatus` has no `refund_pending` member, so we cannot transition
   * the row to a literal "refund_pending" state within the enum. The
   * state machine already allows `priest_assigned -> cancelled` and
   * `* -> refunded`, so the honest, schema-safe action is: transition the
   * stale booking to `cancelled` (refund path) and return it in `escalated`
   * so ops/founder reviews the refund. Money movement itself is
   * founder/finance-adjacent and stays out of this service.
   *
   * Returns { escalated: string[], scanned: number }.
   */
  async escalateStaleBookings(staleHours = 72) {
    const cutoff = new Date(Date.now() - staleHours * 60 * 60 * 1000);
    const stale = await prisma.pujaBooking.findMany({
      where: {
        status: 'priest_assigned',
        videoProofUrl: null,
        scheduledDate: { lt: cutoff },
      },
      select: { id: true, scheduledDate: true, priestId: true },
    });

    const escalated: string[] = [];
    for (const b of stale) {
      // priest_assigned -> cancelled is a VALID_TRANSITION (refund review path).
      await prisma.pujaBooking.update({
        where: { id: b.id },
        data: { status: 'cancelled' },
      });
      escalated.push(b.id);
    }
    return { escalated, scanned: stale.length };
  }
}

export const bookingService = new BookingService();
