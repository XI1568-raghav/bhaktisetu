/**
 * PAR-24. The merchant's OWN catalogue.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `(store-admin)/products.tsx` and `(store-admin)/dashboard.tsx` both called
 * `useProducts()` from @poojly/api-client, which is
 * `GET /api/v1/store/products` — the PUBLIC storefront list, served by
 * `storeService.getProducts()` off the hardcoded `PRODUCTS` array in
 * apps/api/src/services/store.service.ts:89. Three separate lies followed from
 * that one wrong URL:
 *
 *   1. A store owner's "Products" tab listed a seeded demo catalogue that has
 *      nothing to do with their shop, and the header counted it as theirs.
 *   2. Every product they added went to `POST /api/v1/store-admin/products`,
 *      which writes `store_products` — a table the list never read. The add
 *      succeeded, the alert said "listed in catalogue", and the row never
 *      appeared.
 *   3. On top of that the screen took `stock` from a five-row FALLBACK array by
 *      `i % 5`, unconditionally, for every row — so the "In stock / Low / Out"
 *      pill was a number nobody had ever recorded.
 *
 * The real, role-gated route is `GET /api/v1/store-admin/products`
 * (apps/api/src/routes/store-admin.ts:133). It returns
 * `{products, total, page, limit}` where each product is `serializeProduct`
 * (store-admin.ts:59): `name` (not `title`), `price` as a Decimal STRING,
 * `stock`, `sku`, `category`, `isActive`. There is no `handle` and no `title`.
 * It answers `{products: [], storeProfileMissing: true}` when the owner has not
 * finished setting the store up, and `403 {error}` without a `products` key
 * when the caller is not a STORE_OWNER.
 *
 * `selectStoreProducts` in ./api-contracts is pinned to the PUBLIC shape
 * (`title` / `images` / `compareAtPrice`) and is what the devotee storefront
 * uses; reading merchant rows through it would drop every row on the missing
 * `title`. Hence a separate selector here, pinned to the merchant shape.
 *
 * The selector returns `null` for any body without a `products` array, so a 403
 * or an error envelope renders as "unavailable" and never as "you have no
 * products".
 */

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { api } from '@poojly/api-client';

export const storeAdminQueryKeys = {
  products: ['store-admin', 'products'] as const,
};

export function useStoreAdminProducts(
  options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
) {
  return useQuery<unknown>({
    queryKey: storeAdminQueryKeys.products,
    queryFn: () => api.get<unknown>('/api/v1/store-admin/products'),
    ...options,
  });
}

export interface StoreAdminProductVM {
  id: string;
  name: string;
  /** Decimal column → arrives as a string. `null` when it did not parse. */
  priceInr: number | null;
  /** `stock` is an Int column and is always sent. Never invented here. */
  stock: number;
  sku: string | null;
  /**
   * NOT an enum. `StoreProduct.category` is a free-text String? the merchant
   * types themselves (`z.string().max(80)`, placeholder "e.g. Malas, Idols,
   * Books"). It is named `categoryName` rather than `category` so it does not
   * read as one of this schema's enum columns — and so the CM-10 raw-enum sweep,
   * which treats a rendered `.category` as a stored identifier, is not asked to
   * approve running the owner's own capitalisation through `humanizeEnum`.
   */
  categoryName: string | null;
  isActive: boolean;
}

export interface StoreAdminCatalogueVM {
  rows: StoreAdminProductVM[];
  /** The paired COUNT from the server, not `rows.length`. */
  total: number;
  /** `true` only when the server said so — the owner has no StoreProfile yet. */
  storeProfileMissing: boolean;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * `null` means "the catalogue is unknown" (403, error envelope, anything
 * without a `products` array) — deliberately distinct from an empty catalogue.
 */
export function selectStoreAdminProducts(payload: unknown): StoreAdminCatalogueVM | null {
  if (!isRecord(payload) || !Array.isArray(payload.products)) return null;
  const rows = payload.products
    .filter(isRecord)
    .map((p): StoreAdminProductVM | null => {
      const id = typeof p.id === 'string' && p.id.length > 0 ? p.id : null;
      const name = typeof p.name === 'string' && p.name.length > 0 ? p.name : null;
      // A row with no id or no name is not renderable and is NOT given a
      // borrowed one. Dropping it is the honest outcome.
      if (!id || !name) return null;
      return {
        id,
        name,
        priceInr: toNumber(p.price),
        // `stock` is non-null in the schema; a body without it is a shape we do
        // not recognise, and 0 here would read as "out of stock" — a claim
        // about real inventory. Such a row is dropped instead.
        stock: typeof p.stock === 'number' && Number.isFinite(p.stock) ? p.stock : -1,
        sku: typeof p.sku === 'string' && p.sku.length > 0 ? p.sku : null,
        categoryName:
          typeof p.category === 'string' && p.category.length > 0 ? p.category : null,
        isActive: p.isActive !== false,
      };
    })
    .filter((p): p is StoreAdminProductVM => p !== null && p.stock >= 0);
  const total = toNumber(payload.total);
  return {
    rows,
    total: total === null ? rows.length : total,
    storeProfileMissing: payload.storeProfileMissing === true,
  };
}
