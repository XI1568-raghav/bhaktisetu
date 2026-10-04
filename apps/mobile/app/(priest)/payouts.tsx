import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { usePriestPayouts } from '@poojly/api-client';
import { ProviderPayouts } from '../../lib/provider-payouts';
import { Section, ListRow } from '../../lib/portal-screen';
import { colors, spacing, fontSize } from '../../lib/theme';
import { payoutStatusLabel } from '../../lib/enum-labels';

/**
 * PAR-22 — the pandit's payout surface, and the one role the earlier pass
 * missed because a screen already existed here.
 *
 * WHAT THIS SCREEN USED TO BE
 * ---------------------------
 * `usePriestPayouts()` and nothing else: a read-only list of PriestPayout rows
 * that an admin had already created, plus two stat cards summing them. No
 * balance, no gate, no button. A pandit could see what had been paid and had
 * no way anywhere in the app to ask for what had not. That is exactly the dead
 * end apps/web/app/payouts/page.tsx was built to close ("every other provider
 * role had a dead/empty earnings page with no way to actually withdraw") — and
 * that page names `priest` first in its provider list.
 *
 * WHY BOTH LISTS ARE HERE, WHICH IS NOT DUPLICATION
 * -------------------------------------------------
 * The pandit is the only role with TWO money rails, and DI-05 is what happens
 * when a screen shows one and calls it the total:
 *
 *   Commission + PayoutRequest   the unified rail. GET /payouts/balance,
 *                                POST /payouts/request. Withdrawable.
 *   PriestPayout                 the legacy sidecar. Settled by the platform;
 *                                no request endpoint exists for it.
 *
 * `getPayoutBalance` reports the sidecar as `legacyPandit` and deliberately
 * EXCLUDES it from `availableInr` (payout.service.ts:280-290), because
 * POST /payouts/request settles Commission rows only — folding it in would put
 * a withdrawable-looking figure next to a button that cannot pay it. So the
 * balance above can honestly read ₹0 while real money sits below. Deleting the
 * legacy list to make room for the new surface would hide that money; showing
 * it without saying which rail it is on invites the opposite error. It is shown
 * and labelled.
 */
export default function PriestPayouts() {
  const legacy = usePriestPayouts();

  return (
    <ProviderPayouts
      title="Payouts"
      unitNoun="puja"
      emptyLedgerText="No commission rows yet — they appear once a booking you performed is paid."
      onExtraRefresh={legacy.refetch}
      footer={<LegacyPanditRail query={legacy} />}
    />
  );
}

function LegacyPanditRail({
  query,
}: {
  query: ReturnType<typeof usePriestPayouts>;
}) {
  const rows = query.data?.payouts ?? [];

  // Nothing on the sidecar rail, or it never loaded. An empty section here
  // would read as "you have no earlier payouts", which is a claim this screen
  // is in no position to make about a rail it could not read.
  if (rows.length === 0) return null;

  return (
    <Section title="Earlier payouts">
      <Text style={styles.note}>
        These were settled separately by the platform, on the older pandit
        payout rail. They are not part of the balance above and the Request
        payout button does not cover them.
      </Text>
      {rows.map((p) => (
        <ListRow
          key={p.id}
          // The row used to read `p.bookingId` and `p.paidAt`. Neither is sent
          // by either rail (priest.service.ts#getPayoutHistory:659 and the
          // merged path at priest.ts:810 both project a nested `booking` and a
          // `processedAt`), so every row printed "Manual payout" / "Not paid
          // yet" — including settled ones. The hook's type asserted both
          // fields, so tsc could not see it; corrected in @poojly/api-client.
          primary={
            p.booking
              ? `${p.booking.pujaType.name} · ${p.booking.bookingNumber}`
              : 'Manual payout'
          }
          secondary={
            p.processedAt
              ? new Date(p.processedAt).toLocaleDateString('en-IN')
              : 'Not paid yet'
          }
          trailing={formatRupees(p.amount)}
          trailingHint="your share"
          status={{
            label: payoutStatusLabel(p.status),
            color: p.status.toLowerCase() === 'paid' ? colors.green[600] : colors.amber[600],
          }}
        />
      ))}
    </Section>
  );
}

/**
 * Local rather than `formatInr` from api-contracts: `PriestPayout.amount` is a
 * `Decimal(10,2)` column and arrives as a STRING, so it is coerced here, and an
 * unparseable one must render as a dash rather than as ₹0 — the RES-02 rule,
 * applied to a row that names a real puja.
 */
function formatRupees(amount: unknown): string {
  const n = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(n)) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

const styles = StyleSheet.create({
  note: {
    fontSize: fontSize.sm,
    color: colors.stone[600],
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
});
