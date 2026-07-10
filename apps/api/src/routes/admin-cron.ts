import type { FastifyInstance } from 'fastify';
import { discoverLiveStreams } from '../jobs/youtube-discovery.js';
import { refreshApolloLeads } from '../jobs/apollo-refresh.js';
import { requireCronBearer } from '../middlewares/cron-auth.js';

/**
 * Token-gated manual triggers for cron jobs that don't need to wait for the
 * next master-cron tick. Used for debugging / on-demand refreshes by ops
 * when a temple comes online unexpectedly between scheduled polls.
 *
 * Auth: Authorization: Bearer <CRON_AUTH_TOKEN>. Gate via requireCronBearer
 * (constant-time compare + fail-loud if env unset). See R-Q1-IT-002.
 *
 * P0 #PUB-03 (2026-07-10): migrated off the legacy `?token=` query param,
 * which leaked the cron secret into Render access logs + CDN caches. The
 * Bearer header keeps the token out of the URL while staying curl-able.
 *
 * Currently exposed:
 *   GET /api/v1/admin/cron/youtube-discovery  → run discovery once
 *   GET /api/v1/admin/cron/apollo-refresh     → bypass 7-day cooldown
 *
 * The route is intentionally GET so it's curl-able from a phone:
 *   curl -H "Authorization: Bearer $CRON_AUTH_TOKEN" <url>
 */

export async function adminCronRoutes(server: FastifyInstance) {
  server.get('/youtube-discovery', { preHandler: requireCronBearer }, async (_request, reply) => {
    const result = await discoverLiveStreams();
    return reply.send({ ok: true, result });
  });

  server.get('/apollo-refresh', { preHandler: requireCronBearer }, async (_request, reply) => {
    const result = await refreshApolloLeads();
    return reply.send({ ok: true, result });
  });
}
