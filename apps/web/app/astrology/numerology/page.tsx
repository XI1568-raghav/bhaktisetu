// Free Numerology Calculator — Pythagorean life-path + Chaldean name number.
// Targets "free numerology calculator india", "lucky number by date of birth",
// "name numerology calculator chaldean", "life path number meaning".
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import NumerologyClient from './NumerologyClient';
import { listAllMeanings } from '../../../lib/numerology';
import { buttonClass } from '../../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Free Numerology Calculator — Life Path + Name Number + Lucky Day',
 description: 'Free Vedic + Pythagorean + Chaldean numerology calculator. Get your life-path number, birthday number, name number, soul-urge, and personality number with full meanings, lucky days, lucky colors, and planetary ruler. No signup.',
 alternates: { canonical: `${BASE_URL}/astrology/numerology` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Free Numerology Calculator — Life Path + Name + Lucky Day',
  description: 'Pythagorean + Chaldean numerology with full meanings, planetary ruler, lucky colors. Free, no signup.',
  url: `${BASE_URL}/astrology/numerology`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is the life-path number?',
  a: 'The life-path number is the sum of all digits of your date of birth, reduced to a single digit (1-9) or a master number (11, 22, 33). It describes the central theme of your life — the karmic direction you came here to walk. Of all numerology numbers, the life-path is the most important and unchangeable. Calculated from a 14-04-1990 DOB: 1+4+0+4+1+9+9+0 = 28 → 2+8 = 10 → 1+0 = 1.',
 },
 {
  q: 'Pythagorean vs Chaldean — which numerology system is correct?',
  a: 'Both are valid, used for different purposes. Pythagorean (A=1, B=2, … Z=8) is Western and used for life-path and birthday numbers from DOB. Chaldean is the older Babylonian system that the Vedic tradition adopted — it skips 9 (sacred) and assigns letters by sound vibration rather than alphabetic order. Chaldean is used for name numerology in India because it tracks how your name actually resonates. The two systems give different numbers but answer different questions.',
 },
 {
  q: 'What are master numbers 11, 22, 33?',
  a: 'When digit-summing your DOB you may land on 11, 22, or 33 before reducing further. Cheiro and Sepharial taught these are NOT reduced. They are higher-octave vibrations — 11 is the visionary (highest 2), 22 the master builder (highest 4), 33 the master teacher (highest 6). They carry the strengths AND the burdens of the underlying digit doubled. A master-number life path means you came with a bigger assignment.',
 },
 {
  q: 'Should I change my name to a luckier number?',
  a: 'Numerologists routinely suggest spelling-tweaks (extra letter, missing letter) to shift the name number to one harmonious with your life-path. Common pattern: life-path 1 or 9 benefits from name number 5 or 6; life-path 8 benefits from name 1 or 3. However: arbitrary changes without a competent pandit-numerologist consultation can disrupt your karma signature. Compute first, then consult — do not self-prescribe.',
 },
 {
  q: 'Which planet rules my number?',
  a: 'Vedic numerology maps each number to a graha: 1 = Sun (Surya), 2 = Moon (Chandra), 3 = Jupiter (Brihaspati), 4 = Rahu, 5 = Mercury (Budha), 6 = Venus (Shukra), 7 = Ketu, 8 = Saturn (Shani), 9 = Mars (Mangal). Your life-path number\'s ruling planet should be strong in your kundli for the number to deliver its gifts — otherwise the challenges dominate. This is why numerology + jyotisha together give the full picture.',
 },
 {
  q: 'What is the soul-urge and personality number?',
  a: 'Soul-urge (also called Heart Number) = vowels of your name reduced. It reveals what you secretly want at the deepest level. Personality number = consonants of your name reduced. It is the impression you make on others before they know you. Together with name number (all letters) these three reveal the inner-outer-projected layers of how you move through the world. Calculated using Pythagorean values per Cheiro convention.',
 },
];

export default function NumerologyPage() {
 const meanings = listAllMeanings();

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
   { '@type': 'ListItem', position: 3, name: 'Numerology', item: `${BASE_URL}/astrology/numerology` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Numerology Calculator',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Pythagorean + Chaldean numerology calculator — life-path, birthday, name, soul-urge, personality numbers with planetary ruler.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/numerology`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Numerology</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic + Western tool · no signup</p>
    <h1 className={`${H1.catalogue} mt-1`}>Free Numerology Calculator — Life Path + Name + Lucky Day</h1>
    <p className="mt-2 text-saffron-700">अंक ज्योतिष · Ank Jyotish</p>
    <p className="mt-4 text-base text-gray-700">
     Enter your date of birth + full birth name to get all 5 numerology numbers — life-path,
     birthday, name (Chaldean), soul-urge, personality — with complete meanings, planetary
     ruler, lucky days, and remedies from Vedic + Cheiro tradition.
    </p>
   </header>

   <NumerologyClient />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">All numbers 1-9 + master 11/22/33</h2>
    <p className="mt-1 text-sm text-gray-600">Reference for every number that can show up in your reading.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {meanings.map((m) => (
      <div key={m.number} className="rounded-xl border border-saffron-200 bg-saffron-50/30 p-4">
       <div className="flex items-baseline justify-between">
        <p className="font-serif text-3xl font-bold text-saffron-700">{m.number}</p>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{m.planet}</span>
       </div>
       <p className="mt-1 text-sm font-semibold text-gray-900">{m.title}</p>
       <p className="mt-1 text-xs leading-relaxed text-gray-700">{m.short}</p>
      </div>
     ))}
    </div>
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
    <h2 className="font-serif text-xl text-gray-900">Want a custom name + business numerology consult?</h2>
    <p className="mt-2 text-sm text-gray-700">
     Compatibility of life-path with name, business-name shortlist, baby-name selection,
     muhurat for signing contracts — all need a pandit-numerologist who maps the
     numbers to your specific kundli.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
      Ask a Pandit Live
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Generate Free Kundli
     </Link>
     <Link href="/astrology/kundli-milan" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Free Kundli Milan
     </Link>
    </div>
   </section>
  </main>
 );
}
