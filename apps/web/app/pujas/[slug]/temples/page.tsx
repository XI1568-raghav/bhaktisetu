// Programmatic-SEO mirror of /temples/[slug]/pujas — every puja gets a
// dedicated temples listing page. Targets long-tail "best temple for
// {puja}", "{puja} in {city}", "where to do {puja}" queries.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamicParams = false;
export const revalidate = 3600;

const SEED_PUJA_SLUGS = [
  'rudrabhishek', 'satyanarayan-puja', 'navgraha-puja', 'ganesh-puja',
  'lakshmi-puja', 'maha-mrityunjaya', 'sundarkand-path', 'kaal-sarp-dosh',
  'mangal-dosh', 'vivah-puja', 'griha-pravesh', 'navaratri-puja',
];

export function generateStaticParams() {
  return SEED_PUJA_SLUGS.map((slug) => ({ slug }));
}

const API_BASE = process.env.API_URL || 'http://localhost:4000/api/v1';

interface PujaTempleOffering {
  id: string;
  templeName: string;
  templeSlug: string;
  templeCity: string;
  templeState: string;
  priceOverride: string | null;
  isActive: boolean;
  trustScore: number;
  isVerified: boolean;
}

interface PujaDetail {
  id: string;
  name: string;
  nameLocal: string | null;
  slug: string;
  description: string;
  category: string;
  deity: string;
  basePrice: string;
  temples: PujaTempleOffering[];
}

interface Params {
  params: Promise<{ slug: string }>;
}

function fmtINR(s: string): string {
  const n = parseFloat(s);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : s;
}

async function loadPuja(slug: string): Promise<PujaDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/pujas/types/${slug}`, {
      next: { revalidate: 600, tags: [`puja-${slug}`] },
    });
    if (!res.ok) return null;
    return (await res.json()) as PujaDetail;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const puja = await loadPuja(slug);
  if (!puja) return { title: 'Puja temples — Darshya' };
  const count = puja.temples?.filter((t) => t.isActive).length || 0;
  return {
    title: `${puja.name} temples — book online${count > 0 ? ` (${count} options)` : ''}`,
    description: `Top temples for ${puja.name}. Verified pandits, video proof, 80G receipts. Compare prices across ${count} active temples.`,
    alternates: { canonical: `https://darshya.online/pujas/${slug}/temples` },
    openGraph: {
      title: `${puja.name} temples — book online`,
      description: `${count} verified temples. Video proof, 80G, certified pandits.`,
      url: `https://darshya.online/pujas/${slug}/temples`,
      type: 'website',
      images: [`/og/puja/${slug}`],
    },
  };
}

export default async function PujaTemplesPage({ params }: Params) {
  const { slug } = await params;
  const puja = await loadPuja(slug);
  if (!puja) notFound();

  // Active offerings only, sorted by trustScore desc so best temple first.
  const offerings = (puja.temples || [])
    .filter((o) => o.isActive)
    .sort((a, b) => (b.trustScore || 0) - (a.trustScore || 0));

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Temples offering ${puja.name}`,
    numberOfItems: offerings.length,
    itemListElement: offerings.slice(0, 20).map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: o.templeName,
      url: `https://darshya.online/temples/${o.templeSlug}`,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/pujas" className="hover:text-saffron-700">Pujas</Link>
        <span className="mx-2">/</span>
        <Link href={`/pujas/${slug}`} className="hover:text-saffron-700">{puja.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Temples</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">
          Where to book {puja.name} online
        </h1>
        {puja.nameLocal ? (
          <p className="text-base font-serif text-surface-500 mb-3">{puja.nameLocal}</p>
        ) : null}
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {offerings.length > 0
            ? `${offerings.length} verified temple${offerings.length === 1 ? '' : 's'} offer ${puja.name}. Compare prices, locations and trust scores. Every booking ships with video proof and an 80G receipt where applicable.`
            : `${puja.name} catalogue is being onboarded at more temples. Book at any of our verified partners while we expand.`}
        </p>
      </header>

      {offerings.length === 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center">
          <p className="text-surface-700 mb-4">No verified temples for this puja yet.</p>
          <Link
            href={`/pujas/${slug}`}
            className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700"
          >
            View puja page →
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {offerings.map((o) => (
            <li
              key={o.id}
              className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center justify-between mb-2 gap-3">
                <span className="text-xs uppercase tracking-wider text-saffron-700 font-semibold">
                  {o.templeCity}, {o.templeState}
                </span>
                {o.isVerified ? (
                  <span className="text-xs text-emerald-700 font-semibold">✓ Verified</span>
                ) : null}
              </div>
              <h2 className="text-lg font-semibold text-surface-900 mb-1">{o.templeName}</h2>
              {o.trustScore > 0 ? (
                <p className="text-xs text-surface-500 mb-3">Trust score: {o.trustScore}/100</p>
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-bold text-surface-900">
                  {fmtINR(o.priceOverride || puja.basePrice)}
                </span>
                <Link
                  href={`/temples/${o.templeSlug}`}
                  className="text-sm font-semibold text-saffron-700 hover:underline"
                >
                  View temple →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-3">
          <strong>Not sure which temple?</strong> Trust score combines temple verification, devotee reviews, on-time delivery and video-proof completion. Higher = safer.
        </p>
        <Link href={`/pujas/${slug}`} className="text-saffron-700 hover:underline">
          ← Back to {puja.name}
        </Link>
      </footer>
    </main>
  );
}
