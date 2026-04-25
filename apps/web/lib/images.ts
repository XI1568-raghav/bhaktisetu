/**
 * Centralized Image Map for Darshya
 * =====================================
 * All image URLs used across the application are defined here.
 * Import from this file instead of hardcoding URLs in components.
 *
 * Sources:
 *   - Famous temples, deities, festivals, pujas → Wikimedia Commons (real photos
 *     of the actual subject; CC-BY-SA / CC-BY / public domain). See /credits.
 *   - Generic store products, profile photos, abstract backgrounds → Unsplash
 *     (stock photography, free to use).
 *
 * Usage:
 *   import { IMAGES, getTempleHero } from '@/lib/images';
 *   <img src={getTempleHero('kashi-vishwanath')} />
 */

const UNSPLASH_BASE = 'https://images.unsplash.com';

function qualityFor(w: number, h: number): number {
  const max = Math.max(w, h);
  if (max >= 1400) return 85;
  if (max >= 700) return 80;
  if (max >= 300) return 75;
  return 70;
}

function u(photoId: string, w = 800, h = 600): string {
  const q = qualityFor(w, h);
  return `${UNSPLASH_BASE}/${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=${q}`;
}

function uWide(photoId: string): string {
  return u(photoId, 1600, 700);
}

function uSquare(photoId: string, size = 400): string {
  return u(photoId, size, size);
}

function uPortrait(photoId: string): string {
  return u(photoId, 600, 900);
}

/**
 * Pass-through for a Wikimedia Commons URL. Commons serves the original or
 * a /thumb/ variant; both are stable, permanently hosted, and CDN-cached.
 */
function wiki(url: string): string {
  return url;
}

/**
 * Resize a Wikimedia Commons /thumb/ URL to a different width.
 * For non-thumb URLs (originals), returns as-is.
 *
 * Example:
 *   wikiResize('.../thumb/a/bc/Foo.jpg/1280px-Foo.jpg', 600)
 *   → '.../thumb/a/bc/Foo.jpg/1280px-Foo.jpg'
 */
export function wikiResize(url: string, width: number): string {
  if (!url.includes('upload.wikimedia.org/wikipedia/commons/thumb/')) return url;
  return url.replace(/\/(\d+)px-/, `/${width}px-`);
}

/**
 * Resize an Unsplash URL by replacing its w/h/q params.
 */
export function resizeImage(
  url: string,
  preset: 'hero' | 'card' | 'thumb' | 'avatar',
): string {
  if (!url.includes('images.unsplash.com')) {
    // Wikimedia: pick a thumb width matching the preset
    const widths = { hero: 1600, card: 800, thumb: 400, avatar: 200 };
    return wikiResize(url, widths[preset]);
  }
  const dims = {
    hero:   { w: 1600, h: 900, q: 85 },
    card:   { w: 800,  h: 600, q: 80 },
    thumb:  { w: 400,  h: 300, q: 75 },
    avatar: { w: 160,  h: 160, q: 70 },
  }[preset];
  return url
    .replace(/([?&])w=\d+/, `$1w=${dims.w}`)
    .replace(/([?&])h=\d+/, `$1h=${dims.h}`)
    .replace(/([?&])q=\d+/, `$1q=${dims.q}`);
}

// ────────────────────────────────────────────────────────────
// IMAGES — The single source of truth for all imagery
// ────────────────────────────────────────────────────────────

// Wikimedia photo URLs are permanent. Each was sourced via the official Commons
// MediaWiki API and verified HTTP 200. To swap one, find a replacement at
// https://commons.wikimedia.org and update the URL + the /credits page.

