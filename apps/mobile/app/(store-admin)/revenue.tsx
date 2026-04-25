import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PortalScreen, Section, StatCard } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

const SERIES = [
  { day: 'Mon', value: 24500 },
  { day: 'Tue', value: 31800 },
  { day: 'Wed', value: 28100 },
  { day: 'Thu', value: 36400 },
  { day: 'Fri', value: 42600 },
  { day: 'Sat', value: 51200 },
  { day: 'Sun', value: 47900 },
];

const TOP_PRODUCTS = [
  { name: 'Brass Ganesha Idol', revenue: 49980 },
  { name: 'Premium Rudraksha Mala', revenue: 38970 },
  { name: 'Puja Thali Set', revenue: 26970 },
  { name: 'Bhagavad Gita', revenue: 13960 },
];

export default function StoreRevenue() {
  const total = SERIES.reduce((a, b) => a + b.value, 0);
  const max = Math.max(...SERIES.map((s) => s.value));

  return (
    <PortalScreen title="Revenue" subtitle="Last 7 days">
      <View style={{ flexDirection: 'row' }}>
        <StatCard
          label="7-Day Total"
          value={`₹${total.toLocaleString('en-IN')}`}
          accent={colors.green[600]}
        />
        <View style={{ width: spacing.sm }} />
        <StatCard
          label="Best Day"
          value={`₹${max.toLocaleString('en-IN')}`}
          hint="Saturday"
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

      <Section title="Top Products">
        {TOP_PRODUCTS.map((p, i) => (
          <View key={p.name} style={styles.topRow}>
            <Text style={styles.rank}>#{i + 1}</Text>
            <Text style={styles.topName} numberOfLines={1}>{p.name}</Text>
            <Text style={styles.topRevenue}>₹{p.revenue.toLocaleString('en-IN')}</Text>
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
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
    gap: spacing.sm,
  },
  barColumn: { flex: 1, alignItems: 'center' },
  bar: { width: '70%', backgroundColor: colors.saffron[500], borderRadius: 4 },
  barLabel: { fontSize: fontSize.xs, color: colors.stone[500], marginTop: 6, fontWeight: '600' },
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
  topName: { flex: 1, fontSize: fontSize.base, color: colors.stone[800], fontWeight: '600' },
  topRevenue: { fontSize: fontSize.base, fontWeight: '700', color: colors.green[600] },
});
