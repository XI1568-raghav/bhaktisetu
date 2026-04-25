import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAdminRevenue } from '@poojly/api-client';
import { PortalScreen, Section, StatCard } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const SERIES = [
  { day: 'Mon', value: 145000 },
  { day: 'Tue', value: 192000 },
  { day: 'Wed', value: 168000 },
  { day: 'Thu', value: 218000 },
  { day: 'Fri', value: 254000 },
  { day: 'Sat', value: 312000 },
  { day: 'Sun', value: 289000 },
];

const STREAMS = [
  { name: 'Puja Bookings', amount: 1820000, share: 62 },
  { name: 'Store Sales', amount: 524000, share: 18 },
  { name: 'Astrology', amount: 312000, share: 11 },
  { name: 'Donations', amount: 145000, share: 5 },
  { name: 'Subscriptions', amount: 118000, share: 4 },
];

export default function AdminRevenue() {
  const revenueQuery = useAdminRevenue();
  const [refreshing, setRefreshing] = useState(false);

  const total = SERIES.reduce((a, b) => a + b.value, 0);
  const max = Math.max(...SERIES.map((s) => s.value));
  const platformCommission = Math.round(total * 0.25);

  async function onRefresh() {
    setRefreshing(true);
    await revenueQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Revenue"
      subtitle="Platform-wide breakdown"
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="GMV (7d)"
          value={`₹${(total / 100000).toFixed(1)}L`}
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Commission"
          value={`₹${(platformCommission / 100000).toFixed(1)}L`}
          hint="25% avg"
          accent={colors.saffron[700]}
        />
      </View>

      <Section title="Daily Trend">
        <View style={styles.chartCard}>
          <View style={styles.chart}>
            {SERIES.map((s) => {
              const height = (s.value / max) * 110;
              return (
                <View key={s.day} style={styles.barColumn}>
                  <View style={[styles.bar, { height }]} />
                  <Text style={styles.barLabel}>{s.day}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </Section>

      <Section title="By Stream">
        {STREAMS.map((s) => (
          <View key={s.name} style={styles.streamCard}>
            <View style={styles.streamHead}>
              <Text style={styles.streamName}>{s.name}</Text>
              <Text style={styles.streamAmount}>
                ₹{(s.amount / 100000).toFixed(1)}L
              </Text>
            </View>
            <View style={styles.barBg}>
              <View style={[styles.barFill, { width: `${s.share}%` }]} />
            </View>
            <Text style={styles.shareText}>{s.share}% of GMV</Text>
          </View>
        ))}
      </Section>
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.stone[100],
  },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: spacing.sm },
  barColumn: { flex: 1, alignItems: 'center' },
  bar: { width: '70%', backgroundColor: colors.green[600], borderRadius: 4 },
  barLabel: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 6, fontWeight: '600' },
  streamCard: {
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  streamHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  streamName: { fontSize: fontSize.base, fontWeight: '600', color: colors.stone[800] },
  streamAmount: { fontSize: fontSize.base, fontWeight: '800', color: colors.saffron[700] },
  barBg: { height: 6, backgroundColor: colors.stone[100], borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.saffron[500], borderRadius: 3 },
  shareText: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4, fontWeight: '600' },
});
