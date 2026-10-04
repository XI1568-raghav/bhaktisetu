// Topical hub for 27 programmatic-SEO wisdom routes. Pure local data → SSG.
// Crawlers get a strong internal-link hub; users get a searchable index.
import type { Metadata } from 'next';
// DU-05: the one h1 recipe per page archetype. Extras are layout-only.
import { H1 } from '../../components/ui/heading-recipe';
import Link from 'next/link';
// CI-12: this hub advertised /jyotirlinga as "All 12 swayambhu Shiva abodes",
// while the dataset behind that page flags Somnath, Kashi Vishwanath and
// Rameshwar `swayambhu: false` and its own badges show nine. Both numbers are
// derived here for the same reason app/jyotirlinga/page.tsx derives them — a
// literal is what let the two drift apart in the first place. This is a server
// component, so the import costs the client bundle nothing.
import { JYOTIRLINGAS } from '../../lib/jyotirlingas';
import { RECEIPT_NOUN } from '../../lib/eighty-g';

export const revalidate = 86400;

const BASE_URL = 'https://darshya.online';

const JYOTIRLINGA_SWAYAMBHU = JYOTIRLINGAS.filter((j) => j.swayambhu).length;
const JYOTIRLINGA_INSTALLED = JYOTIRLINGAS.length - JYOTIRLINGA_SWAYAMBHU;

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
      { label: 'Hindu Philosophies', href: '/hindu-philosophies', description: 'Shad-darshana, Vedanta sub-schools and dharmic worldviews — Advaita to Dvaita.', count: '10 schools' },
      { label: 'Hindu Symbols', href: '/hindu-symbols', description: 'Om, Swastika, Trishul, Sri Yantra, Kalasha — sacred symbology with meaning and ritual use.', count: '12 symbols' },
      { label: 'Sanskrit', href: '/sanskrit', description: 'Devanagari script, grammar primer and classical literary tradition.', count: 'guides' },
      { label: 'Learn Sanskrit', href: '/learn-sanskrit', description: 'Interactive Sanskrit lessons with streaks and badges from the Gurukul.', count: 'lessons' },
      { label: 'Sanatan Dharm', href: '/sanatan', description: 'Knowledge and history overview of Sanatana Dharma — the eternal way.', count: 'overview' },
    ],
  },
  {
    key: 'saints',
    title: 'Saints & Deities',
    tagline: 'Devotional masters, goddess forms and the divine pantheon.',
    accent: 'indigo',
    items: [
      { label: 'Bhakti Saints', href: '/bhakti-saint', description: 'Twelve medieval saints who carried devotion to the people — Tulsidas, Mirabai, Kabir, Chaitanya, Adi Shankara, Ramanuja, Madhva, Ramakrishna and more.', count: '12 saints' },
      { label: 'Deities', href: '/deity', description: 'Vishnu, Shiva, Devi, Ganesha, Hanuman and more — form, iconography, mantras, festivals per deity.', count: '17 deities' },
      { label: '10 Mahavidyas', href: '/devi/mahavidyas', description: 'Kali, Tara, Tripura Sundari, Bhuvaneshwari, Bhairavi, Chinnamasta, Dhumavati, Bagalamukhi, Matangi, Kamala — the ten wisdom goddesses.', count: '10 forms' },
      { label: '9 Navadurga', href: '/devi/navadurga', description: 'The nine forms of Durga worshipped across the nine nights of Navratri — Shailaputri to Siddhidatri.', count: '9 forms' },
      { label: 'Dashavatar', href: '/dashavatar', description: 'The ten descents of Vishnu from Matsya to the future Kalki.', count: '10 avatars' },
      { label: 'Sapta Rishis', href: '/sapta-rishis', description: 'The seven primordial sages who anchor Vedic lineage.', count: '7 rishis' },
      { label: '12 Adityas', href: '/aditya', description: 'All 12 sons of Aditi per Bhagavata Purana — Vivasvan, Savitar, Mitra, Varuna and 8 more. Each presides over one solar month.', count: '12 forms' },
      { label: '7 Sapta Matrika', href: '/sapta-mathruka', description: 'The seven mother goddesses per Devi Mahatmya — Brahmani, Vaishnavi, Maheshwari, Indrani, Kaumari, Varahi, Chamunda.', count: '7 mothers' },
      { label: '8 Ashta Lakshmi', href: '/ashta-lakshmi', description: 'All 8 forms of Goddess Lakshmi — Adi, Dhana, Dhanya, Gaja, Santana, Veera, Vijaya, Vidya.', count: '8 forms' },
    ],
  },
  {
    key: 'cosmology',
    title: 'Calendar & Cosmology',
    tagline: 'Stars, planets, lunar mansions, festivals and the celestial frame of the year.',
    accent: 'amber',
    items: [
      { label: 'Nakshatras', href: '/nakshatra', description: 'The 27 lunar mansions with lord, deity, gana, qualities, career and compatibility.', count: '27 mansions' },
      { label: 'Rashis (Zodiac)', href: '/rashi', description: 'The 12 Vedic zodiac signs with element, lord, lucky days, gems and mantras.', count: '12 signs' },
      { label: 'Nava-Graha', href: '/nava-graha', description: 'The nine astrological planets — characteristics, mantras and remedial pujas.', count: '9 planets' },
      { label: 'Hindu Festivals', href: '/festival', description: 'Diwali, Holi, Navratri, Janmashtami, Ganesh Chaturthi and 25+ more — significance, rituals, regional variants.', count: '30 festivals' },
      { label: 'Calendar 2026', href: '/calendar', description: 'Month-by-month Hindu festival calendar with fasting flags and bookable-puja CTAs.', count: '12 months' },
      { label: 'Ekadashis', href: '/ekadashi', description: 'All 24 Ekadashi vratas with story, fasting rules, breaking ritual and presiding deity.', count: '24 ekadashis' },
      { label: '30 Lunar Tithis', href: '/tithi', description: 'All 30 tithis of the lunar month with presiding deity, fasting tradition, festivals and beej mantra.', count: '16 pages' },
      { label: '12 Vedic Months', href: '/masa', description: 'All 12 Hindu lunar months — Chaitra through Phalguna. Gregorian range, ritu, presiding Aditya, festivals.', count: '12 masa' },
      { label: 'Sacred Rivers', href: '/sacred-rivers', description: 'Ganga, Yamuna, Sarasvati, Godavari, Kaveri and 5 more — origin myth, ghats, ritual significance.', count: '10 rivers' },
      { label: 'Sacred Trees', href: '/sacred-trees', description: 'Peepal, Banyan, Bilva, Tulsi and more — botanical lore, deity association, ritual use.', count: '12 trees' },
      { label: 'Sacred Mountains', href: '/sacred-mountains', description: 'Kailash, Govardhan, Tirumala, Arunachala and more — pilgrimage, geology, mythology.', count: '10 mountains' },
    ],
  },
  {
    key: 'practice',
    title: 'Devotional Practice',
    tagline: 'Chants, vows, sacred timings, pilgrimage routes and life-stage rites.',
    accent: 'emerald',
    items: [
      { label: 'Famous Chants', href: '/chants', description: 'Gayatri, Mahamrityunjaya, Hanuman Chalisa and other standalone Sanskrit mantras with how-to-recite guides.', count: '12 chants' },
      { label: 'Aartis', href: '/aarti', description: 'Devanagari aarti lyrics with transliteration, meaning and recitation duration — Ganga, Shiva, Lakshmi, Durga and more.', count: '25 aartis' },
      { label: 'Chalisas', href: '/chalisa', description: 'Forty-verse devotional hymns with composer, benefits and excerpts — Hanuman, Durga, Sai, Ganga, Lakshmi and more.', count: '20 chalisas' },
      { label: 'Vrats Guide', href: '/vrat', description: 'Ekadashi, Pradosh, Mangalvar and other fasting traditions with permitted foods and ritual steps.', count: '10 vrats' },
      { label: 'Muhurat Guide', href: '/muhurat', description: 'Brahma Muhurta, Abhijit, Rahu Kalam — auspicious and inauspicious times explained.', count: '10 muhurats' },
      { label: 'Chakras', href: '/chakras', description: 'The 7 chakras from Muladhara to Sahasrara — beej mantra, element, gland, color and Tantric awakening practice.', count: '7 chakras' },
      { label: 'Vedic Yajnas', href: '/vedic-yajnas', description: 'Agnihotra, Soma, Vajapeya, Ashwamedha and 6 more — fire-altar rituals with mantra, materials and procedure.', count: '10 yajnas' },
      { label: 'Rudraksha', href: '/rudraksha', description: '1-mukhi to 18-mukhi rudraksha beads — deity, planet, benefits, wearing rules and identification.', count: '18 mukhi' },
      { label: 'Sacred Tirthas', href: '/tirth', description: 'Single-destination pilgrim guides — Kashi, Tirupati, Vaishno Devi, Char Dham and more.', count: '12 tirthas' },
      { label: `${JYOTIRLINGAS.length} Jyotirlinga`, href: '/jyotirlinga', description: `All ${JYOTIRLINGAS.length} Shiva light-abodes in canonical order — ${JYOTIRLINGA_SWAYAMBHU} swayambhu, ${JYOTIRLINGA_INSTALLED} with an installed linga. Bhasma Aarti, Sphatika Linga, 22 Theertham and signature rituals.`, count: `${JYOTIRLINGAS.length} jyotirlinga` },
      { label: '51 Shakti Peeth', href: '/shakti-peeth', description: "Where Sati's body fell — across India, Nepal, Bangladesh, Sri Lanka, Pakistan and Tibet. Devi-Bhairava pairings and Navratri rituals.", count: '51 peeths' },
      { label: '5 Pancha Bhoota Stalam', href: '/pancha-bhoota', description: 'Five Tamil Nadu Shiva temples representing the five elements — Earth, Water, Fire, Air, Ether.', count: '5 temples' },
      { label: '9 Navaratna Gems', href: '/navaratna', description: 'Nine sacred gems of Vedic gemology — one per Nava-Graha. Finger, metal, day, mantra, benefits.', count: '9 gems' },
      { label: 'Pilgrimage Circuits', href: '/pilgrimage', description: 'Char Dham, 12 Jyotirlinga, Shakti Peeth, Pancha Bhoota and other canonical circuits.', count: '8 circuits' },
      { label: 'Vipassana Retreats', href: '/wellness/vipassana', description: '10-day silent meditation in the S.N. Goenka tradition. Learn the technique, find a center, apply directly.', count: '27 centers' },
      { label: '16 Samskaras', href: '/samskaras', description: 'The Vedic life-stage rites from garbhadhana to antyeshti.', count: '16 rites' },
      { label: 'Antim Sanskar', href: '/antim-sanskar', description: 'The Vedic end-of-life rite — preparation, mantras, gotra observances.', count: 'rite' },
      { label: 'Yatra Packages', href: '/yatra-packages', description: 'Curated multi-day pilgrimage tours with pandit, transport and stay.', count: 'tours' },
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
      { label: 'Gift a Puja', href: '/gift', description: `NRI senders gift a puja to family in India with WhatsApp delivery and a ${RECEIPT_NOUN}.` },
      { label: 'FAQs', href: '/faqs', description: '~20 questions across booking, darshan, refunds, NRI lane and yatra packages.' },
      { label: 'Why Darshya', href: '/why-darshya', description: '14-row honest comparison vs Sri Mandir, Utsav and AstroSage.' },
      { label: 'Kundli Matchmaking', href: '/matchmaking', description: 'Free Ashtakoot 36-point Guna Milan with optional pandit consult.' },
      { label: 'Pujas by City', href: '/city', description: 'Pujas and temples city by city — Varanasi, Mumbai, Tirupati and more.' },
      { label: 'Free Pandit Advice', href: '/free-pandit-advice', description: 'Kundli and astrology questions answered by pandits.' },
    ],
  },
];

