import { prisma } from '../lib/prisma.js';
import { notHiddenReviewWhere } from '../lib/review-moderation.js';
import { CauseQualityError, gaushalaQuality, qualityReasonsForEdit, templeQuality } from '../lib/cause-quality.js';
import { requireProviderApproval } from '../lib/provider-approval.js';
import { getLinkedTempleId, setTempleManagerLink } from './temple-manager-link.service.js';

/** Upper bound on approved cause profiles scanned per list call (quality filter runs in memory). */
const CAUSE_LIST_CAP = 500;

// ─── Types ──────────────────────────────────────────────────────────────────────

type ProviderTypeKey = 'pandit' | 'store' | 'astrologer' | 'wellness' | 'gaushala' | 'temple';

interface ProviderFilters {
  city?: string;
  specialty?: string;
  minRating?: number;
  sort?: string;
  page?: number;
  limit?: number;
  q?: string;
}

interface ProviderListResult {
  providers: Array<Record<string, unknown>>;
  total: number;
  page: number;
  limit: number;
}

interface ReviewInput {
  userId: string;
  providerId: string;
  providerType: string;
  rating: number;
  comment?: string;
}

// ─── Mock Provider Data ─────────────────────────────────────────────────────────

const MOCK_PANDITS = [
  {
    id: 'pandit-001',
    userId: 'user-002',
    templeName: 'Shri Kashi Vishwanath Seva',
    experience: 15,
    specialties: ['Satyanarayan Puja', 'Griha Pravesh', 'Navratri Puja', 'Wedding Rituals'],
    languages: ['Hindi', 'Sanskrit', 'English'],
    aadhaarVerified: true,
    rating: 4.9,
    totalPujas: 1200,
    pricePerPuja: 2100,
    bio: 'Pandit Raghunath comes from a family of Vedic scholars in Varanasi. 15 years of experience performing pujas across India and for NRI families worldwide.',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    approved: true,
  },
  {
    id: 'pandit-002',
    userId: 'user-020',
    templeName: null,
    experience: 8,
    specialties: ['Ganesh Puja', 'Lakshmi Puja', 'Rudrabhishek'],
    languages: ['Hindi', 'Marathi'],
    aadhaarVerified: true,
    rating: 4.7,
    totalPujas: 450,
    pricePerPuja: 1500,
    bio: 'Trained at Trimbakeshwar, specializing in Shiva-related rituals and planetary pujas.',
    city: 'Nashik',
    state: 'Maharashtra',
    approved: true,
  },
];

const MOCK_STORES = [
  {
    id: 'store-001',
    userId: 'user-003',
    storeName: 'Priya Sacred Store',
    gstNumber: '27AABCP1234A1ZS',
    city: 'Mumbai',
    state: 'Maharashtra',
    categories: ['Puja Samagri', 'Idols', 'Incense'],
    rating: 4.6,
    totalProducts: 85,
    totalOrders: 1200,
    approved: true,
    commission: 0.15,
  },
];

const MOCK_ASTROLOGERS = [
  {
    id: 'astro-001',
    userId: 'user-004',
    displayName: 'Jyotish Mehta',
    specialties: ['Vedic Astrology', 'Numerology', 'Gemstone Consultation'],
    experience: 12,
    languages: ['Hindi', 'English', 'Gujarati'],
    rating: 4.8,
    pricePerMinute: 15,
    totalConsultations: 3400,
    bio: 'Third-generation Vedic astrologer with expertise in kundli analysis and gemstone recommendations.',
    approved: true,
  },
];

const MOCK_WELLNESS = [
  {
    id: 'well-001',
    userId: 'user-005',
    displayName: 'Yoga Meera',
    specialties: ['Hatha Yoga', 'Pranayama', 'Meditation'],
    certifications: ['RYT-500', 'Bihar School of Yoga'],
    experience: 10,
    rating: 4.9,
    pricePerSession: 599,
    bio: 'Certified yoga instructor with a focus on traditional Hatha and breath work.',
    approved: true,
  },
];

const MOCK_GAUSHALAS = [
  {
    id: 'gau-001',
    userId: 'user-006',
    gaushalaName: 'Shri Gau Seva Dham',
    address: 'NH-48, Near Pushkar Road',
    city: 'Ajmer',
    totalCows: 350,
    verified: true,
    description: 'A certified gaushala caring for 350+ cows including rescued and abandoned cattle.',
    approved: true,
  },
];

