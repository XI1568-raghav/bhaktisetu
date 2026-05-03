'use client';
export const runtime = 'edge';

import { SubscriptionPanel } from '../../../components/SubscriptionPanel';

export default function AstrologerSubscriptionPage() {
 return (
 <SubscriptionPanel
 role="astrologer"
 description="Astrologer marketplace plans — premium placement, lower commission, advanced scheduling."
 />
 );
}
