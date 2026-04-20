import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireAnyRole } from '../middlewares/auth.js';
import { providerService } from '../services/provider.service.js';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const PROVIDER_TYPES = ['pandit', 'store', 'astrologer', 'wellness', 'gaushala', 'temple'] as const;
type ProviderTypeKey = typeof PROVIDER_TYPES[number];

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

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function providerRoutes(server: FastifyInstance) {

  // ─── GET /providers/:type — List providers by type ──────────────────────────

  server.get('/:type', async (request, reply) => {
    const { type } = request.params as { type: string };

    if (!isValidProviderType(type)) {
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

    const result = await providerService.getProviders(type, {
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

    if (!isValidProviderType(type)) {
      return reply.code(400).send({
        error: `Invalid provider type: ${type}`,
        validTypes: PROVIDER_TYPES,
      });
    }

    const provider = await providerService.getProviderById(type, id);

    if (!provider) {
      return reply.code(404).send({ error: `${type} provider not found` });
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

      if (!isValidProviderType(type)) {
        return reply.code(400).send({
          error: `Invalid provider type: ${type}`,
          validTypes: PROVIDER_TYPES,
        });
      }

      const userId = request.currentUser!.id;
      const userRoles = request.currentUser!.roles;
      const requiredRole = PROVIDER_ROLE_MAP[type];

      // Must own this provider type or be admin
      if (!userRoles.includes(requiredRole as typeof userRoles[number]) && !userRoles.includes('ADMIN')) {
        return reply.code(403).send({
          error: 'Forbidden',
          message: `You need the ${requiredRole} role to update a ${type} profile`,
        });
      }

      const body = request.body as Record<string, unknown>;
      const result = await providerService.updateProvider(type, id, userId, body);

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

      if (!isValidProviderType(type)) {
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
      const providerType = PROVIDER_ROLE_MAP[type].replace('_OWNER', '').replace('_INSTRUCTOR', '').replace('_MANAGER', '');

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
