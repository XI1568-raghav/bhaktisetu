import { commonsThumb } from '../lib/commons-thumb.js';
import { computeDeliveryFeeInr, computeStoreOrderTotals } from '../lib/store-pricing.js';

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * The hand-written catalogue row shape — what the 24 literals below are.
 *
 * Deliberately NOT the shape served over the wire: a row on its own says
 * nothing about whether it can be bought, and that omission is the bug this
 * module now closes. See `Product`.
 */
export interface CatalogueRow {
  id: string;
  handle: string;
  title: string;
  description: string;
  features: string[];
  price: number;
  compareAtPrice: number | null;
  discount: number;
  currency: string;
  images: { url: string; alt: string }[];
  category: string;
  collection: string;
  tag: string | null;
  inStock: boolean;
  freeDelivery: boolean;
  rating: number;
  reviewCount: number;
  weight: string | null;
  sku: string;
}

/** Where a catalogue entry came from, and therefore what its `id` means. */
export type ProductSource =
  /** A hand-written row in this file. `id` is `prod_NNN`. Not orderable. */
  | 'fixture'
  /** A real `store_products` row. `id` is the uuid POST /store/orders resolves. */
  | 'live';

/**
 * COM-01 — the catalogue and the order path must agree on product identity.
 *
 * `POST /store/orders` resolves every line item against `StoreProduct` BY UUID
 * (routes/store-orders.ts). The 24 rows below have ids like `prod_015`, which
 * no `store_products` row has ever had, so the entire shopper-facing catalogue
 * answered `400 Unknown product: prod_015` at checkout — on web and on mobile
 * alike. Every item a shopper could see was unorderable; the only orderable
 * rows came from GET /store/products/live, of which prod has zero.
 *
 * The fix is NOT to seed these 24 as real rows. Verified read-only against prod
 * on 2026-09-08 (scripts/check-store-catalogue.mjs): `store_products` = 0,
 * `store_profiles` = 0, `store_orders` = 0. There is no seller, no stock
 * record, no warehouse and no fulfilment behind any of them — they are
 * marketing copy over Wikimedia Commons photographs. Minting uuids for them
 * would let a devotee pay for a brass thali that nobody owns and nobody can
 * ship, which is a worse defect than the one being fixed, not a smaller one.
 *
 * So identity is made EXPLICIT instead of inferred. Every product this service
 * serves now carries `source`, `buyable` and `unavailableReason`, and the
 * invariant is one line:
 *
 *     buyable === true  ⇔  source === 'live'  ⇔  id is a StoreProduct uuid
 *
 * i.e. anything the catalogue presents as buyable is something the order route
 * accepts. Pinned by services/store-catalogue-order-parity.test.ts.
 */
export type Product = Omit<CatalogueRow, 'rating'> & {
  source: ProductSource;
  /** True only when `id` is a uuid POST /store/orders can resolve. */
  buyable: boolean;
  /** Plain-language reason, in shopper-facing words. `null` when buyable. */
  unavailableReason: string | null;
  /**
   * The star average, or `null` when nothing has been rated.
   *
   * Widened from `number` for the seller rows: apps/mobile renders the badge on
   * `rating !== null` ((devotee)/store.tsx:145), so a brand-new listing sent
   * through as `0` would print "★ 0" — a rating a shopper would read as awful,
   * derived from no reviews at all. LEG-17 made the same call on the web when
   * it deleted the hardcoded 4.4-4.9 averages: `null` (not 0) so "not rated
   * yet" stays distinguishable from "rated zero". The fixtures keep their
   * numbers; only a row with no reviews behind it answers null.
   */
  rating: number | null;
};

/**
 * The sentence a shopper is owed in place of a checkout that cannot complete.
 * Clients render this verbatim — do not make it a code the UI has to translate.
 */
export const FIXTURE_UNAVAILABLE_REASON =
  'This is a preview of the kind of item Darshya sellers will list. No seller stocks it yet, so it cannot be ordered.';

/** The uuid shape `POST /store/orders` filters its StoreProduct lookup on. */
export const STORE_PRODUCT_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Collection {
  id: string;
  handle: string;
  title: string;
  description: string;
  productCount: number;
  image: string | null;
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  tax: number;
  total: number;
  currency: string;
  itemCount: number;
  /**
   * COM-01: false when at least one line item is something POST /store/orders
   * cannot resolve, so checkout would refuse. True for an empty basket — empty
   * is a separate condition the route answers on its own.
   */
  orderable: boolean;
  /** The first blocking item's reason, in shopper words. null when orderable. */
  unorderableReason: string | null;
}

export interface ProductsParams {
  collection?: string;
  category?: string;
  sort?: string;
  page?: number;
  limit?: number;
  q?: string;
  minPrice?: number;
  maxPrice?: number;
}

// ─── Image Helper ────────────────────────────────────────────────────
// Accepts either an Unsplash photo ID (legacy) or a full URL (Wikimedia /
// other CDN).
//
// COM-18 (prod sweep 2026-08-12): absolute Wikimedia URLs used to pass through
// unchanged, which meant this catalogue handed out 4-6 MB Commons ORIGINALS
// (Rudraksha_mala.jpg = 5,728,036 B measured live) for a 600x600 card — to a
// buyer on 4G in India. The Unsplash branch below was always correctly sized;
// only the Commons set was oversized. Every absolute URL now goes through
// commonsThumb, which rewrites Commons URLs to a ladder-width /thumb/ variant
// and leaves every other host untouched.
const PRODUCT_IMAGE_WIDTH = 600;

function img(photoIdOrUrl: string, alt: string): { url: string; alt: string } {
  const isAbsolute = photoIdOrUrl.startsWith('http://') || photoIdOrUrl.startsWith('https://');
  const url = isAbsolute
    ? commonsThumb(photoIdOrUrl, PRODUCT_IMAGE_WIDTH)
    : `https://images.unsplash.com/${photoIdOrUrl}?w=600&h=600&fit=crop&auto=format&q=80`;
  return { url, alt };
}

