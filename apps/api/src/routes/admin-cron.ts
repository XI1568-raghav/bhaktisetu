import type { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { discoverLiveStreams } from '../jobs/youtube-discovery.js';
import { refreshApolloLeads } from '../jobs/apollo-refresh.js';

/**
 * Token-gated manual triggers for cron jobs that don't need to wait for the
 * next master-cron tick. Used for debugging / on-demand refreshes by ops
 * when a temple comes online unexpectedly between scheduled polls.
 *
 * Auth: ?token=<CRON_AUTH_TOKEN>. Compared in constant time. If the env
 * var is unset every request is rejected (fail-closed).
 *
 * Currently exposed:
 *   GET /api/v1/admin/cron/youtube-discovery?token=…  → run discovery once
 *
 * The route is intentionally GET so it's curl-able from a phone or a
 * browser bookmark; the token query param is the gate.
 */

const cronToken = process.env.CRON_AUTH_TOKEN ?? '';

function authorisedToken(provided: string | undefined): boolean {
  if (!cronToken || !provided) return false;
  if (provided.length !== cronToken.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(cronToken));
  } catch {
    return false;
  }
}

interface TokenQuery {
  token?: string;
}

export async function adminCronRoutes(server: FastifyInstance) {
  server.get<{ Querystring: TokenQuery }>('/youtube-discovery', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const result = await discoverLiveStreams();
    return reply.send({ ok: true, result });
  });

  // Apollo lead refresh — bypasses the 7-day cooldown that gates the
  // automatic master-cron call. Useful when ICPs change or the previous
  // run errored mid-batch.
  server.get<{ Querystring: TokenQuery }>('/apollo-refresh', async (request, reply) => {
    if (!authorisedToken(request.query.token)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const result = await refreshApolloLeads();
    return reply.send({ ok: true, result });
  });
}
