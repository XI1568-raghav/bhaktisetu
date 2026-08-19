import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../../components/ui/heading-recipe';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PANCHANG_YOGAS } from '../../../../lib/panchang-yogas';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
 return PANCHANG_YOGAS.map((y) => ({ slug: y.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params;
 const y = PANCHANG_YOGAS.find((it) => it.slug === slug);
 if (!y) return { title: 'Yoga not found' };
 return {
  title: `${y.name} Yoga (${y.sanskrit}) — Effect, Deity, Best For`,
  description: `${y.name} is yoga #${y.number} of 27 nitya yogas. Deity ${y.deity}. ${y.effect.slice(0, 140)}`,
  alternates: { canonical: `${BASE_URL}/panchang/yoga/${y.slug}` },
  openGraph: {
   images: ['/images/golden-temple-og.jpg'],
   title: `${y.name} Yoga — ${y.sanskrit}`,
   description: y.effect.slice(0, 200),
   url: `${BASE_URL}/panchang/yoga/${y.slug}`,
   type: 'article',
  },
 };
}

const NATURE_BAR = {
 auspicious: 'bg-emerald-100 text-emerald-900 border-emerald-300',
 inauspicious: 'bg-rose-100 text-rose-900 border-rose-300',
 mixed: 'bg-amber-100 text-amber-900 border-amber-300',
} as const;

export default async function YogaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const y = PANCHANG_YOGAS.find((it) => it.slug === slug);
 if (!y) notFound();

 const prev = PANCHANG_YOGAS[(y.number - 2 + PANCHANG_YOGAS.length) % PANCHANG_YOGAS.length];
 const next = PANCHANG_YOGAS[y.number % PANCHANG_YOGAS.length];

 const BREADCRUMB_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Panchang', item: `${BASE_URL}/panchang` },
   { '@type': 'ListItem', position: 3, name: 'Yogas', item: `${BASE_URL}/panchang/yoga` },
   { '@type': 'ListItem', position: 4, name: y.name, item: `${BASE_URL}/panchang/yoga/${y.slug}` },
  ],
 };

 const ARTICLE_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `${y.name} Yoga (${y.sanskrit}) — 4th Anga of Panchang`,
  description: y.effect,
  author: { '@type': 'Organization', name: 'Darshya' },
  publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
  inLanguage: 'en',
  url: `${BASE_URL}/panchang/yoga/${y.slug}`,
 };

 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />

   <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <nav className="text-xs text-gray-600">
     <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
     <Link href="/panchang" className="hover:text-saffron-700">Panchang</Link> ·{' '}
     <Link href="/panchang/yoga" className="hover:text-saffron-700">Yogas</Link> ·{' '}
     <span className="text-gray-900">{y.name}</span>
    </nav>

    <header className="mt-4">
     <p className="text-xs uppercase tracking-wider text-saffron-600">Yoga #{y.number} of 27</p>
     <h1 className={`${H1.catalogue} mt-1`}>{y.name} Yoga</h1>
     <p className="mt-1 text-lg text-saffron-700">{y.sanskrit}</p>
     <p className="mt-2 text-sm text-gray-700"><span className="font-semibold">Presiding deity:</span> {y.deity}</p>
    </header>

    <div className={`mt-6 rounded-2xl border-2 p-5 ${NATURE_BAR[y.nature]}`}>
     <p className="text-sm font-semibold uppercase tracking-wider">
      {y.nature === 'auspicious' && 'Shubha — Auspicious'}
      {y.nature === 'inauspicious' && 'Ashubha — Avoid for shubh karya'}
      {y.nature === 'mixed' && 'Mishra — Use with caution'}
     </p>
     <p className="mt-2 text-sm">{y.effect}</p>
    </div>

    <section className="mt-6 grid gap-4 sm:grid-cols-2">
     <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-serif text-base font-semibold text-emerald-900">Best for</p>
      <ul className="mt-2 space-y-1 text-sm text-emerald-900">
       {y.bestFor.map((b) => <li key={b}>• {b}</li>)}
      </ul>
     </div>
     <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <p className="font-serif text-base font-semibold text-rose-900">Avoid for</p>
      <ul className="mt-2 space-y-1 text-sm text-rose-900">
       {y.avoidFor.map((a) => <li key={a}>• {a}</li>)}
      </ul>
     </div>
    </section>

    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
     <p className="font-serif text-base font-semibold text-amber-900">First-part nuance</p>
     <p className="mt-1 text-sm text-amber-900">{y.firstPart}</p>
    </section>

    <section className="mt-6 rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5">
     <p className="font-serif text-base font-semibold text-gray-900">Yoga deity mantra</p>
     <p className="mt-2 font-serif text-2xl text-saffron-800">{y.mantra}</p>
     <p className="mt-1 text-sm italic text-gray-700">{y.mantraEnglish}</p>
     <p className="mt-2 text-xs text-gray-600">Recite 108 times during this yoga to amplify benefits or neutralise ashubha effects.</p>
    </section>

    <nav className="mt-10 flex items-center justify-between border-t border-saffron-100 pt-6">
     <Link href={`/panchang/yoga/${prev!.slug}`} className="text-sm text-saffron-700 hover:text-saffron-900">
      ← {prev!.name}
     </Link>
     <Link href="/panchang/yoga" className="text-sm text-gray-600 hover:text-saffron-700">
      All 27 yogas
     </Link>
     <Link href={`/panchang/yoga/${next!.slug}`} className="text-sm text-saffron-700 hover:text-saffron-900">
      {next!.name} →
     </Link>
    </nav>

    <div className="mt-8 rounded-2xl border border-saffron-200 bg-saffron-50 p-5 text-center">
     <p className="text-sm text-gray-700">
      Want today&apos;s actual yoga (changes daily)? See{' '}
      <Link href="/panchang" className="font-semibold text-saffron-700 hover:underline">today&apos;s panchang</Link>{' '}
      or use the{' '}
      <Link href="/astrology/shubh-muhurat" className="font-semibold text-saffron-700 hover:underline">Shubh Muhurat finder</Link>.
     </p>
    </div>
   </main>
  </>
 );
}
