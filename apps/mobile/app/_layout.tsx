import { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { initApiClient } from '@poojly/api-client';
import { AuthProvider, getStoredAccessToken } from '../lib/auth-context';
import { initSentryMobile } from '../lib/sentry';
import { usePushNotifications } from '../lib/push-notifications';
import { apiBase } from '../lib/api';

function PushRegister() {
  usePushNotifications();
  return null;
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
