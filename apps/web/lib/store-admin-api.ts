import { API_BASE_URL, DATA_FETCH_TIMEOUT_MS, fetchWithTimeout } from './api-config';
import { UserFacingError, serverErrorMessage, userFacingMessage } from './friendly-error';

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
  // RES-09: the server's own sentence when it wrote one worth reading, else
  // friendly copy for the status. Never `fallback (HTTP status): raw detail`.
  const friendly = userFacingMessage(new Error(`HTTP ${res.status}`), fallback);
  try {
    return serverErrorMessage(await res.json(), friendly);
  } catch {
    return friendly;
  }
}

// ─── Endpoints ──────────────────────────────────────────────────────────────

export async function getMyReviews(
  token: string | undefined,
): Promise<StoreReview[]> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store/reviews`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load reviews'), res.status);
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
  return (await listStoreProductsWithSetupState(token)).products;
}

// S-07: the owner's product list and their store-setup state come back
// together, so /store-admin/products can tell "no store yet" apart from
// "store set up, no products yet" instead of inviting an add that 409s.
export async function listStoreProductsWithSetupState(
  token: string | undefined,
): Promise<{ products: StoreProduct[]; storeProfileMissing: boolean }> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store-admin/products`, {
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to load products'), res.status);
  const body = (await res.json()) as {
    products: StoreProduct[];
    storeProfileMissing?: boolean;
  };
  return {
    products: body.products ?? [],
    storeProfileMissing: body.storeProfileMissing === true,
  };
}

export interface StoreProfile {
  id: string;
  storeName: string;
  city: string | null;
  state: string | null;
  address: string | null;
  approved: boolean;
}

export async function saveStoreProfile(
  token: string | undefined,
  input: { storeName: string; city?: string; state?: string; address?: string },
): Promise<StoreProfile> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store-admin/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Could not save your store details'), res.status);
  const body = (await res.json()) as { profile: StoreProfile };
  return body.profile;
}

export async function createStoreProduct(
  token: string | undefined,
  input: CreateStoreProductInput,
): Promise<StoreProduct> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store-admin/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to create product'), res.status);
  const body = (await res.json()) as { product: StoreProduct };
  return body.product;
}

export async function updateStoreProduct(
  token: string | undefined,
  id: string,
  input: UpdateStoreProductInput,
): Promise<StoreProduct> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store-admin/products/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders(token) },
    body: JSON.stringify(input),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to update product'), res.status);
  const body = (await res.json()) as { product: StoreProduct };
  return body.product;
}

export async function deleteStoreProduct(
  token: string | undefined,
  id: string,
): Promise<void> {
  const res = await fetchWithTimeout(`${API_BASE_URL}/store-admin/products/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  }, DATA_FETCH_TIMEOUT_MS);
  if (!res.ok) throw new UserFacingError(await describeFailure(res, 'Failed to delete product'), res.status);
}
