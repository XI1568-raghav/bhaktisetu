'use client';
export const runtime = 'edge';

import { CommissionsPanel } from '../../../components/CommissionsPanel';

export default function AdminCommissionsPage() {
 return (
 <CommissionsPanel
 mode="admin"
 title="All commissions"
 description="Every commission across providers. Filter by status to investigate pending or failed payouts."
 />
 );
}
