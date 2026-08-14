// Free Choghadiya muhurat calculator. 8 day-periods + 8 night-periods,
// classified Amrit/Shubh/Labh (auspicious), Char (neutral), Kaal/Rog/Udveg
// (inauspicious). Sunrise/sunset via Almanac for Computers (~1 min). No
// birth-data required — pure date + city. Targets "choghadiya today",
// "shubh muhurat now", "amrit kaal time", "choghadiya muhurat calculator".
import type { Metadata } from 'next';
import Link from 'next/link';
import ChoghadiyaClient from './ChoghadiyaClient';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Choghadiya Today — Free Muhurat Calculator (8 Day + 8 Night Periods)',
 description: 'Free Vedic Choghadiya muhurat calculator. 8 day-periods (sunrise → sunset) + 8 night-periods (sunset → sunrise) classified as Amrit / Shubh / Labh (auspicious), Char (neutral), or Kaal / Rog / Udveg (inauspicious). Per weekday + city. Find shubh muhurat now.',
 alternates: { canonical: `${BASE_URL}/astrology/choghadiya` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Choghadiya Today — Free Muhurat Calculator',
  description: 'Live 16-period choghadiya muhurat. Sunrise/sunset per city + classification per Brihat Samhita. Find your next Amrit / Shubh / Labh window now.',
  url: `${BASE_URL}/astrology/choghadiya`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Choghadiya (चौघड़िया) muhurat?',
  a: 'Choghadiya — literally "four ghadis" — is a Vedic system of dividing the day and night into 8 equal periods each, based on local sunrise and sunset. Each period is roughly 90 minutes long (1.5 hours = 4 ghadis × ~24 minutes), giving 16 total periods covering 24 hours. Each period is classified as auspicious (Amrit, Shubh, Labh), neutral (Char), or inauspicious (Kaal, Rog, Udveg). The system is used across India for picking the most auspicious window for daily activities — starting a journey, signing a contract, opening a new business — without requiring a pandit consult or birth chart.',
 },
 {
  q: 'What are the 7 choghadiya types — Amrit, Shubh, Labh, Char, Kaal, Rog, Udveg?',
  a: 'Amrit (अमृत — nectar) = most auspicious, ruled by Moon — perfect for any new start or spiritual practice. Shubh (शुभ — auspicious) = ruled by Jupiter — ideal for weddings, ceremonies, ornament purchase, education. Labh (लाभ — gain) = ruled by Mercury — best for business, investments, money-related work. Char (चर — movement) = ruled by Venus — neutral but travel-friendly. Kaal (काल — death/time) = ruled by Saturn — avoid new starts; routine work OK. Rog (रोग — disease) = ruled by Mars — avoid health-critical decisions. Udveg (उद्वेग — anxiety) = ruled by Sun — avoid important decisions; government paperwork tolerable.',
 },
 {
  q: 'Why does the choghadiya order change every weekday?',
  a: 'The starting choghadiya of the day depends on the planetary lord of the weekday — the same logic as the hora system. Sunday starts with Udveg (Sun rules Sunday), Monday starts with Amrit (Moon rules Monday — and that\'s why Mondays are auspicious in many traditions). Tuesday starts with Rog (Mars), Wednesday with Labh (Mercury), Thursday with Shubh (Jupiter), Friday with Char (Venus), Saturday with Kaal (Saturn). Once the day\'s first choghadiya is set, the remaining 7 follow a fixed cyclical order: Udveg → Char → Labh → Amrit → Kaal → Shubh → Rog → Udveg → ... Night choghadiya begins with the 5th planet from the day-lord, shifting the entire sequence.',
 },
 {
  q: 'How is the choghadiya period length calculated?',
  a: 'Each day-period = (sunset − sunrise) / 8. Each night-period = (next sunrise − sunset) / 8. Because day-length and night-length vary by season + latitude, choghadiya periods are NOT exactly 90 minutes — they expand and contract through the year. In peak summer at Indian latitudes, day-periods stretch to ~100 minutes while night-periods shrink to ~80; the reverse happens in winter. Our calculator uses the Almanac for Computers solar-time algorithm (USGS) giving ~1-minute accuracy, sufficient for 90-minute-granularity periods.',
 },
 {
  q: 'Is Choghadiya the same as Muhurat? When should I use which?',
  a: 'Choghadiya is one type of muhurat, but the broader muhurat system includes far more granular tools — Hora (planetary hours, 24 per day), Abhijit muhurat (the 8th of 15 daily muhurats around solar noon), Brahma muhurat (the 4th watch of night, ~96 min before sunrise), Rahu Kalam (Rahu\'s daily 90-min inauspicious window), Yamaganda + Gulika Kalam, and full panchang muhurat selection (combining tithi + nakshatra + yoga + karana + vaar). For everyday decisions — when to leave for work, when to call a customer, when to start cooking for a guest — Choghadiya is the right tool. For high-stakes events (marriage, griha pravesh, business launch, foundation-stone laying) consult a pandit using full panchang.',
 },
 {
  q: 'Can I rely on the Char (neutral) period?',
  a: 'Yes — Char is considered neutral but particularly favorable for travel + transport because of its name (literally "movement"). It is ruled by Venus, the most benefic of the natural planets, so even though it is not actively auspicious like Amrit/Shubh/Labh, it is far better than the inauspicious trio (Kaal/Rog/Udveg) for daily errands, commuting, deliveries, and starting short journeys. Many older businessmen consider Char an acceptable backup if no Amrit/Shubh/Labh window is available in the required timeframe.',
 },
];

