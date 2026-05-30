import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getMahavidya, MAHAVIDYAS } from '../../../../lib/mahavidyas';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
 return MAHAVIDYAS.map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
 const m = getMahavidya(params.slug);
 if (!m) return { title: 'Not found' };
 return {
  title: `${m.name} (${m.sanskrit}) — Mahavidya ${m.order} | Mantra, Iconography & Sadhana | Darshya`,
  description: `Complete ${m.name} guide — ${m.epithet}. Origin, iconography, mool mantra ${m.mantraEnglish}, sadhana goal, householder cautions, famous shrines. ${m.order}th of 10 Mahavidyas per Brihad Nila Tantra & Devi Bhagavata.`,
  alternates: { canonical: `${BASE_URL}/devi/mahavidyas/${m.slug}` },
 };
}

export default function MahavidyaPage({ params }: { params: { slug: string } }) {
 const m = getMahavidya(params.slug);
 if (!m) return notFound();

 const idx = MAHAVIDYAS.findIndex((x) => x.slug === m.slug);
 const prev = MAHAVIDYAS[(idx - 1 + MAHAVIDYAS.length) % MAHAVIDYAS.length]!;
 const next = MAHAVIDYAS[(idx + 1) % MAHAVIDYAS.length]!;

 const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Devi', item: `${BASE_URL}/devi` },
   { '@type': 'ListItem', position: 3, name: 'Dasa Mahavidya', item: `${BASE_URL}/devi/mahavidyas` },
   { '@type': 'ListItem', position: 4, name: m.name, item: `${BASE_URL}/devi/mahavidyas/${m.slug}` },
  ],
 };

 const articleLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `${m.name} — Mahavidya ${m.order} of 10`,
  description: `${m.name} (${m.sanskrit}) — ${m.epithet}. ${m.cosmicFunction}`,
  url: `${BASE_URL}/devi/mahavidyas/${m.slug}`,
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
      <Link href="/devi/mahavidyas" className="hover:text-saffron-700">Dasa Mahavidya</Link> ·{' '}
      <span className="text-gray-900">{m.name}</span>
     </nav>

     <header className="mt-4 rounded-2xl border-2 border-saffron-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
       <div>
        <p className="text-xs uppercase tracking-wider text-saffron-600">Mahavidya {m.order} of 10</p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-gray-900">{m.name}</h1>
        <p className="mt-1 text-base text-saffron-700">{m.sanskrit}</p>
        <p className="mt-2 text-sm italic text-gray-700">{m.epithet}</p>
       </div>
       <div
        className="h-20 w-20 flex-shrink-0 rounded-full border-4 border-white shadow-lg"
        style={{ backgroundColor: m.colorHex }}
        aria-label={`Color ${m.colorName}`}
       />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Color</p>
        <p className="mt-1 text-sm text-saffron-900">{m.colorName}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Element</p>
        <p className="mt-1 text-sm text-saffron-900">{m.element}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Direction</p>
        <p className="mt-1 text-sm text-saffron-900">{m.direction}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Consort</p>
        <p className="mt-1 text-sm text-saffron-900">{m.consort}</p>
       </div>
      </div>
      <div className="mt-4 rounded-xl border border-saffron-200 bg-saffron-50/40 p-4">
       <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Cosmic function</p>
       <p className="mt-2 text-sm leading-relaxed text-gray-800">{m.cosmicFunction}</p>
      </div>
     </header>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Origin story</h2>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{m.origin}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Iconography</h2>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{m.iconography}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Worship mantra</p>
      <p className="mt-3 font-serif text-2xl text-saffron-900">{m.mantra}</p>
      <p className="text-sm italic text-saffron-800">{m.mantraEnglish}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
       <div className="rounded-xl bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Beej mantra</p>
        <p className="mt-1 font-serif text-base text-saffron-900">{m.beejMantra}</p>
       </div>
       <div className="rounded-xl bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Worship day</p>
        <p className="mt-1 text-sm text-saffron-900">{m.worshipDay}</p>
       </div>
      </div>
      <div className="mt-3 rounded-xl bg-white/70 p-3">
       <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Mool mantra (advanced — initiation recommended)</p>
       <p className="mt-1 font-serif text-sm leading-relaxed text-saffron-900">{m.mool}</p>
      </div>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Sadhana goal</h2>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{m.sadhanaGoal}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">She grants</p>
       <ul className="mt-3 space-y-1.5 text-sm text-emerald-900">
        {m.grants.map((g) => <li key={g}>✓ {g}</li>)}
       </ul>
      </div>
      <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-900">Cautions</p>
       <ul className="mt-3 space-y-1.5 text-sm text-rose-900">
        {m.cautions.map((c) => <li key={c}>⚠ {c}</li>)}
       </ul>
      </div>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Famous shrines</h2>
     <div className="mt-3 flex flex-wrap gap-2">
      {m.famousShrines.map((s) => (
       <span key={s} className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-sm text-saffron-900">{s}</span>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-indigo-900">Tradition connection</p>
      <p className="mt-2 text-sm leading-relaxed text-indigo-900">{m.connection}</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
     <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4">
      <Link href={`/devi/mahavidyas/${prev.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       ← {prev.order}. {prev.name}
      </Link>
      <Link href="/devi/mahavidyas" className="text-xs uppercase tracking-wider text-saffron-700 hover:text-saffron-900">
       All 10 Mahavidyas
      </Link>
      <Link href={`/devi/mahavidyas/${next.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       {next.order}. {next.name} →
      </Link>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want {m.name} sadhana guided by a qualified pandit?</p>
      <p className="mt-2 text-sm text-gray-700">
       A traditional pandit can guide your worship — right mantra count, lineage-correct procedure, and
       indication of whether initiation (diksha) is appropriate for your spiritual goal.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/pujas" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Book a Devi puja
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
