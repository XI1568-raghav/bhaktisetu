import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';
import webpush from 'web-push';

/**
 * NOTIF-03 — the status surface and the senders must be the same derivation.
 *
 * The failure this file exists to prevent is subtle and the reason the original
 * finding says "nothing in the product can tell you": if the readiness report
 * re-derives configuration from `process.env` on its own, it is a SECOND answer
 * to the same question, and the first time a transport adds a condition the
 * report keeps saying "configured" for a channel that silently no-ops. That is
 * the original bug with a green light bolted on.
 *
 * So the contract asserted here is behavioural, not structural: whenever
 * `getChannelStatus()` reports a channel unconfigured, that channel's OWN send
 * function must return `{skipped:true}` — and whenever it reports configured,
 * the sender must stop skipping.
 */

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
  'NODE_ENV',
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

const vapid = webpush.generateVAPIDKeys();

const SUBSCRIPTION = {
  endpoint: 'https://example.invalid/push/abc',
  keys: { p256dh: 'p256dh-value', auth: 'auth-value' },
};

/**
 * The first dynamic import in this file transpiles the whole transport
 * dependency tree (resend, web-push, google-auth). Under the repo's 2-fork
 * pool that took ~46s and blew the 30s per-test budget, failing whichever
 * `it` happened to run first for a reason that had nothing to do with it.
 * Pay the transform once here instead. `vi.resetModules()` still gives every
 * test a fresh module registry; only Vite's transform cache is warmed.
 */
beforeAll(async () => {
  await import('./notification-channels.js');
  await import('./email.js');
  await import('./whatsapp.js');
  await import('./web-push.js');
  await import('./fcm.js');
}, 180_000);

