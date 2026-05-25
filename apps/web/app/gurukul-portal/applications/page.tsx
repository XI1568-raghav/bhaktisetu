export const runtime = 'edge';

import type { Metadata } from 'next';
import ApplicationsClient from './ApplicationsClient';

export const metadata: Metadata = {
  title: 'Admission Applications — Gurukul Portal',
  description: 'Review and decide on admission applications.',
};

export default function ApplicationsPage() {
  return <ApplicationsClient />;
}
