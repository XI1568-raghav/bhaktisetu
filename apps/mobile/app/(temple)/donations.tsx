import React, { useState } from 'react';
import { View } from 'react-native';
import { useTemplePortalDonations } from '@poojly/api-client';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { colors, spacing } from '../../lib/theme';
import { donationStatusLabel } from '../../lib/enum-labels';

function relTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

const STATUS_COLOR: Record<string, string> = {
  paid: colors.green[600],
  created: colors.amber[600],
  failed: colors.red[600],
};

export default function TempleDonations() {
  const donationsQuery = useTemplePortalDonations();
  const [refreshing, setRefreshing] = useState(false);

  const donations = donationsQuery.data?.donations ?? [];
  const paidTotal = donations
    .filter((d) => (d.status ?? '').toLowerCase() === 'paid')
    .reduce((a, d) => a + (d.amountInr ?? 0), 0);

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const todayTotal = donations
    .filter((d) => (d.status ?? '').toLowerCase() === 'paid' && new Date(d.createdAt) >= dayStart)
    .reduce((a, d) => a + (d.amountInr ?? 0), 0);

  async function onRefresh() {
    setRefreshing(true);
    await donationsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Donations"
      subtitle={`₹${paidTotal.toLocaleString('en-IN')} paid total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Today" value={`₹${todayTotal.toLocaleString('en-IN')}`} accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="All Paid" value={`₹${paidTotal.toLocaleString('en-IN')}`} accent={colors.saffron[700]} />
      </View>

      <Section title="Recent Donations">
        {donationsQuery.isLoading ? (
          <EmptyHint text="Loading donations…" />
        ) : donationsQuery.isError ? (
          <EmptyHint text="Could not load donations. Pull to refresh." />
        ) : donations.length === 0 ? (
          <EmptyHint text="No donations recorded yet." />
        ) : (
          donations.map((d) => {
            const status = (d.status ?? 'created').toLowerCase();
            return (
              <ListRow
                key={d.id}
                primary={d.donor ?? 'Anonymous'}
                secondary={`${d.receiptNumber ?? 'No receipt'} • ${relTime(d.createdAt)}`}
                trailing={`₹${(d.amountInr ?? 0).toLocaleString('en-IN')}`}
                status={{
                  label: donationStatusLabel(status),
                  color: STATUS_COLOR[status] ?? colors.stone[600],
                }}
              />
            );
          })
        )}
      </Section>
    </PortalScreen>
  );
}
