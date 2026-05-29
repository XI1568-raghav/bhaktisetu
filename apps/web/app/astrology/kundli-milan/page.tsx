// Free Kundli Milan (Ashtakoot 36-point Guna Match) — SEO page.
// Targets: "free kundli milan online", "guna milan by date of birth",
// "ashtakoot match", "marriage matching online free", "milan calculator".
import type { Metadata } from 'next';
import Link from 'next/link';
import KundliMilanClient from './KundliMilanClient';
import { allNakshatraOptions } from '../../../lib/kundli-milan';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Free Kundli Milan Online — Ashtakoot 36-Point Guna Match Calculator | Darshya',
 description: 'Free Kundli Milan calculator with full Ashtakoot 36-point Guna match — Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi. Manglik dosh check included. Authentic Vedic computation, no signup.',
 alternates: { canonical: `${BASE_URL}/astrology/kundli-milan` },
 openGraph: {
  title: 'Free Kundli Milan — Ashtakoot 36-Point Guna Match',
  description: 'Vedic marriage compatibility calculator. Full 8-Koota Ashtakoot breakdown + Manglik check. Free, no signup.',
  url: `${BASE_URL}/astrology/kundli-milan`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Ashtakoot Guna Milan?',
  a: 'Ashtakoot is the 8-fold Vedic compatibility analysis used in arranged-marriage matchmaking. The 8 categories (Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, Nadi) carry weights of 1+2+3+4+5+6+7+8 = 36 points total. A score of 18 or above is shastra-recommended for marriage.',
 },
 {
  q: 'How accurate is this free Kundli Milan?',
  a: 'The Ashtakoot computation here matches Sri Mandir, AstroSage, Drik Panchang and other established calculators — the math is fixed Vedic doctrine. We use your nakshatra (lunar mansion) as input, which is sufficient for the 8-Koota score. For pada-level precision and Navamsa (D9) overlay, a full birth-time consultation is needed.',
 },
 {
  q: 'Why is 18 considered the minimum match?',
  a: 'Shastras (Brihat Parashara Hora, Muhurta Chintamani) hold that 18/36 represents the threshold where shared karma outweighs friction. Below 18 indicates significant temperament, health, or family-welfare mismatch. Between 18-24 is acceptable, 24-31 is very good, above 31 is rare and excellent.',
 },
 {
  q: 'What is Nadi dosh and can it be cancelled?',
  a: 'Nadi dosh is when both partners share the same Nadi (Aadi/Madhya/Antya) — score is 0/8 in that category. Traditionally indicates risk to progeny and spouse health. However, Nadi-bhanga (cancellation) applies when: both have same rashi but different nakshatra; both have same nakshatra but different padas; or the nakshatra falls in the same rashi for both. A pandit reviews specific cancellation rules.',
 },
 {
  q: 'Is Manglik a deal-breaker for marriage?',
  a: 'No. Manglik dosh from Mars in 1st/4th/7th/8th/12th house has multiple cancellation paths (Mangal-bhanga): if partner is also Manglik, if partner has Saturn aspecting Mars, if Mars is in own/exalted sign, or if Mars is in 1st house but in Aries. Severe Manglik (Mars + Rahu in 7th) may need kumbh-vivah. Mild Manglik usually self-cancels.',
 },
 {
  q: 'Do I need exact birth time for Kundli Milan?',
  a: 'Not for the basic 36-point Ashtakoot. Nakshatra is determined by Moon\'s position, which moves through one nakshatra in ~24 hours — so date + place is usually enough. However, for Manglik analysis, Navamsa overlay, and dasha timing of marriage, exact birth time is required. Without it, we compute the milan score; for the full report book a pandit consultation.',
 },
];

export default function KundliMilanPage() {
 const options = allNakshatraOptions();

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
   { '@type': 'ListItem', position: 3, name: 'Kundli Milan', item: `${BASE_URL}/astrology/kundli-milan` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Kundli Milan Calculator',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free 36-point Ashtakoot Vedic marriage-compatibility calculator with Manglik dosh check.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/kundli-milan`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Kundli Milan</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool · no signup</p>
    <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Free Kundli Milan — Ashtakoot 36-Point Guna Match</h1>
    <p className="mt-2 text-saffron-700">कुंडली मिलान · अष्टकूट गुण मिलान</p>
    <p className="mt-4 text-base text-gray-700">
     The traditional 8-fold (Ashtakoot) Vedic marriage-compatibility calculator. Pick both
     partners&rsquo; nakshatra (lunar mansion at birth) below to compute Varna · Vashya ·
     Tara · Yoni · Graha Maitri · Gana · Bhakoot · Nadi — a total of 36 points. 18 or above
     is shastra-recommended.
    </p>
   </header>

   <KundliMilanClient options={options} />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 8 Kootas explained</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
     {[
      { name: 'Varna (1)', desc: 'Spiritual/work caste — female should be at or below male in varna rank.' },
      { name: 'Vashya (2)', desc: 'Mutual attraction — power balance between the partners.' },
      { name: 'Tara (3)', desc: 'Destiny — nakshatra-from-nakshatra count determines well-being.' },
      { name: 'Yoni (4)', desc: 'Sexual & physical compatibility from 14 animal pairs.' },
      { name: 'Graha Maitri (5)', desc: 'Mental harmony from rashi-lord friendship.' },
      { name: 'Gana (6)', desc: 'Temperament: Deva (divine), Manushya (human), Rakshasa (passionate).' },
      { name: 'Bhakoot (7)', desc: 'Family welfare from rashi-to-rashi distance.' },
      { name: 'Nadi (8)', desc: 'Health & progeny — same Nadi is shastra-prohibited unless cancelled.' },
     ].map((k) => (
      <div key={k.name} className="rounded-xl border border-saffron-200 bg-saffron-50/30 p-4">
       <p className="font-semibold text-saffron-800">{k.name}</p>
       <p className="mt-1 text-sm text-gray-700">{k.desc}</p>
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
    <h2 className="font-serif text-xl text-gray-900">Want a deeper compatibility report?</h2>
    <p className="mt-2 text-sm text-gray-700">
     Ashtakoot is the foundation. Navamsa (D9), Manglik analysis, dasha-bhukti timing, and
     7th-house lord placement give the full picture. Talk to a verified Vedic pandit.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Ask a Pandit Live
     </Link>
     <Link href="/free-pandit-advice/kundli-milan" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Read Free Pandit Advice
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Generate Free Kundli
     </Link>
    </div>
   </section>
  </main>
 );
}
