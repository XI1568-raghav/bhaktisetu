import React, { useState } from 'react';
import { View } from 'react-native';
import { useTemples } from '@poojly/api-client';
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
  type: 'cash' | 'chadhava' | 'annadan' | 'pratishtha';
  amount: number;
  date: string;
  note?: string;
}

const FALLBACK: Donation[] = [
  { id: '1', donor: 'Anonymous', type: 'cash', amount: 5100, date: 'Today, 9:42 AM' },
  { id: '2', donor: 'Anjali S.', type: 'chadhava', amount: 251, date: 'Today, 8:15 AM', note: 'Flowers + diya' },
  { id: '3', donor: 'Ramesh K.', type: 'annadan', amount: 1100, date: 'Yesterday', note: '50 plates' },
  { id: '4', donor: 'Priya M.', type: 'cash', amount: 11000, date: '2 days ago' },
  { id: '5', donor: 'Vikram B.', type: 'pratishtha', amount: 25000, date: '3 days ago', note: 'Murti pratishtha' },
  { id: '6', donor: 'Devotee Family', type: 'chadhava', amount: 501, date: '4 days ago' },
];

const TYPE_COLOR: Record<Donation['type'], string> = {
  cash: colors.green[600],
  chadhava: colors.saffron[600],
  annadan: colors.amber[500],
  pratishtha: colors.red[600],
};

export default function TempleDonations() {
  const templesQuery = useTemples();
  const [refreshing, setRefreshing] = useState(false);

  const donations = FALLBACK;
  const total = donations.reduce((a, d) => a + d.amount, 0);
  const today = donations.filter((d) => d.date.startsWith('Today')).reduce((a, d) => a + d.amount, 0);

  async function onRefresh() {
    setRefreshing(true);
    await templesQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Donations"
      subtitle={`₹${total.toLocaleString('en-IN')} this month`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Today" value={`₹${today.toLocaleString('en-IN')}`} accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="This Month" value={`₹${total.toLocaleString('en-IN')}`} accent={colors.saffron[700]} />
      </View>

      <Section title="Recent Donations">
        {donations.length === 0 ? (
          <EmptyHint text="No donations recorded yet." />
        ) : (
          donations.map((d) => (
            <ListRow
              key={d.id}
              primary={`${d.donor} • ${d.type.toUpperCase()}`}
              secondary={`${d.date}${d.note ? ` • ${d.note}` : ''}`}
              trailing={`₹${d.amount.toLocaleString('en-IN')}`}
              status={{ label: d.type, color: TYPE_COLOR[d.type] }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
