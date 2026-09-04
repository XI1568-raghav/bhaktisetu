import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import webpush from 'web-push';

/**
 * NOTIF-03 — the channel-status surface must be operator-only, and must never
 * echo credential material.
 *
 * The readiness endpoint shipped unauthenticated. Booleans are not harmless
 * here: a public, precise map of which of a payments platform's integrations
 * are switched off tells an anonymous caller that magic-link email is dark (so
 * sign-in falls back to a dev link), that WhatsApp is dark (so no out-of-band
 * message will ever contradict a forged booking confirmation), and how much of
 * the day's 100-mail allowance is left to exhaust.
 *
 * Three guarantees are pinned here:
 *   1. Only an admin session or the ops token can read it. Fail-closed.
 *   2. The payload names env vars but never carries a credential VALUE — not a
 *      prefix, not a mask, not a length.
 *   3. It reports per-channel state honestly, including how much it can prove.
 */

const OPS_TOKEN = 'ops-token-canary-0123456789';

// Every env var the four transports read at module load, plus the ops token.
const MANAGED_ENV = [
  'RESEND_API_KEY',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'FCM_PROJECT_ID',
  'FCM_CLIENT_EMAIL',
  'FCM_PRIVATE_KEY',
  'EXPO_ACCESS_TOKEN',
  'CRON_AUTH_TOKEN',
  'ADMIN_EMAILS',
] as const;

const original: Record<string, string | undefined> = Object.fromEntries(
  MANAGED_ENV.map((k) => [k, process.env[k]]),
);

function clearManagedEnv(): void {
  for (const k of MANAGED_ENV) delete process.env[k];
}

function restoreEnv(): void {
  for (const [k, v] of Object.entries(original)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

/**
 * Credential-shaped values that must never appear in a response body. VAPID
 * keys are generated rather than invented because web-push validates their
 * shape at module load — which also makes the private key a genuine secret,
 * not a stand-in for one.
 */
const vapid = webpush.generateVAPIDKeys();
const CANARIES = {
  RESEND_API_KEY: 're_LEAKCANARY_resend_secret_value',
  WHATSAPP_ACCESS_TOKEN: 'EAALEAKCANARYwhatsappaccesstoken',
  WHATSAPP_PHONE_NUMBER_ID: '100000000000001',
  VAPID_PUBLIC_KEY: vapid.publicKey,
  VAPID_PRIVATE_KEY: vapid.privateKey,
  FCM_PROJECT_ID: 'leakcanary-project',
  FCM_CLIENT_EMAIL: 'leakcanary@leakcanary-project.iam.gserviceaccount.com',
  FCM_PRIVATE_KEY: 'LEAKCANARY_fcm_private_key_material',
  EXPO_ACCESS_TOKEN: 'LEAKCANARY_expo_access_token',
} as const;

function configureAllChannels(): void {
  for (const [k, v] of Object.entries(CANARIES)) process.env[k] = v;
}

interface FakeUser {
  id: string;
  roles: string[];
  email?: string;
}

async function buildApp(asUser?: FakeUser): Promise<FastifyInstance> {
  const { healthChannelRoutes } = await import('./health-channels.js');
  const app = Fastify({ logger: false });
  if (asUser) {
    // Stands in for middlewares/auth.ts having already verified a session —
    // `requireOpsOrAdmin` must honour an identity that is already present
    // rather than re-authenticating it.
    app.addHook('onRequest', async (request) => {
      (request as unknown as { currentUser: FakeUser }).currentUser = asUser;
    });
  }
  await app.register(healthChannelRoutes, { prefix: '/health' });
  await app.ready();
  return app;
}

/**
 * The first dynamic import here transpiles the route plus middlewares/auth plus
 * all four transports. Under the repo's 2-fork pool that took ~46s and blew the
 * 30s per-test budget, failing whichever `it` ran first for a reason unrelated
 * to its assertions. Pay the transform once, up front.
 */
beforeAll(async () => {
  await import('./health-channels.js');
}, 180_000);

describe('NOTIF-03 — GET /health/channels is operator-only', () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
    clearManagedEnv();
  });

  afterAll(restoreEnv);

  it('refuses an anonymous caller and tells it nothing about the channels', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    const app = await buildApp();

    const res = await app.inject({ method: 'GET', url: '/health/channels' });

    expect(res.statusCode).toBe(401);
    // Not merely "not 200" — the refusal must not leak the map either.
    expect(res.body).not.toContain('unconfigured');
    expect(res.body).not.toContain('RESEND_API_KEY');

    await app.close();
  });

  it('refuses a wrong ops token of the same length as the real one', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    const wrong = 'x'.repeat(OPS_TOKEN.length);
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/health/channels',
      headers: { 'x-ops-token': wrong },
    });

    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it('fails closed when CRON_AUTH_TOKEN is unset — an empty secret authorises nobody', async () => {
    delete process.env.CRON_AUTH_TOKEN;
    const app = await buildApp();

    for (const token of ['', 'anything', OPS_TOKEN]) {
      const res = await app.inject({
        method: 'GET',
        url: '/health/channels',
        headers: { 'x-ops-token': token },
      });
      expect(res.statusCode).toBe(401);
    }

    await app.close();
  });

  it('refuses an authenticated NON-admin', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    const app = await buildApp({ id: 'u1', roles: ['DEVOTEE'], email: 'devotee@example.com' });

    const res = await app.inject({ method: 'GET', url: '/health/channels' });

    expect(res.statusCode).toBe(403);
    expect(res.body).not.toContain('unconfigured');

    await app.close();
  });

  it('serves an admin session', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    const app = await buildApp({ id: 'a1', roles: ['ADMIN'], email: 'admin@example.com' });

    const res = await app.inject({ method: 'GET', url: '/health/channels' });

    expect(res.statusCode).toBe(200);
    expect(res.json().channels).toEqual({
      email: false,
      whatsapp: false,
      webPush: false,
      fcm: false,
    });

    await app.close();
  });

  it('serves a machine caller holding the ops token', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    const app = await buildApp();

    const res = await app.inject({
      method: 'GET',
      url: '/health/channels',
      headers: { 'x-ops-token': OPS_TOKEN },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(false);
    expect(body.unconfigured).toEqual(['email', 'whatsapp', 'webPush', 'fcm']);

    await app.close();
  });
});

