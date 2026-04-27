import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

export interface TempleListParams {
  city?: string;
  state?: string;
  tradition?: string;
  deity?: string;
  search?: string;
  isVerified?: boolean;
  liveDarshan?: boolean;
  page?: number;
  limit?: number;
}

export class TempleService {
  /**
   * Paginated list of temples with filters.
   */
  async findAll(params: TempleListParams) {
    const {
      city,
      state,
      tradition,
      deity,
      search,
      isVerified,
      liveDarshan,
      page = 1,
      limit = 20,
    } = params;

    const where: Prisma.TempleWhereInput = {
      status: 'active',
    };

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }
    if (state) {
      where.state = { equals: state, mode: 'insensitive' };
    }
    if (tradition) {
      where.tradition = tradition as any;
    }
    if (deity) {
      where.deityPrimary = { contains: deity, mode: 'insensitive' };
    }
    if (isVerified !== undefined) {
      where.isVerified = isVerified;
    }
    if (liveDarshan !== undefined) {
      where.liveDarshanEnabled = liveDarshan;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { deityPrimary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [temples, total] = await Promise.all([
      prisma.temple.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameLocal: true,
          slug: true,
          description: true,
          deityPrimary: true,
          deities: true,
          tradition: true,
          city: true,
          state: true,
          lat: true,
          lng: true,
          images: true,
          timingInfo: true,
          isVerified: true,
          trustScore: true,
          liveDarshanEnabled: true,
        },
        orderBy: [{ trustScore: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.temple.count({ where }),
    ]);

    return {
      temples,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single temple by slug with related data.
   */
  async findBySlug(slug: string) {
    const temple = await prisma.temple.findUnique({
      where: { slug },
      include: {
        priests: {
          include: {
            priest: {
              select: {
                id: true,
                displayName: true,
                specializations: true,
                languages: true,
                experienceYears: true,
                ratingAvg: true,
                ratingCount: true,
                bio: true,
                avatarUrl: true,
                isVerified: true,
              },
            },
          },
          orderBy: { isPrimary: 'desc' },
        },
        pujaOfferings: {
          where: { isActive: true },
          include: {
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
                basePrice: true,
                nriPrice: true,
                samagriIncluded: true,
                images: true,
              },
            },
          },
        },
        darshanStream: {
          where: { status: { not: 'offline' } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return temple;
  }

  /**
   * Find temples near a given coordinate using the Haversine formula.
   * Uses raw SQL for the geospatial computation.
   */
  async findNearby(lat: number, lng: number, radiusKm: number = 25) {
    // Postgres rejects HAVING without GROUP BY, so the distance filter
    // lives on an outer SELECT over a subquery that exposes the computed
    // distance_km. Also clamps to non-null lat/lng — temples without
    // coordinates can't be ranked geographically and would crash acos().
    const temples = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        name_local: string | null;
        slug: string;
        deity_primary: string;
        tradition: string;
        city: string;
        state: string;
        lat: number;
        lng: number;
        images: any;
        is_verified: boolean;
        trust_score: number;
        live_darshan_enabled: boolean;
        distance_km: number;
      }>
    >`
      SELECT * FROM (
        SELECT
          id, name, name_local, slug, deity_primary, tradition,
          city, state, lat, lng, images, is_verified, trust_score,
          live_darshan_enabled,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians(${lat})) * cos(radians(lat))
                * cos(radians(lng) - radians(${lng}))
                + sin(radians(${lat})) * sin(radians(lat))
              ))
            )
          ) AS distance_km
        FROM temples
        WHERE status = 'active'
          AND lat IS NOT NULL
          AND lng IS NOT NULL
      ) AS t
      WHERE distance_km <= ${radiusKm}
      ORDER BY distance_km ASC
      LIMIT 50
    `;

    // Normalize the snake_case SQL results to camelCase
    return temples.map((t) => ({
      id: t.id,
      name: t.name,
      nameLocal: t.name_local,
      slug: t.slug,
      deityPrimary: t.deity_primary,
      tradition: t.tradition,
      city: t.city,
      state: t.state,
      lat: t.lat,
      lng: t.lng,
      images: t.images,
      isVerified: t.is_verified,
      trustScore: t.trust_score,
      liveDarshanEnabled: t.live_darshan_enabled,
      distanceKm: Number(t.distance_km.toFixed(2)),
    }));
  }

  /**
   * Full-text search across temple name, description, city, and deity.
   */
  async search(query: string, page: number = 1, limit: number = 20) {
    if (!query || query.trim().length === 0) {
      return { results: [], total: 0, query, page, limit };
    }

    const where: Prisma.TempleWhereInput = {
      status: 'active',
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { city: { contains: query, mode: 'insensitive' } },
        { state: { contains: query, mode: 'insensitive' } },
        { deityPrimary: { contains: query, mode: 'insensitive' } },
      ],
    };

    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      prisma.temple.findMany({
        where,
        select: {
          id: true,
          name: true,
          nameLocal: true,
          slug: true,
          deityPrimary: true,
          tradition: true,
          city: true,
          state: true,
          images: true,
          isVerified: true,
          trustScore: true,
          liveDarshanEnabled: true,
        },
        orderBy: [{ trustScore: 'desc' }, { name: 'asc' }],
        skip,
        take: limit,
      }),
      prisma.temple.count({ where }),
    ]);

    return {
      results,
      total,
      query,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get reviews for a temple (from completed bookings that have ratings).
   */
  async getReviews(templeSlug: string, page: number = 1, limit: number = 10) {
    const temple = await prisma.temple.findUnique({
      where: { slug: templeSlug },
      select: { id: true },
    });

    if (!temple) {
      return null;
    }

    const where: Prisma.PujaBookingWhereInput = {
      templeId: temple.id,
      rating: { not: null },
    };

    const skip = (page - 1) * limit;

    const [reviews, total, avgResult] = await Promise.all([
      prisma.pujaBooking.findMany({
        where,
        select: {
          id: true,
          rating: true,
          reviewText: true,
          createdAt: true,
          user: {
            select: {
              fullName: true,
              avatarUrl: true,
              locationCity: true,
              locationState: true,
            },
          },
          pujaType: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.pujaBooking.count({ where }),
      prisma.pujaBooking.aggregate({
        where,
        _avg: { rating: true },
      }),
    ]);

    return {
      reviews,
      total,
      averageRating: avgResult._avg.rating ?? 0,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pujas available at a specific temple (by slug).
   */
  async getTemplePujas(templeSlug: string) {
    const temple = await prisma.temple.findUnique({
      where: { slug: templeSlug },
      select: { id: true, name: true, slug: true },
    });

    if (!temple) {
      return null;
    }

    const offerings = await prisma.templePujaOffering.findMany({
      where: {
        templeId: temple.id,
        isActive: true,
      },
      include: {
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
            basePrice: true,
            nriPrice: true,
            samagriIncluded: true,
            images: true,
          },
        },
      },
    });

    return {
      temple,
      pujas: offerings.map((o) => ({
        offeringId: o.id,
        availableSlots: o.availableSlots,
        maxBookingsPerSlot: o.maxBookingsPerSlot,
        priceOverride: o.priceOverride,
        ...o.pujaType,
      })),
    };
  }
}

export const templeService = new TempleService();
