// Free Janma Nakshatra Finder — Vedic birth-star calculator from DOB + time.
// Targets "find my nakshatra by date of birth", "birth star calculator",
// "janma nakshatra finder", "what is my nakshatra".
import type { Metadata } from 'next';
import Link from 'next/link';
import NakshatraFinderClient from './NakshatraFinderClient';
import { TIMEZONE_OPTIONS } from '../../../lib/nakshatra-finder';
import { NAKSHATRAS } from '../../../lib/nakshatras';

export const runtime = 'edge';
export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Find My Nakshatra by Date of Birth — Free Vedic Birth Star Calculator | Darshya',
 description: 'Free janma nakshatra finder. Enter your date + time of birth to get your Vedic birth star, pada, moon sign (rashi), ruling lord, and deity — computed with Meeus moon longitude + Lahiri ayanamsa. No signup.',
 alternates: { canonical: `${BASE_URL}/astrology/nakshatra-finder` },
 openGraph: {
  title: 'Find My Nakshatra — Free Vedic Birth Star Calculator',
  description: 'Janma nakshatra finder by DOB + time. 27 nakshatras × 4 padas, rashi, lord, deity. Free, no signup.',
  url: `${BASE_URL}/astrology/nakshatra-finder`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is a birth nakshatra (janma nakshatra)?',
  a: 'Your janma nakshatra is the lunar mansion (out of 27) where the moon was located at the exact moment of your birth. Vedic astrology divides the 360° zodiac into 27 nakshatras of 13°20\' each — and the moon, being the fastest-moving classical body, transits one nakshatra roughly every 24 hours. Your janma nakshatra rules your emotional nature, instinctive responses, lifelong dasha sequence (Vimshottari), and is the single most important reference point in your kundli — more practically used than your sun sign in traditional Indian astrology.',
 },
 {
  q: 'Why does my nakshatra matter?',
  a: 'Three big reasons. (1) Namakaran — the first syllable of your name traditionally comes from your nakshatra-pada (this tool feeds directly into our baby-name calculator). (2) Marriage matching — Ashtakoot kundli milan scores 8 kootas of which 6 use the nakshatra (Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi = 28 of 36 points). (3) Dasha timing — Vimshottari mahadasha sequence starts from your janma nakshatra lord, governing the major life chapters from birth onward. Daily panchang, muhurat selection, vrat compatibility, and remedies all reference your nakshatra.',
 },
 {
  q: 'How is the nakshatra computed?',
  a: 'We convert your DOB + birth time + timezone into Julian Day (Meeus chapter 7 algorithm), compute the moon\'s tropical longitude using the abridged Meeus chapter 47 series — mean longitude plus 11 perturbation terms (equation of center, evection, variation, annual equation, etc) — accuracy ±0.3°. We then subtract the Lahiri ayanamsa (the standard Indian sidereal correction, ~24.0° in 2026, growing ~50"/year) to get the sidereal moon longitude. Dividing by 13°20\' gives your nakshatra (0-26), and by 3°20\' the pada (1-4). Rashi = sidereal longitude ÷ 30°.',
 },
 {
  q: 'What timezone should I pick if I was born outside India?',
  a: 'Always pick the timezone of the city where you were actually born, not where you live now. The tool needs the local clock time at the birth location, then converts to UTC for moon-position math. Common picks: IST (+5:30) for India, EST/EDT for US East, PST/PDT for US West, GST (+4) for UAE/Gulf, NPT (+5:45) for Nepal, JST (+9) for Japan, AEST (+10) for Australia East. If your birth city falls in daylight-saving territory and you were born in summer (EDT/PDT vs EST/PST), pick the matching summer offset.',
 },
 {
  q: 'What is Gandanta nakshatra? Should I worry?',
  a: 'When the moon at birth falls in the junction (sandhi) between water and fire signs — specifically the last pada of Revati, Ashlesha, or Jyeshtha, or the first pada of Ashwini, Magha, or Mula — this is called Gandanta nakshatra. Traditional shastra considers it karmically delicate; common remedies are Gandanta shanti puja (especially for newborns), invoking protective deities (Hanuman, Durga, Ganesha), and consulting a pandit before naming or major life events. It is not a curse — it indicates a soul carrying intense karmic learning. If the calculator shows you in Gandanta, treat it as a flag to consult a pandit rather than a verdict.',
 },
 {
  q: 'How accurate is this vs a pandit\'s Drik panchang?',
  a: 'Accuracy ±0.3° on moon longitude. Each nakshatra spans 13°20\' (13.333°) and each pada 3°20\' (3.333°), so 0.3° precision is fully sufficient for the nakshatra + pada result — you will get the same answer as a Drik panchang in ~99% of cases. Edge cases are births within ~5 minutes of a pada or nakshatra boundary, where higher-precision ephemeris (Swiss Ephemeris / NASA JPL) is preferred. For ceremonial muhurat (exact start of namakaran, vivah, griha pravesh) always defer to a pandit running full Drik panchang — but for "what is my nakshatra" lookup, this tool is reliable.',
 },
];

export default function NakshatraFinderPage() {
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
   { '@type': 'ListItem', position: 3, name: 'Nakshatra Finder', item: `${BASE_URL}/astrology/nakshatra-finder` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Janma Nakshatra Finder',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic birth-star calculator. Enter DOB + time to get nakshatra, pada, rashi, lord, deity. Meeus moon longitude + Lahiri ayanamsa.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/nakshatra-finder`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Nakshatra Finder</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool · no signup</p>
    <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Find My Nakshatra by Date of Birth — Free Vedic Birth Star Calculator</h1>
    <p className="mt-2 text-saffron-700">जन्म नक्षत्र · Janma Nakshatra</p>
    <p className="mt-4 text-base text-gray-700">
     Enter your date of birth, time of birth, and timezone to compute your janma nakshatra (Vedic
     birth star), pada (quarter), rashi (moon sign), ruling planet, and presiding deity. Pure Vedic
     compute — no signup, no email, no API.
    </p>
   </header>

   <NakshatraFinderClient options={TIMEZONE_OPTIONS} />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">All 27 nakshatras</h2>
    <p className="mt-1 text-sm text-gray-600">Quick reference — lord and deity for each Vedic lunar mansion.</p>
    <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
     {NAKSHATRAS.map((n) => (
      <Link
       key={n.slug}
       href={`/nakshatra/${n.slug}`}
       className="rounded-lg border border-saffron-200 bg-saffron-50/40 p-3 transition hover:border-saffron-400 hover:bg-saffron-50"
      >
       <div className="flex items-baseline justify-between">
        <p className="font-serif text-sm font-semibold text-gray-900">{n.name}</p>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{n.lord}</span>
       </div>
       <p className="text-[11px] text-saffron-700">{n.sanskritName}</p>
       <p className="mt-1 text-[11px] text-gray-600">Deity: {n.deity}</p>
      </Link>
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
    <h2 className="font-serif text-xl text-gray-900">Use your nakshatra across all Vedic tools</h2>
    <p className="mt-2 text-sm text-gray-700">
     Once you know your janma nakshatra, plug it into our other free Vedic calculators — baby
     naming, kundli milan, or full birth chart. For pandit-grade Drik panchang + dasha + remedies,
     speak to a verified Vedic astrologer.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/baby-name" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Baby Name by Nakshatra
     </Link>
     <Link href="/astrology/kundli-milan" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Free Kundli Milan
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
