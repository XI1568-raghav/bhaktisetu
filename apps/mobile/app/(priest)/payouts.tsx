import React, { useState } from 'react';
import { View } from 'react-native';
import { usePriestPayouts } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';

export default function PriestPayouts() {
  const payoutsQuery = usePriestPayouts();
  const [refreshing, setRefreshing] = useState(false);

  const payouts = payoutsQuery.data?.payouts ?? [];
  const total = payouts.reduce((a, p) => a + p.amount, 0);
  const paid = payouts.filter((p) => p.status.toLowerCase() === 'paid');
  const pending = payouts.filter((p) => p.status.toLowerCase() !== 'paid');

  async function onRefresh() {
    setRefreshing(true);
    await payoutsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Payouts"
      subtitle="Earnings history"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="Total Earned"
          value={`₹${total.toLocaleString('en-IN')}`}
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Pending"
          value={pending.length}
          hint={`${paid.length} paid`}
          accent={colors.amber[500]}
        />
      </View>

      <Section title="Recent Payouts">
        {payouts.length === 0 ? (
          <EmptyHint text="No payouts yet — they'll show after your first completed puja." />
        ) : (
          payouts.map((p) => (
            <ListRow
              key={p.id}
              primary={`Payout #${p.id.slice(0, 8)}`}
              secondary={p.bookingId ? `Booking ${p.bookingId.slice(0, 8)}` : 'Manual payout'}
              trailing={`₹${p.amount.toLocaleString('en-IN')}`}
              trailingHint={p.paidAt ? new Date(p.paidAt).toLocaleDateString('en-IN') : '—'}
              status={{
                label: p.status,
                color: p.status.toLowerCase() === 'paid' ? colors.green[600] : colors.amber[600],
              }}
            />
          ))
        )}
      </Section>
    </PortalScreen>
  );
}
