import type { Metadata } from 'next';
import Link from 'next/link';
import { H1 } from '../../../components/ui/heading-recipe';

export const metadata: Metadata = {
  alternates: { canonical: 'https://darshya.online/weddings/packages' },
  title: 'Wedding Packages — Basic, Premium, Royal',
  description:
    'Three Vedic Hindu wedding packages: Basic (₹15,000) pandit-only, Premium (₹50,000) with samagri & muhurat consultation, Royal (₹2,00,000) full 4-day ceremony.',
};

interface Package {
  tier: 'basic' | 'premium' | 'royal';
  name: string;
  price: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}

const PACKAGES: Package[] = [
  {
    tier: 'basic',
    name: 'Basic',
    price: '₹15,000',
    tagline: 'Pandit-only at your venue.',
    features: [
      'Vedic pandit',
      'Sankalp + saat phere',
      'Hindi or Sanskrit recitation',
      'Travel within 25 km of major cities',
      '2-hour ceremony',
    ],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '₹50,000',
    tagline: 'Pandit + samagri + muhurat consultation.',
    popular: true,
    features: [
      'Everything in Basic',
      'Free kundli matching (Ashtakoota / Guna milan)',
      'Personalised muhurat consultation',
      'Full samagri kit shipped (mandap, kalash, havan)',
      'Pre-wedding briefing call',
      'Photographer co-ordination',
    ],
  },
  {
    tier: 'royal',
    name: 'Royal',
    price: '₹2,00,000',
    tagline: 'Full 4-day Vedic ceremony.',
    features: [
      'Everything in Premium',
      'Tilak ceremony (Day 1)',
      'Haldi + Mehendi (Day 2)',
      'Vivah sanskar with full mandap (Day 3)',
      'Grihapravesh + Satyanarayan puja (Day 4)',
      'Dedicated wedding concierge',
      'NRI co-ordination',
      'On-call Vedic scholar',
    ],
  },
];

export default function PackagesPage() {
  return (
    <main className="min-h-[100dvh] bg-amber-50/40 py-12 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center">
          <h1 className={H1.catalogue}>Wedding packages</h1>
          <p className="mt-2 text-stone-700 max-w-2xl mx-auto">
            All packages are end-to-end. Pricing is for ceremonies in India; NRI weddings carry a
            travel and consultation surcharge.
          </p>
        </header>

        <section className="mt-10 grid md:grid-cols-3 gap-6">
          {PACKAGES.map((p) => (
            <article
              key={p.tier}
              className={`relative rounded-2xl p-6 border ${
                p.popular
                  ? 'border-amber-700 bg-white shadow-xl'
                  : 'border-amber-100 bg-white shadow-sm'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-amber-700 text-white text-xs uppercase tracking-wider">
                  Most popular
                </span>
              )}
              <h2 className="font-serif text-2xl text-amber-900">{p.name}</h2>
              <p className="text-stone-600 text-sm mt-1">{p.tagline}</p>
              <p className="text-3xl font-semibold text-amber-800 mt-3">{p.price}</p>
              <ul className="mt-5 space-y-2 text-sm text-stone-800">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start">
                    <span className="text-amber-700 mr-2">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`/weddings/inquiry?package=${p.tier}`}
                className={`mt-6 block text-center py-3 rounded-lg font-medium ${
                  p.popular
                    ? 'bg-amber-700 text-white hover:bg-amber-800'
                    : 'border border-amber-700 text-amber-800 hover:bg-amber-50'
                }`}
              >
                Inquire about {p.name}
              </Link>
            </article>
          ))}
        </section>

        <section className="mt-14 max-w-3xl mx-auto text-center">
          <h2 className="font-serif text-2xl text-amber-900">Custom requirements?</h2>
          <p className="mt-2 text-stone-700">
            Multi-day destination wedding, regional customs (Bengali, Tamil, Marwari, Marathi), or
            Mangalik parihara — we tailor every package.
          </p>
          <Link
            href="/weddings/inquiry"
            className="mt-4 inline-block px-6 py-3 rounded-lg bg-amber-700 text-white"
          >
            Talk to a planner
          </Link>
        </section>
      </div>
    </main>
  );
}
