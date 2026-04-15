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

// ─── Hardcoded Product Data (MVP) ───────────────────────────────────────────────

const PRODUCTS: Product[] = [
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
    images: [{ url: '/images/store/puja-thali.jpg', alt: 'Premium Brass Puja Thali Set' }],
    category: 'Puja Thali Sets',
    collection: 'puja-essentials',
    tag: 'Bestseller',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 342,
    weight: '1.2 kg',
    sku: 'BS-PT-001',
  },
  {
    id: 'prod_002',
    handle: '5-mukhi-rudraksha-mala',
    title: '5 Mukhi Natural Rudraksha Mala (108+1 beads)',
    description: 'Authentic 5 Mukhi Rudraksha mala with 108+1 beads, hand-knotted on silk thread. Each bead is naturally formed and certified. Wearing this mala brings peace of mind, lowers blood pressure, and is believed to please Lord Shiva.',
    features: ['Certified natural Rudraksha', '108+1 beads', 'Hand-knotted on silk thread', 'Lab-tested authenticity', 'Comes with certificate'],
    price: 599,
    compareAtPrice: 999,
    discount: 40,
    currency: 'INR',
    images: [{ url: '/images/store/rudraksha.jpg', alt: '5 Mukhi Rudraksha Mala' }],
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
    id: 'prod_003',
    handle: 'pure-sandalwood-incense-sticks',
    title: 'Pure Sandalwood Incense Sticks (100 pack)',
    description: 'Premium sandalwood agarbatti made from pure chandan powder. Burns evenly for 45 minutes with a rich, calming fragrance. No charcoal or chemical additives. Ideal for daily puja, meditation, and creating a sacred atmosphere.',
    features: ['100% pure sandalwood', '45-minute burn time', 'No charcoal fillers', 'Chemical-free', '100 sticks per pack'],
    price: 249,
    compareAtPrice: 399,
    discount: 38,
    currency: 'INR',
    images: [{ url: '/images/store/incense.jpg', alt: 'Pure Sandalwood Incense Sticks' }],
    category: 'Incense & Dhoop',
    collection: 'puja-essentials',
    tag: 'Top Rated',
    inStock: true,
    freeDelivery: false,
    rating: 4.6,
    reviewCount: 891,
    weight: '200g',
    sku: 'BS-IS-001',
  },
  {
    id: 'prod_004',
    handle: 'white-marble-ganesh-murti',
    title: 'Hand-carved White Marble Ganesh Murti (8 inch)',
    description: 'Exquisite hand-carved Lord Ganesh murti in pure white Makrana marble. Each piece is unique, crafted by skilled artisans from Rajasthan. The idol features intricate detailing on the crown, trunk, and modak. A centerpiece for your home temple.',
    features: ['Pure Makrana marble', 'Hand-carved by artisans', '8 inch height', 'Intricate detailing', 'Each piece is unique'],
    price: 2499,
    compareAtPrice: 3499,
    discount: 29,
    currency: 'INR',
    images: [{ url: '/images/store/ganesh-idol.jpg', alt: 'White Marble Ganesh Murti' }],
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
    id: 'prod_005',
    handle: 'complete-navratri-puja-kit',
    title: 'Complete Navratri Puja Kit',
    description: 'Everything you need for a complete Navratri puja — includes kalash, coconut, red cloth, mala, kumkum, haldi, chandan, rice, flowers (artificial), diya, incense sticks, camphor, and a step-by-step guide booklet. Perfect for all nine nights of devotion.',
    features: ['Complete 9-day puja items', 'Step-by-step guide included', 'Premium quality samagri', 'Eco-friendly packaging', 'Suitable for home puja'],
    price: 899,
    compareAtPrice: 1499,
    discount: 40,
    currency: 'INR',
    images: [{ url: '/images/store/navratri-kit.jpg', alt: 'Complete Navratri Puja Kit' }],
    category: 'Puja Samagri',
    collection: 'festival-specials',
    tag: 'Festival Special',
    inStock: true,
    freeDelivery: true,
    rating: 4.7,
    reviewCount: 156,
    weight: '1.8 kg',
    sku: 'BS-PS-001',
  },
  {
    id: 'prod_006',
    handle: 'brass-krishna-playing-flute',
    title: 'Pure Brass Krishna Playing Flute (12 inch)',
    description: 'A stunning 12-inch brass idol of Lord Krishna in the iconic flute-playing pose. Cast using traditional lost-wax method and hand-finished with antique polish. The detailed craftsmanship captures Krishna\'s divine playfulness.',
    features: ['Pure brass, hand-cast', 'Lost-wax method', '12 inch height', 'Antique finish', 'Traditional craftsmanship'],
    price: 3299,
    compareAtPrice: 4599,
    discount: 28,
    currency: 'INR',
    images: [{ url: '/images/store/krishna-idol.jpg', alt: 'Brass Krishna Playing Flute' }],
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
    id: 'prod_007',
    handle: 'organic-camphor-250g',
    title: 'Organic Camphor (Kapur) - 250g',
    description: 'Premium organic camphor tablets made from natural camphor tree extract. Burns with a pure white flame and leaves no residue. Essential for aarti, puja, and purifying the environment. Stored in airtight container to preserve freshness.',
    features: ['100% organic', 'No chemical residue', 'Clean white flame', 'Airtight container', '250g pack'],
    price: 199,
    compareAtPrice: 299,
    discount: 33,
    currency: 'INR',
    images: [{ url: '/images/store/camphor.jpg', alt: 'Organic Camphor' }],
    category: 'Puja Samagri',
    collection: 'puja-essentials',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.5,
    reviewCount: 1230,
    weight: '250g',
    sku: 'BS-PS-002',
  },
  {
    id: 'prod_008',
    handle: 'silk-puja-dhoti-angavastram-set',
    title: 'Silk Puja Dhoti & Angavastram Set',
    description: 'Pure silk dhoti and angavastram set in traditional off-white with golden zari border. Perfect for puja ceremonies, temple visits, and religious functions. Soft texture, comfortable to wear, and beautifully finished.',
    features: ['Pure silk fabric', 'Golden zari border', 'Dhoti + Angavastram', 'Traditional design', 'Comfortable fit'],
    price: 799,
    compareAtPrice: 1199,
    discount: 33,
    currency: 'INR',
    images: [{ url: '/images/store/dhoti-set.jpg', alt: 'Silk Puja Dhoti Set' }],
    category: 'Clothing',
    collection: 'clothing-accessories',
    tag: null,
    inStock: true,
    freeDelivery: true,
    rating: 4.6,
    reviewCount: 98,
    weight: '300g',
    sku: 'BS-CL-001',
  },
  {
    id: 'prod_009',
    handle: 'bhagavad-gita-deluxe-edition',
    title: 'Bhagavad Gita (Hindi-English, Deluxe Edition)',
    description: 'The complete Bhagavad Gita with original Sanskrit shlokas, Hindi translation, and English commentary. Deluxe hardcover edition with gold-embossed cover, ribbon bookmark, and premium paper. An essential text for spiritual seekers.',
    features: ['Sanskrit + Hindi + English', 'Deluxe hardcover', 'Gold-embossed cover', 'Ribbon bookmark', '700 shlokas with commentary'],
    price: 349,
    compareAtPrice: 599,
    discount: 42,
    currency: 'INR',
    images: [{ url: '/images/store/gita.jpg', alt: 'Bhagavad Gita Deluxe Edition' }],
    category: 'Books & Texts',
    collection: 'books-texts',
    tag: 'Bestseller',
    inStock: true,
    freeDelivery: false,
    rating: 4.9,
    reviewCount: 2100,
    weight: '450g',
    sku: 'BS-BK-001',
  },
  {
    id: 'prod_010',
    handle: 'copper-kalash-coconut-set',
    title: 'Copper Kalash with Coconut Set',
    description: 'Handmade pure copper kalash with matching coconut holder. Essential for Griha Pravesh, Satyanarayan Puja, and other auspicious ceremonies. Copper is known for its health benefits and is traditionally used in Hindu rituals.',
    features: ['Pure copper', 'Handmade', 'Includes coconut holder', 'Multi-purpose use', 'Traditional design'],
    price: 449,
    compareAtPrice: 699,
    discount: 36,
    currency: 'INR',
    images: [{ url: '/images/store/kalash.jpg', alt: 'Copper Kalash Set' }],
    category: 'Puja Samagri',
    collection: 'puja-essentials',
    tag: null,
    inStock: true,
    freeDelivery: false,
    rating: 4.7,
    reviewCount: 324,
    weight: '600g',
    sku: 'BS-PS-003',
  },
  {
    id: 'prod_011',
    handle: 'tulsi-mala-silver-cap',
    title: 'Tulsi Mala with Silver Cap',
    description: 'Sacred Tulsi (Holy Basil) wood mala with 108+1 beads and sterling silver cap. Handcrafted from aged Tulsi wood. Wearing Tulsi mala is considered auspicious for Vaishnavas and is believed to bring the blessings of Lord Vishnu.',
    features: ['Aged Tulsi wood', '108+1 beads', 'Sterling silver cap', 'Hand-crafted', 'Traditional knotting'],
    price: 399,
    compareAtPrice: 649,
    discount: 39,
    currency: 'INR',
    images: [{ url: '/images/store/tulsi-mala.jpg', alt: 'Tulsi Mala with Silver Cap' }],
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
    id: 'prod_012',
    handle: 'electric-led-diya-set',
    title: 'Electric LED Diya Set (12 pieces, brass finish)',
    description: 'Set of 12 flameless LED diyas with realistic brass finish. Battery-operated with warm amber glow that mimics real flame. Safe for homes with children and pets. Perfect for Diwali decoration, daily mandir, and festive occasions.',
    features: ['12 pieces per set', 'Realistic flame effect', 'Battery operated', 'Safe and flameless', 'Brass finish'],
    price: 549,
    compareAtPrice: 899,
    discount: 39,
    currency: 'INR',
    images: [{ url: '/images/store/led-diya.jpg', alt: 'Electric LED Diya Set' }],
    category: 'Home Decor',
    collection: 'home-decor',
    tag: 'New Arrival',
    inStock: true,
    freeDelivery: true,
    rating: 4.5,
    reviewCount: 678,
    weight: '400g',
    sku: 'BS-HD-001',
  },
];

