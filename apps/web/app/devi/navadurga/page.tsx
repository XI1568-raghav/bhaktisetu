import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../../components/ui/heading-recipe';
import Link from 'next/link';
import { NAVADURGA, NAVRATRI_TYPES } from '../../../lib/navadurga';
import { buttonClass } from '../../../components/ui/button-recipe';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: 'Navadurga — 9 Forms of Goddess Durga | Navratri Day-by-Day Guide',
 description:
  'Free Navadurga guide — 9 sacred forms of Maa Durga worshipped through Navratri. Day-by-day: Shailaputri, Brahmacharini, Chandraghanta, Kushmanda, Skandamata, Katyayani, Kalaratri, Mahagauri, Siddhidatri. Each form\'s color, mantra, prasad, flower, mount, blessing & how-to-worship. Per Devi Mahatmya, Markandeya Purana & Devi Bhagavata Purana.',
 alternates: { canonical: `${BASE_URL}/devi/navadurga` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Navadurga — 9 Forms of Durga Worshipped in Navratri',
  description: 'Each of the 9 nights of Navratri honors one form of Durga. Day, color, mantra, prasad — full guide.',
  url: `${BASE_URL}/devi/navadurga`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'Who are the 9 forms of Navadurga?',
  a: 'The Navadurga are 9 manifestations of Goddess Durga worshipped on the 9 nights of Navratri: 1. Shailaputri (daughter of mountain), 2. Brahmacharini (celibate seeker), 3. Chandraghanta (bell-of-moon), 4. Kushmanda (cosmic-egg creator), 5. Skandamata (mother of Kartikeya), 6. Katyayani (warrior daughter of sage Katyayan), 7. Kalaratri (dark destroyer), 8. Mahagauri (supremely fair), 9. Siddhidatri (giver of siddhis). All described in Devi Mahatmya (Chandi Path) and Devi Bhagavata Purana.',
 },
 {
  q: 'Why is each Navadurga form a different color?',
  a: 'Each form is associated with one of the 9 planets (Navagraha) and one chakra in the body. Wearing or offering that color tunes the worshipper to the planet & chakra she rules — Shailaputri=Moon-red, Brahmacharini=Mars-white, Chandraghanta=Venus-blue, Kushmanda=Sun-yellow, Skandamata=Mercury-green, Katyayani=Jupiter-orange, Kalaratri=Saturn-blue/black, Mahagauri=Rahu-pink, Siddhidatri=Ketu-purple.',
 },
 {
  q: 'Which Navadurga form is most powerful?',
  a: 'No form is universally most powerful — each is supreme for its specific blessing. Kalaratri (Day 7) is fiercest for removing fear, black magic and Saturn troubles. Siddhidatri (Day 9) grants spiritual perfections (siddhis). Mahagauri (Day 8) forgives heaviest past karma. Kushmanda (Day 4) heals chronic illness. Most devotees worship all 9 in sequence through Navratri to gain the complete spectrum.',
 },
 {
  q: 'How many Navratris are there in a year?',
  a: 'There are 4 Navratris in the Hindu calendar: Sharad Navratri (autumn, most popular, ends with Vijayadashami), Chaitra Navratri (spring, ends with Rama Navami), Magha Gupt Navratri (winter, secret/tantric), Ashadha Gupt Navratri (monsoon, for advanced sadhakas). The 2 Gupt (secret) Navratris are reserved for tantric Dasa-Mahavidya worship.',
 },
 {
  q: 'Can I worship just one form of Navadurga?',
  a: 'Yes — householders may pick the form best aligned to their need (e.g., Katyayani for marriage, Kushmanda for health, Siddhidatri for moksha) and worship her daily. However during Navratri itself the traditional practice is to honor all 9 in sequence, one per day, even briefly with mantra + color + prasad.',
 },
 {
  q: 'What is Kanya Puja in Navratri?',
  a: 'On Day 8 (Ashtami) or Day 9 (Navami) of Sharad Navratri, devotees invite 9 young girls (aged 2-10, before puberty) and one young boy (representing Bhairava). They are honored as living forms of the 9 Navadurga — feet washed, tilak applied, fed prasad of puri-halwa-channa, and gifted clothes or money. This ritual closes the Navratri sadhana.',
 },
 {
  q: 'Which form removes Shani Sade-Sati troubles?',
  a: 'Kalaratri (Day 7) is the supreme remedy for Shani Sade-Sati and all Saturn-related afflictions — chronic obstacles, sudden losses, prolonged delays, depression. Her ruling planet is Saturn (Shani), her mantra Om Devi Kalaratryai Namah recited 108× at midnight on Saturday during Navratri removes the heaviest Saturn karma.',
 },
 {
  q: 'What is the difference between Durga and the 9 Navadurga forms?',
  a: 'Durga is the supreme Shakti — Adi-Shakti. The 9 Navadurga are her sequential manifestations matching the 9 stages of a devotee\'s journey: grounding (Shailaputri) → tapas (Brahmacharini) → courage (Chandraghanta) → creative power (Kushmanda) → divine motherhood (Skandamata) → warrior justice (Katyayani) → fear-destruction (Kalaratri) → purification (Mahagauri) → siddhi (Siddhidatri). Together they form the complete path of Shakti sadhana.',
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

const BREADCRUMB_LD = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Devi', item: `${BASE_URL}/devi` },
  { '@type': 'ListItem', position: 3, name: 'Navadurga', item: `${BASE_URL}/devi/navadurga` },
 ],
};

