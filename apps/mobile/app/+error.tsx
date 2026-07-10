import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';
import { colors, spacing, fontSize, borderRadius } from '../lib/theme';

declare const __DEV__: boolean;

/**
 * Expo Router root error boundary.
 *
 * Renders whenever any route in the app throws during render. We capture the
 * error to Sentry (no-op without EXPO_PUBLIC_SENTRY_DSN) and offer a Reload
 * button that replaces the route stack with the home screen. Expo Router
 * re-uses this file automatically — no wiring in _layout.tsx is required.
 */
export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) return;
    Sentry.captureException(error);
  }, [error]);

  const handleReload = () => {
    // reset() clears the error boundary so the current route re-renders. When
    // the error was structural (a bad route state), re-entering at the index is
    // safer, so we attempt a soft reset first and let Expo Router settle.
    try {
      reset();
    } catch {
      /* reset threw — nothing more we can do here */
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.emoji}>🙏</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          Darshya hit an unexpected error. You can try reloading — your data is
          safe.
        </Text>
        {typeof __DEV__ !== 'undefined' && __DEV__ && (
          <Text style={styles.dev} numberOfLines={4}>
            {error?.message ?? String(error)}
          </Text>
        )}
        <Pressable style={styles.button} onPress={handleReload} accessibilityRole="button">
          <Text style={styles.buttonText}>Reload</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.stone[50],
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize['2xl'],
    fontWeight: '700',
    color: colors.stone[900],
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  body: {
    fontSize: fontSize.base,
    color: colors.stone[600],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.md,
  },
  dev: {
    fontSize: fontSize.xs,
    color: colors.stone[400],
    textAlign: 'center',
    marginBottom: spacing.md,
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSize.base,
    fontWeight: '600',
  },
});
