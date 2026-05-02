import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import {
  broadcastToWaitlist,
  broadcastToBookingHolders,
  broadcastToAll,
  recentDeliveries,
  recordOptOut,
} from '../services/whatsapp-broadcast.service.js';

/**
 * Two route groups:
 *
 *   POST /api/v1/admin/whatsapp/broadcast   (admin only) — trigger a send
 *   GET  /api/v1/admin/whatsapp/deliveries  (admin only) — last N audit rows
 *   GET  /api/v1/whatsapp/webhook           — Meta webhook verification
 *   POST /api/v1/whatsapp/webhook           — inbound message + STOP handler
 *
 * Webhook signature verification uses WHATSAPP_WEBHOOK_TOKEN (the verify
 * token configured in Meta dashboard) and WHATSAPP_APP_SECRET (the app
 * secret used to HMAC-SHA256 the body — `X-Hub-Signature-256: sha256=...`).
 * If either env is unset the webhook still 200s but signature is logged
 * as "unverified" — keeps dev frictionless.
 */

const broadcastBodySchema = z.object({
  audience: z.enum(['waitlist', 'bookings', 'all']),
  templateName: z.string().min(1).max(120),
  languageCode: z.string().min(2).max(8).optional(),
  variables: z.array(z.string().max(500)).max(10).optional(),
});

const STOP_KEYWORDS = /^(stop|unsubscribe|opt[-\s]?out|cancel|अनसब्सक्राइब|बंद|रोको)$/i;

export async function whatsappBroadcastRoutes(server: FastifyInstance): Promise<void> {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  server.post(
    '/broadcast',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = broadcastBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
      }
      const { audience, templateName, languageCode, variables } = parsed.data;
      const triggeredBy = request.currentUser?.id;
      try {
        const result =
          audience === 'waitlist'
            ? await broadcastToWaitlist({ templateName, languageCode, variables, triggeredBy })
            : audience === 'bookings'
              ? await broadcastToBookingHolders({ templateName, languageCode, variables, triggeredBy })
              : await broadcastToAll({ templateName, languageCode, variables, triggeredBy });
        request.log.info({ result }, 'whatsapp broadcast complete');
        return reply.send({ ok: true, result });
      } catch (err) {
        request.log.error({ err }, 'whatsapp broadcast failed');
        return reply.code(500).send({
          error: 'broadcast_failed',
          message: err instanceof Error ? err.message : 'unknown',
        });
      }
    }
  );

  server.get(
    '/deliveries',
    { preHandler: adminPreHandlers },
    async (request) => {
      const limit = Number((request.query as { limit?: string }).limit ?? '100') || 100;
      const rows = await recentDeliveries(limit);
      return { deliveries: rows };
    }
  );
}

interface WebhookValue {
  messages?: Array<{
    from?: string;
    text?: { body?: string };
    button?: { text?: string };
    interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  }>;
}

interface WebhookEntry {
  changes?: Array<{ value?: WebhookValue }>;
}

interface WebhookBody {
  entry?: WebhookEntry[];
}

function verifySignature(rawBody: string | undefined, signature: string | undefined): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature || !rawBody) return false;
  const expected =
    'sha256=' +
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function whatsappWebhookRoutes(server: FastifyInstance): Promise<void> {
  // GET /webhook — Meta calls this to verify the endpoint when you set the
  // webhook URL in the dashboard. We echo back hub.challenge if the token
  // matches WHATSAPP_WEBHOOK_TOKEN.
  server.get('/webhook', async (request, reply) => {
    const q = request.query as {
      'hub.mode'?: string;
      'hub.verify_token'?: string;
      'hub.challenge'?: string;
    };
    const expected = process.env.WHATSAPP_WEBHOOK_TOKEN;
    if (q['hub.mode'] === 'subscribe' && expected && q['hub.verify_token'] === expected) {
      return reply.code(200).send(q['hub.challenge'] ?? '');
    }
    return reply.code(403).send({ error: 'verification_failed' });
  });

  // POST /webhook — inbound messages. Always 200 to avoid Meta retry storm.
  server.post(
    '/webhook',
    { config: { rawBody: true } },
    async (request) => {
      const sig = request.headers['x-hub-signature-256'];
      const sigStr = Array.isArray(sig) ? sig[0] : sig;
      const raw = (request as unknown as { rawBody?: string }).rawBody;
      const verified = verifySignature(raw, sigStr);
      if (!verified && process.env.WHATSAPP_APP_SECRET) {
        request.log.warn('whatsapp webhook signature mismatch');
        return { ok: true, ignored: true };
      }
      const body = (request.body ?? {}) as WebhookBody;
      try {
        for (const entry of body.entry ?? []) {
          for (const change of entry.changes ?? []) {
            for (const msg of change.value?.messages ?? []) {
              const from = msg.from;
              const text =
                msg.text?.body ??
                msg.button?.text ??
                msg.interactive?.button_reply?.title ??
                msg.interactive?.list_reply?.title ??
                '';
              if (!from) continue;
              const trimmed = text.trim();
              if (STOP_KEYWORDS.test(trimmed)) {
                await recordOptOut({
                  phone: from,
                  reason: trimmed.slice(0, 200),
                  source: 'webhook',
                });
                request.log.info({ from }, 'whatsapp opt-out recorded');
              }
            }
          }
        }
      } catch (err) {
        request.log.warn({ err }, 'whatsapp webhook processing failed');
      }
      return { ok: true };
    }
  );
}
