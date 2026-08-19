import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import VastuClient from './VastuClient';
import { DISHAS, ROOMS } from '../../../lib/vastu';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

export const metadata: Metadata = {
 title: 'Vastu Shastra Calculator — Free 8-Direction Room Placement Scorer',
 description:
  'Free Vastu Shastra calculator. Score every room placement (pooja, kitchen, master bedroom, toilet, water tank, entrance) across 8 dishas per Mayamatam + Vishwakarma Prakash + Brihat Samhita. Detects Vastu doshas + suggests ideal layout. Pure direction-based, no birth data.',
 alternates: { canonical: `${BASE_URL}/astrology/vastu` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Vastu Shastra Calculator — Free 8-Direction Scorer',
  description: 'Score room placements across 8 dishas. Detect Vastu doshas. Per Mayamatam + Brihat Samhita.',
  url: `${BASE_URL}/astrology/vastu`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Vastu Shastra?',
  a: 'Vastu Shastra (वास्तु शास्त्र) is the classical Indian science of architecture and spatial arrangement, codified in texts such as Mayamatam, Vishwakarma Prakash, Manasara, and chapters of Brihat Samhita (Varahamihira, 6th century CE). It maps each of the 8 cardinal + intercardinal directions (dishas) to a presiding deity, ruling planet, and one of the five elements (pancha mahabhuta) — and prescribes which household functions belong in which zone. The principle: when each room sits in its harmonious zone, the energy field of the dwelling supports the inhabitants’ health, wealth, and dharma. When rooms sit in clashing zones, the result is termed Vastu dosha and manifests as obstacles in that area of life.',
 },
 {
  q: 'How does the scoring work?',
  a: 'For each room you select, the chosen direction is matched against the room’s ideal / acceptable / avoid lists from classical Vastu texts. Ideal placement adds +40, acceptable +20, neutral −10, avoid −50. A baseline of +50 is added and the result is clamped 0–100. Verdicts: ≥80 excellent (ideal direction), ≥65 good (acceptable secondary), ≥45 acceptable (workable), below = avoid (Vastu dosha). The overall score is the mean across all rooms checked.',
 },
 {
  q: 'Which directions are the most auspicious?',
  a: 'North-East (Ishanya कोण) is the most sacred zone — ruled by Ishana (Shiva) and Jupiter, element water. The pooja room, water tank, borewell, and main spiritual focus belong here. North (Kubera, wealth) and East (Indra, sunrise) are next most auspicious — best for entrances, living rooms, and study. South-West (Niruti) is the heaviest, most stable zone — master bedroom and heavy storage. The fiercest doshas come from putting light-energy rooms (pooja, water) in heavy-energy zones (SW, S) or heavy-energy rooms (toilet, septic, storage) in light-energy zones (NE, E).',
 },
 {
  q: 'What is the single worst Vastu dosha?',
  a: 'A toilet in the North-East corner. NE is the sacred Ishan kona — meant to receive cosmic water-and-spiritual energy. A toilet there corrupts the entire household’s wealth, health, and spiritual prana. Classical texts call it the cause of "vansha-nasha" (lineage destruction). The remedy if structural change is impossible: keep the toilet permanently closed when not in use, install a copper pyramid + Vastu yantra on the affected wall, and never store water-storage vessels in the SW.',
 },
 {
  q: 'Where should the kitchen be placed?',
  a: 'The kitchen belongs in the South-East (Agneya कोण) — Agni’s fire zone, ruled by Venus. Cook facing East while standing at the stove. The North-West is the acceptable secondary (Vayu zone aids airflow for cooking smoke). Avoid kitchen in North-East (douses sacred fire with water), South-West (clashes with sleeping zone), or the centre (Brahmasthan — must stay open). A kitchen in the NE is said to "burn household wealth" — a documented Vastu dosha across Mayamatam + modern practitioners.',
 },
 {
  q: 'Can I fix a Vastu dosha without breaking walls?',
  a: 'In most cases yes. A Vastu pandit can prescribe remedies such as: (a) Vastu yantra placement on the affected wall; (b) colour correction (yellow for NE shortage, red for SE deficiency); (c) mirror placement to extend a missing corner; (d) copper or brass pyramid in the dosha zone; (e) salt-water bowl in SW for heavy stagnation; (f) tulsi or money-plant in NE; (g) image of Ganesh or Kuber placed in the affected direction. Structural correction (moving a wall, sealing a door, adding a window) is the strongest remedy but rarely necessary for routine doshas.',
 },
 {
  q: 'Does Vastu work in apartments and high-rise flats?',
  a: 'Yes — the 8-direction principle applies to any enclosed space, regardless of how many floors are above or below. Use the main door of your individual flat as the reference for facing direction; measure all room placements relative to the centre of your flat (not the centre of the whole building). The major dishas (NE pooja, SE kitchen, SW master bedroom, NW toilet/guest) apply unchanged. Practical limits: in a small studio you may need to combine functions in a single zone — prioritize pooja-room location and toilet-direction first, since these have the strongest karmic weight.',
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
  { '@type': 'ListItem', position: 3, name: 'Vastu', item: `${BASE_URL}/astrology/vastu` },
 ],
};

const APP_LD = {
 '@context': 'https://schema.org',
 '@type': 'WebApplication',
 name: 'Vastu Shastra Calculator — Darshya',
 url: `${BASE_URL}/astrology/vastu`,
 applicationCategory: 'LifestyleApplication',
 operatingSystem: 'Any',
 offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
 description: 'Free 8-direction Vastu Shastra room placement scorer per Mayamatam + Vishwakarma Prakash + Brihat Samhita. Detects Vastu doshas + suggests ideal layout.',
};