// ─── Hardcoded Product Data (MVP) ───────────────────────────────────────────────

const PRODUCTS: CatalogueRow[] = [
  // ─── 1. Puja Essentials ──────────────────────────────────────────
  {
    id: 'prod_001',
    handle: 'premium-brass-puja-thali-set',
    title: 'Premium Brass Puja Thali Set (7 Piece)',
    description: 'A beautifully crafted 7-piece brass puja thali set including thali, diya, incense holder, bell, kumkum container, water vessel, and flower plate. Perfect for daily worship and special occasions. Hand-polished to a golden finish.',
    features: ['Pure brass construction', 'Hand-polished golden finish', '7 essential puja items', 'Gift-ready packaging', 'Durable and tarnish-resistant'],
    price: 1299,
    compareAtPrice: 1899,
    discount: 32,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/7/7b/Hindu_pooja_thali.jpg', 'Premium Brass Puja Thali Set')],
    category: 'Puja Essentials',
    collection: 'puja-essentials',
    tag: 'Bestseller',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 342,
    weight: '1.2 kg',
    sku: 'BS-PE-001',
  },
  {
    id: 'prod_002',
    handle: 'handcrafted-brass-diya-pair',
    title: 'Handcrafted Brass Diya Pair (Medium)',
    description: 'A pair of traditional brass diyas (oil lamps) with an elegant lotus petal design. Hand-cast and polished to a warm golden sheen. Perfect for daily aarti, Diwali, and all puja occasions. Uses cotton wicks with ghee or oil.',
    features: ['Sold as a pair (2 diyas)', 'Lotus petal design', 'Pure brass, hand-cast', 'Stable flat base', 'Works with ghee or oil'],
    price: 349,
    compareAtPrice: 549,
    discount: 36,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/7/7c/Indian_Arati_diya.jpg', 'Handcrafted Brass Diya Pair')],
    category: 'Puja Essentials',
    collection: 'puja-essentials',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.6,
    reviewCount: 518,
    weight: '350g',
    sku: 'BS-PE-002',
  },
  {
    id: 'prod_003',
    handle: 'pure-sandalwood-incense-sticks',
    title: 'Pure Sandalwood Incense Sticks (100 pack)',
    description: 'Premium sandalwood agarbatti made from pure chandan powder. Burns evenly for 45 minutes with a rich, calming fragrance. No charcoal or chemical additives. Ideal for daily puja, meditation, and creating a sacred atmosphere.',
    features: ['100% pure sandalwood', '45-minute burn time', 'No charcoal fillers', 'Chemical-free', '100 sticks per pack'],
    price: 249,
    compareAtPrice: 399,
    discount: 38,
    currency: 'INR',
    images: [img('photo-1541795083-1b160cf4f3d7', 'Pure Sandalwood Incense Sticks')],
    category: 'Puja Essentials',
    collection: 'puja-essentials',
    tag: 'Top Rated',
    inStock: true,
    freeDelivery: false,
    rating: 4.6,
    reviewCount: 891,
    weight: '200g',
    sku: 'BS-PE-003',
  },
  {
    id: 'prod_004',
    handle: 'organic-camphor-250g',
    title: 'Organic Camphor (Kapur) - 250g',
    description: 'Pure organic camphor (kapur) tablets for daily aarti and puja. Made from natural Cinnamomum camphora extract with no synthetic additives. Burns cleanly with a bright flame and releases a purifying fragrance that removes negativity from your space.',
    features: ['100% organic camphor', 'No synthetic additives', 'Clean bright flame', 'Purifying fragrance', 'Resealable airtight container'],
    price: 199,
    compareAtPrice: 299,
    discount: 33,
    currency: 'INR',
    images: [img('photo-1551690935-a9e6f0a7e788', 'Organic Camphor')],
    category: 'Puja Essentials',
    collection: 'puja-essentials',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.5,
    reviewCount: 1230,
    weight: '250g',
    sku: 'BS-PE-004',
  },
  {
    id: 'prod_005',
    handle: 'premium-kumkum-haldi-set',
    title: 'Premium Kumkum & Haldi Set (Brass Container)',
    description: 'Traditional kumkum (vermillion) and haldi (turmeric) set in a beautifully engraved dual-compartment brass container. Made from natural ingredients without synthetic dyes. Essential for daily tilak, puja, and all auspicious occasions.',
    features: ['Natural kumkum & haldi', 'No synthetic dyes', 'Engraved brass container', 'Dual compartment design', 'Lasts 3-4 months of daily use'],
    price: 179,
    compareAtPrice: 299,
    discount: 40,
    currency: 'INR',
    images: [img('photo-1577563717655-919fc57789b4', 'Kumkum & Haldi Set')],
    category: 'Puja Essentials',
    collection: 'puja-essentials',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.4,
    reviewCount: 672,
    weight: '150g',
    sku: 'BS-PE-005',
  },

  // ─── 2. Rudraksha & Malas ────────────────────────────────────────
  {
    id: 'prod_006',
    handle: '5-mukhi-rudraksha-mala',
    title: '5 Mukhi Natural Rudraksha Mala (108+1 beads)',
    description: 'Authentic 5 Mukhi Rudraksha mala with 108+1 beads, hand-knotted on silk thread. Each bead is naturally formed and certified. Wearing this mala brings peace of mind, lowers blood pressure, and is believed to please Lord Shiva.',
    features: ['Certified natural Rudraksha', '108+1 beads', 'Hand-knotted on silk thread', 'Lab-tested authenticity', 'Certificate of authenticity included'],
    price: 599,
    compareAtPrice: 999,
    discount: 40,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/9/9c/Rudraksha_mala.jpg', '5 Mukhi Rudraksha Mala')],
    category: 'Rudraksha & Malas',
    collection: 'rudraksha-malas',
    tag: 'Certified',
    inStock: true,
    freeDelivery: true,
    rating: 4.8,
    reviewCount: 567,
    weight: '50g',
    sku: 'BS-RM-001',
  },
  {
    id: 'prod_007',
    handle: 'tulsi-mala-silver-cap',
    title: 'Tulsi Mala with Silver Cap (108+1 beads)',
    description: 'Sacred Tulsi (Holy Basil) wood mala with 108+1 beads and a sterling silver cap bead. Hand-crafted from aged Tulsi wood, each bead is smooth and lightweight. Tulsi mala is considered auspicious for Vaishnavites and is worn during prayers to Lord Vishnu and Krishna.',
    features: ['Aged tulsi wood beads', 'Sterling silver cap bead', '108+1 beads', 'Hand-crafted & polished', 'Lightweight and comfortable'],
    price: 399,
    compareAtPrice: 649,
    discount: 39,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/2/20/Japa_mala_%28prayer_beads%29_of_Tulasi_wood_with_108_beads_-_20040101-01.jpg', 'Tulsi Mala with Silver Cap')],
    category: 'Rudraksha & Malas',
    collection: 'rudraksha-malas',
    tag: 'Popular',
    inStock: true,
    freeDelivery: false,
    rating: 4.8,
    reviewCount: 456,
    weight: '30g',
    sku: 'BS-RM-002',
  },
  {
    id: 'prod_008',
    handle: 'sphatik-crystal-mala',
    title: 'Sphatik (Crystal Quartz) Mala (108+1 beads)',
    description: 'Premium AAA-grade sphatik (clear crystal quartz) japa mala with 108+1 beads. Each bead is individually hand-polished with no chips or cracks. Crystal mala is recommended for Goddess Lakshmi and Saraswati puja, and for enhancing concentration during meditation.',
    features: ['AAA-grade clear quartz', 'No chips or cracks', 'Hand-polished beads', 'Ideal for Lakshmi & Saraswati puja', 'Enhances meditation focus'],
    price: 799,
    compareAtPrice: 1299,
    discount: 38,
    currency: 'INR',
    images: [img('photo-1601824096525-954268b9eb72', 'Sphatik Crystal Mala')],
    category: 'Rudraksha & Malas',
    collection: 'rudraksha-malas',
    tag: 'Premium',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 213,
    weight: '80g',
    sku: 'BS-RM-003',
  },

  // ─── 3. Idols & Murtis ──────────────────────────────────────────
  {
    id: 'prod_009',
    handle: 'white-marble-ganesh-murti',
    title: 'Hand-carved White Marble Ganesh Murti (8 inch)',
    description: 'Exquisite hand-carved Lord Ganesh murti in pure white Makrana marble. Each piece is unique, crafted by skilled artisans from Rajasthan. The idol features intricate detailing on the crown, trunk, and modak. A centerpiece for your home temple.',
    features: ['Pure Makrana marble', 'Hand-carved by Rajasthani artisans', '8 inch height', 'Intricate detailing', 'Each piece is unique'],
    price: 2499,
    compareAtPrice: 3499,
    discount: 29,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/c/c8/Marble_Dagadusheth_Halwai_Ganapati_Statue_from_Maliyas.com_Jaipur_India.jpg', 'White Marble Ganesh Murti')],
    category: 'Idols & Murtis',
    collection: 'idols-murtis',
    tag: 'Premium',
    inStock: true,
    freeDelivery: true,
    rating: 4.9,
    reviewCount: 234,
    weight: '2.5 kg',
    sku: 'BS-IM-001',
  },
  {
    id: 'prod_010',
    handle: 'brass-krishna-playing-flute',
    title: 'Pure Brass Krishna Playing Flute (12 inch)',
    description: 'A stunning 12-inch brass idol of Lord Krishna in the iconic flute-playing pose. Cast using traditional lost-wax method and hand-finished with antique polish. The detailed craftsmanship captures Krishna\'s divine playfulness.',
    features: ['Pure brass, hand-cast', 'Traditional lost-wax method', '12 inch height', 'Antique polish finish', 'Exquisite craftsmanship'],
    price: 3299,
    compareAtPrice: 4599,
    discount: 28,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/3/38/Brass_standing_figure_of_Krishna_playing_the_flute._Wellcome_M0012566.jpg', 'Brass Krishna Playing Flute')],
    category: 'Idols & Murtis',
    collection: 'idols-murtis',
    tag: 'Handcrafted',
    inStock: true,
    freeDelivery: true,
    rating: 4.9,
    reviewCount: 189,
    weight: '3.2 kg',
    sku: 'BS-IM-002',
  },
  {
    id: 'prod_011',
    handle: 'brass-lakshmi-idol-seated',
    title: 'Brass Goddess Lakshmi Seated on Lotus (10 inch)',
    description: 'A beautifully detailed brass idol of Goddess Lakshmi seated gracefully on a lotus. Hand-cast with meticulous attention to ornaments, crown, and four arms holding lotus flowers, conch, and gold coins. Ideal for Diwali puja, Lakshmi puja, and home temples.',
    features: ['Pure brass construction', 'Seated on lotus pedestal', '10 inch height', 'Detailed ornament work', 'Ideal for Diwali & Lakshmi puja'],
    price: 2899,
    compareAtPrice: 3999,
    discount: 28,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/9/98/The_Hindu_Goddess_Shri_Lakshmi_LACMA_M.87.210_%281_of_2%29.jpg', 'Brass Goddess Lakshmi Idol')],
    category: 'Idols & Murtis',
    collection: 'idols-murtis',
    tag: 'Diwali Special',
    inStock: true,
    freeDelivery: true,
    rating: 4.8,
    reviewCount: 167,
    weight: '2.8 kg',
    sku: 'BS-IM-003',
  },

  // ─── 4. Puja Samagri (Kits) ─────────────────────────────────────
  {
    id: 'prod_012',
    handle: 'complete-navratri-puja-kit',
    title: 'Complete Navratri Puja Kit (9-Day)',
    description: 'Everything you need for a complete Navratri puja across all nine nights. Includes kalash, coconut, red cloth, mala, kumkum, haldi, chandan, rice, flowers (artificial), diya, incense sticks, camphor, and a step-by-step guide booklet with mantras.',
    features: ['Complete 9-day puja items', 'Step-by-step guide with mantras', 'Premium quality samagri', 'Eco-friendly packaging', 'Suitable for home puja'],
    price: 899,
    compareAtPrice: 1499,
    discount: 40,
    currency: 'INR',
    images: [img('photo-1605292356183-a77d0a9c9d1d', 'Complete Navratri Puja Kit')],
    category: 'Puja Samagri',
    collection: 'puja-samagri',
    tag: 'Festival Special',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 156,
    weight: '1.8 kg',
    sku: 'BS-PS-001',
  },
  {
    id: 'prod_013',
    handle: 'satyanarayan-puja-samagri',
    title: 'Satyanarayan Puja Complete Samagri Kit',
    description: 'All-in-one kit for performing Satyanarayan Puja at home. Contains panchamrit ingredients, red thread (mauli), kumkum, chandan, haldi, rice, flowers, tulsi, betel leaves, banana, ghee diya, camphor, and a detailed puja vidhi booklet with all mantras.',
    features: ['All items for Satyanarayan Puja', 'Puja vidhi booklet included', 'Fresh ingredients (order 2 days before)', 'Serves 1 complete puja', 'Pandit-curated items list'],
    price: 649,
    compareAtPrice: 999,
    discount: 35,
    currency: 'INR',
    images: [img('photo-1633368516165-f7b04d6428d1', 'Satyanarayan Puja Samagri Kit')],
    category: 'Puja Samagri',
    collection: 'puja-samagri',
    tag: 'Popular',
    inStock: true,
    freeDelivery: true,
    rating: 4.6,
    reviewCount: 289,
    weight: '1.5 kg',
    sku: 'BS-PS-002',
  },
  {
    id: 'prod_014',
    handle: 'copper-kalash-coconut-set',
    title: 'Copper Kalash with Coconut Set',
    description: 'Traditional copper kalash (lota) with a matching coconut holder for puja rituals. Hand-hammered copper with a smooth finish. Used in Satyanarayan Puja, Griha Pravesh, and all auspicious ceremonies. Copper is known for its health benefits and is traditionally used in Hindu rituals.',
    features: ['Pure copper construction', 'Hand-hammered finish', 'Includes coconut holder ring', 'Mango leaves holder', 'Ideal for all puja rituals'],
    price: 449,
    compareAtPrice: 699,
    discount: 36,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/f/f4/Navratri_Kalash_Puja.jpg', 'Copper Kalash Set')],
    category: 'Puja Samagri',
    collection: 'puja-samagri',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.7,
    reviewCount: 324,
    weight: '400g',
    sku: 'BS-PS-003',
  },

  // ─── 5. Books & Scriptures ──────────────────────────────────────
  {
    id: 'prod_015',
    handle: 'bhagavad-gita-deluxe-edition',
    title: 'Bhagavad Gita (Hindi-English, Deluxe Edition)',
    description: 'Deluxe hardbound edition of the Bhagavad Gita with original Sanskrit shlokas, Hindi translation, and English commentary by Swami Chinmayananda. Features gilded pages, ribbon bookmark, and a premium slipcase. An ideal gift for seekers of spiritual wisdom.',
    features: ['Sanskrit, Hindi & English text', 'Deluxe hardbound with gilded pages', 'Ribbon bookmark included', 'Premium slipcase packaging', '700 verses with detailed commentary'],
    price: 349,
    compareAtPrice: 599,
    discount: 42,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/3/34/Bhagavad_Gita_book_%28small%29_01.jpg', 'Bhagavad Gita Deluxe Edition')],
    category: 'Books & Scriptures',
    collection: 'books-scriptures',
    tag: 'Bestseller',
    inStock: true,
    freeDelivery: false,
    rating: 4.9,
    reviewCount: 2100,
    weight: '650g',
    sku: 'BS-BK-001',
  },
  {
    id: 'prod_016',
    handle: 'hanuman-chalisa-deluxe',
    title: 'Hanuman Chalisa (Illustrated Deluxe Edition)',
    description: 'A beautifully illustrated deluxe edition of the Hanuman Chalisa with original Awadhi text, Hindi meaning, and English translation. Features 40 full-colour illustrations depicting each chaupai. Hardbound with gold-embossed cover and premium art paper.',
    features: ['Awadhi, Hindi & English text', '40 full-colour illustrations', 'Gold-embossed hardcover', 'Premium art paper', 'Compact size for daily reading'],
    price: 249,
    compareAtPrice: 399,
    discount: 38,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/d/da/Hanuman_Chalisa_4x3.jpg', 'Hanuman Chalisa Deluxe Edition')],
    category: 'Books & Scriptures',
    collection: 'books-scriptures',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.8,
    reviewCount: 876,
    weight: '300g',
    sku: 'BS-BK-002',
  },
  {
    id: 'prod_017',
    handle: 'sunderkand-with-commentary',
    title: 'Sunderkand (Complete with Commentary)',
    description: 'The complete Sunderkand from Ramcharitmanas with word-by-word meaning, Hindi commentary, and English summary. Includes puja vidhi for Sunderkand path at home. Large-print edition ideal for elder readers. Sturdy binding for regular use.',
    features: ['Complete Sunderkand text', 'Word-by-word Hindi meaning', 'Puja vidhi for path at home', 'Large-print edition', 'Sturdy binding for daily use'],
    price: 199,
    compareAtPrice: 349,
    discount: 43,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/d/da/Hanuman_Chalisa_4x3.jpg', 'Sunderkand with Commentary')],
    category: 'Books & Scriptures',
    collection: 'books-scriptures',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.7,
    reviewCount: 543,
    weight: '250g',
    sku: 'BS-BK-003',
  },

  // ─── 6. Spiritual Jewellery ─────────────────────────────────────
  {
    id: 'prod_018',
    handle: 'rudraksha-bracelet-silver',
    title: 'Rudraksha & Silver Beads Bracelet',
    description: 'Elegant bracelet combining natural 5-Mukhi Rudraksha beads with sterling silver spacer beads. Strung on a durable elastic cord for a comfortable fit. Each Rudraksha bead is certified genuine. Worn for spiritual protection, stress relief, and as a stylish devotional accessory.',
    features: ['Natural 5-Mukhi Rudraksha', 'Sterling silver spacer beads', 'Elastic cord (fits most wrists)', 'Certified genuine beads', 'Unisex design'],
    price: 499,
    compareAtPrice: 799,
    discount: 38,
    currency: 'INR',
    images: [img('photo-1622993361118-b6365d859ab6', 'Rudraksha & Silver Bracelet')],
    category: 'Spiritual Jewellery',
    collection: 'spiritual-jewellery',
    tag: 'Trending',
    inStock: true,
    freeDelivery: false,
    rating: 4.7,
    reviewCount: 345,
    weight: '25g',
    sku: 'BS-SJ-001',
  },
  {
    id: 'prod_019',
    handle: 'om-pendant-gold-plated',
    title: 'Om Pendant (Gold-Plated, with Chain)',
    description: 'A sacred Om pendant in 22k gold-plated brass with a matching 18-inch chain. The Om symbol is intricately carved with fine detailing. Comes in a velvet gift box. An elegant spiritual accessory for daily wear or as a meaningful gift for loved ones.',
    features: ['22k gold-plated brass', '18-inch matching chain', 'Intricate Om carving', 'Tarnish-resistant coating', 'Velvet gift box included'],
    price: 699,
    compareAtPrice: 1099,
    discount: 36,
    currency: 'INR',
    images: [img('photo-1747576129956-d8124fab8668', 'Gold-Plated Om Pendant')],
    category: 'Spiritual Jewellery',
    collection: 'spiritual-jewellery',
    tag: 'Gift Pick',
    inStock: true,
    freeDelivery: true,
    rating: 4.6,
    reviewCount: 198,
    weight: '15g',
    sku: 'BS-SJ-002',
  },

  // ─── 7. Organic & Natural ───────────────────────────────────────
  {
    id: 'prod_020',
    handle: 'a2-desi-cow-ghee-500ml',
    title: 'A2 Desi Cow Ghee (500ml, Bilona Method)',
    description: 'Premium A2 ghee from Gir cow milk, prepared using the traditional bilona (hand-churned) method. Rich golden colour, nutty aroma, and granular texture. Ideal for puja diya, havan, cooking, and Ayurvedic use. Sourced from our partner gaushala in Gujarat.',
    features: ['A2 milk from Gir cows', 'Traditional bilona method', 'No preservatives or additives', 'Rich golden colour & aroma', 'Glass jar packaging'],
    price: 599,
    compareAtPrice: 849,
    discount: 29,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/6/65/Pure_Ghee-Homemade-Maharashtra.jpg', 'A2 Desi Cow Ghee')],
    category: 'Organic & Natural',
    collection: 'organic-natural',
    tag: 'Gaushala Sourced',
    inStock: true,
    freeDelivery: true,
    rating: 4.8,
    reviewCount: 412,
    weight: '500ml',
    sku: 'BS-ON-001',
  },
  {
    id: 'prod_021',
    handle: 'havan-samagri-premium-500g',
    title: 'Premium Havan Samagri (500g, 36 Herbs)',
    description: 'A curated blend of 36 sacred herbs, dried flowers, and aromatic ingredients for performing havan (fire ritual). Includes guggal, loban, kapoor kachri, jatamansi, nagarmotha, and other Vedic herbs. Produces a fragrant smoke that purifies the environment.',
    features: ['36 sacred herbs & ingredients', 'Vedic formula', 'Fragrant & purifying smoke', 'Resealable pouch', 'Instructions for havan vidhi'],
    price: 299,
    compareAtPrice: 449,
    discount: 33,
    currency: 'INR',
    images: [img('https://upload.wikimedia.org/wikipedia/commons/c/c7/%28A%29_puja_fire%2C_Havanam.jpg', 'Premium Havan Samagri')],
    category: 'Organic & Natural',
    collection: 'organic-natural',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.5,
    reviewCount: 287,
    weight: '500g',
    sku: 'BS-ON-002',
  },
  {
    id: 'prod_022',
    handle: 'pure-chandan-paste-50g',
    title: 'Pure Sandalwood (Chandan) Paste (50g)',
    description: 'Authentic Mysore sandalwood paste for tilak and puja. Ground from pure Santalum album wood using traditional stone grinding. Rich, creamy texture with a divine fragrance that lasts for hours. No artificial colours, fragrances, or fillers.',
    features: ['Pure Mysore sandalwood', 'Traditional stone-ground', 'Rich, creamy texture', 'Long-lasting fragrance', 'No artificial ingredients'],
    price: 249,
    compareAtPrice: 399,
    discount: 38,
    currency: 'INR',
    images: [img('photo-1595414902678-862fe51c9f27', 'Pure Sandalwood Paste')],
    category: 'Organic & Natural',
    collection: 'organic-natural',
    tag: 'Pure & Natural',
    inStock: true,
    freeDelivery: false,
    rating: 4.6,
    reviewCount: 534,
    weight: '50g',
    sku: 'BS-ON-003',
  },

  // ─── 8. Home Temple & Decor ─────────────────────────────────────
  {
    id: 'prod_023',
    handle: 'sheesham-wood-home-mandir',
    title: 'Sheesham Wood Home Mandir (Wall-Mounted, 18 inch)',
    description: 'A beautifully crafted wall-mounted home temple in solid sheesham (Indian rosewood). Features traditional carved arches, a removable drawer for storage, and a spacious platform for idols and puja items. Pre-drilled for easy wall mounting.',
    features: ['Solid sheesham wood', 'Traditional carved arches', 'Wall-mounted design', 'Removable storage drawer', 'Walnut polish finish'],
    price: 3499,
    compareAtPrice: 4999,
    discount: 30,
    currency: 'INR',
    images: [img('photo-1618897033742-4ad61a660b11', 'Sheesham Wood Home Mandir')],
    category: 'Home Temple & Decor',
    collection: 'home-temple-decor',
    tag: 'Premium',
    inStock: true,
    freeDelivery: true,
    rating: 4.8,
    reviewCount: 145,
    weight: '4.5 kg',
    sku: 'BS-HT-001',
  },
  {
    id: 'prod_024',
    handle: 'electric-led-diya-set',
    title: 'Electric LED Diya Set (12 pieces, Brass Finish)',
    description: 'Set of 12 flameless LED diyas with a realistic brass finish and warm flickering amber light. Battery-operated with on/off switch. Safe for homes with children and pets. Perfect for Diwali decoration, daily aarti, and home temple.',
    features: ['12 LED diyas per set', 'Realistic warm amber flicker', 'Brass-finish body', 'Battery included (100+ hours)', 'Safe for children and pets'],
    price: 549,
    compareAtPrice: 899,
    discount: 39,
    currency: 'INR',
    images: [img('photo-1513625047154-f390b1b0df20', 'Electric LED Diya Set')],
    category: 'Home Temple & Decor',
    collection: 'home-temple-decor',
    tag: 'New Arrival',
    inStock: true,
    freeDelivery: true,
    rating: 4.5,
    reviewCount: 678,
    weight: '350g',
    sku: 'BS-HT-002',
  },
];

