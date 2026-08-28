/**
 * Shared product data for the Bhakti Store.
 * Single source of truth used by both the listing page and detail page.
 *
 * Products are organized into 8 collections:
 * 1. Puja Essentials — thali, diya, bell, agarbatti, camphor, kumkum
 * 2. Rudraksha & Malas — rudraksha beads, tulsi mala, crystal mala
 * 3. Idols & Murtis — Ganesh, Lakshmi, Shiva, Krishna, Durga
 * 4. Puja Samagri — complete kits for specific pujas
 * 5. Books & Scriptures — Bhagavad Gita, Ramayana, Sunderkand
 * 6. Spiritual Jewellery — bracelets, pendants, rings
 * 7. Organic & Natural — cow ghee, havan samagri, natural incense
 * 8. Home Temple & Decor — wooden mandir, brass items, wall hangings
 */

export interface Product {
 id: string;
 handle: string;
 title: string;
 description: string;
 features: string[];
 price: number;
 /**
  * LEG-17: a prior "was" price, and `null` until a real one exists.
  *
  * Every one of the 24 rows below used to carry a number here (prod_001:
  * price 1299, compareAtPrice 1899) together with a `discount` percentage
  * derived from it. No row was ever sold at that price — this catalogue has
  * never taken an order — so the struck-through figure /store, the PDP and
  * the cart all rendered was a reference price that never existed. Under the
  * Consumer Protection Act 2019 and the CCPA misleading-advertisement
  * guidelines that is a fabricated discount, and unlike a dated sale banner
  * it cannot expire on its own.
  *
  * The type is nullable rather than absent so a genuine markdown can be
  * recorded later. `discount` is gone outright: it was purely
  * `(compareAtPrice - price) / compareAtPrice`, so it has no independent
  * source to be restored from — compute it at the render site from a real
  * prior price when one exists.
  */
 compareAtPrice: number | null;
 currency: string;
 category: string;
 collection: string;
 tag: string | null;
 inStock: boolean;
 freeDelivery: boolean;
 /**
  * LEG-17: the star average, `null` until reviews exist.
  *
  * These were hardcoded 4.4-4.9 with review counts of 145-2,100 — 12,366
  * reviews in total, across a catalogue that has never had a customer. A
  * `Review` model and GET /store/reviews both exist in apps/api, so this is
  * a real number's placeholder and not a missing feature: join the grid to
  * that table and set these from it. `null` (not 0) so "no rating yet" is
  * distinguishable from "rated zero".
  */
 rating: number | null;
 reviewCount: number;
 weight: string;
 sku: string;
 imageKey: string;
}

