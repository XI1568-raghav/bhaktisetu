import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useInstructorSessions } from '../../lib/provider-queries';
import {
  selectInstructorSessions,
  totalEnrolled,
  upcomingSessions,
} from '../../lib/instructor-sessions';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';

import { useExitConfirm } from '../../lib/use-exit-confirm';
/**
 * PAR-10 removed three invented figures from this screen — "Students 68",
 * "Earnings (mo) ₹54,200" and "Rating 4.9 (44 reviews)" were string literals
 * with no endpoint behind them. What it left behind was still reading the wrong
 * endpoint: `useWellnessSessions()` is the PUBLIC catalogue, filtered to
 * upcoming SCHEDULED/LIVE rows across ALL instructors, narrowed here by a
 * client-side `!s.instructorId || s.instructorId === user.id` whose first
 * clause admits other people's classes. So "N of your classes" counted rows
 * this instructor does not teach, and omitted every class they had already
 * taught.
 *
 * `GET /wellness/sessions/mine` is the instructor-scoped read — see
 * lib/instructor-sessions.ts. It is role-gated server-side, so there is no
 * ownership filter here at all.
 *
 * "Seats sold" is the server's own PAID+ATTENDED `enrolled` count. "Listed
 * value" is explicitly labelled as a ceiling on the gross ticket price, not an
 * earning: the instructor's share is (1 − platform rate) and is shown, settled
 * and unsettled, on the Earnings tab.
 */
export default function WellnessDashboard() {
  // Android: guard the app's exit point. This screen is a stack root
  // (index.tsx router.replace()s here), so back would otherwise quit
  // outright with no confirmation. No-op on iOS.
  useExitConfirm();

  const sessionsQuery = useInstructorSessions();
  const [refreshing, setRefreshing] = useState(false);

  const sessions = selectInstructorSessions(sessionsQuery.data);
  const upcoming = sessions === null ? [] : upcomingSessions(sessions);
  const seatsOffered =
    sessions === null ? null : sessions.reduce((a, s) => a + (s.capacity ?? 0), 0);
  const seatsSold = sessions === null ? null : totalEnrolled(sessions);
  const listedValue =
    sessions === null
      ? null
      : sessions.reduce((a, s) => a + (s.priceInr ?? 0) * (s.capacity ?? 0), 0);

  const loadError = sessionsQuery.isError
    ? sessionsQuery.error instanceof Error
      ? sessionsQuery.error.message
      : 'Unknown error'
    : !sessionsQuery.isLoading && sessions === null
      ? 'The server returned an unexpected response.'
      : null;

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Wellness Dashboard"
      subtitle={
        sessionsQuery.isLoading && sessions === null
          ? 'Loading…'
          : sessions === null
            ? 'Sessions unavailable'
            : `${sessions.length} ${sessions.length === 1 ? 'class' : 'classes'} you teach`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {loadError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Could not load your classes: {loadError}</Text>
          <Text style={styles.errorHint}>
            No figures are shown. This is not a report that you have no classes.
            Pull down to retry.
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Upcoming"
          value={sessions === null ? '—' : upcoming.length}
          hint="scheduled classes"
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Seats sold"
          value={seatsSold === null ? '—' : seatsSold}
          hint={seatsOffered === null ? 'paid enrolments' : `of ${seatsOffered} offered`}
        />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard
          label="Listed value"
          value={listedValue === null ? '—' : formatInr(listedValue)}
          hint="ticket price if every seat sells — not your earnings"
          accent={colors.saffron[700]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Total classes"
          value={sessions === null ? '—' : sessions.length}
          hint="all dates and statuses"
        />
      </View>

      <Section title="Upcoming Sessions">
        {sessionsQuery.isLoading && sessions === null ? (
          <EmptyHint text="Loading your sessions…" />
        ) : sessions === null ? (
          <EmptyHint text="Could not load your sessions. Pull down to retry." />
        ) : upcoming.length === 0 ? (
          <EmptyHint text="No upcoming sessions scheduled." />
        ) : (
          upcoming.slice(0, 6).map((s) => (
            <ListRow
              key={s.id}
              primary={s.title}
              secondary={[
                wellnessSessionTypeLabel(s.type),
                s.durationMinutes !== null ? `${s.durationMinutes} min` : null,
                s.capacity !== null && s.enrolled !== null
                  ? `${s.enrolled}/${s.capacity} seats sold`
                  : s.capacity !== null
                    ? `${s.capacity} seats`
                    : null,
              ]
                .filter(Boolean)
                .join(' • ')}
              trailing={
                s.scheduledAt
                  ? new Date(s.scheduledAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : undefined
              }
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm, fontWeight: '600' },
  errorHint: { color: colors.red[600], fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
});
