// Free Manglik (Mangal) Dosh Calculator — chandra-lagna check using Mars
// longitude from simplified Meeus VSOP87. Targets "manglik dosh calculator",
// "am i manglik", "mangal dosha check free", "kundli manglik check".
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import ManglikClient from './ManglikClient';
import { TIMEZONE_OPTIONS } from '../../../lib/nakshatra-finder';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Manglik Dosh Calculator — Free Mangal Dosha Check (DOB + Time)',
 description: 'Free Vedic Manglik dosh calculator. Enter DOB + birth time to check if you are manglik — including severity (poorna/anshik), Mars house from Moon, traditional cancellation rules, and Mangal Shanti remedies. Per Brihat Parashara Hora Shastra.',
 alternates: { canonical: `${BASE_URL}/astrology/manglik` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Manglik Dosh Calculator — Free Mangal Dosha Check',
  description: 'Am I manglik? Free chandra-lagna based check + severity + cancellation rules + remedies. No signup.',
  url: `${BASE_URL}/astrology/manglik`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Manglik Dosh (Mangal Dosha)?',
  a: 'Manglik dosh (मंगल दोष) is a condition in Vedic astrology where Mars (Mangal) occupies certain houses in the kundli — traditionally houses 1, 2, 4, 7, 8, and 12 — counted from the lagna (ascendant), the chandra-lagna (moon), or from venus. The dosh is considered particularly significant in marriage matching because Mars in these houses is said to influence the 7th house (marriage / spouse) and the 8th house (longevity, in-laws) through its planetary aspects, potentially creating discord, delay, or hardship in married life. Severity ranges from "anshik" (partial) to "poorna" (full).',
 },
 {
  q: 'Why does manglik matter for marriage?',
  a: 'In traditional Hindu marriage matching, the kundli of both bride and groom is examined for manglik status before the alliance is finalized. The classical rule says a manglik person should marry another manglik — Manglik–Manglik vivah — because the two doshas cancel each other out. A manglik person marrying a non-manglik is traditionally said to risk marital friction or worse for the partner. This is why grandparents + matchmakers ask "is the kundli manglik?" as one of the first questions. Modern Vedic practice is more nuanced — many astrologers consider cancellation rules + Jupiter aspect + Mars debilitation before declaring a strict ban.',
 },
 {
  q: 'Lagna vs chandra-lagna vs shukra — which method does this tool use?',
  a: 'There are three classical reference points for the manglik check: (1) lagna (ascendant) — requires birth latitude + longitude + exact time-of-birth, the most precise method; (2) chandra-lagna (moon as lagna) — needs only DOB + time + timezone; (3) shukra-lagna (venus as lagna) — secondary. This tool uses the chandra-lagna method because it does not require birth-place coordinates, making it accessible to NRIs + anyone without exact latitude/longitude. Chandra-lagna manglik is widely accepted in marriage matching across India. For a complete kundli-grade verification (all three methods + cancellation analysis + Jupiter aspect), a pandit reading your full birth chart will be more authoritative.',
 },
 {
  q: 'What is the difference between poorna and anshik manglik?',
  a: 'Poorna manglik (पूर्ण मांगलिक — "full") = Mars in the 7th or 8th house from the reference point. These are the most consequential placements because the 7th house IS marriage, and the 8th house is mangalya (longevity of the spouse + in-law karma). Anshik manglik (आंशिक मांगलिक — "partial") = Mars in houses 1, 2, 4, or 12 — still considered manglik but less severe, and more often cancelled by other factors. Both should be evaluated against cancellation rules before drawing conclusions.',
 },
 {
  q: 'What are the cancellation (manglik dosh bhang) rules?',
  a: 'Several classical conditions cancel or significantly reduce manglik dosh: (1) Mars in its own rashi — Aries (Mesha) or Scorpio (Vrischika) — cancels the dosh; (2) Mars exalted in Capricorn (Makara) cancels; (3) both partners manglik — Manglik–Manglik vivah neutralizes; (4) Mars debilitated in Cancer or in a friendly rashi with benefic aspect reduces severity; (5) strong Jupiter aspect on Mars or on the 7th house mitigates; (6) by some traditions, manglik dosh weakens significantly after age 28 (some sources say 36). Our calculator factors in the own/exalted rule automatically — the others require a pandit reading the full kundli.',
 },
 {
  q: 'Can a manglik marry a non-manglik?',
  a: 'Yes — but traditionally not without remedy. The classical solution is Manglik–Manglik vivah (marrying another manglik), which cancels the dosh mutually. If the alliance is with a non-manglik, the standard remedies are: Kumbh Vivah (symbolic marriage to a peepal tree, a Vishnu idol, or a clay pot before the real wedding — performed for severe cases), Mangal Shanti Puja by a qualified pandit, recitation of Hanuman Chalisa + Mangal Beej Mantra, donation of red lentils + jaggery on Tuesdays, and wearing coral (moonga) after consulting a pandit. Many modern couples + astrologers also weigh the cancellation rules in their kundlis before treating manglik as a deal-breaker.',
 },
];