export const IMAGES = {
  // ── Temples ────────────────────────────────────────────────
  // Each entry uses real photos of the actual shrine from Wikimedia Commons.
  temples: {
    'kashi-vishwanath': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
      ],
    },
    'tirumala-tirupati': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
      ],
    },
    'siddhivinayak': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/1280px-Shree_Siddhivinayak_Temple_Mumbai.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/1280px-Shree_Siddhivinayak_Temple_Mumbai.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/1280px-Shree_Siddhivinayak_Temple_Mumbai.jpg'),
      ],
    },
    'somnath': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Somanath_mandir_%28cropped%29.jpg/1280px-Somanath_mandir_%28cropped%29.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Somanath_mandir_%28cropped%29.jpg/1280px-Somanath_mandir_%28cropped%29.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Somanath_mandir_%28cropped%29.jpg/1280px-Somanath_mandir_%28cropped%29.jpg'),
      ],
    },
    'jagannath-puri': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
      ],
    },
    'golden-temple': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/94/The_Golden_Temple_of_Amrithsar_7.jpg/1280px-The_Golden_Temple_of_Amrithsar_7.jpg'),
      ],
    },
    'meenakshi-temple': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
      ],
    },
    'kedarnath': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1280px-Kedarnath_Temple_in_Rainy_season.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1280px-Kedarnath_Temple_in_Rainy_season.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/56/Kedarnath_Temple_in_Rainy_season.jpg/1280px-Kedarnath_Temple_in_Rainy_season.jpg'),
      ],
    },
    'badrinath': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/1280px-Badrinath_Temple_%2C_Uttarakhand.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/1280px-Badrinath_Temple_%2C_Uttarakhand.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Badrinath_Temple_%2C_Uttarakhand.jpg/1280px-Badrinath_Temple_%2C_Uttarakhand.jpg'),
      ],
    },
    'akshardham': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/e/e9/Swaminarayan_Akshardham%2C_Delhi.jpg'),
      ],
    },
    'mahakaleshwar': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Mahakaleshwar_Temple%2C_Ujjain.jpg/1280px-Mahakaleshwar_Temple%2C_Ujjain.jpg'),
      ],
    },
    'tirupati': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
      ],
    },
    'iskcon-vrindavan': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vrindavan%2C_India_%2821178969102%29.jpg/1280px-Vrindavan%2C_India_%2821178969102%29.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vrindavan%2C_India_%2821178969102%29.jpg/1280px-Vrindavan%2C_India_%2821178969102%29.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Vrindavan%2C_India_%2821178969102%29.jpg/1280px-Vrindavan%2C_India_%2821178969102%29.jpg'),
      ],
    },
    'dwarkadhish': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/0/0c/Dwarakadheesh_Temple%2C_2014.jpg'),
      ],
    },
    'meenakshi-amman': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
      gallery: [
        wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg'),
      ],
    },

    // ── 12 Jyotirlingas (each is a unique Shiva shrine) ──────
    'mallikarjuna': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/5/53/MKJNTemple.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/5/53/MKJNTemple.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/5/53/MKJNTemple.jpg')],
    },
    'omkareshwar': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Omkareswar_Jyotirlinga.jpg/1280px-Omkareswar_Jyotirlinga.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Omkareswar_Jyotirlinga.jpg/1280px-Omkareswar_Jyotirlinga.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/Omkareswar_Jyotirlinga.jpg/1280px-Omkareswar_Jyotirlinga.jpg')],
    },
    'bhimashankar': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/d/d7/Bhimashankar.jpg')],
    },
    'trimbakeshwar': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg/1280px-Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg/1280px-Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg/1280px-Trimbakeshwar_Temple-Nashik-Maharashtra-1.jpg')],
    },
    'vaidyanath': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg/1280px-Baidyanath_temple_and_temple_complex%2C_Deoghar_04.jpg')],
    },
    'nageshwar': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Nageshwar.JPG/1280px-Nageshwar.JPG'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Nageshwar.JPG/1280px-Nageshwar.JPG'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Nageshwar.JPG/1280px-Nageshwar.JPG')],
    },
    'rameshwaram': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ramanathaswamy_temple7.JPG/1280px-Ramanathaswamy_temple7.JPG'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ramanathaswamy_temple7.JPG/1280px-Ramanathaswamy_temple7.JPG'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/Ramanathaswamy_temple7.JPG/1280px-Ramanathaswamy_temple7.JPG')],
    },
    'grishneshwar': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Grishneshwar_temple_in_Aurangabad_district.jpg/1280px-Grishneshwar_temple_in_Aurangabad_district.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Grishneshwar_temple_in_Aurangabad_district.jpg/1280px-Grishneshwar_temple_in_Aurangabad_district.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Grishneshwar_temple_in_Aurangabad_district.jpg/1280px-Grishneshwar_temple_in_Aurangabad_district.jpg')],
    },

    // ── Char Dham (Yamunotri, Gangotri — Kedarnath/Badrinath above) ──
    'yamunotri': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Yamunotri_temple_and_ashram.jpg/1280px-Yamunotri_temple_and_ashram.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Yamunotri_temple_and_ashram.jpg/1280px-Yamunotri_temple_and_ashram.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Yamunotri_temple_and_ashram.jpg/1280px-Yamunotri_temple_and_ashram.jpg')],
    },
    'gangotri': {
      hero: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gangotri_Temple_2.jpg/1280px-Gangotri_Temple_2.jpg'),
      thumbnail: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gangotri_Temple_2.jpg/1280px-Gangotri_Temple_2.jpg'),
      gallery: [wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Gangotri_Temple_2.jpg/1280px-Gangotri_Temple_2.jpg')],
    },
  },

  // ── Deities (real Wikimedia depictions: Ravi Varma paintings, sculptures) ──
  deities: {
    'lord-shiva': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
    'lord-shiva-square': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
    'lord-ganesha': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_***REMOVED***.jpg'),
    'lord-ganesha-square': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_***REMOVED***.jpg'),
    'lord-krishna': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
    'lord-krishna-square': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
    'goddess-lakshmi': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
    'goddess-lakshmi-square': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
    'lord-hanuman': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
    'lord-hanuman-square': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
    'lord-vishnu': wiki('https://upload.wikimedia.org/wikipedia/commons/e/ef/Vishnu_from_Gita_Govinda.jpg'),
    'lord-vishnu-square': wiki('https://upload.wikimedia.org/wikipedia/commons/e/ef/Vishnu_from_Gita_Govinda.jpg'),
    'goddess-durga': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),
    'goddess-durga-square': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),
    'lord-rama': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Lord_Rama_with_arrows.jpg/1280px-Lord_Rama_with_arrows.jpg'),
    'goddess-saraswati': wiki('https://upload.wikimedia.org/wikipedia/commons/1/12/Saraswati.jpg'),
    'lord-surya': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
  },

  // ── Pujas / Rituals ────────────────────────────────────────
  pujas: {
    'rudrabhishek': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
    'abhishek': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
    'havan': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Priest_performing_Homa.jpg/1280px-Priest_performing_Homa.jpg'),
    'ganesh-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_***REMOVED***.jpg'),
    'satyanarayan-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/e/ef/Vishnu_from_Gita_Govinda.jpg'),
    'navgraha-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
    'maha-mrityunjaya': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
    'lakshmi-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
    'sundarkand-path': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
    'kaal-sarp-dosh': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
    'mangal-dosh': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
    'vivah-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
    'griha-pravesh': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
    'navaratri-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),
    'vastu-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
    'pitru-dosh-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Priest_performing_Homa.jpg/1280px-Priest_performing_Homa.jpg'),
  },

  // ── Store / E-commerce Products ────────────────────────────
  // Stock photography for generic merchandise — Unsplash is the right fit here.
  store: {
    'brass-puja-thali': u('photo-1604608672516-f1b9b1d37076', 600, 600),
    'brass-diya': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'puja-bell': u('photo-1585128993280-9456c19c987d', 600, 600),
    'incense-sticks': u('photo-1506905925346-21bda4d32df4', 600, 600),
    'camphor-pack': u('photo-1545468800-85cc9bc6ecf7', 600, 600),
    'kumkum-set': u('photo-1590077428593-a55bb07c4665', 600, 600),
    'cotton-wicks': u('photo-1544367567-0f2fcb009e0b', 600, 600),

    'rudraksha-mala': u('photo-1609766857041-ed402ea8069a', 600, 600),
    'tulsi-mala': u('photo-1600093463592-8e36ae95ef56', 600, 600),
    'crystal-mala': u('photo-1514222134-b57cbb8ce073', 600, 600),

    'ganesh-murti': wiki('https://upload.wikimedia.org/wikipedia/commons/6/64/Ganesha_Basohli_miniature_***REMOVED***.jpg'),
    'krishna-idol': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a9/Krishna_Holds_Up_Mount_Govardhan_%28MET_70694%29_cropped.png'),
    'shiva-lingam': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Bangalore_Shiva.jpg/1280px-Bangalore_Shiva.jpg'),
    'lakshmi-idol': wiki('https://upload.wikimedia.org/wikipedia/commons/a/a6/Raja_Ravi_Varma%2C_Goddess_Lakshmi%2C_1896.jpg'),
    'durga-idol': wiki('https://upload.wikimedia.org/wikipedia/commons/6/65/Mahishasura-Mardini_Durga.jpg'),

    'pooja-samagri-kit': u('photo-1604608672516-f1b9b1d37076', 600, 600),
    'navratri-kit': u('photo-1603228254119-e6a4d095dc59', 600, 600),
    'copper-kalash': u('photo-1548013146-72479768bada', 600, 600),
    'havan-samagri': u('photo-1545468800-85cc9bc6ecf7', 600, 600),

    'bhagavad-gita': u('photo-1544367567-0f2fcb009e0b', 600, 600),
    'hanuman-chalisa-book': u('photo-1609766857041-ed402ea8069a', 600, 600),
    'sunderkand-book': u('photo-1585128993280-9456c19c987d', 600, 600),

    'rudraksha-bracelet': u('photo-1609766857041-ed402ea8069a', 600, 600),
    'om-pendant': u('photo-1506905925346-21bda4d32df4', 600, 600),
    'sacred-thread': u('photo-1603228254119-e6a4d095dc59', 600, 600),

    'cow-ghee': u('photo-1570042225831-d98fa7577f1e', 600, 600),
    'sandalwood-paste': u('photo-1506905925346-21bda4d32df4', 600, 600),
    'ghee-lamp-oil': u('photo-1603228254119-e6a4d095dc59', 600, 600),

    'wooden-mandir': u('photo-1585128993280-9456c19c987d', 600, 600),
    'led-diya-set': u('photo-1604608672516-f1b9b1d37076', 600, 600),
    'brass-hanging-bell': u('photo-1548013146-72479768bada', 600, 600),
    'wall-om-decor': u('photo-1500595046743-cd271d694d30', 600, 600),

    'silk-dhoti-set': u('photo-1514222134-b57cbb8ce073', 600, 600),
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

  // ── Spiritual Content (aartis, chalisas, mantras, bhajans) ──
  content: {
    'aarti': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
    'aarti-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
    'chalisa': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
    'chalisa-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/a/ae/StandingHanumanCholaDynasty11thCentury.jpg'),
    'mantra': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
    'mantra-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
    'bhajan': wiki('https://upload.wikimedia.org/wikipedia/commons/0/04/Navaratri_Bajan.jpg'),
    'bhajan-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/0/04/Navaratri_Bajan.jpg'),
    'stotram': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
    'stotram-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Gayatri_japa.jpg/1280px-Gayatri_japa.jpg'),
    'spiritual-talk': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg/1280px-1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg'),
    'meditation': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg/1280px-1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg'),
    'yoga': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/e/e6/1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg/1280px-1_Sannyasi_in_yoga_meditation_on_the_Ganges%2C_Rishikesh_cropped.jpg'),
  },

  // ── Hero / Banner Images ───────────────────────────────────
  hero: {
    home: wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
    temples: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Tirumala_090615.jpg/1280px-Tirumala_090615.jpg'),
    darshan: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Shri_Jagannath_temple.jpg/1280px-Shri_Jagannath_temple.jpg'),
    astrology: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
    pujas: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
    store: u('photo-1603228254119-e6a4d095dc59', 1600, 700),
    content: wiki('https://upload.wikimedia.org/wikipedia/commons/4/43/%281%29_Aarti_Thali%2C_Prayer_Plate_India.jpg'),
    gaushala: u('photo-1516467508483-a7212febe31a', 1600, 700),
    panchang: wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
    'ask-pandit': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Priest_performing_Homa.jpg/1280px-Priest_performing_Homa.jpg'),
  },

  // ── Astrologers / Pandits (stock portraits) ────────────────
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

  // ── Priests (stock portraits) ──────────────────────────────
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
    'temple-interior': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
    'sunrise': u('photo-1506905925346-21bda4d32df4', 1920, 1080),
    'diya-light': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
    'rangoli': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/The_Rangoli_of_Lights.jpg/1280px-The_Rangoli_of_Lights.jpg'),
    'flowers-offering': u('photo-1603228254119-e6a4d095dc59', 1920, 1080),
  },

  // ── Festivals (real festival photos from Wikimedia) ────────
  festivals: {
    'diwali': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/The_Rangoli_of_Lights.jpg/1280px-The_Rangoli_of_Lights.jpg'),
    'holi': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/bf/Holi_Festival_of_Colors.jpg/1280px-Holi_Festival_of_Colors.jpg'),
    'navratri': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Shardiya_Navratri_Festival_in_Pune_2020.jpg/1280px-Shardiya_Navratri_Festival_in_Pune_2020.jpg'),
    'ganesh-chaturthi': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Khairathabad_Vinayakudu_2021.jpg/1280px-Khairathabad_Vinayakudu_2021.jpg'),
    'maha-shivaratri': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/02_Mahashivratree_festival.JPG/1280px-02_Mahashivratree_festival.JPG'),
    'ram-navami': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Lord_Rama_with_arrows.jpg/1280px-Lord_Rama_with_arrows.jpg'),
    'janmashtami': wiki('https://upload.wikimedia.org/wikipedia/commons/0/07/Yesoda-krishna.jpg'),
    'raksha-bandhan': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/f/fc/Rakhi_1.JPG/1280px-Rakhi_1.JPG'),
    'makar-sankranti': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/2/21/Surya_with_Adityas_and_attendants.jpg/1280px-Surya_with_Adityas_and_attendants.jpg'),
    'chhath-puja': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/JanakpurChhathParvaFestival.jpg/1280px-JanakpurChhathParvaFestival.jpg'),
  },

  // ── Misc / Placeholders ────────────────────────────────────
  placeholders: {
    avatar: u('photo-1535713875002-d1d0cf377fde', 200, 200),
    'temple-card': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
    'puja-card': wiki('https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/From_Abhisheka_To_Panchamrutha.jpg/1280px-From_Abhisheka_To_Panchamrutha.jpg'),
    'product-card': u('photo-1603228254119-e6a4d095dc59', 400, 400),
    'video-thumbnail': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
    'og-image': wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg'),
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

const FALLBACK_IMAGE = wiki('https://upload.wikimedia.org/wikipedia/commons/f/ff/Kashi_Vishwanath.jpg');

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

  if (size && url.includes('images.unsplash.com')) {
    const [w, h] = size.split('x').map(Number);
    if (w && h) {
      url = url.replace(/w=\d+/, `w=${w}`).replace(/h=\d+/, `h=${h}`);
    }
  }

  return url;
}

