import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAdminDashboard } from '@poojly/api-client';
import { useAuth } from '../../lib/auth-context';
import { PortalScreen, Section } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const FLAGS = [
  { id: 'video_proof_required', label: 'Video Proof Required', description: 'Mandatory for puja payouts' },
  { id: 'nri_pricing', label: 'NRI Pricing Live', description: '9-10x markup for NRI users' },
  { id: 'razorpay', label: 'Razorpay Domestic', description: 'Indian payment gateway' },
  { id: 'ai_jyotish', label: 'AI Jyotish Beta', description: 'Claude-powered astrology Q&A' },
  { id: 'auto_approve', label: 'Auto-approve Devotees', description: 'New devotee accounts skip review' },
];

export default function AdminSettings() {
  const { user, signOut } = useAuth();
  const dashboardQuery = useAdminDashboard();
  const [refreshing, setRefreshing] = useState(false);
  const [state, setState] = useState<Record<string, boolean>>({
    video_proof_required: true,
    nri_pricing: true,
    razorpay: true,
    stripe: true,
    ai_jyotish: false,
    auto_approve: true,
  });

  function toggle(id: string) {
    setState((s) => ({ ...s, [id]: !s[id] }));
  }

  async function onRefresh() {
    setRefreshing(true);
    await dashboardQuery.refetch();
    setRefreshing(false);
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure?', [
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
          {dashboardQuery.data?.totalUsers ? (
            <Text style={styles.email}>
              {dashboardQuery.data.totalUsers.toLocaleString('en-IN')} users on platform
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

      <Section title="Feature Flags">
        {FLAGS.map((f) => (
          <View key={f.id} style={styles.flagRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.flagLabel}>{f.label}</Text>
              <Text style={styles.flagDesc}>{f.description}</Text>
            </View>
            <Switch
              value={!!state[f.id]}
              onValueChange={() => toggle(f.id)}
              trackColor={{ false: colors.stone[200], true: colors.saffron[400] }}
              thumbColor={state[f.id] ? colors.saffron[600] : colors.stone[400]}
            />
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
