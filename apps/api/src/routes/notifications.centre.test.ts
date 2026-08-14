import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (request: any, reply: any) => {
    if (!request.headers.authorization) {
      reply.code(401).send({ error: 'Missing or invalid Authorization header' });
      return;
    }
    request.currentUser = { id: 'user-uuid-1', roles: ['DEVOTEE'] };
  },
}));

const listNotifications = vi.fn();
vi.mock('../lib/notification-log.js', () => ({
  listNotifications: (...a: unknown[]) => listNotifications(...a),
  recordNotification: vi.fn(),
}));

vi.mock('../lib/web-push.js', () => ({
  sendPush: vi.fn(),
  webPushConfig: { enabled: false, publicKey: '' },
}));
vi.mock('../lib/fcm.js', () => ({
  sendFcm: vi.fn(),
  fcmConfig: { enabled: false, projectId: '' },
  isFcmRegistrationToken: (t: string) => !/^https?:/i.test(t) && t.length >= 60,
}));

import Fastify from 'fastify';
import { notificationRoutes } from './notifications.js';

async function buildApp() {
  const app = Fastify();
  await app.register(notificationRoutes, { prefix: '/notifications' });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
  listNotifications.mockResolvedValue({ items: [], available: true });
});

/**
 * NOTIF-14 — there was no in-app notification centre and no record that any
 * notification was ever attempted. Seven candidate read endpoints all 404'd
 * against the live API. A devotee who missed a push had no bell, no history,
 * nothing; support could not answer "did the confirmation go out?".
 */
describe('GET /notifications — the devotee notification centre (NOTIF-14)', () => {
  it('no longer 404s', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: 'Bearer t' },
    });
    expect(res.statusCode).toBe(200);
  });

  it('returns only the caller’s own history', async () => {
    const app = await buildApp();
    listNotifications.mockResolvedValue({
      items: [
        {
          id: 'n1',
          event: 'confirmed',
          bookingId: 'bk-1',
          title: 'Booking confirmed',
          body: 'Satyanarayan Puja is confirmed for 2026-08-20.',
          url: '/bookings/bk-1',
          channels: { push: 'sent', whatsapp: 'skipped', email: 'no-target' },
          delivered: true,
          createdAt: '2026-08-12T05:00:00.000Z',
        },
      ],
      available: true,
    });

    const res = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: 'Bearer t' },
    });

    expect(listNotifications).toHaveBeenCalledWith('user-uuid-1', expect.anything());
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].channels.whatsapp).toBe('skipped');
  });

  it('renders an honest empty state, never a fixture', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: 'Bearer t' },
    });
    const body = res.json();
    expect(body.items).toEqual([]);
    expect(body.available).toBe(true);
  });

  it('distinguishes "no history" from "history unavailable"', async () => {
    const app = await buildApp();
    listNotifications.mockResolvedValue({ items: [], available: false });
    const res = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: { authorization: 'Bearer t' },
    });
    expect(res.json().available).toBe(false);
  });

  it('requires authentication', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/notifications' });
    expect(res.statusCode).toBe(401);
  });
});

/**
 * NOTIF-07 — the web opt-in registers a Web Push endpoint URL as an FCM device
 * token. FCM cannot deliver to it, and the first aarti send used to DELETE the
 * row, so the toggle could not even be diagnosed as stuck-on. The API must
 * refuse the write instead of storing something undeliverable and reporting ok.
 */
describe('POST /notifications/register-token rejects a non-FCM token (NOTIF-07)', () => {
  it('400s on a Web Push endpoint URL', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/notifications/register-token',
      headers: { authorization: 'Bearer t' },
      payload: {
        deviceToken: 'https://fcm.googleapis.com/fcm/send/eXaMpLe:APA91bF_fake_suffix',
        platform: 'web',
      },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/registration token/i);
  });

  it('still accepts a real FCM registration token', async () => {
    const upsert = vi.fn().mockResolvedValue({ id: 'row-1' });
    (prismaMock as any).fcmDeviceToken = { upsert };
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/notifications/register-token',
      headers: { authorization: 'Bearer t' },
      payload: { deviceToken: 'a'.repeat(150), platform: 'android' },
    });
    expect(res.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
