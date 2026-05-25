export const runtime = 'edge';

import type { Metadata } from 'next';
import { Suspense } from 'react';
import SearchClient from './SearchClient';

export const metadata: Metadata = {
  title: 'Search Knowledge — Darshya',
  description: 'Search across Sanskrit, Vedas, and Sanatan Dharma articles.',
};

export default function SearchPage() {
  return (
    <Suspense fallback={<main className="max-w-3xl mx-auto px-4 py-8"><p className="text-surface-500">Loading...</p></main>}>
      <SearchClient />
    </Suspense>
  );
}
