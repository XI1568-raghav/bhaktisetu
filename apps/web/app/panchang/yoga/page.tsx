import type { Metadata } from 'next';
import Link from 'next/link';
import { PANCHANG_YOGAS } from '../../../lib/panchang-yogas';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: '27 Nitya Yogas — 4th Anga of Panchang | Free Vedic Reference',
 description:
  'All 27 nitya yogas of Vedic Panchang: Vishkambha, Priti, Ayushman, Saubhagya, Shobhana, Atiganda, Sukarma, Dhriti, Shoola, Ganda, Vriddhi, Dhruva, Vyaghata, Harshana, Vajra, Siddhi, Vyatipata, Variyan, Parigha, Shiva, Siddha, Sadhya, Shubha, Shukla, Brahma, Indra, Vaidhriti. Auspicious vs inauspicious classification + deity + mantra + best-for + avoid-for per yoga.',
 alternates: { canonical: `${BASE_URL}/panchang/yoga` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: '27 Nitya Yogas — 4th Anga of Panchang',
  description: '4th anga of Panchang. 9 inauspicious yogas to avoid for muhurat. Free reference with deity + mantra + best-for per yoga.',
  url: `${BASE_URL}/panchang/yoga`,
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
 name: '27 Nitya Yogas — 4th Anga of Panchang',
 numberOfItems: PANCHANG_YOGAS.length,
 itemListElement: PANCHANG_YOGAS.map((y, i) => ({
  '@type': 'ListItem',
  position: i + 1,
  url: `${BASE_URL}/panchang/yoga/${y.slug}`,
  name: `${y.name} Yoga (${y.sanskrit})`,
 })),
};

const BREADCRUMB_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Panchang', item: `${BASE_URL}/panchang` },
  { '@type': 'ListItem', position: 3, name: 'Yogas', item: `${BASE_URL}/panchang/yoga` },
 ],
};

export default function YogaIndexPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ITEMLIST_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />

   <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
    <nav className="text-xs text-gray-600">
     <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
     <Link href="/panchang" className="hover:text-saffron-700">Panchang</Link> · <span className="text-gray-900">Yogas</span>
    </nav>

    <header className="mt-4 text-center">
     <p className="text-xs uppercase tracking-wider text-saffron-600">4th anga of Panchang</p>
     <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">27 Nitya Yogas</h1>
     <p className="mt-2 text-sm text-saffron-700">सत्ताईस नित्य योग</p>
     <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
      Each nitya yoga lasts approximately one day. Computed from Sun-longitude + Moon-longitude
      divided into 27 parts of 13°20′. Nine yogas are universally inauspicious — Drik Panchang
      flags them daily so you can skip new ventures, marriage, and travel.
     </p>
    </header>

    <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
     <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800">Shubha 17</span>
     <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-800">Ashubha 9</span>
     <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-800">Mishra 1</span>
    </div>

    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {PANCHANG_YOGAS.map((y) => (
      <Link
       key={y.slug}
       href={`/panchang/yoga/${y.slug}`}
       className={`rounded-2xl border-2 p-4 transition hover:shadow-md ${NATURE_STYLE[y.nature]}`}
      >
       <div className="flex items-start justify-between">
        <div>
         <p className="text-xs uppercase tracking-wider text-gray-600">#{y.number}</p>
         <p className="font-serif text-lg text-gray-900">{y.name}</p>
         <p className="text-sm text-saffron-700">{y.sanskrit}</p>
        </div>
        <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-xs font-semibold text-gray-800">
         {NATURE_LABEL[y.nature]}
        </span>
       </div>
       <p className="mt-2 text-xs text-gray-700"><span className="font-semibold">Deity:</span> {y.deity}</p>
       <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-gray-700">{y.effect}</p>
      </Link>
     ))}
    </div>

    <div className="mt-10 rounded-2xl border border-saffron-200 bg-saffron-50 p-6 text-center">
     <p className="font-serif text-lg text-gray-900">Pair with karanas + tithi + nakshatra</p>
     <p className="mt-2 text-sm text-gray-700">
      A complete Panchang reading combines all 5 angas. Use the yoga together with today&apos;s tithi,
      nakshatra, vaar, and karana to time your puja, travel, or sankalp.
     </p>
     <div className="mt-4 flex flex-wrap justify-center gap-2">
      <Link href="/panchang/karana" className="rounded-full bg-saffron-600 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
       11 Karanas (5th anga)
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
