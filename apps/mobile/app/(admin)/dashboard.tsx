import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAdminDashboard, useAdminPendingApprovals } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { selectAdminDashboard, formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { approvalStatusLabel, transactionStatusLabel, transactionTypeLabel, userRoleLabel } from '../../lib/enum-labels';

/**
 * PAR-04. Two defects lived here.
 *
 * 1. `data.totalBookings.toLocaleString('en-IN')` — /api/v1/admin/dashboard has
 *    never returned totalBookings or activeTemples, so the founder's own admin
 *    home threw a TypeError on render.
 * 2. Before the crash it flashed a FALLBACK of 12,450 users / 3,240 bookings /
 *    ₹45.2L revenue / 128 temples. The truth is 23 users and ₹26,869. Numbers
 *    that wrong are not a placeholder, they are a liability.
 *
 * Revenue is now rendered with Indian digit grouping. The old card divided by
 * 100000 and printed "₹0.3L", which hid four-figure revenue entirely.
 */
export default function AdminDashboard() {
  const dashboardQuery = useAdminDashboard();
  const approvalsQuery = useAdminPendingApprovals();
  const [refreshing, setRefreshing] = useState(false);

  const data = selectAdminDashboard(dashboardQuery.data);
  const approvals = approvalsQuery.data?.approvals ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([dashboardQuery.refetch(), approvalsQuery.refetch()]);
    setRefreshing(false);
  }

  const errorText = dashboardQuery.isError
    ? dashboardQuery.error instanceof Error
      ? dashboardQuery.error.message
      : 'Unknown error'
    : !dashboardQuery.isLoading && data === null
      ? 'The server returned an unexpected response.'
      : null;

  return (
    <PortalScreen
      title="Admin"
      subtitle="Platform overview"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {errorText ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load platform metrics: {errorText}
          </Text>
          <Text style={styles.errorHint}>Pull down to retry.</Text>
        </View>
      ) : null}

      {dashboardQuery.isLoading && !data ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : data ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              label="Users"
              value={data.totalUsers.toLocaleString('en-IN')}
              accent={colors.saffron[700]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Revenue"
              value={formatInr(data.totalRevenue)}
              accent={colors.green[600]}
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <StatCard
              label="Pending"
              value={data.pendingApprovals}
              hint="approvals"
              accent={colors.amber[600]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Subscriptions"
              value={data.activeSubscriptions}
              hint="active"
            />
          </View>

          <Section title="Users by role">
            {Object.keys(data.usersByRole).length === 0 ? (
              <EmptyHint text="No role breakdown returned." />
            ) : (
              Object.entries(data.usersByRole)
                .sort((a, b) => b[1] - a[1])
                .map(([role, count]) => (
                  <ListRow
                    key={role}
                    primary={role.replace(/_/g, ' ').toLowerCase()}
                    trailing={String(count)}
                  />
                ))
            )}
          </Section>

          <Section title="Recent Transactions">
            {data.recentTransactions.length === 0 ? (
              <EmptyHint text="No recent transactions." />
            ) : (
              data.recentTransactions.slice(0, 5).map((t) => (
                <ListRow
                  key={t.id}
                  primary={transactionTypeLabel(t.type) || 'Transaction'}
                  secondary={t.createdAt?.slice(0, 10)}
                  trailing={t.amount === null ? undefined : formatInr(t.amount)}
                  status={{
                    label: transactionStatusLabel(t.status) || 'Unknown',
                    color:
                      t.status === 'COMPLETED'
                        ? colors.green[600]
                        : colors.amber[600],
                  }}
                />
              ))
            )}
          </Section>
        </>
      ) : null}

      <Section title="Recent Pending Approvals">
        {approvals.length === 0 ? (
          <EmptyHint text="No pending provider approvals." />
        ) : (
          approvals.slice(0, 5).map((u) => (
            <ListRow
              key={u.id}
              primary={u.fullName}
              secondary={`${userRoleLabel(u.role)} • ${u.email ?? u.phone}`}
              status={{ label: approvalStatusLabel(u.status) || 'Pending', color: colors.amber[600] }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  loading: { textAlign: 'center', padding: spacing.lg, color: colors.stone[500] },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2 },
});
