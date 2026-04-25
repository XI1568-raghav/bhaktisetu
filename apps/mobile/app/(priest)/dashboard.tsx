import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { usePriestDashboard, usePriestBookings } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

const FALLBACK = {
  todayBookings: 3,
  earningsToday: 4500,
  earningsThisMonth: 86500,
  rating: 4.8,
  ratingCount: 124,
  pendingVideoUploads: 1,
};

export default function PriestDashboard() {
  const dashboardQuery = usePriestDashboard();
  const bookingsQuery = usePriestBookings();
  const [refreshing, setRefreshing] = useState(false);

  const data = dashboardQuery.data ?? FALLBACK;
  const upcoming = (bookingsQuery.data?.bookings ?? []).slice(0, 5);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([dashboardQuery.refetch(), bookingsQuery.refetch()]);
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Priest Dashboard"
      subtitle="Today's overview at a glance"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={styles.statRow}>
        <StatCard
          label="Today"
          value={data.todayBookings}
          hint="bookings"
          accent={colors.saffron[700]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Earnings Today"
          value={`₹${data.earningsToday.toLocaleString('en-IN')}`}
          accent={colors.green[600]}
        />
      </View>
      <View style={[styles.statRow, { marginTop: spacing.sm }]}>
        <StatCard
          label="This Month"
          value={`₹${data.earningsThisMonth.toLocaleString('en-IN')}`}
          hint={`${data.ratingCount} reviews`}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Rating"
          value={data.rating.toFixed(1)}
          hint={`${data.pendingVideoUploads} pending uploads`}
          accent={colors.amber[500]}
        />
      </View>

      <Section title="Upcoming Bookings">
        {upcoming.length === 0 ? (
          <EmptyHint text="No upcoming bookings yet." />
        ) : (
          upcoming.map((b) => (
            <ListRow
              key={b.id}
              primary={b.pujaName}
              secondary={`${b.devoteeName} • ${b.scheduledDate}${b.scheduledTime ? ` ${b.scheduledTime}` : ''}`}
              trailing={`₹${b.totalAmount.toLocaleString('en-IN')}`}
              status={{
                label: b.status,
                color: b.status.toLowerCase().includes('confirm')
                  ? colors.green[600]
                  : colors.amber[600],
              }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row' },
});
