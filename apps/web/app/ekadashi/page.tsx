import type { Metadata } from 'next';
import Link from 'next/link';
import { EKADASHIS, EKADASHI_GROUPS, getEkadashi } from '../../lib/ekadashis';
import { buttonClass } from '../../components/ui/button-recipe';
import { H1 } from '../../components/ui/heading-recipe';

const BASE_URL = 'https://darshya.online';

export const revalidate = 86400;

export const metadata: Metadata = {
 title: '24 Ekadashi Vratas — Names, Stories, Fasting Rules & Mantras',
 description:
  'Complete guide to all 24 Ekadashi vratas of the Hindu lunar year — Utpanna, Mokshada, Nirjala, Devshayani, Devuthani, Indira & more. Each fast\'s presiding deity, story (Padma Purana), permitted foods, mantras, benefits & who should observe.',
 alternates: { canonical: `${BASE_URL}/ekadashi` },
 openGraph: {
  images: ['/images/golden-temple-og.jpg'],
  title: '24 Ekadashis — Complete Vrat Guide',
  description: 'Names, stories, fasting rules & mantras for all 24 Ekadashi vratas.',
  url: `${BASE_URL}/ekadashi`,
  type: 'website',
 },
};

const FAQS = [
 {
  q: 'What is Ekadashi and how many are there?',
  a: 'Ekadashi is the 11th tithi (lunar day) of each fortnight. There are 2 per month (Shukla + Krishna paksha), totaling 24 unique Ekadashis through the year. Each has a distinct name, presiding deity, story (mostly Padma Purana), and specific benefit. Adhik Maas adds 2 more in a leap year (26 total).',
 },
 {
  q: 'What can I eat on Ekadashi?',
  a: 'Two paths: nirjala (no food, no water — strictest) OR phalahara (fruits, milk, sabudana, kuttu flour, potato, sendha namak). Strictly forbidden: rice, all grains (wheat, dal), onion, garlic, honey, sleeping during day. Break fast next morning after Vishnu puja during Dwadashi tithi.',
 },
 {
  q: 'Why is Nirjala Ekadashi called the most powerful?',
  a: 'Nirjala (waterless, in jyeshtha/June-July) is observed without even water for 24+ hours. Per Padma Purana, Bhima asked Vyasa for a single fast equivalent to all 24 — Vyasa prescribed Nirjala. So if you observe ONLY one Ekadashi in the year, this is the one. Extremely hard physically — not for elderly, pregnant, sick, or diabetic.',
 },
 {
  q: 'What is Mokshada Ekadashi and why is it Gita Jayanti?',
  a: 'Mokshada (margashirsha shukla, December) is the day Krishna spoke the Bhagavad Gita to Arjuna on the Kurukshetra battlefield 5,000+ years ago. Observing this Ekadashi grants moksha to deceased ancestors AND merit equivalent to reading the entire Gita. Devotees also read Gita Chapter 1 or full text on this day.',
 },
 {
  q: 'How does Indira Ekadashi help ancestors?',
  a: 'Indira (ashvin krishna, Pitru Paksha period) is specifically prescribed for ancestors stuck in lower realms (preta-loka or naraka). Per Padma Purana, King Indrasena observed it on Narada\'s advice to liberate his deceased father — and succeeded. Most Pitru Paksha rituals (shraddha + tarpan) culminate in this Ekadashi fast.',
 },
 {
  q: 'What are Devshayani and Devuthani Ekadashis?',
  a: 'Devshayani (ashadha shukla, July) = Vishnu goes to sleep on Sheshanaga. Devuthani (kartik shukla, November) = Vishnu wakes after 4 months. The 4-month gap = Chaturmasya, when no Hindu weddings, no major auspicious ceremonies. Devuthani marks the return of muhurats — wedding season officially restarts.',
 },
 {
  q: 'Can householders with families observe Ekadashi?',
  a: 'Yes — Ekadashi is one of the most householder-safe vratas. Phalahara path is gentle (fruits + milk only) and doesn\'t require renunciation or special initiation. Many families observe together with simpler "no grains" version. Even partial observance (no rice for the day) is considered meritorious per shastra.',
 },
 {
  q: 'I have diabetes / pregnancy / illness — should I fast?',
  a: 'No. Per dharma shastra, vrata that endangers health is forbidden — body is the vehicle of dharma. Substitute: chant Vishnu\'s 1000 names (Vishnu Sahasranama), read Bhagavad Gita verses, donate to a Vishnu temple, or feed a brahmin on Ekadashi day. Intent + alternative seva carry full merit. Consult doctor + family priest.',
 },
];

