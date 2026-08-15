import { FastifyInstance } from 'fastify';
import { authenticateUser } from '../middlewares/auth.js';
import { sendPush, webPushConfig, PushSubscriptionPayload } from '../lib/web-push.js';
import { sendFcm, fcmConfig, isFcmRegistrationToken } from '../lib/fcm.js';
import { prisma } from '../lib/prisma.js';
import { listNotifications, recordNotification } from '../lib/notification-log.js';

/**
 * Web push subscription endpoints + the devotee notification centre.
 *
 *   GET  /                  → this devotee's notification history (NOTIF-14)
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
  /**
   * NOTIF-14 — the in-app notification centre.
   *
   * Seven candidate read endpoints (/notifications, /list, /inbox, /feed, /me,
   * /unread, /history) all 404'd on the live API, and no table recorded that a
   * notification had ever been attempted, so a devotee who missed a push had no
   * way to see it later and support could not answer "did the confirmation go
   * out?" for any booking.
   *
   * `available:false` means the log could not be READ — a different fact from
   * "you have no notifications", and the client must not render it as one.
   * `items: []` with `available:true` is the honest empty state and stays empty:
   * no sample rows, no placeholder history.
   */
  server.get('/', { preHandler: [authenticateUser] }, async (request, reply) => {
    const q = (request.query ?? {}) as { limit?: string; before?: string };
    const limit = Number(q.limit);
    const result = await listNotifications(request.currentUser!.id, {
      limit: Number.isFinite(limit) ? limit : undefined,
      before: q.before,
    });
    return reply.send({
      items: result.items,
      available: result.available,
      // Cursor for the next page, or null when this page is the end.
      nextBefore: result.items.length ? result.items[result.items.length - 1]!.createdAt : null,
    });
  });

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
    const sent = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => !r.ok && r.skipped).length;
    // NOTIF-03: a skip is not a delivery.
    //
    // This answered `{ok:true, sent:0, expired:0, failed:0}` against the live
    // API with a real subscription row present, because a transport that is
    // switched off returns `{ok:false, skipped:true}` and that counts as none
    // of the three buckets. The one endpoint whose entire job is to answer
    // "did that go out?" was answering yes for a product that had sent
    // nothing. Report the skip in its own bucket and never call it ok.
    return reply.send({
      ok: sent > 0,
      sent,
      skipped,
      expired: results.filter((r) => r.expired).length,
      failed: results.filter((r) => !r.ok && !r.expired && !r.skipped).length,
      reason: webPushConfig.enabled
        ? undefined
        : 'web push is not configured — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY',
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
    // NOTIF-07: refuse anything that is not an FCM registration token.
    //
    // apps/web/components/AartiOptIn.tsx posts `pushSubscription.endpoint` — a
    // Web Push URL — here, on the assumption that "the API treats both as
    // opaque strings". FCM does not: it answers INVALID_ARGUMENT, which the send
    // path used to classify as `expired` and DELETE, so the devotee's aarti
    // toggle went on, no reminder ever arrived, and the row that would have made
    // it diagnosable was gone by the next tick. Storing it and answering ok is
    // the dishonest option; the caller already surfaces a non-2xx to the user.
    if (!isFcmRegistrationToken(deviceToken)) {
      return reply.code(400).send({
        error:
          'deviceToken must be an FCM registration token, not a Web Push endpoint. For browser push use POST /notifications/subscribe with the full PushSubscription (endpoint + p256dh + auth).',
      });
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
    // NOTIF-03: same rule as /test above — a dark transport answers ok:false.
    // This returned `{ok:true, skipped:true}` on the live API, so the operator
    // probe for "can we push to phones?" read green while FCM had no
    // credentials at all.
    if (!model || !fcmConfig.enabled) {
      return reply.send({
        ok: false,
        skipped: true,
        sent: 0,
        reason: !fcmConfig.enabled
          ? 'FCM is not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY'
          : 'fcm_device_tokens is not migrated on this database',
      });
    }
    const rows = await model.findMany({ where: { userId: targetUserId }, select: { deviceToken: true } });
    if (rows.length === 0) return reply.code(404).send({ error: 'no devices for user' });
    const expired: string[] = [];
    let sent = 0;
    let failed = 0;
    let invalid = 0;
    for (const r of rows) {
      const result = await sendFcm(r.deviceToken, {
        title: body.title ?? 'Darshya',
        body: body.body ?? 'Test push',
        data: body.url ? { url: body.url } : undefined,
      });
      if (result.ok) sent++;
      else if (result.expired) expired.push(r.deviceToken);
      // NOTIF-07: a malformed token is a registration-path bug, not a dead
      // device. Counted and reported, never deleted — deleting it is what made
      // the stuck aarti toggle impossible to diagnose.
      else if (result.invalidToken) invalid++;
      else if (!result.skipped) failed++;
    }
    if (expired.length) await model.deleteMany({ where: { deviceToken: { in: expired } } });
    return reply.send({ ok: failed === 0 && invalid === 0, sent, expired: expired.length, invalid, failed });
  });
}

/**
 * Helper used by other routes (e.g. booking confirmed → notify devotee).
 * Returns count of successful sends; silently drops expired endpoints.
 */
/**
 * NOTIF-14: what to write to `notification_log` for this push.
 *
 * Defaults on purpose. A new caller of `notifyUser` gets a durable record
 * without having to remember one, because the finding's whole shape was that
 * every send path was fire-and-forget with the result discarded — an opt-IN
 * would reproduce it for the next fifteen call sites the way it did for the
 * last fifteen.
 *
 * `record: false` exists for exactly one caller: `booking-notify.service`
 * writes the richer three-channel row itself, so recording here as well would
 * put two entries in the devotee's own notification centre for one event.
 */
export interface NotifyUserMeta {
  /** What happened, in the log's vocabulary. Defaults to a generic 'push'. */
  event?: string;
  audience?: 'devotee' | 'priest';
  bookingId?: string | null;
  /** Set false when the caller writes its own multi-channel row. */
  record?: boolean;
}

export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
  meta: NotifyUserMeta = {},
): Promise<number> {
  const shouldRecord = meta.record !== false;
  // Written whatever the outcome — including "there was nowhere to send it",
  // which is the answer support most often needs and the one the old code
  // could not distinguish from success.
  const log = async (push: 'sent' | 'failed' | 'no-target'): Promise<void> => {
    if (!shouldRecord) return;
    try {
      await recordNotification({
        userId,
        audience: meta.audience ?? 'devotee',
        event: meta.event ?? 'push',
        bookingId: meta.bookingId ?? null,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
        push,
        // This helper only owns the push leg. Saying 'no-target' for the other
        // two is the honest reading: nothing was attempted on them here.
        whatsapp: 'no-target',
        email: 'no-target',
        delivered: push === 'sent',
      });
    } catch {
      // The log is best-effort by contract (lib/notification-log.ts). A missing
      // table must never cost a devotee their notification.
    }
  };

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
  if (!subs.length) {
    await log('no-target');
    return 0;
  }
  const results = await Promise.all(subs.map((s) => sendPush(s, payload)));
  // Drop expired endpoints from BOTH stores.
  const expired = subs.filter((_, i) => results[i]?.expired);
  for (const e of expired) {
    await prisma.pushSubscription.deleteMany({ where: { endpoint: e.endpoint } }).catch(() => undefined);
  }
  const stillValid = subs.filter((_, i) => !results[i]?.expired);
  if (stillValid.length !== subs.length) subsByUser.set(userId, stillValid);
  const delivered = results.filter((r) => r.ok).length;
  await log(delivered > 0 ? 'sent' : 'failed');
  return delivered;
}
