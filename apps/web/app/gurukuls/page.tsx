
import type { Metadata } from 'next';
import GurukulsListClient from './GurukulsListClient';
import { H1 } from '../../components/ui/heading-recipe';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/gurukuls' },
  title: 'Gurukuls — Traditional Sanskrit & Vedic Schools',
  description: 'Discover verified gurukuls across India offering Sanskrit, Vedic chanting, Karma Kanda, Jyotisha, and yoga. Filter by tradition, location, age group. Apply online.',
};

export default function GurukulsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className={H1.catalogue}>Gurukuls</h1>
        <p className="text-surface-600 mt-2 max-w-2xl">
          Traditional residential and online schools teaching Sanskrit, the Vedas, ritual, and the darshanas. Browse verified institutions and apply for admission.
        </p>
      </header>
      <GurukulsListClient />
    </main>
  );
}
