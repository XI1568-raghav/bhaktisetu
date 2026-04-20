/**
 * Centralized Image Map for Poojly
 * =====================================
 * All Unsplash image URLs used across the application are defined here.
 * Import from this file instead of hardcoding URLs in components.
 *
 * Usage:
 *   import { IMAGES, getImage } from '@/lib/images';
 *   <img src={IMAGES.temples['kashi-vishwanath'].hero} />
 *   <img src={getImage('deities', 'lord-shiva', '800x600')} />
 */

const UNSPLASH_BASE = 'https://images.unsplash.com';

// Default quality and crop params
const DEFAULT_PARAMS = 'fit=crop&q=80';

function u(photoId: string, w = 800, h = 600): string {
  return `${UNSPLASH_BASE}/${photoId}?w=${w}&h=${h}&${DEFAULT_PARAMS}`;
}

function uWide(photoId: string): string {
  return u(photoId, 1920, 800);
}

function uSquare(photoId: string, size = 400): string {
  return u(photoId, size, size);
}

function uPortrait(photoId: string): string {
  return u(photoId, 600, 900);
}

// ────────────────────────────────────────────────────────────
// IMAGES — The single source of truth for all imagery
// ────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════
// ALL photo IDs below are VERIFIED to return HTTP 200 from Unsplash.
// Do NOT change a photo ID without testing it first:
//   curl -s -o /dev/null -w "%{http_code}" "https://images.unsplash.com/PHOTO_ID?w=100"
// ═══════════════════════════════════════════════════════════════

