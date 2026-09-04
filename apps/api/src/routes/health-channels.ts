import crypto from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import {
  getChannelStatus,
  CHANNEL_ENV_REQUIREMENTS,
  CHANNEL_NAMES,
} from '../lib/notification-channels.js';
import type {
  ChannelName,
  ChannelState,
  ChannelEvidence,
  ChannelReport,
  ChannelStatus,
} from '../lib/notification-channels.js';

// Re-exported so existing importers of this route module keep working; the
// authoritative definitions now live in lib/notification-channels.ts, which is
// also what the boot-time alert in server.ts reads.
export { getChannelStatus, CHANNEL_ENV_REQUIREMENTS, CHANNEL_NAMES };
export type { ChannelName, ChannelState, ChannelEvidence, ChannelReport, ChannelStatus };

/**
 * Ops-token auth for machine callers (uptime monitors, smoke tests).
 *
 * Read at CALL time, not module load, so the gate is testable without module
 * resets and so rotating the secret on Render takes effect on redeploy without
 * a stale closure. Fail-closed: an unset CRON_AUTH_TOKEN authorises nobody.
 *
 * Header rather than the `?token=` query string used by admin-ops.ts: a query
 * string lands in access logs, proxy logs and browser history. Every uptime
 * monitor worth pointing at this can set a request header.
 */
function opsTokenAuthorised(request: FastifyRequest): boolean {
  const expected = process.env.CRON_AUTH_TOKEN ?? '';
  const raw = request.headers['x-ops-token'];
  const provided = Array.isArray(raw) ? raw[0] : raw;
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Admin session OR ops token. Either identifies an operator; nobody else gets
 * to enumerate which of this platform's integrations are switched off.
 */
export async function requireOpsOrAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (opsTokenAuthorised(request)) return;
  // Idempotent: `request.currentUser` is only ever set by middlewares/auth.ts
  // after a verified session, so re-running authenticateUser would be a second
  // Supabase round-trip for an identity we already have.
  if (!request.currentUser) {
    await authenticateUser(request, reply);
    // authenticateUser has already sent a 401 in this case — do not double-reply.
    if (!request.currentUser) return;
  }
  await requireRole('admin')(request, reply);
}

/**
 * NOTIF-03 — the one endpoint that answers "can this product reach anybody?".
 *
 * Every send path in the API is env-or-noop: no key, no send, `{skipped:true}`,
 * and the caller discards it. Measured on the running API, all four transports
 * were dark and nothing in the product said so — the magic-link route reported
 * the skip in an `info` string, the FCM probe answered `{ok:true,skipped:true}`,
 * and the web-push probe answered `{ok:true,sent:0}` with a real subscription
 * row present. An operator, a smoke test and the admin panel all read green
 * while a devotee who paid heard nothing, which arrives as a refund request
 * rather than an alert.
 *
 * ── Auth ────────────────────────────────────────────────────────────────────
 *
 * Admin session or ops token. This endpoint was originally shipped
 * unauthenticated, reasoning that it carries only booleans and that an external
 * uptime monitor must be able to read it. The second half is right and the
 * first does not follow: a public, precise map of which of a payments platform's
 * integrations are switched off is reconnaissance — it tells an unauthenticated
 * caller that magic-link email is dark (so sign-in falls back to a dev link),
 * that WhatsApp is dark (so no out-of-band confirmation of a booking will ever
 * contradict a forged one) and exactly which quarter of the day's 100-mail
 * allowance is left. The monitor keeps working via `x-ops-token`.
 *
 * ── Payload ─────────────────────────────────────────────────────────────────
 *
 * Booleans, small integers and fixed literals only. `requires` lists env var
 * NAMES from a frozen constant in lib/notification-channels.ts; no credential
 * value, prefix, mask, hash or length appears anywhere in the response. Pinned
 * by the leak canary in health-channels.auth.notif03.test.ts.
 *
 * ── Placement ───────────────────────────────────────────────────────────────
 *
 * A SIBLING of `/ready` rather than part of it — a dark WhatsApp channel must
 * not take the API out of the load balancer, so this never influences `/ready`.
 *
 * Always 200 for an authorised caller — the REPORT succeeded, and `ok` is the
 * field to alarm on. `/ops/scheduler` answers 503 when stale and the symmetry
 * is tempting, but these are different facts: a stale scheduler is a fault,
 * whereas a dark channel is a deployment-configuration state that is knowingly
 * true today. Anything under `/health/` gets wired into an uptime check sooner
 * or later, and a permanent red there is a red that stops being read.
 */
export async function healthChannelRoutes(server: FastifyInstance) {
  server.get('/channels', { preHandler: [requireOpsOrAdmin] }, async (_request, reply) => {
    return reply.send(getChannelStatus());
  });
}
