import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import ShubhMuhuratClient from './ShubhMuhuratClient';
import { ClientOnly } from '../../../components/ClientOnly';
import { EVENT_OPTIONS } from '../../../lib/shubh-muhurat';
import { buttonClass } from '../../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Shubh Muhurat Finder — Free Auspicious Time Calculator (Marriage, Griha Pravesh, Vehicle)',
 description:
  'Free Shubh Muhurat finder. Best auspicious time today for marriage, griha pravesh, vehicle purchase, naming, business start, signing, travel, surgery. Composite scoring: Choghadiya + Hora + Rahu Kalam avoidance. Ranked windows 0-100.',
 alternates: { canonical: `${BASE_URL}/astrology/shubh-muhurat` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Shubh Muhurat Finder — Free Auspicious Time Calculator',
  description: 'Ranked auspicious windows for 12 life events. Composite Choghadiya + Hora + Rahu Kalam scoring.',
  url: `${BASE_URL}/astrology/shubh-muhurat`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Shubh Muhurat in Vedic astrology?',
  a: 'Shubh Muhurat (शुभ मुहूर्त) is an auspicious window of time chosen for starting an important activity — marriage, house warming (griha pravesh), buying a vehicle, naming ceremony, business launch, signing a contract, travel, or elective surgery. The Vedic principle is that the same action performed in a favourable cosmic window yields lasting positive effect, while the same action performed during an inauspicious window invites obstacles. Traditional muhurat is computed by combining several panchang angas (limbs of the calendar) — Tithi, Nakshatra, Vara (weekday), Yoga, Karana — plus daily windows like Choghadiya, Hora, and avoidance of Rahu Kalam.',
 },
 {
  q: 'How does the scoring work?',
  a: 'Each ~60-minute slot of the day is scored 0-100 by overlaying three already-shipped Vedic calculators: (1) Choghadiya — the slot midpoint is mapped to one of the 8 day or 8 night periods and scored by kind (Amrit +30, Shubh +25, Labh +20, Char +15, Udveg -20, Rog -25, Kaal -30); (2) Hora — the planet ruling the hora is checked against the event\'s ideal planets (full +40 for primary, +32 for secondary, +24 for tertiary; or +10 generic auspicious); (3) Rahu/Yamaganda/Gulika overlap — any overlap subtracts 50. A daytime bonus (+10) and baseline (+50) are added, then clamped 0-100. Top 6 windows are surfaced; ≥80 = excellent, ≥65 = good, ≥45 = fair, below = avoid.',
 },
 {
  q: 'Why combine three tools instead of just one?',
  a: 'Each anga catches different cosmic factors. Choghadiya is a coarse 8-period quality classifier for the daylight + night half. Hora is a planet-of-the-hour signal — Jupiter hora is ideal for marriage, Mercury for trade, Mars for surgery. Rahu Kalam / Yamaganda / Gulika are three universally-avoided daily windows regardless of any other factor. A slot that is "Amrit Choghadiya + Jupiter hora + outside Rahu Kalam" is multiply auspicious — far stronger than any single signal. Pandits traditionally check all of these (and more) before fixing a muhurat.',
 },
 {
  q: 'What is the ideal muhurat for marriage?',
  a: 'For marriage (विवाह), the strongest signals are: (a) Jupiter, Venus, or Moon ruling the hora — these are the karaka planets for vivah-yoga; (b) Amrit, Shubh, or Labh Choghadiya; (c) no overlap with Rahu Kalam, Yamaganda, or Gulika; (d) ideally daytime (visibility + tradition). Traditional classical muhurat also requires checking Tithi (avoid Amavasya, Chaturdashi, Bhadra), Nakshatra (Rohini, Mrigashira, Magha, Uttara Phalguni, Hasta, Swati, Anuradha, Mula, Uttara Ashadha, Uttara Bhadrapada, Revati are vivah-yogya), and Yoga (avoid Vyatipata, Vaidhriti) — for a final wedding date a pandit should reconcile this tool\'s output with these deeper checks.',
 },
 {
  q: 'Can I override Rahu Kalam if everything else is excellent?',
  a: 'Classical texts are emphatic: Rahu Kalam, Yamaganda, and Gulika Kalam should be avoided for any new auspicious beginning. Even if the Choghadiya is Amrit and the Hora is Jupiter, an overlap with Rahu Kalam should disqualify the window — this calculator applies a -50 penalty for exactly this reason. For routine activities (continuing work already in progress, daily prayers, eating meals) the avoidance is less strict. For one-time life events (marriage, griha pravesh, vehicle purchase, surgery) the avoidance is absolute.',
 },
 {
  q: 'How accurate is this calculator?',
  a: 'Sunrise/sunset are computed via the NOAA solar position algorithm (±1 min). Choghadiya, Hora, and Rahu Kalam derive from sunrise+sunset using classical period divisions (8 day periods, 12 day horas, 1/8 daylight for Rahu Kalam). Hora planet assignment follows Chaldean order from the day-lord. All three are deterministic given correct sunrise. For ceremonial-grade muhurat (a wedding date, a major launch) verify with a pandit running full Drik panchang ephemeris (Swiss Ephemeris) and checking Tithi/Nakshatra/Yoga/Karana on top.',
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

const BREAD_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Astrology', item: `${BASE_URL}/astrology` },
  { '@type': 'ListItem', position: 3, name: 'Shubh Muhurat', item: `${BASE_URL}/astrology/shubh-muhurat` },
 ],
};

