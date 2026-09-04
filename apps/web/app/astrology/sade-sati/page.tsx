// Free Sade Sati (Shani Sade Sati) + Dhaiya calculator. Saturn longitude
// via simplified Meeus VSOP87 (~1°), enough for 30°-wide rashi detection +
// 2.5-yr phase windows. Targets "am i in sade sati", "sade sati calculator
// free", "shani sade sati check", "saturn transit kundli".
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import SadeSatiClient from './SadeSatiClient';
import { TIMEZONE_OPTIONS } from '../../../lib/nakshatra-finder';
import { buttonClass } from '../../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Sade Sati Calculator — Am I in Sade Sati? Free Saturn Transit Check',
 description: 'Free Vedic Sade Sati calculator. Enter DOB + birth time to check if you are in Shani Sade Sati (Saturn in 12th/1st/2nd from natal Moon, 7.5 yrs) or Dhaiya (Kantaka Shani 4th/8th, 2.5 yrs). Full lifetime phase timeline + Shani Shanti remedies. Per Brihat Parashara.',
 alternates: { canonical: `${BASE_URL}/astrology/sade-sati` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Sade Sati Calculator — Am I in Sade Sati? Free Check',
  description: 'Free chandra-lagna Saturn transit check. Phase, start+end dates, full lifetime timeline + Shani Shanti remedies. No signup.',
  url: `${BASE_URL}/astrology/sade-sati`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Sade Sati (Shani Sade Sati)?',
  a: 'Sade Sati (साढ़े साती — "seven and a half") is the 7.5-year transit of Saturn (Shani) through three consecutive rashis — the 12th, 1st, and 2nd — counted from your natal Moon (janma rashi). Saturn moves through each rashi in roughly 2.5 years, so the full sade sati lasts ~7.5 years (≈2737 days). Vedic tradition considers it the most demanding karmic period in a person\'s life because Saturn directly transits the emotional core (the Moon), forcing recalibration of identity, livelihood, health, family, and worldview. It typically occurs 2-3 times in a 90-year lifespan.',
 },
 {
  q: 'Why is sade sati exactly 7.5 years?',
  a: 'Saturn takes ~29.46 years to complete one full revolution of the zodiac. Dividing 29.46 by 12 rashis gives ~2.456 years per rashi, traditionally rounded to 2.5 years. Sade sati covers Saturn\'s transit through 3 rashis (12th, 1st, 2nd from Moon) = 3 × 2.5 = 7.5 years. The actual duration varies slightly per cycle (sometimes 7.3, sometimes 7.7 years) because Saturn\'s speed isn\'t uniform — it slows during retrograde phases. Our calculator computes the exact start + end dates per cycle using simplified VSOP87 longitude.',
 },
 {
  q: 'What is the difference between the 3 phases — rising, peak, setting?',
  a: 'Phase 1 — Rising / Pratyamsa (Saturn in 12th from Moon): the "warm-up" phase. Felt as financial pressure, sleep disruption, expenditure, and gradual distancing from familiar comforts. Use this phase to clear debts + simplify. Phase 2 — Peak / Janma Shani (Saturn in your natal Moon rashi): the central, most intense 2.5 years. Major life recalibration — career, health, family, emotional weight. Tradition calls this the highest-discipline window. Phase 3 — Setting / Uttarardha (Saturn in 2nd from Moon): focus on wealth, speech, and family. Income may be tested but Saturn rewards disciplined re-structuring. The end is in sight.',
 },
 {
  q: 'What is Dhaiya / Kantaka Shani? How is it different from sade sati?',
  a: 'Dhaiya means "two and a half" — it refers to Saturn\'s 2.5-year transit through the 4th OR 8th house from your natal Moon (separate from the sade sati 7.5-year block). The 4th-from-Moon transit is called Kantaka Shani ("the thorn"), traditionally associated with friction in home, mother\'s wellbeing, real-estate, and inner peace. The 8th-from-Moon transit is called Ardha-Kantaka ("half thorn"), associated with health vigilance, longevity, in-laws, and sudden change. Dhaiya is lighter than full sade sati but still consequential — you\'ll typically experience 2 dhaiya periods + 1-2 sade sati cycles in a 60-year span. This calculator surfaces all of them in your lifetime timeline.',
 },
 {
  q: 'What are the standard sade sati remedies (Shani Shanti)?',
  a: 'Traditional Shani Shanti remedies: (1) recite Hanuman Chalisa daily — Hanuman is the classical protection against Saturn affliction; (2) light a mustard-oil (sarson tel) diya before Hanuman on Saturdays; (3) chant the Shani Beej Mantra "Om Praam Preem Praum Sah Shanaye Namah" 108 times; (4) donate black sesame (til), black urad dal, black cloth, or iron on Saturdays; (5) visit a Shani temple — Shani Shingnapur (Maharashtra) is the most famous; (6) recite the Dasaratha Shani Stotra or Shani Chalisa on Saturdays; (7) feed crows + cows + the poor on Saturdays (Shani Daan); (8) honor elders, mentors, and laborers. Do NOT wear blue sapphire (neelam) without a pandit consult — wrong gemstone amplifies Shani trouble.',
 },
 {
  q: 'How accurate is this sade sati calculator?',
  a: 'Saturn\'s longitude is computed via a simplified Meeus VSOP87 model giving ~1° accuracy. Since each rashi is 30° wide, ~1° precision is more than sufficient to determine which rashi Saturn occupies — the rashi boundary is what matters for sade sati, not the exact degree. Sidereal conversion uses the Lahiri ayanamsa (the official ayanamsa adopted by the Government of India Calendar Reform Committee, 1955). Phase transition dates are accurate to within ~1 day. For ritual-grade precision (exact muhurat at the moment of rashi change) consult a pandit with full panchang software — but for the 2.5-yr / 7.5-yr planning horizon this tool provides, ~1-day accuracy is the right tool for the job.',
 },
];