// ─── Presentation: stamping identity onto every row served ────────────────────

/**
 * A hand-written row, as it goes over the wire: browse-only, and it says so.
 *
 * `inStock` is left exactly as the row declares it. It answers a different
 * question ("would this be in stock if it existed") and blanking it here would
 * make the card read "Out of stock", which is the wrong reason — the item is
 * not out of stock, it has no seller. `buyable`/`unavailableReason` carry the
 * real answer so a client never has to conflate the two.
 */
export function presentFixture(row: CatalogueRow): Product {
  return {
    ...row,
    source: 'fixture',
    buyable: false,
    unavailableReason: FIXTURE_UNAVAILABLE_REASON,
  };
}

/** The `store_products` columns this mapper needs. Matches the route's select. */
export interface LiveProductRow {
  id: string;
  name: string;
  description: string | null;
  price: unknown; // Prisma Decimal(10,2)
  imageUrl: string | null;
  category: string | null;
  stock: number;
  sku: string | null;
  storeProfile?: { storeName: string } | null;
}

/**
 * A real seller's `store_products` row, mapped into the catalogue card shape so
 * one grid can show both keyspaces without the client branching.
 *
 * Every field a seller has not supplied stays EMPTY rather than being filled in
 * with a plausible default — the LEG-17 ruling. In particular `rating` is 0 and
 * `reviewCount` is 0 because no review exists, never a synthesised 4.5; and
 * `compareAtPrice`/`discount` stay null/0 because a struck-through price the
 * seller never charged is a fabricated discount under the Consumer Protection
 * Act 2019.
 *
 * `freeDelivery` is derived from the SAME threshold the order route charges
 * (lib/store-pricing.ts), so the card cannot promise a fee the checkout then
 * adds. It is a per-basket rule, so the card claims it only when this one item
 * already clears the threshold on its own.
 */
