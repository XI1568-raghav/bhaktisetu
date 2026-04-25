import { describe, it, expect, beforeEach } from 'vitest';
import { StoreService } from './store.service.js';

// StoreService uses hardcoded in-memory data — no mocks needed.
let service: StoreService;
let userId: string;

beforeEach(() => {
  service = new StoreService();
  // Use unique userId per test to avoid cart state leaking between tests
  userId = `test-user-${Math.random().toString(36).slice(2)}`;
});

// ─── getProducts ─────────────────────────────────────────────────────────────

describe('StoreService.getProducts', () => {
  it('returns all products with default pagination', () => {
    const result = service.getProducts({});
    expect(result.products).toBeInstanceOf(Array);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.total).toBe(12); // 12 hardcoded products
    expect(result.page).toBe(1);
    expect(result.limit).toBe(20);
    expect(result.totalPages).toBe(1);
  });

  it('filters by collection', () => {
    const result = service.getProducts({ collection: 'puja-essentials' });
    expect(result.products.length).toBeGreaterThan(0);
    result.products.forEach((p) => {
      expect(p.collection).toBe('puja-essentials');
    });
  });

  it('returns empty for unknown collection', () => {
    const result = service.getProducts({ collection: 'nonexistent' });
    expect(result.products).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('filters by category (case-insensitive)', () => {
    const result = service.getProducts({ category: 'Idols & Murtis' });
    expect(result.products.length).toBe(2);
    result.products.forEach((p) => {
      expect(p.category.toLowerCase()).toBe('idols & murtis');
    });
  });

  it('searches by title keyword', () => {
    const result = service.getProducts({ q: 'rudraksha' });
    expect(result.products.length).toBeGreaterThan(0);
    const found = result.products.some((p) =>
      p.title.toLowerCase().includes('rudraksha')
    );
    expect(found).toBe(true);
  });

  it('searches by description keyword', () => {
    const result = service.getProducts({ q: 'camphor' });
    expect(result.products.length).toBeGreaterThan(0);
  });

  it('filters by minPrice', () => {
    const result = service.getProducts({ minPrice: 1000 });
    result.products.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(1000);
    });
  });

  it('filters by maxPrice', () => {
    const result = service.getProducts({ maxPrice: 500 });
    result.products.forEach((p) => {
      expect(p.price).toBeLessThanOrEqual(500);
    });
  });

  it('filters by both minPrice and maxPrice', () => {
    const result = service.getProducts({ minPrice: 300, maxPrice: 1000 });
    result.products.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(300);
      expect(p.price).toBeLessThanOrEqual(1000);
    });
  });

  it('sorts by price ascending', () => {
    const result = service.getProducts({ sort: 'price_asc' });
    for (let i = 1; i < result.products.length; i++) {
      expect(result.products[i]!.price).toBeGreaterThanOrEqual(
        result.products[i - 1]!.price
      );
    }
  });

  it('sorts by price descending', () => {
    const result = service.getProducts({ sort: 'price_desc' });
    for (let i = 1; i < result.products.length; i++) {
      expect(result.products[i]!.price).toBeLessThanOrEqual(
        result.products[i - 1]!.price
      );
    }
  });

  it('sorts by rating', () => {
    const result = service.getProducts({ sort: 'rating' });
    for (let i = 1; i < result.products.length; i++) {
      expect(result.products[i]!.rating).toBeLessThanOrEqual(
        result.products[i - 1]!.rating
      );
    }
  });

  it('sorts by newest (reversed order)', () => {
    const result = service.getProducts({ sort: 'newest' });
    // The last product in the array should come first when sorted by newest
    expect(result.products[0]!.id).toBe('prod_012');
  });

  it('default sort is by review count (popular)', () => {
    const result = service.getProducts({});
    for (let i = 1; i < result.products.length; i++) {
      expect(result.products[i]!.reviewCount).toBeLessThanOrEqual(
        result.products[i - 1]!.reviewCount
      );
    }
  });

  it('paginates correctly', () => {
    const page1 = service.getProducts({ limit: 3, page: 1 });
    const page2 = service.getProducts({ limit: 3, page: 2 });

    expect(page1.products.length).toBe(3);
    expect(page2.products.length).toBe(3);
    expect(page1.totalPages).toBe(4); // 12 products / 3 per page = 4
    expect(page1.products[0]!.id).not.toBe(page2.products[0]!.id);
  });

  it('returns empty array for page beyond total', () => {
    const result = service.getProducts({ page: 100, limit: 20 });
    expect(result.products).toHaveLength(0);
    expect(result.total).toBe(12);
  });

  it('combines collection filter with sort', () => {
    const result = service.getProducts({
      collection: 'puja-essentials',
      sort: 'price_asc',
    });
    expect(result.products.length).toBeGreaterThan(1);
    for (let i = 1; i < result.products.length; i++) {
      expect(result.products[i]!.price).toBeGreaterThanOrEqual(
        result.products[i - 1]!.price
      );
    }
  });
});

