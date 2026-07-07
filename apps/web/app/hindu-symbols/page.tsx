import type { Metadata } from 'next';
import Link from 'next/link';
import { HINDU_SYMBOLS, type HinduSymbolCategory } from '../../lib/hindu-symbols';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Hindu Sacred Symbols — Om, Swastika, Sri Yantra, Kalash, Lotus & 8 More | Darshya',
  description:
    'Complete guide to 12 sacred symbols of Sanatana Dharma — Om, Swastika (Hindu auspiciousness mark), Sri Yantra, Kalash, Lotus, Conch, Trishul, Damaru, Kamandalu, Peacock Feather, Rudraksha and Tilaka. Meaning, presiding deity, ritual use, placement and materials for each.',
  alternates: { canonical: `${BASE_URL}/hindu-symbols` },
  openGraph: {
    title: 'Hindu Sacred Symbols — 12 Pratika of Sanatana Dharma',
    description: 'Meaning, deity, ritual use and placement for every classical Hindu symbol.',
    url: `${BASE_URL}/hindu-symbols`,
    type: 'website',
  },
};

const CATEGORY_ORDER: HinduSymbolCategory[] = ['mantra', 'yantra', 'ritual-object', 'natural', 'mark'];

const CATEGORY_LABEL: Record<HinduSymbolCategory, string> = {
  mantra: 'Sound symbols (mantra)',
  yantra: 'Geometric diagrams (yantra)',
  'ritual-object': 'Ritual objects',
  natural: 'Natural symbols',
  mark: 'Auspicious marks',
};

const CATEGORY_ACCENT: Record<HinduSymbolCategory, string> = {
  mantra: 'border-saffron-200 bg-saffron-50/40',
  yantra: 'border-indigo-200 bg-indigo-50/40',
  'ritual-object': 'border-amber-200 bg-amber-50/40',
  natural: 'border-emerald-200 bg-emerald-50/40',
  mark: 'border-rose-200 bg-rose-50/40',
};

export default function HinduSymbolsIndexPage() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Hindu Sacred Symbols — 12 Pratika of Sanatana Dharma',
    numberOfItems: HINDU_SYMBOLS.length,
    itemListElement: HINDU_SYMBOLS.map((s, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/hindu-symbols/${s.slug}`,
      name: `${s.name} — ${s.associatedDeity}`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Hindu Sacred Symbols', item: `${BASE_URL}/hindu-symbols` },
    ],
  };

  const byCategory = new Map<HinduSymbolCategory, typeof HINDU_SYMBOLS>();
  for (const s of HINDU_SYMBOLS) {
    if (!byCategory.has(s.category)) byCategory.set(s.category, []);
    byCategory.get(s.category)!.push(s);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-amber-700">Pratika & chinha of Sanatana Dharma</p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">Hindu Sacred Symbols</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Twelve canonical symbols used across Hindu ritual, iconography and altar practice — from the primordial sound
          Om to the auspiciousness mark applied at every wedding threshold. Each entry covers the presiding deity,
          traditional meaning, ritual use, placement guidance, and the materials it is most commonly crafted in.
        </p>
        <p className="mt-3 max-w-3xl rounded-xl border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-900">
          <strong>Scholarly note on the swastika:</strong> the swastika presented here is the ancient Indo-Vedic
          auspiciousness symbol attested on Indus Valley seals from c. 2500 BCE and in continuous Hindu, Buddhist and
          Jain ritual use for roughly four thousand years. The 20th-century German Hakenkreuz adopted by the Nazi
          party is a distinct, rotated hooked-cross treated by scholars as unrelated to this dharmic symbol.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((c) =>
            byCategory.has(c) ? (
              <a
                key={c}
                href={`#cat-${c}`}
                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100"
              >
                {CATEGORY_LABEL[c]} ({byCategory.get(c)!.length})
              </a>
            ) : null,
          )}
        </nav>
      </header>

      {CATEGORY_ORDER.map((category) => {
        const items = byCategory.get(category);
        if (!items || items.length === 0) return null;
        return (
          <section key={category} id={`cat-${category}`} className="mb-12">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{CATEGORY_LABEL[category]}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  href={`/hindu-symbols/${s.slug}`}
                  className={`block rounded-2xl border p-5 transition hover:shadow-md ${CATEGORY_ACCENT[category]}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">{s.name}</h3>
                    <span className="font-serif text-sm text-gray-600">{s.sanskrit}</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-amber-900">
                    Deity: <span className="font-normal text-gray-700">{s.associatedDeity}</span>
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm text-gray-700">{s.meaning}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related guides</h2>
        <p className="mt-2 text-sm text-gray-700">
          See also the detailed{' '}
          <Link href="/rudraksha" className="text-amber-700 underline">Rudraksha mukhi guide</Link>,{' '}
          <Link href="/chants" className="text-amber-700 underline">Sanskrit mantras</Link>,{' '}
          <Link href="/chakras" className="text-amber-700 underline">seven chakras</Link>, and the{' '}
          <Link href="/discover" className="text-amber-700 underline">complete wisdom library</Link>.
        </p>
      </section>
    </main>
  );
}