export default function SadeSatiPage() {
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
   { '@type': 'ListItem', position: 3, name: 'Sade Sati Calculator', item: `${BASE_URL}/astrology/sade-sati` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Sade Sati Calculator',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic Sade Sati + Dhaiya calculator. Saturn transit check against natal Moon, full lifetime phase timeline, Shani Shanti remedies.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/sade-sati`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Sade Sati Calculator</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool · no signup</p>
    <h1 className={`${H1.catalogue} mt-1`}>Sade Sati Calculator — Am I in Sade Sati?</h1>
    <p className="mt-2 text-saffron-700">साढ़े साती · Sade Sati / Shani Sade Sati</p>
    <p className="mt-4 text-base text-gray-700">
     Enter your DOB + birth time + timezone to check whether Saturn is currently transiting the 12th,
     1st, or 2nd rashi from your natal Moon (7.5-year Sade Sati) or the 4th / 8th (2.5-year Dhaiya).
     We compute Saturn’s longitude via simplified Meeus VSOP87, classify the phase per Brihat
     Parashara Hora Shastra, and surface every sade-sati + dhaiya window across your 90-year lifetime
     with traditional Shani Shanti remedies.
    </p>
   </header>

   <SadeSatiClient options={TIMEZONE_OPTIONS} />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 5 Saturn-from-Moon phase types</h2>
    <p className="mt-1 text-sm text-gray-600">Every other transit (Saturn in 3rd, 5th, 6th, 7th, 9th, 10th, 11th from Moon) is considered “normal” — no sade sati or dhaiya activation.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {[
      { house: '12th', name: 'Sade Sati — Phase 1', sub: 'Rising / Pratyamsa', tone: 'amber', note: 'Warm-up: expenditure, sleep, simplification' },
      { house: '1st', name: 'Sade Sati — Phase 2', sub: 'Peak / Janma Shani', tone: 'red', note: 'Most intense: career + identity + emotional recalibration' },
      { house: '2nd', name: 'Sade Sati — Phase 3', sub: 'Setting / Uttarardha', tone: 'amber', note: 'Wealth + speech + family restructuring' },
      { house: '4th', name: 'Kantaka Shani', sub: 'Dhaiya (the thorn)', tone: 'purple', note: 'Home + mother + property + inner peace' },
      { house: '8th', name: 'Ardha-Kantaka', sub: 'Dhaiya (half thorn)', tone: 'purple', note: 'Health + longevity + in-laws + sudden change' },
     ].map((p) => {
      const cls =
       p.tone === 'red'    ? { border: 'border-red-300',    bg: 'bg-red-50/50',    pill: 'bg-red-200 text-red-900' } :
       p.tone === 'amber'  ? { border: 'border-amber-300',  bg: 'bg-amber-50/40',  pill: 'bg-amber-200 text-amber-900' } :
                              { border: 'border-purple-300', bg: 'bg-purple-50/40', pill: 'bg-purple-200 text-purple-900' };
      return (
       <div key={p.house} className={`rounded-xl border p-4 ${cls.border} ${cls.bg}`}>
        <div className="flex items-baseline justify-between gap-2">
         <p className="font-serif text-base font-semibold text-gray-900">{p.name}</p>
         <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${cls.pill}`}>{p.house} from Moon</span>
        </div>
        <p className="mt-1 text-xs font-medium text-gray-600">{p.sub}</p>
        <p className="mt-2 text-xs text-gray-700">{p.note}</p>
       </div>
      );
     })}
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
    <h2 className="font-serif text-xl text-gray-900">Pair with the rest of your Vedic stack</h2>
    <p className="mt-2 text-sm text-gray-700">
     Sade sati intensity depends on your full kundli, current dasha, and Saturn’s strength.
     Cross-check with these tools or talk to a pandit for a personalized Shani Shanti plan.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/dasha" className={buttonClass('primary', 'md')}>
      Check My Vimshottari Dasha
     </Link>
     <Link href="/pujas/maha-mrityunjaya" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Book Shani Shanti / Mrityunjaya Puja
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Full Free Kundli
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Ask a Pandit Live
     </Link>
    </div>
   </section>
  </main>
 );
}
