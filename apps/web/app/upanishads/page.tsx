import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import {
  UPANISHADS,
  PRINCIPAL_UPANISHAD_SLUGS,
  isPrincipalUpanishad,
} from '../../lib/upanishads';

// CI-14: the page was titled, described, headed and eyebrowed as a guide to
// TEN Upanishads while rendering every record in the catalogue. Ten is still a
// real category — it is the set Shankaracharya commented on — so the counts
// are now read off the data and the ten are marked instead of implied.
const TOTAL = UPANISHADS.length;
const PRINCIPAL = PRINCIPAL_UPANISHAD_SLUGS.length;

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: `The Upanishads — all ${TOTAL}, with the ${PRINCIPAL} Dashopanishads, Mahavakyas & Summaries`,
  description: `Guide to ${TOTAL} Upanishads — the ${PRINCIPAL} principal ones Adi Shankaracharya commented on (Isha, Kena, Katha, Prashna, Mundaka, Mandukya, Taittiriya, Aitareya, Chhandogya, Brihadaranyaka) plus the Muktika-canon texts. Sanskrit, mahavakyas, key concepts.`,
  alternates: { canonical: `${BASE_URL}/upanishads` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: `The Upanishads — all ${TOTAL}`,
    description: `The Vedanta foundation — ${TOTAL} Upanishads including the ${PRINCIPAL} principal ones, 4 mahavakyas, the path of self-knowledge.`,
    url: `${BASE_URL}/upanishads`,
    type: 'website',
  },
};

const VEDA_COLORS: Record<string, string> = {
  Rig: 'rose', Sama: 'emerald', Yajur: 'saffron', Atharva: 'indigo',
};

export default function UpanishadsIndexPage() {
  const byVeda: Record<string, typeof UPANISHADS> = { Rig: [], Sama: [], Yajur: [], Atharva: [] };
  for (const u of UPANISHADS) byVeda[u.veda]?.push(u);

  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'The Upanishads',
    numberOfItems: UPANISHADS.length,
    itemListElement: UPANISHADS.map((u, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'Book',
        name: u.name,
        url: `${BASE_URL}/upanishads/${u.slug}`,
      },
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Upanishads', item: `${BASE_URL}/upanishads` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([ld, breadcrumb]) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-indigo-600">{TOTAL} texts · {PRINCIPAL} principal · 4 mahavakyas · Vedanta foundation</p>
        <h1 className={`${H1.catalogue} mt-1`}>उपनिषद्</h1>
        <p className="mt-1 text-2xl font-bold text-gray-900 sm:text-3xl">The Upanishads — all {TOTAL}</p>
        <p className="mt-3 max-w-3xl text-base text-gray-700">
          The Upanishads are the philosophical conclusion of the Vedas, sitting
          (upa-ni-shad) close to the teacher. Of the 108 Upanishads in the Muktika
          canon, {PRINCIPAL} are considered principal — the Dashopanishads — because Adi
          Shankaracharya wrote bhashyas (commentaries) on them; they are the source of
          the four Mahavakyas and the foundation of Advaita Vedanta, Vishishtadvaita
          and Dvaita alike. This guide covers those {PRINCIPAL} in full and{' '}
          {TOTAL - PRINCIPAL} more from the wider canon; the principal ones are marked
          below.
        </p>
      </header>

      <section className="mb-10 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-6">
        <h2 className="text-base font-semibold text-indigo-900">The four Mahavakyas</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className="rounded-lg bg-white p-3 text-sm">
            <p className="font-serif text-base text-gray-900">प्रज्ञानं ब्रह्म</p>
            <p className="text-xs italic text-gray-600">Prajñānaṁ brahma, Consciousness is Brahman</p>
            <p className="mt-1 text-xs text-indigo-700">Aitareya (Rig Veda)</p>
          </div>
          <div className="rounded-lg bg-white p-3 text-sm">
            <p className="font-serif text-base text-gray-900">अहं ब्रह्मास्मि</p>
            <p className="text-xs italic text-gray-600">Ahaṁ brahmāsmi, I am Brahman</p>
            <p className="mt-1 text-xs text-indigo-700">Brihadaranyaka (Yajur Veda)</p>
          </div>
          <div className="rounded-lg bg-white p-3 text-sm">
            <p className="font-serif text-base text-gray-900">तत्त्वमसि</p>
            <p className="text-xs italic text-gray-600">Tat tvam asi, That thou art</p>
            <p className="mt-1 text-xs text-indigo-700">Chandogya (Sama Veda)</p>
          </div>
          <div className="rounded-lg bg-white p-3 text-sm">
            <p className="font-serif text-base text-gray-900">अयमात्मा ब्रह्म</p>
            <p className="text-xs italic text-gray-600">Ayam ātmā brahma, This Self is Brahman</p>
            <p className="mt-1 text-xs text-indigo-700">Mandukya (Atharva Veda)</p>
          </div>
        </div>
      </section>

      {(['Rig', 'Sama', 'Yajur', 'Atharva'] as const).map((veda) => {
        const items = byVeda[veda] || [];
        if (items.length === 0) return null;
        const color = VEDA_COLORS[veda]!;
        return (
          <section key={veda} className="mb-10">
            <h2 className={`mb-4 border-b border-${color}-200 pb-2 text-xl font-bold text-${color}-900`}>{veda} Veda · {items.length} Upanishad{items.length === 1 ? '' : 's'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((u) => (
                <Link
                  key={u.slug}
                  href={`/upanishads/${u.slug}`}
                  className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md"
                >
                  <h3 className="text-base font-semibold text-gray-900 group-hover:text-indigo-700">
                    {u.name}
                    {isPrincipalUpanishad(u.slug) && (
                      <span className="ml-2 rounded bg-indigo-100 px-1.5 py-0.5 align-middle text-xs font-semibold uppercase tracking-wide text-indigo-800">
                        Principal
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 font-serif text-sm text-gray-700">{u.sanskrit}</p>
                  <p className="mt-1 text-xs text-gray-500">{u.vedaShakha}</p>
                  <p className="mt-2 text-xs text-gray-600 line-clamp-2">{u.centralTheme}</p>
                  {u.mahavakya && (
                    <p className="mt-2 rounded bg-indigo-50 px-2 py-1 font-serif text-xs text-indigo-900">{u.mahavakya.sanskrit}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Related study</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Link href="/gita" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Bhagavad Gita</div>
            <div className="text-xs text-indigo-700">18 chapters; smriti companion</div>
          </Link>
          <Link href="/ramayana" className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 hover:bg-indigo-100">
            <div className="text-sm font-semibold text-indigo-900">Valmiki Ramayana</div>
            <div className="text-xs text-indigo-700">7 kandas of dharma in narrative</div>
          </Link>
          <Link href="/chants/gayatri-mantra" className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 hover:bg-rose-100">
            <div className="text-sm font-semibold text-rose-900">Gayatri Mantra</div>
            <div className="text-xs text-rose-700">The mother mantra of the Vedas</div>
          </Link>
        </div>
      </section>
    </main>
  );
}
