import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
import { ASHTA_LAKSHMIS } from '../../lib/ashta-lakshmi';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
  title: 'Ashta Lakshmi — 8 Forms of Goddess Lakshmi (Mantras, Vahana, Vrata)',
  description:
    'All 8 manifestations of Lakshmi per Lakshmi Tantra: Adi, Dhana, Dhanya, Gaja, Santana, Veera, Vijaya, Vidya. Each form\'s domain, beej + primary mantra in Devanagari, vahana, color, best day, signature festival, vrata practice and associated temple.',
  alternates: { canonical: `${BASE_URL}/ashta-lakshmi` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
    title: 'Ashta Lakshmi — 8 forms of Goddess Lakshmi',
    description: 'Mantras, vahana, vrata and best-day for all 8 Lakshmi manifestations.',
    url: `${BASE_URL}/ashta-lakshmi`,
    type: 'website',
  },
};

export default function AshtaLakshmiIndexPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Ashta Lakshmi — 8 forms of Goddess Lakshmi',
    numberOfItems: ASHTA_LAKSHMIS.length,
    itemListElement: ASHTA_LAKSHMIS.map((l) => ({
      '@type': 'ListItem',
      position: l.number,
      url: `${BASE_URL}/ashta-lakshmi/${l.slug}`,
      name: `${l.number}. ${l.name} — ${l.domain}`,
    })),
  };
  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Ashta Lakshmi', item: `${BASE_URL}/ashta-lakshmi` },
    ],
  };

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <header className="mb-10">
        <p className="text-xs uppercase tracking-wider text-pink-700">Eight forms · eight blessings</p>
        <h1 className={`${H1.catalogue} mt-1`}>Ashta Lakshmi</h1>
        <p className="mt-1 font-serif text-xl text-gray-700">अष्ट लक्ष्मी</p>
        <p className="mt-3 max-w-2xl text-base text-gray-600">
          Goddess Lakshmi manifests in eight forms — each presiding over one aspect of true prosperity. From Adi
          (primordial) to Vidya (knowledge), this is the complete Tantric grid worshipped on Diwali and Varalakshmi
          Vrata. Each form has its own beej mantra, vahana, signature festival and vrata.
        </p>
        <p className="mt-3 max-w-2xl text-sm text-gray-600">
          See also <Link href="/shakti-peeth" className="text-pink-700 underline">51 Shakti Peeth</Link>,{' '}
          <Link href="/dashavatar" className="text-pink-700 underline">Dashavatar of Vishnu</Link> and{' '}
          <Link href="/nava-graha" className="text-pink-700 underline">Nava Graha</Link>.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {ASHTA_LAKSHMIS.map((l) => (
          <Link
            key={l.slug}
            href={`/ashta-lakshmi/${l.slug}`}
            className="block rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50/60 to-amber-50/40 p-5 transition hover:shadow-md"
          >
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-gray-900">
                <span className="mr-2 inline-block rounded bg-pink-700 px-1.5 py-0.5 text-xs font-bold text-white">{l.number}</span>
                {l.name}
              </h2>
              <span className="font-serif text-sm text-gray-700">{l.sanskrit}</span>
            </div>
            <p className="mt-2 text-sm text-gray-700">{l.domain}</p>
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Vahana: {l.vahana.split(';')[0]}</span>
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-pink-900">Color: {l.color}</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-900">{l.bestDay.split('+')[0]?.trim() ?? ''}</span>
              <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-900">{l.numberOfHands} hands</span>
            </div>
            <p className="mt-3 text-xs italic text-gray-600">{l.benefit}</p>
          </Link>
        ))}
      </section>

      <section className="mt-10 rounded-2xl border border-pink-200 bg-pink-50/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900">Worship together — the Ashta Lakshmi Stotra</h2>
        <p className="mt-2 text-sm text-gray-700">
          On Diwali night and Varalakshmi Vrata (Sravana month), all 8 forms are invoked together via the Ashta Lakshmi
          Stotra. The Ashtalakshmi Temple at Besant Nagar, Chennai houses all 8 shrines in one complex — the only such
          dedicated grid in India.
        </p>
        <p className="mt-2 text-sm text-gray-700">
          Cannot travel? Book a <Link href="/pujas" className="text-pink-700 underline">remote Lakshmi puja with video proof</Link>.
          See <Link href="/calendar" className="text-pink-700 underline">Hindu festival calendar 2026</Link> for Dhanteras + Diwali + Varalakshmi dates.
        </p>
      </section>
    </main>
  );
}
