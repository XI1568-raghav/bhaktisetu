export const runtime = 'edge';

import type { Metadata } from 'next';
import GurukulPortalClient from './GurukulPortalClient';

export const metadata: Metadata = {
  title: 'Gurukul Portal — Darshya',
  description: 'Manage your gurukul listings and admission applications.',
};

export default function GurukulPortalPage() {
  return <GurukulPortalClient />;
}