const breadcrumbLd = {
 '@context': 'https://schema.org',
 '@type': 'BreadcrumbList',
 itemListElement: [
  { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
  { '@type': 'ListItem', position: 2, name: 'Ekadashi Vratas', item: `${BASE_URL}/ekadashi` },
 ],
};

const itemListLd = {
 '@context': 'https://schema.org',
 '@type': 'ItemList',
 name: '24 Ekadashi Vratas',
 numberOfItems: EKADASHIS.length,
 itemListElement: EKADASHIS.map((e, idx) => ({
  '@type': 'ListItem',
  position: idx + 1,
  url: `${BASE_URL}/ekadashi/${e.slug}`,
  name: e.name,
 })),
};

const collectionLd = {
 '@context': 'https://schema.org',
 '@type': 'CollectionPage',
 name: '24 Ekadashi Vratas — Complete Guide',
 description: 'All 24 Ekadashi fasts of the Hindu lunar year with stories, fasting rules, mantras & benefits.',
 url: `${BASE_URL}/ekadashi`,
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

export default function EkadashiIndexPage() {
 return (
  <>
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionLd) }} />
   <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

   <main>
    <section className="bg-gradient-to-br from-saffron-50 via-amber-50 to-saffron-100">
     <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <nav className="text-xs text-gray-600">
       <Link href="/" className="hover:text-saffron-700">Home</Link> ·{' '}
       <span className="text-gray-900">Ekadashi Vratas</span>
      </nav>
      <h1 className={`${H1.marketing} mt-3`}>
       24 Ekadashi Vratas
      </h1>
      <p className="mt-2 font-serif text-lg text-saffron-700">एकादशी व्रत — Vishnu&apos;s Fortnightly Fast</p>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-700">
       Every fortnight on the 11th tithi (lunar day), Vaishnavas observe Ekadashi vrata —
       fast dedicated to Vishnu. 24 unique Ekadashis per year, each with its own story,
       presiding deity, and specific benefit. Padma Purana &amp; Brahma Vaivarta Purana
       narrate the origin of every Ekadashi through tales told by Krishna to Yudhishthira,
       Vyasa to Bhima, and Narada to King Indrasena.
      </p>
      <p className="mt-3 text-sm text-gray-600">
       Most gentle of all major vratas — householder-safe, no initiation required, full
       merit via phalahara (fruits) path.
      </p>
     </div>
    </section>

    {EKADASHI_GROUPS.map((group) => (
     <section key={group.name} className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h2 className="font-serif text-2xl text-gray-900">{group.name}</h2>
      <p className="mt-2 text-sm text-gray-700">{group.description}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
       {group.forms.map((slug) => {
        const e = getEkadashi(slug)!;
        return (
         <Link
          key={slug}
          href={`/ekadashi/${e.slug}`}
          className="group rounded-2xl border-2 border-saffron-200 bg-white p-5 transition hover:border-saffron-400 hover:shadow-md"
         >
          <p className="text-xs uppercase tracking-wider text-saffron-600">#{e.order} · {e.paksha} {e.masa}</p>
          <h3 className="mt-1 font-serif text-xl font-semibold text-gray-900 group-hover:text-saffron-700">
           {e.name}
          </h3>
          <p className="mt-1 text-sm text-saffron-700">{e.sanskrit}</p>
          <p className="mt-2 text-xs text-gray-600">{e.gregorianWindow}</p>
          <p className="mt-3 line-clamp-3 text-sm text-gray-700">{e.storySummary}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
           <span className="rounded-full bg-saffron-50 px-2 py-0.5 text-xs text-saffron-800">
            {e.presidingDeity.split('(')[0]?.trim() ?? ''}
           </span>
          </div>
         </Link>
        );
       })}
      </div>
     </section>
    ))}

    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">All 24 Ekadashis in lunar order</h2>
     <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
       <thead>
        <tr className="border-b-2 border-saffron-300 text-left text-xs uppercase tracking-wider text-saffron-700">
         <th className="px-3 py-2">#</th>
         <th className="px-3 py-2">Name</th>
         <th className="px-3 py-2">Paksha</th>
         <th className="px-3 py-2">Masa</th>
         <th className="px-3 py-2">Window</th>
        </tr>
       </thead>
       <tbody>
        {EKADASHIS.map((e) => (
         <tr key={e.slug} className="border-b border-saffron-100 hover:bg-saffron-50/50">
          <td className="px-3 py-2 text-gray-600">{e.order}</td>
          <td className="px-3 py-2">
           <Link href={`/ekadashi/${e.slug}`} className="font-medium text-saffron-700 hover:text-saffron-900">
            {e.name}
           </Link>
          </td>
          <td className="px-3 py-2 text-gray-700">{e.paksha}</td>
          <td className="px-3 py-2 text-gray-700">{e.masa}</td>
          <td className="px-3 py-2 text-xs text-gray-600">{e.gregorianWindow}</td>
         </tr>
        ))}
       </tbody>
      </table>
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
     <h2 className="font-serif text-2xl text-gray-900">Frequently asked</h2>
     <div className="mt-5 space-y-3">
      {FAQS.map((f) => (
       <details key={f.q} className="group rounded-2xl border border-saffron-200 bg-white p-4">
        <summary className="cursor-pointer font-serif text-base font-semibold text-gray-900 marker:text-saffron-500">
         {f.q}
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-gray-700">{f.a}</p>
       </details>
      ))}
     </div>
    </section>

    <section className="mx-auto max-w-4xl px-4 pb-12 sm:px-6">
     <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50 to-amber-50 p-6 text-center">
      <p className="font-serif text-lg text-gray-900">Want Ekadashi vrata guided by a qualified pandit?</p>
      <p className="mt-2 text-sm text-gray-700">
       Get personalized fasting plan, the correct mantra for your goal, and Vishnu puja
       procedure for breaking fast on Dwadashi morning.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
       <Link href="/ask-pandit" className={buttonClass('primary', 'md')}>
        Ask a Pandit Live
       </Link>
       <Link href="/vrat" className="rounded-full border border-saffron-300 bg-white px-5 py-2 text-sm font-semibold text-saffron-700 hover:bg-saffron-50">
        All vrata traditions
       </Link>
      </div>
     </div>
    </section>
   </main>
  </>
 );
}
