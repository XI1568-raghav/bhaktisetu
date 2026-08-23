import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { PANCHANG_KARANAS, CHARA_KARANAS, STHIRA_KARANAS } from '../../../lib/panchang-karanas';
import { buttonClass } from '../../../components/ui/button-recipe';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: '11 Karanas — 5th Anga of Panchang | Free Vedic Reference',
 description:
  '11 karanas of Vedic Panchang. 7 chara (movable): Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti (Bhadra). 4 sthira (fixed): Shakuni, Chatushpada, Naga, Kintughna. Vishti / Bhadra is the most-avoided karana — universally inauspicious for marriage, travel, business start. Full deity + mantra + best-for + avoid-for per karana.',
 alternates: { canonical: `${BASE_URL}/panchang/karana` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: '11 Karanas — 5th Anga of Panchang',
  description: '5th anga of Panchang. Vishti / Bhadra most-avoided. Free reference with deity + mantra + best-for per karana.',
  url: `${BASE_URL}/panchang/karana`,
  type: 'website',
 },
};

const NATURE_STYLE = {
 auspicious: 'border-emerald-200 bg-emerald-50',
 inauspicious: 'border-rose-200 bg-rose-50',
 mixed: 'border-amber-200 bg-amber-50',
} as const;

const NATURE_LABEL = {
 auspicious: 'Shubha',
 inauspicious: 'Ashubha',
 mixed: 'Mishra',
} as const;

const ITEMLIST_LD = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 name: '11 Karanas — 5th Anga of Panchang',
 numberOfItems: PANCHANG_KARANAS.length,
 itemListElement: PANCHANG_KARANAS.map((k, i) => ({
  '@type': 'ListItem',
  position: i + 1,
  url: `${BASE_URL}/panchang/karana/${k.slug}`,
  name: `${k.name} Karana (${k.sanskrit})`,
 })),
};

const BREADCRUMB_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Panchang', item: `${BASE_URL}/panchang` },
  { '@type': 'ListItem', position: 3, name: 'Karanas', item: `${BASE_URL}/panchang/karana` },
 ],
};

function KaranaCard({ k }: { k: typeof PANCHANG_KARANAS[number] }) {
 return (
  <Link
   href={`/panchang/karana/${k.slug}`}
   className={`rounded-2xl border-2 p-4 transition hover:shadow-md ${NATURE_STYLE[k.nature]}`}
  >
   <div className="flex items-start justify-between">
    <div>
     <p className="text-xs uppercase tracking-wider text-gray-600">#{k.number}</p>
     <p className="font-serif text-lg text-gray-900">{k.name}</p>
     <p className="text-sm text-saffron-700">{k.sanskrit}</p>
    </div>
    <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-gray-800">
     {NATURE_LABEL[k.nature]}
    </span>
   </div>
   <p className="mt-2 text-xs text-gray-700"><span className="font-semibold">Deity:</span> {k.deity}</p>
   <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-700">{k.effect}</p>
  </Link>
 );
}

export default function KaranaIndexPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ITEMLIST_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />

   <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <nav className="text-xs text-gray-600">
     <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
     <Link href="/panchang" className="hover:text-saffron-700">Panchang</Link> · <span className="text-gray-900">Karanas</span>
    </nav>

    <header className="mt-4 text-center">
     <p className="text-xs uppercase tracking-wider text-saffron-600">5th anga of Panchang</p>
     <h1 className={`${H1.catalogue} mt-1`}>11 Karanas</h1>
     <p className="mt-2 text-sm text-saffron-700">एकादश करण</p>
     <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
      A karana is half a tithi (~12 hours). Seven <strong>chara</strong> karanas rotate, four
      <strong> sthira</strong> karanas are fixed near full moon and new moon. <strong>Vishti / Bhadra</strong>{' '}
      is the most-avoided karana — universally inauspicious for all auspicious work.
     </p>
    </header>

    <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
     <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">Shubha 7</span>
     <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800">Ashubha 3</span>
     <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">Mishra 1</span>
    </div>

    <section className="mt-8">
     <h2 className="font-serif text-xl text-gray-900">7 Chara Karanas (Movable)</h2>
     <p className="mt-1 text-sm text-gray-600">Rotate 8 times each across 30 tithis = 56 slots.</p>
     <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CHARA_KARANAS.map((k) => <KaranaCard key={k.slug} k={k} />)}
     </div>
    </section>

    <section className="mt-10">
     <h2 className="font-serif text-xl text-gray-900">4 Sthira Karanas (Fixed)</h2>
     <p className="mt-1 text-sm text-gray-600">Occupy fixed slots near amavasya (new moon).</p>
     <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {STHIRA_KARANAS.map((k) => <KaranaCard key={k.slug} k={k} />)}
     </div>
    </section>

    <div className="mt-10 rounded-2xl border-2 border-rose-300 bg-rose-50 p-6">
     <p className="font-serif text-lg text-rose-900">⚠ About Bhadra / Vishti</p>
     <p className="mt-2 text-sm text-rose-900">
      Bhadra (Vishti) is the daughter of Surya and sister of Yama. Visited by Yama-amsha. Every
      Drik Panchang publishes Bhadra hours separately. Avoid <em>all</em> auspicious work during
      Bhadra: marriage, griha pravesh, travel, business start, vehicle purchase, naming ceremony,
      sankalp. Even routine work suffers obstacles. Bhadra-shanti puja can be done within Bhadra
      hours itself.
     </p>
    </div>

    <div className="mt-10 rounded-2xl border border-saffron-200 bg-saffron-50 p-6 text-center">
     <p className="font-serif text-lg text-gray-900">Pair with yoga + tithi + nakshatra</p>
     <p className="mt-2 text-sm text-gray-700">
      Karana is the 5th and final anga of Panchang. Combine with the other four for complete
      muhurat shastra timing.
     </p>
     <div className="mt-4 flex flex-wrap justify-center gap-2">
      <Link href="/panchang/yoga" className={buttonClass('primary', 'md')}>
       27 Yogas (4th anga)
      </Link>
      <Link href="/panchang/tithi" className="rounded-full border border-saffron-300 bg-white px-4 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       30 Tithis
      </Link>
      <Link href="/nakshatra" className="rounded-full border border-saffron-300 bg-white px-4 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       27 Nakshatras
      </Link>
      <Link href="/astrology/shubh-muhurat" className="rounded-full border border-saffron-300 bg-white px-4 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
       Shubh Muhurat finder
      </Link>
     </div>
    </div>
   </main>
  </>
 );
}
