// Programmatic-SEO route: every temple gets a dedicated /pujas listing
// page that out-ranks generic "puja booking" for long-tail temple+puja
// queries (e.g. "kashi vishwanath rudrabhishek booking online"). One file
// fans out to N temples via [slug] segment.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTempleBySlug } from '../../../../lib/api';

export const runtime = 'edge';
export const revalidate = 3600;

interface Params {
  params: { slug: string };
}

function fmtINR(s: string): string {
  const n = parseFloat(s);
  return Number.isFinite(n) ? `₹${n.toLocaleString('en-IN')}` : s;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const t = await getTempleBySlug(params.slug);
    const name = t.name;
    const city = t.city || '';
    const count = t.pujaOfferings?.filter((o) => o.isActive).length || 0;
    return {
      title: `${name} pujas — book online${count > 0 ? ` (${count} options)` : ''}`,
      description: `Book ${name}${city ? `, ${city}` : ''} pujas online with verified pandits, video proof and 80G receipts. NRI lane available.`,
      alternates: { canonical: `https://darshya.online/temples/${params.slug}/pujas` },
      openGraph: {
        title: `${name} pujas — book online`,
        description: `${count} active puja options. Verified, video-proof, 80G.`,
        url: `https://darshya.online/temples/${params.slug}/pujas`,
        type: 'website',
        images: [`/og/temple/${params.slug}`],
      },
    };
  } catch {
    return { title: 'Temple pujas — Darshya' };
  }
}

export default async function TemplePujasPage({ params }: Params) {
  const temple = await getTempleBySlug(params.slug).catch(() => null);
  if (!temple) notFound();

  const offerings = (temple.pujaOfferings || []).filter((o) => o.isActive);

  // JSON-LD ItemList for SEO — Google rich result eligibility.
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${temple.name} pujas`,
    numberOfItems: offerings.length,
    itemListElement: offerings.slice(0, 20).map((o, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: o.pujaType.name,
      url: `https://darshya.online/pujas/${o.pujaType.slug}`,
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
        <Link href="/temples" className="hover:text-saffron-700">Temples</Link>
        <span className="mx-2">/</span>
        <Link href={`/temples/${params.slug}`} className="hover:text-saffron-700">{temple.name}</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">Pujas</span>
      </nav>

      <header className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-surface-900 mb-2">
          Book {temple.name} pujas online
        </h1>
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl">
          {offerings.length > 0
            ? `${offerings.length} verified puja${offerings.length === 1 ? '' : 's'} available at ${temple.name}${temple.city ? `, ${temple.city}` : ''}. Every booking ships with video proof, certified pandit and 80G receipt.`
            : `${temple.name} puja catalogue is being onboarded. Live darshan and donations are already available.`}
        </p>
      </header>

      {offerings.length === 0 ? (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-6 text-center">
          <p className="text-surface-700 mb-4">No active puja offerings yet for this temple.</p>
          <Link href={`/temples/${params.slug}`} className="inline-block px-5 py-2 bg-saffron-600 text-white rounded-md text-sm font-semibold hover:bg-saffron-700">
            View temple page →
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
                  {o.pujaType.category}
                </span>
                <span className="text-xs text-surface-500">{o.pujaType.durationMinutes} min</span>
              </div>
              <h2 className="text-lg font-semibold text-surface-900 mb-1">{o.pujaType.name}</h2>
              <p className="text-xs text-surface-600 mb-2">Deity: {o.pujaType.deity}</p>
              <p className="text-sm text-surface-700 mb-4 line-clamp-3">
                {o.pujaType.description}
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-bold text-surface-900">
                  {fmtINR(o.priceOverride || o.pujaType.basePrice)}
                </span>
                <Link
                  href={`/pujas/${o.pujaType.slug}`}
                  className="text-sm font-semibold text-saffron-700 hover:underline"
                >
                  Book now →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-10 border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-3">
          <strong>Why Darshya?</strong> Every puja booking includes mandatory video proof of the ceremony, an 80G donation receipt where applicable, and a verified pandit gated on Aadhaar.
        </p>
        <Link href={`/temples/${params.slug}`} className="text-saffron-700 hover:underline">
          ← Back to {temple.name}
        </Link>
      </footer>
    </main>
  );
}
