import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getNavadurga, NAVADURGA } from '../../../../lib/navadurga';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;
export const dynamicParams = false;

export function generateStaticParams() {
 return NAVADURGA.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
 const form = getNavadurga(params.slug);
 if (!form) return { title: 'Not found' };
 return {
  title: `${form.name} (${form.sanskrit}) — Day ${form.day} of Navratri | Navadurga Guide | Darshya`,
  description: `Full ${form.name} guide — Day ${form.day} of Navratri. Color ${form.color}, planet ${form.planet}, mantra ${form.mantraEnglish}, prasad ${form.prasad}, mount ${form.mount}. Story, iconography, blessing & how-to-worship per Devi Mahatmya.`,
  alternates: { canonical: `${BASE_URL}/devi/navadurga/${form.slug}` },
 };
}

export default function NavadurgaFormPage({ params }: { params: { slug: string } }) {
 const form = getNavadurga(params.slug);
 if (!form) return notFound();

 const idx = NAVADURGA.findIndex((n) => n.slug === form.slug);
 const prev = NAVADURGA[(idx - 1 + NAVADURGA.length) % NAVADURGA.length]!;
 const next = NAVADURGA[(idx + 1) % NAVADURGA.length]!;

 const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Devi', item: `${BASE_URL}/devi` },
   { '@type': 'ListItem', position: 3, name: 'Navadurga', item: `${BASE_URL}/devi/navadurga` },
   { '@type': 'ListItem', position: 4, name: form.name, item: `${BASE_URL}/devi/navadurga/${form.slug}` },
  ],
 };

 const articleLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `${form.name} — Day ${form.day} of Navratri`,
  description: `${form.name} (${form.sanskrit}) — ${form.meaning}. Worshipped on Day ${form.day} of Navratri.`,
  url: `${BASE_URL}/devi/navadurga/${form.slug}`,
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
      <Link href="/devi/navadurga" className="hover:text-saffron-700">Navadurga</Link> ·{' '}
      <span className="text-gray-900">{form.name}</span>
     </nav>

     <header className="mt-4 rounded-2xl border-2 border-saffron-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
       <div>
        <p className="text-xs uppercase tracking-wider text-saffron-600">Day {form.day} of Navratri</p>
        <h1 className="mt-1 font-serif text-4xl font-bold text-gray-900">{form.name}</h1>
        <p className="mt-1 text-base text-saffron-700">{form.sanskrit}</p>
        <p className="mt-2 text-sm italic text-gray-700">{form.meaning}</p>
       </div>
       <div
        className="h-20 w-20 flex-shrink-0 rounded-full border-4 border-white shadow-lg"
        style={{ backgroundColor: form.colorHex }}
        aria-label={`Day color ${form.color}`}
       />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Color</p>
        <p className="mt-1 text-sm text-saffron-900">{form.color}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Planet</p>
        <p className="mt-1 text-sm text-saffron-900">{form.planet}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Mount</p>
        <p className="mt-1 text-sm text-saffron-900">{form.mount}</p>
       </div>
       <div className="rounded-xl bg-saffron-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Chakra</p>
        <p className="mt-1 text-sm text-saffron-900">{form.chakra}</p>
       </div>
      </div>
     </header>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Sacred story</h2>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{form.story}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Iconography</h2>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{form.iconography}</p>
     <div className="mt-4 rounded-xl border border-saffron-200 bg-saffron-50/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Weapons &amp; mudras</p>
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
       {form.weapons.map((w) => <li key={w}>• {w}</li>)}
      </ul>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Daily mantra</p>
      <p className="mt-3 font-serif text-2xl text-saffron-900">{form.mantra}</p>
      <p className="text-sm italic text-saffron-800">{form.mantraEnglish}</p>
      <div className="mt-4 rounded-xl bg-white/60 p-3">
       <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">Beej mantra (advanced)</p>
       <p className="mt-1 font-serif text-base text-saffron-900">{form.beejMantra}</p>
      </div>
      <p className="mt-4 text-xs text-saffron-800">Recite 108× on Day {form.day} of Navratri. Best at {form.worshipTime}.</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-amber-900">Prasad / bhog</p>
       <p className="mt-2 text-lg font-serif text-amber-900">{form.prasad}</p>
       <p className="text-xs italic text-amber-800">{form.prasadSanskrit}</p>
      </div>
      <div className="rounded-2xl border border-rose-300 bg-rose-50 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-900">Sacred flower</p>
       <p className="mt-2 text-lg font-serif text-rose-900">{form.flower}</p>
      </div>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Blessing &amp; what she grants</p>
      <p className="mt-3 text-sm leading-relaxed text-emerald-900">{form.blessing}</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Best-suited for these devotees</h2>
     <div className="mt-3 flex flex-wrap gap-2">
      {form.forDevotees.map((d) => (
       <span key={d} className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-sm text-saffron-900">{d}</span>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-rose-800">Avoid today (per tradition)</p>
      <ul className="mt-2 space-y-1 text-sm text-rose-900">
       {form.doNotDo.map((d) => <li key={d}>• {d}</li>)}
      </ul>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
     <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4">
      <Link href={`/devi/navadurga/${prev.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       ← Day {prev.day} {prev.name}
      </Link>
      <Link href="/devi/navadurga" className="text-xs uppercase tracking-wider text-saffron-700 hover:text-saffron-900">
       All 9 forms
      </Link>
      <Link href={`/devi/navadurga/${next.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       Day {next.day} {next.name} →
      </Link>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a Day-{form.day} {form.name} puja done at a temple?</p>
      <p className="mt-2 text-sm text-gray-700">
       A pandit can perform the full {form.name} sadhana for you with the right
       muhurat — color, mantra, prasad, flower offered exactly as Devi Mahatmya prescribes.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/pujas" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Book Navratri puja
       </Link>
       <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Ask a Pandit Live
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
