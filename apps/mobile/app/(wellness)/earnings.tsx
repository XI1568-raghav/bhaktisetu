import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import {
  PortalScreen,
  Section,
  StatCard,
  ListRow,
  EmptyHint,
} from '../../lib/portal-screen';
import {
  usePayoutBalance,
  useProviderCommissions,
  useRequestPayout,
} from '../../lib/portal-queries';
import {
  selectPayoutBalance,
  selectProviderCommissions,
  formatInr,
} from '../../lib/api-contracts';
import { colors, spacing, fontSize, borderRadius } from '../../lib/theme';

/**
 * PAR-22. The wellness instructor earnings page exists on the web
 * (/wellness-portal/earnings) and had no mobile equivalent. The instructor
 * dashboard deliberately shows no money at all — PAR-10 deleted an invented
 * "Earnings (mo) ₹54,200" from it — so until now there was nowhere in the app
 * an instructor could see what they had actually earned.
 *
 * It reads the UNIFIED provider surface, which is the same choice the web
 * client makes and for the same reason: /admin/commissions is admin-gated and
 * 403s every provider role no matter what query string is attached, which is
 * why the web page was dead before it was repointed.
 *
 *   GET /api/v1/payouts/balance      available / in-flight / paid out
 *   GET /api/v1/payouts/commissions  the instructor's own ledger
 *
 * THE BLANK CELLS ARE DELIBERATE. `grossAmount`, `platformCut` and
 * `ratePercent` come back null for any row written before the commission
 * convention cutover (payout-requests.ts:139-147) — that ledger is mixed, and
 * deriving a gross from a pre-cutover row states a confidently wrong rupee
 * figure. A blank is honest; a computed number there would not be. `amount` is
 * always populated and is what actually gets paid out, so it is the headline.
 */
export default function WellnessEarnings() {
  const balanceQuery = usePayoutBalance();
  const ledgerQuery = useProviderCommissions();
  const requestPayout = useRequestPayout();
  const [refreshing, setRefreshing] = useState(false);

  const balance = selectPayoutBalance(balanceQuery.data);
  const ledger = selectProviderCommissions(ledgerQuery.data);
  const balanceUnavailable = !balanceQuery.isLoading && balance === null;
  const ledgerUnavailable = !ledgerQuery.isLoading && ledger === null;

  const canRequest =
    balance !== null &&
    balance.kycVerified &&
    balance.kycOnFile &&
    (balance.availableInr ?? 0) > 0 &&
    !requestPayout.isPending;

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([balanceQuery.refetch(), ledgerQuery.refetch()]);
    setRefreshing(false);
  }

  function onRequestPayout() {
    if (!balance) return;
    Alert.alert(
      'Request payout',
      `Request a payout of ${formatInr(balance.availableInr ?? 0)} to your registered UPI ID?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Request',
          onPress: () =>
            requestPayout.mutate(
              { method: 'upi' },
              {
                onSuccess: () =>
                  Alert.alert(
                    'Payout requested',
                    'Your request is queued. It moves to paid once the platform settles it.',
                  ),
                // The server's 400 body carries the actual reason (no bank on
                // file, KYC unverified, nothing available). Show it verbatim
                // rather than substituting a generic failure line.
                onError: (err) =>
                  Alert.alert(
                    'Could not request payout',
                    err instanceof Error ? err.message : 'Unknown error',
                  ),
              },
            ),
        },
      ],
    );
  }

  return (
    <PortalScreen
      title="Earnings"
      subtitle={
        balanceQuery.isLoading
          ? 'Loading…'
          : balanceUnavailable
            ? 'Unavailable'
            : 'Net of platform commission'
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {balanceUnavailable ? (
        <Text style={styles.errorBanner}>
          Your balance could not be loaded, so no figures are shown. This is a
          server or permission error, not a report that your balance is zero.
          Pull down to retry.
        </Text>
      ) : null}

      {balance ? (
        <>
          <View style={{ flexDirection: 'row' }}>
            <StatCard
              label="Available"
              value={balance.availableInr === null ? '—' : formatInr(balance.availableInr)}
              accent={colors.green[600]}
              hint="Ready to withdraw"
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              label="In payout"
              value={balance.pendingInr === null ? '—' : formatInr(balance.pendingInr)}
              accent={colors.amber[600]}
              hint={
                balance.paidOutInr === null
                  ? undefined
                  : `${formatInr(balance.paidOutInr)} paid out`
              }
            />
          </View>

          <TouchableOpacity
            style={[styles.payoutBtn, !canRequest && styles.payoutBtnDisabled]}
            disabled={!canRequest}
            onPress={onRequestPayout}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canRequest }}
          >
            <Text style={styles.payoutBtnText}>
              {requestPayout.isPending ? 'Requesting…' : 'Request payout'}
            </Text>
          </TouchableOpacity>

          {/* Say WHY the button is off. A disabled control with no reason is
              the same dead end as no control at all. */}
          {!balance.kycVerified || !balance.kycOnFile ? (
            <Text style={styles.note}>
              {!balance.kycVerified
                ? 'Payouts unlock once your KYC is verified.'
                : 'Add a bank account or UPI ID to unlock payouts.'}{' '}
              Both are completed on darshya.online — the app has no KYC form yet.
            </Text>
          ) : (balance.availableInr ?? 0) <= 0 ? (
            <Text style={styles.note}>
              Nothing is available to withdraw right now.
            </Text>
          ) : null}
        </>
      ) : null}

      <Section title="Commission ledger">
        {ledgerUnavailable ? (
          <Text style={styles.errorBanner}>
            Your ledger could not be loaded. Pull down to retry.
          </Text>
        ) : !ledger ? null : ledger.rows.length === 0 ? (
          <EmptyHint text="No earnings yet. A row appears here for each completed session." />
        ) : (
          ledger.rows.map((c) => (
            <ListRow
              key={c.id}
              primary={c.bookingId ? `Session ${c.bookingId.slice(0, 8)}` : 'Session'}
              secondary={[
                formatDay(c.createdAt),
                // Null for pre-cutover rows. Nothing is rendered rather than a
                // derived figure that would be wrong for those rows.
                c.grossInr === null ? null : `Price ${formatInr(c.grossInr)}`,
                c.ratePercent === null ? null : `Platform ${c.ratePercent}%`,
              ]
                .filter(Boolean)
                .join(' · ')}
              trailing={c.amountInr === null ? '—' : formatInr(c.amountInr)}
              trailingHint="your share"
              status={{ label: c.status, color: statusColor(c.status) }}
            />
          ))
        )}
      </Section>
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
  payoutBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.saffron[600],
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  payoutBtnDisabled: { backgroundColor: colors.stone[300] },
  payoutBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.base },
  note: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 19,
  },
});