describe('NOTIF-03 — channel status is derived from the senders own flags', () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
    clearManagedEnv();
  });

  afterAll(restoreEnv);

  it('reports all four channels unconfigured when no credentials are present', async () => {
    const { getChannelStatus } = await import('./notification-channels.js');
    const status = getChannelStatus();

    expect(status.channels).toEqual({
      email: false,
      whatsapp: false,
      webPush: false,
      fcm: false,
    });
    expect(status.unconfigured).toEqual(['email', 'whatsapp', 'webPush', 'fcm']);
    expect(status.degraded).toEqual([]);
    expect(status.ok).toBe(false);
    for (const name of ['email', 'whatsapp', 'webPush', 'fcm'] as const) {
      expect(status.detail[name].state).toBe('not_configured');
      expect(status.detail[name].configured).toBe(false);
    }
  });

  it('CONTRACT — a channel reported unconfigured actually no-ops in its own sender', async () => {
    const { getChannelStatus } = await import('./notification-channels.js');
    const { sendEmail } = await import('./email.js');
    const { sendWhatsappText } = await import('./whatsapp.js');
    const { sendPush } = await import('./web-push.js');
    const { sendFcm } = await import('./fcm.js');

    const status = getChannelStatus();
    expect(status.unconfigured).toEqual(['email', 'whatsapp', 'webPush', 'fcm']);

    // Each of these must be a pure early return — no network, no credentials.
    expect(await sendEmail({ to: 'a@example.invalid', subject: 's', html: '<p>h</p>' })).toMatchObject({
      ok: false,
      skipped: true,
    });
    expect(await sendWhatsappText({ to: '9999999999', text: 't' })).toMatchObject({
      ok: false,
      skipped: true,
    });
    expect(await sendPush(SUBSCRIPTION, { title: 't', body: 'b' })).toMatchObject({
      ok: false,
      skipped: true,
    });
    expect(await sendFcm('a-plain-device-token', { title: 't', body: 'b' })).toMatchObject({
      ok: false,
      skipped: true,
    });
  });

  it('CONTRACT — configuring a channel flips both the report and its sender together', async () => {
    process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapid.privateKey;

    const { getChannelStatus } = await import('./notification-channels.js');
    const { sendPush } = await import('./web-push.js');

    expect(getChannelStatus().channels.webPush).toBe(true);
    expect(getChannelStatus().unconfigured).not.toContain('webPush');

    // The sender no longer short-circuits: it reaches the transport and fails
    // on the unreachable endpoint instead of skipping. "Attempted" is exactly
    // what `configured` claims — and all it claims.
    const result = await sendPush(SUBSCRIPTION, { title: 't', body: 'b' });
    expect(result.skipped).toBeUndefined();
  });

  it('names the env vars each dark channel needs, and never their values', async () => {
    const { getChannelStatus, CHANNEL_ENV_REQUIREMENTS } = await import(
      './notification-channels.js'
    );
    const status = getChannelStatus();

    expect(status.detail.email.requires).toEqual(['RESEND_API_KEY']);
    expect(status.detail.whatsapp.requires).toEqual([
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_ACCESS_TOKEN',
    ]);
    expect(status.detail.webPush.requires).toEqual(['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY']);
    expect(status.detail.fcm.requires).toEqual([
      'FCM_PROJECT_ID',
      'FCM_CLIENT_EMAIL',
      'FCM_PRIVATE_KEY',
    ]);

    // The requirement table is frozen, so no request handler can mutate it into
    // carrying a value.
    expect(Object.isFrozen(CHANNEL_ENV_REQUIREMENTS)).toBe(true);
  });

  it('LEAK CANARY — a credential value set in the environment never enters the report', async () => {
    const canaries = {
      RESEND_API_KEY: 're_***REMOVED***',
      WHATSAPP_PHONE_NUMBER_ID: '100000000000002',
      WHATSAPP_ACCESS_TOKEN: 'EAALEAKCANARYlibwhatsapptoken',
      VAPID_PUBLIC_KEY: vapid.publicKey,
      VAPID_PRIVATE_KEY: vapid.privateKey,
      FCM_PROJECT_ID: 'leakcanary-lib-project',
      FCM_CLIENT_EMAIL: 'leakcanary-lib@example.iam.gserviceaccount.com',
      FCM_PRIVATE_KEY: 'LEAKCANARY_lib_fcm_private_key_material',
      EXPO_ACCESS_TOKEN: 'LEAKCANARY_lib_expo_token',
    };
    for (const [k, v] of Object.entries(canaries)) process.env[k] = v;

    const { getChannelStatus } = await import('./notification-channels.js');
    const serialised = JSON.stringify(getChannelStatus());

    expect(getChannelStatus().ok).toBe(true);
    for (const value of Object.values(canaries)) {
      expect(value.length).toBeGreaterThan(10);
      expect(serialised).not.toContain(value);
    }
    // Not a length tell either: the VAPID public key is a legitimately public
    // value and is STILL absent, because this payload carries no key material
    // of any kind.
    expect(serialised).not.toContain(vapid.publicKey);
  });

  it('reports the Expo push rail separately and never lets it count towards ok', async () => {
    const { getChannelStatus } = await import('./notification-channels.js');
    const status = getChannelStatus();

    // Expo needs no server credential, so it is always callable — which is not
    // the same as "push is provisioned", and must not mask a dark FCM rail.
    expect(status.expoPush.enabled).toBe(true);
    expect(status.expoPush.enhancedSecurity).toBe(false);
    expect(status.ok).toBe(false);
    expect(status.unconfigured).toContain('fcm');
  });
});

