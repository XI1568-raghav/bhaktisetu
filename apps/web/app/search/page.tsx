
import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/search' },
  title: 'Search pujas, temples and the library',
  description: 'Search pujas you can book, temples, and the Sanskrit, Veda and Sanatan Dharma library.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto px-4 py-8"><p className="text-surface-500">Loading...</p></main>}>
      <SearchClient />
    </Suspense>
  );
}
