import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAstrologerDashboard } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { selectAstrologerDashboard, formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { consultationStatusLabel } from '../../lib/enum-labels';

import { useExitConfirm } from '../../lib/use-exit-confirm';
/**
 * PAR-13, the app half.
 *
 * The server half is a 500: GET /api/v1/astrologer-portal/dashboard throws
 * Prisma P2023 for the demo account (a non-UUID user id reaching
 * astrologerProfile.findUnique) and returns a body containing an absolute
 * server path and four lines of source. That fix belongs in apps/api.
 *
 * What was wrong HERE is independent and survives any server fix: the screen
 * read `stats.todayCount`, `stats.earningsToday`, `stats.monthEarnings`,
 * `stats.ratingCount` and `data.todayConsultations`. The route sends none of
 * those — it sends stats.consultationsToday / earningsTodayInr /
 * earningsMonthInr / totalEarningsInr and `upcomingSessions`. So a perfectly
 * healthy 200 also rendered "Today 0 · Earnings Today ₹0 · This Month ₹0".
 *
 * And because `dashboardQuery.data?.stats ?? {}` swallowed the error case too,
 * the 500 rendered as the same confident ₹0 — an astrologer being told they
 * earned nothing today when the server never answered. An unreachable
 * dashboard now reads as unreachable.
 */
export default function AstrologerDashboard() {
  // Android: guard the app's exit point. This screen is a stack root
  // (index.tsx router.replace()s here), so back would otherwise quit
  // outright with no confirmation. No-op on iOS.
  useExitConfirm();

  const dashboardQuery = useAstrologerDashboard();
  const [refreshing, setRefreshing] = useState(false);

  const dash = selectAstrologerDashboard(dashboardQuery.data);

  async function onRefresh() {
    setRefreshing(true);
    await dashboardQuery.refetch();
    setRefreshing(false);
  }

  const unavailable = !dashboardQuery.isLoading && dash === null;

  return (
    <PortalScreen
      title="Astrologer Dashboard"
      subtitle={
        dashboardQuery.isLoading
          ? 'Loading…'
          : unavailable
            ? 'Unavailable'
            : (dash?.displayName ?? "Today's consultations")
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unavailable ? (
        <Text style={styles.errorBanner}>
          Your dashboard could not be loaded, so no figures are shown. This is a
          server error, not a report that you have zero consultations or zero
          earnings. Pull down to retry.
        </Text>
      ) : null}

      {dash ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              label="Today"
              value={dash.consultationsToday}
              hint="consultations"
              accent={colors.saffron[700]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Earnings Today"
              value={formatInr(dash.earningsTodayInr)}
              accent={colors.green[600]}
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <StatCard
              label="This Month"
              value={formatInr(dash.earningsMonthInr)}
              hint={`${formatInr(dash.totalEarningsInr)} all time`}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Rating"
              value={dash.rating === null || dash.rating === 0 ? '—' : dash.rating.toFixed(1)}
              hint={
                dash.totalConsultations > 0
                  ? `${dash.totalConsultations} consultations`
                  : 'no consultations yet'
              }
              accent={colors.amber[500]}
            />
          </View>
          {!dash.approved ? (
            <Text style={styles.pendingBanner}>
              {dash.listingNote ?? 'Your portal is active. Add your price and details to be listed, so devotees can find and book you.'}
            </Text>
          ) : null}
        </>
      ) : null}

      <Section title="Upcoming Sessions">
        {dashboardQuery.isLoading ? (
          <EmptyHint text="Loading consultations…" />
        ) : unavailable ? (
          <EmptyHint text="Schedule unavailable — the dashboard request failed." />
        ) : !dash || dash.upcoming.length === 0 ? (
          <EmptyHint text="No consultations scheduled." />
        ) : (
          dash.upcoming.map((c) => (
            <ListRow
              key={c.id}
              primary={c.reference ?? 'Consultation'}
              secondary={[
                c.scheduledAt
                  ? new Date(c.scheduledAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : null,
                c.minutes !== null ? `${c.minutes} min` : null,
                c.jitsiUrl ? 'room ready' : null,
              ]
                .filter(Boolean)
                .join(' • ')}
              trailing={c.amountInr === null ? undefined : formatInr(c.amountInr)}
              status={{
                label: consultationStatusLabel(c.status) || 'Scheduled',
                color: c.status === 'confirmed' ? colors.green[600] : colors.amber[600],
              }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    fontSize: fontSize.sm,
    color: colors.red[600],
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    lineHeight: 18,
  },
  pendingBanner: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
});