export function getTempleHero(slug: string): string {
  const temple = IMAGES.temples[slug as TempleSlug];
  return temple?.hero ?? FALLBACK_IMAGE;
}

export function getTempleThumbnail(slug: string): string {
  const temple = IMAGES.temples[slug as TempleSlug];
  return temple?.thumbnail ?? FALLBACK_IMAGE;
}

export function getTempleGallery(slug: string): readonly string[] {
  const temple = IMAGES.temples[slug as TempleSlug];
  return temple?.gallery ?? [];
}

export function getDeityImage(slug: string, variant: 'portrait' | 'square' = 'portrait'): string {
  const key = variant === 'square' ? `${slug}-square` : slug;
  const deities = IMAGES.deities as Record<string, string>;
  return deities[key] ?? deities[slug] ?? FALLBACK_IMAGE;
}

export function getPujaImage(slug: string): string {
  return (IMAGES.pujas as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
}

export function getProductImage(slug: string): string {
  return (IMAGES.store as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
}

export function getHeroImage(page: string): string {
  return (IMAGES.hero as Record<string, string>)[page] ?? FALLBACK_IMAGE;
}

export function getAstrologerImage(gender: 'male' | 'female', index: number): string {
  const pool = IMAGES.astrologers[gender];
  return pool[index % pool.length] ?? FALLBACK_IMAGE;
}

export function getFestivalImage(slug: string): string {
  return (IMAGES.festivals as Record<string, string>)[slug] ?? FALLBACK_IMAGE;
}

export function getContentImage(type: string, variant: 'full' | 'thumbnail' = 'full'): string {
  const key = variant === 'thumbnail' ? `${type}-thumbnail` : type;
  const content = IMAGES.content as Record<string, string>;
  return content[key] ?? content[type] ?? FALLBACK_IMAGE;
}
