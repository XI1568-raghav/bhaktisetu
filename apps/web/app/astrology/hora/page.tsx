import type { Metadata } from 'next';
import Link from 'next/link';
import HoraClient from './HoraClient';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Hora Calculator — Free Planetary Hour (Hora Chakra) for Any City',
 description:
  'Free Vedic Hora (planetary hour) calculator. 24 horas per day — 12 day + 12 night — each ruled by one of 7 planets in Chaldean order. Find the auspicious planetary hour for any task (study, travel, marriage, business). Live "now" marker. 20 Indian + 6 NRI cities.',
 alternates: { canonical: `${BASE_URL}/astrology/hora` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Hora Today — Free Planetary Hour Calculator',
  description: '24 planetary horas computed per Chaldean order. Find the right hora for your task.',
  url: `${BASE_URL}/astrology/hora`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is a Hora in Vedic astrology?',
  a: 'A Hora (होरा) is a planetary hour — one of 24 sub-divisions of a civil day (sunrise to next sunrise) in Vedic muhurta shastra. Each hora is ruled by one of the 7 traditional planets (Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn) and inherits that planet\'s nature. Choosing a task-aligned hora is one of the easiest forms of muhurat selection — no birth chart required, only date + place.',
 },
 {
  q: 'How are the 24 horas calculated?',
  a: 'The day-arc from sunrise to sunset is split into 12 equal day-horas (≈60 min each, varying with season). The night-arc from sunset to next sunrise gives 12 night-horas. The first hora at sunrise is ruled by the day\'s planetary lord (Sunday=Sun, Monday=Moon, Tuesday=Mars, Wednesday=Mercury, Thursday=Jupiter, Friday=Venus, Saturday=Saturn). Subsequent horas cycle through the Chaldean order: Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → repeat.',
 },
 {
  q: 'Which horas are auspicious for which tasks?',
  a: 'Sun hora — government work, authority dealings, health. Moon hora — travel (especially over water), public matters, agriculture. Jupiter hora — religion, teaching, marriage, learning, charity (greatest benefic). Venus hora — romance, art, music, weddings, luxury purchases. Mercury hora — communication, study, trade, signing contracts. Mars hora — surgery, lawsuits, sports (use sparingly). Saturn hora — hard labor, mining, agriculture, Shani remedies (use sparingly).',
 },
 {
  q: 'Why does the weekday determine the first hora?',
  a: 'In Vedic + Hellenistic tradition, the 7-day week itself is derived from the planetary hora cycle. Each weekday is named after the planet ruling its first daylight hora — that\'s why Sunday is Sun-day, Monday is Moon-day, Saturday is Saturn-day, etc. The Chaldean order ensures that after 24 horas the next sunrise lands on exactly the next weekday\'s lord — a mathematically elegant 168-hour cycle.',
 },
 {
  q: 'How does Hora differ from Choghadiya and Rahu Kalam?',
  a: 'All three are daily muhurat tools but use different time divisions. Hora = 24 hourly windows by planetary rulership. Choghadiya = 16 windows of ~90 min each (8 day + 8 night) classified Amrit/Shubh/Labh/etc. Rahu Kalam = 3 inauspicious ~90-min windows (Rahu/Yamaganda/Gulika) per day. For best muhurat: pick a Hora favorable to your planet/task, falling inside an auspicious Choghadiya, avoiding all three Rahu Kalam windows.',
 },
 {
  q: 'How accurate is this calculator?',
  a: 'Sunrise + sunset computed via the Almanac for Computers algorithm (~1 minute accuracy at most latitudes). Hora boundaries are exact arithmetic divisions of the day/night arc. The Chaldean planetary sequence is a fixed mathematical rule — every Vedic + Western traditional astrologer uses the same order. Results match published Hora charts in standard panchangs.',
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
  { '@type': 'ListItem', position: 3, name: 'Hora Calculator', item: `${BASE_URL}/astrology/hora` },
 ],
};

const APP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Hora (Planetary Hour) Calculator — Darshya',
 url: `${BASE_URL}/astrology/hora`,
 applicationCategory: 'LifestyleApplication',
 operatingSystem: 'Any',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 description: 'Free Vedic Hora (planetary hour) calculator. 24 horas per day in Chaldean order. Choose task-aligned muhurat.',
};

