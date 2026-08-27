import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { SHAKTI_PEETHS, type ShaktiPeethCountry } from '../../lib/shakti-peeths';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: '51 Shakti Peeth — Complete List, Devi-Bhairava Pairings, Darshan Guide',
  description:
    "All 51 Shakti Peeths across India, Nepal, Bangladesh, Sri Lanka, Pakistan and Tibet. Each site marks where part of Sati's body fell after Daksha Yajna. Includes Kamakhya, Kalighat, Tarapith, Jwalamukhi, Ambaji, Hinglaj, Sharada Peeth, Gandaki — with darshan timings, Navratri rituals, body-part-fallen and Devi-Bhairava pairing.",
  alternates: { canonical: `${BASE_URL}/shakti-peeth` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: '51 Shakti Peeth — complete pilgrim guide',
    description: 'Devi-Bhairava pairings, body-part-fallen, darshan timings and Navratri rituals for all 51 Shakti Peeths.',
    url: `${BASE_URL}/shakti-peeth`,
    type: 'website',
  },
};

const COUNTRY_ORDER: ShaktiPeethCountry[] = ['India', 'Nepal', 'Bangladesh', 'Sri Lanka', 'Pakistan', 'Tibet'];

const COUNTRY_BLURB: Record<ShaktiPeethCountry, string> = {
  India: 'Across 17 states from Assam to Kerala. Most accessible — many on regular pilgrim circuits.',
  Nepal: 'Gandaki source, Kathmandu valley shrines. Visa-on-arrival for Indians.',
  Bangladesh: 'Across Bengal, Sylhet, Chittagong. Visa required; some sites part of joint India-Bangladesh circuit.',
  'Sri Lanka': 'Trincomalee + Nuwara Eliya. Visit alongside Ramayana trail (Sita Eliya, Ravana caves).',
  Pakistan: 'Hinglaj (Balochistan) + Sharada (PoK). Visa restrictions — Hinglaj Yatra organized by Hindu community council.',
  Tibet: 'Manasarovar region. Kailash Manasarovar Yatra route — Indian government runs annual batches.',
};

export default function ShaktiPeethIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: '51 Shakti Peeth',
    numberOfItems: SHAKTI_PEETHS.length,
    itemListElement: SHAKTI_PEETHS.map((s) => ({
      '@type': 'ListItem',
      position: s.number,
      url: `${BASE_URL}/shakti-peeth/${s.slug}`,
      name: `${s.number}. ${s.name} (${s.location})`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: '51 Shakti Peeth', item: `${BASE_URL}/shakti-peeth` },
    ],
  };

  const byCountry = new Map<ShaktiPeethCountry, typeof SHAKTI_PEETHS>();
  for (const s of SHAKTI_PEETHS) {
    if (!byCountry.has(s.country)) byCountry.set(s.country, []);
    byCountry.get(s.country)!.push(s);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-rose-700">Where Sati&apos;s body fell</p>
        <h1 className={`${H1.catalogue} mt-1`}>The 51 Shakti Peeth</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          After Sati immolated herself at Daksha Yajna, Vishnu&apos;s Sudarshana Chakra cut her body into 51 pieces
          which fell across the subcontinent. Each became a Shakti Peeth — paired with a specific Bhairava (Shiva
          form) and Devi manifestation. Together they form the most powerful Tantric sadhana grid in Sanatana Dharma.
        </p>
        <p className="mt-3 max-w-2xl prose-meta text-gray-600">
          Numbering follows the Pithanirnaya tradition. Some texts list 52 or 108 — we cover the canonical 51 from
          Devi Bhagavata Purana. See also{' '}
          <Link href="/tirth" className="text-rose-700 underline">12 Sacred Tirthas</Link> and{' '}
          <Link href="/jyotirlinga" className="text-rose-700 underline">12 Jyotirlinga</Link>.
        </p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {COUNTRY_ORDER.map((c) =>
            byCountry.has(c) ? (
              <a
                key={c}
                href={`#country-${c.replace(/\s+/g, '-').toLowerCase()}`}
                className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
              >
                {c} ({byCountry.get(c)!.length})
              </a>
            ) : null,
          )}
        </nav>
      </header>

      {COUNTRY_ORDER.map((country) => {
        const items = byCountry.get(country);
        if (!items || items.length === 0) return null;
        return (
          <section key={country} id={`country-${country.replace(/\s+/g, '-').toLowerCase()}`} className="mb-12">
            <h2 className="mb-1 text-xl font-semibold text-gray-900">{country}</h2>
            <p className="mb-4 text-sm text-gray-600">{COUNTRY_BLURB[country]}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((s) => (
                <Link
                  key={s.slug}
                  href={`/shakti-peeth/${s.slug}`}
                  className="block rounded-2xl border border-rose-200 bg-rose-50/40 p-5 transition hover:shadow-md"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      <span className="mr-2 inline-block rounded bg-rose-700 px-1.5 py-0.5 text-xs font-bold text-white">{s.number}</span>
                      {s.name}
                    </h3>
                    <span className="font-serif text-sm text-gray-600">{s.sanskrit}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600">{s.location} · {s.state}</p>
                  <p className="mt-2 text-xs font-medium text-rose-900">
                    Body part: <span className="font-normal text-gray-700">{s.bodyPart}</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-rose-900">
                    Devi · Bhairava: <span className="font-normal text-gray-700">{s.devi} · {s.bhairava}</span>
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-700">{s.significance}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Navratri across the Peeths</h2>
        <p className="mt-2 text-sm text-gray-700">
          Most Shakti Peeths see 5-50× normal visitor load during Sharada Navratri (Sept-Oct) and Vasant Navratri
          (Mar-Apr). For festival dates see{' '}
          <Link href="/calendar" className="text-rose-700 underline">Hindu festival calendar 2026</Link>.
          For deeper darshanas of the Goddess see{' '}
          <Link href="/dashavatar" className="text-rose-700 underline">Dashavatar</Link> and{' '}
          <Link href="/deity" className="text-rose-700 underline">all deities</Link>.
        </p>
      </section>
    </main>
  );
}
