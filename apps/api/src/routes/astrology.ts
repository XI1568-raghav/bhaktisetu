import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser } from '../middlewares/auth.js';
import { astrologyService } from '../services/astrology.service.js';
import {
  generateKundli,
  getDailyHoroscope,
  prewarmDailyHoroscopes,
  KundliInputSchema,
  HoroscopeQuerySchema,
  SIGNS,
} from '../lib/astrology.js';
import { prisma } from '../lib/prisma.js';

// Pagination clamp shared across astrologer list + reviews. Without an
// upper bound, anyone hitting GET /astrologers?limit=99999 forces a full
// in-memory scrape — worse, public unauthenticated, so it's a free DoS.
const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const astrologerListQuerySchema = paginationSchema.extend({
  specialization: z.string().optional(),
  language: z.string().optional(),
  priceRange: z.string().optional(),
  online: z.string().optional(),
  sort: z.enum(['rating', 'price', 'experience']).optional(),
});

export async function astrologyRoutes(server: FastifyInstance) {
  // ─── GET /astrologers ──────────────────────────────────────────────────────
  // List astrologers with optional filters

  server.get('/astrologers', async (request, reply) => {
    const parsed = astrologerListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const { specialization, language, priceRange, online, sort, page, limit } = parsed.data;

    const result = astrologyService.getAstrologers({
      specialization,
      language,
      priceRange,
      isOnline: online !== undefined ? online === 'true' : undefined,
      sortBy: sort,
      page,
      limit,
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
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const { page, limit } = parsed.data;

    const result = astrologyService.getReviews(id, page, limit);

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
  // Legacy shape used by existing web UI. Kept for backward compatibility.

  server.post('/kundli', async (request, reply) => {
    const body = request.body as {
      birthDate?: string;
      birthTime?: string;
      birthPlace?: string;
      name?: string;
      // New shape (Zod-validated path).
      dob?: string;
      tob?: string;
      location?: string;
      latitude?: number;
      longitude?: number;
      timezone?: string;
    };

    // If caller used the v2 shape (dob/tob/location|lat/lng), route to the new lib.
    if (body.dob && body.tob && (body.location || (body.latitude !== undefined && body.longitude !== undefined))) {
      const parsed = KundliInputSchema.safeParse(body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.errors[0]?.message ?? 'Invalid kundli input.' });
      }
      const result = await generateKundli(parsed.data);
      // Best-effort analytics — never block on this.
      void prisma.kundliRequest
        .create({
          data: {
            userId: request.currentUser?.id ?? null,
            dob: new Date(parsed.data.dob),
            tob: parsed.data.tob,
            location: parsed.data.location ?? `${parsed.data.latitude},${parsed.data.longitude}`,
            signature: result.signature,
          },
        })
        .catch(() => undefined);
      return { kundli: result };
    }

    if (!body.birthDate || !body.birthTime || !body.birthPlace) {
      return reply
        .code(400)
        .send({ error: 'Provide either {dob, tob, location} or {birthDate, birthTime, birthPlace}.' });
    }

    const kundli = await astrologyService.getKundliAsync(body.birthDate, body.birthTime, body.birthPlace, body.name);
    return { kundli };
  });

  // ─── GET /horoscope/daily ──────────────────────────────────────────────────
  // 24h-cached daily horoscope per sun sign. Pre-warmed by master-cron.

  server.get('/horoscope/daily', async (request, reply) => {
    const parsed = HoroscopeQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({
        error: parsed.error.errors[0]?.message ?? 'Invalid query.',
        validSigns: SIGNS,
      });
    }
    try {
      const horoscope = await getDailyHoroscope(parsed.data);
      return { horoscope };
    } catch (err) {
      return reply.code(400).send({ error: err instanceof Error ? err.message : 'Failed to load horoscope.' });
    }
  });

  // ─── POST /horoscope/prewarm ───────────────────────────────────────────────
  // Cron-only endpoint. Token-gated via CRON_SECRET to prevent abuse.

  server.post('/horoscope/prewarm', async (request, reply) => {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const token = (request.headers['x-cron-secret'] as string | undefined) ?? '';
      if (token !== cronSecret) {
        return reply.code(401).send({ error: 'Invalid cron secret.' });
      }
    }
    const result = await prewarmDailyHoroscopes();
    return { prewarmed: result };
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
      const result = await astrologyService.askAstrologer(message.trim(), birthDetails);
      return result;
    } catch (error: any) {
      server.log.error(error, 'AI Astrologer error');
      const fallback = astrologyService.getAstrologerFallback(message.trim());
      return {
        response: fallback.text,
        source: fallback.matched ? 'fallback-keyword' : 'fallback-default',
      };
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
