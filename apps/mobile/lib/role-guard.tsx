import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import type { UserRole } from '@poojly/api-client';
import { useAuth } from './auth-context';
import { getRoleDashboardPath } from './role-paths';
import { colors } from './theme';

/**
 * Guards a portal layout: redirects to login if unauthenticated, or to the
 * user's correct portal if their role is not in `allowedRoles`.
 * Mirrors apps/web/components/AuthGuard.tsx behaviour.
 */
export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || !user) {
      router.replace('/(auth)/login' as any);
      return;
    }
    if (!allowedRoles.includes(user.role)) {
      router.replace(getRoleDashboardPath(user.role) as any);
    }
  }, [isLoading, isAuthenticated, user, allowedRoles]);

  if (isLoading || !isAuthenticated || !user || !allowedRoles.includes(user.role)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.saffron[600]} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.stone[50],
  },
});