// ─── getProductByHandle ──────────────────────────────────────────────────────

describe('StoreService.getProductByHandle', () => {
  it('returns a product for a valid handle', () => {
    const product = service.getProductByHandle('premium-brass-puja-thali-set');
    expect(product).not.toBeNull();
    expect(product!.id).toBe('prod_001');
    expect(product!.title).toContain('Brass Puja Thali');
  });

  it('returns null for unknown handle', () => {
    const product = service.getProductByHandle('nonexistent-product');
    expect(product).toBeNull();
  });

  it('returns product with all expected fields', () => {
    const product = service.getProductByHandle('premium-brass-puja-thali-set');
    expect(product).toBeDefined();
    expect(product!.id).toBeDefined();
    expect(product!.handle).toBeDefined();
    expect(product!.title).toBeDefined();
    expect(product!.description).toBeDefined();
    expect(product!.price).toBeDefined();
    expect(product!.currency).toBe('INR');
    expect(product!.images).toBeInstanceOf(Array);
    expect(product!.features).toBeInstanceOf(Array);
    expect(product!.inStock).toBeDefined();
    expect(product!.sku).toBeDefined();
  });
});

// ─── getCollections ──────────────────────────────────────────────────────────

describe('StoreService.getCollections', () => {
  it('returns all collections', () => {
    const collections = service.getCollections();
    expect(collections).toBeInstanceOf(Array);
    expect(collections.length).toBe(7);
  });

  it('each collection has required fields', () => {
    const collections = service.getCollections();
    for (const c of collections) {
      expect(c.id).toBeDefined();
      expect(c.handle).toBeDefined();
      expect(c.title).toBeDefined();
      expect(c.description).toBeDefined();
      expect(typeof c.productCount).toBe('number');
    }
  });

  it('includes the puja-essentials collection', () => {
    const collections = service.getCollections();
    const pujaEssentials = collections.find((c) => c.handle === 'puja-essentials');
    expect(pujaEssentials).toBeDefined();
    expect(pujaEssentials!.title).toBe('Puja Essentials');
  });
});

// ─── Cart operations ─────────────────────────────────────────────────────────

