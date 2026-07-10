import { Prisma, BookingStatus, PayoutStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { BookingService } from './booking.service.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface PriestBookingsFilters {
  status?: BookingStatus;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

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
    const { status, dateFrom, dateTo, page = 1, limit = 20 } = filters ?? {};

    const where: Prisma.PujaBookingWhereInput = { priestId };

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
          priestPayout: true,
          devoteeNames: true,
          sankalpDetails: true,
          specialInstructions: true,
          videoProofUrl: true,
          videoUploadedAt: true,
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
   * Priest accepts a booking — transitions status to priest_assigned.
   */
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

    const updated = await prisma.pujaBooking.update({
      where: { id: bookingId },
      data: {
        priestId,
        status: 'priest_assigned',
      },
      include: {
        temple: { select: { id: true, name: true } },
        pujaType: { select: { id: true, name: true } },
      },
    });

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

    const updated = await prisma.pujaBooking.update({
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
      },
    });

    return updated;
  }

  /**
   * Priest starts the puja — transitions to in_progress.
   */
  async startPuja(bookingId: string, priestId: string) {
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

    return this.bookingService.updateBookingStatus(bookingId, 'completed');
  }

  /**
   * Priest uploads video proof — delegates to BookingService.
   */
  async uploadVideoProof(bookingId: string, priestId: string, videoUrl: string) {
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
      prisma.priestPayout.aggregate({
        where: { priestId },
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