export const PRODUCTS: Product[] = [
 // ─── 1. Puja Essentials ──────────────────────────────────────────
 {
 id: 'prod_001',
 handle: 'premium-brass-puja-thali-set',
 title: 'Premium Brass Puja Thali Set (7 Piece)',
 description:
 'A beautifully crafted 7-piece brass puja thali set including thali, diya, incense holder, bell, kumkum container, water vessel, and flower plate. Perfect for daily worship and special occasions. Hand-polished to a golden finish.',
 features: [
 'Pure brass construction',
 'Hand-polished golden finish',
 '7 essential puja items',
 'Gift-ready packaging',
 'Durable and tarnish-resistant',
 ],
 price: 1299,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Essentials',
 collection: 'puja-essentials',
 tag: 'Bestseller',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '1.2 kg',
 sku: 'BS-PE-001',
 imageKey: 'brass-puja-thali',
 },
 {
 id: 'prod_002',
 handle: 'handcrafted-brass-diya-pair',
 title: 'Handcrafted Brass Diya Pair (Medium)',
 description:
 'A pair of traditional brass diyas (oil lamps) with an elegant lotus petal design. Hand-cast and polished to a warm golden sheen. Perfect for daily aarti, Diwali, and all puja occasions. Uses cotton wicks with ghee or oil.',
 features: [
 'Sold as a pair (2 diyas)',
 'Lotus petal design',
 'Pure brass, hand-cast',
 'Stable flat base',
 'Works with ghee or oil',
 ],
 price: 349,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Essentials',
 collection: 'puja-essentials',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '350g',
 sku: 'BS-PE-002',
 imageKey: 'brass-diya',
 },
 {
 id: 'prod_003',
 handle: 'pure-sandalwood-incense-sticks',
 title: 'Pure Sandalwood Incense Sticks (100 pack)',
 description:
 'Premium sandalwood agarbatti made from pure chandan powder. Burns evenly for 45 minutes with a rich, calming fragrance. No charcoal or chemical additives. Ideal for daily puja, meditation, and creating a sacred atmosphere.',
 features: [
 '100% pure sandalwood',
 '45-minute burn time',
 'No charcoal fillers',
 'Chemical-free',
 '100 sticks per pack',
 ],
 price: 249,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Essentials',
 collection: 'puja-essentials',
 tag: 'Top Rated',
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '200g',
 sku: 'BS-PE-003',
 imageKey: 'incense-sticks',
 },
 {
 id: 'prod_004',
 handle: 'organic-camphor-250g',
 title: 'Organic Camphor (Kapur) - 250g',
 description:
 'Pure organic camphor (kapur) tablets for daily aarti and puja. Made from natural Cinnamomum camphora extract with no synthetic additives. Burns cleanly with a bright flame and releases a purifying fragrance that removes negativity from your space.',
 features: [
 '100% organic camphor',
 'No synthetic additives',
 'Clean bright flame',
 'Purifying fragrance',
 'Resealable airtight container',
 ],
 price: 199,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Essentials',
 collection: 'puja-essentials',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '250g',
 sku: 'BS-PE-004',
 imageKey: 'camphor-pack',
 },
 {
 id: 'prod_005',
 handle: 'premium-kumkum-haldi-set',
 title: 'Premium Kumkum & Haldi Set (Brass Container)',
 description:
 'Traditional kumkum (vermillion) and haldi (turmeric) set in a beautifully engraved dual-compartment brass container. Made from natural ingredients without synthetic dyes. Essential for daily tilak, puja, and all auspicious occasions.',
 features: [
 'Natural kumkum & haldi',
 'No synthetic dyes',
 'Engraved brass container',
 'Dual compartment design',
 'Lasts 3-4 months of daily use',
 ],
 price: 179,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Essentials',
 collection: 'puja-essentials',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '150g',
 sku: 'BS-PE-005',
 imageKey: 'kumkum-set',
 },

 // ─── 2. Rudraksha & Malas ────────────────────────────────────────
 {
 id: 'prod_006',
 handle: '5-mukhi-rudraksha-mala',
 title: '5 Mukhi Natural Rudraksha Mala (108+1 beads)',
 description:
 'Authentic 5 Mukhi Rudraksha mala with 108+1 beads, hand-knotted on silk thread. Each bead is naturally formed and certified. Wearing this mala brings peace of mind, lowers blood pressure, and is believed to please Lord Shiva.',
 features: [
 'Certified natural Rudraksha',
 '108+1 beads',
 'Hand-knotted on silk thread',
 'Lab-tested authenticity',
 'Certificate of authenticity included',
 ],
 price: 599,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Rudraksha & Malas',
 collection: 'rudraksha-malas',
 tag: 'Certified',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '50g',
 sku: 'BS-RM-001',
 imageKey: 'rudraksha-mala',
 },
 {
 id: 'prod_007',
 handle: 'tulsi-mala-silver-cap',
 title: 'Tulsi Mala with Silver Cap (108+1 beads)',
 description:
 'Sacred Tulsi (Holy Basil) wood mala with 108+1 beads and a sterling silver cap bead. Hand-crafted from aged Tulsi wood, each bead is smooth and lightweight. Tulsi mala is considered auspicious for Vaishnavites and is worn during prayers to Lord Vishnu and Krishna.',
 features: [
 'Aged tulsi wood beads',
 'Sterling silver cap bead',
 '108+1 beads',
 'Hand-crafted & polished',
 'Lightweight and comfortable',
 ],
 price: 399,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Rudraksha & Malas',
 collection: 'rudraksha-malas',
 tag: 'Popular',
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '30g',
 sku: 'BS-RM-002',
 imageKey: 'tulsi-mala',
 },
 {
 id: 'prod_008',
 handle: 'sphatik-crystal-mala',
 title: 'Sphatik (Crystal Quartz) Mala (108+1 beads)',
 description:
 'Premium AAA-grade sphatik (clear crystal quartz) japa mala with 108+1 beads. Each bead is individually hand-polished with no chips or cracks. Crystal mala is recommended for Goddess Lakshmi and Saraswati puja, and for enhancing concentration during meditation.',
 features: [
 'AAA-grade clear quartz',
 'No chips or cracks',
 'Hand-polished beads',
 'Ideal for Lakshmi & Saraswati puja',
 'Enhances meditation focus',
 ],
 price: 799,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Rudraksha & Malas',
 collection: 'rudraksha-malas',
 tag: 'Premium',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '80g',
 sku: 'BS-RM-003',
 imageKey: 'crystal-mala',
 },

 // ─── 3. Idols & Murtis ──────────────────────────────────────────
 {
 id: 'prod_009',
 handle: 'white-marble-ganesh-murti',
 title: 'Hand-carved White Marble Ganesh Murti (8 inch)',
 description:
 'Exquisite hand-carved Lord Ganesh murti in pure white Makrana marble. Each piece is unique, crafted by skilled artisans from Rajasthan. The idol features intricate detailing on the crown, trunk, and modak. A centerpiece for your home temple.',
 features: [
 'Pure Makrana marble',
 'Hand-carved by Rajasthani artisans',
 '8 inch height',
 'Intricate detailing',
 'Each piece is unique',
 ],
 price: 2499,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Idols & Murtis',
 collection: 'idols-murtis',
 tag: 'Premium',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '2.5 kg',
 sku: 'BS-IM-001',
 imageKey: 'ganesh-murti',
 },
 {
 id: 'prod_010',
 handle: 'brass-krishna-playing-flute',
 title: 'Pure Brass Krishna Playing Flute (12 inch)',
 description:
 'A stunning 12-inch brass idol of Lord Krishna in the iconic flute-playing pose. Cast using traditional lost-wax method and hand-finished with antique polish. The detailed craftsmanship captures Krishna\'s divine playfulness. A timeless piece for worship or as a decorative heirloom.',
 features: [
 'Pure brass, hand-cast',
 'Traditional lost-wax method',
 '12 inch height',
 'Antique polish finish',
 'Exquisite craftsmanship',
 ],
 price: 3299,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Idols & Murtis',
 collection: 'idols-murtis',
 tag: 'Handcrafted',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '3.2 kg',
 sku: 'BS-IM-002',
 imageKey: 'krishna-idol',
 },
 {
 id: 'prod_011',
 handle: 'brass-lakshmi-idol-seated',
 title: 'Brass Goddess Lakshmi Seated on Lotus (10 inch)',
 description:
 'A beautifully detailed brass idol of Goddess Lakshmi seated gracefully on a lotus. Hand-cast with meticulous attention to ornaments, crown, and four arms holding lotus flowers, conch, and gold coins. Ideal for Diwali puja, Lakshmi puja, and home temples.',
 features: [
 'Pure brass construction',
 'Seated on lotus pedestal',
 '10 inch height',
 'Detailed ornament work',
 'Ideal for Diwali & Lakshmi puja',
 ],
 price: 2899,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Idols & Murtis',
 collection: 'idols-murtis',
 tag: 'Diwali Special',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '2.8 kg',
 sku: 'BS-IM-003',
 imageKey: 'lakshmi-idol',
 },

 // ─── 4. Puja Samagri (Kits) ─────────────────────────────────────
 {
 id: 'prod_012',
 handle: 'complete-navratri-puja-kit',
 title: 'Complete Navratri Puja Kit (9-Day)',
 description:
 'Everything you need for a complete Navratri puja across all nine nights. Includes kalash, coconut, red cloth, mala, kumkum, haldi, chandan, rice, flowers (artificial), diya, incense sticks, camphor, and a step-by-step guide booklet with mantras.',
 features: [
 'Complete 9-day puja items',
 'Step-by-step guide with mantras',
 'Premium quality samagri',
 'Eco-friendly packaging',
 'Suitable for home puja',
 ],
 price: 899,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Samagri',
 collection: 'puja-samagri',
 tag: 'Festival Special',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '1.8 kg',
 sku: 'BS-PS-001',
 imageKey: 'navratri-kit',
 },
 {
 id: 'prod_013',
 handle: 'satyanarayan-puja-samagri',
 title: 'Satyanarayan Puja Complete Samagri Kit',
 description:
 'All-in-one kit for performing Satyanarayan Puja at home. Contains panchamrit ingredients, red thread (mauli), kumkum, chandan, haldi, rice, flowers, tulsi, betel leaves, banana, ghee diya, camphor, and a detailed puja vidhi booklet with all mantras.',
 features: [
 'All items for Satyanarayan Puja',
 'Puja vidhi booklet included',
 'Fresh ingredients (order 2 days before)',
 'Serves 1 complete puja',
 'Pandit-curated items list',
 ],
 price: 649,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Samagri',
 collection: 'puja-samagri',
 tag: 'Popular',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '1.5 kg',
 sku: 'BS-PS-002',
 imageKey: 'pooja-samagri-kit',
 },
 {
 id: 'prod_014',
 handle: 'copper-kalash-coconut-set',
 title: 'Copper Kalash with Coconut Set',
 description:
 'Traditional copper kalash (lota) with a matching coconut holder for puja rituals. Hand-hammered copper with a smooth finish. Used in Satyanarayan Puja, Griha Pravesh, and all auspicious ceremonies. Copper is known for its health benefits and is traditionally used in Hindu rituals.',
 features: [
 'Pure copper construction',
 'Hand-hammered finish',
 'Includes coconut holder ring',
 'Mango leaves holder',
 'Ideal for all puja rituals',
 ],
 price: 449,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Puja Samagri',
 collection: 'puja-samagri',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '400g',
 sku: 'BS-PS-003',
 imageKey: 'copper-kalash',
 },

 // ─── 5. Books & Scriptures ──────────────────────────────────────
 {
 id: 'prod_015',
 handle: 'bhagavad-gita-deluxe-edition',
 title: 'Bhagavad Gita (Hindi-English, Deluxe Edition)',
 description:
 'Deluxe hardbound edition of the Bhagavad Gita with original Sanskrit shlokas, Hindi translation, and English commentary by Swami Chinmayananda. Features gilded pages, ribbon bookmark, and a premium slipcase. An ideal gift for seekers of spiritual wisdom.',
 features: [
 'Sanskrit, Hindi & English text',
 'Deluxe hardbound with gilded pages',
 'Ribbon bookmark included',
 'Premium slipcase packaging',
 '700 verses with detailed commentary',
 ],
 price: 349,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Books & Scriptures',
 collection: 'books-scriptures',
 tag: 'Bestseller',
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '650g',
 sku: 'BS-BK-001',
 imageKey: 'bhagavad-gita',
 },
 {
 id: 'prod_016',
 handle: 'hanuman-chalisa-deluxe',
 title: 'Hanuman Chalisa (Illustrated Deluxe Edition)',
 description:
 'A beautifully illustrated deluxe edition of the Hanuman Chalisa with original Awadhi text, Hindi meaning, and English translation. Features 40 full-colour illustrations depicting each chaupai. Hardbound with gold-embossed cover and premium art paper.',
 features: [
 'Awadhi, Hindi & English text',
 '40 full-colour illustrations',
 'Gold-embossed hardcover',
 'Premium art paper',
 'Compact size for daily reading',
 ],
 price: 249,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Books & Scriptures',
 collection: 'books-scriptures',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '300g',
 sku: 'BS-BK-002',
 imageKey: 'hanuman-chalisa-book',
 },
 {
 id: 'prod_017',
 handle: 'sunderkand-with-commentary',
 title: 'Sunderkand (Complete with Commentary)',
 description:
 'The complete Sunderkand from Ramcharitmanas with word-by-word meaning, Hindi commentary, and English summary. Includes puja vidhi for Sunderkand path at home. Large-print edition ideal for elder readers. Sturdy binding for regular use.',
 features: [
 'Complete Sunderkand text',
 'Word-by-word Hindi meaning',
 'Puja vidhi for path at home',
 'Large-print edition',
 'Sturdy binding for daily use',
 ],
 price: 199,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Books & Scriptures',
 collection: 'books-scriptures',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '250g',
 sku: 'BS-BK-003',
 imageKey: 'sunderkand-book',
 },

 // ─── 6. Spiritual Jewellery ─────────────────────────────────────
 {
 id: 'prod_018',
 handle: 'rudraksha-bracelet-silver',
 title: 'Rudraksha & Silver Beads Bracelet',
 description:
 'Elegant bracelet combining natural 5-Mukhi Rudraksha beads with sterling silver spacer beads. Strung on a durable elastic cord for a comfortable fit. Each Rudraksha bead is certified genuine. Worn for spiritual protection, stress relief, and as a stylish devotional accessory.',
 features: [
 'Natural 5-Mukhi Rudraksha',
 'Sterling silver spacer beads',
 'Elastic cord (fits most wrists)',
 'Certified genuine beads',
 'Unisex design',
 ],
 price: 499,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Spiritual Jewellery',
 collection: 'spiritual-jewellery',
 tag: 'Trending',
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '25g',
 sku: 'BS-SJ-001',
 imageKey: 'rudraksha-bracelet',
 },
 {
 id: 'prod_019',
 handle: 'om-pendant-gold-plated',
 title: 'Om Pendant (Gold-Plated, with Chain)',
 description:
 'A sacred Om pendant in 22k gold-plated brass with a matching 18-inch chain. The Om symbol is intricately carved with fine detailing. Comes in a velvet gift box. An elegant spiritual accessory for daily wear or as a meaningful gift for loved ones.',
 features: [
 '22k gold-plated brass',
 '18-inch matching chain',
 'Intricate Om carving',
 'Tarnish-resistant coating',
 'Velvet gift box included',
 ],
 price: 699,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Spiritual Jewellery',
 collection: 'spiritual-jewellery',
 tag: 'Gift Pick',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '15g',
 sku: 'BS-SJ-002',
 imageKey: 'om-pendant',
 },

 // ─── 7. Organic & Natural ───────────────────────────────────────
 {
 id: 'prod_020',
 handle: 'a2-desi-cow-ghee-500ml',
 title: 'A2 Desi Cow Ghee (500ml, Bilona Method)',
 description:
 'Premium A2 ghee from Gir cow milk, prepared using the traditional bilona (hand-churned) method. Rich golden colour, nutty aroma, and granular texture. Ideal for puja diya, havan, cooking, and Ayurvedic use. Sourced from our partner gaushala in Gujarat.',
 features: [
 'A2 milk from Gir cows',
 'Traditional bilona method',
 'No preservatives or additives',
 'Rich golden colour & aroma',
 'Glass jar packaging',
 ],
 price: 599,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Organic & Natural',
 collection: 'organic-natural',
 tag: 'Gaushala Sourced',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '500ml',
 sku: 'BS-ON-001',
 imageKey: 'cow-ghee',
 },
 {
 id: 'prod_021',
 handle: 'havan-samagri-premium-500g',
 title: 'Premium Havan Samagri (500g, 36 Herbs)',
 description:
 'A curated blend of 36 sacred herbs, dried flowers, and aromatic ingredients for performing havan (fire ritual). Includes guggal, loban, kapoor kachri, jatamansi, nagarmotha, and other Vedic herbs. Produces a fragrant smoke that purifies the environment and promotes positivity.',
 features: [
 '36 sacred herbs & ingredients',
 'Vedic formula',
 'Fragrant & purifying smoke',
 'Resealable pouch',
 'Instructions for havan vidhi',
 ],
 price: 299,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Organic & Natural',
 collection: 'organic-natural',
 tag: null,
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '500g',
 sku: 'BS-ON-002',
 imageKey: 'havan-samagri',
 },
 {
 id: 'prod_022',
 handle: 'pure-chandan-paste-50g',
 title: 'Pure Sandalwood (Chandan) Paste (50g)',
 description:
 'Authentic Mysore sandalwood paste for tilak and puja. Ground from pure Santalum album wood using traditional stone grinding. Rich, creamy texture with a divine fragrance that lasts for hours. No artificial colours, fragrances, or fillers.',
 features: [
 'Pure Mysore sandalwood',
 'Traditional stone-ground',
 'Rich, creamy texture',
 'Long-lasting fragrance',
 'No artificial ingredients',
 ],
 price: 249,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Organic & Natural',
 collection: 'organic-natural',
 tag: 'Pure & Natural',
 inStock: true,
 freeDelivery: false,
 rating: null,
 reviewCount: 0,
 weight: '50g',
 sku: 'BS-ON-003',
 imageKey: 'sandalwood-paste',
 },

 // ─── 8. Home Temple & Decor ─────────────────────────────────────
 {
 id: 'prod_023',
 handle: 'sheesham-wood-home-mandir',
 title: 'Sheesham Wood Home Mandir (Wall-Mounted, 18 inch)',
 description:
 'A beautifully crafted wall-mounted home temple in solid sheesham (Indian rosewood). Features traditional carved arches, a removable drawer for storage, and a spacious platform for idols and puja items. Pre-drilled for easy wall mounting. Finished with a rich walnut polish.',
 features: [
 'Solid sheesham wood',
 'Traditional carved arches',
 'Wall-mounted design',
 'Removable storage drawer',
 'Walnut polish finish',
 ],
 price: 3499,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Home Temple & Decor',
 collection: 'home-temple-decor',
 tag: 'Premium',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '4.5 kg',
 sku: 'BS-HT-001',
 imageKey: 'wooden-mandir',
 },
 {
 id: 'prod_024',
 handle: 'electric-led-diya-set',
 title: 'Electric LED Diya Set (12 pieces, Brass Finish)',
 description:
 'Set of 12 flameless LED diyas with a realistic brass finish and warm flickering amber light. Battery-operated with on/off switch. Safe for homes with children and pets. Perfect for Diwali decoration, daily aarti, and home temple. Each diya runs for 100+ hours on a single battery.',
 features: [
 '12 LED diyas per set',
 'Realistic warm amber flicker',
 'Brass-finish body',
 'Battery included (100+ hours)',
 'Safe for children and pets',
 ],
 price: 549,
 compareAtPrice: null,
 currency: 'INR',
 category: 'Home Temple & Decor',
 collection: 'home-temple-decor',
 tag: 'New Arrival',
 inStock: true,
 freeDelivery: true,
 rating: null,
 reviewCount: 0,
 weight: '350g',
 sku: 'BS-HT-002',
 imageKey: 'led-diya-set',
 },
];

