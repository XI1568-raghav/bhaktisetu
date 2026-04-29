import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import { astrologyService } from '../services/astrology.service.js';

export async function astrologyRoutes(server: FastifyInstance) {
  // ─── GET /astrologers ──────────────────────────────────────────────────────
  // List astrologers with optional filters

  server.get('/astrologers', async (request, reply) => {
    const { specialization, language, priceRange, online, sort, page, limit } =
      request.query as {
        specialization?: string;
        language?: string;
        priceRange?: string;
        online?: string;
        sort?: string;
        page?: string;
        limit?: string;
      };

    const result = astrologyService.getAstrologers({
      specialization,
      language,
      priceRange,
      isOnline: online !== undefined ? online === 'true' : undefined,
      sortBy: sort as 'rating' | 'price' | 'experience' | undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return result;
  });

  // ─── GET /astrologers/:id ──────────────────────────────────────────────────
  // Get astrologer detail with reviews

  server.get('/astrologers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const astrologer = astrologyService.getAstrologerById(id);

    if (!astrologer) {
      return reply.code(404).send({ error: 'Astrologer not found.' });
    }

    return { astrologer };
  });

  // ─── GET /astrologers/:id/reviews ──────────────────────────────────────────
  // Paginated reviews for an astrologer

  server.get('/astrologers/:id/reviews', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { page, limit } = request.query as { page?: string; limit?: string };

    const result = astrologyService.getReviews(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined
    );

    return result;
  });

  // ─── GET /specializations ──────────────────────────────────────────────────
  // List all specializations with counts

  server.get('/specializations', async (request, reply) => {
    const specializations = astrologyService.getSpecializations();
    return { specializations };
  });

  // ─── POST /consult/start ───────────────────────────────────────────────────
  // Start a consultation session (auth required)

  server.post(
    '/consult/start',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const userId = request.currentUser!.id;
      const { astrologerId, mode } = request.body as {
        astrologerId: string;
        mode: 'chat' | 'call' | 'video';
      };

      if (!astrologerId) {
        return reply.code(400).send({ error: 'astrologerId is required.' });
      }

      if (!mode || !['chat', 'call', 'video'].includes(mode)) {
        return reply
          .code(400)
          .send({ error: 'mode must be one of: chat, call, video.' });
      }

      const result = astrologyService.startConsultation(userId, astrologerId, mode);

      if ('error' in result) {
        return reply.code(400).send({ error: result.error });
      }

      return { session: result };
    }
  );

  // ─── POST /kundli ──────────────────────────────────────────────────────────
  // Generate kundli from birth details

  server.post('/kundli', async (request, reply) => {
    const { birthDate, birthTime, birthPlace, name } = request.body as {
      birthDate: string;
      birthTime: string;
      birthPlace: string;
      name?: string;
    };

    if (!birthDate || !birthTime || !birthPlace) {
      return reply
        .code(400)
        .send({ error: 'birthDate, birthTime, and birthPlace are required.' });
    }

    const kundli = await astrologyService.getKundliAsync(birthDate, birthTime, birthPlace, name);
    return { kundli };
  });

  // ─── GET /horoscope/all ────────────────────────────────────────────────────
  // All 12 rashis summary (must be before :rashi param route)

  server.get('/horoscope/all', async (request, reply) => {
    const horoscopes = astrologyService.getAllHoroscopes();
    return { horoscopes };
  });

  // ─── GET /horoscope/:rashi ─────────────────────────────────────────────────
  // Daily horoscope for a specific rashi

  server.get('/horoscope/:rashi', async (request, reply) => {
    const { rashi } = request.params as { rashi: string };
    const horoscope = astrologyService.getDailyHoroscope(rashi);

    if (!horoscope) {
      return reply.code(404).send({ error: 'Rashi not found. Use English name (e.g., aries, taurus).' });
    }

    return { horoscope };
  });

  // ─── GET /compatibility ────────────────────────────────────────────────────
  // Compatibility check between two rashis

  server.get('/compatibility', async (request, reply) => {
    const { rashi1, rashi2 } = request.query as {
      rashi1?: string;
      rashi2?: string;
    };

    if (!rashi1 || !rashi2) {
      return reply
        .code(400)
        .send({ error: 'Both rashi1 and rashi2 query parameters are required.' });
    }

    const result = astrologyService.getCompatibility(rashi1, rashi2);

    if (!result) {
      return reply
        .code(404)
        .send({ error: 'One or both rashis not found. Use English names (e.g., aries, taurus).' });
    }

    return { compatibility: result };
  });

  // ─── POST /ask ─────────────────────────────────────────────────────────────
  // AI Astrologer chat — answers astrology questions

  server.post('/ask', async (request, reply) => {
    const { message, birthDetails } = request.body as {
      message?: string;
      birthDetails?: {
        name?: string;
        date?: string;
        time?: string;
        place?: string;
      };
    };

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return reply.code(400).send({ error: 'message is required.' });
    }

    if (message.length > 2000) {
      return reply.code(400).send({ error: 'Message too long. Maximum 2000 characters.' });
    }

    try {
      const response = await astrologyService.askAstrologer(message.trim(), birthDetails);
      return { response };
    } catch (error: any) {
      server.log.error(error, 'AI Astrologer error');
      // Return fallback response instead of 500
      const fallback = astrologyService.getAstrologerFallback(message.trim());
      return { response: fallback };
    }
  });

  // ─── Consultation list / patch / start-call ──────────────────────

  server.get('/consultations', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const role = (request.query as { role?: string }).role ?? 'astrologer';
    const consultations = await astrologyService.listConsultations({ userId, role });
    return { consultations };
  });

  server.patch('/consultations/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const schema = z.object({ status: z.enum(['COMPLETED', 'CANCELLED']) });
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid' });
    try {
      const updated = await astrologyService.updateConsultation(id, parsed.data.status);
      return { consultation: updated };
    } catch (e) {
      return reply.code(404).send({ error: e instanceof Error ? e.message : 'Not found' });
    }
  });

  server.post('/consultations/:id/start-call', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = await astrologyService.startCall(id);
      return { roomUrl: result.roomUrl };
    } catch (e) {
      return reply.code(404).send({ error: e instanceof Error ? e.message : 'Not found' });
    }
  });
}
