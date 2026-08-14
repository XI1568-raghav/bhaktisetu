import type { Metadata } from 'next';
import WellnessClassesClient from './WellnessClassesClient';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/wellness/classes' },
  title: 'Live Wellness Classes',
  description:
    'Browse and enrol in upcoming live yoga, meditation and pranayama classes with verified instructors on Darshya.',
};

export default function WellnessClassesPage() {
  return (
    <div style={{ background: 'var(--color-bg)' }}>
      <WellnessClassesClient />
    </div>
  );
}