export function presentLiveProduct(row: LiveProductRow): Product {
  const price = Number(row.price);
  return {
    id: row.id,
    // No slug column on store_products yet — the id IS the handle, which is
    // also what GET /store/products/live and /store/seller/<id> already use.
    handle: row.id,
    title: row.name,
    description: row.description ?? '',
    features: [],
    price,
    compareAtPrice: null,
    discount: 0,
    currency: 'INR',
    images: row.imageUrl ? [{ url: row.imageUrl, alt: row.name }] : [],
    category: row.category ?? 'General',
    // The 8 fixture collections are a merchandising taxonomy of this file, not
    // of the sellers' catalogue. Claiming membership would silently drop real
    // inventory out of a collection-filtered view or into the wrong one.
    collection: 'seller-listings',
    tag: null,
    inStock: row.stock > 0,
    freeDelivery: computeDeliveryFeeInr(price) === 0,
    // No reviews exist for a brand-new listing, so there is no average to
    // report. `null`, never 0 — see the `rating` note on `Product`.
    rating: null,
    reviewCount: 0,
    weight: null,
    sku: row.sku ?? '',
    source: 'live',
    buyable: true,
    unavailableReason: null,
  };
}

/** Sort key for a star average that may not exist yet. Unrated sorts last. */
function ratingKey(p: Product): number {
  return p.rating ?? -1;
}

