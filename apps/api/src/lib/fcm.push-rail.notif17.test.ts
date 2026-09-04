import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * NOTIF-17 — the two ends of the push rail spoke different token formats, so
 * push could not work on iOS or on Android.
 *
 * apps/mobile calls `getExpoPushTokenAsync()`, which returns
 * `ExponentPushToken[…]` — ~41 characters, bracketed. The API validated
 * `POST /notifications/register-token` with `isFcmRegistrationToken`, which
 * requires length >= 60 and `^[A-Za-z0-9_:.-]+$`. The Expo token fails BOTH
 * checks, so every device that got as far as minting a token was answered a
 * hard 400 and no phone was ever registered. Nothing downstream could have
 * worked; there was no test asserting that what one end produces the other end
 * accepts, which is exactly the gap these cases close.
 *
 * The fix is a SIBLING validator plus shape dispatch, never a loosened
 * `isFcmRegistrationToken`: that function is the only thing stopping apps/web
 * from registering a Web Push endpoint URL as a device token (NOTIF-07), and a
 * validator that accepts garbage is worse than one that rejects good input.
 */

/**
 * Verbatim output shape of `expo-notifications` `getExpoPushTokenAsync()` —
 * identical on iOS and on Android, which is the whole reason this rail was
 * chosen. Kept in step with EXPO_PUSH_TOKEN_PATTERN in
 * apps/mobile/lib/push-notifications.ts.
 */
const EXPO_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';
const EXPO_TOKEN_MODERN = 'ExpoPushToken[G4t9-Kq7rN0pWl9fJ8s2hG]';
const WEB_PUSH_ENDPOINT =
  'https://fcm.googleapis.com/fcm/send/eXaMpLe-endpoint-id:APA91bF_fake_subscription_suffix';
const REAL_FCM_TOKEN =
  'cVx9r0QwSk6Hm2Zx1yTuvA:APA91bE-3Kq7rN0pWl9fJ8s2hGdT6yQxZaBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789abcdefghijklmnopqrstuvwx';
/** What `getDevicePushTokenAsync()` hands back on iOS: 64 hex, not FCM. */
const APNS_DEVICE_TOKEN = 'a'.repeat(64);

/** Load fcm.js with NO FCM service-account env — production's current state. */
async function loadFcmWithoutCreds() {
  vi.resetModules();
  delete process.env.FCM_PROJECT_ID;
  delete process.env.FCM_CLIENT_EMAIL;
  delete process.env.FCM_PRIVATE_KEY;
  delete process.env.EXPO_ACCESS_TOKEN;
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
  delete process.env.EXPO_ACCESS_TOKEN;
  vi.resetModules();
});

function expoReplies(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response);
}

describe('NOTIF-17 — the client/server token-format contract', () => {
  it('accepts the exact token apps/mobile produces', async () => {
    const { isPushToken, isExpoPushToken } = await loadFcmWithoutCreds();
    expect(isExpoPushToken(EXPO_TOKEN)).toBe(true);
    expect(isExpoPushToken(EXPO_TOKEN_MODERN)).toBe(true);
    // The write path uses isPushToken; this is the assertion whose absence let
    // the two ends ship disagreeing.
    expect(isPushToken(EXPO_TOKEN)).toBe(true);
    expect(isPushToken(EXPO_TOKEN_MODERN)).toBe(true);
  });

  it('proves the sibling validator is doing the work — isFcmRegistrationToken still refuses it', async () => {
    const { isFcmRegistrationToken } = await loadFcmWithoutCreds();
    // If this ever starts returning true, isFcmRegistrationToken has been
    // widened and the NOTIF-07 guard against Web Push endpoint URLs is gone.
    expect(isFcmRegistrationToken(EXPO_TOKEN)).toBe(false);
  });

  it('still refuses everything that is not a deliverable token', async () => {
    const { isPushToken, isExpoPushToken } = await loadFcmWithoutCreds();
    expect(isPushToken(WEB_PUSH_ENDPOINT)).toBe(false);
    expect(isPushToken(JSON.stringify({ endpoint: WEB_PUSH_ENDPOINT, keys: { p256dh: 'x' } }))).toBe(
      false,
    );
    expect(isPushToken('')).toBe(false);
    expect(isPushToken('short')).toBe(false);
    // Bracketed but empty / too short / not URL-safe — a validator that waved
    // these through would be no validator at all.
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[abc]')).toBe(false);
    expect(isExpoPushToken(`ExponentPushToken[${JSON.stringify({ a: 1 })}]`)).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx')).toBe(false);
    expect(isExpoPushToken('xxxxxxxxxxxxxxxxxxxxxx')).toBe(false);
    expect(isExpoPushToken(`ExponentPushToken[${'x'.repeat(300)}]`)).toBe(false);
  });

  it('keeps accepting a real FCM registration token on the other rail', async () => {
    const { isPushToken, isFcmRegistrationToken } = await loadFcmWithoutCreds();
    expect(isFcmRegistrationToken(REAL_FCM_TOKEN)).toBe(true);
    expect(isPushToken(REAL_FCM_TOKEN)).toBe(true);
  });

  it('refuses a raw APNs device token, which is 64 hex and NOT an FCM token', async () => {
    // The raw-rail alternative would have produced this on iOS. It slips past a
    // naive length+charset check, and FCM answers INVALID_ARGUMENT for it.
    const { isFcmRegistrationToken, isPushToken } = await loadFcmWithoutCreds();
    expect(isFcmRegistrationToken(APNS_DEVICE_TOKEN)).toBe(false);
    expect(isPushToken(APNS_DEVICE_TOKEN)).toBe(false);
  });
});

