export const runtime = 'edge';
import { RoleDemoClient } from './role-demo-client';

const VALID_ROLES = [
 'devotee',
 'pandit',
 'store-owner',
 'astrologer',
 'wellness',
 'temple-manager',
 'gaushala-manager',
] as const;

export function generateStaticParams() {
 return VALID_ROLES.map((role) => ({ role }));
}

export default async function RoleDemoPage({
 params,
}: {
 params: Promise<{ role: string }>;
}) {
 const { role } = await params;
 return <RoleDemoClient role={role} />;
}
