import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendPushMock = vi.fn();
// The transport is CONFIGURED here. NOTIF-03's first half covered the dark
// transport; this file is about the probe disagreeing with the real send path
// while the transport works, which is the case an operator actually debugs.
vi.mock('../lib/web-push.js', () => ({
  webPushConfig: { enabled: true, publicKey: 'vapid-public' },
  sendPush: (...a: unknown[]) => sendPushMock(...a),
}));
vi.mock('../lib/fcm.js', () => ({
  fcmConfig: { enabled: false, projectId: '' },
  sendFcm: vi.fn(async () => ({ ok: false, skipped: true })),
  isFcmRegistrationToken: (t: string) => !/^https?:/i.test(t) && t.length >= 60,
  // NOTIF-17: the route now dispatches on token shape.
  isExpoPushToken: (t: string) => /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,128}\]$/.test(t),
  isPushToken: (t: string) =>
    /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,128}\]$/.test(t) ||
    (!/^https?:/i.test(t) && t.length >= 60),
}));
vi.mock('../lib/notification-log.js', () => ({
  recordNotification: vi.fn(async () => true),
  listNotifications: vi.fn(async () => ({ items: [], available: true })),
}));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (req: { currentUser?: unknown }) => {
    req.currentUser = { id: 'user-uuid-1', roles: ['devotee'] };
  },
}));

import Fastify from 'fastify';
import { notificationRoutes } from './notifications.js';

/**
 * NOTIF-03, third half — THE PROBE MUST READ THE SAME SUBSCRIPTIONS THE
 * PRODUCT SENDS TO.
 *
 * `POST /notifications/test` is the one endpoint whose entire job is to answer
 * "can we reach this devotee?". It read ONLY the in-process `subsByUser` map.
 * `notifyUser` — every real notification in the product — reads persisted
 * `pushSubscription` rows merged with that map, which is the whole point of the
 * Phase-2 persistence work ("was in-memory only, lost on restart — which is why
 * the daily panchang blast had no audience").
 *
 * So the two disagree the moment the process restarts, and Render restarts on
 * every deploy and every idle spin-down:
 *
 *   - the devotee's subscription row is in the database;
 *   - `notifyUser` finds it and delivers;
 *   - `POST /notifications/test` answers 404 "No subscriptions for this user".
 *
 * That is the same defect NOTIF-03 fixed, with the sign flipped. The first half
 * stopped the probe claiming success when nothing was sent; this stops it
 * claiming there is nobody to send to while the product is delivering fine. A
 * probe that lies in the pessimistic direction is not the safe kind of wrong:
 * it sends whoever is debugging a missed notification off to re-subscribe a
 * browser that was never unsubscribed, and it makes the persisted subscription
 * look like it did not take.
 *
 * Second defect, same cause: `/test` prunes expired endpoints from the map only.
 * `notifyUser` deletes them from the table. An endpoint that the probe proves is
 * dead therefore stays in the database and is retried by every real send after
 * it, forever.
 */

const PERSISTED = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/persisted-endpoint',
  p256dh: 'persisted-p256dh',
  auth: 'persisted-auth',
  createdAt: new Date('2026-08-01T00:00:00Z'),
};

async function buildApp() {
  const app = Fastify({ logger: false });
  app.decorateRequest('currentUser', undefined);
  await app.register(notificationRoutes, { prefix: '/notifications' });
  await app.ready();
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  sendPushMock.mockResolvedValue({ ok: true });
  prismaMock.pushSubscription.findMany.mockResolvedValue([PERSISTED] as never);
  prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 1 } as never);
  prismaMock.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' } as never);
});

describe('NOTIF-03 — the push probe reads persisted subscriptions', () => {
  it('finds a subscription that only exists in the database', async () => {
    // A fresh process: nothing has called /subscribe, so `subsByUser` is empty.
    // This is every request after a deploy, and the devotee is subscribed.
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/notifications/test', payload: {} });

    expect(
      res.statusCode,
      'the row is in the database and notifyUser would deliver to it',
    ).toBe(200);
    expect(res.json().sent).toBe(1);
    expect(sendPushMock).toHaveBeenCalledTimes(1);
    expect((sendPushMock.mock.calls[0]![0] as { endpoint: string }).endpoint).toBe(
      PERSISTED.endpoint,
    );

    await app.close();
  });

  it('still 404s when the devotee genuinely has no subscription anywhere', async () => {
    // The honest 404. Widening the read must not turn "nobody to send to" into
    // a false success — that is the NOTIF-03 defect this file guards.
    prismaMock.pushSubscription.findMany.mockResolvedValue([] as never);
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/notifications/test', payload: {} });

    expect(res.statusCode).toBe(404);
    expect(sendPushMock).not.toHaveBeenCalled();

    await app.close();
  });

  it('deletes an endpoint it proved expired from the table, not just the map', async () => {
    // notifyUser prunes the table on an expired push. The probe must too, or the
    // dead row it just diagnosed outlives the diagnosis and every later real
    // send retries it.
    sendPushMock.mockResolvedValue({ ok: false, expired: true });
    const app = await buildApp();

    const res = await app.inject({ method: 'POST', url: '/notifications/test', payload: {} });

    expect(res.json().expired).toBe(1);
    expect(
      prismaMock.pushSubscription.deleteMany,
      'the expired row survives in the database and is retried forever',
    ).toHaveBeenCalledWith({ where: { endpoint: PERSISTED.endpoint } });

    await app.close();
  });

  it('does not double-count a subscription held in both stores', async () => {
    // /subscribe writes the row AND the map. The merge must dedupe by endpoint,
    // or the probe reports two sends for one browser.
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/notifications/subscribe',
      payload: {
        subscription: {
          endpoint: PERSISTED.endpoint,
          keys: { p256dh: PERSISTED.p256dh, auth: PERSISTED.auth },
        },
      },
    });

    const res = await app.inject({ method: 'POST', url: '/notifications/test', payload: {} });

    expect(res.json().sent).toBe(1);
    expect(sendPushMock).toHaveBeenCalledTimes(1);

    await app.close();
  });
});
