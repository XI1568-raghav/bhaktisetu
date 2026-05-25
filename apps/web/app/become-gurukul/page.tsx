export const runtime = 'edge';

import type { Metadata } from 'next';
import BecomeGurukulClient from './BecomeGurukulClient';

export const metadata: Metadata = {
  title: 'Register Your Gurukul — Darshya',
  description: 'List your gurukul on Darshya. Reach seekers across India and the diaspora.',
};

export default function BecomeGurukulPage() {
  return <BecomeGurukulClient />;
}
