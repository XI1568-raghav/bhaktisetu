import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import KaalSarpClient from './KaalSarpClient';
import { KAAL_SARP_TYPES } from '../../../lib/kaal-sarp';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Kaal Sarp Dosh Calculator — Free Online Kalsarpa Yoga Check',
 description:
  'Free Kaal Sarp Dosh calculator. Detect all 12 Kalsarpa Yoga types (Anant · Kulik · Vasuki · Shankhpal · Padma · Mahapadma · Takshak · Karkotak · Shankhachud · Ghatak · Vishdhar · Sheshnag) based on Rahu-Ketu axis in your kundli. Severity + remedies + Naga puja guidance.',
 alternates: { canonical: `${BASE_URL}/astrology/kaal-sarp` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Kaal Sarp Dosh Calculator — Free Online Kalsarpa Yoga Check',
  description: 'Detect all 12 Kalsarpa Yoga types from your birth chart. Severity classification + traditional Naga puja remedies.',
  url: `${BASE_URL}/astrology/kaal-sarp`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Kaal Sarp Dosh in Vedic astrology?',
  a: 'Kaal Sarp Dosh (काल सर्प दोष) is formed when all 7 classical planets — Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn — sit hemmed inside the 180° arc bounded by Rahu (north lunar node) and Ketu (south node). The chart looks like the planets are caught between the serpent\'s mouth and tail. Per Brihat Parashara Hora Shastra + Lal Kitab, this yoga can cause delays, struggle, sudden setbacks, and karmic obstacles — but also often produces deep spiritual breakthroughs after age 32-36.',
 },
 {
  q: 'How many types of Kaal Sarp Yoga exist?',
  a: '12 types, named after the 12 serpent kings of Hindu mythology. The type is determined by which of the 12 houses Rahu occupies: 1=Anant, 2=Kulik, 3=Vasuki, 4=Shankhpal, 5=Padma, 6=Mahapadma, 7=Takshak, 8=Karkotak, 9=Shankhachud, 10=Ghatak, 11=Vishdhar, 12=Sheshnag. Each type affects a different life domain (self, wealth, marriage, career, etc).',
 },
 {
  q: 'What is the difference between forward and reverse Kaal Sarp?',
  a: 'Forward (Anuloma) Kaal Sarp = planets distributed CCW from Rahu to Ketu through the zodiac. Reverse (Pratiloma) = planets in the Ketu → Rahu half. Forward dosh is considered more karmic — past-life debts manifesting now. Reverse is considered more obstacle-oriented in the current life. Both qualify as "full" Kaal Sarp if all 7 planets fall inside the hemmed arc.',
 },
 {
  q: 'Is partial Kaal Sarp also a dosh?',
  a: 'Yes but milder. When 5-6 of the 7 classical planets fall inside the Rahu-Ketu arc (with 1-2 outside), it is called partial or "loose" Kaal Sarp Yoga. Effects are diluted but still noticeable — periodic obstacles especially during Rahu/Ketu mahadasha or antardasha. Many classical astrologers still prescribe lighter Naga remedies for partial cases.',
 },
 {
  q: 'What are the remedies for Kaal Sarp Dosh?',
  a: 'The flagship remedy is the Rahu-Ketu Shanti Puja at Sri Kalahasti Temple (Andhra Pradesh) — considered the most potent Kaal Sarp resolution site per shastra. Other major options: Narayan Nagbali at Trimbakeshwar (Nashik) — a 3-day ritual that simultaneously resolves Pitru Dosh; Naga Pratishtha at any Shiva temple; daily Maha Mrityunjaya japa; donating silver Naga-Nagin pair on Naga Panchami; reciting Rahu beej mantra 18,000 times in 40 days. All major remedies should be performed under a qualified pandit.',
 },
 {
  q: 'How accurate is this calculator?',
  a: 'Planetary longitudes are computed via the Meeus simplified algorithm (~±0.5° accuracy for 1900-2100). Rahu / Ketu use the mean lunar node formula (~±0.3°). Ascendant (lagna) uses the standard LST + obliquity formula. House numbering uses whole-sign system (most common in Vedic astrology). Lahiri ayanamsa is applied. For ceremonial muhurat-grade precision, verify with a pandit running full Drik panchang ephemeris (Swiss Ephemeris or NASA JPL).',
 },
 {
  q: 'Does Kaal Sarp always mean bad luck?',
  a: 'No. The classical texts repeatedly note that Kaal Sarp Yoga is a "yoga of karmic acceleration." Many famous spiritual masters, freedom fighters, and self-made tycoons had Kaal Sarp — they channelled the concentrated Rahu energy into focused, single-pointed achievement. The struggle phase typically lasts until 32-36 years, after which the same configuration often produces extraordinary spiritual depth, public influence, or sudden wealth (especially in 8th-house and 12th-house types).',
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
  { '@type': 'ListItem', position: 3, name: 'Kaal Sarp Dosh', item: `${BASE_URL}/astrology/kaal-sarp` },
 ],
};

