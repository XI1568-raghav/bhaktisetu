import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient } from '@poojly/api-client';
import {
  AuthProvider,
  getStoredAccessToken,
  onUnauthorisedMobile,
  useAuth,
} from '../lib/auth-context';
import { initSentryMobile } from '../lib/sentry';
import { usePushNotifications } from '../lib/push-notifications';
import { useDeepLinkRouter } from '../lib/deep-link';
import { apiBase } from '../lib/api';

function PushRegister() {
  usePushNotifications();
  return null;
}

function DeepLinkRegister() {
  useDeepLinkRouter();
  return null;
}

/**
 * Mounts the one translator from darshya:// and https://darshya.online URLs to
 * expo-router paths (lib/deep-link.ts). Unmounted, those URLs fall through to
 * expo-router's default linking, which has no `puja/[slug]` route, so every
 * marketing link, share link and push tap resolves to not-found.
 *
 * Gated on auth state because useDeepLinkRouter reads Linking.getInitialURL()
 * exactly once, from a mount effect. On a cold start that read would fire while
 * the session is still being restored from expo-secure-store, and app/index.tsx
 * would immediately router.replace() the deep-link destination away to
 * /(auth)/login. isLoading starts true and only ever flips to false, so gating
 * on it defers that single read to a later render — by which point the root
 * <Stack> is mounted and the auth guard will honour the destination.
 */
function DeepLinkGate() {
  const { isLoading } = useAuth();
  // One-way latch. Remounting DeepLinkRegister would reset the hook's
  // already-handled URL set and replay the cold-start link.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!isLoading) setArmed(true);
  }, [isLoading]);

  return armed ? <DeepLinkRegister /> : null;
}

// Initialise Sentry once at module load, before any user code runs.
// No-op if EXPO_PUBLIC_SENTRY_DSN is missing.
initSentryMobile();

// Initialise the api-client once at module load.
// getAuthToken reads from expo-secure-store via the auth context's helper.
// apiBase() reuses the shared loud-failing resolver in lib/api so a build
// missing EXPO_PUBLIC_API_URL fails at first call instead of silently hitting
// localhost:4000 (unreachable from physical devices).
initApiClient({
  baseUrl: apiBase(),
  getAuthToken: getStoredAccessToken,
  timeout: 30_000,
  // P0-8b: clear token + route to login on 401. Delegates to the module-level
  // ref in lib/auth-context (single-flight latch) so the provider's signOut is
  // invoked once even under concurrent 401s.
  onUnauthorised: onUnauthorisedMobile,
});

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <PushRegister />
          <DeepLinkGate />
          <StatusBar style="dark" backgroundColor="#FFFFFF" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#FAFAF9' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(devotee)" options={{ headerShown: false }} />
            <Stack.Screen name="(priest)" options={{ headerShown: false }} />
            <Stack.Screen name="(store-admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(astrologer)" options={{ headerShown: false }} />
            <Stack.Screen name="(wellness)" options={{ headerShown: false }} />
            <Stack.Screen name="(temple)" options={{ headerShown: false }} />
            <Stack.Screen name="(gaushala)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(onboard)" options={{ headerShown: false }} />
          </Stack>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
