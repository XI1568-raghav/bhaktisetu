import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import PitraDoshClient from './PitraDoshClient';
import { PITRA_DOSH_TYPES, UNIVERSAL_REMEDIES } from '../../../lib/pitra-dosh';
import { buttonClass } from '../../../components/ui/button-recipe';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: 'Pitra Dosha Calculator — 5 Types, 30 Symptoms, 18 Remedies | Free Vedic',
 description:
  'Free Pitra Dosh analyser per Brihat Parashara. 5 dosh types (Surya / Chandra / Rahu / Ketu / Guru Pitra Dosh) — symptoms across 6 life areas (progeny, marriage, wealth, health, family, career), karmic causes per Garuda Purana, 30+ household + temple remedies — Pind Daan at Gaya, Narayan Nagbali at Trimbakeshwar, Pitru Paksha tarpan, peepal water, feed-the-five. No birth chart needed for symptom check.',
 alternates: { canonical: `${BASE_URL}/astrology/pitra-dosh` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Pitra Dosha Calculator — Symptom Checker + 30 Remedies',
  description: 'Free analyser: pick your life problem → identify which of 5 Pitra Dosh patterns likely affects you → get prescribed remedies.',
  url: `${BASE_URL}/astrology/pitra-dosh`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Pitra Dosha in Vedic astrology?',
  a: 'Pitra Dosha is ancestral karma debt indicated by specific Sun / Moon / Rahu / Ketu / Jupiter placements in the birth chart (especially 5th, 9th houses). It manifests as repeated obstacles in progeny, marriage, wealth, or family — patterns that recur across generations without medical or external cause. Brihat Parashara Hora Shastra and Garuda Purana are the primary classical references.',
 },
 {
  q: 'How do I know if I have Pitra Dosha without a kundli?',
  a: 'Use our symptom checker above. Pick your most pressing life concern (progeny, marriage, wealth, health, family, career). If 3+ of the indicators match, your kundli likely shows one of the 5 Pitra Dosh patterns. A pandit-led kundli analysis confirms which specific graha combination is active.',
 },
 {
  q: 'What is the most powerful Pitra Dosh remedy?',
  a: 'Pind Daan at Gaya (Vishnu Padam Temple, Bihar) is classically considered the supreme remedy — performed once in lifetime, it is said per Vayu Purana to settle ancestral dosh for the current and next seven generations. Narayan Nagbali at Trimbakeshwar (3-day Vedic puja) is the most powerful continuous-residence remedy.',
 },
 {
  q: 'When is the best time to do Pitra Dosh remedies?',
  a: 'Pitru Paksha (Bhadrapad Krishna Paksha, mid-Sep to early-Oct annually) is the most potent 16-day window. Within Pitru Paksha, Mahalaya Amavasya is supreme. Year-round, every amavasya is auspicious for tarpan. Saturdays are best for peepal-tree offerings.',
 },
 {
  q: 'Can household remedies alone cure Pitra Dosh?',
  a: 'Mild Pitra Dosh often responds well to consistent household remedies — daily tarpan, peepal water, feeding cows and crows, Pitru Paksha shradh. Severe dosh (Surya / Rahu Pitra Dosh) usually requires at least one major temple-based ritual (Gaya, Trimbakeshwar, Pushkar, or Kashi) for full resolution.',
 },
 {
  q: 'I don&apos;t know my ancestors&apos; details — can I still do shradh?',
  a: 'Yes. Sankalpa during tarpan can address "all known and unknown ancestors of paternal and maternal line" (vidita-avidita pitra). Even without specific names, sincere intention plus correct procedure satisfies Garuda Purana requirements. A pandit at Gaya / Pushkar will guide the sankalpa wording.',
 },
 {
  q: 'Why feed crows and dogs as part of Pitra Dosh remedy?',
  a: 'Per Garuda Purana, ancestors are said to take subtle form of crows during Pitru Paksha to receive offerings. Dogs are vehicles of Yama. Pancha-bali (5-portion offering: cow, dog, crow, brahmin, stranger) on amavasya completes the ancestor-feeding cycle prescribed in dharma shastras.',
 },
 {
  q: 'Does Pitra Dosha affect only Hindus?',
  a: 'The astrological mechanism — specific graha placements indicating ancestral patterns — is universal in Jyotisha. The remedies are Vedic / Hindu. Anyone with an ancestral lineage carrying unfinished karmic patterns can benefit from the underlying principle of honouring ancestors, regardless of religion.',
 },
];

