import type { Metadata } from 'next';
import Link from 'next/link';
import RahuKalamClient from './RahuKalamClient';

export const runtime = 'edge';
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Rahu Kalam Today — Free Rahu Kaal, Yamaganda & Gulika Calculator | Darshya',
 description:
  'Free Rahu Kalam (Rahu Kaal) calculator. Today\'s ~90-minute inauspicious windows: Rahu Kalam, Yamaganda, Gulika Kalam — computed from sunrise/sunset per Muhurta Chintamani weekday tables. Live "now" marker. No birth-data needed. 20 Indian cities + 6 NRI cities pre-loaded.',
 alternates: { canonical: `${BASE_URL}/astrology/rahu-kalam` },
 openGraph: {
  title: 'Rahu Kalam Today — Free Rahu Kaal Calculator',
  description: 'Today\'s Rahu Kalam, Yamaganda, Gulika Kalam timings for your city. Free Vedic muhurat tool.',
  url: `${BASE_URL}/astrology/rahu-kalam`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Rahu Kalam?',
  a: 'Rahu Kalam (राहु काल) is one of the three daily ~90-minute inauspicious windows in Vedic muhurta shastra. It is ruled by Rahu, the north lunar node — a shadow planet associated with confusion, illusion, and obstruction. Traditional astrologers advise avoiding new beginnings, signing contracts, starting journeys, weddings, and griha pravesh during Rahu Kalam. Routine work and reading scriptures are permitted.',
 },
 {
  q: 'How is Rahu Kalam calculated?',
  a: 'The day-arc from sunrise to sunset is divided into 8 equal octets (~90 minutes each, varying with day length). Each weekday assigns one specific octet to Rahu per the Muhurta Chintamani tables: Sunday=8th, Monday=2nd, Tuesday=7th, Wednesday=5th, Thursday=6th, Friday=4th, Saturday=3rd. So Rahu Kalam timing shifts with both your latitude (sunrise/sunset) and the weekday.',
 },
 {
  q: 'What is Yamaganda?',
  a: 'Yamaganda (यमगण्ड) is the inauspicious window ruled by Yama, the Vedic lord of death and son of Surya. Per Muhurta Chintamani: Sun=5th octet, Mon=4th, Tue=3rd, Wed=2nd, Thu=1st, Fri=7th, Sat=6th. Avoid auspicious starts, marriage talks, and journey commencement during Yamaganda.',
 },
 {
  q: 'What is Gulika Kalam?',
  a: 'Gulika Kalam (गुलिक काल, also called Mandi) is the inauspicious window ruled by Gulika — the son of Shani, embodiment of slowness and obstruction. Per the standard table: Sun=7th, Mon=6th, Tue=5th, Wed=4th, Thu=3rd, Fri=2nd, Sat=1st. Avoid financial commitments, surgery, and important meetings; Shani remedies and mantra japa are favored.',
 },
 {
  q: 'Can I do daily routine work during Rahu Kalam?',
  a: 'Yes. Daily routine, scriptural study, mantra japa, and Rahu-specific remedies (like reading Durga Kavach or doing Rahu shanti) are not only allowed but considered beneficial during Rahu Kalam. The restriction is specifically on new auspicious starts — not on living your life.',
 },
 {
  q: 'How accurate is this Rahu Kalam calculator?',
  a: 'Sunrise and sunset are computed via the Almanac for Computers algorithm (USGS, ~1 minute accuracy at most latitudes) — well within the ±5 minute tolerance traditional panchang prints use. The octet positions per weekday are taken directly from the standard Muhurta Chintamani tables that every Hindu panchang publisher uses, so results match published rahu-kalam timings for any city.',
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
  { '@type': 'ListItem', position: 3, name: 'Rahu Kalam Today', item: `${BASE_URL}/astrology/rahu-kalam` },
 ],
};

const APP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Rahu Kalam Calculator — Darshya',
 url: `${BASE_URL}/astrology/rahu-kalam`,
 applicationCategory: 'LifestyleApplication',
 operatingSystem: 'Any',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 description: 'Free Vedic Rahu Kalam, Yamaganda, Gulika Kalam calculator. Daily inauspicious windows per Muhurta Chintamani.',
};

