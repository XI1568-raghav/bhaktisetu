import { redirect } from 'next/navigation';

type Props = { params: Promise<{ id: string }> };

// Legacy route. The curated `home-pujas.ts` profiles (p1-p8, w1-w5) are
// static placeholders and don't map to real Priest UUIDs in the DB, so we
// forward to the live pandit listing rather than 404 on `/pandits/${id}`.
export default async function LegacyPanditRedirect({ params }: Props) {
 await params;
 redirect('/pandits');
}
