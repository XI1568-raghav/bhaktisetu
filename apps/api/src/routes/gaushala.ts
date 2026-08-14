import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { gaushalaService } from '../services/gaushala.service.js';
import { prisma } from '../lib/prisma.js';

export async function gaushalaRoutes(server: FastifyInstance) {
  // ─── GET / — List all gaushalas ────────────────────────────────────────────────

  server.get('/', async (request, reply) => {
    const gaushalas = gaushalaService.getGaushalas();
    return { gaushalas };
  });

  // ─── GET /:id — Gaushala detail with cows ──────────────────────────────────────

  server.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gaushala = gaushalaService.getGaushalaById(id);

    if (gaushala) {
      return { gaushala: { ...gaushala, source: 'fixture', donationCauseId: id } };
    }

    // COM-07: the /gaushala page's "Approved gaushalas you can support
    // directly" strip links every real DB profile to /gaushala/<uuid>, and
    // every one of those 404'd because only the gs_00x fixtures resolved here.
    // Resolve real, APPROVED profiles by profile id or owner id, and hand back
    // the donation cause id so the detail page's donate CTA reaches the right
    // donee (see lib/gaushala-donee.ts).
    const profile = await prisma.gaushalaProfile.findFirst({
      where: { approved: true, OR: [{ id }, { userId: id }] },
    });
    if (!profile) {
      return reply.code(404).send({ error: 'Gaushala not found.' });
    }

    return {
      gaushala: {
        id: profile.id,
        name: profile.gaushalaName,
        location: profile.city ?? '',
        state: '',
        description: profile.description ?? '',
        address: profile.address ?? '',
        totalCows: profile.totalCows,
        verified: profile.verified,
        // No fixture cows are grafted onto a real gaushala — an empty roster
        // means this gaushala has not listed cows yet, and the page must say so.
        cows: [],
        availableCows: 0,
        cowsListed: 0,
        source: 'profile',
        donationCauseId: profile.userId,
      },
    };
  });

  // ─── GET /cows — List cows (filterable) ────────────────────────────────────────

  server.get('/cows', async (request, reply) => {
    const { gaushalaId, available } = request.query as {
      gaushalaId?: string;
      available?: string;
    };

    const isAvailable = available !== undefined
      ? available === 'true'
      : undefined;

    const cows = gaushalaService.getCows(gaushalaId, isAvailable);
    return { cows, total: cows.length };
  });

  // ─── GET /cows/:id — Cow detail with monthly updates ──────────────────────────

  server.get('/cows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const cow = gaushalaService.getCowById(id);

    if (!cow) {
      return reply.code(404).send({ error: 'Cow not found.' });
    }

    return { cow };
  });

  // ─── GET /plans — Adoption tiers ───────────────────────────────────────────────

  server.get('/plans', async (request, reply) => {
    const plans = gaushalaService.getAdoptionPlans();
    return { plans };
  });

  // ─── POST /adopt — Adopt a cow (auth required) ────────────────────────────────

  server.post('/adopt', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { cowId, planId } = request.body as {
      cowId: string;
      planId: string;
    };

    if (!cowId || !planId) {
      return reply.code(400).send({ error: 'cowId and planId are required.' });
    }

    try {
      const adoption = gaushalaService.adoptCow(userId, cowId, planId);
      return {
        message: 'Cow adopted successfully! You will receive monthly updates.',
        adoption,
      };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // ─── GET /my-adoptions — User's adopted cows (auth required) ──────────────────

  server.get('/my-adoptions', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const adoptions = gaushalaService.getMyAdoptions(userId);
    return { adoptions, total: adoptions.length };
  });

  // ─── GET /adoptions/:id/updates — Monthly updates for an adoption ─────────────

  server.get('/adoptions/:id/updates', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const { id } = request.params as { id: string };

    const updates = gaushalaService.getAdoptionUpdates(id, userId);

    if (updates === null) {
      return reply.code(404).send({ error: 'Adoption not found.' });
    }

    return { updates };
  });
}
