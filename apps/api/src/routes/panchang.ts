import { FastifyInstance } from 'fastify';
import { panchangService } from '../services/panchang.service.js';
import { PujaMuhuratQuerySchema } from '../lib/puja-muhurat.js';

export async function panchangRoutes(server: FastifyInstance) {
  // GET /today - Get today's panchang details
  server.get('/today', async (request, reply) => {
    const { city } = request.query as {
      city?: string;
    };

    try {
      const panchang = await panchangService.getToday(city);

      if (!panchang) {
        return reply.status(404).send({
          error: 'Panchang data not available for today',
          suggestion: 'Panchang data may not have been seeded for this date yet.',
        });
      }

      return panchang;
    } catch (error) {
      server.log.error(error, 'Failed to fetch today panchang');
      return reply.status(500).send({ error: 'Failed to fetch panchang data' });
    }
  });

  // GET /festivals - List upcoming festivals (must be before :date)
  server.get('/festivals', async (request, reply) => {
    const { days } = request.query as {
      days?: string;
    };

    try {
      const result = await panchangService.getUpcomingFestivals(
        Math.min(Number(days) || 30, 365)
      );

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to fetch festivals');
      return reply.status(500).send({ error: 'Failed to fetch festivals' });
    }
  });

  // GET /vrats - List upcoming vrats / fasting days
  server.get('/vrats', async (request, reply) => {
    const { days } = request.query as {
      days?: string;
    };

    try {
      const result = await panchangService.getUpcomingVrats(
        Math.min(Number(days) || 30, 365)
      );

      return result;
    } catch (error) {
      server.log.error(error, 'Failed to fetch vrats');
      return reply.status(500).send({ error: 'Failed to fetch vrats' });
    }
  });

  // GET /muhurat - Get auspicious timings for today or a given date
  server.get('/muhurat', async (request, reply) => {
    const { date, city } = request.query as {
      date?: string;
      city?: string;
    };

    try {
      const dateStr = date || new Date().toISOString().split('T')[0]!;
      const panchang = await panchangService.getByDate(dateStr, city);

      if (!panchang) {
        return reply.status(404).send({
          error: 'Panchang data not available for the requested date',
        });
      }

      return {
        date: dateStr,
        location: panchang.locationCity,
        shubhMuhurat: panchang.shubhMuhurat,
        rahuKaal: panchang.rahuKaal,
        tithi: panchang.tithi,
        nakshatra: panchang.nakshatra,
        yoga: panchang.yoga,
      };
    } catch (error) {
      server.log.error(error, 'Failed to fetch muhurat');
      return reply.status(500).send({ error: 'Failed to fetch muhurat data' });
    }
  });

  // GET /puja-muhurat - Top shubh days + bookable windows for a puja type.
  // Registered BEFORE /:date so 'puja-muhurat' is not parsed as a date param.
  server.get('/puja-muhurat', async (request, reply) => {
    const parsed = PujaMuhuratQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { pujaType, from, days, city, limit } = parsed.data;
    try {
      const results = await panchangService.getPujaMuhurats(pujaType, from, days, city, limit);
      return { pujaType, city, from: from ?? new Date().toISOString().split('T')[0], days, results };
    } catch (error) {
      server.log.error(error, 'Failed to compute puja muhurats');
      return reply.status(500).send({ error: 'Failed to compute puja muhurats' });
    }
  });

  // GET /:date - Get panchang for a specific date
  server.get('/:date', async (request, reply) => {
    const { date } = request.params as { date: string };
    const { city } = request.query as {
      city?: string;
    };

    // Validate date format
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return reply.status(400).send({ error: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    try {
      const panchang = await panchangService.getByDate(date, city);

      if (!panchang) {
        return reply.status(404).send({
          error: `Panchang data not available for ${date}`,
        });
      }

      return panchang;
    } catch (error) {
      server.log.error(error, 'Failed to fetch panchang for date');
      return reply.status(500).send({ error: 'Failed to fetch panchang data' });
    }
  });
}