const FAQ_LD = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 mainEntity: FAQS.map((f) => ({
  '@type': 'Question',
  name: f.q,
  acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/&apos;/g, "'") },
 })),
};

const BREADCRUMB_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Astrology', item: `${BASE_URL}/astrology` },
  { '@type': 'ListItem', position: 3, name: 'Pitra Dosha', item: `${BASE_URL}/astrology/pitra-dosh` },
 ],
};

const WEBAPP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Pitra Dosha Calculator',
 url: `${BASE_URL}/astrology/pitra-dosh`,
 applicationCategory: 'LifestyleApplication',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 operatingSystem: 'Web',
};

export default function PitraDoshPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBAPP_LD) }} />

   <main>
    <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
     <nav className="text-xs text-gray-600">
      <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
      <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link> · <span className="text-gray-900">Pitra Dosha</span>
     </nav>

     <header className="mt-4 text-center">
      <p className="text-xs uppercase tracking-wider text-saffron-600">Free ancestral karma analyser</p>
      <h1 className={`${H1.catalogue} mt-1`}>Pitra Dosha Calculator</h1>
      <p className="mt-2 text-sm text-saffron-700">पितृ दोष निवारण</p>
      <p className="mx-auto mt-3 max-w-2xl prose-body text-gray-700">
       Pitra Dosha = ancestral karma debt. Identified through Sun / Moon / Rahu / Ketu / Jupiter
       placements per Brihat Parashara. Manifests as repeated obstacles in progeny, marriage,
       wealth, or family — patterns that recur across generations. Use the symptom checker below
       — no birth chart needed.
      </p>
     </header>
    </section>

    <PitraDoshClient />

    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">6 Universal remedies — work for all 5 dosh types</h2>
     <p className="mt-1 text-sm text-gray-700">
      These remedies bypass needing a kundli analysis. Per Garuda Purana, sincere intent + correct
      procedure satisfies pitra. Start with #1 (Pitru Paksha) — biggest annual window.
     </p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {UNIVERSAL_REMEDIES.map((r, i) => (
       <div key={r.title} className="rounded-2xl border-2 border-saffron-200 bg-gradient-to-br from-white to-saffron-50 p-5">
        <p className="text-xs uppercase tracking-wider text-saffron-700">Remedy #{i + 1}</p>
        <p className="mt-1 font-serif text-lg text-gray-900">{r.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: r.detail }} />
       </div>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">5 Pitra Dosh patterns at a glance</h2>
     <div className="mt-4 overflow-x-auto rounded-2xl border border-saffron-200">
      <table className="w-full text-sm">
       <thead className="bg-saffron-50 text-left text-xs uppercase tracking-wider text-saffron-800">
        <tr>
         <th className="px-4 py-3">Dosh type</th>
         <th className="px-4 py-3">Graha</th>
         <th className="px-4 py-3">Houses</th>
         <th className="px-4 py-3">Severity</th>
         <th className="px-4 py-3">Affects</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-saffron-100 text-gray-700">
        {PITRA_DOSH_TYPES.map((d) => (
         <tr key={d.slug}>
          <td className="px-4 py-3 font-semibold text-gray-900">{d.name}<br /><span className="text-xs font-normal text-saffron-700">{d.sanskrit}</span></td>
          <td className="px-4 py-3 text-xs">{d.grahaCombination}</td>
          <td className="px-4 py-3 text-xs">{d.housesInvolved.join(', ')}</td>
          <td className="px-4 py-3 text-xs capitalize">{d.severity}</td>
          <td className="px-4 py-3 text-xs capitalize">{d.primaryAreas.join(', ')}</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">FAQs about Pitra Dosha</h2>
     <div className="mt-6 space-y-3">
      {FAQS.map((f) => (
       <details key={f.q} className="rounded-2xl border border-saffron-200 bg-white p-5">
        <summary className="cursor-pointer font-serif text-base font-semibold text-gray-900">{f.q}</summary>
        <p className="mt-3 text-sm leading-relaxed text-gray-700" dangerouslySetInnerHTML={{ __html: f.a }} />
       </details>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a pandit to confirm + customise remedies?</p>
      <p className="mt-2 text-sm text-gray-700">
       The symptom checker gives a strong hint. A verified Vedic astrologer analyses your full kundli,
       current dasha, and ancestral history to prescribe the exact Pitra Dosh nivaran karma for you.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
        Ask a Pandit Live
       </Link>
       <Link href="/astrology" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        ← All 16 free tools
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