const ITEMLIST_LD = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 itemListElement: NAVADURGA.map((n, i) => ({
  '@type': 'ListItem',
  position: i + 1,
  url: `${BASE_URL}/devi/navadurga/${n.slug}`,
  name: `${n.name} (Day ${n.day})`,
 })),
};

const COLLECTION_LD = {
 '@context': 'https://schema.org',
 '@type': 'CollectionPage',
 name: 'Navadurga — 9 Forms of Durga',
 url: `${BASE_URL}/devi/navadurga`,
 description: '9 sacred forms of Goddess Durga worshipped through the 9 nights of Navratri.',
 publisher: { '@type': 'Organization', name: 'Darshya', url: BASE_URL },
};

export default function NavadurgaPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(BREADCRUMB_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ITEMLIST_LD) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(COLLECTION_LD) }} />

   <main>
    <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
     <nav className="text-xs text-gray-600">
      <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
      <Link href="/discover" className="hover:text-saffron-700">Discover</Link> ·{' '}
      <span className="text-gray-900">Navadurga</span>
     </nav>

     <header className="mt-4 text-center">
      <p className="text-xs uppercase tracking-wider text-saffron-600">Free 9-day Navratri guide</p>
      <h1 className={`${H1.catalogue} mt-1`}>Navadurga — 9 Forms of Maa Durga</h1>
      <p className="mt-2 text-sm text-saffron-700">नवदुर्गा · The 9 nights of Shakti</p>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-gray-700">
       9 sequential manifestations of Adi-Shakti, worshipped one per night
       through Navratri. Each form rules a planet, a chakra, and a stage of
       spiritual journey. Per Devi Mahatmya (Chandi Path), Markandeya Purana &amp; Devi Bhagavata Purana.
      </p>
     </header>
    </section>

    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">The 9 forms — day by day</h2>
     <p className="mt-1 text-sm text-gray-700">Tap any form for the full guide — story, mantra, color, prasad, blessing.</p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {NAVADURGA.map((n) => (
       <Link
        key={n.slug}
        href={`/devi/navadurga/${n.slug}`}
        className="group rounded-2xl border-2 border-saffron-200 bg-white p-5 transition hover:scale-[1.02] hover:border-saffron-400"
       >
        <div className="flex items-start justify-between gap-3">
         <div>
          <p className="text-xs uppercase tracking-wider text-saffron-600">Day {n.day}</p>
          <p className="mt-1 font-serif text-xl font-bold text-gray-900">{n.name}</p>
          <p className="text-xs text-saffron-700">{n.sanskrit}</p>
         </div>
         <span
          className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-white shadow"
          style={{ backgroundColor: n.colorHex }}
          aria-label={`Day color ${n.color}`}
         />
        </div>
        <p className="mt-3 text-xs leading-relaxed text-gray-700">{n.meaning}</p>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
         <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-saffron-800">{n.planet}</span>
         <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-800">{n.chakra.split(' ')[0]}</span>
         <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{n.prasad}</span>
        </div>
        <p className="mt-4 text-xs font-semibold text-saffron-700 group-hover:text-saffron-900">View full guide →</p>
       </Link>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">4 Navratris of the year</h2>
     <p className="mt-1 text-sm text-gray-700">The Hindu calendar holds 4 Navratri windows — 2 public, 2 secret (gupt).</p>
     <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {NAVRATRI_TYPES.map((nv) => (
       <div key={nv.name} className="rounded-2xl border border-saffron-200 bg-saffron-50/40 p-5">
        <p className="text-xs uppercase tracking-wider text-saffron-700">{nv.season} · {nv.month}</p>
        <p className="mt-1 font-serif text-lg font-bold text-gray-900">{nv.name}</p>
        <p className="text-xs text-saffron-700">{nv.sanskrit}</p>
        <p className="mt-3 text-sm text-gray-700">{nv.significance}</p>
       </div>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">FAQs about Navadurga &amp; Navratri</h2>
     <div className="mt-6 space-y-3">
      {FAQS.map((f) => (
       <details key={f.q} className="rounded-2xl border border-saffron-200 bg-white p-5">
        <summary className="cursor-pointer font-serif text-base font-semibold text-gray-900">{f.q}</summary>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{f.a}</p>
       </details>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want a personalised Navratri sadhana plan?</p>
      <p className="mt-2 text-sm text-gray-700">
       A Vedic pandit can match the right Navadurga form to your nakshatra,
       graha-position and life-goal — the most powerful 9-day sadhana of the year.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
        Ask a Pandit Live
       </Link>
       <Link href="/pujas" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Book a Navratri puja
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
