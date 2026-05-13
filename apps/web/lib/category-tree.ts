export type CategoryItem = {
  label: string;
  href: string;
  description: string;
  icon?: string;
};

export type CategoryKey = 'worship' | 'wisdom' | 'consult' | 'shop' | 'yatra';

export type Category = {
  key: CategoryKey;
  label: string;
  tagline: string;
  items: CategoryItem[];
  featured?: { label: string; href: string; sublabel?: string };
};

export const CATEGORY_TREE: Category[] = [
  {
    key: 'worship',
    label: 'Worship',
    tagline: 'Watch the divine, schedule a ritual, give to a cause.',
    items: [
      {
        label: 'Live Darshan',
        href: '/darshan',
        description: 'Stream live aartis from temples across India.',
        icon: '🪔',
      },
      {
        label: 'Book a Puja',
        href: '/pujas',
        description: 'Sponsor a ritual with priest video proof.',
        icon: '🔥',
      },
      {
        label: 'Temples',
        href: '/temples',
        description: 'Discover verified temples and their offerings.',
        icon: '🛕',
      },
      {
        label: 'Gaushala Seva',
        href: '/gaushala',
        description: 'Sponsor cow welfare at registered gaushalas.',
        icon: '🐄',
      },
      {
        label: 'Donate (80G)',
        href: '/donations',
        description: 'Tax-deductible giving with instant 80G receipt.',
        icon: '🤲',
      },
      {
        label: 'Daily Aarti',
        href: '/content?tab=aarti',
        description: 'Audio aartis to play during morning rituals.',
        icon: '🎵',
      },
    ],
  },
  {
    key: 'wisdom',
    label: 'Wisdom',
    tagline: 'Daily panchang, scriptures, audio, horoscope.',
    items: [
      {
        label: 'Panchang',
        href: '/panchang',
        description: 'Today’s tithi, nakshatra, and shubh muhurat.',
        icon: '📅',
      },
      {
        label: 'Aarti / Chalisa / Mantra',
        href: '/content',
        description: 'Library of devotional texts with translations.',
        icon: '📿',
      },
      {
        label: 'Books',
        href: '/content/books',
        description: 'Sacred scriptures and commentaries to read.',
        icon: '📖',
      },
      {
        label: 'Daily Horoscope',
        href: '/astrology/horoscope',
        description: 'Personalized rashi-based daily reading.',
        icon: '✨',
      },
      {
        label: 'Blog',
        href: '/blog',
        description: 'Stories, festival guides, and devotional essays.',
        icon: '📝',
      },
    ],
  },
  {
    key: 'consult',
    label: 'Consult',
    tagline: 'Ask a Pandit, get a kundli, find a wedding muhurat.',
    items: [
      {
        label: 'Ask Pandit',
        href: '/ask-pandit',
        description: 'Instant answers from verified Vedic experts.',
        icon: '🙏',
      },
      {
        label: 'Astrologer Consult',
        href: '/astrology',
        description: 'Book a 1:1 consultation with an astrologer.',
        icon: '🔮',
      },
      {
        label: 'Kundli',
        href: '/astrology/kundli',
        description: 'Generate a free Vedic birth chart in minutes.',
        icon: '🪐',
      },
      {
        label: 'Wedding Muhurat',
        href: '/weddings/muhurat',
        description: 'Find the most auspicious wedding date.',
        icon: '💍',
      },
      {
        label: 'Wellness',
        href: '/wellness',
        description: 'Yoga, meditation, and Ayurveda guidance.',
        icon: '🧘',
      },
    ],
  },
  {
    key: 'shop',
    label: 'Shop',
    tagline: 'Prasad, idols, books, sacred items.',
    items: [
      {
        label: 'Storefront',
        href: '/store',
        description: 'Browse the full devotional marketplace.',
        icon: '🛍️',
      },
      {
        label: 'Prasad',
        href: '/store?cat=prasad',
        description: 'Temple prasad delivered to your doorstep.',
        icon: '🍯',
      },
      {
        label: 'Idols',
        href: '/store?cat=idols',
        description: 'Brass, marble, and wood idols of deities.',
        icon: '🗿',
      },
      {
        label: 'Books',
        href: '/store?cat=books',
        description: 'Hardcover scriptures, gita sets, and more.',
        icon: '📚',
      },
      {
        label: 'Cart',
        href: '/store/cart',
        description: 'Review and check out your saved items.',
        icon: '🛒',
      },
    ],
  },
  {
    key: 'yatra',
    label: 'Yatra',
    tagline: 'Pilgrimage travel.',
    items: [
      {
        label: 'Packages',
        href: '/yatra',
        description: 'Curated multi-day pilgrimage itineraries.',
        icon: '🚌',
      },
      {
        label: 'Destinations',
        href: '/yatra/destinations',
        description: 'Char Dham, Jyotirlinga, Shakti Peeth, more.',
        icon: '🏔️',
      },
      {
        label: 'Plan a Trip',
        href: '/yatra/plan',
        description: 'Build a custom yatra with our trip builder.',
        icon: '🗺️',
      },
      {
        label: 'Companion',
        href: '/yatra/companion',
        description: 'On-yatra checklists, guides, and prayers.',
        icon: '🧳',
      },
    ],
  },
];

export function getCategory(key: CategoryKey): Category | undefined {
  return CATEGORY_TREE.find((c) => c.key === key);
}
