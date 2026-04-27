import React, { useState } from 'react';
import { View } from 'react-native';
import { useGaushalas } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

interface Donation {
  id: string;
  donor: string;
  type: 'feeding' | 'adoption' | 'medical' | 'general';
  amount: number;
  date: string;
  recurring?: boolean;
}

const FALLBACK: Donation[] = [
  { id: '1', donor: 'Anjali S.', type: 'adoption', amount: 1100, date: 'Today', recurring: true },
  { id: '2', donor: 'Ramesh K.', type: 'feeding', amount: 251, date: 'Today' },
  { id: '3', donor: 'Priya M.', type: 'general', amount: 5000, date: 'Yesterday' },
  { id: '4', donor: 'Vikram B.', type: 'medical', amount: 3500, date: '2 days ago' },
  { id: '5', donor: 'Anonymous', type: 'feeding', amount: 501, date: '3 days ago' },
  { id: '6', donor: 'Devotee Family', type: 'adoption', amount: 1100, date: '5 days ago', recurring: true },
];

const TYPE_COLOR: Record<Donation['type'], string> = {
  feeding: colors.green[600],
  adoption: colors.saffron[600],
  medical: colors.red[600],
  general: colors.stone[600],
};

export default function GaushalaDonations() {
  const gaushalasQuery = useGaushalas();
  const [refreshing, setRefreshing] = useState(false);

  const donations = FALLBACK;
  const total = donations.reduce((a, d) => a + d.amount, 0);
  const recurring = donations.filter((d) => d.recurring).length;

  async function onRefresh() {
    setRefreshing(true);
    await gaushalasQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Donations"
      subtitle={`${donations.length} entries`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="This Month" value={`₹${total.toLocaleString('en-IN')}`} accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Recurring" value={recurring} hint="active" accent={colors.saffron[700]} />
      </View>

      <Section title="Recent Donations">
        {donations.length === 0 ? (
          <EmptyHint text="No donations recorded yet." />
        ) : (
          donations.map((d) => (
            <ListRow
              key={d.id}
              primary={`${d.donor}${d.recurring ? ' (recurring)' : ''}`}
              secondary={`${d.type.toUpperCase()} • ${d.date}`}
              trailing={`₹${d.amount.toLocaleString('en-IN')}`}
              status={{ label: d.type, color: TYPE_COLOR[d.type] }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