const APP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Kaal Sarp Dosh Calculator — Darshya',
 url: `${BASE_URL}/astrology/kaal-sarp`,
 applicationCategory: 'LifestyleApplication',
 operatingSystem: 'Any',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 description: 'Free online Kaal Sarp Dosh detector. 12 Kalsarpa Yoga types classified from Rahu position. Remedies included.',
};

export default function KaalSarpPage() {
 return (
  <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREAD_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_LD) }} />

   <nav className="text-xs text-gray-500">
    <Link href="/" className="hover:text-indigo-700">Home</Link>
    {' · '}
    <Link href="/astrology" className="hover:text-indigo-700">Astrology</Link>
    {' · '}
    <span className="text-gray-700">Kaal Sarp Dosh</span>
   </nav>

   <header className="mt-4 text-center">
    <p className="text-xs uppercase tracking-widest text-indigo-600">काल सर्प दोष · Kalsarpa Yoga</p>
    <h1 className={`${H1.catalogue} mt-1`}>Kaal Sarp Dosh Calculator — Free Online</h1>
    <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
     Detect all 12 types of Kaal Sarp Yoga from your birth chart. When all 7 classical planets fall
     between Rahu and Ketu, the yoga forms — bringing concentrated karmic effects to one life domain.
    </p>
   </header>

   <div className="mt-8">
    <KaalSarpClient />
   </div>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 12 Kaal Sarp types</h2>
    <p className="mt-2 text-sm text-gray-700">
     Each type is determined by the house Rahu sits in, and affects a different life domain.
    </p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {KAAL_SARP_TYPES.map((t) => (
      <div key={t.house} className="rounded-xl border-2 border-purple-200 bg-purple-50/40 p-4">
       <div className="flex items-start justify-between gap-2">
        <div>
         <p className="font-serif text-base font-semibold text-gray-900">{t.house}. {t.name}</p>
         <p className="text-xs text-purple-700">{t.sanskrit}</p>
        </div>
        <span className="shrink-0 rounded-full bg-purple-200 px-2 py-0.5 text-xs font-bold text-purple-900">House {t.house}</span>
       </div>
       <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Theme</p>
       <p className="text-sm text-gray-800">{t.theme}</p>
      </div>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-amber-300 bg-amber-50/60 p-6">
    <h2 className="font-serif text-xl text-gray-900">Why "serpent" symbolism?</h2>
    <p className="mt-2 text-sm leading-relaxed text-gray-700">
     Rahu and Ketu are the two ends of the lunar node axis — invisible points where the Moon\'s orbit
     crosses the ecliptic. In Vedic mythology, they are the head (Rahu) and tail (Ketu) of the demon
     Svarbhanu, severed by Vishnu during the Samudra Manthan. Because the seven planets get caught
     between this celestial serpent\'s mouth and tail, the configuration is named Kaal Sarp — "Time
     Serpent" — symbolizing how karmic time itself can feel constricted in one\'s life. The 12 sub-types
     are named after the 12 great Nagas (serpent kings) of Hindu mythology — each ruling a different
     domain of cosmic order.
    </p>
   </section>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">Frequently asked questions</h2>
    <div className="mt-5 space-y-3">
     {FAQS.map((f, i) => (
      <details key={i} className="group rounded-xl border border-indigo-200 bg-white/80 p-4 open:border-indigo-400">
       <summary className="cursor-pointer list-none font-serif text-base font-semibold text-gray-900 group-open:text-indigo-700">
        {f.q}
       </summary>
       <p className="mt-2 text-sm leading-relaxed text-gray-700">{f.a}</p>
      </details>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-50 to-amber-50 p-6 text-center">
    <p className="font-serif text-lg text-gray-900">Layer your dosh checks</p>
    <p className="mt-2 text-sm text-gray-700">
     Kaal Sarp often combines with Manglik Dosh or Sade Sati. Check all three before booking a Naga puja —
     a pandit can prescribe a combined upaya that resolves multiple doshas in one ritual.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/manglik" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Manglik Dosh
     </Link>
     <Link href="/astrology/sade-sati" className="rounded-full border border-indigo-300 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
      Sade Sati
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-indigo-300 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
      Full Kundli
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-indigo-300 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
      Ask a Pandit
     </Link>
    </div>
   </section>
  </main>
 );
}
