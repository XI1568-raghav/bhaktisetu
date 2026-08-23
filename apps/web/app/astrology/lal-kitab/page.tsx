import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import LalKitabClient from './LalKitabClient';
import { GRAHAS, PROBLEMS } from '../../../lib/lal-kitab';
import { buttonClass } from '../../../components/ui/button-recipe';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: 'Lal Kitab Upay & Farman Finder — Free 108 Graha-House Remedies',
 description:
 'Free Lal Kitab calculator per Pt. Roop Chand Joshi (1939-52). Pick your life problem (career, marriage, money, health, court case + 8 more) → identify the troubling graha → get 3 universal Farman + house-by-house remedy. All 108 graha-in-house combinations (9 grahas × 12 houses) with household upay — water Arghya, jaggery + chana, mustard oil to Shani, feeding crows + black dog, silver in wallet, sindoor on Tuesday, peepal water Thursday. Zero gemstone cost. Pure traditional Lal Kitab.',
 alternates: { canonical: `${BASE_URL}/astrology/lal-kitab` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  type: 'website',
  url: `${BASE_URL}/astrology/lal-kitab`,
  title: 'Lal Kitab Upay Finder — Free 108 Graha-House Farman',
  description: 'Pick your life problem → get 3 universal Farman + house-by-house Lal Kitab remedies. Zero-cost household upay per Pt. Roop Chand Joshi.',
 },
};

const FAQS: Array<{ q: string; a: string }> = [
 {
  q: 'What is Lal Kitab and how is it different from regular Vedic astrology?',
  a: 'Lal Kitab is a 1939-1952 set of 5 Urdu+Hindi texts by Pt. Roop Chand Joshi from Punjab. It uses a fixed-house (Lagna-as-Aries) variant of Vedic astrology, focuses on practical remedy (Farman) for grahas troubling specific life areas, and is famous for prescribing zero-cost household items — water, jaggery, mustard oil, copper, silver, feeding crows or black dog — instead of expensive gemstones or yantras. Most Lal Kitab Farman cost under ₹100.',
 },
 {
  q: 'How does this calculator work?',
  a: 'Two modes. (1) Pick your life problem → the tool maps it to the 2-4 grahas most-traditionally responsible per Lal Kitab + shows 3 universal Farman per graha + house-specific remedy if that graha sits in a troubling house in your chart. (2) Pick the graha directly → see what it does in each of the 12 houses and its specific Farman. Use mode 1 if you know your problem, mode 2 if you already know which graha is afflicted from your kundli.',
 },
 {
  q: 'Do Lal Kitab remedies actually work without expensive gemstones?',
  a: 'Yes — Lal Kitab tradition explicitly says household substitutes work. A silver square in your wallet substitutes pearl, a copper kada substitutes ruby. The 3 most-cited Farman across all grahas — flow barley/coal in running water (Rahu), feed black dog (Shani), donate gud-chana on Thursday (Guru) — total under ₹200. The discipline (40 consecutive days) matters more than the cost.',
 },
 {
  q: 'How long do I need to perform a Farman before seeing change?',
  a: 'Lal Kitab tradition prescribes 40 consecutive days minimum for any Farman to show visible effect (one full graha cycle). For chronic dosha (Sade Sati / Kaal Sarp / Manglik), 90-day cycles are common. Stop only after the result manifests; many devotees continue ancestor + Shani Farman lifelong as protective practice.',
 },
 {
  q: 'Which graha is most commonly responsible for career trouble?',
  a: 'Per Lal Kitab, career trouble (kerma-bhava issues) is most often Shani (slow career, blocked promotion, harsh boss) or Surya (no govt favour, weak authority figure) or Rahu (sudden image trouble, scandal). Run Shani Farman first — mustard oil to Shani Saturday + feed black dog + donate iron — for 40 days; if no change, add Surya Arghya at sunrise + donate wheat Sunday for another 40 days.',
 },
 {
  q: 'My marriage is delayed — which Lal Kitab graha + Farman applies?',
  a: 'Marriage delay = Guru (groom karaka for women, wisdom karaka), Shukra (bride karaka for men, marriage karaka), Mangal (manglik dosha — Mars in 1/4/7/8/12), or Rahu (sudden / inter-caste / foreign marriage). Standard Farman: offer yellow chana + gud at Vishnu temple Thursday (Guru), offer kheer to Lakshmi Friday (Shukra), recite Hanuman Chalisa Tuesday (Mangal). 40 days each.',
 },
 {
  q: 'Can I do Lal Kitab Farman myself or do I need a pandit?',
  a: 'Universal Farman (household water Arghya, donating chana, feeding crows) — yes, do it yourself daily. House-specific Farman that require gemstone, fire-ritual (havan), or pind-daan should be done under a qualified Lal Kitab pandit — same as any Vedic karma. If a Farman feels heavy (sell silver, give away gold, take child to ashram), confirm with a pandit first.',
 },
 {
  q: 'Which days are forbidden for new Lal Kitab Farman?',
  a: 'Avoid starting new Farman on Amavasya (no-moon), Sankashti Chaturthi for Ganesh-related ones, eclipse days (Surya/Chandra grahan), and during your own birth-tithi if afflicted. Best start days per graha: Sunday (Surya), Monday (Chandra), Tuesday (Mangal/Ketu), Wednesday (Budh), Thursday (Guru), Friday (Shukra), Saturday (Shani/Rahu). Sunrise after bath = best moment.',
 },
];

