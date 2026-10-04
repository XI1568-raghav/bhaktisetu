// Free Baby Name by Nakshatra — Vedic Namakaran calculator. Targets
// "baby name by nakshatra", "namakaran by birth star", "vedic baby name
// starting letter", "first letter for baby name nakshatra".
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import BabyNameClient from './BabyNameClient';
import { allNakshatraOptions, NAKSHATRA_PADA_SYLLABLES } from '../../../lib/baby-names';
import { NAKSHATRAS } from '../../../lib/nakshatras';
import { buttonClass } from '../../../components/ui/button-recipe';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Baby Name by Nakshatra — Free Namakaran Calculator (Sanskrit + Vedic)',
 description: 'Free Vedic namakaran calculator. Pick your baby’s birth nakshatra and get the 4 traditional pada-syllables (शास्त्र शुद्ध) plus a curated list of Sanskrit-rooted baby names with meanings, deity, and gender. No signup.',
 alternates: { canonical: `${BASE_URL}/astrology/baby-name` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Baby Name by Nakshatra — Free Namakaran Calculator',
  description: 'Vedic baby names by birth star — 27 nakshatras × 4 padas, full pada-syllable map, curated Sanskrit names. Free, no signup.',
  url: `${BASE_URL}/astrology/baby-name`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is namakaran?',
  a: 'Namakaran (नामकरण) is the Hindu name-giving samskara — one of the sixteen sanskaras described in the Grhya Sutras. Traditionally performed on the 11th or 12th day after birth (some traditions choose the 100th day or first year), the ceremony involves selecting a name whose first syllable aligns with the baby’s birth nakshatra-pada. The chosen syllable is whispered into the baby’s right ear by the father along with the family deity’s blessing.',
 },
 {
  q: 'How does the nakshatra decide the starting letter?',
  a: 'Each of the 27 nakshatras is divided into 4 padas (quarters of 3°20\' each). Per Brihat Samhita and traditional namakaran shastra, each pada governs one specific starting sound (akshar). For example, Ashwini’s 4 padas govern Chu, Che, Cho, and La. The pada in which the moon was located at the moment of birth gives the syllable. Choosing a name with this first sound is believed to harmonize the child’s name-vibration with their birth-moon energy.',
 },
 {
  q: 'What if the baby’s exact birth time is not known?',
  a: 'Without exact birth time, the nakshatra-pada cannot be calculated precisely. Common alternatives: (1) use the family deity (kuldevta) name, (2) use a name from the father’s nakshatra, (3) use a name aligned with the lunar month (masa) of birth, or (4) consult a pandit to derive an approximate nakshatra from sunrise time + birth panchang. The pada-syllable rule is the most precise — never sacrifice accuracy to convenience here.',
 },
 {
  q: 'Are boy and girl names different in namakaran?',
  a: 'The starting-syllable rule applies equally to both genders — pada governs the sound, not the gender. But traditional naming pools differ: boy names often invoke martial / scholarly / kingly deities (Arjun, Vishnu, Indra), while girl names invoke goddesses + qualities (Lakshmi, Saraswati, Radha, Lavanya). Modern families often use unisex names (Aarav, Ananya). The syllable is fixed by nakshatra; gender shapes which name from the available pool feels right.',
 },
 {
  q: 'What about master nakshatras like Gandanta?',
  a: 'When a baby is born in the junction (sandhi) between water and fire signs — specifically the last pada of Revati / Ashlesha / Jyeshtha or the first pada of Ashwini / Magha / Mula — this is called Gandanta nakshatra. The transition is considered delicate karmically. Traditional remedies include extra shanti puja before namakaran, and choosing names invoking protective deities (Hanuman, Durga, Ganesha). Always consult a pandit if your baby is Gandanta-born.',
 },
 {
  q: 'Should I consult a pandit even after using this tool?',
  a: 'This tool gives you the shastra-correct starting-syllable + a curated Sanskrit name pool. But the final namakaran involves more layers — name-number numerology compatibility, family deity (kuldevta) tradition, parents’ nakshatra harmony, planetary balance in the baby’s kundli, and the auspicious muhurat to whisper the name. A pandit-namakaran specialist will weave all these together. Use this tool as a starting shortlist, then consult.',
 },
];

