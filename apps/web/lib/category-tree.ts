import { HAS_80G } from './eighty-g';
export type CategoryItem = {
  label: string;
  href: string;
  description: string;
};

export type AccentColor = 'saffron' | 'indigo' | 'emerald' | 'amber';

export type CategoryKey = 'worship' | 'library' | 'astrology' | 'yatra' | 'shop';

export type LibrarySubGroup = {
  heading: string;
  hubHref: string;
  hubLabel: string;
  items: CategoryItem[];
};

/**
 * A labelled run of items inside one panel. NOT a link and NOT a submenu — the
 * items stay exactly where they were, in the same 2-column grid, with a small
 * caption above each run.
 *
 * NAV-IA (2026-09-05). Astrology carried 14 ungrouped rows, past the ~10 at
 * which Baymard's participants "began to feel overwhelmed". The obvious fix —
 * collapse the five dosha pages behind one "Doshas & Remedies" door — was
 * rejected on two grounds. NN/g's 179-participant study found hidden navigation
 * cut discoverability ~20%, and a global-nav link is the strongest sitewide
 * internal link a page gets, so demoting five indexed dosha pages one level
 * costs real organic equity with no redirect signal to offset it. There is also
 * no destination to demote them TO: /astrology serves exactly one anchor,
 * #online-astrologers — the doors would have pointed at nothing.
 *
 * Grouping is what actually buys the scan. Hick's logarithmic speed-up only
 * holds when a reader can SKIP a run of options; Landauer & Nachbar showed an
 * unordered list is scanned linearly however short it is. So every link stays
 * reachable in one click and the panel gains the structure that lets a devotee
 * skip three quarters of it.
 */
export type CategoryGroup = {
  /** Short caption, sentence case. Never a verb — "Doshas & remedies", not "Explore". */
  heading: string;
  items: CategoryItem[];
  /**
   * Render the labels without their descriptions.
   *
   * Descriptions are Darshya's real advantage in this category — no competitor
   * panel carries them — so this is used sparingly and only where the label is
   * already self-evident. The dosha rows are the case: "Manglik Dosh" and
   * "Sade Sati" are the names a devotee arrives already knowing (a relative told
   * them they have one), and the descriptions beneath them restate the label in
   * other words. Dropping five of them buys ~80px, which is most of what keeps
   * this panel from needing an internal scrollbar.
   *
   * The description stays in the data either way — MobileNavV2 renders the flat
   * `items` list and still shows it, where there is vertical room.
   */
  terse?: boolean;
};

export type Category = {
  key: CategoryKey;
  label: string;
  tagline: string;
  accentColor: AccentColor;
  items: CategoryItem[];
  featured?: { label: string; href: string; sublabel?: string };
  /** Only set for `library` · drives 4-col LibraryMegaPanel layout. */
  subGroups?: LibrarySubGroup[];
  /**
   * When present, CategoryMegaMenu renders these captioned runs instead of the
   * flat `items` grid. `items` MUST still list every link — it is the flat
   * source of truth that the mobile drawer (MobileNavV2 renders `items` only)
   * and the category-tree count tests read. `groups` is a presentation layer
   * over it, and __tests__/category-group-integrity.nav-ia.test.ts fails if the
   * two ever disagree.
   */
  groups?: CategoryGroup[];
};

