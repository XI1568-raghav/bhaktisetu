import { API_BASE_URL } from './api-config';

/**
 * The REAL store-owner catalogue — `store_products` rows created through
 * /store-admin/products by onboarded, approved sellers.
 *
 * COM-11 (prod sweep 2026-08-12): GET /api/v1/store/products/live has existed
 * since the marketplace revamp specifically to surface these, and its own
 * header comment said "store-owner products (store_products table) never
 * surface publicly". A repo-wide grep for `products/live` across apps/web
 * returned zero results — nothing ever called it. A seller who onboarded, did
 * the KYC and listed inventory saw their products on no public page and could
 * never receive an order, while POST /store/orders resolves StoreProduct by
 * UUID and would have taken the order happily.
 *
 * These rows are a SEPARATE keyspace from the 24 fixtures in lib/products.ts
 * (UUID ids vs `prod_015` handles). Unifying the two catalogues is COM-01 and
 * is owner-gated; this module deliberately does not attempt it. It gives the
 * seller catalogue its own shelf and its own detail route, both keyed on the
 * UUID that the order endpoint already resolves.
 *
 * NO FALLBACK. If the API is unreachable or answers non-OK, this returns an
 * empty list and the shelf disappears. It must never substitute fixtures: a
 * shelf headed "From verified Darshya sellers" showing catalogue seed products
 * would attribute someone else's goods to a real, named business.
 */

export interface LiveProduct {
  /** StoreProduct.id — the UUID POST /store/orders resolves. */
  id: string;
  handle: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  category: string;
  imageUrl: string | null;
  stock: number;
  sku: string;
  storeName: string;
}

interface LiveProductsResponse {
  products?: unknown;
}

function normalise(raw: unknown): LiveProduct | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === 'string' ? r.id : '';
  const title = typeof r.title === 'string' ? r.title : '';
  const price = Number(r.price);
  if (!id || !title || !Number.isFinite(price)) return null;
  return {
    id,
    handle: typeof r.handle === 'string' ? r.handle : id,
    title,
    description: typeof r.description === 'string' ? r.description : '',
    price,
    compareAtPrice:
      typeof r.compareAtPrice === 'number' && r.compareAtPrice > price ? r.compareAtPrice : null,
    category: typeof r.category === 'string' && r.category ? r.category : 'General',
    imageUrl: typeof r.imageUrl === 'string' && r.imageUrl ? r.imageUrl : null,
    stock: Number.isFinite(Number(r.stock)) ? Number(r.stock) : 0,
    sku: typeof r.sku === 'string' ? r.sku : '',
    storeName: typeof r.storeName === 'string' ? r.storeName : '',
  };
}

export async function getLiveProducts(limit = 24): Promise<LiveProduct[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/store/products/live?limit=${limit}`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as LiveProductsResponse;
    if (!Array.isArray(json.products)) return [];
    return json.products
      .map(normalise)
      .filter((p): p is LiveProduct => p !== null);
  } catch {
    return [];
  }
}

/**
 * One seller product by its StoreProduct id.
 *
 * The live endpoint has no per-id form, so this filters the active list. That
 * also means an out-of-stock or deactivated product resolves to null, which is
 * the correct answer for a public detail page: the seller's shelf and the
 * seller's product page agree on what is actually for sale.
 */
export async function getLiveProduct(id: string): Promise<LiveProduct | null> {
  if (!id) return null;
  const products = await getLiveProducts(200);
  return products.find((p) => p.id === id) ?? null;
}
