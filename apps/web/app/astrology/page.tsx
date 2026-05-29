import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import AstrologyClient from './AstrologyClient';
import { ApprovedProvidersStrip } from '../../components/ApprovedProvidersStrip';

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Vedic Astrology, Horoscope & Kundli — 15 Free Tools + Live Pandits | Darshya',
 description:
 'Free Vedic astrology suite: Kundli (birth chart), Kundli Milan (Ashtakoot 36-point match), Numerology, Baby Name by Nakshatra, Janma Nakshatra Finder, Vimshottari Dasha 120-year timeline, Manglik Dosh check, Sade Sati Saturn-transit check, Choghadiya muhurat, Rahu Kalam / Yamaganda / Gulika daily inauspicious windows, Hora planetary hour, Kaal Sarp Dosh detector (12 Kalsarpa Yoga types), Shubh Muhurat finder for marriage / griha pravesh / vehicle / business / 8 more life events, Vastu Shastra 8-direction room placement scorer, Lal Kitab Farman Finder mapping 12 life problems to 9 grahas with 108 house-by-house household remedies. Plus verified pandits for consults.',
};

const FREE_TOOLS = [
 {
  slug: 'kundli',
  title: 'Free Kundli (Birth Chart)',
  sanskrit: 'जन्म कुंडली',
  desc: 'Full Vedic birth chart with planetary positions, dasha, nakshatra, rashi, and yogas. Pure D-1 chart computed from your DOB + birth time + place.',
  cta: 'Generate My Kundli',
  badge: 'Most popular',
 },
 {
  slug: 'kundli-milan',
  title: 'Kundli Milan (Match-Making)',
  sanskrit: 'गुण मिलान',
  desc: 'Ashtakoot 36-point Guna Milan between bride and groom. 8 kootas scored — Varna, Vashya, Tara, Yoni, Graha, Gana, Bhakoot, Nadi. Manglik dosh flag included.',
  cta: 'Match Two Charts',
  badge: 'Free',
 },
 {
  slug: 'numerology',
  title: 'Numerology (Ank Jyotish)',
  sanskrit: 'अंक ज्योतिष',
  desc: 'Life-path, birthday, name (Chaldean), soul-urge, and personality numbers — with planetary ruler, lucky days, colors, careers, and remedies. Pythagorean + Chaldean.',
  cta: 'Compute My Numbers',
  badge: 'Free',
 },
 {
  slug: 'baby-name',
  title: 'Baby Name by Nakshatra',
  sanskrit: 'नामकरण',
  desc: '27 nakshatras × 4 padas → traditional starting syllables per Brihat Samhita namakaran shastra. Curated Sanskrit-rooted boy/girl names with meanings + deity.',
  cta: 'Find Baby Names',
  badge: 'New',
 },
 {
  slug: 'nakshatra-finder',
  title: 'Janma Nakshatra Finder',
  sanskrit: 'जन्म नक्षत्र',
  desc: 'Enter DOB + time → get birth nakshatra, pada, rashi, lord, deity. Meeus moon longitude + Lahiri ayanamsa (±0.3°). Feeds directly into baby-name + kundli-milan.',
  cta: 'Find My Nakshatra',
  badge: 'New',
 },
 {
  slug: 'dasha',
  title: 'Vimshottari Dasha Calculator',
  sanskrit: 'विंशोत्तरी महादशा',
  desc: 'Full 120-year Vimshottari timeline from your janma nakshatra. Current mahadasha + antardasha sub-period + all 9 planetary periods with start/end dates. Per Brihat Parashara.',
  cta: 'Compute My Dasha',
  badge: 'New',
 },
 {
  slug: 'manglik',
  title: 'Manglik Dosh Calculator',
  sanskrit: 'मंगल दोष',
  desc: 'Am I manglik? Chandra-lagna based Mars-house check with severity (poorna/anshik), Mars position, traditional cancellation rules, and Mangal Shanti remedies.',
  cta: 'Check Manglik Dosh',
  badge: 'New',
 },
 {
  slug: 'sade-sati',
  title: 'Sade Sati Calculator',
  sanskrit: 'साढ़े साती',
  desc: 'Am I in Sade Sati? Saturn transit through 12th/1st/2nd from natal Moon = 7.5-yr Sade Sati. Plus Dhaiya (Kantaka Shani 4th/8th, 2.5 yrs). Full lifetime phase timeline + Shani Shanti remedies.',
  cta: 'Check Sade Sati',
  badge: 'New',
 },
 {
  slug: 'choghadiya',
  title: 'Choghadiya Muhurat',
  sanskrit: 'चौघड़िया मुहूर्त',
  desc: '16 daily auspicious / inauspicious windows per Brihat Samhita. 8 day + 8 night periods classified Amrit/Shubh/Labh/Char/Kaal/Rog/Udveg. Live "now" marker. No birth-data needed — pure date + city.',
  cta: 'Check Choghadiya Today',
  badge: 'New',
 },
 {
  slug: 'rahu-kalam',
  title: 'Rahu Kalam / Yamaganda / Gulika',
  sanskrit: 'राहु काल',
  desc: 'Three daily ~90-min inauspicious windows per Muhurta Chintamani. Rahu Kalam + Yamaganda + Gulika Kalam, computed from sunrise/sunset for any city. Live "now" warning. No birth-data needed.',
  cta: 'Check Rahu Kalam Today',
  badge: 'New',
 },
 {
  slug: 'hora',
  title: 'Hora (Planetary Hour)',
  sanskrit: 'होरा चक्र',
  desc: '24 planetary horas per day in Chaldean order — Sat → Jup → Mars → Sun → Ven → Mer → Moon. Match your task to its ruling planet (Sun=authority, Jupiter=marriage, Venus=art, Mercury=trade). Live "now" marker.',
  cta: 'Check Hora Now',
  badge: 'New',
 },
 {
  slug: 'kaal-sarp',
  title: 'Kaal Sarp Dosh Calculator',
  sanskrit: 'काल सर्प दोष',
  desc: 'All 12 Kalsarpa Yoga types — Anant, Kulik, Vasuki, Shankhpal, Padma, Mahapadma, Takshak, Karkotak, Shankhachud, Ghatak, Vishdhar, Sheshnag. Detects forward/reverse arc + partial dosh. Naga puja remedies (Kalahasti / Trimbakeshwar) prescribed per house position.',
  cta: 'Check Kaal Sarp Dosh',
  badge: 'New',
 },
 {
  slug: 'shubh-muhurat',
  title: 'Shubh Muhurat Finder',
  sanskrit: 'शुभ मुहूर्त',
  desc: 'Best auspicious time today for 12 life events — marriage, griha pravesh, vehicle, property, naming, mundan, business start, signing, travel, surgery, study, general. Composite scoring overlays Choghadiya + Hora planet match + Rahu/Yamaganda/Gulika avoidance. Ranked top 6 windows 0-100.',
  cta: 'Find Shubh Muhurat',
  badge: 'New',
 },
 {
  slug: 'vastu',
  title: 'Vastu Shastra Calculator',
  sanskrit: 'वास्तु शास्त्र',
  desc: '8-direction room placement scorer per Mayamatam + Vishwakarma Prakash + Brihat Samhita. Pick plot facing + 15 room types (pooja/kitchen/master-bed/toilet/water tank/entrance + 9 more). Each placement scored 0-100 with ideal/acceptable/avoid + dosha flags. No birth data needed.',
  cta: 'Check My Vastu',
  badge: 'New',
 },
 {
  slug: 'lal-kitab',
  title: 'Lal Kitab Upay Finder',
  sanskrit: 'लाल किताब',
  desc: 'Per Pt. Roop Chand Joshi (1939-52). Pick from 12 life problems (career/marriage/money/health/court case + 7 more) → identify troubling graha → get 3 universal Farman + house-by-house remedy. All 108 graha-in-house combinations with household upay — water, jaggery, mustard oil, copper, silver, feed crows. Zero gemstone cost.',
  cta: 'Find My Farman',
  badge: 'New',
 },
];