const APP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Shubh Muhurat Finder — Darshya',
 url: `${BASE_URL}/astrology/shubh-muhurat`,
 applicationCategory: 'LifestyleApplication',
 operatingSystem: 'Any',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 description: 'Free online auspicious-time finder. Composite scoring across Choghadiya + Hora + Rahu Kalam for 12 life events.',
};

export default function ShubhMuhuratPage() {
 return (
  <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREAD_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_LD) }} />

   <nav className="text-xs text-gray-500">
    <Link href="/" className="hover:text-saffron-700">Home</Link>
    {' · '}
    <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link>
    {' · '}
    <span className="text-gray-700">Shubh Muhurat</span>
   </nav>

   <header className="mt-4 text-center">
    <p className="text-xs uppercase tracking-widest text-saffron-600">शुभ मुहूर्त · Shubh Muhurat Finder</p>
    <h1 className={`${H1.catalogue} mt-1`}>Shubh Muhurat Calculator — Best Auspicious Time</h1>
    <p className="mx-auto mt-3 max-w-2xl prose-body text-gray-700">
     Pick your date + city + life event. We score every ~60-min window of the day by overlaying
     Choghadiya kind + Hora planet + Rahu/Yamaganda/Gulika avoidance — and rank the top 6 muhurats.
    </p>
   </header>

   <div className="mt-8">
    <ClientOnly fallback={<div className="min-h-[24rem]" aria-busy="true" />}><ShubhMuhuratClient /></ClientOnly>
   </div>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">12 supported life events</h2>
    <p className="mt-2 text-sm text-gray-700">
     Each event has its own karaka planets + preferred Choghadiya kinds based on classical muhurat shastra.
    </p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {EVENT_OPTIONS.map((e) => (
      <div key={e.value} className="rounded-xl border-2 border-saffron-200 bg-saffron-50/40 p-4">
       <p className="font-serif text-base font-semibold text-gray-900">{e.label}</p>
       <p className="text-xs text-saffron-700">{e.sanskrit}</p>
       <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Ideal planets</p>
       <p className="text-xs text-gray-800">{e.idealPlanets.join(' · ')}</p>
       <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Ideal Choghadiya</p>
       <p className="text-xs text-gray-800">{e.idealChogh.join(' · ')}</p>
      </div>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-amber-300 bg-amber-50/60 p-6">
    <h2 className="font-serif text-xl text-gray-900">How the composite score works</h2>
    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">
     <li><strong>Choghadiya kind</strong> — Amrit/Shubh/Labh add to the score; Udveg/Rog/Kaal subtract.</li>
     <li><strong>Hora planet match</strong> — if the ruling planet of that hour is your event\'s primary karaka (e.g. Jupiter for marriage, Mercury for business), big positive. Mismatched but auspicious planets still add some. Inauspicious planet rulers subtract.</li>
     <li><strong>Rahu / Yamaganda / Gulika overlap</strong> — any overlap subtracts a flat 50. These windows are universal "do not begin" zones.</li>
     <li><strong>Daytime bonus</strong> — most muhurats prefer daylight for visibility, witness, and traditional decorum.</li>
     <li><strong>Baseline + clamp</strong> — final score normalized 0-100, then verdict: ≥80 excellent / ≥65 good / ≥45 fair / below avoid.</li>
    </ul>
   </section>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">Frequently asked questions</h2>
    <div className="mt-5 space-y-3">
     {FAQS.map((f, i) => (
      <details key={i} className="group rounded-xl border border-saffron-200 bg-white/80 p-4 open:border-saffron-400">
       <summary className="cursor-pointer list-none font-serif text-base font-semibold text-gray-900 group-open:text-saffron-700">
        {f.q}
       </summary>
       <p className="mt-2 text-sm leading-relaxed text-gray-700">{f.a}</p>
      </details>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
    <p className="font-serif text-lg text-gray-900">Inspect the three underlying panchang tools</p>
    <p className="mt-2 text-sm text-gray-700">
     Shubh Muhurat is a composite scorer. Open the individual calculators to see the raw signals
     behind any window — and reconcile with a pandit for a final wedding/griha-pravesh date.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/choghadiya" className={buttonClass('primary', 'md')}>
      Choghadiya
     </Link>
     <Link href="/astrology/hora" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Hora
     </Link>
     <Link href="/astrology/rahu-kalam" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Rahu Kalam
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Ask a Pandit
     </Link>
    </div>
   </section>
  </main>
 );
}
