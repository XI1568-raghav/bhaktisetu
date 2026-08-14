// Free Vimshottari Mahadasha Calculator — 120-yr planetary period
// timeline from janma nakshatra. Targets "vimshottari dasha calculator",
// "current mahadasha", "dasha period calculator free".
import type { Metadata } from 'next';
import Link from 'next/link';
import DashaClient from './DashaClient';
import { TIMEZONE_OPTIONS } from '../../../lib/nakshatra-finder';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Vimshottari Dasha Calculator — Free 120-Year Mahadasha Timeline',
 description: 'Free Vedic Vimshottari dasha calculator. Enter DOB + birth time to get your current mahadasha, antardasha sub-period, and complete 120-year planetary timeline (Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury). Per Brihat Parashara Hora Shastra.',
 alternates: { canonical: `${BASE_URL}/astrology/dasha` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Vimshottari Dasha Calculator — Free 120-Year Mahadasha Timeline',
  description: 'Current mahadasha + antardasha + full 120-yr timeline. Computed from your janma nakshatra. Free, no signup.',
  url: `${BASE_URL}/astrology/dasha`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Vimshottari Dasha?',
  a: 'Vimshottari (विंशोत्तरी, literally "120") is the most widely used dasha system in Vedic astrology, described in Brihat Parashara Hora Shastra. It divides a 120-year human lifespan into 9 planetary mahadashas (major periods), each ruled by one of the navagrahas: Ketu (7y), Venus (20y), Sun (6y), Moon (10y), Mars (7y), Rahu (18y), Jupiter (16y), Saturn (19y), Mercury (17y) — total 120 years. Each mahadasha colors that span of your life with the themes + karma of its ruling planet.',
 },
 {
  q: 'How is my current mahadasha computed?',
  a: 'Your starting mahadasha lord is the lord of your janma nakshatra (birth star) — e.g., Ashwini-born begin with Ketu, Bharani-born with Venus, Krittika-born with Sun. The amount of time already spent in the nakshatra at the moment of birth determines how much of that first mahadasha was already "used up" — the remainder is your "balance at birth" (Janma Sesha Dasha). After it ends, the next 8 dashas follow in fixed Vimshottari sequence. This tool computes all 9 chronological mahadashas from your DOB.',
 },
 {
  q: 'What is an antardasha and bhukti?',
  a: 'Each mahadasha is subdivided into 9 antardashas (also called bhukti) — sub-periods ruled by each of the 9 planets in turn, starting with the mahadasha lord itself. The duration of each antardasha is proportional: (mahadasha years × antardasha lord\'s years) ÷ 120. For example, in a 20-year Venus mahadasha, the Venus-Venus antardasha runs (20×20)÷120 ≈ 3.33 years, while Venus-Sun runs (20×6)÷120 = 1 year. Antardashas refine what theme is active right now within the larger mahadasha. Even finer subdivisions exist — pratyantardasha, sookshma, prana — but most practical work stops at antardasha.',
 },
 {
  q: 'What does the current mahadasha mean for me?',
  a: 'A planet\'s mahadasha activates that planet\'s karma in your life — both its natural significations (Venus = relationships/luxury; Saturn = discipline/delay; Jupiter = wisdom/growth; Rahu = ambition/unconventional gains) AND its placement in your kundli (which house and sign it occupies, what it aspects, what conjuncts it). A "good" planet in your chart gives wonderful results in its dasha; an "afflicted" planet brings karmic challenges. Tools tell you WHICH dasha you\'re in; a pandit reading your full kundli tells you what it MEANS for you specifically.',
 },
 {
  q: 'Why does the timeline show specific dates?',
  a: 'Vimshottari is calendar-deterministic — once you know the janma nakshatra position, every future mahadasha date is fixed. Saturn\'s mahadasha starting on a specific year + month + day is mathematics, not prediction. We display end-dates rounded to the day; for ceremonial muhurat (timing a wedding/launch within a dasha transition window), a pandit\'s Drik panchang gives the precise time-of-day, which can matter if a transition lands within hours of an important event.',
 },
 {
  q: 'How accurate is this vs a pandit\'s computation?',
  a: 'The 120-year sequence + per-planet durations are universally fixed — every astrologer computes them identically. The only variable is the moon\'s exact position at birth (janma nakshatra + how far into it). We compute moon longitude to ±0.3° via Meeus algorithm — well within the precision needed for nakshatra + dasha lord. Dates of mahadasha transitions are accurate to within ~1-2 days. For pandit-grade Drik panchang precision (matters if your birth time was logged inexactly + a transition falls at a critical juncture), get a manual verification.',
 },
];

