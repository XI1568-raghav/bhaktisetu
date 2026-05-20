import { API_BASE_URL } from './api-config';

// ─── Types ──────────────────────────────────────────────────────────────────
// Mirrors the /store/reviews response (mounted under /api/v1/store, not
// /store-admin). Review has no productId column yet, so reviews are
// provider-level (one bucket per store owner) until the schema migration
// lands. UI must render an empty state in the meantime.

export interface StoreReview {
  id: string;
  userId: string;
  providerId: string;
  providerType: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function authHeaders(token: string | undefined): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function describeFailure(res: Response, fallback: string): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string; error?: string };
    const detail = body.message ?? body.error;
    return detail ? `${fallback} (${res.status}): ${detail}` : `${fallback} (${res.status})`;
  } catch {
    return `${fallback} (${res.status})`;
  }
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export async function getMyReviews(
  token: string | undefined,
): Promise<StoreReview[]> {
  const res = await fetch(`${API_BASE_URL}/store/reviews`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load reviews'));
  const data = (await res.json()) as { reviews: StoreReview[]; total: number };
  return data.reviews ?? [];
}

// ─── Store products CRUD ───────────────────────────────────────────────────
// Backed by /api/v1/store-admin/products. price is a STRING (Prisma Decimal
// → JSON). Number() before arithmetic.

export interface StoreProduct {
  id: string;
  storeProfileId: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  category: string | null;
  stock: number;
  sku: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStoreProductInput {
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  category?: string;
  stock?: number;
  sku?: string;
  isActive?: boolean;
}

export type UpdateStoreProductInput = Partial<CreateStoreProductInput>;

export async function listStoreProducts(token: string | undefined): Promise<StoreProduct[]> {
  const res = await fetch(`${API_BASE_URL}/store-admin/products`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to load products'));
  const body = (await res.json()) as { products: StoreProduct[] };
  return body.products;
}

export async function createStoreProduct(
  token: string | undefined,
  input: CreateStoreProductInput,
): Promise<StoreProduct> {
  const res = await fetch(`${API_BASE_URL}/store-admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to create product'));
  const body = (await res.json()) as { product: StoreProduct };
  return body.product;
}

export async function updateStoreProduct(
  token: string | undefined,
  id: string,
  input: UpdateStoreProductInput,
): Promise<StoreProduct> {
  const res = await fetch(`${API_BASE_URL}/store-admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to update product'));
  const body = (await res.json()) as { product: StoreProduct };
  return body.product;
}

export async function deleteStoreProduct(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/store-admin/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await describeFailure(res, 'Failed to delete product'));
}