describe('NOTIF-17 — sendFcm dispatches on token shape', () => {
  it('sends an Expo token to exp.host even with no FCM credentials at all', async () => {
    const { sendFcm, fcmConfig } = await loadFcmWithoutCreds();
    // The precondition that makes this meaningful: rail 2 is dark.
    expect(fcmConfig.enabled).toBe(false);
    expoReplies({ data: { status: 'ok', id: 'ticket-1' } });

    const res = await sendFcm(EXPO_TOKEN, { title: 'Aarti', body: 'in 15 min' });

    expect(res.ok).toBe(true);
    expect(res.skipped).toBeFalsy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    const sent = JSON.parse(String(init.body));
    expect(sent.to).toBe(EXPO_TOKEN);
    // Must match the channel apps/mobile creates, or Android 8+ drops it.
    expect(sent.channelId).toBe('default');
  });

  it('still reports an FCM-rail token as skipped when FCM is unconfigured', async () => {
    const { sendFcm } = await loadFcmWithoutCreds();
    const res = await sendFcm(REAL_FCM_TOKEN, { title: 'Aarti', body: 'in 15 min' });
    expect(res.skipped).toBe(true);
    expect(res.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('only sends the Authorization header when EXPO_ACCESS_TOKEN is set', async () => {
    const { sendFcm } = await loadFcmWithoutCreds();
    expoReplies({ data: { status: 'ok' } });
    await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    const first = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((first.headers as Record<string, string>).authorization).toBeUndefined();

    vi.resetModules();
    process.env.EXPO_ACCESS_TOKEN = 'expo-secret';
    const reloaded = await import('./fcm.js');
    fetchMock.mockClear();
    expoReplies({ data: { status: 'ok' } });
    await reloaded.sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    const second = fetchMock.mock.calls[0]![1] as RequestInit;
    expect((second.headers as Record<string, string>).authorization).toBe('Bearer expo-secret');
    expect(reloaded.expoPushConfig.enhancedSecurity).toBe(true);
  });
});

/**
 * Expo answers HTTP 200 with a per-message *ticket* even when the send failed,
 * so the status code proves nothing. Classification follows the NOTIF-07 rule:
 * only a genuinely dead device is `expired` (callers delete those rows); a
 * credential or token problem keeps the row so the bug stays diagnosable.
 */
describe('NOTIF-17 — Expo ticket classification', () => {
  it('classifies DeviceNotRegistered as expired so dead devices are pruned', async () => {
    const { sendFcm } = await loadFcmWithoutCreds();
    expoReplies({
      data: {
        status: 'error',
        message: '"ExponentPushToken[…]" is not a registered push notification recipient',
        details: { error: 'DeviceNotRegistered' },
      },
    });
    const res = await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    expect(res.ok).toBe(false);
    expect(res.expired).toBe(true);
  });

  it('classifies MismatchSenderId as an error, never expired', async () => {
    // Wrong FCM service account on the EAS project. Deleting the row would hide
    // a misconfiguration behind an empty audience.
    const { sendFcm } = await loadFcmWithoutCreds();
    expoReplies({
      data: { status: 'error', message: 'sender id mismatch', details: { error: 'MismatchSenderId' } },
    });
    const res = await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    expect(res.ok).toBe(false);
    expect(res.expired).toBeFalsy();
    expect(res.error).toMatch(/MismatchSenderId/);
  });

  it('handles an array ticket response and a top-level errors array', async () => {
    const { sendFcm } = await loadFcmWithoutCreds();
    expoReplies({ data: [{ status: 'ok' }] });
    expect((await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' })).ok).toBe(true);

    fetchMock.mockClear();
    expoReplies({ errors: [{ message: 'invalid credentials' }] });
    const res = await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    expect(res.ok).toBe(false);
    expect(res.expired).toBeFalsy();
    expect(res.error).toMatch(/invalid credentials/);
  });

  it('never leaks the whole token in an error string', async () => {
    const { sendFcm } = await loadFcmWithoutCreds();
    expoReplies({ errors: [{ message: 'boom' }] });
    const res = await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    expect(res.error).not.toContain(EXPO_TOKEN);
  });

  it('reports a non-2xx from exp.host as an error, not a skip', async () => {
    const { sendFcm } = await loadFcmWithoutCreds();
    expoReplies({ message: 'too many requests' }, 429);
    const res = await sendFcm(EXPO_TOKEN, { title: 'a', body: 'b' });
    expect(res.ok).toBe(false);
    expect(res.skipped).toBeFalsy();
    expect(res.error).toMatch(/429/);
  });
});

describe('NOTIF-17 — multicast does not go dark on a deliverable batch', () => {
  it('sends the Expo rows even when FCM has no credentials', async () => {
    const { sendFcmMulticast } = await loadFcmWithoutCreds();
    expoReplies({ data: { status: 'ok' } });

    const res = await sendFcmMulticast([EXPO_TOKEN, REAL_FCM_TOKEN], { title: 'a', body: 'b' });

    expect(res.skipped).toBeFalsy();
    expect(res.sent).toBe(1);
    // The rail-2 row is skipped, not failed — nothing was attempted for it.
    expect(res.failed).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('still reports a wholly dark batch as skipped', async () => {
    const { sendFcmMulticast } = await loadFcmWithoutCreds();
    const res = await sendFcmMulticast([REAL_FCM_TOKEN], { title: 'a', body: 'b' });
    expect(res.skipped).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
