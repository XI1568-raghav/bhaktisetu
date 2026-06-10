import type { FastifyInstance } from 'fastify';
import { discoverLiveStreams } from '../jobs/youtube-discovery.js';
import { refreshApolloLeads } from '../jobs/apollo-refresh.js';
import { requireCronQueryToken } from '../middlewares/cron-auth.js';

/**
 * Token-gated manual triggers for cron jobs that don't need to wait for the
 * next master-cron tick. Used for debugging / on-demand refreshes by ops
 * when a temple comes online unexpectedly between scheduled polls.
 *
 * Auth: ?token=<CRON_AUTH_TOKEN>. Gate via requireCronQueryToken (constant
 * time + fail-loud if env unset). See R-Q1-IT-002.
 *
 * Currently exposed:
 *   GET /api/v1/admin/cron/youtube-discovery?token=…  → run discovery once
 *   GET /api/v1/admin/cron/apollo-refresh?token=…     → bypass 7-day cooldown
 *
 * The route is intentionally GET so it's curl-able from a phone or a
 * browser bookmark; the token query param is the gate.
 */

interface TokenQuery {
  token?: string;
}

export async function adminCronRoutes(server: FastifyInstance) {
  server.get<{ Querystring: TokenQuery }>('/youtube-discovery', { preHandler: requireCronQueryToken }, async (_request, reply) => {
    const result = await discoverLiveStreams();
    return reply.send({ ok: true, result });
  });

  server.get<{ Querystring: TokenQuery }>('/apollo-refresh', { preHandler: requireCronQueryToken }, async (_request, reply) => {
    const result = await refreshApolloLeads();
    return reply.send({ ok: true, result });
  });
}
