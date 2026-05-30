import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PANCHANG_KARANAS } from '../../../../lib/panchang-karanas';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
 return PANCHANG_KARANAS.map((k) => ({ slug: k.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params;
 const k = PANCHANG_KARANAS.find((it) => it.slug === slug);
 if (!k) return { title: 'Karana not found | Darshya' };
 return {
  title: `${k.name} Karana (${k.sanskrit}) — Effect, Deity, Best For | Darshya`,
  description: `${k.name} is karana #${k.number} of 11. ${k.category === 'chara' ? 'Chara (movable)' : 'Sthira (fixed)'}. Deity ${k.deity}. ${k.effect.slice(0, 130)}`,
  alternates: { canonical: `${BASE_URL}/panchang/karana/${k.slug}` },
  openGraph: {
   title: `${k.name} Karana — ${k.sanskrit}`,
   description: k.effect.slice(0, 200),
   url: `${BASE_URL}/panchang/karana/${k.slug}`,
   type: 'article',
  },
 };
}

const NATURE_BAR = {
 auspicious: 'bg-emerald-100 text-emerald-900 border-emerald-300',
 inauspicious: 'bg-rose-100 text-rose-900 border-rose-300',
 mixed: 'bg-amber-100 text-amber-900 border-amber-300',
} as const;

export default async function KaranaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const k = PANCHANG_KARANAS.find((it) => it.slug === slug);
 if (!k) notFound();

 const prev = PANCHANG_KARANAS[(k.number - 2 + PANCHANG_KARANAS.length) % PANCHANG_KARANAS.length];
 const next = PANCHANG_KARANAS[k.number % PANCHANG_KARANAS.length];

 const BREADCRUMB_LD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Panchang', item: `${BASE_URL}/panchang` },
   { '@type': 'ListItem', position: 3, name: 'Karanas', item: `${BASE_URL}/panchang/karana` },
   { '@type': 'ListItem', position: 4, name: k.name, item: `${BASE_URL}/panchang/karana/${k.slug}` },
  ],
 };

 const ARTICLE_LD = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `${k.name} Karana (${k.sanskrit}) — 5th Anga of Panchang`,
  description: k.effect,
  author: { '@type': 'Organization', name: 'Darshya' },
  publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
  inLanguage: 'en',
  url: `${BASE_URL}/panchang/karana/${k.slug}`,
 };

 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ARTICLE_LD) }} />

   <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
    <nav className="text-xs text-gray-600">
     <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
     <Link href="/panchang" className="hover:text-saffron-700">Panchang</Link> ·{' '}
     <Link href="/panchang/karana" className="hover:text-saffron-700">Karanas</Link> ·{' '}
     <span className="text-gray-900">{k.name}</span>
    </nav>

    <header className="mt-4">
     <p className="text-xs uppercase tracking-wider text-saffron-600">
      Karana #{k.number} of 11 · {k.category === 'chara' ? 'Chara (Movable)' : 'Sthira (Fixed)'}
     </p>
     <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">{k.name} Karana</h1>
     <p className="mt-1 text-lg text-saffron-700">{k.sanskrit}</p>
     <p className="mt-2 text-sm text-gray-700"><span className="font-semibold">Presiding deity:</span> {k.deity}</p>
    </header>

    <div className={`mt-6 rounded-2xl border-2 p-5 ${NATURE_BAR[k.nature]}`}>
     <p className="text-sm font-semibold uppercase tracking-wider">
      {k.nature === 'auspicious' && 'Shubha — Auspicious'}
      {k.nature === 'inauspicious' && 'Ashubha — Avoid for shubh karya'}
      {k.nature === 'mixed' && 'Mishra — Use with caution'}
     </p>
     <p className="mt-2 text-sm">{k.effect}</p>
    </div>

    <section className="mt-6 grid gap-4 sm:grid-cols-2">
     <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="font-serif text-base font-semibold text-emerald-900">Best for</p>
      <ul className="mt-2 space-y-1 text-sm text-emerald-900">
       {k.bestFor.map((b) => <li key={b}>• {b}</li>)}
      </ul>
     </div>
     <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5">
      <p className="font-serif text-base font-semibold text-rose-900">Avoid for</p>
      <ul className="mt-2 space-y-1 text-sm text-rose-900">
       {k.avoidFor.map((a) => <li key={a}>• {a}</li>)}
      </ul>
     </div>
    </section>

    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
     <p className="font-serif text-base font-semibold text-amber-900">Tradition note</p>
     <p className="mt-1 text-sm text-amber-900">{k.notes}</p>
    </section>

    <section className="mt-6 rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-5">
     <p className="font-serif text-base font-semibold text-gray-900">Karana deity mantra</p>
     <p className="mt-2 font-serif text-2xl text-saffron-800">{k.mantra}</p>
     <p className="mt-1 text-sm italic text-gray-700">{k.mantraEnglish}</p>
     <p className="mt-2 text-xs text-gray-600">Recite 108 times during this karana to invoke the presiding deity&apos;s grace.</p>
    </section>

    <nav className="mt-10 flex items-center justify-between border-t border-saffron-100 pt-6">
     <Link href={`/panchang/karana/${prev!.slug}`} className="text-sm text-saffron-700 hover:text-saffron-900">
      ← {prev!.name}
     </Link>
     <Link href="/panchang/karana" className="text-sm text-gray-600 hover:text-saffron-700">
      All 11 karanas
     </Link>
     <Link href={`/panchang/karana/${next!.slug}`} className="text-sm text-saffron-700 hover:text-saffron-900">
      {next!.name} →
     </Link>
    </nav>

    <div className="mt-8 rounded-2xl border border-saffron-200 bg-saffron-50 p-5 text-center">
     <p className="text-sm text-gray-700">
      Want today&apos;s actual karana (changes every ~12 hours)? See{' '}
      <Link href="/panchang" className="font-semibold text-saffron-700 hover:underline">today&apos;s panchang</Link>{' '}
      or use the{' '}
      <Link href="/astrology/shubh-muhurat" className="font-semibold text-saffron-700 hover:underline">Shubh Muhurat finder</Link>.
     </p>
    </div>
   </main>
  </>
 );
}
