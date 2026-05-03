#!/usr/bin/env node
/**
 * Dropship seed for MedusaJS — 20 products across 5 categories.
 *
 * Runs against either:
 *   1. A live Medusa instance (POSTs to /admin/products) when MEDUSA_ADMIN_URL + MEDUSA_ADMIN_TOKEN are set.
 *   2. Otherwise emits the catalogue as JSON to stdout for inspection /
 *      hand-off to a SQL seed (Postgres `Product` table).
 *
 * Real product images via Wikimedia thumb URLs (free, no auth).
 */

const CATEGORIES = [
  { slug: 'brass-diya', name: 'Brass Diya', commissionPct: 30 },
  { slug: 'rudraksha-mala', name: 'Rudraksha Mala', commissionPct: 25 },
  { slug: 'pooja-thali-set', name: 'Pooja Thali Set', commissionPct: 20 },
  { slug: 'tulsi-mala', name: 'Tulsi Mala', commissionPct: 25 },
  { slug: 'bhagavad-gita', name: 'Bhagavad Gita', commissionPct: 15 },
];

const wikiThumb = (file, w = 600) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${file}/${w}px-${file.split('/').pop()}`;

export const PRODUCTS = [
  // ── Brass Diya ────────────────────────────────────────────────
  { handle: 'brass-diya-lotus-pair', title: 'Brass Diya Lotus Pair', priceInr: 349, weight: 350, category: 'brass-diya',
    description: 'Hand-cast brass lotus diya pair. Pure brass, polished gold finish, stable flat base.',
    image: wikiThumb('e/e8/Brass_diya_lamp.jpg/1024px-Brass_diya_lamp.jpg') },
  { handle: 'brass-diya-traditional-7-wick', title: 'Traditional 7-Wick Brass Diya', priceInr: 599, weight: 500, category: 'brass-diya',
    description: 'Heavy brass aarti diya with seven wick spouts, ideal for evening aarti and festival pujas.',
    image: wikiThumb('1/15/Diya_-_Brass_oil_lamp.jpg/800px-Diya_-_Brass_oil_lamp.jpg') },
  { handle: 'brass-diya-elephant-stand', title: 'Brass Diya with Elephant Stand', priceInr: 899, weight: 700, category: 'brass-diya',
    description: 'Decorative brass diya mounted on twin elephant stand. Perfect mandir centerpiece.',
    image: wikiThumb('e/e8/Brass_diya_lamp.jpg/1024px-Brass_diya_lamp.jpg') },
  { handle: 'brass-diya-kuber-deep', title: 'Brass Kuber Deep Diya', priceInr: 449, weight: 380, category: 'brass-diya',
    description: 'Auspicious Kuber deep diya in pure brass — used for Diwali Lakshmi puja.',
    image: wikiThumb('1/15/Diya_-_Brass_oil_lamp.jpg/800px-Diya_-_Brass_oil_lamp.jpg') },

  // ── Rudraksha Mala ───────────────────────────────────────────
  { handle: 'rudraksha-mala-5-mukhi-108', title: '5 Mukhi Rudraksha Mala (108 beads)', priceInr: 799, weight: 60, category: 'rudraksha-mala',
    description: 'Authentic 5-face Nepali rudraksha mala, 108 beads + sumeru bead, knotted on natural cotton thread.',
    image: wikiThumb('5/5d/Rudraksha_Mala_108_beads.jpg/800px-Rudraksha_Mala_108_beads.jpg') },
  { handle: 'rudraksha-mala-7-mukhi', title: '7 Mukhi Rudraksha Bracelet', priceInr: 1299, weight: 30, category: 'rudraksha-mala',
    description: 'Hand-strung 7-mukhi rudraksha bracelet. Traditionally worn for Goddess Lakshmi blessings.',
    image: wikiThumb('5/5d/Rudraksha_Mala_108_beads.jpg/800px-Rudraksha_Mala_108_beads.jpg') },
  { handle: 'rudraksha-mala-1-mukhi-pendant', title: '1 Mukhi Rudraksha Pendant', priceInr: 2499, weight: 20, category: 'rudraksha-mala',
    description: 'Rare 1-face rudraksha pendant in silver cap, with certificate of authenticity.',
    image: wikiThumb('a/a1/Rudraksha_seed.jpg/600px-Rudraksha_seed.jpg') },
  { handle: 'rudraksha-mala-mixed-mukhi', title: 'Siddha Mixed Mukhi Mala', priceInr: 1899, weight: 80, category: 'rudraksha-mala',
    description: 'Mixed 1–14 mukhi rudraksha mala, energised at Trimbakeshwar. 108 + sumeru beads.',
    image: wikiThumb('5/5d/Rudraksha_Mala_108_beads.jpg/800px-Rudraksha_Mala_108_beads.jpg') },

  // ── Pooja Thali Set ──────────────────────────────────────────
  { handle: 'pooja-thali-brass-7pc', title: 'Brass Pooja Thali Set (7 piece)', priceInr: 1299, weight: 1200, category: 'pooja-thali-set',
    description: 'Seven-piece brass thali: thali, diya, incense holder, bell, kumkum container, water vessel, flower plate.',
    image: wikiThumb('c/c1/Puja_thali.jpg/1024px-Puja_thali.jpg') },
  { handle: 'pooja-thali-german-silver', title: 'German Silver Pooja Thali', priceInr: 999, weight: 800, category: 'pooja-thali-set',
    description: 'Polished German silver thali with engraved Om motif. Includes diya and bell.',
    image: wikiThumb('c/c1/Puja_thali.jpg/1024px-Puja_thali.jpg') },
  { handle: 'pooja-thali-copper-deluxe', title: 'Copper Deluxe Pooja Thali', priceInr: 1599, weight: 1400, category: 'pooja-thali-set',
    description: 'Pure copper thali set, hand-hammered. Excellent for Surya Arghya and griha pravesh.',
    image: wikiThumb('c/c1/Puja_thali.jpg/1024px-Puja_thali.jpg') },
  { handle: 'pooja-thali-mini-travel', title: 'Mini Travel Pooja Thali', priceInr: 549, weight: 400, category: 'pooja-thali-set',
    description: 'Compact 5-piece travel thali for hotels, hostels, and on-the-go puja.',
    image: wikiThumb('c/c1/Puja_thali.jpg/1024px-Puja_thali.jpg') },

  // ── Tulsi Mala ───────────────────────────────────────────────
  { handle: 'tulsi-mala-vrindavan-108', title: 'Vrindavan Tulsi Mala (108 beads)', priceInr: 299, weight: 40, category: 'tulsi-mala',
    description: 'Authentic tulsi wood mala from Vrindavan, 108 beads, hand-knotted on cotton.',
    image: wikiThumb('e/e8/Tulasi_mala.jpg/600px-Tulasi_mala.jpg') },
  { handle: 'tulsi-mala-double-strand', title: 'Tulsi Double-Strand Kanthi', priceInr: 199, weight: 25, category: 'tulsi-mala',
    description: 'Traditional Vaishnav double-strand tulsi kanthi. Worn round the neck.',
    image: wikiThumb('e/e8/Tulasi_mala.jpg/600px-Tulasi_mala.jpg') },
  { handle: 'tulsi-mala-large-bead', title: 'Large Bead Tulsi Japa Mala', priceInr: 449, weight: 60, category: 'tulsi-mala',
    description: 'Large-bead tulsi japa mala for clear bead-counting during long chants.',
    image: wikiThumb('e/e8/Tulasi_mala.jpg/600px-Tulasi_mala.jpg') },
  { handle: 'tulsi-mala-silver-cap', title: 'Tulsi Mala with Silver Cap', priceInr: 599, weight: 50, category: 'tulsi-mala',
    description: 'Premium tulsi mala finished with sterling silver caps and sumeru bead.',
    image: wikiThumb('e/e8/Tulasi_mala.jpg/600px-Tulasi_mala.jpg') },

  // ── Bhagavad Gita ────────────────────────────────────────────
  { handle: 'bhagavad-gita-as-it-is-hindi', title: 'Bhagavad Gita As It Is (Hindi)', priceInr: 399, weight: 850, category: 'bhagavad-gita',
    description: 'Srila Prabhupada — full Hindi translation with Sanskrit verses and purports. Hardcover.',
    image: wikiThumb('1/14/Bhagavad-gita.jpg/600px-Bhagavad-gita.jpg') },
  { handle: 'bhagavad-gita-as-it-is-english', title: 'Bhagavad Gita As It Is (English)', priceInr: 499, weight: 900, category: 'bhagavad-gita',
    description: 'Srila Prabhupada — English translation, deluxe hardcover edition.',
    image: wikiThumb('1/14/Bhagavad-gita.jpg/600px-Bhagavad-gita.jpg') },
  { handle: 'bhagavad-gita-pocket-sanskrit', title: 'Bhagavad Gita Pocket Sanskrit', priceInr: 149, weight: 200, category: 'bhagavad-gita',
    description: 'Pure Sanskrit pocket edition — easy to carry, ideal for daily parayana.',
    image: wikiThumb('1/14/Bhagavad-gita.jpg/600px-Bhagavad-gita.jpg') },
  { handle: 'bhagavad-gita-gita-press', title: 'Gita Press Bhagavad Gita (Sadhak Sanjeevani)', priceInr: 249, weight: 700, category: 'bhagavad-gita',
    description: 'Gita Press Gorakhpur classic with Swami Ramsukhdas commentary in Hindi.',
    image: wikiThumb('1/14/Bhagavad-gita.jpg/600px-Bhagavad-gita.jpg') },
];

export { CATEGORIES };

async function seedToMedusa() {
  const url = process.env.MEDUSA_ADMIN_URL;
  const token = process.env.MEDUSA_ADMIN_TOKEN;
  if (!url || !token) {
    console.log(JSON.stringify({ products: PRODUCTS, categories: CATEGORIES }, null, 2));
    console.error('\n[seed] MEDUSA_ADMIN_URL or MEDUSA_ADMIN_TOKEN unset — emitted catalogue to stdout.');
    return;
  }
  for (const p of PRODUCTS) {
    const res = await fetch(`${url}/admin/products`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: p.title,
        handle: p.handle,
        description: p.description,
        weight: p.weight,
        images: [{ url: p.image }],
        variants: [{ title: 'Default', prices: [{ amount: p.priceInr * 100, currency_code: 'inr' }], inventory_quantity: 100 }],
      }),
    });
    if (!res.ok) console.error(`[seed] ${p.handle} failed: ${res.status}`);
    else console.log(`[seed] ok: ${p.handle}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedToMedusa().catch((e) => { console.error(e); process.exit(1); });
}
