import React from 'react';
import { ProviderPayouts } from '../../lib/provider-payouts';

/**
 * PAR-22. `earnings.tsx` shows the astrologer what they earned, from
 * astrologer-portal/earnings. It has never shown a withdrawable balance or
 * offered a way to ask for the money — the web /payouts page does both, for
 * every provider role including this one.
 *
 * Hidden from the tab bar (the astrologer bar already carries six) and pushed
 * from the earnings screen, which is where a provider looks when the question
 * is "where is my money".
 */
export default function AstrologerPayouts() {
  return (
    <ProviderPayouts
      title="Payouts"
      unitNoun="consultation"
      emptyLedgerText="No earnings yet. A row appears here for each completed consultation."
    />
  );
}
