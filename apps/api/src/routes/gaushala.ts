import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { gaushalaService } from '../services/gaushala.service.js';

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

    if (!gaushala) {
      return reply.code(404).send({ error: 'Gaushala not found.' });
    }

    return { gaushala };
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
