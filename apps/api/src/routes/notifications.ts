import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { sendPush, webPushConfig, PushSubscriptionPayload } from '../lib/web-push.js';
import { sendFcm, fcmConfig } from '../lib/fcm.js';
import { prisma } from '../lib/prisma.js';

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

    // Cross-cutting Phase 2: PERSIST the subscription (was in-memory only, lost
    // on restart — which is why the daily panchang blast had no audience).
    // Upsert on endpoint so re-subscribing the same browser is idempotent.
    try {
      await prisma.pushSubscription.upsert({
        where: { endpoint: sub.endpoint },
        create: {
          userId,
          endpoint: sub.endpoint,
          p256dh: sub.keys.p256dh,
          auth: sub.keys.auth,
        },
        update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      });
    } catch (err) {
      // Best-effort: fall back to in-memory so push still works pre-migration.
      request.log.warn({ err }, 'pushSubscription persist failed; in-memory only');
    }

    const existing = subsByUser.get(userId) ?? [];
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
    try {
      await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
    } catch { /* best-effort */ }
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

  // ──────────────────────────────────────────────────────────────────────────
  // FCM device tokens (mobile + web). Stored in Prisma so Render can spin
  // multiple instances without losing subscriptions.
  // ──────────────────────────────────────────────────────────────────────────

  server.post('/register-token', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      deviceToken?: string;
      platform?: string;
      language?: string;
      aartiOptIn?: boolean;
    };
    const deviceToken = body.deviceToken?.trim();
    const platform = body.platform;
    if (!deviceToken) return reply.code(400).send({ error: 'deviceToken required' });
    if (!platform || !['ios', 'android', 'web'].includes(platform)) {
      return reply.code(400).send({ error: 'platform must be ios|android|web' });
    }
    const userId = request.currentUser!.id;
    // Idempotent upsert on the unique deviceToken — re-registration overwrites
    // any prior owner (handles device handed between users / re-installs).
    type FcmTokenModel = {
      upsert: (args: unknown) => Promise<{ id: string }>;
    };
    const model = (prisma as unknown as { fcmDeviceToken?: FcmTokenModel }).fcmDeviceToken;
    if (!model) {
      // Migration not applied yet — graceful no-op so demo envs don't 500.
      return reply.send({ ok: true, skipped: true, reason: 'fcm_device_tokens not migrated' });
    }
    const row = await model.upsert({
      where: { deviceToken },
      create: {
        userId,
        deviceToken,
        platform,
        language: body.language ?? null,
        aartiOptIn: body.aartiOptIn ?? true,
      },
      update: {
        userId,
        platform,
        language: body.language ?? null,
        aartiOptIn: body.aartiOptIn ?? true,
      },
    });
    return reply.send({ ok: true, id: row.id });
  });

  server.post('/unregister-token', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as { deviceToken?: string };
    const deviceToken = body.deviceToken?.trim();
    if (!deviceToken) return reply.code(400).send({ error: 'deviceToken required' });
    const userId = request.currentUser!.id;
    type FcmTokenModel = {
      deleteMany: (args: { where: { deviceToken: string; userId: string } }) => Promise<{ count: number }>;
    };
    const model = (prisma as unknown as { fcmDeviceToken?: FcmTokenModel }).fcmDeviceToken;
    if (!model) return reply.send({ ok: true, skipped: true });
    const r = await model.deleteMany({ where: { deviceToken, userId } });
    return reply.send({ ok: true, removed: r.count });
  });

  server.post('/test-fcm', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as { userId?: string; title?: string; body?: string; url?: string };
    const caller = request.currentUser!;
    // Admin guard: any non-admin can only push to themselves.
    const isAdmin = (caller as { roles?: string[] }).roles?.includes('admin') ?? false;
    const targetUserId = body.userId && isAdmin ? body.userId : caller.id;

    type FcmTokenModel = {
      findMany: (args: { where: { userId: string }; select: { deviceToken: true } }) => Promise<Array<{ deviceToken: string }>>;
      deleteMany: (args: { where: { deviceToken: { in: string[] } } }) => Promise<{ count: number }>;
    };
    const model = (prisma as unknown as { fcmDeviceToken?: FcmTokenModel }).fcmDeviceToken;
    if (!model || !fcmConfig.enabled) {
      return reply.send({ ok: true, skipped: true, reason: !fcmConfig.enabled ? 'FCM not configured' : 'model missing' });
    }
    const rows = await model.findMany({ where: { userId: targetUserId }, select: { deviceToken: true } });
    if (rows.length === 0) return reply.code(404).send({ error: 'no devices for user' });
    const expired: string[] = [];
    let sent = 0;
    let failed = 0;
    for (const r of rows) {
      const result = await sendFcm(r.deviceToken, {
        title: body.title ?? 'Darshya',
        body: body.body ?? 'Test push',
        data: body.url ? { url: body.url } : undefined,
      });
      if (result.ok) sent++;
      else if (result.expired) expired.push(r.deviceToken);
      else if (!result.skipped) failed++;
    }
    if (expired.length) await model.deleteMany({ where: { deviceToken: { in: expired } } });
    return reply.send({ ok: true, sent, expired: expired.length, failed });
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
  // Cross-cutting Phase 2: read persisted subscriptions from the DB (the source
  // of truth now), falling back to the in-memory map for any not-yet-persisted
  // subs in the same process. This is what makes push survive a restart.
  let subs: StoredSub[] = subsByUser.get(userId) ?? [];
  try {
    const rows = await prisma.pushSubscription.findMany({ where: { userId } });
    const fromDb: StoredSub[] = rows.map((r) => ({
      endpoint: r.endpoint,
      keys: { p256dh: r.p256dh, auth: r.auth },
      createdAt: r.createdAt.getTime(),
    }));
    // Merge DB subs with any in-memory-only subs (dedupe by endpoint).
    const seen = new Set(fromDb.map((s) => s.endpoint));
    subs = [...fromDb, ...subs.filter((s) => !seen.has(s.endpoint))];
  } catch {
    // DB unavailable — use in-memory only.
  }
  if (!subs.length) return 0;
  const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
  // Drop expired endpoints from BOTH stores.
  const expired = subs.filter((_, i) => results[i]?.expired);
  for (const e of expired) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: e.endpoint } }).catch(() => undefined);
  }
  const stillValid = subs.filter((_, i) => !results[i]?.expired);
  if (stillValid.length !== subs.length) subsByUser.set(userId, stillValid);
  return results.filter((r) => r.ok).length;
}
