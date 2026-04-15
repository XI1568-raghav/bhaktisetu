import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface PujaListParams {
  category?: string;
  deity?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PujaService {
  /**
   * List all puja types with optional filters.
   */
  async findAllTypes(params: PujaListParams) {
    const { category, deity, search, page = 1, limit = 20 } = params;

    const where: Prisma.PujaTypeWhereInput = {
      isActive: true,
    };

    if (category) {
      where.category = category as any;
    }
    if (deity) {
      where.deity = { contains: deity, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { deity: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [pujaTypes, total] = await Promise.all([
      prisma.pujaType.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameLocal: true,
          slug: true,
          description: true,
          category: true,
          deity: true,
          durationMinutes: true,
          basePrice: true,
          nriPrice: true,
          samagriIncluded: true,
          images: true,
          sortOrder: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.pujaType.count({ where }),
    ]);

    return {
      pujaTypes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a puja type by slug, including which temples offer it.
   */
  async findBySlug(slug: string) {
    const pujaType = await prisma.pujaType.findUnique({
      where: { slug },
      include: {
        templeOfferings: {
          where: { isActive: true },
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
                isVerified: true,
                trustScore: true,
                liveDarshanEnabled: true,
              },
            },
          },
        },
      },
    });

    if (!pujaType) {
      return null;
    }

    return {
      ...pujaType,
      temples: pujaType.templeOfferings.map((o) => ({
        offeringId: o.id,
        availableSlots: o.availableSlots,
        maxBookingsPerSlot: o.maxBookingsPerSlot,
        priceOverride: o.priceOverride,
        ...o.temple,
      })),
    };
  }

  /**
   * Check availability for a puja at a specific temple on a given date.
   * Counts existing confirmed bookings per slot and reports remaining capacity.
   */
  async checkAvailability(templeId: string, pujaTypeId: string, date: string) {
    // Find the offering configuration
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

    // Count existing bookings per slot for the given date
    const existingBookings = await prisma.pujaBooking.groupBy({
      by: ['scheduledTimeSlot'],
      where: {
        templePujaOfferingId: offering.id,
        scheduledDate: scheduledDate,
        status: {
          notIn: ['cancelled', 'refunded'],
        },
      },
      _count: { id: true },
    });

    const bookingCountBySlot = new Map(
      existingBookings.map((b) => [b.scheduledTimeSlot, b._count.id])
    );

    const slots = (offering.availableSlots as string[]).map((slot) => {
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
   * Get the most popular pujas based on booking count.
   */
  async getPopular(limit: number = 10) {
    // Aggregate bookings by puja type (only completed/delivered ones)
    const bookingCounts = await prisma.pujaBooking.groupBy({
      by: ['pujaTypeId'],
      where: {
        status: {
          in: ['completed', 'delivered', 'video_uploaded'],
        },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    if (bookingCounts.length === 0) {
      // Fallback: return pujas sorted by sortOrder if no bookings exist yet
      const pujaTypes = await prisma.pujaType.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          nameLocal: true,
          slug: true,
          description: true,
          category: true,
          deity: true,
          durationMinutes: true,
          basePrice: true,
          nriPrice: true,
          images: true,
          _count: {
            select: {
              templeOfferings: { where: { isActive: true } },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        take: limit,
      });

      return pujaTypes.map((p) => ({
        ...p,
        bookingCount: 0,
        templeCount: p._count.templeOfferings,
      }));
    }

    const pujaTypeIds = bookingCounts.map((b) => b.pujaTypeId);
    const pujaTypes = await prisma.pujaType.findMany({
      where: { id: { in: pujaTypeIds }, isActive: true },
      select: {
        id: true,
        name: true,
        nameLocal: true,
        slug: true,
        description: true,
        category: true,
        deity: true,
        durationMinutes: true,
        basePrice: true,
        nriPrice: true,
        images: true,
        _count: {
          select: {
            templeOfferings: { where: { isActive: true } },
          },
        },
      },
    });

    const pujaMap = new Map(pujaTypes.map((p) => [p.id, p]));
    const countMap = new Map(
      bookingCounts.map((b) => [b.pujaTypeId, b._count.id])
    );

    return pujaTypeIds
      .filter((id) => pujaMap.has(id))
      .map((id) => {
        const puja = pujaMap.get(id)!;
        return {
          ...puja,
          bookingCount: countMap.get(id) ?? 0,
          templeCount: puja._count.templeOfferings,
        };
      });
  }
}

export const pujaService = new PujaService();
