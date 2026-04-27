import React, { useState } from 'react';
import { View } from 'react-native';
import { useAstrologers } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

const FALLBACK_TODAY = [
  { id: '1', client: 'Anjali S.', topic: 'Career guidance', time: '11:00 AM', amount: 1500, status: 'confirmed' },
  { id: '2', client: 'Ramesh K.', topic: 'Marriage compatibility', time: '02:30 PM', amount: 2500, status: 'confirmed' },
  { id: '3', client: 'Priya M.', topic: 'Annual prediction', time: '06:00 PM', amount: 3000, status: 'pending' },
];

const FALLBACK_STATS = {
  todayCount: 3,
  earningsToday: 7000,
  monthEarnings: 124500,
  rating: 4.8,
  ratingCount: 84,
};

export default function AstrologerDashboard() {
  const astrologersQuery = useAstrologers();
  const [refreshing, setRefreshing] = useState(false);

  const today = FALLBACK_TODAY;
  const stats = FALLBACK_STATS;

  async function onRefresh() {
    setRefreshing(true);
    await astrologersQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Astrologer Dashboard"
      subtitle="Today's consultations"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Today" value={stats.todayCount} hint="consultations" accent={colors.saffron[700]} />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Earnings Today"
          value={`₹${stats.earningsToday.toLocaleString('en-IN')}`}
          accent={colors.green[600]}
        />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="This Month" value={`₹${stats.monthEarnings.toLocaleString('en-IN')}`} />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Rating"
          value={stats.rating.toFixed(1)}
          hint={`${stats.ratingCount} reviews`}
          accent={colors.amber[500]}
        />
      </View>

      <Section title="Today's Schedule">
        {today.length === 0 ? (
          <EmptyHint text="No consultations scheduled today." />
        ) : (
          today.map((c) => (
            <ListRow
              key={c.id}
              primary={`${c.client} • ${c.time}`}
              secondary={c.topic}
              trailing={`₹${c.amount.toLocaleString('en-IN')}`}
              status={{
                label: c.status,
                color: c.status === 'confirmed' ? colors.green[600] : colors.amber[600],
              }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
