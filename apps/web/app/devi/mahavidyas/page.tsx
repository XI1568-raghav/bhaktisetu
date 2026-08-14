import type { Metadata } from 'next';
import Link from 'next/link';
import { MAHAVIDYAS, MAHAVIDYA_GROUPS, getMahavidya } from '../../../lib/mahavidyas';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: 'Dasa Mahavidya — 10 Tantric Wisdom Goddesses | Kali Tara Sundari Bhuvaneshwari',
 description:
  'Complete guide to all 10 Mahavidyas — Kali, Tara, Tripura Sundari, Bhuvaneshwari, Bhairavi, Chinnamasta, Dhumavati, Bagalamukhi, Matangi, Kamala. Origin story, iconography, mantras, sadhana, householder cautions per Devi Bhagavata + Brihad Nila Tantra.',
 alternates: { canonical: `${BASE_URL}/devi/mahavidyas` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: 'Dasa Mahavidya — 10 Tantric Wisdom Goddesses',
  description: 'All 10 Mahavidyas — origin, iconography, mantras, sadhana goal, householder cautions.',
  url: `${BASE_URL}/devi/mahavidyas`,
  type: 'website',
 },
};

const FAQS: { q: string; a: string }[] = [
 {
  q: 'What are the 10 Mahavidyas?',
  a: 'The Dasa Mahavidya are 10 cosmic forms of the Adi-Shakti revealed in tantric scripture — Kali, Tara, Tripura Sundari (Shodashi), Bhuvaneshwari, Bhairavi, Chinnamasta, Dhumavati, Bagalamukhi, Matangi and Kamala. They emerged when Sati blocked Shiva\'s exit in 10 directions during the Daksha-yajna crisis. Each represents one aspect of cosmic wisdom — from time-destruction (Kali) to abundance (Kamala).',
 },
 {
  q: 'What is the difference between Ugra and Saumya Mahavidyas?',
  a: 'The 10 Mahavidyas split into 2 lines. Ugra (fierce, krodha) line — Kali, Tara, Bhairavi, Chinnamasta, Dhumavati — work through destruction of ego, traditionally for sannyasis with guru initiation. Saumya (auspicious, shanti) line — Tripura Sundari, Bhuvaneshwari, Bagalamukhi, Matangi, Kamala — work through love and abundance, safe for householders.',
 },
 {
  q: 'Which Mahavidyas are safe for householders to worship?',
  a: 'Kamala (lotus goddess, tantric Lakshmi) is safest — pure auspiciousness, no restrictions. Tripura Sundari (Sri Vidya), Bhuvaneshwari, Bagalamukhi and Matangi are householder-friendly with mantra japa only. The 5 Ugra forms (Kali, Tara, Bhairavi, Chinnamasta, Dhumavati) need qualified guru initiation for full sadhana — householders limit to the namah-mantra and namaskar.',
 },
 {
  q: 'What is the connection between Mahavidyas and Navadurga?',
  a: 'Navadurga (9 forms of Durga across Navratri nights) is the Vedic-Puranic Shakta tradition. Mahavidyas (10 tantric wisdom goddesses) is the esoteric Tantra-Shakta tradition. Both arose from the same Adi-Shakti. Kalaratri (Navadurga Day 7) overlaps closely with Mahavidya Kali. Mahagauri (Day 8) shares traits with Tripura Sundari. Mahavidyas are worshipped during the 2 Gupt Navratris (Magha and Ashadha), Navadurga during Sharad and Chaitra Navratris.',
 },
 {
  q: 'What is Sri Vidya and which Mahavidya does it worship?',
  a: 'Sri Vidya is the supreme tantric tradition centred on Tripura Sundari (the 3rd Mahavidya). Practitioners worship the Sri Yantra — the most sacred geometric meditation device in Tantra — and chant the 15-syllable Panchadashi mantra. It is the only major tantric path explicitly approved for householders without renunciation. South India\'s Kanchi Kamakshi, Madurai Meenakshi and Mahalakshmi temples are all Sri Vidya shrines.',
 },
 {
  q: 'When are Mahavidyas worshipped during Gupt Navratri?',
  a: 'The 2 Gupt (hidden) Navratris — Magha Gupt Navratri (January-February) and Ashadha Gupt Navratri (June-July) — are dedicated to esoteric Mahavidya sadhana, unlike the public Sharad and Chaitra Navratris which celebrate Navadurga. During Gupt Navratri, advanced sadhakas worship one Mahavidya per night across 9 nights (Kamala traditionally included as the 10th day extension).',
 },
 {
  q: 'Why is Dhumavati shown as a widow?',
  a: 'Dhumavati is the only widowed Mahavidya, representing the void state of cosmos at pralaya (cosmic dissolution). Her smoky grey body and missing teeth symbolise transcendence beyond all dualities, beauty and decay. Married women and children traditionally do not worship her at home — she is reserved for widows, sannyasis and advanced sadhakas seeking realisation of shunyata (void).',
 },
 {
  q: 'Can I worship Kamala safely without initiation?',
  a: 'Yes — Kamala (10th Mahavidya, tantric form of Lakshmi) is the safest for all householders. No special restrictions, no initiation required. Worship her on Fridays and Diwali with pink/red flowers, lotus offerings, white sweets, and chant "Om Shrim Hrim Shrim Kamale Kamalalaye prasida Shrim Hrim Shrim Om". Brings all material and spiritual abundance through dharmic effort. Perfect for family, business and fertility intentions.',
 },
];

const breadcrumbLd = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Devi', item: `${BASE_URL}/devi` },
  { '@type': 'ListItem', position: 3, name: 'Dasa Mahavidya', item: `${BASE_URL}/devi/mahavidyas` },
 ],
};

