import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { usePriestDashboard } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import {
  selectPriestDashboard,
  selectPriestUpcoming,
  formatInr,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-03. This screen used to render
 *   `₹${data.earningsToday.toLocaleString('en-IN')}`
 * against a payload that has no `earningsToday` — so every pandit's home tab
 * threw `TypeError: Cannot read properties of undefined` as soon as the fetch
 * resolved. Until it did, a FALLBACK constant showed 3 bookings / ₹4,500 today
 * / ₹86,500 this month / 4.8 from 124 reviews. All six numbers were invented.
 *
 * The FALLBACK is gone. A failed fetch now says so; it does not show money.
 */
export default function PriestDashboard() {
  const dashboardQuery = usePriestDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const data = selectPriestDashboard(dashboardQuery.data);
  const upcoming = selectPriestUpcoming(dashboardQuery.data).slice(0, 5);

  async function onRefresh() {
    setRefreshing(true);
    await dashboardQuery.refetch();
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
      title="Priest Dashboard"
      subtitle={data ? data.displayName : 'Your bookings and earnings'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {errorText ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load your dashboard: {errorText}
          </Text>
          <Text style={styles.errorHint}>Pull down to retry.</Text>
        </View>
      ) : null}

      {dashboardQuery.isLoading && !data ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : data ? (
        <>
          <View style={styles.statRow}>
            <StatCard
              label="Upcoming"
              value={data.upcomingBookings}
              hint="bookings"
              accent={colors.saffron[700]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Completed"
              value={data.completedBookings}
              hint={`${data.totalBookings} lifetime`}
            />
          </View>
          <View style={[styles.statRow, { marginTop: spacing.sm }]}>
            <StatCard
              label="Paid out"
              value={formatInr(data.earningsTotal)}
              hint="to date"
              accent={colors.green[600]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Pending payout"
              value={formatInr(data.earningsPending)}
              accent={colors.amber[600]}
            />
          </View>
          <View style={[styles.statRow, { marginTop: spacing.sm }]}>
            <StatCard
              label="This Month"
              value={formatInr(data.earningsThisMonth)}
              accent={colors.green[600]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Rating"
              value={data.rating === null ? '—' : data.rating.toFixed(2)}
              hint={
                data.ratingCount === 1
                  ? '1 rating'
                  : `${data.ratingCount} ratings`
              }
              accent={colors.amber[500]}
            />
          </View>
        </>
      ) : null}

      <Section title="Upcoming Bookings">
        {dashboardQuery.isLoading && upcoming.length === 0 ? (
          <Text style={styles.loading}>Loading...</Text>
        ) : upcoming.length === 0 ? (
          <EmptyHint
            text={
              errorText
                ? 'Bookings could not be loaded.'
                : 'No upcoming bookings yet.'
            }
          />
        ) : (
          upcoming.map((b) => {
            const date = b.scheduledDate?.slice(0, 10) ?? '';
            const status = b.status ?? 'pending';
            return (
              <ListRow
                key={b.id}
                primary={b.pujaName ?? b.bookingNumber ?? 'Booking'}
                secondary={
                  `${b.templeName ?? ''} ${date}${b.scheduledTimeSlot ? ` ${b.scheduledTimeSlot}` : ''}`.trim() ||
                  'Schedule TBD'
                }
                trailing={
                  b.priestPayout === null ? undefined : formatInr(b.priestPayout)
                }
                status={{
                  label: status,
                  color: status.toLowerCase().includes('confirm')
                    ? colors.green[600]
                    : colors.amber[600],
                }}
              />
            );
          })
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  statRow: { flexDirection: 'row' },
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
