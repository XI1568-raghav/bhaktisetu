import { describe, it, expect, vi, beforeEach } from 'vitest';
import Fastify from 'fastify';

/**
 * NOTIF-03 — the product could not tell you its outbound channels were dark.
 *
 * Measured against the live API: every send path is env-or-noop, and the two
 * diagnostic endpoints built for exactly this question both answered success.
 * `POST /notifications/test` returned `{ok:true, sent:0, expired:0, failed:0}`
 * with a real subscription row present, because sendPush's skip is counted as
 * none of the three. `POST /notifications/test-fcm` returned
 * `{ok:true, skipped:true}`. No endpoint anywhere reported channel readiness.
 *
 * So an operator, a smoke test and the admin panel all saw green while a
 * devotee who paid heard nothing.
 *
 * Two guarantees are asserted here:
 *   1. A readiness endpoint exists and reports each channel truthfully.
 *   2. A skip is never `ok:true`. "Unconfigured" and "delivered" must not be
 *      the same response.
 */

function envSnapshot(keys: string[]): Record<string, string | undefined> {
  return Object.fromEntries(keys.map((k) => [k, process.env[k]]));
}

const CHANNEL_ENV = [
  'RESEND_API_KEY',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
];

describe('NOTIF-03 — channel readiness is reportable and a skip is never ok', () => {
  const original = envSnapshot(CHANNEL_ENV);

  beforeEach(() => {
    vi.resetModules();
    for (const [k, v] of Object.entries(original)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('GET /health/channels reports every channel as unconfigured when no keys are set', async () => {
    for (const k of CHANNEL_ENV) delete process.env[k];

    const { healthChannelRoutes } = await import('./health-channels.js');
    const app = Fastify({ logger: false });
    await app.register(healthChannelRoutes, { prefix: '/health' });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/health/channels' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.channels).toEqual({
      email: false,
      whatsapp: false,
      webPush: false,
      fcm: false,
    });
    // With nothing configured the product is silent — the endpoint must say so
    // rather than answering 200/ok the way every other probe does.
    expect(body.ok).toBe(false);
    expect(body.unconfigured).toEqual(
      expect.arrayContaining(['email', 'whatsapp', 'webPush', 'fcm']),
    );

    await app.close();
  });

  it('reports a channel as ready once its keys are present', async () => {
    for (const k of CHANNEL_ENV) delete process.env[k];
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_ACCESS_TOKEN = 'tok';

    const { healthChannelRoutes } = await import('./health-channels.js');
    const app = Fastify({ logger: false });
    await app.register(healthChannelRoutes, { prefix: '/health' });
    await app.ready();

    const body = (await app.inject({ method: 'GET', url: '/health/channels' })).json();
    expect(body.channels.email).toBe(true);
    expect(body.channels.whatsapp).toBe(true);
    expect(body.channels.webPush).toBe(false);
    expect(body.unconfigured).not.toContain('email');
    expect(body.unconfigured).toContain('webPush');

    await app.close();
  });

  it('carries the SCAL-11 daily email counters so the cap is visible before it bites', async () => {
    for (const k of CHANNEL_ENV) delete process.env[k];

    const { healthChannelRoutes } = await import('./health-channels.js');
    const app = Fastify({ logger: false });
    await app.register(healthChannelRoutes, { prefix: '/health' });
    await app.ready();

    const body = (await app.inject({ method: 'GET', url: '/health/channels' })).json();
    expect(body.email).toMatchObject({
      cap: expect.any(Number),
      warnAt: expect.any(Number),
      sent: expect.any(Number),
    });

    await app.close();
  });
});