export const CATEGORY_TREE: Category[] = [
  {
    key: 'worship',
    label: 'Worship',
    tagline: 'Watch the divine, schedule a ritual, give to a cause.',
    accentColor: 'saffron',
    featured: { label: "Today's Aarti", href: '/today', sublabel: 'Day-of-week deity + live aartis' },
    items: [
      {
        label: "Today's Hub",
        href: '/today',
        description: 'Day-of-week deity, mantra, festival countdown.',
      },
      {
        label: 'Live Darshan',
        href: '/darshan',
        description: 'Stream live aartis from temples across India.',
      },
      {
        label: 'Book a Puja',
        href: '/pujas',
        description: 'Sponsor a ritual with priest video proof.',
      },
      {
        label: 'Gift a Puja',
        href: '/gift',
        description: 'Send a puja to a loved one · book from anywhere.',
      },
      {
        label: 'Temples',
        href: '/temples',
        description: 'Discover verified temples and their offerings.',
      },
      {
        label: 'Gaushala Seva',
        href: '/gaushala',
        description: 'Sponsor cow welfare at registered gaushalas.',
      },
      {
        label: HAS_80G ? 'Donate (80G)' : 'Donate',
        href: '/donations',
        description: HAS_80G
          ? 'Tax-deductible giving with instant 80G receipt.'
          : 'Give to a verified temple or gaushala, with a numbered receipt emailed instantly.',
      },
      {
        label: 'Panchang Today',
        href: '/panchang',
        description: "Today's tithi, nakshatra, and shubh muhurat.",
      },
    ],
  },
  {
    key: 'library',
    label: 'Library',
    tagline: 'Scriptures, devotional practice, saints, calendar · 500+ guides.',
    accentColor: 'indigo',
    featured: { label: 'Discover All Guides', href: '/discover', sublabel: 'Browse 500+ wisdom guides' },
    items: [
      { label: 'Discover All Guides', href: '/discover', description: 'Index of every Hindu wisdom guide on Darshya.' },
      { label: 'Bhakti Saints', href: '/bhakti-saint', description: '12 medieval devotional masters.' },
      { label: 'Deities', href: '/deity', description: 'Form, iconography, mantras for each deity.' },
      { label: 'Festivals', href: '/festival', description: '56 Hindu festivals with rituals and dates.' },
      { label: 'Aarti / Chalisa / Mantra', href: '/content', description: 'Devotional texts with translations.' },
      { label: 'Vedas + Upanishads', href: '/vedas', description: 'Sruti scriptures explained.' },
      { label: 'Bhagavad Gita', href: '/gita', description: '18 chapters with commentary.' },
      { label: 'Calendar 2026', href: '/calendar', description: 'Month-by-month festival + vrat calendar.' },
    ],
    subGroups: [
      {
        heading: 'Scriptures',
        hubHref: '/discover#scriptures',
        hubLabel: 'Browse all scriptures',
        items: [
          { label: 'Vedas', href: '/vedas', description: 'Rigveda, Yajurveda, Samaveda, Atharvaveda.' },
          // Counts are literals, not imports: this module is pulled into four
          // 'use client' nav components, so importing UPANISHADS/JYOTIRLINGAS
          // to derive them would ship 130 KB of encyclopedia prose to every
          // route. __tests__/category-tree-counts.ci12-ci14.test.ts pins each
          // number to the runtime dataset instead.
          { label: 'Upanishads', href: '/upanishads', description: '48 Upanishads · 10 principal · Vedanta core texts.' },
          { label: 'Puranas', href: '/puranas', description: '18 Mahapuranas · itihasa-purana corpus.' },
          { label: 'Bhagavad Gita', href: '/gita', description: '18 chapters of the Gita.' },
          { label: 'Ramayana', href: '/ramayana', description: '7 Kandas of Valmiki Ramayana.' },
          { label: 'Mahabharata', href: '/mahabharata', description: '18 Parvas + Bhishma Parva.' },
          { label: 'Sanskrit', href: '/sanskrit', description: 'Grammar + devanagari + classical literature.' },
          { label: 'Hindu Philosophies', href: '/hindu-philosophies', description: 'Shad-darshana + Vedanta schools.' },
          { label: 'Hindu Symbols', href: '/hindu-symbols', description: 'Om, Swastika, Trishul, Sri Yantra…' },
        ],
      },
      {
        heading: 'Devotional Practice',
        hubHref: '/discover#practice',
        hubLabel: 'Browse all practice guides',
        items: [
          { label: 'Aarti', href: '/aarti', description: 'Sanskrit aartis with transliteration.' },
          { label: 'Chalisa', href: '/chalisa', description: 'Forty-verse devotional collections.' },
          { label: 'Mantra', href: '/chants', description: 'Standalone Sanskrit mantras.' },
          { label: 'Shlokas', href: '/shlokas', description: 'Shareable verse cards.' },
          { label: 'Bhajan', href: '/content', description: 'Devotional songs with audio links.' },
          { label: 'Sankalp Generator', href: '/sankalp', description: 'Build your Vedic vow in Sanskrit.' },
          { label: 'Chakras', href: '/chakras', description: '7 chakras · Muladhara to Sahasrara.' },
          { label: 'Vedic Yajnas', href: '/vedic-yajnas', description: '10 yajnas · Agnihotra, Soma, Vajapeya…' },
          { label: 'Samskaras (16)', href: '/samskaras', description: '16 Vedic life-rites · Garbhadhana to Antyeshti.' },
        ],
      },
      {
        heading: 'Saints & Deities',
        hubHref: '/bhakti-saint',
        hubLabel: 'Browse all saints',
        items: [
          { label: 'Bhakti Saints (12)', href: '/bhakti-saint', description: 'Tulsidas, Mirabai, Kabir, Surdas, Tukaram…' },
          { label: 'Deities', href: '/deity', description: 'Vishnu, Shiva, Devi, Ganesha, Hanuman…' },
          { label: 'Mahavidyas (10)', href: '/devi/mahavidyas', description: 'Kali, Tara, Tripura Sundari, Bhuvaneshwari…' },
          { label: 'Navadurga (9)', href: '/devi/navadurga', description: '9 forms of Durga across Navratri.' },
          { label: 'Dashavatar (10)', href: '/dashavatar', description: '10 avatars of Vishnu.' },
          { label: 'Sapta Rishis (7)', href: '/sapta-rishis', description: '7 Vedic sages.' },
          { label: 'Dwadasha Aditya (12)', href: '/aditya', description: '12 forms of Surya.' },
          { label: 'Jyotirlinga (12)', href: '/jyotirlinga', description: '12 Shiva light-abodes · 9 self-manifested.' },
          { label: 'Shakti Peeth (51)', href: '/shakti-peeth', description: '51 seats of Sati across the subcontinent.' },
          { label: 'Pancha Bhoota (5)', href: '/pancha-bhoota', description: '5 element-temples of Shiva.' },
          { label: 'Ashta Lakshmi (8)', href: '/ashta-lakshmi', description: '8 forms of Lakshmi.' },
          { label: 'Sapta Mathruka (7)', href: '/sapta-mathruka', description: '7 mother goddesses.' },
        ],
      },
      {
        heading: 'Calendar & Cosmology',
        hubHref: '/discover#cosmology',
        hubLabel: 'Browse calendar & cosmology',
        items: [
          { label: 'Festivals (56)', href: '/festival', description: 'Major Hindu festivals.' },
          { label: 'Calendar 2026', href: '/calendar', description: 'Month-by-month festival + vrat dates.' },
          { label: 'Tithi (30)', href: '/tithi', description: '30 lunar days w/ rituals.' },
          { label: 'Masa (12)', href: '/masa', description: '12 lunar months of the Hindu calendar.' },
          { label: 'Nakshatra (27)', href: '/nakshatra', description: '27 lunar mansions.' },
          { label: 'Ekadashi (24)', href: '/ekadashi', description: '24 Ekadashis with story + vrat.' },
          { label: 'Vrat (72)', href: '/vrat', description: 'Fasting traditions.' },
          { label: 'Muhurat', href: '/muhurat', description: 'Auspicious + inauspicious time windows.' },
          { label: 'Sacred Rivers', href: '/sacred-rivers', description: 'Ganga, Yamuna, Sarasvati + 7 more.' },
          { label: 'Sacred Trees', href: '/sacred-trees', description: 'Peepal, Banyan, Tulsi + 9 more.' },
          { label: 'Sacred Mountains', href: '/sacred-mountains', description: 'Kailash, Govardhan, Tirumala + 7 more.' },
        ],
      },
    ],
  },
  {
    key: 'astrology',
    label: 'Astrology',
    tagline: 'Free kundli, daily horoscope, doshas, muhurat · talk to an astrologer.',
    accentColor: 'indigo',
    featured: { label: 'Consult ₹99/min', href: '/astrology', sublabel: 'Verified Vedic astrologers' },
    items: [
      { label: 'Free Kundli', href: '/astrology/kundli', description: 'Vedic birth chart with D9 Navamsa.' },
      { label: 'Daily Horoscope', href: '/astrology/horoscope', description: 'Rashi-based daily reading.' },
      { label: 'Rashi (12)', href: '/rashi', description: '12 zodiac sign profiles + traits.' },
      { label: 'Nava Graha (9)', href: '/nava-graha', description: '9 planetary deities + remedies.' },
      { label: 'Wedding Muhurat', href: '/weddings/muhurat', description: 'Most auspicious wedding date.' },
      { label: 'Manglik Dosh', href: '/astrology/manglik', description: 'Mars dosha analysis + remedies.' },
      { label: 'Sade Sati', href: '/astrology/sade-sati', description: '7.5-year Saturn transit check.' },
      { label: 'Kaal Sarp Dosh', href: '/astrology/kaal-sarp', description: 'Rahu-Ketu axis analysis.' },
      { label: 'Pitra Dosh', href: '/astrology/pitra-dosh', description: 'Ancestor karma remedies.' },
      { label: 'Numerology', href: '/astrology/numerology', description: 'Driver + conductor number reading.' },
      { label: 'Baby Name', href: '/astrology/baby-name', description: 'Nakshatra-based name suggestions.' },
      { label: 'Lal Kitab', href: '/astrology/lal-kitab', description: 'Remedial Vedic astrology.' },
      { label: 'Talk to Astrologer', href: '/astrology', description: '1:1 paid consultation.' },
      { label: 'Ask Pandit', href: '/ask-pandit', description: 'Instant LLM-assisted Q&A.' },
    ],
    /**
     * Four captioned runs over the same fourteen links. The order is the order
     * a devotee arrives in: someone talks to a human first, reaches for a free
     * tool second, and only lands on a dosha page because a relative told them
     * they have one — which is why the five dosha pages sit together under a
     * heading that names that exact question rather than scattered through an
     * alphabetical fourteen.
     */
    groups: [
      {
        heading: 'Talk to someone',
        items: [
          { label: 'Talk to Astrologer', href: '/astrology', description: '1:1 paid consultation.' },
          { label: 'Ask Pandit', href: '/ask-pandit', description: 'Instant LLM-assisted Q&A.' },
        ],
      },
      {
        heading: 'Free tools',
        items: [
          { label: 'Free Kundli', href: '/astrology/kundli', description: 'Vedic birth chart with D9 Navamsa.' },
          { label: 'Daily Horoscope', href: '/astrology/horoscope', description: 'Rashi-based daily reading.' },
          { label: 'Wedding Muhurat', href: '/weddings/muhurat', description: 'Most auspicious wedding date.' },
          { label: 'Baby Name', href: '/astrology/baby-name', description: 'Nakshatra-based name suggestions.' },
          { label: 'Numerology', href: '/astrology/numerology', description: 'Driver + conductor number reading.' },
        ],
      },
      {
        heading: 'Doshas & remedies',
        terse: true,
        items: [
          { label: 'Manglik Dosh', href: '/astrology/manglik', description: 'Mars dosha analysis + remedies.' },
          { label: 'Sade Sati', href: '/astrology/sade-sati', description: '7.5-year Saturn transit check.' },
          { label: 'Kaal Sarp Dosh', href: '/astrology/kaal-sarp', description: 'Rahu-Ketu axis analysis.' },
          { label: 'Pitra Dosh', href: '/astrology/pitra-dosh', description: 'Ancestor karma remedies.' },
          { label: 'Lal Kitab', href: '/astrology/lal-kitab', description: 'Remedial Vedic astrology.' },
        ],
      },
      {
        heading: 'Signs & planets',
        items: [
          { label: 'Rashi (12)', href: '/rashi', description: '12 zodiac sign profiles + traits.' },
          { label: 'Nava Graha (9)', href: '/nava-graha', description: '9 planetary deities + remedies.' },
        ],
      },
    ],
  },
  {
    key: 'yatra',
    label: 'Yatra',
    tagline: 'Pilgrimage packages, destinations, wellness retreats.',
    accentColor: 'emerald',
    items: [
      { label: 'Packages', href: '/yatra', description: 'Curated multi-day pilgrimage itineraries.' },
      { label: 'Destinations', href: '/yatra/destinations', description: '35 sacred destinations across India.' },
      { label: 'Pilgrimage Circuits', href: '/pilgrimage', description: 'Char Dham, Jyotirlinga, Shakti Peeth…' },
      { label: 'Tirth Guides', href: '/tirth', description: '72 single-destination pilgrim guides.' },
      { label: 'Vipassana Centers', href: '/wellness/vipassana', description: '26 Goenka-tradition retreat centers.' },
      { label: 'Wellness (Yoga + Ayurveda)', href: '/wellness', description: 'Yoga, meditation, Ayurveda guidance.' },
      { label: 'Plan a Trip', href: '/yatra/plan', description: 'Custom yatra trip builder.' },
    ],
    /**
     * Seven rows is under the threshold, so nothing is cut here — but the panel
     * was mixing two different trips. Booking a Char Dham package and reading a
     * tirth guide are not the same errand, and a silent retreat is neither.
     * Captions separate them; every link stays.
     */
    groups: [
      {
        heading: 'Book a yatra',
        items: [
          { label: 'Packages', href: '/yatra', description: 'Curated multi-day pilgrimage itineraries.' },
          { label: 'Destinations', href: '/yatra/destinations', description: '35 sacred destinations across India.' },
          { label: 'Pilgrimage Circuits', href: '/pilgrimage', description: 'Char Dham, Jyotirlinga, Shakti Peeth…' },
          { label: 'Plan a Trip', href: '/yatra/plan', description: 'Custom yatra trip builder.' },
        ],
      },
      {
        heading: 'Retreats & guides',
        items: [
          { label: 'Vipassana Centers', href: '/wellness/vipassana', description: '26 Goenka-tradition retreat centers.' },
          { label: 'Wellness (Yoga + Ayurveda)', href: '/wellness', description: 'Yoga, meditation, Ayurveda guidance.' },
          { label: 'Tirth Guides', href: '/tirth', description: '72 single-destination pilgrim guides.' },
        ],
      },
    ],
  },
  {
    key: 'shop',
    label: 'Shop',
    tagline: 'Prasad, idols, books, rudraksha · devotional store.',
    accentColor: 'amber',
    items: [
      { label: 'Storefront', href: '/store', description: 'Browse the full devotional marketplace.' },
      { label: 'Prasad', href: '/store?cat=prasad', description: 'Temple prasad delivered to your door.' },
      { label: 'Idols', href: '/store?cat=idols', description: 'Brass, marble, wood deity idols.' },
      { label: 'Books', href: '/store?cat=books', description: 'Hardcover scriptures + commentaries.' },
      { label: 'Rudraksha (18)', href: '/rudraksha', description: '1- to 18-mukhi rudraksha guides.' },
      { label: 'Navaratna (9)', href: '/navaratna', description: '9 sacred gems for planetary remedies.' },
      /**
       * NAV-IA (2026-09-05): "Cart" was here and is gone. A cart is a STATE, not
       * a category — it is already a persistent header icon carrying the live
       * item count (NavCartButton), which is where every devotee looks for it.
       * Listing it as a seventh sibling of Prasad and Idols implied there was a
       * category of thing called Cart. No organic equity is lost: /store/cart is
       * not an indexed page.
       */
    ],
  },
];

export function getCategory(key: CategoryKey): Category | undefined {
  return CATEGORY_TREE.find((c) => c.key === key);
}
