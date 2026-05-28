import { useEffect } from 'react';
import { Platform } from 'react-native';
import { api } from '@poojly/api-client';
import { useAuth } from './auth-context';

// Push-notification scaffold. Env-or-noop on three layers:
//   1. EXPO_PUBLIC_PUSH_ENABLED !== 'true'      → skip entirely
//   2. expo-notifications package not installed → require() throws, swallow
//   3. server FCM key absent (U5 pending)       → /register-token returns
//      { ok:true, skipped:true } and ignores the row server-side
//
// Activation path:
//   pnpm --filter @poojly/mobile add expo-notifications expo-device
//   set EXPO_PUBLIC_PUSH_ENABLED=true + projectId in app.json
//   user pastes FCM_SERVER_KEY on Render (gate U5)
//
// Hook is intentionally a no-op when any layer fails — production must
// never crash because push isn't wired.

interface ExpoNotificationsModule {
  getPermissionsAsync: () => Promise<{ status: string }>;
  requestPermissionsAsync: () => Promise<{ status: string }>;
  getExpoPushTokenAsync: (opts?: { projectId?: string }) => Promise<{ data: string }>;
  setNotificationHandler: (h: unknown) => void;
}

function loadExpoNotifications(): ExpoNotificationsModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications') as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

async function fetchAndRegister(notif: ExpoNotificationsModule): Promise<void> {
  const perm = await notif.getPermissionsAsync();
  let status = perm.status;
  if (status !== 'granted') {
    const next = await notif.requestPermissionsAsync();
    status = next.status;
  }
  if (status !== 'granted') return;

  const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const tokenData = await notif.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const deviceToken = tokenData?.data;
  if (!deviceToken) return;

  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  await api.post<{ ok: boolean }>('/api/v1/notifications/register-token', {
    deviceToken,
    platform,
    aartiOptIn: true,
  });
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