const FAQ_LD = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 mainEntity: FAQS.map((f) => ({
  '@type': 'Question',
  name: f.q,
  acceptedAnswer: { '@type': 'Answer', text: f.a },
 })),
};

const BREADCRUMB_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home',      item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Astrology', item: `${BASE_URL}/astrology` },
  { '@type': 'ListItem', position: 3, name: 'Lal Kitab', item: `${BASE_URL}/astrology/lal-kitab` },
 ],
};

const APP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Lal Kitab Upay Finder',
 url: `${BASE_URL}/astrology/lal-kitab`,
 applicationCategory: 'LifestyleApplication',
 operatingSystem: 'Web',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 description: 'Free Lal Kitab calculator: pick life problem → get troubling grahas + 3 Farman each + house-by-house remedy. All 108 graha-in-house combinations covered.',
};

export default function LalKitabPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_LD) }} />

   <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
    <nav className="text-xs text-gray-500">
     <Link href="/" className="hover:text-saffron-700">Home</Link>
     {' / '}
     <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link>
     {' / '}
     <span className="text-gray-700">Lal Kitab Upay</span>
    </nav>

    <div className="mt-4">
     <p className="text-xs uppercase tracking-wider text-saffron-700">Lal Kitab · लाल किताब · Pt. Roop Chand Joshi 1939-1952</p>
     <h1 className={`${H1.catalogue} mt-1`}>
      Lal Kitab Upay &amp; Farman Finder
     </h1>
     <p className="mt-2 max-w-3xl text-sm text-gray-700">
      Pick your life problem → identify the troubling graha → get 3 universal Farman + house-by-house remedy.
      All 108 graha-in-house combinations covered with traditional household upay — water, jaggery, mustard oil,
      copper, silver, feeding crows + black dog. Zero gemstone cost. Run for 40 consecutive days for visible change.
     </p>
    </div>

    <div className="mt-8">
     <LalKitabClient />
    </div>

    <section className="mt-12">
     <h2 className="font-serif text-2xl text-gray-900">9 Grahas at a glance</h2>
     <p className="text-sm text-gray-700">Lal Kitab works with 9 grahas — 7 traditional + 2 chhaya (shadow) grahas Rahu &amp; Ketu.</p>
     <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {GRAHAS.map((g) => (
       <div key={g.code} className="rounded-xl border border-saffron-200 bg-white p-3 text-xs">
        <p className="font-serif text-sm font-semibold text-gray-900">{g.name} ({g.sanskrit})</p>
        <p className="text-gray-600">{g.western} · {g.nature} · {g.element}</p>
        <p className="mt-1 text-gray-700">{g.day} · {g.metal} · {g.gemstone}</p>
       </div>
      ))}
     </div>
    </section>

    <section className="mt-10">
     <h2 className="font-serif text-2xl text-gray-900">12 Life problems mapped to grahas</h2>
     <div className="mt-4 grid gap-2 sm:grid-cols-2">
      {PROBLEMS.map((p) => (
       <div key={p.value} className="rounded-xl border border-saffron-200 bg-white p-3 text-xs">
        <p className="font-serif text-sm font-semibold text-gray-900">{p.label} <span className="text-saffron-700">({p.sanskrit})</span></p>
        <p className="mt-1 text-gray-700">{p.description}</p>
        <p className="mt-1 text-saffron-800"><span className="font-semibold">Grahas:</span> {p.grahas.join(' · ')}</p>
       </div>
      ))}
     </div>
    </section>

    <section className="mt-12">
     <h2 className="font-serif text-2xl text-gray-900">Lal Kitab Farman discipline</h2>
     <div className="mt-3 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 text-sm">
       <p className="font-semibold text-emerald-900">40-day minimum</p>
       <p className="mt-1 text-emerald-800">Visible change requires one full cycle. Break the chain = restart counter.</p>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 text-sm">
       <p className="font-semibold text-amber-900">Right weekday</p>
       <p className="mt-1 text-amber-800">Match Farman to graha&apos;s vaar — Saturn Saturday, Mars Tuesday, Jupiter Thursday.</p>
      </div>
      <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 text-sm">
       <p className="font-semibold text-indigo-900">Sunrise + bath</p>
       <p className="mt-1 text-indigo-800">Best moment for any Farman is post-bath at brahma muhurta or sunrise.</p>
      </div>
     </div>
    </section>

    <section className="mt-12">
     <h2 className="font-serif text-2xl text-gray-900">FAQ</h2>
     <div className="mt-4 space-y-3">
      {FAQS.map((f, i) => (
       <details key={i} className="group rounded-xl border border-saffron-200 bg-white p-4 open:bg-saffron-50/40">
        <summary className="cursor-pointer font-serif text-base font-semibold text-gray-900">{f.q}</summary>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{f.a}</p>
       </details>
      ))}
     </div>
    </section>

    <section className="mt-12 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
     <p className="font-serif text-lg text-gray-900">Want a Lal Kitab pandit to read your custom chart?</p>
     <p className="mt-2 text-sm text-gray-700">Free Farman lookup gives you the household remedy. A Lal Kitab pandit reads your exact chart, identifies hidden dosha, and prescribes a 40 / 90 / lifetime karma plan.</p>
     <div className="mt-4 flex flex-wrap justify-center gap-3">
      <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>Ask a Lal Kitab Pandit</Link>
      <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">Free Kundli</Link>
      <Link href="/astrology/dasha" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">Vimshottari Dasha</Link>
      <Link href="/astrology/sade-sati" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">Sade Sati Check</Link>
     </div>
    </section>
   </section>
  </>
 );
}
