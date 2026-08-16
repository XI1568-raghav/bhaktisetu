import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { useTemplePortalPayouts } from '../../lib/portal-queries';
import { selectTemplePayouts, formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-22. Temple payouts existed on the web (/temple-portal/payouts) and had no
 * mobile equivalent — a temple manager on a phone could see donations and
 * offerings but had no way to find out whether the platform had paid them.
 *
 * Two things this screen refuses to do, both because the endpoint's own error
 * bodies make them easy mistakes:
 *
 *   • A 403 body is {error: 'TEMPLE_MANAGER role required'} — no `payouts`
 *     array. selectTemplePayouts returns null for it, and the screen says the
 *     ledger is unavailable. Rendering "₹0 received" to a manager who was
 *     refused is a false financial statement, not an empty state.
 *   • `pendingInr` / `paidInr` are read from the server, never re-derived here.
 *     The route computes them off `status === 'pending'` / `'completed'`
 *     (temple-portal.ts:358-359); a second local sum would silently disagree
 *     the day a third status appears.
 */
export default function TemplePayouts() {
  const payoutsQuery = useTemplePortalPayouts();
  const [refreshing, setRefreshing] = useState(false);

  const vm = selectTemplePayouts(payoutsQuery.data);
  const unavailable = !payoutsQuery.isLoading && vm === null;

  async function onRefresh() {
    setRefreshing(true);
    await payoutsQuery.refetch();
    setRefreshing(false);
  }

  return (
    <PortalScreen
      title="Payouts"
      subtitle={
        payoutsQuery.isLoading
          ? 'Loading…'
          : unavailable
            ? 'Unavailable'
            : `${vm?.total ?? 0} payout${(vm?.total ?? 0) === 1 ? '' : 's'} on record`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unavailable ? (
        <Text style={styles.errorBanner}>
          Your payout ledger could not be loaded, so no figures are shown. This
          is a server or permission error — it is not a report that you have
          been paid nothing. Pull down to retry.
        </Text>
      ) : null}

      {vm ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              label="Paid out"
              value={vm.paidInr === null ? '—' : formatInr(vm.paidInr)}
              accent={colors.green[600]}
              hint="Settled to your account"
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="Pending"
              value={vm.pendingInr === null ? '—' : formatInr(vm.pendingInr)}
              accent={colors.amber[600]}
              hint="Awaiting settlement"
            />
          </View>

          <Section title="Payout history">
            {vm.rows.length === 0 ? (
              <EmptyHint text="No payouts yet. They appear after a booking at your temple completes." />
            ) : (
              vm.rows.map((p) => (
                <ListRow
                  key={p.id}
                  primary={
                    p.reference ? `Ref ${p.reference}` : `Payout ${p.id.slice(0, 8)}`
                  }
                  secondary={
                    p.bookingId
                      ? `Booking ${p.bookingId.slice(0, 8)}`
                      : 'Not linked to a booking'
                  }
                  // A Decimal that failed to parse shows a dash. It never
                  // becomes ₹0 — that would read as "we paid you nothing".
                  trailing={p.amountInr === null ? '—' : formatInr(p.amountInr)}
                  trailingHint={formatDay(p.processedAt ?? p.createdAt)}
                  status={{
                    label: p.status,
                    color:
                      p.status === 'completed'
                        ? colors.green[600]
                        : p.status === 'failed'
                          ? colors.red[600]
                          : colors.amber[600],
                  }}
                />
              ))
            )}
          </Section>
        </>
      ) : null}
    </PortalScreen>
  );
}

function formatDay(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN');
}

const styles = StyleSheet.create({
  errorBanner: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: colors.red[500],
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.red[600],
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
});
