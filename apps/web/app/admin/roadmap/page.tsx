export const revalidate = 60;

import type { Metadata } from 'next';
import RoadmapClient from './RoadmapClient';

export const metadata: Metadata = {
  title: 'Roadmap · Admin',
  robots: { index: false, follow: false },
};

export default function Page() {
  return <RoadmapClient />;
}
