
import type { Metadata } from 'next';
import GurukulPortalClient from './GurukulPortalClient';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/gurukul-portal' },
  title: 'Gurukul Portal',
  description: 'Manage your gurukul listings and admission applications.',
};

export default function GurukulPortalPage() {
  return <GurukulPortalClient />;
}
