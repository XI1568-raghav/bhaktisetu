import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAdminPendingApprovals } from '@poojly/api-client';
import { PortalScreen, Section, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { userRoleLabel } from '../../lib/enum-labels';

export default function AdminApprovals() {
  const approvalsQuery = useAdminPendingApprovals();
  const [refreshing, setRefreshing] = useState(false);
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const all = approvalsQuery.data?.approvals ?? [];
  const pending = all.filter((a) => !actioned.has(a.id));

  async function onRefresh() {
    setRefreshing(true);
    await approvalsQuery.refetch();
    setRefreshing(false);
  }

  function decide(id: string, name: string, action: 'approve' | 'reject') {
    Alert.alert(
      action === 'approve' ? 'Approve user?' : 'Reject user?',
      `${action === 'approve' ? 'Approve' : 'Reject'} ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'approve' ? 'Approve' : 'Reject',
          style: action === 'approve' ? 'default' : 'destructive',
          onPress: () => {
            setActioned((s) => new Set([...s, id]));
            Alert.alert(
              action === 'approve' ? 'Approved' : 'Rejected',
              `${name} ${action === 'approve' ? 'approved' : 'rejected'}.`,
            );
          },
        },
      ],
    );
  }

  return (
    <PortalScreen
      title="Approvals"
      subtitle={`${pending.length} pending`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <Section title="Pending Provider Verifications">
        {pending.length === 0 ? (
          <EmptyHint text="All caught up — no pending approvals." />
        ) : (
          pending.map((u) => (
            <View key={u.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{u.fullName}</Text>
                <Text style={styles.meta}>
                  {userRoleLabel(u.role)} • {u.email ?? u.phone}
                </Text>
                <Text style={styles.dateText}>
                  Applied {new Date(u.createdAt).toLocaleDateString('en-IN')}
                </Text>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.green[600] }]}
                  activeOpacity={0.7}
                  onPress={() => decide(u.id, u.fullName, 'approve')}
                >
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, { backgroundColor: colors.red[600] }]}
                  activeOpacity={0.7}
                  onPress={() => decide(u.id, u.fullName, 'reject')}
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  name: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  meta: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  dateText: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4 },
  actions: { flexDirection: 'row', gap: spacing.xs },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
