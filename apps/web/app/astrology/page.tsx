import { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import AstrologyClient from './AstrologyClient';
import { ApprovedProvidersStrip } from '../../components/ApprovedProvidersStrip';

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Vedic Astrology, Horoscope & Kundli — 4 Free Tools + Live Pandits | Darshya',
 description:
 'Free Vedic astrology suite: Kundli (birth chart), Kundli Milan (Ashtakoot 36-point match), Numerology (life-path + name number), Baby Name by Nakshatra. Plus verified pandits for consults.',
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
   <h2 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">4 free astrology calculators</h2>
   <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
    Use any of these instantly — fully Vedic, no signup, no email. When you want a pandit-led
    consult on top of the numbers, every result page links straight to live astrologers.
   </p>
  </div>

  <div className="mt-8 grid gap-4 sm:grid-cols-2">
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
