import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import { useAstrologerEarnings } from '../../lib/portal-queries';
import { selectAstrologerEarnings, formatInr } from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';
import { commissionStatusLabel } from '../../lib/enum-labels';
import { READY_LABEL, REQUESTED_LABEL, UPCOMING_LABEL, requestedShown, upcomingShown } from '../../lib/earnings-copy';

/**
 * PAR-22. The astrologer earnings page exists on the web
 * (/astrologer-portal/earnings) and had no mobile equivalent — the app's
 * astrologer tabs were dashboard / consultations / availability / messages /
 * profile / plan, with no way to see the ledger behind the dashboard's totals.
 *
 * The one number this screen must not get wrong is which of the three money
 * fields per row means "yours". The route sends all three
 * (astrologer-portal.ts:113-127):
 *
 *   grossAmountInr  what the devotee paid
 *   platformCutInr  the platform's take
 *   earningsInr     the astrologer's own share  <- the payout
 *
 * `earningsInr` is the headline on every row. Gross is shown beside it, clearly
 * labelled as the consultation price, because a provider comparing the app to
 * their bank statement needs to see both — but it is never the big number.
 *
 * REVERSED rows are cancelled/refunded consultations. The server already
 * excludes them from `summary` (AW-06); they still arrive in `data`, so they
 * are listed and struck through rather than dropped, and the screen says so.
 */
export default function AstrologerEarnings() {
  const earningsQuery = useAstrologerEarnings();
  const [refreshing, setRefreshing] = useState(false);

  const vm = selectAstrologerEarnings(earningsQuery.data);
  const unavailable = !earningsQuery.isLoading && vm === null;
  const reversed = (vm?.rows ?? []).filter((r) => r.status === 'REVERSED').length;

  async function onRefresh() {
    setRefreshing(true);
    await earningsQuery.refetch();
    setRefreshing(false);
  }

  const sharePct =
    vm?.astrologerShare === null || vm?.astrologerShare === undefined
      ? null
      : Math.round(vm.astrologerShare * 100);

  return (
    <PortalScreen
      title="Earnings"
      subtitle={
        earningsQuery.isLoading
          ? 'Loading…'
          : unavailable
            ? 'Unavailable'
            : sharePct === null
              ? 'Your consultation ledger'
              : `You keep ${sharePct}% of every consultation`
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {unavailable ? (
        <Text style={styles.errorBanner}>
          Your earnings could not be loaded, so no figures are shown. This is a
          server error, not a report that you have earned nothing. Pull down to
          retry.
        </Text>
      ) : null}

      {/*
        PAR-22. This screen answers "what did I earn"; it has never answered
        "send it to me". That surface exists on the web for every provider role
        (/payouts) and had no mobile equivalent for astrologers. It is a hidden
        route — the astrologer tab bar already carries six — so this is its ONLY
        entry point, which is why it sits outside the `vm` branch: a failed
        earnings read must not also take away the way to withdraw.
      */}
      <TouchableOpacity
        style={styles.payoutLink}
        activeOpacity={0.8}
        accessibilityRole="link"
        accessibilityLabel="Payouts"
        accessibilityHint="Opens your withdrawable balance and payout history"
        onPress={() => router.push('/(astrologer)/payouts' as never)}
      >
        <Ionicons name="cash-outline" size={18} color={colors.saffron[600]} />
        <Text style={styles.payoutLinkText}>Balance and payouts</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.stone[400]} />
      </TouchableOpacity>

      {vm ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              label="Total earned"
              value={vm.totalEarningsInr === null ? '—' : formatInr(vm.totalEarningsInr)}
              accent={colors.green[600]}
              hint="Your share, not the price"
            />
            <View style={{ width: spacing.sm }} />
            {vm.readyInr !== null ? (
              <StatCard
                label={READY_LABEL}
                value={formatInr(vm.readyInr)}
                accent={colors.amber[600]}
                hint={vm.paidInr === null ? undefined : `${formatInr(vm.paidInr)} paid`}
              />
            ) : (
              // Older server without the split: one honest, unsplit figure.
              <StatCard
                label="Pending"
                value={vm.pendingInr === null ? '—' : formatInr(vm.pendingInr)}
                accent={colors.amber[600]}
                hint={vm.paidInr === null ? undefined : `${formatInr(vm.paidInr)} paid`}
              />
            )}
          </View>
          {vm.readyInr !== null && requestedShown(vm.requestedInr) ? (
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <StatCard
                label={REQUESTED_LABEL}
                value={formatInr(vm.requestedInr as number)}
                accent={colors.amber[600]}
                hint="Already in a payout request."
              />
            </View>
          ) : null}
          {upcomingShown(vm.upcomingInr) ? (
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <StatCard
                label={UPCOMING_LABEL}
                value={formatInr(vm.upcomingInr as number)}
                accent={colors.stone[500]}
                hint="Earned. Becomes payable after the consultation is completed."
              />
            </View>
          ) : null}

          {reversed > 0 ? (
            <Text style={styles.note}>
              {reversed} reversed {reversed === 1 ? 'entry is' : 'entries are'}{' '}
              listed below. Reversals are cancelled or refunded consultations and
              are already excluded from the totals above.
            </Text>
          ) : null}

          <Section title="Consultation ledger">
            {vm.rows.length === 0 ? (
              <EmptyHint text="No consultation earnings yet. They appear once a consultation completes." />
            ) : (
              vm.rows.map((r) => (
                <ListRow
                  key={r.id}
                  primary={
                    r.bookingId ? `Consultation ${r.bookingId.slice(0, 8)}` : 'Consultation'
                  }
                  secondary={[
                    formatDay(r.createdAt),
                    r.grossInr === null ? null : `Price ${formatInr(r.grossInr)}`,
                    r.platformCutInr === null
                      ? null
                      : `Platform ${formatInr(r.platformCutInr)}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                  trailing={r.earningsInr === null ? '—' : formatInr(r.earningsInr)}
                  trailingHint="your share"
                  status={{ label: commissionStatusLabel(r.status), color: statusColor(r.status) }}
                />
              ))
            )}
          </Section>
        </>
      ) : null}
    </PortalScreen>
  );
}

function statusColor(status: string): string {
  if (status === 'PAID') return colors.green[600];
  if (status === 'REVERSED') return colors.red[600];
  return colors.amber[600];
}

function formatDay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN');
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
  note: {
    marginTop: spacing.md,
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 19,
  },
  payoutLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.stone[200],
  },
  payoutLinkText: {
    flex: 1,
    fontSize: fontSize.base,
    fontWeight: '700',
    color: colors.stone[800],
  },
});