const itemListLd = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 itemListElement: MAHAVIDYAS.map((m, idx) => ({
  '@type': 'ListItem',
  position: idx + 1,
  url: `${BASE_URL}/devi/mahavidyas/${m.slug}`,
  name: `${m.name} — ${m.epithet}`,
 })),
};

const collectionLd = {
 '@context': 'https://schema.org',
 '@type': 'CollectionPage',
 name: 'Dasa Mahavidya — 10 Tantric Wisdom Goddesses',
 description: 'Complete guide to all 10 Mahavidyas with origin, iconography, mantras and sadhana.',
 url: `${BASE_URL}/devi/mahavidyas`,
};

const faqLd = {
 '@context': 'https://schema.org',
 '@type': 'FAQPage',
 mainEntity: FAQS.map((f) => ({
  '@type': 'Question',
  name: f.q,
  acceptedAnswer: { '@type': 'Answer', text: f.a },
 })),
};

export default function MahavidyasPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

   <main>
    <section className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
     <nav className="text-xs text-gray-600">
      <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
      <Link href="/devi" className="hover:text-saffron-700">Devi</Link> ·{' '}
      <span className="text-gray-900">Dasa Mahavidya</span>
     </nav>

     <header className="mt-4 rounded-2xl border-2 border-saffron-200 bg-gradient-to-br from-saffron-50 via-white to-amber-50 p-6">
      <p className="text-xs uppercase tracking-wider text-saffron-600">Tantric Shakta tradition · Gupt Navratri</p>
      <h1 className="mt-1 font-serif text-4xl font-bold text-gray-900">Dasa Mahavidya — 10 Wisdom Goddesses</h1>
      <p className="mt-3 text-base leading-relaxed text-gray-700">
       The 10 cosmic forms of Adi-Shakti revealed in Tantra — from Kali (time-destroyer) to Kamala (abundance-giver).
       Each Mahavidya teaches one face of cosmic wisdom. Split into Ugra (fierce, 5) and Saumya (auspicious, 5) lines.
       Worshipped during the 2 Gupt Navratris and on tithi-specific jayantis through the year.
      </p>
     </header>
    </section>

    {MAHAVIDYA_GROUPS.map((group) => (
     <section key={group.name} className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h2 className="font-serif text-2xl text-gray-900">{group.name}</h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-700">{group.description}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
       {group.forms.map((slug) => {
        const m = getMahavidya(slug)!;
        return (
         <Link
          key={m.slug}
          href={`/devi/mahavidyas/${m.slug}`}
          className="group rounded-2xl border-2 border-saffron-200 bg-white p-5 transition hover:border-saffron-400 hover:shadow-lg"
         >
          <div className="flex items-start gap-3">
           <span
            className="mt-1 inline-block h-10 w-10 flex-shrink-0 rounded-full border-2 border-white shadow"
            style={{ backgroundColor: m.colorHex }}
            aria-label={`Color ${m.colorName}`}
           />
           <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-saffron-600">Mahavidya {m.order}</p>
            <h3 className="mt-0.5 font-serif text-lg text-gray-900 group-hover:text-saffron-700">{m.name}</h3>
            <p className="text-xs text-saffron-700">{m.sanskrit}</p>
           </div>
          </div>
          <p className="mt-3 text-xs italic text-gray-700">{m.epithet}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-700 line-clamp-3">{m.cosmicFunction}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
           <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-xs text-saffron-800">{m.element.split(' ')[0]}</span>
           <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800">{m.worshipDay.split(';')[0]}</span>
          </div>
         </Link>
        );
       })}
      </div>
     </section>
    ))}

    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
     <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-emerald-900">Householder guidance</p>
      <h2 className="mt-1 font-serif text-xl text-emerald-900">Which Mahavidyas can I worship at home?</h2>
      <ul className="mt-3 space-y-2 text-sm text-emerald-900">
       <li>✓ <strong>Kamala</strong> — safest, no restrictions. Friday + Diwali worship.</li>
       <li>✓ <strong>Tripura Sundari</strong> — Lalita Sahasranama path safe without diksha.</li>
       <li>✓ <strong>Bhuvaneshwari</strong> — mantra-only safe for all.</li>
       <li>✓ <strong>Bagalamukhi</strong> — Tuesday yellow worship, mantra-only.</li>
       <li>✓ <strong>Matangi</strong> — mantra-only, art-and-speech intentions.</li>
       <li>⚠ <strong>Kali, Tara, Bhairavi, Chinnamasta</strong> — namah-mantra and namaskar only; full sadhana needs guru.</li>
       <li>✗ <strong>Dhumavati</strong> — never in home shrine; reserved for widows, sannyasis, advanced sadhakas outside the home.</li>
      </ul>
     </div>
    </section>

    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Frequently asked</h2>
     <div className="mt-5 space-y-3">
      {FAQS.map((f) => (
       <details
        key={f.q}
        className="group rounded-xl border border-saffron-200 bg-white p-4 transition hover:border-saffron-300"
       >
        <summary className="cursor-pointer list-none font-serif text-base text-gray-900 group-open:text-saffron-800">
         {f.q}
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{f.a}</p>
       </details>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-5xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-xl text-gray-900">Considering Mahavidya sadhana?</p>
      <p className="mt-2 text-sm text-gray-700">
       A qualified pandit can guide you to the right form based on your intent, gotra and lineage tradition.
       Initiation is required for the fierce-line forms; safe entry points exist for every devotee.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className="rounded-full bg-saffron-600 px-5 py-2 text-sm font-semibold text-white hover:bg-saffron-700">
        Ask a Pandit Live
       </Link>
       <Link href="/devi/navadurga" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        Compare with Navadurga
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
