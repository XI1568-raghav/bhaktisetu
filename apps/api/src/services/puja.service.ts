import { Prisma, PujaCategory } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { cached, CACHE_TTL } from '../lib/cache.js';
import { clampLimit, clampPage } from '../lib/pagination.js';

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
      where.category = category as PujaCategory;
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

    // RES-12: `?page=-1` used to reach Prisma as a negative OFFSET and return
    // HTTP 500 "Failed to fetch puja types". A page is an ordinal — clamp it.
    const safePage = clampPage(page);
    const safeLimit = clampLimit(limit);
    const skip = (safePage - 1) * safeLimit;
    const cacheKey = `puja:list:${JSON.stringify({
      category: category ?? '',
      deity: deity ?? '',
      search: search ?? '',
      page: safePage,
      limit: safeLimit,
    })}`;

    return cached(cacheKey, CACHE_TTL.PUJA_LIST, async () => {
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
          take: safeLimit,
        }),
        prisma.pujaType.count({ where }),
      ]);

      return {
        pujaTypes,
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      };
    });
  }

  /**
   * Get a puja type by slug, including which temples offer it.
   */
  async findBySlug(slug: string) {
    return cached(`puja:slug:${slug}`, CACHE_TTL.PUJA_DETAIL, async () => {
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

      // Frontend (apps/web/app/pujas/[slug]/page.tsx and .../book/page.tsx)
      // expects each entry's `id` to be the offering id (so it can be sent as
      // `templeOfferingId` to /bookings/create-order), and reads
      // `templeName/templeSlug/templeCity/templeState`. We expose both shapes
      // — flat temple fields (legacy) plus the prefixed ones — so older
      // callers don't break. availableSlots is a string[] in DB; map to
      // [{time,label}] for the booking UI.
      const slotLabel = (slot: string): string => {
        const [hStr, mStr] = slot.split(':');
        const h = Number(hStr ?? 0);
        const m = Number(mStr ?? 0);
        const period = h < 12 ? 'AM' : 'PM';
        const h12 = h % 12 === 0 ? 12 : h % 12;
        const time12 = `${h12}:${String(m).padStart(2, '0')} ${period}`;
        const window = h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
        return `${window} (${time12})`;
      };

      return {
        ...pujaType,
        temples: pujaType.templeOfferings.map((o) => {
          const slots = (o.availableSlots as unknown);
          const slotArr: { time: string; label: string }[] = Array.isArray(slots)
            ? (slots as unknown[]).map((s) => {
                if (typeof s === 'string') return { time: s, label: slotLabel(s) };
                if (s && typeof s === 'object' && 'time' in (s as object)) {
                  const obj = s as { time: string; label?: string };
                  return { time: obj.time, label: obj.label ?? slotLabel(obj.time) };
                }
                return { time: String(s), label: String(s) };
              })
            : [];
          return {
            // booking page reads `id` as the offering id
            id: o.id,
            offeringId: o.id,
            availableSlots: slotArr,
            maxBookingsPerSlot: o.maxBookingsPerSlot,
            priceOverride: o.priceOverride,
            // prefixed shape the web uses
            templeId: o.temple.id,
            templeName: o.temple.name,
            templeNameLocal: o.temple.nameLocal,
            templeSlug: o.temple.slug,
            templeCity: o.temple.city,
            templeState: o.temple.state,
            templeImages: o.temple.images,
            isActive: o.isActive,
            isVerified: o.temple.isVerified,
            trustScore: o.temple.trustScore,
            liveDarshanEnabled: o.temple.liveDarshanEnabled,
            // legacy flat fields kept for any older consumer
            name: o.temple.name,
            nameLocal: o.temple.nameLocal,
            slug: o.temple.slug,
            city: o.temple.city,
            state: o.temple.state,
            images: o.temple.images,
          };
        }),
      };
    });
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