const COLLECTIONS: Collection[] = [
  {
    id: 'col_001',
    handle: 'puja-essentials',
    title: 'Puja Essentials',
    description: 'Everything you need for daily and special pujas — thalis, samagri, camphor, and more.',
    productCount: 4,
    image: null,
  },
  {
    id: 'col_002',
    handle: 'idols-murtis',
    title: 'Idols & Murtis',
    description: 'Hand-carved and cast idols of Hindu deities in marble, brass, and wood.',
    productCount: 2,
    image: null,
  },
  {
    id: 'col_003',
    handle: 'rudraksha-malas',
    title: 'Rudraksha & Malas',
    description: 'Certified Rudraksha beads and sacred malas for meditation and worship.',
    productCount: 2,
    image: null,
  },
  {
    id: 'col_004',
    handle: 'festival-specials',
    title: 'Festival Specials',
    description: 'Complete puja kits and essentials for Navratri, Diwali, and other festivals.',
    productCount: 1,
    image: null,
  },
  {
    id: 'col_005',
    handle: 'books-texts',
    title: 'Books & Sacred Texts',
    description: 'Sacred scriptures, spiritual books, and devotional literature.',
    productCount: 1,
    image: null,
  },
  {
    id: 'col_006',
    handle: 'clothing-accessories',
    title: 'Clothing & Accessories',
    description: 'Traditional puja clothing — dhoti, angavastram, saree sets.',
    productCount: 1,
    image: null,
  },
  {
    id: 'col_007',
    handle: 'home-decor',
    title: 'Home Decor',
    description: 'LED diyas, temple decorations, and sacred home accessories.',
    productCount: 1,
    image: null,
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
