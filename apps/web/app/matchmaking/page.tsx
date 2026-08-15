// High-intent landing — "kundli matching online", "horoscope matching for marriage",
// "ashtakoot guna milan", "manglik dosh check", "free kundli match".
import type { Metadata } from 'next';
import Link from 'next/link';
import { buttonClass } from '../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Kundli Matching Online — Free Ashtakoot 36-Point Guna Milan + Pandit',
 description: 'Free Vedic kundli matching for marriage. Ashtakoot 36-point Guna Milan across 8 kootas (Varna, Vashya, Tara, Yoni, Graha, Gana, Bhakoot, Nadi). Manglik dosh check. Plus verified pandits for full reading.',
 alternates: { canonical: `${BASE_URL}/matchmaking` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Free Kundli Matching — Ashtakoot Guna Milan + Pandit Consult',
  description: 'Free Vedic horoscope matching for marriage. 36-point Ashtakoot calculator + verified pandit consults.',
  url: `${BASE_URL}/matchmaking`,
  type: 'website',
 },
};

const KOOTAS = [
 { name: 'Varna', max: 1, what: 'Spiritual + ego compatibility — 4 classes' },
 { name: 'Vashya', max: 2, what: 'Mutual attraction + control' },
 { name: 'Tara', max: 3, what: 'Birth-star harmony — health + longevity' },
 { name: 'Yoni', max: 4, what: 'Sexual + instinctive temperament — 14 animal symbols' },
 { name: 'Graha Maitri', max: 5, what: 'Planetary friendship of rashi lords — mental tuning' },
 { name: 'Gana', max: 6, what: 'Devata / Manushya / Rakshasa temperament' },
 { name: 'Bhakoot', max: 7, what: 'Rashi distance — wealth, family, progeny' },
 { name: 'Nadi', max: 8, what: 'Pulse / health channel — genetic compatibility (most critical)' },
];

const FAQS = [
 {
  q: 'What is Ashtakoot Guna Milan?',
  a: 'Ashtakoot Guna Milan is the Vedic kundli-matching system used across North India for arranged marriages. It scores compatibility between bride and groom across 8 kootas (qualities) — Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot, and Nadi — for a maximum total of 36 points. Per Maharshi Garga and Brihat Parashara Hora Shastra, a score above 18 is considered acceptable for marriage. Above 24 is good, above 28 is excellent. Below 18 is generally not recommended without strong remedies.',
 },
 {
  q: 'Which koota matters most?',
  a: 'Nadi is the most critical. If both partners have the same Nadi (Aadi / Madhya / Antya), this is called Nadi Dosha and is traditionally considered a serious incompatibility — believed to affect progeny health and genetic harmony. After Nadi, Bhakoot dosh (certain rashi positions like 6-8 or 5-9 between the two charts) is the next most-watched. Some panditjis will refuse to officiate a marriage where both Nadi and Bhakoot dosh are present. Many Nadi dosh cases can be neutralized if both partners share the same nakshatra-lord — always consult.',
 },
 {
  q: 'What is Manglik dosh?',
  a: 'Manglik (or Mangal / Kuja) dosh occurs when Mars is placed in the 1st, 2nd, 4th, 7th, 8th, or 12th house of a kundli. This is believed to cause friction, delays, or health issues in marriage. The traditional rule: a Manglik should marry another Manglik, or specific remedies are needed (Kumbh Vivah, Vishnu Vivah, etc). However, modern Vedic interpretation often considers Mars in friendly signs (Aries, Scorpio, own house) as cancellation. Always have a pandit verify before declaring or dismissing Manglik status.',
 },
 {
  q: 'Is 18 / 36 a hard cutoff?',
  a: 'No. The 18-point rule is a guideline, not a verdict. A pandit examining the full charts will look at: dasha periods at the proposed marriage time, planetary aspects on the 7th house, Venus + Jupiter placement, Navamsa (D-9) chart compatibility, family-deity (kuldevta) alignment, and the parents’ own kundli. A 16-point match with strong D-9 and matching kuldevta can be more harmonious than a 28-point match with weak D-9. Always treat Ashtakoot as one input, not the final answer.',
 },
 {
  q: 'Can the free calculator replace a pandit?',
  a: 'No. The free Ashtakoot calculator gives you accurate 36-point scoring + dosh flags — a great first filter. But marriage matching in the full Vedic tradition involves: Navamsa (D-9) chart comparison, dasha-bhukti timing of the wedding muhurat, Venus + Jupiter strength, family deity alignment, and the kundli of both sets of parents. Use the free tool to shortlist; use a pandit to finalize.',
 },
 {
  q: 'What about South Indian / Dakshina matching?',
  a: 'South Indian (Tamil + Telugu) traditions use a 10-koota system called Dasha Porutham (or Pathu Porutham), which evolved separately from Ashtakoot. The 10 portuhams are Dina, Gana, Mahendra, Stri Deergha, Yoni, Rasi, Rasyadhipathi, Vasya, Rajju, and Vedha. Some kootas overlap with Ashtakoot (Yoni, Gana, Rasi) but the scoring + interpretation differ. A pandit trained in your family’s regional tradition is essential. Ashtakoot is the most widely recognized pan-India system and what our calculator uses.',
 },
];