const MOCK_TEMPLES = [
  {
    id: 'temple-001',
    userId: 'user-007',
    templeName: 'Shri Mahakaleshwar Temple',
    deity: 'Lord Shiva',
    city: 'Ujjain',
    state: 'Madhya Pradesh',
    description: 'One of the 12 Jyotirlingas. Managed temple profile for online darshan and puja bookings.',
    verified: true,
    totalStreams: 48,
    approved: true,
  },
];

const MOCK_MAP: Record<ProviderTypeKey, Array<Record<string, unknown>>> = {
  pandit: MOCK_PANDITS,
  store: MOCK_STORES,
  astrologer: MOCK_ASTROLOGERS,
  wellness: MOCK_WELLNESS,
  gaushala: MOCK_GAUSHALAS,
  temple: MOCK_TEMPLES,
};

// In-memory reviews storage for demo
const mockReviews: Array<{
  id: string;
  userId: string;
  providerId: string;
  providerType: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}> = [
  { id: 'rev-001', userId: 'user-001', providerId: 'pandit-001', providerType: 'PANDIT', rating: 5, comment: 'Exceptional puja. Panditji explained every step clearly.', createdAt: '2026-03-15T10:00:00Z' },
  { id: 'rev-002', userId: 'user-001', providerId: 'astro-001', providerType: 'ASTROLOGER', rating: 4, comment: 'Accurate reading, very helpful gemstone advice.', createdAt: '2026-03-20T10:00:00Z' },
];

// ─── Service ────────────────────────────────────────────────────────────────────

// P0 #PUB-01 / PUB-07 (2026-07-09): fields never exposed on PUBLIC provider
// listings/detail. userId (cross-table linkage), gstNumber, commission
// (internal payout rate), aadhaarVerified (internal KYC), availability
// (internal schedule), approved/approvedAt (internal state) all leak to
// logged-out users when full rows are returned. Stripped at the public
// service boundary so the underlying queries don't need per-type selects.
const PUBLIC_PROVIDER_DENYLIST = new Set([
  'userId',
  'gstNumber',
  'commission',
  'aadhaarVerified',
  'availability',
  'approved',
  'approvedAt',
  'createdAt',
  'updatedAt',
]);

function stripProviderPii<T extends Record<string, unknown>>(p: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    if (!PUBLIC_PROVIDER_DENYLIST.has(k)) out[k] = v;
  }
  return out;
}