// ─── Collections ──────────────────────────────────────────────────────────────

const COLLECTIONS: Collection[] = [
  {
    id: 'col_001',
    handle: 'puja-essentials',
    title: 'Puja Essentials',
    description: 'Everything you need for daily and special pujas — thali, diya, bell, agarbatti, camphor, kumkum, and more.',
    productCount: PRODUCTS.filter((p) => p.collection === 'puja-essentials').length,
    image: 'https://images.unsplash.com/photo-1604608672516-f1b9b1d37076?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_002',
    handle: 'rudraksha-malas',
    title: 'Rudraksha & Malas',
    description: 'Certified Rudraksha beads, tulsi malas, and crystal malas for meditation and worship.',
    productCount: PRODUCTS.filter((p) => p.collection === 'rudraksha-malas').length,
    image: 'https://images.unsplash.com/photo-1609766857041-ed402ea8069a?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_003',
    handle: 'idols-murtis',
    title: 'Idols & Murtis',
    description: 'Hand-carved and cast idols of Hindu deities — Ganesh, Lakshmi, Krishna, Shiva, and more.',
    productCount: PRODUCTS.filter((p) => p.collection === 'idols-murtis').length,
    image: 'https://images.unsplash.com/photo-1604948501466-4e9c339b9c24?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_004',
    handle: 'puja-samagri',
    title: 'Puja Samagri',
    description: 'Complete kits for Navratri, Satyanarayan, Griha Pravesh, and other specific pujas.',
    productCount: PRODUCTS.filter((p) => p.collection === 'puja-samagri').length,
    image: 'https://images.unsplash.com/photo-1603228254119-e6a4d095dc59?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_005',
    handle: 'books-scriptures',
    title: 'Books & Scriptures',
    description: 'Bhagavad Gita, Ramayana, Sunderkand, Hanuman Chalisa, and other sacred texts.',
    productCount: PRODUCTS.filter((p) => p.collection === 'books-scriptures').length,
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_006',
    handle: 'spiritual-jewellery',
    title: 'Spiritual Jewellery',
    description: 'Rudraksha bracelets, Om pendants, sacred threads, and devotional accessories.',
    productCount: PRODUCTS.filter((p) => p.collection === 'spiritual-jewellery').length,
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_007',
    handle: 'organic-natural',
    title: 'Organic & Natural',
    description: 'A2 cow ghee, havan samagri, sandalwood paste, and natural puja ingredients.',
    productCount: PRODUCTS.filter((p) => p.collection === 'organic-natural').length,
    image: 'https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&h=600&fit=crop&auto=format&q=80',
  },
  {
    id: 'col_008',
    handle: 'home-temple-decor',
    title: 'Home Temple & Decor',
    description: 'Wooden mandirs, LED diyas, brass accessories, and sacred home decor items.',
    productCount: PRODUCTS.filter((p) => p.collection === 'home-temple-decor').length,
    image: 'https://images.unsplash.com/photo-1585128993280-9456c19c987d?w=800&h=600&fit=crop&auto=format&q=80',
  },
];

