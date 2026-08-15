import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { MessagesEntry } from '../../lib/inbox';
import {
  selectTemplePortalDashboard,
  selectTemplePortalStreams,
  formatInr,
} from '../../lib/api-contracts';
import {
  useTemplePortalDashboard,
  useTemplePortalStreams,
} from '../../lib/portal-queries';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-09. Two defects, one screen.
 *
 * 1. The counters read `.data` off {streams,…} and {temples,…}, so they were
 *    permanently 0 even while this manager's temple was broadcasting.
 * 2. More seriously, the queries were the PUBLIC /darshan/live and /temples.
 *    Fixing only the key would have shown the manager 20 other temples'
 *    streams and viewer counts as their own numbers. Both queries now go to
 *    the role-gated /temple-portal routes, so what is on screen is this
 *    temple's data or nothing.
 *
 * "Bookings (Today) 42" and "Donations (Mo) ₹1,84,500" used to sit here as
 * string literals with no endpoint behind them. Real booking and revenue
 * totals now come from /temple-portal/dashboard's own stats block.
 */
export default function TempleDashboard() {
  const dashboardQuery = useTemplePortalDashboard();
  const streamsQuery = useTemplePortalStreams();
  const [refreshing, setRefreshing] = useState(false);

  const dash = selectTemplePortalDashboard(dashboardQuery.data);
  const streams = selectTemplePortalStreams(streamsQuery.data);
  const live = streams.filter((s) => s.isLive);
  const liveViewers = live.reduce((a, s) => a + (s.viewerCount ?? 0), 0);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([dashboardQuery.refetch(), streamsQuery.refetch()]);
    setRefreshing(false);
  }

  const loadFailed = dashboardQuery.isError || (!dashboardQuery.isLoading && dash === null);

  return (
    <PortalScreen
      title="Temple Dashboard"
      subtitle={dash?.templeName ?? 'Streams, bookings & donations'}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loadFailed ? (
        <Text style={styles.notice}>
          Could not load your temple dashboard. Pull down to retry — no figures
          are shown rather than stale or borrowed ones.
        </Text>
      ) : null}

      {dash && !dash.hasTemple ? (
        <Text style={styles.notice}>
          This account is not linked to a temple yet, so there is nothing to
          manage here. Contact Darshya support to link your temple.
        </Text>
      ) : null}

      {dash ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard label="Live Now" value={live.length} hint="streams" accent={colors.red[600]} />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Viewers"
              value={liveViewers.toLocaleString('en-IN')}
              hint="watching now"
              accent={colors.saffron[700]}
            />
          </View>
          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <StatCard
              label="Bookings"
              value={dash.stats.totalBookings.toLocaleString('en-IN')}
              hint={`${dash.stats.monthBookings.toLocaleString('en-IN')} this month`}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Revenue"
              value={formatInr(dash.stats.totalRevenueInr)}
              hint={`${formatInr(dash.stats.monthRevenueInr)} this month`}
              accent={colors.green[600]}
            />
          </View>
        </>
      ) : null}

      {/*
        PAR-22. Bookings and Payouts are new tabs; Plan moved off the tab bar to
        make room for them rather than being dropped, so it keeps an entry point
        here. A screen with no route to it is the same as a missing screen.
      */}
      <Section title="Manage">
        <View style={styles.quickRow}>
          <QuickLink icon="calendar" label="Bookings" href="/(temple)/bookings" />
          <QuickLink icon="cash" label="Payouts" href="/(temple)/payouts" />
          <QuickLink icon="card" label="Plan" href="/(temple)/subscription" />
        </View>
      </Section>

      <Section title="Messages">
        <MessagesEntry roleGroup="temple" />
      </Section>

      <Section title="Live Darshan Streams">
        {streamsQuery.isLoading ? (
          <EmptyHint text="Loading streams…" />
        ) : streamsQuery.isError ? (
          <EmptyHint text="Could not load your streams. Pull down to retry." />
        ) : live.length === 0 ? (
          <EmptyHint text="None of your streams is live right now." />
        ) : (
          live.slice(0, 5).map((s) => (
            <ListRow
              key={s.id}
              primary={s.title}
              secondary={s.cameraLocation}
              trailing={(s.viewerCount ?? 0).toLocaleString('en-IN')}
              trailingHint="watching"
              status={{ label: 'LIVE', color: colors.red[600] }}
            />
          ))
        )}
      </Section>

      <Section title="Recent Bookings">
        {!dash || dash.recentBookings.length === 0 ? (
          <EmptyHint text="No bookings for your temple yet." />
        ) : (
          dash.recentBookings.slice(0, 5).map((b) => (
            <ListRow
              key={b.id}
              primary={b.pujaName ?? b.bookingNumber ?? 'Booking'}
              secondary={[b.devotee, b.scheduledDate?.slice(0, 10)].filter(Boolean).join(' • ')}
              trailing={b.priceInr === null ? undefined : formatInr(b.priceInr)}
              status={b.status ? { label: b.status, color: colors.stone[500] } : undefined}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

function QuickLink({
  icon,
  label,
  href,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  href: string;
}) {
  return (
    <TouchableOpacity
      style={styles.quickLink}
      activeOpacity={0.7}
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href as never)}
    >
      <Ionicons name={icon} size={20} color={colors.saffron[600]} />
      <Text style={styles.quickLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  notice: {
    fontSize: fontSize.sm,
    color: colors.stone[700],
    backgroundColor: colors.amber[50],
    borderColor: colors.amber[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  quickRow: { flexDirection: 'row', gap: spacing.sm },
  quickLink: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  quickLinkText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.stone[800],
  },
});
