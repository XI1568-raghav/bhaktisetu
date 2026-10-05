import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { PortalScreen, Section, StatCard, ListRow, EmptyHint } from './portal-screen';
import { usePayoutBalance, useProviderCommissions, useRequestPayout } from './portal-queries';
import { selectPayoutBalance, selectProviderCommissions, formatInr } from './api-contracts';
import { payoutGate } from './payout-gate';
import { UPCOMING_LABEL, UPCOMING_HINT, upcomingShown } from './earnings-copy';
import { colors, spacing, fontSize, borderRadius } from './theme';

/**
 * PAR-22 — the unified provider payout surface, once, for every provider role.
 *
 * apps/web/app/payouts/page.tsx calls itself "the single payout surface for ALL
 * provider roles" and lists seven. The app had it for one: the wellness
 * instructor. An astrologer, a store owner and a gaushala manager could see
 * what they had earned (or, for the gaushala manager, could not even see that)
 * and had no way anywhere in the app to ask for it. That is the dead end #233
 * was built to close, reproduced on mobile.
 *
 * WHY ONE COMPONENT RATHER THAN FOUR SCREENS
 * ------------------------------------------
 * The gate has four distinct refusal reasons and the ledger has a deliberate
 * null convention (below). Four hand-written copies drift, and the copy that
 * drifts is the one still offering a withdrawal the server refuses. The roles
 * differ only in wording, so wording is all they pass in.
 *
 *   GET  /api/v1/payouts/balance      available / in-flight / paid out + KYC
 *   GET  /api/v1/payouts/commissions  this provider's own ledger
 *   POST /api/v1/payouts/request      the withdrawal
 *
 * Deliberately NOT /admin/commissions with a providerId filter: that route is
 * admin-gated and 403s every provider role regardless of query string, which is
 * exactly why the web wellness earnings page was dead before it was repointed.
 *
 * THE BLANK CELLS ARE DELIBERATE. `grossAmount`, `platformCut` and
 * `ratePercent` come back null for any row written before the commission
 * convention cutover (payout-requests.ts:139-147) — that ledger is mixed, and
 * deriving a gross from a pre-cutover row states a confidently wrong rupee
 * figure. A blank is honest; a computed number there would not be. `amount` is
 * always populated and is what actually gets paid out, so it is the headline.
 *
 * NOTHING HERE INVENTS A NUMBER. A refused or failed load renders an error, not
 * a zero — the RES-02 failure, where a provider mid-incident was told they had
 * ₹0 withdrawable, ₹0 processing and ₹0 ever paid, with no error anywhere.
 */
export interface ProviderPayoutsProps {
  /** Screen title, e.g. "Earnings" or "Payouts". */
  title: string;
  /** What one ledger row represents to this role, e.g. "session", "order". */
  unitNoun: string;
  /** Shown when the ledger is genuinely empty (loaded, authorised, no rows). */
  emptyLedgerText: string;
  /**
   * Extra sections below the ledger, for a role that has a SECOND money rail.
   * Today only the pandit: getPayoutBalance reports `legacyPandit` separately
   * and deliberately keeps it out of `availableInr`, because POST
   * /payouts/request settles Commission rows only (payout.service.ts:280-290).
   * That money is real and owed, so it is shown — below the withdrawal
   * surface, and labelled as settling separately so nobody reads it as part of
   * the balance the button pays out.
   */
  footer?: React.ReactNode;
  /**
   * Refetch for whatever `footer` loads. This component owns the
   * RefreshControl, so without it a pull-to-refresh silently leaves the footer
   * stale under a gesture that claims to have refreshed the screen.
   */
  onExtraRefresh?: () => Promise<unknown>;
}

export function ProviderPayouts({
  title,
  unitNoun,
  emptyLedgerText,
  footer,
  onExtraRefresh,
}: ProviderPayoutsProps) {
  const balanceQuery = usePayoutBalance();
  const ledgerQuery = useProviderCommissions();
  const requestPayout = useRequestPayout();
  const [refreshing, setRefreshing] = useState(false);

  const balance = selectPayoutBalance(balanceQuery.data);
  const ledger = selectProviderCommissions(ledgerQuery.data);
  const balanceUnavailable = !balanceQuery.isLoading && balance === null;
  const ledgerUnavailable = !ledgerQuery.isLoading && ledger === null;

  const gate = payoutGate(balance, requestPayout.isPending);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([
      balanceQuery.refetch(),
      ledgerQuery.refetch(),
      onExtraRefresh ? onExtraRefresh() : Promise.resolve(),
    ]);
    setRefreshing(false);
  }

  function onRequestPayout() {
    if (!balance || balance.availableInr === null) return;
    Alert.alert(
      'Request payout',
      `Request a payout of ${formatInr(balance.availableInr)} to your registered UPI ID?`,
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
      title={title}
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
              label="Requested, awaiting payout"
              value={balance.pendingInr === null ? '—' : formatInr(balance.pendingInr)}
              accent={colors.amber[600]}
              hint={
                balance.paidOutInr === null
                  ? undefined
                  : `${formatInr(balance.paidOutInr)} paid out`
              }
            />
          </View>
          {upcomingShown(balance.upcomingInr) ? (
            <View style={{ flexDirection: 'row', marginTop: spacing.sm }}>
              <StatCard
                label={UPCOMING_LABEL}
                value={formatInr(balance.upcomingInr as number)}
                accent={colors.stone[500]}
                hint={UPCOMING_HINT}
              />
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.payoutBtn, !gate.canRequest && styles.payoutBtnDisabled]}
            disabled={!gate.canRequest}
            onPress={onRequestPayout}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !gate.canRequest }}
          >
            <Text style={styles.payoutBtnText}>
              {requestPayout.isPending ? 'Requesting…' : 'Request payout'}
            </Text>
          </TouchableOpacity>

          {/* Say WHY the button is off. A disabled control with no reason is
              the same dead end as no control at all. The in-flight reason is
              suppressed because the button label already carries it. */}
          {gate.reason && !requestPayout.isPending ? (
            <Text style={styles.note}>{gate.reason}</Text>
          ) : null}
        </>
      ) : null}

      <Section title="Commission ledger">
        {ledgerUnavailable ? (
          <Text style={styles.errorBanner}>
            Your ledger could not be loaded. Pull down to retry.
          </Text>
        ) : !ledger ? null : ledger.rows.length === 0 ? (
          <EmptyHint text={emptyLedgerText} />
        ) : (
          ledger.rows.map((c) => (
            <ListRow
              key={c.id}
              primary={
                c.bookingId
                  ? `${capitalise(unitNoun)} ${c.bookingId.slice(0, 8)}`
                  : capitalise(unitNoun)
              }
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

      {footer}
    </PortalScreen>
  );
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s[0]!.toUpperCase() + s.slice(1);
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