describe('StoreService cart operations', () => {


  it('returns an empty cart for a new user', () => {
    const cart = service.getCart(userId);
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
    expect(cart.itemCount).toBe(0);
    expect(cart.id).toBe(`cart_${userId}`);
    expect(cart.currency).toBe('INR');
  });

  it('adds a product to the cart', () => {
    const cart = service.createCartItem(userId, 'prod_001', 1);
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.productId).toBe('prod_001');
    expect(cart.items[0]!.quantity).toBe(1);
    expect(cart.items[0]!.subtotal).toBe(1299);
    expect(cart.itemCount).toBe(1);
  });

  it('calculates cart subtotal correctly', () => {
    service.createCartItem(userId, 'prod_001', 2);
    const cart = service.getCart(userId);
    expect(cart.subtotal).toBe(2598); // 1299 * 2
  });

  it('increments quantity when adding same product again', () => {
    service.createCartItem(userId, 'prod_001', 1);
    const cart = service.createCartItem(userId, 'prod_001', 2);
    // Should be 1+2=3 (but capped at 10)
    const item = cart.items.find((i) => i.productId === 'prod_001');
    expect(item!.quantity).toBe(3);
  });

  it('caps quantity at 10 when adding more', () => {
    service.createCartItem(userId, 'prod_001', 8);
    const cart = service.createCartItem(userId, 'prod_001', 8);
    const item = cart.items.find((i) => i.productId === 'prod_001');
    expect(item!.quantity).toBe(10);
  });

  it('throws for unknown product ID', () => {
    expect(() =>
      service.createCartItem(userId, 'prod_nonexistent', 1)
    ).toThrow('Product not found.');
  });

  it('throws for invalid quantity (0)', () => {
    expect(() =>
      service.createCartItem(userId, 'prod_001', 0)
    ).toThrow('Quantity must be between 1 and 10.');
  });

  it('throws for invalid quantity (>10)', () => {
    expect(() =>
      service.createCartItem(userId, 'prod_001', 11)
    ).toThrow('Quantity must be between 1 and 10.');
  });

  it('calculates delivery fee (free above 499)', () => {
    // Product 001 costs 1299 (above 499 threshold)
    const cart = service.createCartItem(userId, 'prod_001', 1);
    expect(cart.deliveryFee).toBe(0);
  });

  it('charges delivery fee for subtotal below 499', () => {
    // Product 007 (camphor) costs 199 (below 499 threshold)
    const cart = service.createCartItem(userId, 'prod_007', 1);
    expect(cart.deliveryFee).toBe(49);
  });

  it('calculates 5% GST', () => {
    const cart = service.createCartItem(userId, 'prod_001', 1);
    expect(cart.tax).toBe(Math.round(1299 * 0.05));
  });

  it('calculates total = subtotal + delivery + tax', () => {
    const cart = service.createCartItem(userId, 'prod_001', 1);
    const expectedTotal = cart.subtotal + cart.deliveryFee + cart.tax;
    expect(cart.total).toBe(expectedTotal);
  });
});

describe('StoreService.updateCartItem', () => {
  const userId = 'update-cart-user';

  it('updates cart item quantity', () => {
    const addResult = service.createCartItem(userId, 'prod_001', 1);
    const itemId = addResult.items[0]!.id;
    const cart = service.updateCartItem(userId, itemId, 3);
    expect(cart.items[0]!.quantity).toBe(3);
    expect(cart.items[0]!.subtotal).toBe(1299 * 3);
  });

  it('throws for unknown cart item', () => {
    expect(() =>
      service.updateCartItem(userId, 'nonexistent-item', 2)
    ).toThrow('Cart item not found.');
  });

  it('throws for quantity below 1', () => {
    const addResult = service.createCartItem(userId, 'prod_002', 1);
    const itemId = addResult.items.find((i) => i.productId === 'prod_002')!.id;
    expect(() => service.updateCartItem(userId, itemId, 0)).toThrow(
      'Quantity must be at least 1'
    );
  });

  it('throws for quantity above 10', () => {
    const addResult = service.createCartItem(userId, 'prod_003', 1);
    const itemId = addResult.items.find((i) => i.productId === 'prod_003')!.id;
    expect(() => service.updateCartItem(userId, itemId, 11)).toThrow(
      'Maximum quantity per item is 10.'
    );
  });
});

describe('StoreService.removeCartItem', () => {
  const userId = 'remove-cart-user';

  it('removes a cart item', () => {
    const addResult = service.createCartItem(userId, 'prod_001', 1);
    const itemId = addResult.items[0]!.id;
    const cart = service.removeCartItem(userId, itemId);
    expect(cart.items).toHaveLength(0);
    expect(cart.subtotal).toBe(0);
  });

  it('throws for unknown cart item', () => {
    expect(() =>
      service.removeCartItem(userId, 'nonexistent-item')
    ).toThrow('Cart item not found.');
  });

  it('only removes the specified item, keeping others', () => {
    service.createCartItem(userId, 'prod_001', 1);
    const after = service.createCartItem(userId, 'prod_002', 1);

    const itemToRemove = after.items.find((i) => i.productId === 'prod_001')!;
    const cart = service.removeCartItem(userId, itemToRemove.id);

    expect(cart.items).toHaveLength(1);
    expect(cart.items[0]!.productId).toBe('prod_002');
  });
});
