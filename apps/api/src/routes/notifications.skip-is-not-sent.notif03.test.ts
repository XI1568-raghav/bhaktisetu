import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// Both transports dark, which is production's current state and the exact
// condition under which the two probes used to answer success.
vi.mock('../lib/web-push.js', () => ({
  webPushConfig: { enabled: false, publicKey: '' },
  sendPush: vi.fn(async () => ({ ok: false, skipped: true })),
}));
vi.mock('../lib/fcm.js', () => ({
  fcmConfig: { enabled: false, projectId: '' },
  sendFcm: vi.fn(async () => ({ ok: false, skipped: true })),
  isFcmRegistrationToken: (t: string) => !t.startsWith('http'),
  // NOTIF-17: the route now dispatches on token shape.
  isExpoPushToken: (t: string) => /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,128}\]$/.test(t),
  isPushToken: (t: string) =>
    /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,128}\]$/.test(t) || !t.startsWith('http'),
}));
vi.mock('../lib/notification-log.js', () => ({
  recordNotification: vi.fn(async () => undefined),
  listNotifications: vi.fn(async () => ({ items: [], available: true })),
}));
vi.mock('../middlewares/auth.js', () => ({
  authenticateUser: async (req: { currentUser?: unknown }) => {
    req.currentUser = {
      id: 'user-demo-devotee-1',
      email: 'devotee@demo.com',
      phone: null,
      fullName: 'Demo Devotee',
      subscriptionTier: 'free',
      blocked: false,
      roles: ['devotee'],
    };
  },
}));

import Fastify from 'fastify';
import { notificationRoutes } from './notifications.js';

/**
 * NOTIF-03, second half — a SKIP MUST NOT LOOK LIKE A DELIVERY.
 *
 * Against the running API with a real subscription row persisted for the user:
 *   POST /notifications/test      -> {"ok":true,"sent":0,"expired":0,"failed":0}
 *   POST /notifications/test-fcm  -> {"ok":true,"skipped":true,...}
 *
 * sendPush's `{ok:false, skipped:true}` counts as neither sent, expired, nor
 * failed, so the diagnostic endpoint built to answer "did that go out?"
 * answered yes. These two assertions are the whole finding: the probes must
 * report `ok:false` with a reason when the transport cannot deliver.
 */

async function buildApp() {
  const app = Fastify({ logger: false });
  app.decorateRequest('currentUser', undefined);
  await app.register(notificationRoutes, { prefix: '/notifications' });
  await app.ready();
  return app;
}

describe('NOTIF-03 — an unconfigured transport never answers ok', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.pushSubscription.upsert.mockResolvedValue({ id: 'sub-1' } as never);
  });

  it('POST /notifications/test says web push is not configured instead of ok', async () => {
    const app = await buildApp();

    // Register a subscription so the endpoint gets past its "no subscriptions"
    // guard and reaches the send — the state the sweep measured.
    await app.inject({
      method: 'POST',
      url: '/notifications/subscribe',
      payload: {
        subscription: {
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
          keys: { p256dh: 'p', auth: 'a' },
        },
      },
    });

    const res = await app.inject({ method: 'POST', url: '/notifications/test', payload: {} });
    const body = res.json();

    expect(body.ok).toBe(false);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(String(body.reason)).toMatch(/not configured/i);

    await app.close();
  });

  it('POST /notifications/test-fcm says FCM is not configured instead of ok', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/notifications/test-fcm', payload: {} });
    const body = res.json();

    expect(body.ok).toBe(false);
    expect(body.skipped).toBe(true);
    expect(String(body.reason)).toMatch(/not configured/i);

    await app.close();
  });
});
