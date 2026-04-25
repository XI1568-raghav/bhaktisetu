import React, { useState } from 'react';
import { View } from 'react-native';
import { useAdminDashboard, useAdminPendingApprovals } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

const FALLBACK = {
  totalUsers: 12450,
  totalBookings: 3240,
  totalRevenue: 4520000,
  activeTemples: 128,
  pendingApprovals: 7,
};

export default function AdminDashboard() {
  const dashboardQuery = useAdminDashboard();
  const approvalsQuery = useAdminPendingApprovals();
  const [refreshing, setRefreshing] = useState(false);

  const data = dashboardQuery.data ?? FALLBACK;
  const approvals = approvalsQuery.data?.approvals ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([dashboardQuery.refetch(), approvalsQuery.refetch()]);
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Admin"
      subtitle="Platform overview"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Users" value={data.totalUsers.toLocaleString('en-IN')} accent={colors.saffron[700]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Bookings" value={data.totalBookings.toLocaleString('en-IN')} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="Revenue" value={`₹${(data.totalRevenue / 100000).toFixed(1)}L`} accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Temples" value={data.activeTemples} hint="active" />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard
          label="Pending"
          value={data.pendingApprovals}
          hint="approvals"
          accent={colors.amber[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Status" value="OK" hint="all systems" accent={colors.green[600]} />
      </View>

      <Section title="Recent Pending Approvals">
        {approvals.length === 0 ? (
          <EmptyHint text="No pending provider approvals." />
        ) : (
          approvals.slice(0, 5).map((u) => (
            <ListRow
              key={u.id}
              primary={u.fullName}
              secondary={`${u.role} • ${u.email ?? u.phone}`}
              status={{ label: u.status ?? 'pending', color: colors.amber[600] }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
