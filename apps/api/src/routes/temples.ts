import { FastifyInstance } from 'fastify';
import { templeService } from '../services/temple.service.js';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

export async function templeRoutes(server: FastifyInstance) {
  // ─── Temple follows (NOTIF-09) ────────────────────────────────────────────
  //
  // jobs/aarti-notify.ts now sends aarti reminders ONLY to the followers of the
  // temple whose aarti is firing — the correct audience, and the fix for one
  // opt-in buying twenty pushes a day about temples the devotee never chose.
  //
  // Nothing could create a follower. `templeFollow` appeared in exactly one
  // file in apps/api/src, as a read, and `temple_follows` held zero rows, so
  // the targeted branch had an audience of nobody and always would. That turns
  // a spamming feature into a silent one, which is not a fix — the darshan
  // page's "aarti reminders" toggle would sit on, honestly wired, and deliver
  // nothing forever.
  //
  // These three routes are the write side of that contract.

  /** Resolve a slug (or a raw id) to the temple row the follow points at. */
  async function resolveTemple(slugOrId: string): Promise<{ id: string; name: string } | null> {
    const bySlug = await prisma.temple.findUnique({
      where: { slug: slugOrId },
      select: { id: true, name: true },
    });
    if (bySlug) return bySlug;
    // Accept an id too: the mobile client holds ids, the web client holds slugs,
    // and a follow that works on one surface and 404s on the other is the kind
    // of split that goes unnoticed until the reminders do not arrive.
    return prisma.temple
      .findUnique({ where: { id: slugOrId }, select: { id: true, name: true } })
      .catch(() => null);
  }

  server.post('/:slug/follow', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const temple = await resolveTemple(slug);
    if (!temple) return reply.status(404).send({ error: 'Temple not found' });
    const userId = request.currentUser!.id;
    try {
      // Idempotent on the (userId, templeId) unique — a devotee tapping the bell
      // twice must not double their aarti pushes.
      await prisma.templeFollow.upsert({
        where: { userId_templeId: { userId, templeId: temple.id } },
        create: { userId, templeId: temple.id },
        update: {},
      });
    } catch (error) {
      server.log.error(error, 'Failed to follow temple');
      return reply.status(500).send({ error: 'Failed to follow temple' });
    }
    return { following: true, templeId: temple.id, templeName: temple.name };
  });

  server.delete('/:slug/follow', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const temple = await resolveTemple(slug);
    if (!temple) return reply.status(404).send({ error: 'Temple not found' });
    const userId = request.currentUser!.id;
    try {
      await prisma.templeFollow.deleteMany({ where: { userId, templeId: temple.id } });
    } catch (error) {
      server.log.error(error, 'Failed to unfollow temple');
      return reply.status(500).send({ error: 'Failed to unfollow temple' });
    }
    return { following: false, templeId: temple.id };
  });

  server.get('/follows/mine', { preHandler: [authenticateUser] }, async (request, reply) => {
    try {
      // Bounded: this is a devotee's own follow list, not a scan (SCAL-04).
      const rows = await prisma.templeFollow.findMany({
        where: { userId: request.currentUser!.id },
        select: { templeId: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });
      return { templeIds: rows.map((r) => r.templeId), total: rows.length };
    } catch (error) {
      server.log.error(error, 'Failed to list temple follows');
      return reply.status(500).send({ error: 'Failed to list follows' });
    }
  });

  // GET / - List temples with filters
  server.get('/', async (request, reply) => {
    const { city, state, deity, tradition, search, isVerified, liveDarshan, page, limit } =
      request.query as {
        city?: string;
        state?: string;
        deity?: string;
        tradition?: string;
        search?: string;
        isVerified?: string;
        liveDarshan?: string;
        page?: string;
        limit?: string;
      };

    try {
      const result = await templeService.findAll({
        city,
        state,
        tradition,
        deity,
        search,
        isVerified: isVerified !== undefined ? isVerified === 'true' : undefined,
        liveDarshan: liveDarshan !== undefined ? liveDarshan === 'true' : undefined,
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100),
      });

      // P2 #221 (2026-08-03): catalog list reads were served with no Cache-Control
      // (cf-cache-status: DYNAMIC) so every temples/pujas read hit the Render
      // free-tier origin. Public, mostly-static catalog data is safe to edge-cache.
      reply.header('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=300');
      return result;
    } catch (error) {
      server.log.error(error, 'Failed to list temples');
      return reply.status(500).send({ error: 'Failed to fetch temples' });
    }
  });

  // GET /search - Full-text search for temples
  server.get('/search', async (request, reply) => {
    const { q, page, limit } = request.query as {
      q?: string;
      page?: string;
      limit?: string;
    };

    try {
      const result = await templeService.search(
        q || '',
        Number(page) || 1,
        Math.min(Number(limit) || 20, 100)
      );

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to search temples');
      return reply.status(500).send({ error: 'Failed to search temples' });
    }
  });

  // GET /nearby - Find temples near a location
  server.get('/nearby', async (request, reply) => {
    const { lat, lng, radius } = request.query as {
      lat?: string;
      lng?: string;
      radius?: string;
    };

    if (!lat || !lng) {
      return reply.status(400).send({ error: 'lat and lng query parameters are required' });
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    if (isNaN(latNum) || isNaN(lngNum)) {
      return reply.status(400).send({ error: 'lat and lng must be valid numbers' });
    }

    try {
      const MAX_RADIUS_KM = 200;
      const requestedRadiusKm = Number(radius) || 25;
      const radiusKm = Math.min(requestedRadiusKm, MAX_RADIUS_KM);
      const temples = await templeService.findNearby(latNum, lngNum, radiusKm);

      return {
        temples,
        location: { lat: latNum, lng: lngNum },
        radiusKm,
        maxRadiusKm: MAX_RADIUS_KM,
        radiusCapped: requestedRadiusKm > MAX_RADIUS_KM,
        total: temples.length,
      };
    } catch (error) {
      server.log.error(error, 'Failed to find nearby temples');
      return reply.status(500).send({ error: 'Failed to find nearby temples' });
    }
  });

  // GET /:slug - Get temple details by slug
  server.get('/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    try {
      const temple = await templeService.findBySlug(slug);

      if (!temple) {
        return reply.status(404).send({ error: 'Temple not found' });
      }

      return { temple };
    } catch (error) {
      server.log.error(error, 'Failed to fetch temple');
      return reply.status(500).send({ error: 'Failed to fetch temple details' });
    }
  });

  // GET /:slug/pujas - List pujas available at a temple
  server.get('/:slug/pujas', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    try {
      const result = await templeService.getTemplePujas(slug);

      if (!result) {
        return reply.status(404).send({ error: 'Temple not found' });
      }

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to fetch temple pujas');
      return reply.status(500).send({ error: 'Failed to fetch temple pujas' });
    }
  });

  // GET /:slug/darshan - Get darshan options for a temple
  server.get('/:slug/darshan', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    try {
      const temple = await templeService.findBySlug(slug);

      if (!temple) {
        return reply.status(404).send({ error: 'Temple not found' });
      }

      // P0 #PUB-08 (2026-07-09): expose the public playback URL from the
      // LiveDarshanStream row, NOT the Temple's internal streamUrl (which is
      // no longer in the public detail select). The temple's raw streamUrl is
      // an internal ingest/source field.
      const liveStream = temple.darshanStream.length > 0 ? temple.darshanStream[0] : null;
      return {
        templeSlug: slug,
        liveDarshanEnabled: temple.liveDarshanEnabled,
        liveDarshan: liveStream,
        streamUrl: liveStream?.playbackUrl ?? null,
      };
    } catch (error) {
      server.log.error(error, 'Failed to fetch darshan info');
      return reply.status(500).send({ error: 'Failed to fetch darshan info' });
    }
  });

  // GET /:slug/reviews - Get reviews for a temple
  server.get('/:slug/reviews', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const { page, limit } = request.query as { page?: string; limit?: string };

    try {
      const result = await templeService.getReviews(
        slug,
        Number(page) || 1,
        Math.min(Number(limit) || 10, 50)
      );

      if (!result) {
        return reply.status(404).send({ error: 'Temple not found' });
      }

      return { templeSlug: slug, ...result };
    } catch (error) {
      server.log.error(error, 'Failed to fetch reviews');
      return reply.status(500).send({ error: 'Failed to fetch reviews' });
    }
  });
}
