// ─── Types ──────────────────────────────────────────────────────────────────────

export interface Product {
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
// other CDN). Wikimedia and other absolute URLs pass through unchanged.

function img(photoIdOrUrl: string, alt: string): { url: string; alt: string } {
  const isAbsolute = photoIdOrUrl.startsWith('http://') || photoIdOrUrl.startsWith('https://');
  const url = isAbsolute
    ? photoIdOrUrl
    : `https://images.unsplash.com/${photoIdOrUrl}?w=600&h=600&fit=crop&auto=format&q=80`;
  return { url, alt };
}

// ─── Hardcoded Product Data (MVP) ───────────────────────────────────────────────

const PRODUCTS: Product[] = [
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
    images: [img('https://upload.wikimedia.org/wikipedia/commons/3/38/Brass_standing_figure_***REMOVED***._Wellcome_M0012566.jpg', 'Brass Krishna Playing Flute')],
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
   */
  getProducts(params: ProductsParams) {
    let filtered = [...PRODUCTS];

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
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'newest':
        // In real app, sort by createdAt — for hardcoded data, reverse order
        filtered.reverse();
        break;
      default:
        // Default: popular (by review count)
        filtered.sort((a, b) => b.reviewCount - a.reviewCount);
    }

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
   */
  getProductByHandle(handle: string): Product | null {
    return PRODUCTS.find((p) => p.handle === handle) ?? null;
  }

  /**
   * Get all product collections.
   */
  getCollections(): Collection[] {
    return COLLECTIONS;
  }

  /**
   * Add an item to the user's cart.
   */
  createCartItem(userId: string, productId: string, quantity: number): Cart {
    const product = PRODUCTS.find((p) => p.id === productId);
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
   */
  private buildCart(userId: string, items: CartItem[]): Cart {
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0);
    const deliveryFee = subtotal >= 499 ? 0 : 49;
    const tax = Math.round(subtotal * 0.05); // 5% GST estimate
    const total = subtotal + deliveryFee + tax;
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

    return {
      id: `cart_${userId}`,
      items,
      subtotal,
      deliveryFee,
      tax,
      total,
      currency: 'INR',
      itemCount,
    };
  }
}

export const storeService = new StoreService();
