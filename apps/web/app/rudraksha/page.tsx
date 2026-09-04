import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { RUDRAKSHAS, type RudrakshaCategory } from '../../lib/rudrakshas';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Rudraksha Guide — All 14 Mukhi + 4 Special Varieties, Benefits, Mantras',
  description:
    'Complete shastra-based rudraksha guide: 14 mukhi (1-mukhi to 14-mukhi) plus Ganesh, Gauri-Shankar, Trijuti and Sawar special beads. Each with deity, planet, beej mantra, wearing day, benefits, energising ritual per Shiva Purana. Find which rudraksha to wear for your dosha.',
  alternates: { canonical: `${BASE_URL}/rudraksha` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Rudraksha Guide — 14 Mukhi + 4 Special Varieties',
    description: 'Deity, planet, mantra and wearing rules for every rudraksha mukhi per Shiva Purana.',
    url: `${BASE_URL}/rudraksha`,
    type: 'website',
  },
};

const CATEGORY_ORDER: RudrakshaCategory[] = ['standard', 'rare', 'special'];

const CATEGORY_BLURB: Record<RudrakshaCategory, string> = {
  standard: 'Most commonly worn beads with widely available genuine Nepali/Indonesian origin. Suited for everyday sadhana.',
  rare: 'Less commonly found — higher potency, often worn after specific astrological recommendation.',
  special: 'Naturally-occurring conjoined or unique beads (Ganesh / Gauri-Shankar / Trijuti / Sawar). Each bead is itself a deity manifestation.',
};

const CATEGORY_LABEL: Record<RudrakshaCategory, string> = {
  standard: 'Standard Mukhi (commonly worn)',
  rare: 'Rare Mukhi (specific use-cases)',
  special: 'Special Naturally-Conjoined Beads',
};

const CATEGORY_ACCENT: Record<RudrakshaCategory, string> = {
  standard: 'border-amber-200 bg-amber-50/40',
  rare: 'border-rose-200 bg-rose-50/40',
  special: 'border-indigo-200 bg-indigo-50/40',
};

export default function RudrakshaIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Rudraksha Varieties — 14 Mukhi + 4 Special',
    numberOfItems: RUDRAKSHAS.length,
    itemListElement: RUDRAKSHAS.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE_URL}/rudraksha/${r.slug}`,
      name: `${r.name} — ${r.deity}`,
    })),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Rudraksha Guide', item: `${BASE_URL}/rudraksha` },
    ],
  };

  const byCategory = new Map<RudrakshaCategory, typeof RUDRAKSHAS>();
  for (const r of RUDRAKSHAS) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-amber-700">Sacred beads of Lord Shiva</p>
        <h1 className={`${H1.catalogue} mt-1`}>Rudraksha — Complete Mukhi Guide</h1>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Rudraksha (रुद्राक्ष = &ldquo;Rudra&rsquo;s tears&rdquo;) are sacred beads from the Elaeocarpus ganitrus tree, born when
          Lord Shiva opened his eyes after thousand years of meditation. Each natural face (mukhi) on the bead maps to
          a presiding deity and planetary energy. This guide covers all 14 mukhi varieties plus 4 special naturally-conjoined
          beads, each with its beej mantra, wearing day, hand, energising ritual and traditional benefits per Shiva Purana.
        </p>
        <p className="mt-3 max-w-2xl prose-meta text-gray-600">
          See also{' '}
          <Link href="/jyotirlinga" className="text-amber-700 underline">12 Jyotirlinga</Link>,{' '}
          <Link href="/chants" className="text-amber-700 underline">Sanskrit mantras</Link>, and{' '}
          <Link href="/deity/shiva" className="text-amber-700 underline">Lord Shiva</Link>.
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
            <h2 className="mb-1 text-xl font-semibold text-gray-900">{CATEGORY_LABEL[category]}</h2>
            <p className="mb-4 text-sm text-gray-600">{CATEGORY_BLURB[category]}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((r) => (
                <Link
                  key={r.slug}
                  href={`/rudraksha/${r.slug}`}
                  className={`block rounded-2xl border p-5 transition hover:shadow-md ${CATEGORY_ACCENT[category]}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900">
                      <span className="mr-2 inline-block rounded bg-amber-700 px-1.5 py-0.5 text-xs font-bold text-white">
                        {typeof r.mukhi === 'number' ? `${r.mukhi}M` : r.mukhi}
                      </span>
                      {r.name}
                    </h3>
                    <span className="font-serif text-sm text-gray-600">{r.sanskrit}</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-amber-900">
                    Deity: <span className="font-normal text-gray-700">{r.deity}</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-900">
                    Planet: <span className="font-normal text-gray-700">{r.planet}</span>
                  </p>
                  <p className="mt-1 text-xs font-medium text-amber-900">
                    Mantra: <span className="font-serif font-normal text-gray-700">{r.mantra}</span>
                  </p>
                  <p className="mt-3 line-clamp-2 text-sm text-gray-700">{r.significance}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-10 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">How to choose &amp; wear rudraksha</h2>
        <p className="mt-2 text-sm text-gray-700">
          The right mukhi for you depends on your birth chart, current dasha and intent. A 5-mukhi (Panch Mukhi) is the
          universal default — safe for anyone seeking general well-being and Shiva-bhakti. For specific doshas or goals,
          consult a Vedic astrologer. Always buy from a trusted source and energise the bead before first wear with the
          deity&apos;s beej mantra (108 times, on the recommended day).
        </p>
        <p className="mt-3 text-sm text-gray-700">
          Book a consultation with an{' '}
          <Link href="/astrologers" className="text-amber-700 underline">astrologer</Link> for personalised mukhi
          recommendation, or browse{' '}
          <Link href="/pujas" className="text-amber-700 underline">rudraksha-related pujas</Link>.
        </p>
      </section>
    </main>
  );
}
