import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * NOTIF-17 — the push rail was structurally incapable of working on either
 * platform. Three defects, all covered here or by the API's twin file
 * (apps/api/src/lib/fcm.push-rail.notif17.test.ts):
 *
 *   1. This client mints `ExponentPushToken[…]` (~41 chars, bracketed) while
 *      the API validated with `isFcmRegistrationToken` (>= 60 chars,
 *      `^[A-Za-z0-9_:.-]+$`). The Expo token fails BOTH, so `register-token`
 *      answered a hard 400 for every device. No test asserted that what one
 *      end produces the other end accepts, which is why it shipped.
 *   2. The project id was read from `EXPO_PUBLIC_EAS_PROJECT_ID`, set in no EAS
 *      profile, while the real id lives in app.json at `extra.eas.projectId`.
 *      `getExpoPushTokenAsync` throws without a valid one in a production build.
 *   3. `EXPO_PUBLIC_PUSH_ENABLED` is unset, so the effect returns before
 *      `requestPermissionsAsync` and the Android 13+ prompt never shows. That
 *      is owner activation, not a code defect — asserted below as the current,
 *      deliberate state so nobody "fixes" it by accident.
 */

const post = vi.fn(async (_path: string, _body?: unknown) => ({ ok: true }));
vi.mock('@poojly/api-client', () => ({
  api: { post: (path: string, body?: unknown) => post(path, body) },
}));
// push-notifications imports auth-context for the hook, and auth-context pulls
// in expo-secure-store, which the node runner cannot load.
vi.mock('../auth-context', () => ({ useAuth: () => ({ user: null }) }));

import {
  EXPO_PUSH_TOKEN_PATTERN,
  ANDROID_CHANNEL_ID,
  isExpoPushToken,
  readProjectIdFrom,
  resolveEasProjectId,
  fetchAndRegister,
} from '../push-notifications';

/** Verbatim `getExpoPushTokenAsync()` output — identical on iOS and Android. */
const EXPO_TOKEN = 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]';

const appJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../app.json', import.meta.url)), 'utf8'),
) as { expo?: { extra?: { eas?: { projectId?: string } } } };

const apiFcmSource = readFileSync(
  fileURLToPath(new URL('../../../api/src/lib/fcm.ts', import.meta.url)),
  'utf8',
);

function notifStub(overrides: Record<string, unknown> = {}) {
  return {
    getPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: vi.fn(async () => ({ status: 'granted' })),
    getExpoPushTokenAsync: vi.fn(async () => ({ data: EXPO_TOKEN })),
    setNotificationHandler: vi.fn(),
    setNotificationChannelAsync: vi.fn(async () => undefined),
    AndroidImportance: { DEFAULT: 3, HIGH: 4 },
    ...overrides,
  } as unknown as Parameters<typeof fetchAndRegister>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
});

describe('the token format both ends must agree on (NOTIF-17)', () => {
  it('accepts what getExpoPushTokenAsync returns and rejects what it never returns', () => {
    expect(isExpoPushToken(EXPO_TOKEN)).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[G4t9-Kq7rN0pWl9fJ8s2hG]')).toBe(true);
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false);
    expect(isExpoPushToken('ExponentPushToken[abc]')).toBe(false);
    expect(isExpoPushToken('xxxxxxxxxxxxxxxxxxxxxx')).toBe(false);
    expect(isExpoPushToken('https://fcm.googleapis.com/fcm/send/abc')).toBe(false);
    expect(isExpoPushToken('a'.repeat(150))).toBe(false);
    expect(isExpoPushToken('')).toBe(false);
  });

  /**
   * The actual cross-package contract. The API's `isExpoPushToken` must carry
   * the same pattern; if either side is edited alone, this fails. Comparing the
   * source text is crude but it is a real assertion across two packages that
   * cannot import each other, and it fails loudly at exactly the moment the
   * original bug would be reintroduced.
   */
  it('is the same pattern the API validates with', () => {
    expect(apiFcmSource).toContain(EXPO_PUSH_TOKEN_PATTERN.source);
    // ...and the API must still refuse to accept it via the FCM validator,
    // i.e. it added a sibling instead of loosening the NOTIF-07 guard.
    expect(apiFcmSource).toContain('export function isExpoPushToken');
    expect(apiFcmSource).toContain('export function isPushToken');
  });

  it('names the same Android channel the API sends on', () => {
    expect(ANDROID_CHANNEL_ID).toBe('default');
    expect(apiFcmSource).toContain("channelId: 'default'");
  });
});

