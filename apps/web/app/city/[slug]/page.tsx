// Per-city hub: famous temples + popular pujas + deities + nearby yatra.
// Programmatic-SEO play for "puja in {city}", "temples in {city}",
// "online puja {city}" queries. One file fans out to N cities via [slug].
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCity, CITIES } from '../../../lib/cities';
import { getTemples } from '../../../lib/api';
import { getDeity } from '../../../lib/deities';
import { buttonClass } from '../../../components/ui/button-recipe';

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return CITIES.map((c) => ({ slug: c.slug }));
}

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const c = getCity(slug);
  if (!c) return { title: 'City' };
  return {
    title: `Pujas and temples in ${c.name} — verified pandits, video proof`,
    description: `Book online pujas in ${c.name}, ${c.state}. Famous temples: ${c.famousTemples.slice(0, 3).join(', ')}. ${c.popularPujas.length} pujas, verified pandits, video proof.`,
    alternates: { canonical: `https://darshya.online/city/${c.slug}` },
    openGraph: {
      title: `${c.name} — pujas, temples, online booking`,
      description: c.description,
      url: `https://darshya.online/city/${c.slug}`,
      type: 'website',
      images: ['/og/default.png'],
    },
  };
}

export default async function CityPage({ params }: Params) {
  const { slug } = await params;
  const c = getCity(slug);
  if (!c) notFound();

  // Tolerant API lookup — page still useful for SEO even if API is asleep.
  const templesRes = await getTemples({ city: c.name, limit: 12 }).catch(() => null);
  const apiTemples = templesRes?.data || [];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: c.name,
    alternateName: c.hindi,
    description: c.description,
    url: `https://darshya.online/city/${c.slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: c.name,
      addressRegion: c.state,
      addressCountry: 'IN',
      postalCode: `${c.pinPrefix}xxx`,
    },
    containsPlace: c.famousTemples.map((t) => ({
      '@type': 'PlaceOfWorship',
      name: t,
    })),
  };

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="text-sm text-surface-600 mb-4">
        <Link href="/" className="hover:text-saffron-700">Home</Link>
        <span className="mx-2">/</span>
        <Link href="/city" className="hover:text-saffron-700">Cities</Link>
        <span className="mx-2">/</span>
        <span className="text-surface-900">{c.name}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-saffron-700 bg-saffron-100 rounded-full">
            🏛️ {c.state}
          </span>
          <span className="text-xs text-surface-500">Population: {c.population}</span>
          {c.isNriMagnet ? (
            <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-full">
              ✈️ Strong NRI ties
            </span>
          ) : null}
        </div>
        <h1 className={`${H1.catalogue} mb-2`}>
          {c.name} <span className="text-2xl font-serif text-surface-500 ml-2">{c.hindi}</span>
        </h1>
        <p className="text-surface-700 text-base leading-relaxed max-w-3xl mb-4">
          {c.description}
        </p>
        <p className="text-surface-600 prose-body leading-relaxed max-w-3xl">
          {c.significance}
        </p>
      </header>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">
          Famous temples in {c.name}
        </h2>
        {apiTemples.length > 0 ? (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {apiTemples.map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-surface-200 bg-white p-5 hover:shadow-sm transition-shadow"
              >
                <h3 className="text-lg font-semibold text-surface-900 mb-1">{t.name}</h3>
                <p className="text-xs text-surface-500 mb-2">{t.city}, {t.state}</p>
                <Link
                  href={`/temples/${t.slug}`}
                  className="text-sm font-semibold text-saffron-700 hover:underline"
                >
                  View temple →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-6">
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {c.famousTemples.map((name, i) => {
                const slug = c.templeSlugs?.[i];
                return (
                  <li key={name} className="text-sm text-surface-800">
                    • {slug ? (
                      <Link href={`/temples/${slug}`} className="text-saffron-700 hover:underline">{name}</Link>
                    ) : name}
                  </li>
                );
              })}
            </ul>
            <Link
              href="/temples"
              className={buttonClass('primary', 'md')}
            >
              Browse all temples →
            </Link>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">
          Popular pujas {c.name} devotees book
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {c.popularPujas.map((slug) => (
            <li key={slug}>
              <Link
                href={`/pujas/${slug}`}
                className="block rounded-lg border border-surface-200 bg-white p-4 hover:border-saffron-300 hover:shadow-sm transition"
              >
                <span className="text-sm font-semibold text-surface-900 capitalize">
                  {slug.replace(/-/g, ' ')}
                </span>
                <p className="text-xs text-saffron-700 mt-1">Book now →</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">
          Deities worshipped in {c.name}
        </h2>
        <div className="flex flex-wrap gap-2">
          {c.popularDeities.map((dSlug) => {
            const deity = getDeity(dSlug);
            if (!deity) return null;
            return (
              <Link
                key={dSlug}
                href={`/deity/${dSlug}`}
                className="inline-block px-4 py-2 rounded-full border border-saffron-200 bg-saffron-50 text-sm text-saffron-800 hover:border-saffron-400 hover:bg-saffron-100"
              >
                {deity.name} <span className="text-xs font-serif text-surface-500 ml-1">{deity.sanskrit}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {c.nearbyYatra && c.nearbyYatra.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-surface-900 mb-4">
            Yatra packages from {c.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {c.nearbyYatra.map((y) => (
              <Link
                key={y}
                href={`/yatra/${y}`}
                className="inline-block px-4 py-2 rounded-full border border-indigo-200 bg-indigo-50 text-sm text-indigo-800 hover:border-indigo-400 hover:bg-indigo-100"
              >
                ✈️ {y.replace(/-/g, ' ')}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-10">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Other sacred cities</h2>
        <div className="flex flex-wrap gap-2">
          {CITIES.filter((x) => x.slug !== c.slug).map((x) => (
            <Link
              key={x.slug}
              href={`/city/${x.slug}`}
              className="inline-block px-3 py-1.5 rounded-full border border-surface-200 bg-white text-xs text-surface-700 hover:border-saffron-300 hover:text-saffron-700"
            >
              {x.name}
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-surface-200 pt-6 text-sm text-surface-600">
        <p className="mb-2">
          <strong>Booking from outside {c.name}?</strong> Darshya pandits perform pujas at the named temple on your behalf with mandatory video proof. Your prasad ships to you anywhere in India or abroad.
        </p>
        <Link href="/city" className="text-saffron-700 hover:underline">
          ← All cities
        </Link>
      </footer>
    </main>
  );
}
