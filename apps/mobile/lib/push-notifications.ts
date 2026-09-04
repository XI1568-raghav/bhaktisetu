import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '@poojly/api-client';
import { useAuth } from './auth-context';

/**
 * Device push registration — the EXPO PUSH rail.
 *
 * NOTIF-17. Three separate defects made this structurally incapable of working
 * on either platform, and each is fixed here or named as owner-gated:
 *
 *   1. TOKEN FORMAT MISMATCH (the real one). This client mints an Expo token,
 *      `ExponentPushToken[…]` — about 41 characters, bracketed. The API
 *      validated `POST /notifications/register-token` with
 *      `isFcmRegistrationToken`, which demands length ≥ 60 and
 *      `^[A-Za-z0-9_:.-]+$`. The bracketed token fails BOTH, so every phone
 *      that got as far as asking for a token was answered a hard 400. The two
 *      ends now agree on one rail: apps/api/src/lib/fcm.ts gained
 *      `isExpoPushToken` / `isPushToken` and an exp.host sender, dispatching on
 *      token shape. `isFcmRegistrationToken` was NOT loosened — it is the only
 *      thing stopping apps/web from registering a Web Push endpoint URL.
 *
 *   2. PROJECT ID. This read `EXPO_PUBLIC_EAS_PROJECT_ID`, which is set in no
 *      EAS profile, while the real id has always been in app.json at
 *      `extra.eas.projectId`. `getExpoPushTokenAsync` THROWS without a valid
 *      projectId in a production build. Now read from expo-constants, with the
 *      env var kept as an optional override.
 *
 *   3. NOT ENABLED. `EXPO_PUBLIC_PUSH_ENABLED` is unset in every EAS profile,
 *      so the effect returns before `requestPermissionsAsync` and the Android
 *      13+ POST_NOTIFICATIONS prompt is never shown. That flag is deliberately
 *      still off — see "Owner activation" below. This change makes the rail
 *      correct, not live.
 *
 * Why Expo push and not raw FCM/APNs: `getExpoPushTokenAsync` returns the SAME
 * bracketed format on iOS and Android, so one column and one send path cover
 * both stores. The raw rail would need `getDevicePushTokenAsync`, which hands
 * back an FCM token on Android (requires google-services.json, absent) but a
 * 64-hex APNs device token on iOS, which FCM cannot deliver to at all — two
 * formats, two senders, and an extra native module. Expo's service takes the
 * FCM v1 service account and the APNs key once, in the EAS project.
 *
 * Owner activation (nothing here turns push on):
 *   1. eas credentials → upload the FCM v1 service-account JSON (Android) and
 *      let EAS manage the APNs key (iOS). Owner-gated.
 *   2. set EXPO_PUBLIC_PUSH_ENABLED=true in the eas.json profiles that should
 *      have push (app.json/eas.json are not this module's to edit).
 *   3. rebuild — this is a native capability, an OTA update cannot add it.
 *
 * Still env-or-noop on three layers, because production must never crash
 * because push isn't wired:
 *   1. EXPO_PUBLIC_PUSH_ENABLED !== 'true'      → skip entirely
 *   2. expo-notifications not installed/loadable → require() throws, swallowed
 *   3. server has no rail for the token          → /register-token answers and
 *      the failure is surfaced in the result, not swallowed silently
 */

/**
 * The one token format both ends speak.
 *
 * Kept in step with `isExpoPushToken` in apps/api/src/lib/fcm.ts — the contract
 * test in lib/__tests__/push-rail.notif17.test.ts fails if the two drift, which
 * is precisely the regression that shipped last time.
 */
export const EXPO_PUSH_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{16,128}\]$/;

/** Android notification channel id. The API sends `channelId: 'default'`. */
export const ANDROID_CHANNEL_ID = 'default';

export function isExpoPushToken(token: string): boolean {
  const t = token?.trim() ?? '';
  if (t.length > 256) return false;
  return EXPO_PUSH_TOKEN_PATTERN.test(t);
}

interface ExpoNotificationsModule {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (opts: { projectId: string }) => Promise<{ data: string }>;
  setNotificationHandler: (h: unknown) => void;
  /** Android 8+ only; absent on very old versions of the package. */
  setNotificationChannelAsync?: (id: string, channel: Record<string, unknown>) => Promise<unknown>;
  AndroidImportance?: Record<string, number>;
}

interface ExpoConstantsShape {
  expoConfig?: { extra?: { eas?: { projectId?: string } } } | null;
  easConfig?: { projectId?: string } | null;
}

