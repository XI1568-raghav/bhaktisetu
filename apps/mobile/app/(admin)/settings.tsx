import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api, useAdminDashboard } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { selectAdminDashboard } from '../../lib/api-contracts';
import { describePlatformFlagSupport, describeGatewayStatus } from '../../lib/platform-flags';
import type { PaymentConfig } from '../../lib/subscription-gate';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
// AUTH-09: the confirmation used to ask "Are you sure?" without saying what
// it was sure about. POST /auth/logout defaults to scope 'global'.
import { SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE } from '../../lib/signout-copy';

/**
 * PAR-19. The five "Feature Flags" switches were `useState` and nothing else:
 * no fetch, no mutation, no persistence, values invented at mount and lost on
 * unmount. An admin could believe they had disabled a payment gateway, turned
 * off mandatory video proof for payouts, or stopped auto-approving devotee
 * accounts — over money and over trust-and-safety — and nothing had changed.
 * The state also still carried a `stripe: true` flag after the Stripe rail was
 * removed from the API.
 *
 * There is no platform-flag endpoint to wire these to (see lib/platform-flags
 * for the search). So the toggles are gone rather than faked, and the one
 * value that CAN be read from a real endpoint — the Razorpay gateway, via
 * GET /api/v1/payments/config — is shown read-only, defaulting to "Unknown"
 * when the request fails.
 */
export default function AdminSettings() {
  const { user, signOut } = useAuth();
  const dashboardQuery = useAdminDashboard();
  const paymentConfigQuery = useQuery<PaymentConfig>({
    queryKey: ['payments', 'config'],
    queryFn: () => api.get<PaymentConfig>('/api/v1/payments/config'),
  });
  const [refreshing, setRefreshing] = useState(false);

  const dash = selectAdminDashboard(dashboardQuery.data);
  const flagSupport = describePlatformFlagSupport();
  const gateway = describeGatewayStatus({
    config: paymentConfigQuery.data,
    isLoading: paymentConfigQuery.isLoading,
    error: paymentConfigQuery.error,
  });
  const gatewayColor =
    gateway.state === 'live'
      ? colors.green[600]
      : gateway.state === 'demo'
        ? colors.amber[600]
        : colors.stone[500];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([dashboardQuery.refetch(), paymentConfigQuery.refetch()]);
    setRefreshing(false);
  }

  function handleSignOut() {
    Alert.alert(SIGN_OUT_TITLE, SIGN_OUT_GLOBAL_MESSAGE, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login' as any);
        },
      },
    ]);
  }

  return (
    <PortalScreen
      title="Settings"
      subtitle="Platform configuration"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Ionicons name="shield-checkmark" size={28} color={colors.stone[900]} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.fullName ?? 'Admin'}</Text>
          {user?.email ? <Text style={styles.email}>{user.email}</Text> : null}
          {dash ? (
            <Text style={styles.email}>
              {dash.totalUsers.toLocaleString('en-IN')} users on platform
            </Text>
          ) : null}
        </View>
      </View>

      <Section title="Quick Links">
        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => router.push('/(admin)/support' as any)}
        >
          <Ionicons name="help-circle" size={20} color={colors.saffron[600]} />
          <Text style={styles.linkText}>Support Tickets</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => router.push('/(admin)/reports' as any)}
        >
          <Ionicons name="document-text" size={20} color={colors.saffron[600]} />
          <Text style={styles.linkText}>Exportable Reports</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          activeOpacity={0.7}
          onPress={() => router.push('/(admin)/approvals' as any)}
        >
          <Ionicons name="checkmark-circle" size={20} color={colors.saffron[600]} />
          <Text style={styles.linkText}>Pending Approvals</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.stone[300]} />
        </TouchableOpacity>
      </Section>

      <Section title="Platform Configuration">
        <Text style={styles.flagNotice}>{flagSupport.message}</Text>
        {flagSupport.readableFlags.map((f) => (
          <View key={f.id} style={styles.flagRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.flagLabel}>{f.label}</Text>
              <Text style={styles.flagDesc}>{f.description}</Text>
              <Text style={styles.flagDesc}>{gateway.detail}</Text>
            </View>
            <View style={[styles.statusPill, { borderColor: gatewayColor }]}>
              <Text style={[styles.statusText, { color: gatewayColor }]}>{gateway.label}</Text>
            </View>
          </View>
        ))}
      </Section>

      <TouchableOpacity style={styles.signOut} activeOpacity={0.7} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={18} color={colors.red[600]} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  userCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white,
    padding: spacing.md, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: colors.stone[100], gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.stone[100],
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: fontSize.xl, fontWeight: '700', color: colors.stone[900] },
  email: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  flagLabel: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  flagDesc: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  flagNotice: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: '700' },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  linkText: { flex: 1, fontSize: fontSize.base, fontWeight: '600', color: colors.stone[900] },
  signOut: {
    marginTop: spacing.lg,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 14, backgroundColor: colors.white,
    borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.red[500],
  },
  signOutText: { fontSize: fontSize.base, fontWeight: '700', color: colors.red[600] },
});