const TOOLS_LD = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 itemListElement: FREE_TOOLS.map((t, i) => ({
  '@type': 'ListItem',
  position: i + 1,
  url: `${BASE_URL}/astrology/${t.slug}`,
  name: t.title,
 })),
};

export default function AstrologyPage() {
 return (
 <>
 <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(TOOLS_LD) }} />

 <Suspense fallback={<div className="min-h-screen" />}>
  <AstrologyClient />
 </Suspense>

 <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
  <div className="text-center">
   <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tools · no signup</p>
   <h2 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">15 free astrology calculators</h2>
   <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
    Use any of these instantly — fully Vedic, no signup, no email. When you want a pandit-led
    consult on top of the numbers, every result page links straight to live astrologers.
   </p>
  </div>

  <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
   {FREE_TOOLS.map((t) => (
    <Link
     key={t.slug}
     href={`/astrology/${t.slug}`}
     className="group rounded-2xl border-2 border-saffron-200 bg-gradient-to-br from-white to-saffron-50/50 p-6 shadow-sm transition hover:border-saffron-400 hover:shadow-md"
    >
     <div className="flex items-start justify-between gap-3">
      <div>
       <p className="font-serif text-xl font-semibold text-gray-900 group-hover:text-saffron-700">{t.title}</p>
       <p className="mt-0.5 text-sm text-saffron-700">{t.sanskrit}</p>
      </div>
      <span className="shrink-0 rounded-full bg-saffron-100 px-2.5 py-0.5 text-[11px] font-semibold text-saffron-800">
       {t.badge}
      </span>
     </div>
     <p className="mt-3 text-sm leading-relaxed text-gray-700">{t.desc}</p>
     <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-saffron-700">
      {t.cta} <span className="transition group-hover:translate-x-0.5">→</span>
     </p>
    </Link>
   ))}
  </div>

  <div className="mt-8 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
   <p className="font-serif text-lg text-gray-900">Want a pandit to interpret the results?</p>
   <p className="mt-2 text-sm text-gray-700">
    Free calculators give you the raw numbers. A verified Vedic astrologer reads them in
    relation to your full kundli, current dasha, and life questions.
   </p>
   <div className="mt-4 flex flex-wrap justify-center gap-3">
    <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
     Ask a Pandit Live
    </Link>
    <Link href="/free-pandit-advice" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
     Free Pandit Q&amp;A
    </Link>
   </div>
  </div>
 </section>

 <ApprovedProvidersStrip
 type="astrologer"
 heading="Verified astrologers on Darshya"
 subheading="Talk to approved Vedic astrologers. Each profile is reviewed before going live."
 limit={8}
 />
 </>
 );
}
