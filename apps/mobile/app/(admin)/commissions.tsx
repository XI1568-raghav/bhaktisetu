import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAdminCommissions } from '@poojly/api-client';
import { PortalScreen, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

type CommissionStatus = 'PENDING' | 'PAID' | 'REVERSED';

// Status values are the uppercase `CommissionStatus` enum. The route validates
// with `z.enum(['PENDING','PAID','REVERSED'])` (apps/api/src/routes/admin.ts)
// and 400s on anything else — these chips used to send lowercase
// `pending|paid|reversed`, so every filter but "All" failed with a 400 and the
// admin saw an error banner over an empty list. REVERSED is written by the
// refund path and needs migration 20260810000000_commission_status_reversed
// applied on the target database.
const STATUS_FILTERS: Array<{ key: 'all' | CommissionStatus; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'PAID', label: 'Paid' },
  { key: 'REVERSED', label: 'Reversed' },
];

const PAGE_SIZE = 20;

function statusColor(status?: string): string {
  const s = String(status ?? '').toLowerCase();
  if (s.includes('paid') || s.includes('settled')) return colors.green[600];
  if (s.includes('revers')) return colors.red[600];
  if (s.includes('pend')) return colors.amber[600];
  return colors.stone[600];
}

/**
 * Money arrives as a Decimal string so no precision is lost in transit. Format
 * for display only — never parse a column into a Number to add it to another.
 */
function inr(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function AdminCommissions() {
  const [filter, setFilter] = useState<'all' | CommissionStatus>('all');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const commissionsQuery = useAdminCommissions({
    status: filter === 'all' ? undefined : filter,
    page,
    pageSize: PAGE_SIZE,
  });

  const rows = commissionsQuery.data?.data ?? [];
  // `total` is the ledger-wide count for the active filter, straight from the
  // server. The header used to reduce the CURRENT PAGE's `amount` column into a
  // rupee figure and present it as the platform's commission position: on a
  // 500-row ledger that read "20 entries • ₹1,60,000 total" against a real
  // ~₹40,00,000, with no pagination control and nothing saying the list was
  // truncated. It was also a JS float sum over Decimal money. Both are gone —
  // the count is server-derived and no money is summed on the client.
  const total = commissionsQuery.data?.total ?? 0;
  const pageSize = commissionsQuery.data?.pageSize ?? PAGE_SIZE;
  const pageCount = total > 0 ? Math.ceil(total / pageSize) : 1;
  const firstOnPage = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastOnPage = Math.min(page * pageSize, total);

  async function onRefresh() {
    setRefreshing(true);
    await commissionsQuery.refetch();
    setRefreshing(false);
  }

  function selectFilter(key: 'all' | CommissionStatus) {
    setFilter(key);
    // A new filter has its own row set; staying on page 4 would land past the
    // end and render an empty list that looks like "no results".
    setPage(1);
  }

  return (
    <PortalScreen
      title="Commissions"
      subtitle={
        // Never assert a count before one has arrived — a "0 entries" header
        // over a loading spinner reads as an empty ledger.
        commissionsQuery.isLoading
          ? 'Loading…'
          : commissionsQuery.isError
            ? 'Unavailable'
            : total === 0
              ? 'No entries'
              : `Showing ${firstOnPage}–${lastOnPage} of ${total} entries`
      }
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
              onPress={() => selectFilter(f.key)}
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
          const provider = c.providerName ?? c.providerId ?? '—';
          const reference = c.bookingNumber ?? c.itemName ?? null;
          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardPrimary}>{provider}</Text>
                  <Text style={styles.cardSecondary}>
                    {(c.providerRole ?? 'provider')}
                    {reference ? ` • ${reference}` : ''}
                    {c.createdAt ? ` • ${new Date(c.createdAt).toLocaleDateString('en-IN')}` : ''}
                  </Text>
                </View>
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: `${statusColor(c.status)}1A`, borderColor: statusColor(c.status) },
                  ]}
                >
                  <Text style={[styles.pillText, { color: statusColor(c.status) }]}>{c.status}</Text>
                </View>
              </View>
              {/*
                `amount` is the PROVIDER's earning, not the platform's — see
                apps/api/src/lib/commission-math.ts. This row used to label it
                "Commission", so a ₹10,000 booking on the 20/80 split showed the
                platform earning ₹8,000 when it earned ₹2,000: a 4x
                overstatement, the same defect admin.service.ts was already
                fixed for. `platformCut` and `grossAmount` are derived
                server-side through that module; nothing is back-solved here.
              */}
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Provider earning</Text>
                <Text style={styles.amount}>{inr(c.amount)}</Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>
                  Platform cut{c.ratePercent ? ` (${c.ratePercent}%)` : ''}
                </Text>
                <Text style={styles.amountSub}>{inr(c.platformCut)}</Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={styles.amountLabel}>Gross</Text>
                <Text style={styles.amountSub}>{inr(c.grossAmount)}</Text>
              </View>
              {c.payoutReference ? (
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Payout ref</Text>
                  <Text style={styles.amountSub}>{c.payoutReference}</Text>
                </View>
              ) : null}
            </View>
          );
        })
      )}

      {total > pageSize ? (
        <View style={styles.pager}>
          <TouchableOpacity
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            activeOpacity={0.7}
            style={[styles.pagerBtn, page <= 1 && styles.pagerBtnDisabled]}
          >
            <Text style={[styles.pagerText, page <= 1 && styles.pagerTextDisabled]}>Previous</Text>
          </TouchableOpacity>
          <Text style={styles.pagerLabel}>
            Page {page} of {pageCount}
          </Text>
          <TouchableOpacity
            onPress={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            activeOpacity={0.7}
            style={[styles.pagerBtn, page >= pageCount && styles.pagerBtnDisabled]}
          >
            <Text style={[styles.pagerText, page >= pageCount && styles.pagerTextDisabled]}>Next</Text>
          </TouchableOpacity>
        </View>
      ) : null}
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
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  pagerBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.stone[900],
  },
  pagerBtnDisabled: { backgroundColor: colors.stone[100] },
  pagerText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.white },
  pagerTextDisabled: { color: colors.stone[400] },
  pagerLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.stone[500] },
});