// ─── In-memory cart storage (MVP — replaced by Redis/DB later) ──────────────────

const cartStore = new Map<string, CartItem[]>();
let cartItemIdCounter = 1;

function generateCartItemId(): string {
  return `ci_${Date.now()}_${cartItemIdCounter++}`;
}

// ─── StoreService ───────────────────────────────────────────────────────────────

export class StoreService {
  /**
   * Get paginated product list with filtering and sorting.
   *
   * @param liveProducts real `store_products` rows, already mapped through
   *   `presentLiveProduct`. The ROUTE supplies them — it owns the prisma
   *   handle — which keeps this method pure and synchronously testable, and
   *   keeps ONE filter/sort/paginate implementation across both keyspaces
   *   instead of two that can disagree about what "cheapest first" means.
   *
   *   Omitted → fixtures only, which is what prod returns today: zero seller
   *   rows exist, so the merged list and the fixture list are the same list.
   */
  getProducts(params: ProductsParams, liveProducts: Product[] = []) {
    // Real, orderable inventory leads, ALWAYS — see the buyable-first sort
    // below. A shopper must not have to scroll past 24 items they cannot buy
    // to reach the one they can, and the default sort here is by review count,
    // which would bury every new seller row (0 reviews, honestly) underneath
    // fixtures carrying invented tallies.
    let filtered: Product[] = [...liveProducts, ...PRODUCTS.map(presentFixture)];

    // Collection filter
    if (params.collection) {
      filtered = filtered.filter((p) => p.collection === params.collection);
    }

    // Category filter
    if (params.category) {
      filtered = filtered.filter(
        (p) => p.category.toLowerCase() === params.category!.toLowerCase()
      );
    }

    // Search query
    if (params.q) {
      const query = params.q.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      );
    }

