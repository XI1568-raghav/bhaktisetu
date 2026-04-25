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
import { colors, spacing } from '../../lib/theme';

export default function WellnessDashboard() {
  const sessionsQuery = useWellnessSessions();
  const [refreshing, setRefreshing] = useState(false);

  const sessions = sessionsQuery.data?.sessions ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await sessionsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Wellness Dashboard"
      subtitle="Today's classes and student count"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Today" value={sessions.length} hint="sessions" accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Students" value="68" hint="active" />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="Earnings (mo)" value="₹54,200" accent={colors.saffron[700]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Rating" value="4.9" hint="44 reviews" accent={colors.amber[500]} />
      </View>

      <Section title="Upcoming Sessions">
        {sessions.length === 0 ? (
          <EmptyHint text="No upcoming sessions scheduled." />
        ) : (
          sessions.slice(0, 6).map((s) => (
            <ListRow
              key={s.id}
              primary={s.title}
              secondary={`${s.type ?? ''} • ${s.duration} min${s.level ? ` • ${s.level}` : ''}`}
              trailing={s.startTime ? new Date(s.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