export default function DashaPage() {
 const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({
   '@type': 'Question',
   name: f.q,
   acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
 };

 const breadcrumb = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
   { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
   { '@type': 'ListItem', position: 2, name: 'Astrology', item: `${BASE_URL}/astrology` },
   { '@type': 'ListItem', position: 3, name: 'Vimshottari Dasha Calculator', item: `${BASE_URL}/astrology/dasha` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Vimshottari Dasha Calculator',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic mahadasha calculator. Janma nakshatra → 120-yr Vimshottari timeline + current mahadasha + antardasha.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/dasha`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Dasha Calculator</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool · no signup</p>
    <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Vimshottari Dasha Calculator — Free 120-Year Mahadasha Timeline</h1>
    <p className="mt-2 text-saffron-700">विंशोत्तरी महादशा · Vimshottari Mahadasha</p>
    <p className="mt-4 text-base text-gray-700">
     Enter your DOB + birth time + timezone to compute your janma nakshatra-derived dasha sequence:
     current mahadasha, active antardasha sub-period, and the full 120-year Vimshottari timeline
     per Brihat Parashara Hora Shastra.
    </p>
   </header>

   <DashaClient options={TIMEZONE_OPTIONS} />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">9 Vimshottari mahadashas at a glance</h2>
    <p className="mt-1 text-sm text-gray-600">Standard 120-yr cycle — every chart cycles through all 9 in fixed order.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {[
      { lord: 'Ketu', yrs: 7, hindi: 'केतु', theme: 'Detachment, moksha, intuition, sudden upheavals' },
      { lord: 'Venus', yrs: 20, hindi: 'शुक्र', theme: 'Love, marriage, luxury, art, comforts' },
      { lord: 'Sun', yrs: 6, hindi: 'सूर्य', theme: 'Authority, recognition, father, leadership' },
      { lord: 'Moon', yrs: 10, hindi: 'चंद्र', theme: 'Mother, emotions, public life, popularity' },
      { lord: 'Mars', yrs: 7, hindi: 'मंगल', theme: 'Energy, courage, property, conflicts' },
      { lord: 'Rahu', yrs: 18, hindi: 'राहु', theme: 'Foreign, technology, ambition, unconventional gains' },
      { lord: 'Jupiter', yrs: 16, hindi: 'गुरु', theme: 'Wisdom, children, dharma, wealth via knowledge' },
      { lord: 'Saturn', yrs: 19, hindi: 'शनि', theme: 'Discipline, hard work, karma resolution, longevity' },
      { lord: 'Mercury', yrs: 17, hindi: 'बुध', theme: 'Communication, business, learning, networking' },
     ].map((p) => (
      <div key={p.lord} className="rounded-xl border border-saffron-200 bg-saffron-50/30 p-4">
       <div className="flex items-baseline justify-between">
        <p className="font-serif text-base font-semibold text-gray-900">{p.lord}</p>
        <span className="text-xs font-semibold text-gray-500">{p.yrs} yrs</span>
       </div>
       <p className="text-xs text-saffron-700">{p.hindi}</p>
       <p className="mt-1 text-xs text-gray-700">{p.theme}</p>
      </div>
     ))}
    </div>
    <p className="mt-3 text-xs text-gray-500">Total = 120 years (one full Vimshottari cycle).</p>
   </section>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">Frequently asked questions</h2>
    <div className="mt-4 space-y-3">
     {FAQS.map((f, i) => (
      <details key={i} className="rounded-xl border border-gray-200 bg-white p-4 open:shadow-sm">
       <summary className="cursor-pointer font-semibold text-gray-900">{f.q}</summary>
       <p className="mt-3 text-sm leading-relaxed text-gray-700">{f.a}</p>
      </details>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
    <h2 className="font-serif text-xl text-gray-900">Pair your dasha with the rest of your Vedic stack</h2>
    <p className="mt-2 text-sm text-gray-700">
     Knowing the timeline is step one — interpretation in light of your full kundli + remedies is
     the pandit&rsquo;s craft. Use our free tools, then book a consultation.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/nakshatra-finder" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Find My Nakshatra
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Full Free Kundli
     </Link>
     <Link href="/astrology/horoscope" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Daily Horoscope
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Ask a Pandit Live
     </Link>
    </div>
   </section>
  </main>
 );
}
