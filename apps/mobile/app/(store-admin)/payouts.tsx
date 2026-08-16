import React from 'react';
import { ProviderPayouts } from '../../lib/provider-payouts';

/**
 * PAR-22. `revenue.tsx` reports STORE revenue — gross sales through the shop —
 * which is not the same number as the owner's withdrawable balance and carries
 * no way to withdraw anything. The web /payouts page serves store_owner; the
 * app did not.
 */
export default function StoreAdminPayouts() {
  return (
    <ProviderPayouts
      title="Payouts"
      unitNoun="order"
      emptyLedgerText="No earnings yet. A row appears here for each settled order."
    />
  );
}