export default function VastuPage() {
 return (
  <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREAD_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_LD) }} />

   <nav className="text-xs text-gray-500">
    <Link href="/" className="hover:text-saffron-700">Home</Link>
    {' · '}
    <Link href="/astrology" className="hover:text-saffron-700">Astrology</Link>
    {' · '}
    <span className="text-gray-700">Vastu</span>
   </nav>

   <header className="mt-4 text-center">
    <p className="text-xs uppercase tracking-widest text-saffron-600">वास्तु शास्त्र · Vastu Shastra Calculator</p>
    <h1 className={`${H1.catalogue} mt-1`}>Vastu Calculator — 8-Direction Room Scorer</h1>
    <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
     Pick the direction your home faces, then place each room in a disha. We score every placement
     against classical Vastu texts (Mayamatam, Vishwakarma Prakash, Brihat Samhita) and flag any Vastu doshas.
    </p>
   </header>

   <div className="mt-8">
    <VastuClient />
   </div>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">8 dishas — direction reference</h2>
    <p className="mt-2 text-sm text-gray-700">
     Each direction (disha) has a presiding deity, ruling planet, and one of the five mahabhuta (elements). Room placement matches the room’s nature to the disha’s element.
    </p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
     {DISHAS.map((d) => (
      <div key={d.code} className={`rounded-xl border-2 p-4 ${
       d.nature === 'auspicious' ? 'border-emerald-300 bg-emerald-50/40'
       : d.nature === 'fierce' ? 'border-rose-300 bg-rose-50/40'
       : 'border-gray-300 bg-gray-50/40'
      }`}>
       <p className="font-serif text-base font-semibold text-gray-900">{d.name} <span className="text-saffron-700">({d.sanskrit})</span></p>
       <p className="mt-1 text-xs text-gray-700">Deity: <strong>{d.deity}</strong></p>
       <p className="text-xs text-gray-700">Planet: <strong>{d.planet}</strong></p>
       <p className="text-xs text-gray-700">Element: <strong>{d.element}</strong></p>
       <p className="mt-2 text-xs leading-relaxed text-gray-600">{d.significance}</p>
      </div>
     ))}
    </div>
   </section>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">15 supported room types</h2>
    <p className="mt-2 text-sm text-gray-700">
     Each room has shastric ideal / acceptable / avoid directions. Click any room above to add it to your calculation.
    </p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
     {ROOMS.map((r) => (
      <div key={r.value} className="rounded-xl border border-saffron-200 bg-saffron-50/40 p-4">
       <p className="font-serif text-sm font-semibold text-gray-900">{r.label} <span className="text-saffron-700">{r.sanskrit}</span></p>
       <div className="mt-2 flex flex-wrap gap-1 text-xs">
        {r.ideal.map((d) => <span key={`i-${d}`} className="rounded-full bg-emerald-200 px-2 py-0.5 text-emerald-900">✓ {d}</span>)}
        {r.acceptable.map((d) => <span key={`a-${d}`} className="rounded-full bg-amber-200 px-2 py-0.5 text-amber-900">~ {d}</span>)}
        {r.avoid.map((d) => <span key={`x-${d}`} className="rounded-full bg-rose-200 px-2 py-0.5 text-rose-900">✗ {d}</span>)}
       </div>
       <p className="mt-2 text-xs leading-relaxed text-gray-600">{r.shastra}</p>
      </div>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-amber-300 bg-amber-50/60 p-6">
    <h2 className="font-serif text-xl text-gray-900">How Vastu scoring works</h2>
    <ul className="mt-3 space-y-2 text-sm leading-relaxed text-gray-700">
     <li><strong>Ideal direction</strong> — primary placement from classical texts. +40 to room score.</li>
     <li><strong>Acceptable secondary</strong> — workable alternate per shastra. +20.</li>
     <li><strong>Avoid (dosha)</strong> — direct clash with disha’s nature. −50 — flagged as Vastu dosha needing remedy.</li>
     <li><strong>Neutral</strong> — direction not listed for this room. −10, workable but not optimal.</li>
     <li><strong>Baseline + clamp</strong> — final score 0–100, then verdict: ≥80 excellent / ≥65 good / ≥45 acceptable / below = avoid.</li>
    </ul>
   </section>

   <section className="mt-12">
    <h2 className="font-serif text-2xl text-gray-900">Frequently asked questions</h2>
    <div className="mt-5 space-y-3">
     {FAQS.map((f, i) => (
      <details key={i} className="group rounded-xl border border-saffron-200 bg-white/80 p-4 open:border-saffron-400">
       <summary className="cursor-pointer list-none font-serif text-base font-semibold text-gray-900 group-open:text-saffron-700">
        {f.q}
       </summary>
       <p className="mt-2 text-sm leading-relaxed text-gray-700">{f.a}</p>
      </details>
     ))}
    </div>
   </section>

   <section className="mt-12 rounded-2xl border border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
    <p className="font-serif text-lg text-gray-900">Want a Vastu pandit to inspect your floor plan?</p>
    <p className="mt-2 text-sm text-gray-700">
     This calculator flags doshas. A pandit prescribes specific remedies (yantra, colour correction, mirror, copper pyramid) tailored to your dwelling without structural change.
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-3">
     <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
      Ask a Vastu Pandit
     </Link>
     <Link href="/astrology/shubh-muhurat" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Shubh Muhurat
     </Link>
     <Link href="/astrology/kundli" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
      Kundli
     </Link>
    </div>
   </section>
  </main>
 );
}