export default function BabyNamePage() {
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
   { '@type': 'ListItem', position: 3, name: 'Baby Name by Nakshatra', item: `${BASE_URL}/astrology/baby-name` },
  ],
 };

 const softwareLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Darshya Baby Name by Nakshatra',
  applicationCategory: 'LifestyleApplication',
  operatingSystem: 'Any',
  description: 'Free Vedic namakaran tool — pick birth nakshatra to get the 4 traditional pada-syllables plus curated Sanskrit baby names with meanings.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
  url: `${BASE_URL}/astrology/baby-name`,
 };

 return (
  <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([faqLd, breadcrumb, softwareLd]) }} />

   <nav className="mb-4 text-xs text-gray-500">
    <Link href="/" className="hover:text-gray-800">Home</Link>
    <span className="mx-1.5">›</span>
    <Link href="/astrology" className="hover:text-gray-800">Astrology</Link>
    <span className="mx-1.5">›</span>
    <span className="text-gray-800">Baby Name by Nakshatra</span>
   </nav>

   <header className="mb-8">
    <p className="text-xs uppercase tracking-wider text-saffron-600">Free Vedic tool · no signup</p>
    <h1 className={`${H1.catalogue} mt-1`}>Baby Name by Nakshatra — Free Namakaran (Sanskrit + Vedic)</h1>
    <p className="mt-2 text-saffron-700">नामकरण · Namakaran Sanskara</p>
    <p className="mt-4 text-base text-gray-700">
     Select your baby&rsquo;s birth nakshatra (lunar mansion at the moment of birth) to see the 4
     traditional pada-syllables prescribed by namakaran shastra, along with a curated list of
     Sanskrit-rooted baby names — each with meaning, deity reference, and gender.
    </p>
   </header>

   <BabyNameClient options={options} />

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">All 27 nakshatras × 4 pada syllables</h2>
    <p className="mt-1 text-sm text-gray-600">Reference: each nakshatra and its 4 starting sounds per Brihat Samhita.</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
     {NAKSHATRAS.map((n) => {
      const syls = NAKSHATRA_PADA_SYLLABLES[n.slug];
      if (!syls) return null;
      return (
       <div key={n.slug} className="rounded-xl border border-saffron-200 bg-saffron-50/30 p-4">
        <div className="flex items-baseline justify-between">
         <p className="font-serif text-base font-semibold text-gray-900">{n.name}</p>
         <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{n.lord}</span>
        </div>
        <p className="mt-0.5 text-xs text-saffron-700">{n.sanskritName}</p>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
         {syls.map((sy, i) => (
          <div key={i} className="rounded-md border border-saffron-300 bg-white py-1.5 text-center">
           <p className="text-xs font-semibold text-gray-500">Pada {i + 1}</p>
           <p className="font-serif text-base font-bold text-saffron-700">{sy}</p>
          </div>
         ))}
        </div>
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

   <section className="mt-12 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
    <h2 className="font-serif text-xl text-gray-900">Ready for the full namakaran ceremony?</h2>
    <p className="mt-2 text-sm text-gray-700">
     A pandit will compute your baby&rsquo;s exact nakshatra-pada from birth time + place,
     match the shortlisted names against name-number numerology, kuldevta tradition, and graha
     balance in the baby kundli, then perform the namakaran samskara at the auspicious muhurat.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
      Ask a Pandit Live
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Generate Free Kundli
     </Link>
     <Link href="/astrology/numerology" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Check Name Numerology
     </Link>
     <Link href="/astrology/kundli-milan" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Free Kundli Milan
     </Link>
    </div>
   </section>
  </main>
 );
}