export default function MatchmakingPage() {
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
   { '@type': 'ListItem', position: 2, name: 'Matchmaking', item: `${BASE_URL}/matchmaking` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Kundli Matching',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic kundli matching for marriage. Ashtakoot 36-point Guna Milan across 8 kootas. Manglik dosh detection.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/matchmaking`,
 };

 return (
  <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Matchmaking</span>
   </nav>

   <header className="mb-10 text-center">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool + verified pandits</p>
    <h1 className="mt-2 font-serif text-4xl text-gray-900 sm:text-5xl">Kundli Matching for Marriage</h1>
    <p className="mt-3 text-saffron-700">गुण मिलान · Ashtakoot Guna Milan</p>
    <p className="mx-auto mt-5 max-w-2xl text-base text-gray-700">
     Vedic horoscope matching across 8 kootas — Varna, Vashya, Tara, Yoni, Graha Maitri, Gana,
     Bhakoot, Nadi — totaling 36 guna. Plus Manglik dosh check. Free, instant, no signup.
    </p>
    <div className="mt-6 flex flex-wrap justify-center gap-3">
     <Link href="/astrology/kundli-milan" className={buttonClass('primary', 'lg')}>
      Start Free Match (36 points)
     </Link>
     <Link href="/ask-pandit" className="rounded-full border-2 border-saffron-300 bg-white px-6 py-3 text-base font-semibold text-saffron-700 hover:bg-saffron-50">
      Full Pandit Reading
     </Link>
    </div>
   </header>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">The 8 kootas of Ashtakoot — what each one means</h2>
    <p className="mt-2 text-sm text-gray-600">Per Maharshi Garga + Brihat Parashara Hora Shastra. Total 36 points.</p>
    <div className="mt-5 overflow-hidden rounded-2xl border border-saffron-200 bg-white shadow-sm">
     <table className="w-full text-sm">
      <thead className="bg-saffron-50 text-left">
       <tr>
        <th className="px-4 py-3 font-semibold text-saffron-900">#</th>
        <th className="px-4 py-3 font-semibold text-saffron-900">Koota</th>
        <th className="px-4 py-3 font-semibold text-saffron-900 text-right">Max</th>
        <th className="px-4 py-3 font-semibold text-saffron-900">What it measures</th>
       </tr>
      </thead>
      <tbody>
       {KOOTAS.map((k, i) => (
        <tr key={k.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
         <td className="px-4 py-3 text-gray-500">{i + 1}</td>
         <td className="px-4 py-3 font-semibold text-gray-900">{k.name}</td>
         <td className="px-4 py-3 text-right font-mono text-saffron-700">{k.max}</td>
         <td className="px-4 py-3 text-gray-700">{k.what}</td>
        </tr>
       ))}
       <tr className="border-t-2 border-saffron-300 bg-saffron-50">
        <td className="px-4 py-3"></td>
        <td className="px-4 py-3 font-semibold text-saffron-900">Total</td>
        <td className="px-4 py-3 text-right font-mono font-bold text-saffron-900">36</td>
        <td className="px-4 py-3 text-saffron-900">≥18 acceptable · ≥24 good · ≥28 excellent</td>
       </tr>
      </tbody>
     </table>
    </div>
   </section>

   <section className="mt-12 grid gap-5 sm:grid-cols-3">
    <div className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-5">
     <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Most critical dosh</p>
     <p className="mt-1 font-serif text-xl font-semibold text-gray-900">Nadi Dosha</p>
     <p className="mt-2 text-sm leading-relaxed text-gray-700">
      Same Nadi (Aadi / Madhya / Antya) for both partners = serious incompatibility flag.
      Affects health + progeny per traditional reading. Cancellation possible if same nakshatra
      lord — pandit must verify.
     </p>
    </div>
    <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/40 p-5">
     <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Second-watched</p>
     <p className="mt-1 font-serif text-xl font-semibold text-gray-900">Bhakoot Dosha</p>
     <p className="mt-2 text-sm leading-relaxed text-gray-700">
      Certain rashi-position pairs (6-8 or 5-9 between charts) = wealth + family stress flag.
      Less severe than Nadi but still load-bearing.
     </p>
    </div>
    <div className="rounded-2xl border-2 border-orange-200 bg-orange-50/40 p-5">
     <p className="text-xs font-semibold uppercase tracking-wider text-orange-700">Independent check</p>
     <p className="mt-1 font-serif text-xl font-semibold text-gray-900">Manglik Dosh</p>
     <p className="mt-2 text-sm leading-relaxed text-gray-700">
      Mars in 1/2/4/7/8/12 house. Traditional rule: Manglik should marry Manglik. Modern
      cancellations exist — Mars in friendly sign, Aries, Scorpio. Pandit verifies.
     </p>
    </div>
   </section>

   <section className="mt-12 rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-8 text-center">
    <h2 className="font-serif text-2xl text-gray-900">Ready to match two kundlis?</h2>
    <p className="mt-2 text-sm text-gray-700">
     Enter both birth nakshatras + Manglik status → 36-point score with full koota breakdown
     in 5 seconds. Free.
    </p>
    <Link href="/astrology/kundli-milan" className={buttonClass('primary', 'lg', 'mt-5')}>
     Open Free Kundli Milan →
    </Link>
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

   <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
    <h2 className="font-serif text-xl text-gray-900">Beyond Ashtakoot — what a pandit adds</h2>
    <ul className="mt-3 space-y-2 text-sm text-gray-700">
     <li>• <strong>Navamsa (D-9) chart comparison</strong> — the marriage chart in Vedic divisional astrology</li>
     <li>• <strong>Dasha-bhukti timing</strong> — auspicious window for the actual wedding muhurat</li>
     <li>• <strong>Venus + Jupiter strength</strong> — relationship + wisdom planets across both charts</li>
     <li>• <strong>7th house analysis</strong> — house of marriage + spouse, with aspects</li>
     <li>• <strong>Family deity (kuldevta) alignment</strong> — often the deciding cultural factor</li>
     <li>• <strong>Parents&rsquo; kundli check</strong> — traditional families compare 4 kundlis not 2</li>
     <li>• <strong>Remedies if doshas present</strong> — specific puja, mantra, gem recommendations</li>
    </ul>
    <div className="mt-5 flex flex-wrap gap-3">
     <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
      Talk to a Pandit
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Free Kundli First
     </Link>
     <Link href="/weddings" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Wedding Services
     </Link>
    </div>
   </section>
  </main>
 );
}
