'use client';

import { CommissionsPanel } from '../../../components/CommissionsPanel';

export default function TemplePayoutsPage() {
 return (
 <CommissionsPanel
 mode="me"
 title="Temple payouts"
 description="Net payouts after platform commission for completed pujas and donations."
 />
 );
}
