'use client';
export const runtime = 'edge';

import { SubscriptionPanel } from '../../../components/SubscriptionPanel';

export default function PriestSubscriptionPage() {
 return (
 <SubscriptionPanel
 role="priest"
 description="Marketplace plans for priests — lower commission, more listings, premium tooling."
 />
 );
}
