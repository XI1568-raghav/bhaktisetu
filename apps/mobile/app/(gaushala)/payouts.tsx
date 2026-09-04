import React from 'react';
import { ProviderPayouts } from '../../lib/provider-payouts';

/**
 * PAR-22. The gaushala manager had no money surface in the app at all — not a
 * balance, not a ledger, not a withdrawal. `donations.tsx` lists what devotees
 * gave; it says nothing about what the gaushala can draw. The web /payouts page
 * serves gaushala_manager.
 */
export default function GaushalaPayouts() {
  return (
    <ProviderPayouts
      title="Payouts"
      unitNoun="contribution"
      emptyLedgerText="No earnings yet. A row appears here for each settled contribution."
    />
  );
}
