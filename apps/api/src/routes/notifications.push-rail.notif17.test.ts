import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * NOTIF-17 — end-to-end on the write path: the token apps/mobile mints must be
 * ACCEPTED by `POST /notifications/register-token`.
 *
 * This is the regression guard whose absence let the mismatch ship. The client
 * has always produced `ExponentPushToken[…]` while the route validated with
 * `isFcmRegistrationToken` (>= 60 chars, no brackets), so the very first
 * registration attempt from any phone — iOS or Android — was answered 400 and
 * the whole feature was structurally dead.
 *
 * lib/fcm.js is deliberately NOT mocked here: the point is to exercise the real
 * validator that production runs, not a stand-in that could agree with the
 * route while disagreeing with the sender.
 */

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

vi.mock('../lib/notification-log.js', () => ({
  listNotifications: vi.fn(async () => ({ items: [], available: true })),
  recordNotification: vi.fn(),
}));

vi.mock('../lib/web-push.js', () => ({
  sendPush: vi.fn(),
  webPushConfig: { enabled: false, publicKey: '' },
}));

import Fastify from 'fastify';
import { notificationRoutes } from './notifications.js';

/** Verbatim `getExpoPushTokenAsync()` output — same on iOS and on Android. */
const EXPO_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
const WEB_PUSH_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/eXaMpLe:APA91bF_fake_suffix';

async function buildApp() {
  const app = Fastify();
  await app.register(notificationRoutes, { prefix: '/notifications' });
  return app;
}

function register(app: Awaited<ReturnType<typeof buildApp>>, payload: unknown) {
  return app.inject({
    method: 'POST',
    url: '/notifications/register-token',
    headers: { authorization: 'Bearer t' },
    payload: payload as Record<string, unknown>,
  });
}

let upsert: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  upsert = vi.fn().mockResolvedValue({ id: 'row-1' });
  (prismaMock as any).fcmDeviceToken = { upsert };
});

describe('POST /notifications/register-token accepts the mobile Expo token (NOTIF-17)', () => {
  for (const platform of ['android', 'ios'] as const) {
    it(`stores an Expo push token registered from ${platform}`, async () => {
      const app = await buildApp();
      const res = await register(app, { deviceToken: EXPO_TOKEN, platform, aartiOptIn: true });

      expect(res.statusCode).toBe(200);
      expect(res.json().ok).toBe(true);
      expect(upsert).toHaveBeenCalledTimes(1);
      const args = upsert.mock.calls[0]![0] as { where: { deviceToken: string } };
      // Stored verbatim — the sender dispatches on this exact shape.
      expect(args.where.deviceToken).toBe(EXPO_TOKEN);
    });
  }

  it('trims surrounding whitespace before validating and storing', async () => {
    const app = await buildApp();
    const res = await register(app, { deviceToken: `  ${EXPO_TOKEN}  `, platform: 'ios' });
    expect(res.statusCode).toBe(200);
    const args = upsert.mock.calls[0]![0] as { where: { deviceToken: string } };
    expect(args.where.deviceToken).toBe(EXPO_TOKEN);
  });

  it('still accepts a raw FCM registration token on the other rail', async () => {
    const app = await buildApp();
    const res = await register(app, { deviceToken: 'a'.repeat(150), platform: 'android' });
    expect(res.statusCode).toBe(200);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});

describe('POST /notifications/register-token still refuses undeliverable tokens (NOTIF-07)', () => {
  it('400s on a Web Push endpoint URL', async () => {
    const app = await buildApp();
    const res = await register(app, { deviceToken: WEB_PUSH_ENDPOINT, platform: 'web' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/registration token/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('400s on a serialised PushSubscription', async () => {
    const app = await buildApp();
    const res = await register(app, {
      deviceToken: JSON.stringify({ endpoint: WEB_PUSH_ENDPOINT, keys: { p256dh: 'x' } }),
      platform: 'web',
    });
    expect(res.statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('400s on a bracketed-but-empty token — the union must not accept garbage', async () => {
    const app = await buildApp();
    const res = await register(app, { deviceToken: 'ExponentPushToken[]', platform: 'android' });
    expect(res.statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('400s on an Expo token claiming to come from the web', async () => {
    // A browser cannot mint one; recording it as `web` would send the daily
    // blast down the wrong rail for that row.
    const app = await buildApp();
    const res = await register(app, { deviceToken: EXPO_TOKEN, platform: 'web' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/web/i);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('400s with the platform message on an unknown platform (zod boundary)', async () => {
    const app = await buildApp();
    const res = await register(app, { deviceToken: EXPO_TOKEN, platform: 'windows-phone' });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/platform must be ios\|android\|web/);
  });

  it('400s when deviceToken is missing entirely', async () => {
    const app = await buildApp();
    const res = await register(app, { platform: 'android' });
    expect(res.statusCode).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });
});
