'use client';

import { SubscriptionPanel } from '../../../components/SubscriptionPanel';

export default function WellnessSubscriptionPage() {
 return (
 <SubscriptionPanel
 role="wellness_instructor"
 // PM-01: was "group session capacity, lower commission, live class hosting". No
 // plan changes any commission rate — see apps/api/src/services/subscription.service.ts.
 description="Wellness instructor plans — group session capacity, priority listing, live class hosting."
 />
 );
}