describe('NOTIF-03 — "configured but failing" is reported only where it is knowable', () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
    clearManagedEnv();
  });

  afterAll(restoreEnv);

  it('marks email degraded when the provider has refused a send today on quota', async () => {
    vi.doMock('./email.js', () => ({
      emailConfig: { enabled: true, from: 'Darshya <no-reply@example.invalid>' },
      getEmailQuotaSnapshot: () => ({
        day: '2026-09-04',
        attempted: 12,
        sent: 9,
        failed: 0,
        rateLimited: 3,
        cap: 100,
        warnAt: 70,
      }),
    }));

    const { getChannelStatus } = await import('./notification-channels.js');
    const status = getChannelStatus();

    expect(status.channels.email).toBe(true);
    expect(status.detail.email.state).toBe('degraded');
    // 3 of 12 is 25% — under the systemic threshold, so quota is the reason.
    expect(status.detail.email.reason).toBe('quota_refusal');
    expect(status.degraded).toEqual(['email']);
    // Configured is not the same as delivering, and `ok` must follow delivery.
    expect(status.ok).toBe(false);

    vi.doUnmock('./email.js');
  });

  it('THE PRODUCTION CASE — 48 attempted / 0 sent / 48 failed reports a total failure', async () => {
    // Measured on the live API 2026-09-03 with email configured. The previous
    // rule escalated only on rateLimited, which is 0 here, so the monitor
    // reported this channel healthy through a complete email outage.
    vi.doMock('./email.js', () => ({
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

    const { getChannelStatus } = await import('./notification-channels.js');
    const status = getChannelStatus();

    expect(status.channels.email).toBe(true);
    expect(status.detail.email.state).toBe('degraded');
    expect(status.detail.email.reason).toBe('total_failure');
    expect(status.detail.email.failureRate).toBe(1);
    expect(status.degraded).toEqual(['email']);
    // The whole point: ok is false BECAUSE email is failing, not incidentally
    // because some other channel happens to be unconfigured.
    expect(status.ok).toBe(false);
    expect(status.unconfigured).not.toContain('email');
    expect(String(status.detail.email.note)).toContain('NOTHING has been delivered');

    vi.doUnmock('./email.js');
  });

  it('does not escalate an ordinary failed send to degraded', async () => {
    vi.doMock('./email.js', () => ({
      emailConfig: { enabled: true, from: 'Darshya <no-reply@example.invalid>' },
      getEmailQuotaSnapshot: () => ({
        day: '2026-09-04',
        attempted: 5,
        sent: 4,
        // One bad recipient address is not a channel fault. An alert that fires
        // on it is an alert that gets muted.
        failed: 1,
        rateLimited: 0,
        cap: 100,
        warnAt: 70,
      }),
    }));

    const { getChannelStatus } = await import('./notification-channels.js');
    const status = getChannelStatus();

    expect(status.detail.email.state).toBe('configured');
    expect(status.detail.email.reason).toBeUndefined();
    expect(status.degraded).toEqual([]);

    vi.doUnmock('./email.js');
  });

  it('claims only config-only evidence for the three channels with no delivery record', async () => {
    const { getChannelStatus } = await import('./notification-channels.js');
    const status = getChannelStatus();

    expect(status.detail.email.evidence).toBe('runtime-counters');
    for (const name of ['whatsapp', 'webPush', 'fcm'] as const) {
      expect(status.detail[name].evidence).toBe('config-only');
      expect(status.detail[name].counters).toBeUndefined();
      // The state machine cannot reach 'degraded' without runtime evidence, so
      // the report never overstates what it knows.
      expect(status.detail[name].state).not.toBe('degraded');
    }
  });
});

describe('NOTIF-03 — the degraded threshold is a rate over a sample, not a raw count', () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
    clearManagedEnv();
  });

  afterAll(restoreEnv);

  /** Counters obeying lib/email.ts's invariant: attempted === sent + failed. */
  function counters(attempted: number, sent: number, rateLimited = 0) {
    return {
      day: '2026-09-03',
      attempted,
      sent,
      failed: attempted - sent,
      rateLimited,
      cap: 100,
      warnAt: 70,
    };
  }

  it('grades the real production sample (48/0/48) as a total failure', async () => {
    const { assessDelivery } = await import('./notification-channels.js');
    const verdict = assessDelivery(counters(48, 0));

    expect(verdict.degraded).toBe(true);
    expect(verdict.reason).toBe('total_failure');
    expect(verdict.failureRate).toBe(1);
  });

  it('ignores one incidental bad recipient in 48 — the original reasoning, preserved', async () => {
    const { assessDelivery } = await import('./notification-channels.js');
    const verdict = assessDelivery(counters(48, 47));

    expect(verdict.degraded).toBe(false);
    expect(verdict.reason).toBeUndefined();
    expect(verdict.failureRate).toBeCloseTo(0.021, 3);
  });

  it('treats an idle channel as healthy and does not divide by zero', async () => {
    const { assessDelivery } = await import('./notification-channels.js');
    const verdict = assessDelivery(counters(0, 0));

    expect(verdict.degraded).toBe(false);
    expect(verdict.failureRate).toBe(0);
    expect(Number.isNaN(verdict.failureRate)).toBe(false);
  });

  it('brackets the rate threshold: 4/10 healthy, 5/10 degraded', async () => {
    const { assessDelivery, DEGRADED_FAILURE_RATE } = await import('./notification-channels.js');

    expect(DEGRADED_FAILURE_RATE).toBe(0.5);
    // 40% — two clustered bounces are still recipient quality.
    expect(assessDelivery(counters(10, 6)).degraded).toBe(false);
    // 50% — more mail failing than succeeding. Inclusive at the boundary.
    const atThreshold = assessDelivery(counters(10, 5));
    expect(atThreshold.degraded).toBe(true);
    expect(atThreshold.reason).toBe('systemic_failure');
  });

  it('brackets the sample floor: 4/4 failing is below it, 5/5 is not', async () => {
    const { assessDelivery, DEGRADED_MIN_ATTEMPTS } = await import('./notification-channels.js');

    expect(DEGRADED_MIN_ATTEMPTS).toBe(5);
    // 100% failure, but on too small a sample to separate from a bad address.
    // The cost of the floor, asserted rather than hidden.
    expect(assessDelivery(counters(4, 0)).degraded).toBe(false);
    expect(assessDelivery(counters(5, 0)).reason).toBe('total_failure');
  });

  it('separates a partial fault from a total one — one delivery proves the transport works', async () => {
    const { assessDelivery } = await import('./notification-channels.js');

    // 7 of 8 failed, but one landed: credentials and domain are valid.
    const partial = assessDelivery(counters(8, 1));
    expect(partial.reason).toBe('systemic_failure');
    expect(String(partial.note)).toContain('the transport works');

    // Nothing landed at all.
    expect(assessDelivery(counters(8, 0)).reason).toBe('total_failure');
  });

  it('still escalates a quota refusal at any sample size, and names it as the cause', async () => {
    const { assessDelivery } = await import('./notification-channels.js');

    // 1 refusal in 10, 90% delivered — under both the rate and nowhere near
    // total, but the provider still refused something.
    const quota = assessDelivery(counters(10, 9, 1));
    expect(quota.degraded).toBe(true);
    expect(quota.reason).toBe('quota_refusal');

    // When quota causes a total outage, severity wins the `reason` but the note
    // still names quota, so neither fact is lost.
    const quotaOutage = assessDelivery(counters(20, 0, 20));
    expect(quotaOutage.reason).toBe('total_failure');
    expect(String(quotaOutage.note)).toContain('quota');
  });
});

