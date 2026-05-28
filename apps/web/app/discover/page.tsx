// Topical hub for 27 programmatic-SEO wisdom routes. Pure local data → SSG.
// Crawlers get a strong internal-link hub; users get a searchable index.
import type { Metadata } from 'next';
import Link from 'next/link';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

type DiscoverItem = {
  label: string;
  href: string;
  description: string;
  count?: string;
};

type DiscoverGroup = {
  key: string;
  title: string;
  tagline: string;
  accent: string;
  items: DiscoverItem[];
};

const GROUPS: DiscoverGroup[] = [
  {
    key: 'scriptures',
    title: 'Scriptures',
    tagline: 'Primary texts of Sanatana Dharma — read parva by parva, kanda by kanda.',
    accent: 'indigo',
    items: [
      { label: 'Bhagavad Gita', href: '/gita', description: 'Krishna’s 700-verse counsel to Arjuna on the Kurukshetra battlefield.', count: '18 chapters' },
      { label: 'Valmiki Ramayana', href: '/ramayana', description: 'The story of Rama, Sita and Hanuman — India’s older epic.', count: '7 kandas' },
      { label: 'Vyasa Mahabharata', href: '/mahabharata', description: 'The world’s longest epic — Kuru dynasty, dharma in collision with itself.', count: '18 parvas' },
      { label: 'Principal Upanishads', href: '/upanishads', description: 'Vedantic dialogues — the philosophical climax of the Vedas.', count: '10 texts' },
      { label: 'The Four Vedas', href: '/vedas', description: 'Rig, Yajur, Sama, Atharva — the oldest extant Hindu scriptures.', count: '4 Vedas' },
      { label: 'Mahapuranas', href: '/puranas', description: 'Cosmology, dynasties, deity biographies and devotional narratives.', count: '18 Puranas' },
      { label: 'Six Darshanas', href: '/darshanas', description: 'Nyaya, Vaisheshika, Samkhya, Yoga, Mimamsa, Vedanta — orthodox systems.', count: '6 schools' },
      { label: 'Patanjali Yoga Sutras', href: '/yoga-sutras', description: 'The eight-limbed path to samadhi in 196 aphorisms.', count: '4 padas' },
    ],
  },
  {
    key: 'cosmology',
    title: 'Cosmology',
    tagline: 'Stars, planets, lunar mansions and avatar lineages — the celestial frame.',
    accent: 'amber',
    items: [
      { label: 'Nakshatras', href: '/nakshatra', description: 'The 27 lunar mansions with lord, deity, gana, qualities, career and compatibility.', count: '27 mansions' },
      { label: 'Rashis (Zodiac)', href: '/rashi', description: 'The 12 Vedic zodiac signs with element, lord, lucky days, gems and mantras.', count: '12 signs' },
      { label: 'Nava-Graha', href: '/nava-graha', description: 'The nine astrological planets — characteristics, mantras and remedial pujas.', count: '9 planets' },
      { label: 'Dashavatar', href: '/dashavatar', description: 'The ten descents of Vishnu from Matsya to the future Kalki.', count: '10 avatars' },
      { label: 'Sapta Rishis', href: '/sapta-rishis', description: 'The seven primordial sages who anchor Vedic lineage.', count: '7 rishis' },
    ],
  },
  {
    key: 'practice',
    title: 'Practice',
    tagline: 'Chants, vows, sacred timings, pilgrimage routes and life-stage rites.',
    accent: 'emerald',
    items: [
      { label: 'Famous Chants', href: '/chants', description: 'Gayatri, Mahamrityunjaya, Hanuman Chalisa and other standalone Sanskrit mantras with how-to-recite guides.', count: '12 chants' },
      { label: 'Vrats Guide', href: '/vrat', description: 'Ekadashi, Pradosh, Mangalvar and other fasting traditions with permitted foods and ritual steps.', count: '10 vrats' },
      { label: 'Muhurat Guide', href: '/muhurat', description: 'Brahma Muhurta, Abhijit, Rahu Kalam — auspicious and inauspicious times explained.', count: '10 muhurats' },
      { label: 'Sacred Tirthas', href: '/tirth', description: 'Single-destination pilgrim guides — Kashi, Tirupati, Vaishno Devi, Char Dham and more.', count: '12 tirthas' },
      { label: '12 Jyotirlinga', href: '/jyotirlinga', description: 'All 12 swayambhu Shiva abodes in canonical order — Bhasma Aarti, Sphatika Linga, 22 Theertham and signature rituals.', count: '12 jyotirlinga' },
      { label: 'Pilgrimage Circuits', href: '/pilgrimage', description: 'Char Dham, 12 Jyotirlinga, Shakti Peeth, Pancha Bhoota and other canonical circuits.', count: '8 circuits' },
      { label: 'Vipassana Retreats', href: '/wellness/vipassana', description: '10-day silent meditation in the S.N. Goenka tradition. Learn the technique, find a center, apply directly.', count: '27 centers' },
      { label: '16 Samskaras', href: '/samskaras', description: 'The Vedic life-stage rites from garbhadhana to antyeshti.', count: '16 rites' },
    ],
  },
  {
    key: 'tools',
    title: 'Tools',
    tagline: 'Generators, calendars and viral cards built on the canonical data above.',
    accent: 'saffron',
    items: [
      { label: 'Sankalp Generator', href: '/sankalp', description: 'Build a personalised Vedic vow in Sanskrit, IAST and English from your gotra, nakshatra and intent.' },
      { label: 'Today’s Panchang', href: '/today', description: 'Day-of-week deity, current mantra, today’s tithi and the next upcoming festival.' },
      { label: 'Hindu Calendar 2026', href: '/calendar', description: 'Month-by-month festival calendar with fasting flags and bookable-puja CTAs.' },
      { label: 'Shloka Cards', href: '/shloka-card', description: 'Shareable WhatsApp / X / FB cards from any shloka — three starter presets.' },
      { label: 'Gift a Puja', href: '/gift', description: 'NRI senders gift a puja to family in India with WhatsApp delivery and 80G receipt.' },
      { label: 'FAQs', href: '/faqs', description: '~20 questions across booking, darshan, refunds, NRI lane and yatra packages.' },
      { label: 'Why Darshya', href: '/why-darshya', description: '14-row honest comparison vs Sri Mandir, Utsav and AstroSage.' },
    ],
  },
];