const TOTAL = GROUPS.reduce((sum, g) => sum + g.items.length, 0);

export const metadata: Metadata = {
  title: `Discover Hindu Wisdom — All ${TOTAL} Guides on Scriptures, Cosmology, Practice & Tools`,
  description: `One-page index of every Hindu wisdom guide on Darshya — Bhagavad Gita, Mahabharata, all ${TOTAL} programmatic guides covering scriptures, cosmology, ritual practice and devotional tools. Grouped, searchable, internally linked.`,
  alternates: { canonical: `${BASE_URL}/discover` },
  openGraph: {
    images: ['/images/golden-temple-og.jpg'],
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
        <h1 className={`${H1.catalogue} mt-1`}>Discover Hindu Wisdom</h1>
        <p className="mt-3 text-base text-gray-700">
          Every wisdom guide on Darshya in one place — scriptures, cosmology, ritual
          practice and devotional tools. Each link below is a full canonical guide; the
          cards summarise what you’ll find.
        </p>
      </header>

      {/* Group jump-nav */}
      <nav className="mb-10 flex flex-wrap gap-2 text-sm">
        {GROUPS.map((g) => {
          const a = ACCENT_CLASS[g.accent] ?? { header: '', pill: '', border: '', bg: '' };
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
        const a = ACCENT_CLASS[g.accent] ?? { header: '', pill: '', border: '', bg: '' };
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
                      <span className={`shrink-0 rounded-full ${a.pill} px-2 py-0.5 text-xs font-semibold`}>
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
