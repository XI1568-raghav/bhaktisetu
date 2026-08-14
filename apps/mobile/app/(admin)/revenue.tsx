import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAdminRevenue } from '@poojly/api-client';
import { PortalScreen, Section, StatCard, EmptyHint } from '../../lib/portal-screen';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * Shape of `GET /api/v1/admin/revenue` (apps/api/src/services/admin.service.ts
 * `getRevenue`). All figures are rupees.
 *
 * `totalCommissions` is the PLATFORM's share, already derived per row through
 * apps/api/src/lib/commission-math.ts — do not apply a take rate to it again.
 * `pendingPayouts` is the opposite side of the ledger: what providers are owed.
 */
interface AdminRevenue {
  totalCommissions: number;
  totalSubscriptions: number;
  pendingPayouts: number;
  subscriptionRevenue: Array<{
    plan: string;
    role: string;
    count: number;
    totalAmount: number;
  }>;
}

/** Compact form for a stat card; the exact figure goes in the card's hint. */
function compactInr(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${Math.round(value).toLocaleString('en-IN')}`;
}

function exactInr(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function AdminRevenue() {
  const revenueQuery = useAdminRevenue();
  const [refreshing, setRefreshing] = useState(false);

  // batch9-review (2026-08-11): this screen called useAdminRevenue(), refetched
  // it on pull-to-refresh — and never read `revenueQuery.data`. Real admin data
  // was fetched over an authed request and thrown away while the screen
  // rendered hardcoded constants: a fabricated ₹15.8L GMV, a ₹3.9L
  // "Commission" computed as `total * 0.25`, and per-stream shares taken
  // against a different (also fabricated) ₹29.2L base. The take rate is 20%,
  // not 25% — but no rate belongs here at all, because the endpoint already
  // returns the platform's cut derived through commission-math.ts. The daily
  // SERIES and per-stream STREAMS constants were deleted outright rather than
  // relabelled: the endpoint exposes no daily series and no per-stream split,
  // so there was nothing real to bind them to.
  const data = revenueQuery.data as AdminRevenue | undefined;
  const subscriptionRevenue = data?.subscriptionRevenue ?? [];

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
      {/*
        Mirrors the error/loading treatment on the sibling commissions screen.
        Without it an expired admin token or a 500 rendered a screen identical
        to a healthy one, and pull-to-refresh spun and settled as if it had
        succeeded — an operator could not tell "session dead" from "business is
        fine".
      */}
      {revenueQuery.isError ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>
            Could not load revenue:{' '}
            {revenueQuery.error instanceof Error
              ? revenueQuery.error.message
              : 'Unknown error'}
          </Text>
        </View>
      ) : null}

      {revenueQuery.isLoading ? (
        <Text style={styles.loading}>Loading...</Text>
      ) : !data ? (
        <EmptyHint text="No revenue data available." />
      ) : (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              label="Platform commission"
              value={compactInr(data.totalCommissions)}
              hint={`${exactInr(data.totalCommissions)} · settled`}
              accent={colors.green[600]}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Pending payouts"
              value={compactInr(data.pendingPayouts)}
              hint={`${exactInr(data.pendingPayouts)} · owed to providers`}
              accent={colors.amber[600]}
            />
          </View>

          <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
            <StatCard
              label="Active subscriptions"
              value={compactInr(data.totalSubscriptions)}
              hint={`${exactInr(data.totalSubscriptions)} · marketplace plans`}
              accent={colors.saffron[700]}
            />
          </View>

          <Section title="By Subscription Plan">
            {subscriptionRevenue.length === 0 ? (
              <EmptyHint text="No active marketplace subscriptions." />
            ) : (
              subscriptionRevenue.map((s) => (
                <View key={`${s.plan}-${s.role}`} style={styles.streamCard}>
                  <View style={styles.streamHead}>
                    <Text style={styles.streamName}>
                      {s.plan} · {s.role}
                    </Text>
                    <Text style={styles.streamAmount}>{exactInr(s.totalAmount)}</Text>
                  </View>
                  <Text style={styles.shareText}>
                    {s.count} active {s.count === 1 ? 'subscriber' : 'subscribers'}
                  </Text>
                </View>
              ))
            )}
          </Section>
        </>
      )}
    </PortalScreen>
  );
}

const styles = StyleSheet.create({
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
  shareText: { fontSize: fontSize.xs, color: colors.stone[400], marginTop: 4, fontWeight: '600' },
});
