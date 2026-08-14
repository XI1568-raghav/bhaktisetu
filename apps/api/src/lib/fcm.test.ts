import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

/**
 * NOTIF-07 — a Web Push endpoint URL is not an FCM registration token, and a
 * malformed token is a BUG, not a dead device.
 *
 * apps/web/components/AartiOptIn.tsx registers `sub.toJSON().endpoint` — a
 * `https://fcm.googleapis.com/fcm/send/...` URL — as `fcm_device_tokens.device_token`.
 * aarti-notify then puts that URL in `message.token` of an FCM HTTP v1 send.
 * FCM answers INVALID_ARGUMENT, which fcm.ts classified as `expired: true`, so
 * the caller deleted the registration: the devotee's toggle went on, no reminder
 * ever arrived, and the row that would have let anyone diagnose it was gone
 * after the first send.
 *
 * These tests pin the two halves of the fix:
 *   1. a token that is structurally not an FCM registration token is refused
 *      BEFORE the network call, loudly, as `invalidToken`;
 *   2. an INVALID_ARGUMENT from FCM is `invalidToken`, never `expired`.
 */

// A real (throwaway) RSA key so getAccessToken's RS256 signing succeeds.
const { privateKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const WEB_PUSH_ENDPOINT =
  'https://fcm.googleapis.com/fcm/send/eXaMpLe-endpoint-id:APA91bF_fake_subscription_suffix';
const REAL_FCM_TOKEN =
  'cVx9r0QwSk6Hm2Zx1yTuvA:APA91bE-3Kq7rN0pWl9fJ8s2hGdT6yQxZaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcdefghijklmnopqrstuvwx';

async function loadFcmEnabled() {
  vi.resetModules();
  process.env.FCM_PROJECT_ID = 'darshya-test';
  process.env.FCM_CLIENT_EMAIL = 'svc@darshya-test.iam.gserviceaccount.com';
  process.env.FCM_PRIVATE_KEY = privateKey;
  return import('./fcm.js');
}

let fetchMock: ReturnType<typeof vi.fn>;
const originalFetch = globalThis.fetch;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.FCM_PROJECT_ID;
  delete process.env.FCM_CLIENT_EMAIL;
  delete process.env.FCM_PRIVATE_KEY;
  vi.resetModules();
});

/** Answer the OAuth token exchange, then the messages:send. */
function armFetch(sendResponse: { status: number; body: string }) {
  fetchMock.mockImplementation(async (url: unknown) => {
    if (String(url).includes('oauth2.googleapis.com')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: 'ya29.test', expires_in: 3600 }),
        text: async () => '',
      } as unknown as Response;
    }
    return {
      ok: sendResponse.status >= 200 && sendResponse.status < 300,
      status: sendResponse.status,
      text: async () => sendResponse.body,
      json: async () => JSON.parse(sendResponse.body || '{}'),
    } as unknown as Response;
  });
}

describe('sendFcm — Web Push endpoint URL is refused, not sent (NOTIF-07)', () => {
  it('refuses a web-push endpoint URL without touching the network', async () => {
    const { sendFcm } = await loadFcmEnabled();
    armFetch({ status: 200, body: '{}' });

    const res = await sendFcm(WEB_PUSH_ENDPOINT, { title: 'Aarti', body: 'in 15 min' });

    expect(res.ok).toBe(false);
    expect(res.invalidToken).toBe(true);
    // The whole point: this is NOT a dead device, so the caller must not delete it.
    expect(res.expired).toBeFalsy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still accepts a real FCM registration token', async () => {
    const { sendFcm } = await loadFcmEnabled();
    armFetch({ status: 200, body: '{"name":"projects/darshya-test/messages/1"}' });

    const res = await sendFcm(REAL_FCM_TOKEN, { title: 'Aarti', body: 'in 15 min' });

    expect(res.ok).toBe(true);
    expect(res.invalidToken).toBeFalsy();
    // token exchange + send
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('sendFcm — FCM error classification (NOTIF-07)', () => {
  it('classifies INVALID_ARGUMENT as invalidToken, never expired', async () => {
    const { sendFcm } = await loadFcmEnabled();
    armFetch({
      status: 400,
      body: '{"error":{"code":400,"status":"INVALID_ARGUMENT","message":"The registration token is not a valid FCM registration token"}}',
    });

    const res = await sendFcm(REAL_FCM_TOKEN, { title: 'Aarti', body: 'in 15 min' });

    expect(res.ok).toBe(false);
    expect(res.invalidToken).toBe(true);
    expect(res.expired).toBeFalsy();
  });

  it('still classifies UNREGISTERED as expired so dead devices are pruned', async () => {
    const { sendFcm } = await loadFcmEnabled();
    armFetch({
      status: 404,
      body: '{"error":{"code":404,"status":"NOT_FOUND","details":[{"errorCode":"UNREGISTERED"}]}}',
    });

    const res = await sendFcm(REAL_FCM_TOKEN, { title: 'Aarti', body: 'in 15 min' });

    expect(res.ok).toBe(false);
    expect(res.expired).toBe(true);
    expect(res.invalidToken).toBeFalsy();
  });
});

describe('isFcmRegistrationToken (NOTIF-07)', () => {
  it('rejects every shape the web opt-in can produce', async () => {
    const { isFcmRegistrationToken } = await loadFcmEnabled();
    expect(isFcmRegistrationToken(WEB_PUSH_ENDPOINT)).toBe(false);
    expect(isFcmRegistrationToken('https://updates.push.services.mozilla.com/wpush/v2/gAAA')).toBe(
      false,
    );
    expect(isFcmRegistrationToken('https://wns2-par02p.notify.windows.com/w/?token=abc')).toBe(
      false,
    );
    // JSON.stringify(subJson) — the component's own fallback branch.
    expect(
      isFcmRegistrationToken(JSON.stringify({ endpoint: WEB_PUSH_ENDPOINT, keys: { p256dh: 'x' } })),
    ).toBe(false);
    expect(isFcmRegistrationToken('')).toBe(false);
    expect(isFcmRegistrationToken('short')).toBe(false);
  });

  it('accepts a real FCM registration token', async () => {
    const { isFcmRegistrationToken } = await loadFcmEnabled();
    expect(isFcmRegistrationToken(REAL_FCM_TOKEN)).toBe(true);
  });
});