describe('NOTIF-03 — the status payload reports state without leaking secrets', () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
    clearManagedEnv();
  });

  afterAll(restoreEnv);

  it('reports per-channel state, what it requires, and how much it can prove', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    const app = await buildApp();

    const body = (
      await app.inject({
        method: 'GET',
        url: '/health/channels',
        headers: { 'x-ops-token': OPS_TOKEN },
      })
    ).json();

    expect(body.detail.email).toMatchObject({
      state: 'not_configured',
      configured: false,
      requires: ['RESEND_API_KEY'],
      evidence: 'runtime-counters',
    });
    expect(body.detail.whatsapp).toMatchObject({
      state: 'not_configured',
      configured: false,
      requires: ['WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'],
      // Honest about the limit of the claim: nothing here records deliveries.
      evidence: 'config-only',
    });
    expect(body.detail.webPush.requires).toEqual(['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']);
    expect(body.detail.fcm.requires).toEqual([
      'FCM_PROJECT_ID',
      'FCM_CLIENT_EMAIL',
      'FCM_PRIVATE_KEY',
    ]);

    await app.close();
  });

  it('flips a channel to configured only once its own credentials are present', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    process.env.RESEND_API_KEY = CANARIES.RESEND_API_KEY;
    process.env.WHATSAPP_PHONE_NUMBER_ID = CANARIES.WHATSAPP_PHONE_NUMBER_ID;
    process.env.WHATSAPP_ACCESS_TOKEN = CANARIES.WHATSAPP_ACCESS_TOKEN;

    const app = await buildApp();
    const body = (
      await app.inject({
        method: 'GET',
        url: '/health/channels',
        headers: { 'x-ops-token': OPS_TOKEN },
      })
    ).json();

    expect(body.channels).toEqual({
      email: true,
      whatsapp: true,
      webPush: false,
      fcm: false,
    });
    expect(body.detail.email.state).toBe('configured');
    expect(body.detail.webPush.state).toBe('not_configured');
    expect(body.unconfigured).toEqual(['webPush', 'fcm']);
    expect(body.ok).toBe(false);

    await app.close();
  });

  it('reports ok once every channel is configured', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    configureAllChannels();

    const app = await buildApp();
    const body = (
      await app.inject({
        method: 'GET',
        url: '/health/channels',
        headers: { 'x-ops-token': OPS_TOKEN },
      })
    ).json();

    expect(body.ok).toBe(true);
    expect(body.unconfigured).toEqual([]);
    expect(body.degraded).toEqual([]);

    await app.close();
  });

  it('surfaces a systemically failing channel through the endpoint, not just the lib', async () => {
    // The live production numbers on 2026-09-03: email configured, 48 sends
    // attempted, none delivered. Before the rate rule this endpoint answered
    // with email among the healthy channels.
    vi.doMock('../lib/email.js', () => ({
      emailConfig: { enabled: true, from: 'Darshya <no-reply@example.invalid>' },
      getEmailQuotaSnapshot: () => ({
        day: '2026-09-03',
        attempted: 48,
        sent: 0,
        failed: 48,
        rateLimited: 0,
        cap: 100,
        warnAt: 70,
      }),
    }));
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;

    const app = await buildApp();
    const body = (
      await app.inject({
        method: 'GET',
        url: '/health/channels',
        headers: { 'x-ops-token': OPS_TOKEN },
      })
    ).json();

    expect(body.channels.email).toBe(true);
    expect(body.degraded).toEqual(['email']);
    expect(body.detail.email.state).toBe('degraded');
    expect(body.detail.email.reason).toBe('total_failure');
    expect(body.ok).toBe(false);

    await app.close();
    vi.doUnmock('../lib/email.js');
  });

  it('LEAK CANARY — no credential value reaches the response body', async () => {
    process.env.CRON_AUTH_TOKEN = OPS_TOKEN;
    configureAllChannels();

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/health/channels',
      headers: { 'x-ops-token': OPS_TOKEN },
    });
    const raw = res.body;

    expect(res.statusCode).toBe(200);
    // Sanity: the canaries are real, distinctive strings, so absence means
    // something. (A typo'd empty canary would make this assertion vacuous.)
    for (const value of Object.values(CANARIES)) {
      expect(value.length).toBeGreaterThan(10);
      expect(raw).not.toContain(value);
    }
    // The ops token travelled in on this very request and must not come back.
    expect(raw).not.toContain(OPS_TOKEN);

    // ...while the NAMES an operator needs are present. Names are not secrets;
    // this is what makes the endpoint actionable.
    expect(raw).toContain('RESEND_API_KEY');
    expect(raw).toContain('VAPID_PRIVATE_KEY');

    // No length- or prefix-shaped derivation either: the only numbers in the
    // payload are the email quota counters, which are bounded and unrelated to
    // any key's length.
    const body = res.json();
    expect(Object.keys(body.detail.email.counters)).toEqual(
      expect.arrayContaining(['day', 'attempted', 'sent', 'failed', 'rateLimited', 'cap', 'warnAt']),
    );
    expect(body.detail.whatsapp.counters).toBeUndefined();

    await app.close();
  });
});