    // Price range
    if (params.minPrice !== undefined) {
      filtered = filtered.filter((p) => p.price >= params.minPrice!);
    }
    if (params.maxPrice !== undefined) {
      filtered = filtered.filter((p) => p.price <= params.maxPrice!);
    }

    // Sorting
    switch (params.sort) {
      case 'price_asc':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        // Unrated (a new seller listing) sorts last rather than as a zero —
        // see the `rating` note on `Product`.
        filtered.sort((a, b) => ratingKey(b) - ratingKey(a));
        break;
      case 'newest':
        // In real app, sort by createdAt — for hardcoded data, reverse order
        filtered.reverse();
        break;
      default:
        // Default: popular (by review count)
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    }

    // Buyable first, under EVERY sort. Array.prototype.sort is stable, so the
    // ordering chosen above survives inside each group — this only guarantees
    // that what a shopper can actually put in a basket is never pushed below
    // what they cannot. A no-op while no seller has listed anything (every row
    // is then `buyable: false`), which is the state prod is in today.
    filtered.sort((a, b) => Number(b.buyable) - Number(a.buyable));

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const total = filtered.length;
    const start = (page - 1) * limit;
    const products = filtered.slice(start, start + limit);

    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single product by its handle (URL slug).
   *
   * A seller row's "handle" is its `StoreProduct.id` — there is no slug column
   * yet, and that is already the key GET /store/products/live and
   * /store/seller/<id> use. Passing `liveProducts` lets one PDP route resolve
   * both keyspaces, so the detail page can never disagree with the grid about
   * whether an item exists or can be bought.
   */
  getProductByHandle(handle: string, liveProducts: Product[] = []): Product | null {
    const live = liveProducts.find((p) => p.handle === handle || p.id === handle);
    if (live) return live;
    const fixture = PRODUCTS.find((p) => p.handle === handle);
    return fixture ? presentFixture(fixture) : null;
  }

  /**
   * Get all product collections.
   */
  getCollections(): Collection[] {
    return COLLECTIONS;
  }

