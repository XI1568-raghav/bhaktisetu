import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAdminCommissions } from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

interface CommissionRow {
  id: string;
  bookingId?: string;
  providerId?: string;
  providerName?: string;
  providerType?: string;
  amount?: number | string;
  commissionAmount?: number | string;
  netAmount?: number | string;
  status?: string;
  createdAt?: string;
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'paid', label: 'Paid' },
  { key: 'reversed', label: 'Reversed' },
];

function statusColor(status?: string): string {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('paid') || s.includes('settled')) return colors.green[600];
  if (s.includes('revers')) return colors.red[600];
  if (s.includes('pend')) return colors.amber[600];
  return colors.stone[600];
}

export default function AdminCommissions() {
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const params = filter === 'all' ? undefined : { status: filter };
  const commissionsQuery = useAdminCommissions(params);

  const rows = (commissionsQuery.data?.data as CommissionRow[] | undefined) ?? [];
  const total = rows.reduce(
    (acc, r) => acc + Number(r.commissionAmount ?? r.amount ?? 0),
    0
  );

  async function onRefresh() {
    setRefreshing(true);
    await commissionsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Commissions"
      subtitle={`${rows.length} entries • ₹${total.toLocaleString('en-IN')} total`}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {commissionsQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load commissions:{' '}
            {commissionsQuery.error instanceof Error
              ? commissionsQuery.error.message
              : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: spacing.sm }}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              activeOpacity={0.7}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {commissionsQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : rows.length === 0 ? (
        <EmptyHint text="No commission entries match this filter." />
      ) : (
        rows.map((c) => {
          const amount = Number(c.commissionAmount ?? c.amount ?? 0);
          const provider = c.providerName ?? c.providerId ?? '—';
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>{provider}</Text>
                  <Text style={styles.cardSecondary}>
                    {(c.providerType ?? 'provider')}
                    {c.bookingId ? ` • ${c.bookingId}` : ''}
                    {c.createdAt ? ` • ${new Date(c.createdAt).toLocaleDateString('en-IN')}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${statusColor(c.status)}1A`, borderColor: statusColor(c.status) },
                  ]}
                >
                  <Text style={[styles.pillText, { color: statusColor(c.status) }]}>{c.status ?? 'pending'}</Text>
                </View>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Commission</Text>
                <Text style={styles.amount}>₹{amount.toLocaleString('en-IN')}</Text>
              </View>
              {c.netAmount ? (
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Net to provider</Text>
                  <Text style={styles.amountSub}>
                    ₹{Number(c.netAmount).toLocaleString('en-IN')}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.stone[100],
    marginRight: spacing.sm,
  },
  chipActive: { backgroundColor: colors.stone[900] },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[600] },
  chipTextActive: { color: colors.white },
  loading: { textAlign: 'center', padding: spacing.lg, color: colors.stone[500] },
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderColor: colors.red[500],
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  errorText: { color: colors.red[600], fontSize: fontSize.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.stone[100],
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.sm },
  cardPrimary: { fontSize: fontSize.base, fontWeight: '700', color: colors.stone[900] },
  cardSecondary: { fontSize: fontSize.sm, color: colors.stone[500], marginTop: 2 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    marginLeft: spacing.sm,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: '700' },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  amountLabel: { fontSize: fontSize.sm, color: colors.stone[500] },
  amount: { fontSize: fontSize.base, fontWeight: '700', color: colors.saffron[700] },
  amountSub: { fontSize: fontSize.sm, fontWeight: '700', color: colors.stone[700] },
});
