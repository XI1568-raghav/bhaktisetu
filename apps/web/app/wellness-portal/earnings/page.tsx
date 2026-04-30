'use client';

import { CommissionsPanel } from '../../../components/CommissionsPanel';

export default function WellnessEarningsPage() {
 return (
 <CommissionsPanel
 mode="me"
 title="Earnings"
 description="Net earnings after platform commission for completed sessions."
 />
 );
}