export default function ManglikPage() {
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
   { '@type': 'ListItem', position: 3, name: 'Manglik Dosh Calculator', item: `${BASE_URL}/astrology/manglik` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Manglik Dosh Calculator',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic Mangal Dosha calculator. Chandra-lagna based check with severity, cancellation rules, and Mangal Shanti remedies.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/manglik`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Manglik Dosh Calculator</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool · no signup</p>
    <h1 className={`${H1.catalogue} mt-1`}>Manglik Dosh Calculator — Free Mangal Dosha Check</h1>
    <p className="mt-2 text-saffron-700">मंगल दोष · Mangal Dosha</p>
    <p className="mt-4 text-base text-gray-700">
     Enter your DOB + birth time + timezone to check whether you are manglik. We compute Mars
     position relative to your janma rashi (chandra-lagna) per Brihat Parashara Hora Shastra,
     classify severity (poorna / anshik / none), and surface the traditional cancellation rules
     + Mangal Shanti remedies a pandit would recommend.
    </p>
   </header>

   <ManglikClient options={TIMEZONE_OPTIONS} />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 6 manglik houses (from chandra-lagna)</h2>
    <p className="mt-1 text-sm text-gray-600">Mars occupying any of these houses, counted from your Moon rashi, creates Mangal Dosh.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {[
      { h: 1, name: 'Lagna (self)', severity: 'Anshik', note: 'Affects nature, temperament, partner harmony' },
      { h: 2, name: 'Dhana (wealth + family)', severity: 'Anshik', note: 'Friction in family + speech-related conflicts' },
      { h: 4, name: 'Sukha (home + mother)', severity: 'Anshik', note: 'Domestic peace, mother\'s wellbeing, property' },
      { h: 7, name: 'Kalatra (marriage)', severity: 'Poorna', note: 'Direct impact on spouse + marital harmony — strongest' },
      { h: 8, name: 'Mangalya (longevity)', severity: 'Poorna', note: 'Mangalya (longevity of spouse) + in-laws — strongest' },
      { h: 12, name: 'Vyaya (loss + bed)', severity: 'Anshik', note: 'Marital bed harmony, expenditure, distant travel' },
     ].map((h) => (
      <div key={h.h} className={`rounded-xl border p-4 ${
       h.severity === 'Poorna' ? 'border-red-300 bg-red-50/50' : 'border-amber-300 bg-amber-50/40'
      }`}>
       <div className="flex items-baseline justify-between">
        <p className="font-serif text-base font-semibold text-gray-900">House {h.h} — {h.name}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
         h.severity === 'Poorna' ? 'bg-red-200 text-red-900' : 'bg-amber-200 text-amber-900'
        }`}>{h.severity}</span>
       </div>
       <p className="mt-2 text-xs text-gray-700">{h.note}</p>
      </div>
     ))}
    </div>
    <p className="mt-3 text-xs text-gray-500">
     Houses 7 + 8 = poorna (full dosh, strongest impact on marriage). Houses 1, 2, 4, 12 = anshik
     (partial dosh, more easily cancelled by other factors).
    </p>
   </section>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">Cancellation rashis (auto-checked)</h2>
    <p className="mt-1 text-sm text-gray-600">
     If Mars sits in one of these rashis, classical texts say the manglik dosh is automatically cancelled.
    </p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
     {[
      { rashi: 'Mesha (Aries)', why: 'Mars in own rashi — fully cancels' },
      { rashi: 'Vrischika (Scorpio)', why: 'Mars in own rashi — fully cancels' },
      { rashi: 'Makara (Capricorn)', why: 'Mars exalted — fully cancels' },
     ].map((r) => (
      <div key={r.rashi} className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4">
       <p className="font-serif text-base font-semibold text-gray-900">{r.rashi}</p>
       <p className="mt-1 text-xs text-gray-700">{r.why}</p>
      </div>
     ))}
    </div>
    <p className="mt-3 text-xs text-gray-500">
     Other cancellation conditions (mutual manglik, Jupiter aspect, age 28+, debilitation with
     benefic aspect) require a full kundli reading — surfaced in the result below if you are manglik.
    </p>
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
    <h2 className="font-serif text-xl text-gray-900">Use this with the rest of your Vedic stack</h2>
    <p className="mt-2 text-sm text-gray-700">
     The manglik check is one input among many in kundli milan. Pair it with full Ashtakoot guna
     scoring or a pandit consultation for a marriage-grade verdict.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/kundli-milan" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Free Kundli Milan
     </Link>
     <Link href="/astrology/nakshatra-finder" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Find My Nakshatra
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