describe('NOTIF-03 — the boot alert says which channels are dark, once, out loud', () => {
  beforeEach(() => {
    vi.resetModules();
    restoreEnv();
    clearManagedEnv();
  });

  afterAll(restoreEnv);

  it('warns at boot naming the dark channels and the env vars that fix them', async () => {
    const { reportChannelReadinessAtBoot } = await import('./notification-channels.js');
    const log = { warn: vi.fn(), info: vi.fn() };

    const status = reportChannelReadinessAtBoot(log);

    expect(log.info).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledTimes(1);
    const line = String(log.warn.mock.calls[0]![0]);
    expect(line).toContain('NOTIF-03');
    expect(line).toContain('email');
    expect(line).toContain('webPush');
    expect(line).toContain('RESEND_API_KEY');
    expect(line).toContain('VAPID_PRIVATE_KEY');
    expect(status.unconfigured).toHaveLength(4);
  });

  it('LEAK CANARY — the boot line carries env var names, never their values', async () => {
    process.env.RESEND_API_KEY = 're_***REMOVED***';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '100000000000003';
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAALEAKCANARYbootwhatsapptoken';

    const { reportChannelReadinessAtBoot } = await import('./notification-channels.js');
    const log = { warn: vi.fn(), info: vi.fn() };

    reportChannelReadinessAtBoot(log);

    const line = String(log.warn.mock.calls[0]![0]);
    expect(line).not.toContain('re_***REMOVED***');
    expect(line).not.toContain('EAALEAKCANARYbootwhatsapptoken');
    // Only the still-dark channels are named for repair.
    expect(line).toContain('VAPID_PUBLIC_KEY');
    expect(line).not.toContain('RESEND_API_KEY');
  });

  it('says so plainly when every channel is configured', async () => {
    process.env.RESEND_API_KEY = 're_boot_ok';
    process.env.WHATSAPP_PHONE_NUMBER_ID = '100000000000004';
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAAbootok';
    process.env.VAPID_PUBLIC_KEY = vapid.publicKey;
    process.env.VAPID_PRIVATE_KEY = vapid.privateKey;
    process.env.FCM_PROJECT_ID = 'boot-ok';
    process.env.FCM_CLIENT_EMAIL = 'boot-ok@example.iam.gserviceaccount.com';
    process.env.FCM_PRIVATE_KEY = 'boot-ok-private-key';

    const { reportChannelReadinessAtBoot } = await import('./notification-channels.js');
    const log = { warn: vi.fn(), info: vi.fn() };

    const status = reportChannelReadinessAtBoot(log);

    expect(log.warn).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledTimes(1);
    expect(status.ok).toBe(true);
  });
});
