'use client';

import { SubscriptionPanel } from '../../../components/SubscriptionPanel';

export default function AstrologerSubscriptionPage() {
 return (
 <SubscriptionPanel
 role="astrologer"
 // PM-01: was "premium placement, lower commission, advanced scheduling". No plan
 // changes any commission rate — see apps/api/src/services/subscription.service.ts.
 description="Astrologer marketplace plans — premium placement, video calls, advanced scheduling."
 />
 );
}
