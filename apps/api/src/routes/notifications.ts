import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { sendPush, webPushConfig, PushSubscriptionPayload } from '../lib/web-push.js';

/**
 * Web push subscription endpoints.
 *
 *   GET  /vapid-public-key  → returns the VAPID public key for the browser
 *   POST /subscribe         { subscription }      auth required
 *   POST /unsubscribe       { endpoint }          auth required
 *   POST /test              { title, body, url }  auth required — sends a
 *                                                  test notification to the
 *                                                  caller's stored subs
 *
 * Subscriptions are stored in-memory keyed by userId. Migrate to a
 * `push_subscriptions` Prisma table when scaling beyond a single Render
 * instance — schema is just (userId, endpoint, p256dh, auth, createdAt).
 */

interface StoredSub extends PushSubscriptionPayload {
  createdAt: number;
}

const subsByUser = new Map<string, StoredSub[]>();

export async function notificationRoutes(server: FastifyInstance) {
  server.get('/vapid-public-key', async (_request, reply) => {
    return reply.send({
      publicKey: webPushConfig.publicKey,
      enabled: webPushConfig.enabled,
    });
  });

  server.post('/subscribe', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as { subscription?: PushSubscriptionPayload };
    const sub = body.subscription;
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      return reply.code(400).send({ error: 'Invalid subscription payload' });
    }
    const userId = request.currentUser!.id;
    const existing = subsByUser.get(userId) ?? [];
    // Replace any existing entry for the same endpoint
    const filtered = existing.filter((s) => s.endpoint !== sub.endpoint);
    filtered.push({ ...sub, createdAt: Date.now() });
    subsByUser.set(userId, filtered);
    return reply.send({ ok: true, subscriptions: filtered.length });
  });

  server.post('/unsubscribe', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as { endpoint?: string };
    if (!body.endpoint) {
      return reply.code(400).send({ error: 'endpoint required' });
    }
    const userId = request.currentUser!.id;
    const existing = subsByUser.get(userId) ?? [];
    const filtered = existing.filter((s) => s.endpoint !== body.endpoint);
    subsByUser.set(userId, filtered);
    return reply.send({ ok: true, subscriptions: filtered.length });
  });

  server.post('/test', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as { title?: string; body?: string; url?: string };
    const userId = request.currentUser!.id;
    const subs = subsByUser.get(userId) ?? [];
    if (subs.length === 0) {
      return reply.code(404).send({ error: 'No subscriptions for this user' });
    }
    const results = await Promise.all(
      subs.map((s) =>
        sendPush(s, {
          title: body.title ?? 'Darshya',
          body: body.body ?? 'Test notification from Darshya',
          url: body.url ?? 'https://darshya.online',
        }),
      ),
    );
    // Drop expired subs
    const stillValid = subs.filter((_, i) => !results[i]?.expired);
    if (stillValid.length !== subs.length) {
      subsByUser.set(userId, stillValid);
    }
    return reply.send({
      ok: true,
      sent: results.filter((r) => r.ok).length,
      expired: results.filter((r) => r.expired).length,
      failed: results.filter((r) => !r.ok && !r.expired && !r.skipped).length,
    });
  });
}

/**
 * Helper used by other routes (e.g. booking confirmed → notify devotee).
 * Returns count of successful sends; silently drops expired endpoints.
 */
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<number> {
  const subs = subsByUser.get(userId);
  if (!subs?.length) return 0;
  const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
  const stillValid = subs.filter((_, i) => !results[i]?.expired);
  if (stillValid.length !== subs.length) subsByUser.set(userId, stillValid);
  return results.filter((r) => r.ok).length;
}
