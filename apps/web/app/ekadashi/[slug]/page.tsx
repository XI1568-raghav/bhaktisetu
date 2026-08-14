import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEkadashi, EKADASHIS } from '../../../lib/ekadashis';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
 return EKADASHIS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params;
 const e = getEkadashi(slug);
 if (!e) return { title: 'Not found' };
 return {
  title: `${e.name} — Story, Fasting Rules, Mantra & Benefits`,
  description: `${e.name} (${e.sanskrit}) — ${e.paksha} ${e.masa} Ekadashi (${e.gregorianWindow}). Padma Purana story, fasting rules, permitted foods, mantra ${e.mantraEnglish}, benefits & who should observe.`,
  alternates: { canonical: `${BASE_URL}/ekadashi/${e.slug}` },
 };
}

export default async function EkadashiDetailPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const e = getEkadashi(slug);
 if (!e) return notFound();

 const idx = EKADASHIS.findIndex((x) => x.slug === e.slug);
 const prev = EKADASHIS[(idx - 1 + EKADASHIS.length) % EKADASHIS.length]!;
 const next = EKADASHIS[(idx + 1) % EKADASHIS.length]!;

 const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Ekadashi Vratas', item: `${BASE_URL}/ekadashi` },
   { '@type': 'ListItem', position: 3, name: e.name, item: `${BASE_URL}/ekadashi/${e.slug}` },
  ],
 };

 const articleLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `${e.name} — ${e.paksha} ${e.masa} Ekadashi`,
  description: `${e.name} (${e.sanskrit}) — ${e.storySummary.slice(0, 200)}`,
  url: `${BASE_URL}/ekadashi/${e.slug}`,
  publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
 };

 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

   <main>
    <section className="mx-auto max-w-4xl px-4 pt-10 sm:px-6">
     <nav className="text-xs text-gray-600">
      <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
      <Link href="/ekadashi" className="hover:text-saffron-700">Ekadashi Vratas</Link> ·{' '}
      <span className="text-gray-900">{e.name}</span>
     </nav>

     <header className="mt-4 rounded-2xl border-2 border-saffron-200 bg-white p-6">
      <p className="text-xs uppercase tracking-wider text-saffron-600">Ekadashi {e.order} of 24</p>
      <h1 className="mt-1 font-serif text-4xl font-bold text-gray-900">{e.name}</h1>
      <p className="mt-1 text-base text-saffron-700">{e.sanskrit}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Paksha</p>
        <p className="mt-1 text-sm text-saffron-900">{e.paksha}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Masa</p>
        <p className="mt-1 text-sm text-saffron-900">{e.masa}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Window</p>
        <p className="mt-1 text-sm text-saffron-900">{e.gregorianWindow}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Deity</p>
        <p className="mt-1 text-sm text-saffron-900">{e.presidingDeity}</p>
       </div>
      </div>
     </header>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Origin &amp; story</h2>
     <p className="mt-3 text-xs uppercase tracking-wider text-gray-500">{e.origin}</p>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{e.storySummary}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Worship mantra</p>
      <p className="mt-3 font-serif text-2xl text-saffron-900">{e.mantra}</p>
      <p className="text-sm italic text-saffron-800">{e.mantraEnglish}</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900">Fasting rule</p>
      <p className="mt-2 text-sm leading-relaxed text-indigo-900">{e.fastingRule}</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Foods permitted</p>
       <ul className="mt-3 space-y-1.5 text-sm text-emerald-900">
        {e.foodsPermitted.map((f) => <li key={f}>✓ {f}</li>)}
       </ul>
      </div>
      <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-900">Foods forbidden</p>
       <ul className="mt-3 space-y-1.5 text-sm text-rose-900">
        {e.foodsForbidden.map((f) => <li key={f}>✗ {f}</li>)}
       </ul>
      </div>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Benefits</h2>
     <ul className="mt-3 space-y-2 text-sm text-gray-700">
      {e.benefits.map((b) => (
       <li key={b} className="flex gap-2"><span className="text-saffron-600">◈</span>{b}</li>
      ))}
     </ul>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Who should observe</h2>
     <div className="mt-3 flex flex-wrap gap-2">
      {e.forDevotees.map((d) => (
       <span key={d} className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-sm text-saffron-900">{d}</span>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">Special note</p>
      <p className="mt-2 text-sm leading-relaxed text-amber-900">{e.specialNote}</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
     <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4">
      <Link href={`/ekadashi/${prev.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       ← {prev.order}. {prev.name}
      </Link>
      <Link href="/ekadashi" className="text-xs uppercase tracking-wider text-saffron-700 hover:text-saffron-900">
       All 24 Ekadashis
      </Link>
      <Link href={`/ekadashi/${next.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       {next.order}. {next.name} →
      </Link>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want {e.name} vrata guided by a qualified pandit?</p>
      <p className="mt-2 text-sm text-gray-700">
       Pandit-guided Vishnu puja, parana (fast-breaking) muhurat, and personalized
       sankalp ensure your vrata bears full merit.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/pujas" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Book a Vishnu puja
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
