import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStoreAdminRevenue } from '@poojly/api-client';
import { PortalScreen, Section, StatCard, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

function inr(v: number | undefined): string {
  return `₹${(v ?? 0).toLocaleString('en-IN')}`;
}

export default function StoreRevenue() {
  const revenueQuery = useStoreAdminRevenue();
  const [refreshing, setRefreshing] = useState(false);

  const totals = revenueQuery.data?.totals ?? {};
  const topProducts = revenueQuery.data?.topProducts ?? [];

  async function onRefresh() {
    setRefreshing(true);
    await revenueQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Revenue"
      subtitle="Lifetime aggregates"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard label="Today" value={inr(totals.todayInr)} accent={colors.green[600]} />
        <View style={{ width: spacing.sm }} />
        <StatCard label="This Month" value={inr(totals.monthInr)} />
      </View>
      <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
        <StatCard label="This Year" value={inr(totals.yearInr)} accent={colors.saffron[600]} />
      </View>

      <Section title="Top Products">
        {revenueQuery.isLoading ? (
          <EmptyHint text="Loading revenue…" />
        ) : revenueQuery.isError ? (
          <EmptyHint text="Could not load revenue. Pull to refresh." />
        ) : topProducts.length === 0 ? (
          <EmptyHint text="No paid orders yet — top products will appear once orders flow." />
        ) : (
          topProducts.map((p, i) => (
            <View key={p.id} style={styles.topRow}>
              <Text style={styles.rank}>#{i + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.topName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.topSold}>{p.sold} sold</Text>
              </View>
              <Text style={styles.topRevenue}>{inr(p.revenueInr)}</Text>
            </View>
          ))
        )}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  rank: {
    fontSize: fontSize.base,
    fontWeight: '800',
    color: colors.saffron[600],
    width: 30,
  },
  topName: { fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  topSold: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 2 },
  topRevenue: { fontSize: fontSize.base, fontWeight: '700', color: colors.green[600] },
});
