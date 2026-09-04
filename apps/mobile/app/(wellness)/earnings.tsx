import React from 'react';
import { ProviderPayouts } from '../../lib/provider-payouts';

/**
 * PAR-22. The wellness instructor earnings page exists on the web
 * (/wellness-portal/earnings) and had no mobile equivalent. The instructor
 * dashboard deliberately shows no money at all — PAR-10 deleted an invented
 * "Earnings (mo)" figure from it — so until this screen there was nowhere in
 * the app an instructor could see what they had actually earned.
 *
 * The body used to live here in full. It now lives in lib/provider-payouts.tsx,
 * because three further provider roles (astrologer, store owner, gaushala
 * manager) needed the identical surface and four hand-copied payout screens
 * drift — the one that drifts being the one still offering a withdrawal the
 * server refuses. Every decision that was in this file is in that module,
 * including the gate (lib/payout-gate.ts, unit-tested) and the deliberate
 * pre-cutover null columns.
 */
export default function WellnessEarnings() {
  return (
    <ProviderPayouts
      title="Earnings"
      unitNoun="session"
      emptyLedgerText="No earnings yet. A row appears here for each completed session."
    />
  );
}