export class ProviderService {
  async getProviders(type: ProviderTypeKey, filters: ProviderFilters): Promise<ProviderListResult> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    try {
      const result = await this.queryProviders(type, filters, page, limit);
      // Lazy-enrich each provider with aggregate rating fields and the
      // tier-relevant aadhaarVerified flag. We cannot reliably persist a
      // tier column without a schema migration, so badge tier is computed
      // on read by clients from these signals.
      const enriched = await Promise.all(
        result.providers.map((p) => this.enrichRatingFields(type, p)),
      );
      // Strip internal PII before returning to a public (logged-out) caller.
      return { ...result, providers: enriched.map(stripProviderPii) };
    } catch {
      return this.getMockProviders(type, filters, page, limit);
    }
  }

  /**
   * Backfill ratingAvg / ratingCount on a provider row so the response
   * shape is uniform regardless of which underlying profile model is
   * being queried (PanditProfile lacks separate ratingAvg/ratingCount,
   * but the global Review table is the source of truth anyway).
   */
  private async enrichRatingFields(
    type: ProviderTypeKey,
    p: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const id = p.id as string | undefined;
    if (!id) return p;
    let ratingAvg = typeof p.rating === 'number' ? (p.rating as number) : 0;
    let ratingCount = typeof p.totalPujas === 'number' ? (p.totalPujas as number) : 0;
    try {
      const providerTypeMap: Record<ProviderTypeKey, string> = {
        pandit: 'PANDIT',
        store: 'STORE',
        astrologer: 'ASTROLOGER',
        wellness: 'WELLNESS',
        gaushala: 'GAUSHALA',
        temple: 'TEMPLE',
      };
      const agg = await prisma.review.aggregate({
        where: {
          ...(await notHiddenReviewWhere()),
          providerId: id,
          providerType: providerTypeMap[type] as 'PANDIT' | 'STORE' | 'ASTROLOGER' | 'WELLNESS' | 'GAUSHALA' | 'TEMPLE',
        },
        _avg: { rating: true },
        _count: { _all: true },
      });
      if (agg._count._all > 0) {
        ratingAvg = Math.round((agg._avg.rating ?? 0) * 100) / 100;
        ratingCount = agg._count._all;
      }
    } catch {
      // Schema/connection missing — fall back to row-level fields.
    }
    return {
      ...p,
      ratingAvg,
      ratingCount,
      aadhaarVerified: typeof p.aadhaarVerified === 'boolean' ? p.aadhaarVerified : false,
    };
  }

  async getProviderById(type: ProviderTypeKey, id: string): Promise<Record<string, unknown> | null> {
    try {
      const provider = await this.queryProviderById(type, id);
      if (!provider) return null;

      // Fetch reviews
      const providerTypeMap: Record<ProviderTypeKey, string> = {
        pandit: 'PANDIT',
        store: 'STORE',
        astrologer: 'ASTROLOGER',
        wellness: 'WELLNESS',
        gaushala: 'GAUSHALA',
        temple: 'TEMPLE',
      };

      const reviews = await prisma.review.findMany({
        where: { ...(await notHiddenReviewWhere()), providerId: id, providerType: providerTypeMap[type] as 'PANDIT' | 'STORE' | 'ASTROLOGER' | 'WELLNESS' | 'GAUSHALA' | 'TEMPLE' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      const enriched = await this.enrichRatingFields(type, provider);
      // P0 #PUB-07 (2026-07-09): strip internal PII + only expose approved
      // providers on the public detail endpoint. Unapproved providers (pending/
      // rejected) are not reachable here — the approved-gate in queryProviderById
      // returns null → route 404s.
      if (provider && (provider as Record<string, unknown>).approved === false) return null;
      return { ...stripProviderPii(enriched as Record<string, unknown>), reviews };
    } catch {
      const mockList = MOCK_MAP[type] ?? [];
      const provider = mockList.find((p) => p.id === id) ?? null;
      if (!provider) return null;

      const reviews = mockReviews.filter((r) => r.providerId === id);
      return { ...provider, reviews };
    }
  }

  async updateProvider(type: ProviderTypeKey, id: string, userId: string, updates: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    try {
      const updated = await this.updateProviderProfile(type, id, userId, updates);
      return updated;
    } catch (err) {
      // A quality refusal is a real answer, not a DB outage: never fall back to the mock.
      if (err instanceof CauseQualityError) throw err;
      // Mock: return merged result
      const mockList = MOCK_MAP[type] ?? [];
      const provider = mockList.find((p) => p.id === id);
      if (!provider) return null;

      if (provider.userId !== userId) return null;

      return { ...provider, ...updates, updatedAt: new Date().toISOString() };
    }
  }

  async addReview(input: ReviewInput): Promise<{ review: Record<string, unknown>; message: string }> {
    try {
      const review = await prisma.review.create({
        data: {
          userId: input.userId,
          providerId: input.providerId,
          providerType: input.providerType as 'PANDIT' | 'STORE' | 'ASTROLOGER' | 'WELLNESS' | 'GAUSHALA' | 'TEMPLE',
          rating: input.rating,
          comment: input.comment ?? null,
        },
      });

      return {
        review: {
          id: review.id,
          rating: review.rating,
          comment: review.comment,
          createdAt: review.createdAt.toISOString(),
        },
        message: 'Review submitted',
      };
    } catch {
      const review = {
        id: `rev-${Date.now()}`,
        userId: input.userId,
        providerId: input.providerId,
        providerType: input.providerType,
        rating: input.rating,
        comment: input.comment ?? null,
        createdAt: new Date().toISOString(),
      };
      mockReviews.push(review);

      return { review, message: 'Review submitted (demo)' };
    }
  }

  // ─── Private: DB Queries ────────────────────────────────────────────────────

  private async queryProviders(type: ProviderTypeKey, filters: ProviderFilters, page: number, limit: number): Promise<ProviderListResult> {
    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = { approved: true };

    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.minRating) {
      where.rating = { gte: filters.minRating };
    }

    const orderBy: Record<string, string> = {};
    switch (filters.sort) {
      case 'rating':
        orderBy.rating = 'desc';
        break;
      case 'experience':
        orderBy.experience = 'desc';
        break;
      case 'price_asc':
        break; // handled per-type below
      case 'price_desc':
        break;
      default:
        orderBy.rating = 'desc';
    }

    switch (type) {
      case 'pandit': {
        if (filters.specialty) {
          where.specialties = { has: filters.specialty };
        }
        if (filters.q) {
          where.OR = [
            { templeName: { contains: filters.q, mode: 'insensitive' } },
            { bio: { contains: filters.q, mode: 'insensitive' } },
          ];
        }
        if (filters.sort === 'price_asc') orderBy.pricePerPuja = 'asc';
        if (filters.sort === 'price_desc') orderBy.pricePerPuja = 'desc';

        const [providers, total] = await Promise.all([
          prisma.panditProfile.findMany({ where, skip, take: limit, orderBy }),
          prisma.panditProfile.count({ where }),
        ]);
        return { providers, total, page, limit };
      }
      case 'store': {
        if (filters.q) {
          where.OR = [{ storeName: { contains: filters.q, mode: 'insensitive' } }];
        }
        const [providers, total] = await Promise.all([
          prisma.storeProfile.findMany({ where, skip, take: limit, orderBy }),
          prisma.storeProfile.count({ where }),
        ]);
        return { providers, total, page, limit };
      }
      case 'astrologer': {
        if (filters.specialty) {
          where.specialties = { has: filters.specialty };
        }
        if (filters.q) {
          where.OR = [
            { displayName: { contains: filters.q, mode: 'insensitive' } },
            { bio: { contains: filters.q, mode: 'insensitive' } },
          ];
        }
        if (filters.sort === 'price_asc') orderBy.pricePerMinute = 'asc';
        if (filters.sort === 'price_desc') orderBy.pricePerMinute = 'desc';

        const [providers, total] = await Promise.all([
          prisma.astrologerProfile.findMany({ where, skip, take: limit, orderBy }),
          prisma.astrologerProfile.count({ where }),
        ]);
        return { providers, total, page, limit };
      }
      case 'wellness': {
        if (filters.specialty) {
          where.specialties = { has: filters.specialty };
        }
        if (filters.q) {
          where.OR = [
            { displayName: { contains: filters.q, mode: 'insensitive' } },
            { bio: { contains: filters.q, mode: 'insensitive' } },
          ];
        }
        if (filters.sort === 'price_asc') orderBy.pricePerSession = 'asc';
        if (filters.sort === 'price_desc') orderBy.pricePerSession = 'desc';

        const [providers, total] = await Promise.all([
          prisma.wellnessProfile.findMany({ where, skip, take: limit, orderBy }),
          prisma.wellnessProfile.count({ where }),
        ]);
        return { providers, total, page, limit };
      }
      case 'gaushala': {
        if (filters.q) {
          where.OR = [
            { gaushalaName: { contains: filters.q, mode: 'insensitive' } },
            { description: { contains: filters.q, mode: 'insensitive' } },
          ];
        }
        // Quality filter (lib/cause-quality.ts): approved-but-junk causes are
        // hidden from the public list without deleting them. The bar is
        // word/length based so it cannot be expressed in `where`; the approved
        // set is small, so filter in memory and paginate after.
        const all = await prisma.gaushalaProfile.findMany({ where, orderBy: { totalCows: 'desc' }, take: CAUSE_LIST_CAP });
        const passing = all.filter((p) => gaushalaQuality(p).ok);
        return { providers: passing.slice(skip, skip + limit), total: passing.length, page, limit };
      }
      case 'temple': {
        if (filters.q) {
          where.OR = [
            { templeName: { contains: filters.q, mode: 'insensitive' } },
            { deity: { contains: filters.q, mode: 'insensitive' } },
          ];
        }
        const all = await prisma.templeProfile.findMany({ where, orderBy: { totalStreams: 'desc' }, take: CAUSE_LIST_CAP });
        const passing = all.filter((p) => templeQuality(p).ok);
        return { providers: passing.slice(skip, skip + limit), total: passing.length, page, limit };
      }
      default:
        return { providers: [], total: 0, page, limit };
    }
  }

  private async queryProviderById(type: ProviderTypeKey, id: string): Promise<Record<string, unknown> | null> {
    // P0 #PUB-07 (2026-07-09): approved-gate. The old findUnique({where:{id}})
    // returned the full row of an UNAPPROVED provider to any logged-out user
    // who guessed/obtained the UUID. Now findFirst with approved:true so
    // pending/rejected providers 404 on the public detail endpoint.
    switch (type) {
      case 'pandit':
        return (await prisma.panditProfile.findFirst({ where: { id, approved: true } })) as unknown as Record<string, unknown> | null;
      case 'store':
        return (await prisma.storeProfile.findFirst({ where: { id, approved: true } })) as unknown as Record<string, unknown> | null;
      case 'astrologer':
        return (await prisma.astrologerProfile.findFirst({ where: { id, approved: true } })) as unknown as Record<string, unknown> | null;
      case 'wellness':
        return (await prisma.wellnessProfile.findFirst({ where: { id, approved: true } })) as unknown as Record<string, unknown> | null;
      case 'gaushala': {
        const p = await prisma.gaushalaProfile.findFirst({ where: { id, approved: true } });
        return p && gaushalaQuality(p).ok ? (p as unknown as Record<string, unknown>) : null;
      }
      case 'temple': {
        const p = await prisma.templeProfile.findFirst({ where: { id, approved: true } });
        return p && templeQuality(p).ok ? (p as unknown as Record<string, unknown>) : null;
      }
      default:
        return null;
    }
  }

  private async updateProviderProfile(type: ProviderTypeKey, id: string, userId: string, updates: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    // Remove fields that shouldn't be updated by the provider
    const { approved, id: _id, userId: _uid, createdAt, ...safeUpdates } = updates;

    switch (type) {
      case 'pandit': {
        const existing = await prisma.panditProfile.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;
        const updated = await prisma.panditProfile.update({ where: { id }, data: safeUpdates as Record<string, unknown> });
        return updated as unknown as Record<string, unknown>;
      }
      case 'store': {
        const existing = await prisma.storeProfile.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;
        const updated = await prisma.storeProfile.update({ where: { id }, data: safeUpdates as Record<string, unknown> });
        return updated as unknown as Record<string, unknown>;
      }
      case 'astrologer': {
        const existing = await prisma.astrologerProfile.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;
        const updated = await prisma.astrologerProfile.update({ where: { id }, data: safeUpdates as Record<string, unknown> });
        return updated as unknown as Record<string, unknown>;
      }
      case 'wellness': {
        const existing = await prisma.wellnessProfile.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;
        const updated = await prisma.wellnessProfile.update({ where: { id }, data: safeUpdates as Record<string, unknown> });
        return updated as unknown as Record<string, unknown>;
      }
      case 'gaushala': {
        const existing = await prisma.gaushalaProfile.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;
        const failing = qualityReasonsForEdit('gaushala', existing, safeUpdates);
        if (failing) throw new CauseQualityError('GAUSHALA_MANAGER', failing);
        const updated = await prisma.gaushalaProfile.update({ where: { id }, data: safeUpdates as Record<string, unknown> });
        return updated as unknown as Record<string, unknown>;
      }
      case 'temple': {
        const existing = await prisma.templeProfile.findUnique({ where: { id } });
        if (!existing || existing.userId !== userId) return null;
        const failing = qualityReasonsForEdit('temple', existing, safeUpdates);
        if (failing) throw new CauseQualityError('TEMPLE_MANAGER', failing);
        const data: Record<string, unknown> = { ...safeUpdates };
        // With approval off a rename onto a catalogue temple links this manager to it directly (no admin step).
        const newName = typeof data.templeName === 'string' ? data.templeName.trim() : '';
        if (
          !requireProviderApproval() &&
          existing.approved &&
          newName &&
          newName.toLowerCase() !== (existing.templeName ?? '').trim().toLowerCase()
        ) {
          const clash = await prisma.temple.findFirst({
            where: { name: { equals: newName, mode: 'insensitive' } },
            select: { id: true },
          });
          if (clash && (await getLinkedTempleId(userId)) !== clash.id) await setTempleManagerLink(userId, clash.id);
        }
        const updated = await prisma.templeProfile.update({ where: { id }, data });
        return updated as unknown as Record<string, unknown>;
      }
      default:
        return null;
    }
  }

  private getMockProviders(type: ProviderTypeKey, filters: ProviderFilters, page: number, limit: number): ProviderListResult {
    let providers = [...(MOCK_MAP[type] ?? [])];

    if (filters.q) {
      const q = filters.q.toLowerCase();
      providers = providers.filter((p) => {
        const searchable = JSON.stringify(p).toLowerCase();
        return searchable.includes(q);
      });
    }

    if (filters.city) {
      providers = providers.filter((p) => {
        const city = (p.city as string) ?? '';
        return city.toLowerCase().includes(filters.city!.toLowerCase());
      });
    }

    if (filters.minRating) {
      providers = providers.filter((p) => (p.rating as number) >= filters.minRating!);
    }

    const total = providers.length;
    const start = (page - 1) * limit;

    return {
      providers: providers.slice(start, start + limit),
      total,
      page,
      limit,
    };
  }
}

export const providerService = new ProviderService();
