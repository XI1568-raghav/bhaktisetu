
import type { Metadata } from 'next';
import BecomeGurukulClient from './BecomeGurukulClient';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/become-gurukul' },
  title: 'Register Your Gurukul',
  description:
    'List your traditional gurukul, ashram or veda pathshala on Darshya and reach seekers across India and the diaspora. Manage admissions, courses, schedules, faculty profiles and online payments — all in one verified portal trusted by Sanatani families.',
};

export default function BecomeGurukulPage() {
  return <BecomeGurukulClient />;
}
