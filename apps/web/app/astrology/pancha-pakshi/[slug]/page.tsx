import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ELEMENT_COLOR, getBird, PANCHA_PAKSHI_BIRDS } from '../../../../lib/pancha-pakshi';

const BASE_URL = 'https://darshya.online';


export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params;
 const bird = getBird(slug);
 if (!bird) return { title: 'Not found' };
 return {
  title: `${bird.name} Pakshi (${bird.sanskrit}) — Tamil Pancha Pakshi Profile | Darshya`,
  description: `Full ${bird.name} profile per Pancha Pakshi Shastra. Deity ${bird.deity}, planet ${bird.planet}, lucky direction ${bird.luckyDirection}, lucky colors ${bird.luckyColor}. Strengths, weaknesses, career fits, compatible & adversarial Pakshi, daily mantra ${bird.mantraEnglish}, personal remedy.`,
  alternates: { canonical: `${BASE_URL}/astrology/pancha-pakshi/${bird.slug}` },
 };
}

export default async function PanchaPakshiBirdPage({ params }: { params: Promise<{ slug: string }> }) {
 const { slug } = await params;
 const bird = getBird(slug);
 if (!bird) return notFound();

 const idx = PANCHA_PAKSHI_BIRDS.findIndex((b) => b.slug === bird.slug);
 const prev = PANCHA_PAKSHI_BIRDS[(idx - 1 + PANCHA_PAKSHI_BIRDS.length) % PANCHA_PAKSHI_BIRDS.length]!;
 const next = PANCHA_PAKSHI_BIRDS[(idx + 1) % PANCHA_PAKSHI_BIRDS.length]!;

 const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Astrology', item: `${BASE_URL}/astrology` },
   { '@type': 'ListItem', position: 3, name: 'Pancha Pakshi', item: `${BASE_URL}/astrology/pancha-pakshi` },
   { '@type': 'ListItem', position: 4, name: bird.name, item: `${BASE_URL}/astrology/pancha-pakshi/${bird.slug}` },
  ],
 };

 const articleLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: `${bird.name} Pakshi — Pancha Pakshi Shastra Profile`,
  description: `${bird.name} (${bird.sanskrit} · ${bird.tamil}) — Tamil Siddhar tradition. Deity ${bird.deity}.`,
  url: `${BASE_URL}/astrology/pancha-pakshi/${bird.slug}`,
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
      <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link> ·{' '}
      <Link href="/astrology/pancha-pakshi" className="hover:text-saffron-700">Pancha Pakshi</Link> ·{' '}
      <span className="text-gray-900">{bird.name}</span>
     </nav>

     <header className={`mt-4 rounded-2xl border-2 p-6 ${ELEMENT_COLOR[bird.element]}`}>
      <p className="text-xs uppercase tracking-wider">Pancha Pakshi #{idx + 1} of 5</p>
      <h1 className="mt-1 font-serif text-4xl font-bold">{bird.name}</h1>
      <p className="mt-1 text-base">{bird.sanskrit} · {bird.tamil}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
       <div className="rounded-xl bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider">Element · Planet</p>
        <p className="mt-1 text-sm capitalize">{bird.element} · {bird.planet}</p>
       </div>
       <div className="rounded-xl bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider">Deity</p>
        <p className="mt-1 text-sm">{bird.deity}</p>
       </div>
       <div className="rounded-xl bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider">Lucky direction · color</p>
        <p className="mt-1 text-sm">{bird.luckyDirection} · {bird.luckyColor}</p>
       </div>
       <div className="rounded-xl bg-white/70 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider">Lucky days</p>
        <p className="mt-1 text-sm">{bird.luckyDays.join(', ')}</p>
       </div>
      </div>
     </header>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Personality essence</h2>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{bird.personality}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Strengths</p>
       <ul className="mt-3 space-y-1.5 text-sm text-emerald-900">
        {bird.strengths.map((s) => <li key={s}>• {s}</li>)}
       </ul>
      </div>
      <div className="rounded-2xl border-2 border-rose-300 bg-rose-50 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-900">Watch-outs</p>
       <ul className="mt-3 space-y-1.5 text-sm text-rose-900">
        {bird.weaknesses.map((w) => <li key={w}>• {w}</li>)}
       </ul>
      </div>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Best-fit careers</h2>
     <div className="mt-3 flex flex-wrap gap-2">
      {bird.careers.map((c) => (
       <span key={c} className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 text-sm text-saffron-900">{c}</span>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Birth nakshatras</h2>
     <p className="mt-1 text-sm text-gray-700">If you were born under any of these nakshatras, {bird.name} is your Pakshi.</p>
     <div className="mt-3 flex flex-wrap gap-2">
      {bird.birthNakshatras.map((n) => (
       <span key={n} className="rounded-full border border-saffron-300 bg-white px-3 py-1 text-sm text-saffron-900">{n}</span>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-emerald-300 bg-emerald-50/80 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Compatible Pakshi (allies)</p>
       <p className="mt-2 text-sm capitalize text-emerald-900">{bird.compatibility.join(', ')}</p>
       <p className="mt-1 text-xs italic text-emerald-800">Best for partnerships, marriage, business co-founders.</p>
      </div>
      <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-5">
       <p className="text-xs font-semibold uppercase tracking-wider text-rose-900">Adversarial Pakshi (avoid)</p>
       <p className="mt-2 text-sm capitalize text-rose-900">{bird.incompatibility.join(', ')}</p>
       <p className="mt-1 text-xs italic text-rose-800">Major joint ventures need extra muhurat care.</p>
      </div>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">Daily mantra</p>
      <p className="mt-3 font-serif text-2xl text-saffron-900">{bird.mantra}</p>
      <p className="text-sm italic text-saffron-800">{bird.mantraEnglish}</p>
      <p className="mt-3 text-xs text-saffron-800">Recite 108× on your lucky days facing {bird.luckyDirection}.</p>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Personal remedy / upay</h2>
     <p className="mt-3 rounded-xl border border-saffron-200 bg-white p-5 text-sm leading-relaxed text-gray-700">{bird.remedy}</p>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
     <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4">
      <Link href={`/astrology/pancha-pakshi/${prev.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       ← {prev.name}
      </Link>
      <Link href="/astrology/pancha-pakshi" className="text-xs uppercase tracking-wider text-saffron-700 hover:text-saffron-900">
       All 5 Pakshi
      </Link>
      <Link href={`/astrology/pancha-pakshi/${next.slug}`} className="text-sm font-semibold text-saffron-700 hover:text-saffron-900">
       {next.name} →
      </Link>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a {bird.name}-specific muhurat for a major event?</p>
      <p className="mt-2 text-sm text-gray-700">
       A Tamil Jyotisha pandit gives you the exact ruling-window for your date —
       so {bird.name} energy is at peak when you act.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/astrology" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        ← All astrology tools
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