export const IMAGES = {
  // ── Temples (all verified 200) ─────────────────────────────
  temples: {
    'kashi-vishwanath': {
      hero: u('photo-1548013146-72479768bada', 1200, 800),
      thumbnail: u('photo-1548013146-72479768bada', 400, 300),
      gallery: [
        u('photo-1548013146-72479768bada', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
        u('photo-1585128993280-9456c19c987d', 800, 600),
        u('photo-1604948501466-4e9c339b9c24', 800, 600),
      ],
    },
    'tirumala-tirupati': {
      hero: u('photo-1600093463592-8e36ae95ef56', 1200, 800),
      thumbnail: u('photo-1600093463592-8e36ae95ef56', 400, 300),
      gallery: [
        u('photo-1600093463592-8e36ae95ef56', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
        u('photo-1585128993280-9456c19c987d', 800, 600),
        u('photo-1603228254119-e6a4d095dc59', 800, 600),
      ],
    },
    'siddhivinayak': {
      hero: u('photo-1604948501466-4e9c339b9c24', 1200, 800),
      thumbnail: u('photo-1604948501466-4e9c339b9c24', 400, 300),
      gallery: [
        u('photo-1604948501466-4e9c339b9c24', 800, 600),
        u('photo-1603228254119-e6a4d095dc59', 800, 600),
        u('photo-1585128993280-9456c19c987d', 800, 600),
      ],
    },
    'somnath': {
      hero: u('photo-1590077428593-a55bb07c4665', 1200, 800),
      thumbnail: u('photo-1590077428593-a55bb07c4665', 400, 300),
      gallery: [
        u('photo-1590077428593-a55bb07c4665', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
        u('photo-1604948501466-4e9c339b9c24', 800, 600),
      ],
    },
    'jagannath-puri': {
      hero: u('photo-1544367567-0f2fcb009e0b', 1200, 800),
      thumbnail: u('photo-1544367567-0f2fcb009e0b', 400, 300),
      gallery: [
        u('photo-1544367567-0f2fcb009e0b', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
        u('photo-1585128993280-9456c19c987d', 800, 600),
      ],
    },
    'golden-temple': {
      hero: u('photo-1514222134-b57cbb8ce073', 1200, 800),
      thumbnail: u('photo-1514222134-b57cbb8ce073', 400, 300),
      gallery: [
        u('photo-1514222134-b57cbb8ce073', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
      ],
    },
    'meenakshi-temple': {
      hero: u('photo-1585128993280-9456c19c987d', 1200, 800),
      thumbnail: u('photo-1585128993280-9456c19c987d', 400, 300),
      gallery: [
        u('photo-1585128993280-9456c19c987d', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
      ],
    },
    'kedarnath': {
      hero: u('photo-1500595046743-cd271d694d30', 1200, 800),
      thumbnail: u('photo-1500595046743-cd271d694d30', 400, 300),
      gallery: [
        u('photo-1500595046743-cd271d694d30', 800, 600),
        u('photo-1590077428593-a55bb07c4665', 800, 600),
      ],
    },
    'badrinath': {
      hero: u('photo-1500595046743-cd271d694d30', 1200, 800),
      thumbnail: u('photo-1500595046743-cd271d694d30', 400, 300),
      gallery: [
        u('photo-1500595046743-cd271d694d30', 800, 600),
        u('photo-1548013146-72479768bada', 800, 600),
      ],
    },
    'akshardham': {
      hero: u('photo-1548013146-72479768bada', 1200, 800),
      thumbnail: u('photo-1548013146-72479768bada', 400, 300),
      gallery: [
        u('photo-1548013146-72479768bada', 800, 600),
        u('photo-1585128993280-9456c19c987d', 800, 600),
      ],
    },
    'mahakaleshwar': {
      hero: u('photo-1604948501466-4e9c339b9c24', 1200, 800),
      thumbnail: u('photo-1604948501466-4e9c339b9c24', 400, 300),
      gallery: [
        u('photo-1604948501466-4e9c339b9c24', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
      ],
    },
    'tirupati': {
      hero: u('photo-1600093463592-8e36ae95ef56', 1200, 800),
      thumbnail: u('photo-1600093463592-8e36ae95ef56', 400, 300),
      gallery: [
        u('photo-1600093463592-8e36ae95ef56', 800, 600),
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
        u('photo-1585128993280-9456c19c987d', 800, 600),
        u('photo-1603228254119-e6a4d095dc59', 800, 600),
      ],
    },
    'iskcon-vrindavan': {
      hero: u('photo-1545468800-85cc9bc6ecf7', 1200, 800),
      thumbnail: u('photo-1545468800-85cc9bc6ecf7', 400, 300),
      gallery: [
        u('photo-1545468800-85cc9bc6ecf7', 800, 600),
        u('photo-1603228254119-e6a4d095dc59', 800, 600),
      ],
    },
    'dwarkadhish': {
      hero: u('photo-1590077428593-a55bb07c4665', 1200, 800),
      thumbnail: u('photo-1590077428593-a55bb07c4665', 400, 300),
      gallery: [
        u('photo-1590077428593-a55bb07c4665', 800, 600),
      ],
    },
    'meenakshi-amman': {
      hero: u('photo-1585128993280-9456c19c987d', 1200, 800),
      thumbnail: u('photo-1585128993280-9456c19c987d', 400, 300),
      gallery: [
        u('photo-1585128993280-9456c19c987d', 800, 600),
      ],
    },
  },

  // ── Deities (all verified 200) ─────────────────────────────
  deities: {
    'lord-shiva': u('photo-1604948501466-4e9c339b9c24', 600, 800),
    'lord-shiva-square': uSquare('photo-1604948501466-4e9c339b9c24'),
    'lord-ganesha': u('photo-1604948501466-4e9c339b9c24', 600, 800),
    'lord-ganesha-square': uSquare('photo-1604948501466-4e9c339b9c24'),
    'lord-krishna': u('photo-1545468800-85cc9bc6ecf7', 600, 800),
    'lord-krishna-square': uSquare('photo-1545468800-85cc9bc6ecf7'),
    'goddess-lakshmi': u('photo-1603228254119-e6a4d095dc59', 600, 800),
    'goddess-lakshmi-square': uSquare('photo-1603228254119-e6a4d095dc59'),
    'lord-hanuman': u('photo-1609766857041-ed402ea8069a', 600, 800),
    'lord-hanuman-square': uSquare('photo-1609766857041-ed402ea8069a'),
    'lord-vishnu': u('photo-1545468800-85cc9bc6ecf7', 600, 800),
    'lord-vishnu-square': uSquare('photo-1545468800-85cc9bc6ecf7'),
    'goddess-durga': u('photo-1603228254119-e6a4d095dc59', 600, 800),
    'goddess-durga-square': uSquare('photo-1603228254119-e6a4d095dc59'),
    'lord-rama': u('photo-1585128993280-9456c19c987d', 600, 800),
    'goddess-saraswati': u('photo-1603228254119-e6a4d095dc59', 600, 800),
    'lord-surya': u('photo-1506905925346-21bda4d32df4', 600, 800),
  },

  // ── Pujas / Rituals ────────────────────────────────────────
  pujas: {
    'rudrabhishek': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'ganesh-puja': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'satyanarayan-puja': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'navgraha-puja': u('photo-1506905925346-21bda4d32df4', 800, 600),
    'maha-mrityunjaya': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'lakshmi-puja': u('photo-1603228254119-e6a4d095dc59', 800, 600),
    'sundarkand-path': u('photo-1609766857041-ed402ea8069a', 800, 600),
    'kaal-sarp-dosh': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'mangal-dosh': u('photo-1603228254119-e6a4d095dc59', 800, 600),
    'vivah-puja': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'griha-pravesh': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'navaratri-puja': u('photo-1603228254119-e6a4d095dc59', 800, 600),
    'havan': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'abhishek': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'vastu-puja': u('photo-1585128993280-9456c19c987d', 800, 600),
    'pitru-dosh-puja': u('photo-1585128993280-9456c19c987d', 800, 600),
  },

  // ── Store / E-commerce Products ────────────────────────────
  store: {
    'brass-puja-thali': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'rudraksha-mala': u('photo-1609766857041-ed402ea8069a', 600, 600),
    'silver-diya': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'kumkum-set': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'camphor-pack': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'incense-sticks': u('photo-1506905925346-21bda4d32df4', 600, 600),
    'tulsi-mala': u('photo-1609766857041-ed402ea8069a', 600, 600),
    'puja-bell': u('photo-1585128993280-9456c19c987d', 600, 600),
    'brass-ganesha-idol': u('photo-1604948501466-4e9c339b9c24', 600, 600),
    'shiva-lingam': u('photo-1604948501466-4e9c339b9c24', 600, 600),
    'conch-shell': u('photo-1585128993280-9456c19c987d', 600, 600),
    'copper-kalash': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'sandalwood-paste': u('photo-1506905925346-21bda4d32df4', 600, 600),
    'sacred-thread': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'chandan-tika': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'hanuman-chalisa-book': u('photo-1609766857041-ed402ea8069a', 600, 600),
    'bhagavad-gita': u('photo-1545468800-85cc9bc6ecf7', 600, 600),
    'pooja-samagri-kit': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'cotton-wicks': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'ghee-lamp-oil': u('photo-1603228254119-e6a4d095dc59', 600, 600),
  },

  // ── Gaushala / Cow Seva ────────────────────────────────────
  gaushala: {
    'gir-cow': u('photo-1570042225831-d98fa7577f1e', 800, 600),
    'sahiwal-cow': u('photo-1570042225831-d98fa7577f1e', 800, 600),
    'tharparkar-cow': u('photo-1516467508483-a7212febe31a', 800, 600),
    'red-sindhi-cow': u('photo-1570042225831-d98fa7577f1e', 800, 600),
    'cow-feeding': u('photo-1570042225831-d98fa7577f1e', 800, 600),
    'cow-shelter': u('photo-1516467508483-a7212febe31a', 800, 600),
    'calf': u('photo-1570042225831-d98fa7577f1e', 600, 600),
    'cow-field': uWide('photo-1516467508483-a7212febe31a'),
    'gaushala-hero': uWide('photo-1516467508483-a7212febe31a'),
    'cow-care': u('photo-1570042225831-d98fa7577f1e', 800, 600),
  },

  // ── Spiritual Content ──────────────────────────────────────
  content: {
    'aarti': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'aarti-thumbnail': uSquare('photo-1545468800-85cc9bc6ecf7', 300),
    'chalisa': u('photo-1609766857041-ed402ea8069a', 800, 600),
    'chalisa-thumbnail': uSquare('photo-1609766857041-ed402ea8069a', 300),
    'mantra': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'mantra-thumbnail': uSquare('photo-1604948501466-4e9c339b9c24', 300),
    'bhajan': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'bhajan-thumbnail': uSquare('photo-1545468800-85cc9bc6ecf7', 300),
    'stotram': u('photo-1585128993280-9456c19c987d', 800, 600),
    'stotram-thumbnail': uSquare('photo-1585128993280-9456c19c987d', 300),
    'spiritual-talk': u('photo-1603228254119-e6a4d095dc59', 800, 600),
    'meditation': u('photo-1506905925346-21bda4d32df4', 800, 600),
    'yoga': u('photo-1544367567-0f2fcb009e0b', 800, 600),
  },

  // ── Hero / Banner Images ───────────────────────────────────
  hero: {
    home: uWide('photo-1548013146-72479768bada'),
    temples: uWide('photo-1548013146-72479768bada'),
    darshan: uWide('photo-1545468800-85cc9bc6ecf7'),
    astrology: uWide('photo-1506905925346-21bda4d32df4'),
    pujas: uWide('photo-1548013146-72479768bada'),
    store: uWide('photo-1603228254119-e6a4d095dc59'),
    content: uWide('photo-1604608672516-f1b9b1d37076'),
    gaushala: uWide('photo-1500595046743-cd271d694d30'),
    panchang: uWide('photo-1506905925346-21bda4d32df4'),
    'ask-pandit': uWide('photo-1585128993280-9456c19c987d'),
  },

  // ── Astrologers / Pandits ──────────────────────────────────
  astrologers: {
    male: [
      u('photo-1507003211169-0a1dd7228f2d', 400, 400),
      u('photo-1500648767791-00dcc994a43e', 400, 400),
      u('photo-1472099645785-5658abf4ff4e', 400, 400),
      u('photo-1506794778202-cad84cf45f1d', 400, 400),
      u('photo-1560250097-0b93528c311a', 400, 400),
      u('photo-1522075469751-3a6694fb2f61', 400, 400),
    ],
    female: [
      u('photo-1494790108377-be9c29b29330', 400, 400),
      u('photo-1438761681033-6461ffad8d80', 400, 400),
      u('photo-1534528741775-53994a69daeb', 400, 400),
      u('photo-1544005313-94ddf0286df2', 400, 400),
      u('photo-1488426862026-3ee34a7d66df', 400, 400),
      u('photo-1487412720507-e7ab37603c6f', 400, 400),
    ],
  },

  // ── Priests ────────────────────────────────────────────────
  priests: {
    profiles: [
      u('photo-1507003211169-0a1dd7228f2d', 300, 300),
      u('photo-1500648767791-00dcc994a43e', 300, 300),
      u('photo-1472099645785-5658abf4ff4e', 300, 300),
      u('photo-1506794778202-cad84cf45f1d', 300, 300),
    ],
  },

  // ── Backgrounds & Decorative ───────────────────────────────
  backgrounds: {
    'warm-gradient': u('photo-1507400492013-162706c8c05e', 1920, 1080),
    'temple-interior': u('photo-1585128993280-9456c19c987d', 1920, 1080),
    'sunrise': u('photo-1506905925346-21bda4d32df4', 1920, 1080),
    'diya-light': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
    'rangoli': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
    'flowers-offering': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
  },

  // ── Festivals ──────────────────────────────────────────────
  festivals: {
    'diwali': u('photo-1544367567-0f2fcb009e0b', 800, 600),
    'holi': u('photo-1522075469751-3a6694fb2f61', 800, 600),
    'navratri': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'ganesh-chaturthi': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'maha-shivaratri': u('photo-1604948501466-4e9c339b9c24', 800, 600),
    'ram-navami': u('photo-1585128993280-9456c19c987d', 800, 600),
    'janmashtami': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
    'raksha-bandhan': u('photo-1603228254119-e6a4d095dc59', 800, 600),
    'makar-sankranti': u('photo-1506905925346-21bda4d32df4', 800, 600),
    'chhath-puja': u('photo-1545468800-85cc9bc6ecf7', 800, 600),
  },

  // ── Misc / Placeholders ────────────────────────────────────
  placeholders: {
    avatar: u('photo-1535713875002-d1d0cf377fde', 200, 200),
    'temple-card': u('photo-1548013146-72479768bada', 400, 300),
    'puja-card': u('photo-1545468800-85cc9bc6ecf7', 400, 300),
    'product-card': u('photo-1603228254119-e6a4d095dc59', 400, 400),
    'video-thumbnail': u('photo-1548013146-72479768bada', 640, 360),
    'og-image': u('photo-1548013146-72479768bada', 1200, 630),
  },
} as const;

// ────────────────────────────────────────────────────────────
// Type definitions
// ────────────────────────────────────────────────────────────

export type ImageCategory = keyof typeof IMAGES;

export type TempleSlug = keyof typeof IMAGES.temples;
export type DeityKey = keyof typeof IMAGES.deities;
export type PujaSlug = keyof typeof IMAGES.pujas;
export type StoreProductSlug = keyof typeof IMAGES.store;
export type GaushalaKey = keyof typeof IMAGES.gaushala;
export type ContentKey = keyof typeof IMAGES.content;
export type HeroKey = keyof typeof IMAGES.hero;
export type FestivalKey = keyof typeof IMAGES.festivals;

// ────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────

/** Fallback image when a key is not found */
const FALLBACK_IMAGE = u('photo-1585128993280-9456c19c987d', 800, 600);

/**
 * Get an image URL by category and key, with optional size override.
 * Returns a fallback image if the key is not found.
 *
 * @param category - Top-level category (e.g. 'temples', 'deities')
 * @param key - Image key within that category (e.g. 'kashi-vishwanath', 'lord-shiva')
 * @param size - Optional 'WIDTHxHEIGHT' string to override dimensions (e.g. '400x300')
 * @returns The Unsplash image URL
 *
 * @example
 *   getImage('deities', 'lord-shiva')
 *   getImage('deities', 'lord-shiva', '400x300')
 *   getImage('temples', 'kashi-vishwanath') // returns hero image for temples
 */
export function getImage(
  category: string,
  key: string,
  size?: string
): string {
  const cat = (IMAGES as Record<string, unknown>)[category];
  if (!cat || typeof cat !== 'object') return FALLBACK_IMAGE;

  const record = cat as Record<string, unknown>;
  let url: string | undefined;

  const value = record[key];
  if (typeof value === 'string') {
    url = value;
  } else if (value && typeof value === 'object' && 'hero' in value) {
    url = (value as { hero: string }).hero;
  }

  if (!url) return FALLBACK_IMAGE;

  // Override size if requested
  if (size) {
    const [w, h] = size.split('x').map(Number);
    if (w && h) {
      url = url.replace(/w=\d+/, `w=${w}`).replace(/h=\d+/, `h=${h}`);
    }
  }

  return url;
}

/**
 * Get the temple hero image by slug.
 */
export function getTempleHero(slug: string): string {
  const temple = IMAGES.temples[slug as TempleSlug];
  return temple?.hero ?? FALLBACK_IMAGE;
}

/**
 * Get the temple thumbnail by slug.
 */
export function getTempleThumbnail(slug: string): string {
  const temple = IMAGES.temples[slug as TempleSlug];
  return temple?.thumbnail ?? FALLBACK_IMAGE;
}

/**
 * Get the temple gallery images by slug.
 */
export function getTempleGallery(slug: string): readonly string[] {
  const temple = IMAGES.temples[slug as TempleSlug];
  return temple?.gallery ?? [];
}

/**
 * Get a deity image by slug.
 */
export function getDeityImage(slug: string, variant: 'portrait' | 'square' = 'portrait'): string {
  const key = variant === 'square' ? `${slug}-square` : slug;
  return (IMAGES.deities as Record<string, string>)[key] ?? FALLBACK_IMAGE;
}

/**
 * Get a puja image by slug.
 */
export function getPujaImage(slug: string): string {
  return (IMAGES.pujas as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
}

/**
 * Get a store product image by slug.
 */
export function getProductImage(slug: string): string {
  return (IMAGES.store as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
}

/**
 * Get a hero/banner image by page name.
 */
export function getHeroImage(page: string): string {
  return (IMAGES.hero as Record<string, string>)[page] ?? FALLBACK_IMAGE;
}

/**
 * Get a random astrologer profile image.
 */
export function getAstrologerImage(gender: 'male' | 'female', index: number): string {
  const pool = IMAGES.astrologers[gender];
  return pool[index % pool.length] ?? FALLBACK_IMAGE;
}

/**
 * Get a festival image by slug.
 */
export function getFestivalImage(slug: string): string {
  return (IMAGES.festivals as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
}

/**
 * Get content category image.
 */
export function getContentImage(type: string, variant: 'full' | 'thumbnail' = 'full'): string {
  const key = variant === 'thumbnail' ? `${type}-thumbnail` : type;
  return (IMAGES.content as Record<string, string>)[key] ?? FALLBACK_IMAGE;
}
