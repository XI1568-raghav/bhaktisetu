import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireAnyRole } from '../middlewares/auth.js';
import { providerService } from '../services/provider.service.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const PROVIDER_TYPES = ['pandit', 'store', 'astrologer', 'wellness', 'gaushala', 'temple'] as const;
type ProviderTypeKey = typeof PROVIDER_TYPES[number];

// Frontend signup uses the longer role-enum names (store_owner,
// wellness_instructor, gaushala_manager, temple_manager). Map those to
// the canonical short keys above so the listing endpoint accepts both.
const PROVIDER_TYPE_ALIASES: Record<string, ProviderTypeKey> = {
  store_owner: 'store',
  wellness_instructor: 'wellness',
  gaushala_manager: 'gaushala',
  temple_manager: 'temple',
  priest: 'pandit',
};

const providerQuerySchema = z.object({
  city: z.string().optional(),
  specialty: z.string().optional(),
  minRating: z.string().optional(),
  sort: z.enum(['rating', 'experience', 'price_asc', 'price_desc']).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
  q: z.string().optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

// ─── PATCH allowlists (TC-09) ───────────────────────────────────────────────
//
// PATCH /providers/:type/:id used to hand `request.body` to
// providerService.updateProvider unvalidated. That service's only defence was
// destructuring four names away before spreading the rest into
// `prisma.<model>.update({ data })` — a denylist of four names guarding tables
// of twelve to eighteen columns. Everything it did not name was writable by
// the provider themselves:
//
//   PanditProfile.aadhaarVerified  the flag payout eligibility keys off
//   PanditProfile.rating / totalPujas       marketplace ranking inputs
//   StoreProfile.commission        the PLATFORM take rate that
//                                  store-commission.service.ts and
//                                  payment.service.ts read to split every
//                                  store order (default 0.20 = 20% platform)
//   GaushalaProfile.verified       the "personally verified" trust badge
//   TempleProfile.verified / totalStreams
//   AstrologerProfile.rating / totalConsultations
//
// The replacement is a per-type ALLOWLIST, `.strict()` so an unrecognised key
// is refused rather than silently dropped. The property that matters is the
// default: a column added to any of these models after today is NOT writable
// until someone deliberately adds it here. A denylist cannot have that
// property — it fails open for every column it does not yet know about.
//
// Trust, moderation and money columns are deliberately absent from every list.
// Approval and verification are admin.service.ts flows with their own audit
// trail (see admin.service.ts approveProvider paths); this route is the
// provider SELF-SERVICE surface and must not become a second, unaudited
// approval rail — which is why ADMIN gets no bypass here either.

const jsonValue = z.union([
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
  z.null(),
]);

const PROVIDER_PATCH_SCHEMAS: Record<ProviderTypeKey, z.ZodTypeAny> = {
  pandit: z
    .object({
      templeName: z.string().max(200).nullable().optional(),
      experience: z.number().int().min(0).max(100).optional(),
      specialties: z.array(z.string().max(120)).max(50).optional(),
      languages: z.array(z.string().max(60)).max(50).optional(),
      pricePerPuja: z.number().min(0).optional(),
      bio: z.string().max(5000).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      state: z.string().max(120).nullable().optional(),
      availability: jsonValue.optional(),
      availableForAntyeshti: z.boolean().optional(),
    })
    .strict(),
  store: z
    .object({
      storeName: z.string().min(1).max(200).optional(),
      gstNumber: z.string().max(32).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      state: z.string().max(120).nullable().optional(),
      categories: z.array(z.string().max(120)).max(50).optional(),
    })
    .strict(),
  astrologer: z
    .object({
      displayName: z.string().min(1).max(200).optional(),
      specialties: z.array(z.string().max(120)).max(50).optional(),
      experience: z.number().int().min(0).max(100).optional(),
      languages: z.array(z.string().max(60)).max(50).optional(),
      pricePerMinute: z.number().min(0).optional(),
      bio: z.string().max(5000).nullable().optional(),
      availability: jsonValue.optional(),
    })
    .strict(),
  wellness: z
    .object({
      displayName: z.string().min(1).max(200).optional(),
      specialties: z.array(z.string().max(120)).max(50).optional(),
      certifications: z.array(z.string().max(200)).max(50).optional(),
      experience: z.number().int().min(0).max(100).optional(),
      pricePerSession: z.number().min(0).optional(),
      bio: z.string().max(5000).nullable().optional(),
    })
    .strict(),
  gaushala: z
    .object({
      gaushalaName: z.string().min(1).max(200).optional(),
      address: z.string().max(500).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      totalCows: z.number().int().min(0).max(100000).optional(),
      description: z.string().max(5000).nullable().optional(),
    })
    .strict(),
  temple: z
    .object({
      templeName: z.string().min(1).max(200).optional(),
      deity: z.string().max(120).nullable().optional(),
      city: z.string().max(120).nullable().optional(),
      state: z.string().max(120).nullable().optional(),
      address: z.string().max(500).nullable().optional(),
      description: z.string().max(5000).nullable().optional(),
    })
    .strict(),
};

const PROVIDER_ROLE_MAP: Record<ProviderTypeKey, string> = {
  pandit: 'PANDIT',
  store: 'STORE_OWNER',
  astrologer: 'ASTROLOGER',
  wellness: 'WELLNESS_INSTRUCTOR',
  gaushala: 'GAUSHALA_MANAGER',
  temple: 'TEMPLE_MANAGER',
};

function isValidProviderType(type: string): type is ProviderTypeKey {
  return PROVIDER_TYPES.includes(type as ProviderTypeKey);
}

function normaliseProviderType(type: string): ProviderTypeKey | null {
  if (isValidProviderType(type)) return type;
  return PROVIDER_TYPE_ALIASES[type] ?? null;
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function providerRoutes(server: FastifyInstance) {

  // ─── GET /providers/:type — List providers by type ──────────────────────────

  server.get('/:type', async (request, reply) => {
    const { type } = request.params as { type: string };

    const canonicalType = normaliseProviderType(type);
    if (!canonicalType) {
      return reply.code(400).send({
        error: `Invalid provider type: ${type}`,
        validTypes: PROVIDER_TYPES,
      });
    }

    const query = request.query as Record<string, string | undefined>;
    const parsed = providerQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    }

    const result = await providerService.getProviders(canonicalType, {
      city: parsed.data.city,
      specialty: parsed.data.specialty,
      minRating: parsed.data.minRating ? Number(parsed.data.minRating) : undefined,
      sort: parsed.data.sort,
      page: parsed.data.page ? Number(parsed.data.page) : undefined,
      limit: parsed.data.limit ? Number(parsed.data.limit) : undefined,
      q: parsed.data.q,
    });

    return result;
  });

  // ─── GET /providers/:type/:id — Provider detail ────────────────────────────

  server.get('/:type/:id', async (request, reply) => {
    const { type, id } = request.params as { type: string; id: string };

    const canonicalType = normaliseProviderType(type);
    if (!canonicalType) {
      return reply.code(400).send({
        error: `Invalid provider type: ${type}`,
        validTypes: PROVIDER_TYPES,
      });
    }

    const provider = await providerService.getProviderById(canonicalType, id);

    if (!provider) {
      return reply.code(404).send({ error: `${canonicalType} provider not found` });
    }

    return { provider };
  });

  // ─── PATCH /providers/:type/:id — Update own profile ───────────────────────

  server.patch(
    '/:type/:id',
    {
      preHandler: [
        authenticateUser,
        requireAnyRole('PANDIT', 'STORE_OWNER', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER', 'ADMIN'),
      ],
    },
    async (request, reply) => {
      const { type, id } = request.params as { type: string; id: string };

      const canonicalType = normaliseProviderType(type);
      if (!canonicalType) {
        return reply.code(400).send({
          error: `Invalid provider type: ${type}`,
          validTypes: PROVIDER_TYPES,
        });
      }

      const userId = request.currentUser!.id;
      const userRoles = request.currentUser!.roles;
      const requiredRole = PROVIDER_ROLE_MAP[canonicalType];

      // Must own this provider type or be admin
      if (!userRoles.includes(requiredRole as typeof userRoles[number]) && !userRoles.includes('ADMIN')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `You need the ${requiredRole} role to update a ${canonicalType} profile`,
        });
      }

      // TC-09: validate against the per-type allowlist BEFORE anything reaches
      // the service. `.strict()` means an unrecognised or privileged key is a
      // 400, not a silent drop — the caller learns their write was refused
      // instead of believing it landed.
      const parsedBody = PROVIDER_PATCH_SCHEMAS[canonicalType].safeParse(request.body);
      if (!parsedBody.success) {
        return reply.code(400).send({
          error: 'Invalid profile update',
          message:
            'Only your own editable profile fields may be updated here. Verification, approval, ratings, activity counts and commission rates are not self-service.',
          details: parsedBody.error.flatten(),
        });
      }

      const body = parsedBody.data as Record<string, unknown>;
      if (Object.keys(body).length === 0) {
        return reply.code(400).send({ error: 'Invalid profile update', message: 'No updatable fields supplied.' });
      }

      const result = await providerService.updateProvider(canonicalType, id, userId, body);

      if (!result) {
        return reply.code(404).send({ error: 'Provider not found or you do not own this profile' });
      }

      return { message: 'Profile updated', provider: result };
    }
  );

  // ─── POST /providers/:type/:id/review — Add review ─────────────────────────

  server.post(
    '/:type/:id/review',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const { type, id } = request.params as { type: string; id: string };

      const canonicalType = normaliseProviderType(type);
      if (!canonicalType) {
        return reply.code(400).send({
          error: `Invalid provider type: ${type}`,
          validTypes: PROVIDER_TYPES,
        });
      }

      const body = request.body as Record<string, unknown>;
      const parsed = reviewSchema.safeParse(body);

      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid review data. Required: { rating: 1-5, comment?: string }',
          details: parsed.error.flatten(),
        });
      }

      const userId = request.currentUser!.id;
      const providerType = PROVIDER_ROLE_MAP[canonicalType].replace('_OWNER', '').replace('_INSTRUCTOR', '').replace('_MANAGER', '');

      const result = await providerService.addReview({
        userId,
        providerId: id,
        providerType,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      });

      return reply.code(201).send(result);
    }
  );
}