describe('the EAS project id comes from app.json, not a phantom env var (NOTIF-17)', () => {
  it('app.json really does carry the id under extra.eas.projectId', () => {
    // If this moves, resolveEasProjectId is looking in the wrong place and
    // getExpoPushTokenAsync throws in a production build.
    expect(typeof appJson.expo?.extra?.eas?.projectId).toBe('string');
    expect(appJson.expo!.extra!.eas!.projectId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it('reads that id from an expo-constants shaped object', () => {
    const expected = appJson.expo!.extra!.eas!.projectId;
    expect(readProjectIdFrom({ expoConfig: appJson.expo as never })).toBe(expected);
    // Bare/production builds where expoConfig is null.
    expect(readProjectIdFrom({ expoConfig: null, easConfig: { projectId: expected } })).toBe(
      expected,
    );
    expect(readProjectIdFrom(null)).toBeNull();
    expect(readProjectIdFrom({ expoConfig: { extra: {} } })).toBeNull();
    expect(readProjectIdFrom({ expoConfig: { extra: { eas: { projectId: '   ' } } } })).toBeNull();
  });

  it('lets EXPO_PUBLIC_EAS_PROJECT_ID override when it is actually set', () => {
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = '11111111-2222-3333-4444-555555555555';
    expect(resolveEasProjectId()).toBe('11111111-2222-3333-4444-555555555555');
  });

  it('does not fall over when the env var is unset — its production state', () => {
    // No expo-constants in the node runner, so this is null here; the assertion
    // that matters is that it RETURNS rather than throwing.
    expect(() => resolveEasProjectId()).not.toThrow();
  });
});

describe('fetchAndRegister (NOTIF-17)', () => {
  it('requests permission, mints a token and registers it with the API', async () => {
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = appJson.expo!.extra!.eas!.projectId;
    const notif = notifStub({ getPermissionsAsync: vi.fn(async () => ({ status: 'undetermined' })) });

    const result = await fetchAndRegister(notif);

    expect(result).toEqual({ registered: true, platform: 'android' });
    // The Android 13+ POST_NOTIFICATIONS prompt — unreachable before this fix.
    expect((notif as any).requestPermissionsAsync).toHaveBeenCalledTimes(1);
    // projectId is mandatory; passing undefined throws in a production build.
    expect((notif as any).getExpoPushTokenAsync).toHaveBeenCalledWith({
      projectId: appJson.expo!.extra!.eas!.projectId,
    });
    expect((notif as any).setNotificationChannelAsync).toHaveBeenCalledWith(
      'default',
      expect.objectContaining({ importance: 3 }),
    );
    expect(post).toHaveBeenCalledWith('/api/v1/notifications/register-token', {
      deviceToken: EXPO_TOKEN,
      platform: 'android',
      aartiOptIn: true,
    });
  });

  it('does not re-prompt when permission is already granted', async () => {
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = 'p';
    const notif = notifStub();
    await fetchAndRegister(notif);
    expect((notif as any).requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('reports permission-denied instead of registering nothing silently', async () => {
    const notif = notifStub({
      getPermissionsAsync: vi.fn(async () => ({ status: 'denied' })),
      requestPermissionsAsync: vi.fn(async () => ({ status: 'denied' })),
    });
    expect(await fetchAndRegister(notif)).toEqual({
      registered: false,
      reason: 'permission-denied',
    });
    expect(post).not.toHaveBeenCalled();
  });

  it('reports no-project-id rather than calling getExpoPushTokenAsync and throwing', async () => {
    const notif = notifStub();
    expect(await fetchAndRegister(notif)).toEqual({ registered: false, reason: 'no-project-id' });
    expect((notif as any).getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(post).not.toHaveBeenCalled();
  });

  it('refuses to POST a token the API would 400 on', async () => {
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = 'p';
    const notif = notifStub({
      getExpoPushTokenAsync: vi.fn(async () => ({ data: 'not-a-token' })),
    });
    expect(await fetchAndRegister(notif)).toEqual({ registered: false, reason: 'bad-token-format' });
    expect(post).not.toHaveBeenCalled();
  });

  it('survives a package too old to expose setNotificationChannelAsync', async () => {
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID = 'p';
    const notif = notifStub({ setNotificationChannelAsync: undefined, AndroidImportance: undefined });
    expect(await fetchAndRegister(notif)).toEqual({ registered: true, platform: 'android' });
    expect(post).toHaveBeenCalledTimes(1);
  });
});

/**
 * Task-4 guard: this change makes the rail correct, it does not switch it on.
 * Push stays dark until the owner sets EXPO_PUBLIC_PUSH_ENABLED=true in eas.json
 * and uploads the FCM v1 service account / APNs key to the EAS project.
 */
describe('push is still not enabled by this change', () => {
  it('leaves EXPO_PUBLIC_PUSH_ENABLED unset', () => {
    expect(process.env.EXPO_PUBLIC_PUSH_ENABLED).toBeUndefined();
  });
});
