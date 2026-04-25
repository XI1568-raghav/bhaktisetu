import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../lib/auth-context';
import { getRoleDashboardPath } from '../lib/role-paths';
import { colors } from '../lib/theme';

/**
 * Root index — reads auth state and redirects:
 *  - authenticated: → role dashboard
 *  - unauthenticated: → /(auth)/login
 *
 * Acts as a router for both fresh app launches and post-login redirects.
 */
export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && user) {
      router.replace(getRoleDashboardPath(user.role) as any);
    } else {
      router.replace('/(auth)/login' as any);
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.saffron[600]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.saffron[50],
  },
});
