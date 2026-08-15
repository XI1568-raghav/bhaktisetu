import { FastifyInstance } from 'fastify';
import { emailConfig, getEmailQuotaSnapshot } from '../lib/email.js';
import { whatsapp } from '../lib/whatsapp.js';
import { webPushConfig } from '../lib/web-push.js';
import { fcmConfig } from '../lib/fcm.js';

export type ChannelName = 'email' | 'whatsapp' | 'webPush' | 'fcm';

export interface ChannelStatus {
  /** True only when EVERY outbound channel can actually deliver. */
  ok: boolean;
  channels: Record<ChannelName, boolean>;
  /** The channels that would silently no-op right now. */
  unconfigured: ChannelName[];
  /** SCAL-11: today's Resend counters, so the 100/day cap is visible early. */
  email: ReturnType<typeof getEmailQuotaSnapshot> & { enabled: boolean };
  checkedAt: string;
}

/** Readiness of the four outbound transports, derived from their own configs. */
export function getChannelStatus(): ChannelStatus {
  const channels: Record<ChannelName, boolean> = {
    email: emailConfig.enabled,
    whatsapp: whatsapp.enabled,
    webPush: webPushConfig.enabled,
    fcm: fcmConfig.enabled,
  };
  const unconfigured = (Object.keys(channels) as ChannelName[]).filter((c) => !channels[c]);
  return {
    ok: unconfigured.length === 0,
    channels,
    unconfigured,
    email: { ...getEmailQuotaSnapshot(), enabled: emailConfig.enabled },
    checkedAt: new Date().toISOString(),
  };
}

/**
 * NOTIF-03 — the one endpoint that answers "can this product reach anybody?".
 *
 * Every send path in the API is env-or-noop: no key, no send, `{skipped:true}`,
 * and the caller discards it. Measured on the running API, all four transports
 * were dark and nothing in the product said so — the magic-link route reported
 * the skip in a `info` string, the FCM probe answered `{ok:true,skipped:true}`,
 * and the web-push probe answered `{ok:true,sent:0}` with a real subscription
 * row present. An operator, a smoke test and the admin panel all read green
 * while a devotee who paid heard nothing, which arrives as a refund request
 * rather than an alert.
 *
 * Deliberately unauthenticated and payload-free, exactly like `/ops/scheduler`:
 * it exposes booleans and counters, never a key, a recipient or a message, and
 * an external uptime monitor has to be able to read it. It is a SIBLING of
 * `/ready` rather than part of it — a dark WhatsApp channel must not take the
 * API out of the load balancer, so this never influences `/ready`.
 *
 * Always 200 — the REPORT succeeded, and `ok` is the field to alarm on.
 * `/ops/scheduler` answers 503 when stale and the symmetry is tempting, but
 * these are different facts: a stale scheduler is a fault, whereas a dark
 * channel is a deployment-configuration state that is knowingly true today.
 * Anything under `/health/` gets wired into an uptime check sooner or later,
 * and a permanent red there is a red that stops being read.
 */
export async function healthChannelRoutes(server: FastifyInstance) {
  server.get('/channels', async (_request, reply) => {
    return reply.send(getChannelStatus());
  });
}
