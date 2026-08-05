import { FastifyInstance } from 'fastify';
import { templeService } from '../services/temple.service.js';

export async function templeRoutes(server: FastifyInstance) {
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
