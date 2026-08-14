import type { Metadata } from 'next';
import WaitlistForm from './WaitlistForm';


export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/waitlist' },
  title: 'Early-access waitlist',
  description:
    'Devotion. Verified. Be among the first 1000 devotees on Darshya. Join the early-access waitlist.',
};

const TOP_CITIES = [
  'Mumbai',
  'Delhi',
  'Bengaluru',
  'Hyderabad',
  'Ahmedabad',
  'Chennai',
  'Kolkata',
  'Pune',
  'Surat',
  'Jaipur',
  'Lucknow',
  'Kanpur',
  'Nagpur',
  'Indore',
  'Bhopal',
  'Visakhapatnam',
  'Patna',
  'Vadodara',
  'Ghaziabad',
  'Ludhiana',
];

const DEITIES = ['Shiva', 'Vishnu', 'Devi', 'Ganesha', 'Hanuman', 'Krishna', 'Other'];

interface WaitlistPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function WaitlistPage({ searchParams }: WaitlistPageProps) {
  const params = await searchParams;
  const ref = typeof params?.ref === 'string' ? params.ref : '';

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col" style={{ background: 'var(--color-bg, #f5f3ef)' }}>
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-widest mb-3" style={{ color: 'var(--color-primary, #ea580c)' }}>
          Early Access
        </p>
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-[1.15]"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text, #1f1b18)' }}
        >
          Devotion. Verified. Be among the first 1000 devotees on Darshya.
        </h1>
        <p className="mt-4 text-sm leading-relaxed max-w-xl mx-auto" style={{ color: 'var(--color-text-muted, #6b6258)' }}>
          Live darshan from verified temples, video-proof pujas, AI Pandit, daily panchang. Join the
          waitlist to lock your spot and unlock priority access.
        </p>
      </section>

      <section className="max-w-xl w-full mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div
          className="rounded-2xl p-6 sm:p-8"
          style={{
            background: 'var(--color-surface, #fff)',
            border: '1px solid var(--color-border, #e7dfd2)',
            boxShadow: '0 6px 24px rgba(0,0,0,0.04)',
          }}
        >
          <WaitlistForm initialRef={ref} cities={TOP_CITIES} deities={DEITIES} />
        </div>
        <p className="mt-4 text-xs text-center" style={{ color: 'var(--color-text-faint, #9a8f80)' }}>
          By joining you agree to occasional emails about your spot, panchang updates, and launch news.
        </p>
      </section>
    </div>
  );
}
