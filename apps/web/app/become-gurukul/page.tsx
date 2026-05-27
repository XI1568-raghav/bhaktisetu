export const runtime = 'edge';

import type { Metadata } from 'next';
import BecomeGurukulClient from './BecomeGurukulClient';

export const metadata: Metadata = {
  title: 'Register Your Gurukul on Darshya',
  description:
    'List your traditional gurukul, ashram or veda pathshala on Darshya and reach seekers across India and the diaspora. Manage admissions, courses, schedules, faculty profiles and online payments — all in one verified portal trusted by Sanatani families.',
};

export default function BecomeGurukulPage() {
  return <BecomeGurukulClient />;
}
