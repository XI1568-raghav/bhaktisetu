'use client';

import { SubscriptionPanel } from '../../../components/SubscriptionPanel';

export default function PriestSubscriptionPage() {
 return (
 <SubscriptionPanel
 role="priest"
 // PM-01: was "lower commission, more listings, premium tooling". No plan changes
 // any commission rate — see apps/api/src/services/subscription.service.ts.
 description="Marketplace plans for priests — more listings, top placement, premium tooling."
 />
 );
}
