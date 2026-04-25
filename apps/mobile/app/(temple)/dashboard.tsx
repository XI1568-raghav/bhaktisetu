import React, { useState } from 'react';
import { View } from 'react-native';
import { useDarshan, useTemples } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

export default function TempleDashboard() {
  const darshanQuery = useDarshan();
  const templesQuery = useTemples();
  const [refreshing, setRefreshing] = useState(false);

  const streams = darshanQuery.data?.data ?? [];
  const live = streams.filter((s: any) => String(s.status).toLowerCase() === 'live');
  const totalViewers = streams.reduce((a: number, s: any) => a + (s.viewerCount ?? 0), 0);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([darshanQuery.refetch(), templesQuery.refetch()]);
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Temple Dashboard"
      subtitle="Streams, bookings & donations"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Live Now" value={live.length} hint="streams" accent={colors.red[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Viewers" value={totalViewers.toLocaleString('en-IN')} accent={colors.saffron[700]} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="Bookings (Today)" value="42" />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Donations (Mo)" value="₹1,84,500" accent={colors.green[600]} />
      </View>

      <Section title="Live Darshan Streams">
        {live.length === 0 ? (
          <EmptyHint text="No streams currently live." />
        ) : (
          live.slice(0, 5).map((s: any) => (
            <ListRow
              key={s.id}
              primary={s.title ?? s.temple?.name ?? 'Stream'}
              secondary={`${s.temple?.deity ?? ''} • ${s.temple?.city ?? ''}`}
              trailing={`${(s.viewerCount ?? 0).toLocaleString('en-IN')}`}
              trailingHint="watching"
              status={{ label: 'LIVE', color: colors.red[600] }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