const DOSHA_INFO = [
 {
  kind: 'rahu' as const,
  label: 'Rahu Kalam',
  sanskrit: 'राहु काल',
  ruler: 'Rahu (शिरस्)',
  tone: 'border-rose-300 bg-rose-50/60',
  pill: 'bg-rose-200 text-rose-900',
  meaning: 'Shadow planet of confusion + sudden upheaval. Avoid contracts, new journeys, weddings.',
  weekdayTable: 'Sun=8 · Mon=2 · Tue=7 · Wed=5 · Thu=6 · Fri=4 · Sat=3',
 },
 {
  kind: 'yamaganda' as const,
  label: 'Yamaganda',
  sanskrit: 'यमगण्ड',
  ruler: 'Yama (यम)',
  tone: 'border-amber-300 bg-amber-50/60',
  pill: 'bg-amber-200 text-amber-900',
  meaning: 'Lord of death, son of Surya. Avoid auspicious starts + marriage discussions.',
  weekdayTable: 'Sun=5 · Mon=4 · Tue=3 · Wed=2 · Thu=1 · Fri=7 · Sat=6',
 },
 {
  kind: 'gulika' as const,
  label: 'Gulika Kalam',
  sanskrit: 'गुलिक काल',
  ruler: 'Gulika / Mandi (मन्दि)',
  tone: 'border-purple-300 bg-purple-50/60',
  pill: 'bg-purple-200 text-purple-900',
  meaning: 'Son of Shani — slowness, obstruction. Avoid finance, surgery, meetings.',
  weekdayTable: 'Sun=7 · Mon=6 · Tue=5 · Wed=4 · Thu=3 · Fri=2 · Sat=1',
 },
];

export default function RahuKalamPage() {
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
    <span className="text-gray-700">Rahu Kalam</span>
   </nav>

   <header className="mt-4 text-center">
    <p className="text-xs uppercase tracking-widest text-saffron-600">राहु काल · Rahu Kalam / Rahu Kaal</p>
    <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Rahu Kalam Today — Free Calculator</h1>
    <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
     The three daily ~90-minute inauspicious windows — Rahu Kalam, Yamaganda, Gulika Kalam — computed from
     today's sunrise/sunset per the standard Muhurta Chintamani weekday tables. Pick your city below.
    </p>
   </header>

   <div className="mt-8">
    <RahuKalamClient />
   </div>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The three doshas</h2>
    <p className="mt-2 text-sm text-gray-700">
     Each dosha occupies one of 8 day-octets, varying by weekday. Octet length =
     (sunset − sunrise) / 8 ≈ 90 min, slightly more in summer + less in winter.
    </p>
    <div className="mt-5 grid gap-4 sm:grid-cols-3">
     {DOSHA_INFO.map((d) => (
      <div key={d.kind} className={`rounded-xl border-2 p-5 ${d.tone}`}>
       <div className="flex items-start justify-between gap-2">
        <div>
         <p className="font-serif text-lg font-semibold text-gray-900">{d.label}</p>
         <p className="text-sm text-gray-700">{d.sanskrit}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${d.pill}`}>Inauspicious</span>
       </div>
       <p className="mt-2 text-xs font-semibold text-gray-700">Ruler: {d.ruler}</p>
       <p className="mt-2 text-sm text-gray-700">{d.meaning}</p>
       <p className="mt-3 rounded-md bg-white/70 px-2 py-1.5 font-mono text-[11px] text-gray-700">
        Octet/weekday: {d.weekdayTable}
       </p>
      </div>
     ))}
    </div>
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
    <p className="font-serif text-lg text-gray-900">Continue your muhurat search</p>
    <p className="mt-2 text-sm text-gray-700">
     Rahu Kalam tells you when to <em>not</em> act. Choghadiya tells you the auspicious windows.
     Together they pinpoint the best time for any important start.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/choghadiya" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Choghadiya — auspicious windows
     </Link>
     <Link href="/panchang" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Today's Panchang
     </Link>
     <Link href="/muhurat" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      All Muhurat types
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Ask a Pandit
     </Link>
    </div>
   </section>
  </main>
 );
}