export default function ChoghadiyaPage() {
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
   { '@type': 'ListItem', position: 3, name: 'Choghadiya Muhurat', item: `${BASE_URL}/astrology/choghadiya` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Choghadiya Muhurat Calculator',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic Choghadiya muhurat calculator. 16 daily periods per Brihat Samhita with quality classification and ruling planet.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/choghadiya`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Choghadiya Muhurat</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-indigo-600">Free Vedic tool · no birth-data needed</p>
    <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Choghadiya Today — Free Muhurat Calculator</h1>
    <p className="mt-2 text-indigo-700">चौघड़िया मुहूर्त · Choghadiya / Chaughadia</p>
    <p className="mt-4 text-base text-gray-700">
     Pick your date + city to see 8 day-periods (sunrise → sunset) and 8 night-periods (sunset →
     next sunrise), each classified as auspicious (Amrit / Shubh / Labh), neutral (Char), or
     inauspicious (Kaal / Rog / Udveg) per Brihat Samhita. Live "now" marker + next-auspicious
     window — perfect for picking a shubh muhurat without consulting a pandit for daily decisions.
    </p>
   </header>

   <ChoghadiyaClient />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 7 choghadiya types at a glance</h2>
    <p className="mt-1 text-sm text-gray-600">Auspicious for new starts → Amrit / Shubh / Labh. Travel + routine → Char. Avoid important work → Kaal / Rog / Udveg.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {[
      { name: 'Amrit', ruler: 'Chandra (Moon)', q: 'Most auspicious', tone: 'emerald', for: 'Any new start, spiritual practice, important decisions' },
      { name: 'Shubh', ruler: 'Guru (Jupiter)', q: 'Auspicious', tone: 'emerald', for: 'Weddings, ceremonies, ornaments, learning' },
      { name: 'Labh', ruler: 'Budha (Mercury)', q: 'Auspicious', tone: 'emerald', for: 'Business, investments, new ventures' },
      { name: 'Char', ruler: 'Shukra (Venus)', q: 'Neutral', tone: 'gray', for: 'Travel, transport, daily errands' },
      { name: 'Kaal', ruler: 'Shani (Saturn)', q: 'Inauspicious', tone: 'rose', for: 'Avoid new starts. Routine + legal work tolerable' },
      { name: 'Rog', ruler: 'Mangal (Mars)', q: 'Inauspicious', tone: 'rose', for: 'Avoid health-critical work. Defensive action OK' },
      { name: 'Udveg', ruler: 'Surya (Sun)', q: 'Inauspicious', tone: 'rose', for: 'Avoid important decisions. Government paperwork OK' },
     ].map((c) => {
      const cls =
       c.tone === 'emerald' ? { border: 'border-emerald-300', bg: 'bg-emerald-50/40', pill: 'bg-emerald-200 text-emerald-900' } :
       c.tone === 'rose'    ? { border: 'border-rose-300',    bg: 'bg-rose-50/40',    pill: 'bg-rose-200 text-rose-900' } :
                              { border: 'border-gray-300',    bg: 'bg-gray-50/60',    pill: 'bg-gray-200 text-gray-800' };
      return (
       <div key={c.name} className={`rounded-xl border p-4 ${cls.border} ${cls.bg}`}>
        <div className="flex items-baseline justify-between gap-2">
         <p className="font-serif text-base font-semibold text-gray-900">{c.name}</p>
         <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${cls.pill}`}>{c.q}</span>
        </div>
        <p className="mt-1 text-xs text-gray-600">{c.ruler}</p>
        <p className="mt-2 text-xs text-gray-700">{c.for}</p>
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

   <section className="mt-12 rounded-2xl border border-indigo-300 bg-gradient-to-br from-indigo-50 to-amber-50 p-6 text-center">
    <h2 className="font-serif text-xl text-gray-900">Pair with the rest of your Vedic stack</h2>
    <p className="mt-2 text-sm text-gray-700">
     For high-stakes muhurat (wedding, griha pravesh, business launch), combine Choghadiya with
     panchang + nakshatra + a pandit reading of your kundli.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/panchang" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Today's Panchang
     </Link>
     <Link href="/muhurat" className="rounded-full border border-indigo-300 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
      Muhurat Reference Guide
     </Link>
     <Link href="/astrology/nakshatra-finder" className="rounded-full border border-indigo-300 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
      Find My Nakshatra
     </Link>
     <Link href="/ask-pandit" className="rounded-full border border-indigo-300 bg-white px-5 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50">
      Ask a Pandit Live
     </Link>
    </div>
   </section>
  </main>
 );
}
