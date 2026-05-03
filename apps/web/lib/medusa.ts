/**
 * Typed MedusaJS Storefront API client.
 *
 * Env-gated: when NEXT_PUBLIC_MEDUSA_BACKEND_URL is unset (or the request fails)
 * we fall back to the static seed catalogue in `lib/products.ts` so the /store
 * page never blanks. The fallback shape is normalised to MedusaProduct so the
 * rest of the UI doesn't branch.
 *
 * Why no @medusajs/medusa-js dep: keeps the web bundle slim and avoids forcing
 * a transitive node-fetch in Cloudflare Pages. Built-in fetch is enough.
 */

import { PRODUCTS as SEED_PRODUCTS, type Product as SeedProduct } from './products';

export interface MedusaProduct {
  id: string;
  handle: string;
  title: string;
  description: string;
  thumbnail: string | null;
  priceInr: number;
  compareAtInr: number | null;
  category: string;
  collection: string;
  inStock: boolean;
  freeDelivery: boolean;
  weight: string;
  source: 'medusa' | 'seed';
  // Display extras kept for parity with the static seed UI. When products
  // come back from Medusa we synthesise sane defaults so the grid never
  // breaks even if the catalogue is bare-bones.
  imageKey: string;
  tag: string | null;
  discount: number;
  rating: number;
  reviewCount: number;
  compareAtPrice: number;
  price: number;
  features: string[];
  sku: string;
}

interface MedusaListResponse {
  products: Array<{
    id: string;
    handle: string;
    title: string;
    description?: string | null;
    thumbnail?: string | null;
    weight?: number | null;
    collection?: { handle?: string; title?: string } | null;
    variants?: Array<{
      inventory_quantity?: number;
      prices?: Array<{ amount: number; currency_code: string }>;
    }>;
  }>;
  count: number;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL?.replace(/\/$/, '') || '';
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || '';

export function isMedusaEnabled(): boolean {
  return BACKEND_URL.length > 0;
}

function headers(): HeadersInit {
  const h: Record<string, string> = { 'content-type': 'application/json' };
  if (PUBLISHABLE_KEY) h['x-publishable-api-key'] = PUBLISHABLE_KEY;
  return h;
}

function seedToMedusa(p: SeedProduct): MedusaProduct {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    thumbnail: null,
    priceInr: p.price,
    compareAtInr: p.compareAtPrice ?? null,
    category: p.category,
    collection: p.collection,
    inStock: p.inStock,
    freeDelivery: p.freeDelivery,
    weight: p.weight,
    source: 'seed',
    imageKey: p.imageKey,
    tag: p.tag,
    discount: p.discount,
    rating: p.rating,
    reviewCount: p.reviewCount,
    compareAtPrice: p.compareAtPrice,
    price: p.price,
    features: p.features,
    sku: p.sku,
  };
}

function medusaToNormal(raw: MedusaListResponse['products'][number]): MedusaProduct {
  const variant = raw.variants?.[0];
  const inrPrice = variant?.prices?.find((pr) => pr.currency_code === 'inr')?.amount ?? 0;
  const priceInr = Math.round(inrPrice / 100);
  return {
    id: raw.id,
    handle: raw.handle,
    title: raw.title,
    description: raw.description ?? '',
    thumbnail: raw.thumbnail ?? null,
    priceInr,
    compareAtInr: null,
    category: raw.collection?.title ?? 'Store',
    collection: raw.collection?.handle ?? 'all',
    inStock: (variant?.inventory_quantity ?? 0) > 0,
    freeDelivery: priceInr >= 499,
    weight: raw.weight ? `${raw.weight}g` : '—',
    source: 'medusa',
    imageKey: raw.handle,
    tag: null,
    discount: 0,
    rating: 4.5,
    reviewCount: 0,
    compareAtPrice: priceInr,
    price: priceInr,
    features: [],
    sku: raw.handle.toUpperCase(),
  };
}

export async function listProducts(): Promise<MedusaProduct[]> {
  if (!isMedusaEnabled()) return SEED_PRODUCTS.map(seedToMedusa);
  try {
    const res = await fetch(`${BACKEND_URL}/store/products?limit=100`, {
      headers: headers(),
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`medusa ${res.status}`);
    const data = (await res.json()) as MedusaListResponse;
    return data.products.map(medusaToNormal);
  } catch (err) {
    console.warn('[medusa] list failed, falling back to seed:', err);
    return SEED_PRODUCTS.map(seedToMedusa);
  }
}

export async function getProductByHandle(handle: string): Promise<MedusaProduct | null> {
  if (!isMedusaEnabled()) {
    const seed = SEED_PRODUCTS.find((p) => p.handle === handle);
    return seed ? seedToMedusa(seed) : null;
  }
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/products?handle=${encodeURIComponent(handle)}`,
      { headers: headers(), next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`medusa ${res.status}`);
    const data = (await res.json()) as MedusaListResponse;
    const raw = data.products[0];
    return raw ? medusaToNormal(raw) : null;
  } catch (err) {
    console.warn('[medusa] handle lookup failed, falling back to seed:', err);
    const seed = SEED_PRODUCTS.find((p) => p.handle === handle);
    return seed ? seedToMedusa(seed) : null;
  }
}