function loadExpoNotifications(): ExpoNotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

/**
 * Pull the EAS project id out of an expo-constants object.
 *
 * `expo.extra.eas.projectId` in app.json is surfaced as
 * `Constants.expoConfig.extra.eas.projectId`. `expoConfig` is null in some
 * bare/production contexts, so the legacy `Constants.easConfig.projectId` is
 * the fallback. Pure and exported so a test can feed it the real app.json and
 * prove we read the id from where the file actually keeps it — the check whose
 * absence let `EXPO_PUBLIC_EAS_PROJECT_ID` (set nowhere) look sufficient.
 */
export function readProjectIdFrom(constants: ExpoConstantsShape | null | undefined): string | null {
  const id = constants?.expoConfig?.extra?.eas?.projectId ?? constants?.easConfig?.projectId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
}

/**
 * Lazily required, like expo-notifications above: this module must stay
 * importable in the node test runner, which has no expo native modules.
 */
function loadExpoConstants(): ExpoConstantsShape | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-constants') as { default?: ExpoConstantsShape } & ExpoConstantsShape;
    return mod.default ?? mod;
  } catch {
    return null;
  }
}

/**
 * The EAS project id `getExpoPushTokenAsync` needs. Env override first, then
 * app.json via expo-constants.
 */
export function resolveEasProjectId(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
  if (fromEnv) return fromEnv;
  return readProjectIdFrom(loadExpoConstants());
}

export type PushRegistrationResult =
  | { registered: true; platform: 'ios' | 'android' }
  | {
      registered: false;
      reason:
        | 'unsupported-platform'
        | 'permission-denied'
        | 'no-project-id'
        | 'no-token'
        | 'bad-token-format';
    };

/**
 * Android 8+ drops a notification that names no channel, and the API sends
 * `channelId: 'default'`, so the channel has to exist before the first push.
 * Best-effort: a package too old to expose the API is not a reason to abandon
 * registration.
 */
async function ensureAndroidChannel(notif: ExpoNotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  if (typeof notif.setNotificationChannelAsync !== 'function') return;
  try {
    await notif.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Darshya',
      importance: notif.AndroidImportance?.DEFAULT ?? 3,
      lightColor: '#EA580C',
    });
  } catch {
    // Channel creation is not load-bearing for obtaining the token.
  }
}

/**
 * Ask for permission, mint an Expo push token, register it.
 *
 * Returns WHY it stopped instead of bare-returning. Every early exit here used
 * to be an untyped `return`, which is a large part of why a rail that could
 * never have worked looked, from the app, exactly like a rail with nothing to
 * say.
 */
export async function fetchAndRegister(
  notif: ExpoNotificationsModule,
): Promise<PushRegistrationResult> {
  // Expo push tokens come from a real iOS/Android build. The API rejects an
  // Expo token registered as `web`, so never claim one from there.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { registered: false, reason: 'unsupported-platform' };
  }

  const perm = await notif.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    // On Android 13+ THIS is the call that raises the POST_NOTIFICATIONS
    // prompt. It was unreachable while the feature flag was unset.
    const next = await notif.requestPermissionsAsync();
    status = next.status;
  }
  if (status !== 'granted') return { registered: false, reason: 'permission-denied' };

  const projectId = resolveEasProjectId();
  // Calling without one throws in a production build; bailing with a reason is
  // more useful than an exception swallowed by the caller's catch.
  if (!projectId) return { registered: false, reason: 'no-project-id' };

  await ensureAndroidChannel(notif);

  const tokenData = await notif.getExpoPushTokenAsync({ projectId });
  const deviceToken = tokenData?.data?.trim();
  if (!deviceToken) return { registered: false, reason: 'no-token' };
  // Check the shape the API will check, on this side too. A mismatch here is a
  // client/SDK problem worth seeing, not a 400 to shrug at.
  if (!isExpoPushToken(deviceToken)) return { registered: false, reason: 'bad-token-format' };

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  await api.post<{ ok: boolean }>('/api/v1/notifications/register-token', {
    deviceToken,
    platform,
    aartiOptIn: true,
  });
  return { registered: true, platform };
}

export function usePushNotifications(): void {
  const { user } = useAuth();

  useEffect(() => {
    if (process.env.EXPO_PUBLIC_PUSH_ENABLED !== 'true') return;
    if (!user) return;
    const notif = loadExpoNotifications();
    if (!notif) return;

    fetchAndRegister(notif).catch(() => {
      // Silent — push is enhancement, not load-bearing.
    });
  }, [user]);
}
