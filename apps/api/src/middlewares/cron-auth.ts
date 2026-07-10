import crypto from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * cron-auth middleware (R-Q1-IT-002)
 *
 * Doctrine: fail-loud. If CRON_AUTH_TOKEN env is missing or wrong,
 * 401 — never silently pass. Reads env at CALL TIME (not module load)
 * so test overrides + Render redeploys both take effect.
 *
 * Two surfaces:
 *   - requireCronBearer  — Authorization: Bearer <token>  (used by /api/v1/cron/*)
 *   - requireCronQueryToken — ?token=<token>              (used by /api/v1/admin/cron/* legacy GET)
 *
 * Constant-time compare via crypto.timingSafeEqual (defends against
 * timing oracle on token guess attempts).
 *
 * Sentinel error codes returned in body:
 *   - 'cron_auth_misconfigured' — server-side env missing (operator must fix)
 *   - 'cron_unauthorized'       — client-supplied token wrong or missing
 *
 * The two codes differ so log-aggregation can distinguish "I'm broken"
 * from "you tried to hit me with a bad token" — both 401, different cause.
 */

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function readEnvToken(): string {
  // Read at call time — vitest mutates process.env between cases.
  return process.env.CRON_AUTH_TOKEN ?? '';
}

function logMisconfigured(): void {
  // Stderr explicit so Render log search ('grep FATAL') picks it up.
  // eslint-disable-next-line no-console
  console.error('[FATAL] CRON_AUTH_TOKEN env var unset — refusing all cron requests');
}

export async function requireCronBearer(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = readEnvToken();
  if (!expected) {
    logMisconfigured();
    reply.code(401).send({ error: 'cron_auth_misconfigured' });
    return;
  }

  const header = (request.headers.authorization ?? '') as string;
  const expectedHeader = `Bearer ${expected}`;
  if (!constantTimeEq(header, expectedHeader)) {
    reply.code(401).send({ error: 'cron_unauthorized' });
    return;
  }
  // Pass — Fastify continues route handler since reply not sent.
}

export async function requireCronQueryToken(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = readEnvToken();
  if (!expected) {
    logMisconfigured();
    reply.code(401).send({ error: 'cron_auth_misconfigured' });
    return;
  }

  const q = (request.query ?? {}) as { token?: string };
  const provided = q.token ?? '';
  if (!constantTimeEq(provided, expected)) {
    reply.code(401).send({ error: 'cron_unauthorized' });
    return;
  }
}

/**
 * requireCronSecretHeader — for endpoints gated by CRON_SECRET (e.g. the
 * horoscope prewarm) via the `x-cron-secret` header. P0 #PUB-04 (2026-07-09):
 * the old inline handler compared the secret with `!==` (timing oracle) AND
 * skipped auth entirely when CRON_SECRET was unset (default-allow). This
 * middleware uses constant-time compare + fail-loud default-deny, mirroring
 * requireCronBearer/requireCronQueryToken.
 */
export async function requireCronSecretHeader(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = process.env.CRON_SECRET ?? '';
  if (!expected) {
    console.error('[FATAL] CRON_SECRET env var unset — refusing cron request');
    reply.code(401).send({ error: 'cron_secret_misconfigured' });
    return;
  }
  const provided = (request.headers['x-cron-secret'] as string | undefined) ?? '';
  if (!constantTimeEq(provided, expected)) {
    reply.code(401).send({ error: 'cron_unauthorized' });
    return;
  }
}