/**
 * All product categories with display metadata.
 */
export const CATEGORIES = [
 { slug: 'puja-essentials', name: 'Puja Essentials', count: PRODUCTS.filter(p => p.collection === 'puja-essentials').length },
 { slug: 'rudraksha-malas', name: 'Rudraksha & Malas', count: PRODUCTS.filter(p => p.collection === 'rudraksha-malas').length },
 { slug: 'idols-murtis', name: 'Idols & Murtis', count: PRODUCTS.filter(p => p.collection === 'idols-murtis').length },
 { slug: 'puja-samagri', name: 'Puja Samagri', count: PRODUCTS.filter(p => p.collection === 'puja-samagri').length },
 { slug: 'books-scriptures', name: 'Books & Scriptures', count: PRODUCTS.filter(p => p.collection === 'books-scriptures').length },
 { slug: 'spiritual-jewellery', name: 'Spiritual Jewellery', count: PRODUCTS.filter(p => p.collection === 'spiritual-jewellery').length },
 { slug: 'organic-natural', name: 'Organic & Natural', count: PRODUCTS.filter(p => p.collection === 'organic-natural').length },
 { slug: 'home-temple-decor', name: 'Home Temple & Decor', count: PRODUCTS.filter(p => p.collection === 'home-temple-decor').length },
] as const;

/**
 * Find a product by its handle (slug).
 */
export function getProductByHandle(handle: string): Product | undefined {
 return PRODUCTS.find((p) => p.handle === handle);
}