const PLANET_INFO = [
 { planet: 'Sun',     glyph: '☉', sanskrit: 'सूर्य · Surya',   tone: 'border-amber-300 bg-amber-50/60',   quality: 'Auspicious',   pillTone: 'bg-emerald-200 text-emerald-900', use: 'Authority, government, health, leadership' },
 { planet: 'Moon',    glyph: '☽', sanskrit: 'चंद्र · Chandra', tone: 'border-blue-300 bg-blue-50/60',     quality: 'Auspicious',   pillTone: 'bg-emerald-200 text-emerald-900', use: 'Travel, mother, public, emotion, agriculture' },
 { planet: 'Mars',    glyph: '♂', sanskrit: 'मंगल · Mangal',   tone: 'border-rose-300 bg-rose-50/60',     quality: 'Inauspicious', pillTone: 'bg-rose-200 text-rose-900',       use: 'Property dispute, surgery, sports, defense' },
 { planet: 'Mercury', glyph: '☿', sanskrit: 'बुध · Budha',     tone: 'border-emerald-300 bg-emerald-50/60', quality: 'Neutral',      pillTone: 'bg-gray-200 text-gray-800',       use: 'Communication, study, trade, contracts, writing' },
 { planet: 'Jupiter', glyph: '♃', sanskrit: 'गुरु · Guru',     tone: 'border-yellow-300 bg-yellow-50/60', quality: 'Auspicious',   pillTone: 'bg-emerald-200 text-emerald-900', use: 'Religion, marriage, learning, wealth, charity' },
 { planet: 'Venus',   glyph: '♀', sanskrit: 'शुक्र · Shukra',   tone: 'border-pink-300 bg-pink-50/60',     quality: 'Auspicious',   pillTone: 'bg-emerald-200 text-emerald-900', use: 'Romance, art, music, weddings, luxury' },
 { planet: 'Saturn',  glyph: '♄', sanskrit: 'शनि · Shani',     tone: 'border-purple-300 bg-purple-50/60', quality: 'Inauspicious', pillTone: 'bg-rose-200 text-rose-900',       use: 'Hard labor, mining, agriculture, Shani remedies' },
];

export default function HoraPage() {
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
    <span className="text-gray-700">Hora</span>
   </nav>

   <header className="mt-4 text-center">
    <p className="text-xs uppercase tracking-widest text-saffron-600">होरा चक्र · Hora / Planetary Hour</p>
    <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Hora Today — Free Planetary Hour Calculator</h1>
    <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
     24 planetary horas per day in Chaldean order — Saturn → Jupiter → Mars → Sun → Venus → Mercury → Moon → repeat.
     First hora at sunrise = today's weekday lord. Pick a task-aligned hora for instant muhurat selection.
    </p>
   </header>

   <div className="mt-8">
    <HoraClient />
   </div>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 7 planetary horas</h2>
    <p className="mt-2 text-sm text-gray-700">
     Each hora is ruled by one of the 7 traditional planets. Match your task to the
     planet's natural domain for best results.
    </p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {PLANET_INFO.map((p) => (
      <div key={p.planet} className={`rounded-xl border-2 p-4 ${p.tone}`}>
       <div className="flex items-start justify-between gap-2">
        <div>
         <p className="font-serif text-lg font-semibold text-gray-900">{p.glyph} {p.planet}</p>
         <p className="text-xs text-gray-700">{p.sanskrit}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${p.pillTone}`}>{p.quality}</span>
       </div>
       <p className="mt-2 text-sm text-gray-700">{p.use}</p>
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
    <p className="font-serif text-lg text-gray-900">Layer your muhurat tools</p>
    <p className="mt-2 text-sm text-gray-700">
     Best practice: pick a Hora favorable to your planet → confirm it falls inside an
     auspicious Choghadiya window → make sure it avoids all three Rahu Kalam doshas.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/choghadiya" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Choghadiya
     </Link>
     <Link href="/astrology/rahu-kalam" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Rahu Kalam
     </Link>
     <Link href="/panchang" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Panchang
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Ask a Pandit
     </Link>
    </div>
   </section>
  </main>
 );
}