const TOTAL = GROUPS.reduce((sum, g) => sum + g.items.length, 0);

export const metadata: Metadata = {
  title: `Discover Hindu Wisdom — All ${TOTAL} Guides on Scriptures, Cosmology, Practice & Tools | Darshya`,
  description: `One-page index of every Hindu wisdom guide on Darshya — Bhagavad Gita, Mahabharata, all ${TOTAL} programmatic guides covering scriptures, cosmology, ritual practice and devotional tools. Grouped, searchable, internally linked.`,
  alternates: { canonical: `${BASE_URL}/discover` },
  openGraph: {
    title: 'Discover Hindu Wisdom — every guide on Darshya',
    description: `${TOTAL} curated guides across scriptures, cosmology, practice and tools.`,
    url: `${BASE_URL}/discover`,
    type: 'website',
  },
};

const ACCENT_CLASS: Record<string, { header: string; pill: string; border: string; bg: string }> = {
  indigo: { header: 'text-indigo-700', pill: 'bg-indigo-100 text-indigo-800', border: 'border-indigo-200', bg: 'bg-indigo-50/30' },
  amber: { header: 'text-amber-700', pill: 'bg-amber-100 text-amber-800', border: 'border-amber-200', bg: 'bg-amber-50/30' },
  emerald: { header: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-800', border: 'border-emerald-200', bg: 'bg-emerald-50/30' },
  saffron: { header: 'text-saffron-700', pill: 'bg-saffron-100 text-saffron-800', border: 'border-saffron-200', bg: 'bg-saffron-50/30' },
};

export default function DiscoverPage() {
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Darshya — Hindu Wisdom Guides',
    numberOfItems: TOTAL,
    itemListElement: GROUPS.flatMap((g) =>
      g.items.map((it, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: it.label,
        url: `${BASE_URL}${it.href}`,
      })),
    ),
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: BASE_URL },
      { '@type': 'ListItem', position: 2, name: 'Discover', item: `${BASE_URL}/discover` },
    ],
  };

  const collectionPage = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Discover Hindu Wisdom',
    description: `Index of ${TOTAL} curated guides on Sanatana Dharma — scriptures, cosmology, practice and tools.`,
    url: `${BASE_URL}/discover`,
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify([itemList, breadcrumb, collectionPage]) }} />

      <nav className="mb-4 text-xs text-gray-500">
        <Link href="/" className="hover:text-gray-800">Home</Link>
        <span className="mx-1.5">›</span>
        <span className="text-gray-800">Discover</span>
      </nav>

      <header className="mb-10 max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-saffron-600">{TOTAL} curated guides</p>
        <h1 className="mt-1 font-serif text-3xl text-gray-900 sm:text-4xl">Discover Hindu Wisdom</h1>
        <p className="mt-3 text-base text-gray-700">
          Every wisdom guide on Darshya in one place — scriptures, cosmology, ritual
          practice and devotional tools. Each link below is a full canonical guide; the
          cards summarise what you’ll find.
        </p>
      </header>

      {/* Group jump-nav */}
      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {GROUPS.map((g) => {
          const a = ACCENT_CLASS[g.accent];
          return (
            <a
              key={g.key}
              href={`#${g.key}`}
              className={`rounded-full border ${a.border} ${a.pill} px-3 py-1 font-semibold`}
            >
              {g.title} <span className="opacity-70">· {g.items.length}</span>
            </a>
          );
        })}
      </nav>

      {GROUPS.map((g) => {
        const a = ACCENT_CLASS[g.accent];
        return (
          <section key={g.key} id={g.key} className="mb-12 scroll-mt-20">
            <header className="mb-4">
              <h2 className={`font-serif text-2xl ${a.header}`}>{g.title}</h2>
              <p className="mt-1 text-sm text-gray-600">{g.tagline}</p>
            </header>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {g.items.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  className={`group block rounded-2xl border ${a.border} ${a.bg} p-4 transition hover:shadow-md`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className={`text-base font-bold text-gray-900 group-hover:underline`}>
                      {it.label}
                    </h3>
                    {it.count ? (
                      <span className={`shrink-0 rounded-full ${a.pill} px-2 py-0.5 text-[11px] font-semibold`}>
                        {it.count}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{it.description}</p>
                </Link>
              ))}
            </div>
          </section>
        );
      })}

      <section className="mt-12 rounded-2xl border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Why a single Discover page?</h2>
        <p className="mt-2 text-sm text-gray-700">
          Search engines reward topical authority — sites that demonstrate depth in a
          subject area. By concentrating every wisdom guide into a single internal-link
          hub, we make it obvious to crawlers that Darshya is the canonical reference for
          Sanatana Dharma online. For readers it answers the question &ldquo;what else is
          on this site?&rdquo; in one scroll.
        </p>
      </section>
    </main>
  );
}
