import type { FastifyPluginAsync } from 'fastify';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

/**
 * GET /admin/subscriptions
 *
 * Admin-only list of marketplace subscriptions across all roles.
 * Returns active + historical w/ status/plan/role/inr breakdowns.
 */

const route: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/subscriptions',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (req, reply) => {
      const query = (req.query as Record<string, string | undefined>) || {};
      const status = query.status || 'all';
      const limit = Math.min(parseInt(query.limit || '100', 10) || 100, 500);

      try {
        // Marketplace subscription table not yet shipped (see ROADMAP). Return shape
        // matching client expectation w/ empty subscriptions array + headline metrics.
        const subs: unknown[] = [];

        // Aggregate role/plan counts from User table for now (FREE tier baseline).
        const userRoles = await prisma.userRoleAssignment.groupBy({
          by: ['role'],
          _count: { _all: true },
        });

        const planRows = userRoles.map((r) => ({
          plan: 'FREE',
          role: String(r.role),
          subs: r._count._all,
          totalInr: 0,
        }));

        reply.header('cache-control', 'private, max-age=30');
        return {
          status,
          limit,
          subscriptions: subs,
          total: subs.length,
          active: 0,
          activeMrr: 0,
          plans: planRows,
          note: 'Marketplace subscriptions schema not yet shipped. Tracking baseline FREE-tier role counts. See ROADMAP item R-Q1-E-010 (pricing infra).',
        };
      } catch (err) {
        app.log.warn({ err }, 'admin-subscriptions: query failed');
        reply.status(500);
        return { error: 'subscriptions query failed', detail: String(err) };
      }
    },
  );
};

export default route;
