import { FastifyInstance } from 'fastify';
import { pujaService } from '../services/puja.service.js';

export async function pujaRoutes(server: FastifyInstance) {
  // GET /types - List all puja types
  server.get('/types', async (request, reply) => {
    const { page, limit, category, deity, search } = request.query as {
      page?: string;
      limit?: string;
      category?: string;
      deity?: string;
      search?: string;
    };

    try {
      const result = await pujaService.findAllTypes({
        category,
        deity,
        search,
        page: Number(page) || 1,
        limit: Math.min(Number(limit) || 20, 100),
      });

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to list puja types');
      return reply.status(500).send({ error: 'Failed to fetch puja types' });
    }
  });

  // GET /types/popular - Get most popular pujas (must be before :slug)
  server.get('/types/popular', async (request, reply) => {
    const { limit } = request.query as { limit?: string };

    try {
      const popular = await pujaService.getPopular(
        Math.min(Number(limit) || 10, 50)
      );

      return { pujaTypes: popular };
    } catch (error) {
      server.log.error(error, 'Failed to fetch popular pujas');
      return reply.status(500).send({ error: 'Failed to fetch popular pujas' });
    }
  });

  // GET /types/:slug - Get puja type details
  server.get('/types/:slug', async (request, reply) => {
    const { slug } = request.params as { slug: string };

    try {
      const pujaType = await pujaService.findBySlug(slug);

      if (!pujaType) {
        return reply.status(404).send({ error: 'Puja type not found' });
      }

      // Return the puja at the root for the web app's detail/booking pages
      // (which read `data` directly as `PujaDetail`), and ALSO under
      // `pujaType` for legacy callers that destructure `res.pujaType`.
      // Single source of truth: same object reference, two keys.
      return { ...pujaType, pujaType };
    } catch (error) {
      server.log.error(error, 'Failed to fetch puja type');
      return reply.status(500).send({ error: 'Failed to fetch puja type details' });
    }
  });

  // GET /availability - Check puja availability for a temple and date
  server.get('/availability', async (request, reply) => {
    const { templeId, pujaTypeId, date } = request.query as {
      templeId?: string;
      pujaTypeId?: string;
      date?: string;
    };

    if (!templeId || !pujaTypeId || !date) {
      return reply.status(400).send({
        error: 'templeId, pujaTypeId, and date query parameters are required',
      });
    }

    // Validate date format
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    // Don't allow checking availability for past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) {
      return reply.status(400).send({ error: 'Cannot check availability for past dates.' });
    }

    try {
      const result = await pujaService.checkAvailability(templeId, pujaTypeId, date);
      return result;
    } catch (error) {
      server.log.error(error, 'Failed to check availability');
      return reply.status(500).send({ error: 'Failed to check availability' });
    }
  });
}
