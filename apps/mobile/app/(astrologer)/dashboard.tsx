import React from 'react';
import { View } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

const TODAY = [
  { id: '1', client: 'Anjali S.', topic: 'Career guidance', time: '11:00 AM', amount: 1500, status: 'confirmed' },
  { id: '2', client: 'Ramesh K.', topic: 'Marriage compatibility', time: '02:30 PM', amount: 2500, status: 'confirmed' },
  { id: '3', client: 'Priya M.', topic: 'Annual prediction', time: '06:00 PM', amount: 3000, status: 'pending' },
];

export default function AstrologerDashboard() {
  return (
    <PortalScreen
      title="Astrologer Dashboard"
      subtitle="Today's consultations"
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Today" value="3" hint="consultations" accent={colors.saffron[700]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Earnings Today" value="₹7,000" accent={colors.green[600]} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="This Month" value="₹1,24,500" />
        <View style={{ width: spacing.sm }} />
        <StatCard label="Rating" value="4.8" hint="84 reviews" accent={colors.amber[500]} />
      </View>

      <Section title="Today's Schedule">
        {TODAY.map((c) => (
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
        ))}
      </Section>
    </PortalScreen>
  );
}
