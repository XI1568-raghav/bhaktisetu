import React, { useState } from 'react';
import { View } from 'react-native';
import { useAstrologerDashboard } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

function inr(v: number | undefined): string {
  return `₹${(v ?? 0).toLocaleString('en-IN')}`;
}

export default function AstrologerDashboard() {
  const dashboardQuery = useAstrologerDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const today = dashboardQuery.data?.todayConsultations ?? [];
  const stats = dashboardQuery.data?.stats ?? {};

  async function onRefresh() {
    setRefreshing(true);
    await dashboardQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Astrologer Dashboard"
      subtitle={dashboardQuery.isLoading ? 'Loading…' : "Today's consultations"}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Today"
          value={stats.todayCount ?? 0}
          hint="consultations"
          accent={colors.saffron[700]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Earnings Today"
          value={inr(stats.earningsToday)}
          accent={colors.green[600]}
        />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="This Month" value={inr(stats.monthEarnings)} />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Rating"
          value={stats.rating ? stats.rating.toFixed(1) : '—'}
          hint={stats.ratingCount ? `${stats.ratingCount} reviews` : 'no reviews yet'}
          accent={colors.amber[500]}
        />
      </View>

      <Section title="Today's Schedule">
        {dashboardQuery.isLoading ? (
          <EmptyHint text="Loading consultations…" />
        ) : dashboardQuery.isError ? (
          <EmptyHint text="Could not load schedule. Pull to refresh." />
        ) : today.length === 0 ? (
          <EmptyHint text="No consultations scheduled today." />
        ) : (
          today.map((c) => (
            <ListRow
              key={c.id}
              primary={`${c.clientName ?? 'Client'} • ${c.timeLabel ?? c.scheduledAt ?? ''}`}
              secondary={c.topic ?? ''}
              trailing={c.amount ? inr(c.amount) : undefined}
              status={{
                label: c.status ?? 'scheduled',
                color: c.status === 'confirmed' ? colors.green[600] : colors.amber[600],
              }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
