import React, { useState } from 'react';
import { View } from 'react-native';
import { useWellnessSessions } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { selectWellnessSessions, formatInr } from '../../lib/api-contracts';
import { useAuth } from '../../lib/auth-context';
import { colors, spacing } from '../../lib/theme';
import { wellnessSessionTypeLabel } from '../../lib/enum-labels';

/**
 * PAR-10. `sessionsQuery.data?.sessions` — GET /api/v1/wellness/sessions
 * returns {data:[…]}, so the instructor saw zero of their own classes.
 *
 * Removed with the fix: "Students 68", "Earnings (mo) ₹54,200" and
 * "Rating 4.9 (44 reviews)". All three were string literals with no endpoint
 * behind them — an instructor's own earnings figure, invented. Enrolment,
 * earnings and rating are not on this endpoint; the cards that remain are
 * computed from the sessions the API actually returns.
 */
export default function WellnessDashboard() {
  const sessionsQuery = useWellnessSessions();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const all = selectWellnessSessions(sessionsQuery.data);
  const sessions = user?.id ? all.filter((s) => !s.instructorId || s.instructorId === user.id) : all;

  const now = Date.now();
  const upcoming = sessions
    .filter((s) => !s.scheduledAt || new Date(s.scheduledAt).getTime() >= now)
    .sort((a, b) => (a.scheduledAt ?? '').localeCompare(b.scheduledAt ?? ''));
  const seatsOffered = sessions.reduce((a, s) => a + (s.capacity ?? 0), 0);
  const listedValue = sessions.reduce((a, s) => a + (s.priceInr ?? 0) * (s.capacity ?? 0), 0);

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Wellness Dashboard"
      subtitle={
        sessionsQuery.isLoading
          ? 'Loading…'
          : sessionsQuery.isError
            ? 'Sessions unavailable'
            : `${sessions.length} of your classes`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Upcoming"
          value={upcoming.length}
          hint="scheduled classes"
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Seats offered" value={seatsOffered} hint="across all classes" />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard
          label="Listed value"
          value={formatInr(listedValue)}
          hint="if every seat sells"
          accent={colors.saffron[700]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Total classes" value={sessions.length} />
      </View>

      <Section title="Upcoming Sessions">
        {sessionsQuery.isLoading ? (
          <EmptyHint text="Loading your sessions…" />
        ) : sessionsQuery.isError ? (
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
                s.capacity !== null ? `${s.capacity} seats` : null,
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
