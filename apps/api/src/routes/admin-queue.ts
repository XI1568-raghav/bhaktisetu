import type { FastifyInstance } from 'fastify';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { getQueueHealth } from '../services/job-queue.service.js';

/**
 * Admin-only queue health probe. Used by /admin/ops dashboard + alerting cron
 * to surface whether REDIS_URL has been wired in production and whether any
 * queue has waiting backlog or failed jobs.
 *
 * R-Q2-E-012 — Background job queue scaffold.
 */
export async function adminQueueRoutes(server: FastifyInstance) {
  server.get(
    '/health',
    {
      preHandler: [authenticateUser, requireRole('admin')],
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async () => {
      const queues = await getQueueHealth();
      const enabled = queues.some((q) => q.enabled);
      const totalWaiting = queues.reduce((acc, q) => acc + (q.counts?.waiting ?? 0), 0);
      const totalFailed = queues.reduce((acc, q) => acc + (q.counts?.failed ?? 0), 0);
      return {
        data: {
          enabled,
          queues,
          summary: {
            totalWaiting,
            totalFailed,
            redisUrlSet: enabled,
          },
        },
      };
    }
  );
}