  /**
   * Add an item to the user's cart.
   *
   * COM-01: the item goes in carrying `buyable: false` and its
   * `unavailableReason`, because every row this in-memory cart can hold is a
   * fixture. It is NOT refused here, deliberately:
   *
   *   - Adding to a basket is not a purchase. The refusal that matters is at
   *     POST /store/orders, which already answers `400 Unknown product: <id>`
   *     and which apps/mobile already renders as a specific sentence
   *     ((devotee)/checkout.tsx). Refusing here would replace that sentence
   *     with the shared client's generic "Request failed with status 400",
   *     i.e. a worse message for the same fact.
   *   - This cart cannot hold a seller product at all (it resolves ids against
   *     PRODUCTS, and seller ids are uuids), so a blanket refusal would make
   *     the mobile store screen error on every tap while offering no
   *     alternative that works.
   *
   * What changed is that the cart no longer HIDES the fact: `cart.items[].
   * product.buyable` and `.unavailableReason` are on the wire, so a client can
   * say so on the basket screen instead of discovering it at the payment step.
   *
   * A SELLER product, on the other hand, can now be added — see `resolved`.
   * That became mandatory the moment GET /store/products started serving
   * seller rows: showing a shopper something orderable and then refusing to
   * put it in their basket would be the same class of defect, pointed the
   * other way.
   */
  createCartItem(
    userId: string,
    productId: string,
    quantity: number,
    /**
     * A real `store_products` row the ROUTE already resolved (it owns the
     * prisma handle). Supplied whenever `productId` is uuid-shaped.
     *
     * Without this the basket could hold ONLY fixtures, which became a live
     * defect the moment GET /store/products started serving seller rows: a
     * mobile shopper would see an orderable product and get "Product not
     * found." adding it. The catalogue, the basket and the order route now
     * agree on the same keyspace.
     */
    resolved?: Product,
  ): Cart {
    const row = resolved ? null : PRODUCTS.find((p) => p.id === productId);
    const product = resolved ?? (row ? presentFixture(row) : null);
    if (!product) {
      throw new Error('Product not found.');
    }
    if (!product.inStock) {
      throw new Error('Product is out of stock.');
    }
    if (quantity < 1 || quantity > 10) {
      throw new Error('Quantity must be between 1 and 10.');
    }

    const items = cartStore.get(userId) ?? [];

    // Check if product already in cart
    const existingItem = items.find((i) => i.productId === productId);
    if (existingItem) {
      existingItem.quantity = Math.min(existingItem.quantity + quantity, 10);
      existingItem.subtotal = existingItem.quantity * product.price;
    } else {
      items.push({
        id: generateCartItemId(),
        productId,
        product,
        quantity,
        subtotal: quantity * product.price,
      });
    }

    cartStore.set(userId, items);
    return this.buildCart(userId, items);
  }

  /**
   * Get the user's cart.
   */
  getCart(userId: string): Cart {
    const items = cartStore.get(userId) ?? [];
    return this.buildCart(userId, items);
  }

  /**
   * Update cart item quantity.
   */
  updateCartItem(userId: string, itemId: string, quantity: number): Cart {
    const items = cartStore.get(userId) ?? [];
    const item = items.find((i) => i.id === itemId);

    if (!item) {
      throw new Error('Cart item not found.');
    }

    if (quantity < 1) {
      throw new Error('Quantity must be at least 1. Use remove to delete the item.');
    }

    if (quantity > 10) {
      throw new Error('Maximum quantity per item is 10.');
    }

    item.quantity = quantity;
    item.subtotal = quantity * item.product.price;

    cartStore.set(userId, items);
    return this.buildCart(userId, items);
  }

  /**
   * Remove a cart item.
   */
  removeCartItem(userId: string, itemId: string): Cart {
    let items = cartStore.get(userId) ?? [];
    const idx = items.findIndex((i) => i.id === itemId);

    if (idx === -1) {
      throw new Error('Cart item not found.');
    }

    items.splice(idx, 1);
    cartStore.set(userId, items);
    return this.buildCart(userId, items);
  }

  /**
   * Build the full cart object with totals.
   *
   * COM-06 / S-09 (prod sweep 2026-08-12) deleted the browser's
   * `subtotal + delivery + 5% "GST"` line but left the identical line here, so
   * the two halves of checkout disagreed with each other: GET /store/cart
   * returned the inflated number while POST /store/orders recomputes
   * `subtotal + delivery` and refuses with 409 `price_mismatch` on ANY
   * disagreement (store-orders.ts:243-255). Every client that trusted
   * `cart.total` therefore could not check out at all — apps/mobile worked
   * around it by re-deriving the total itself rather than reading this field.
   *
   * The totals now come from the single authority, lib/store-pricing.ts — the
   * same function the order route calls, so the cart cannot drift from the
   * order again. The 5% was never a tax regime: one flat rate over books
   * (nil-rated), brass idols and malas alike, quoted by a business with no
   * GSTIN. Prices are tax-inclusive; introducing a real GST line is an owner
   * decision with per-HSN rates, not a rounding.
   *
   * `tax` stays on the wire as 0 rather than being dropped — mobile's
   * api-contracts.ts reads the field — and 0 is the honest figure.
   *
   * COM-01 adds `orderable` / `unorderableReason`: the basket now states, up
   * front, whether POST /store/orders will accept it, so a shopper learns that
   * at the basket rather than at the payment step.
   */
  private buildCart(userId: string, items: CartItem[]): Cart {
    const { subtotalInr, deliveryFeeInr, totalInr } = computeStoreOrderTotals(
      items.map((i) => ({ qty: i.quantity, unitPriceInr: i.product.price })),
    );
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    // An empty basket is not "unorderable" — it is empty, and the route already
    // answers that separately. `every` on [] is true, which is the right answer.
    const blocked = items.filter((i) => !i.product.buyable);

    return {
      id: `cart_${userId}`,
      items,
      subtotal: subtotalInr,
      deliveryFee: deliveryFeeInr,
      tax: 0,
      total: totalInr,
      currency: 'INR',
      itemCount,
      orderable: blocked.length === 0,
      unorderableReason:
        blocked.length === 0 ? null : (blocked[0]!.product.unavailableReason ?? null),
    };
  }
}

export const storeService = new StoreService();
