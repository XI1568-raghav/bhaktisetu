// ──────────────────────────────────────────────
// @poojly/api-client — Store / Products Hooks
// ──────────────────────────────────────────────

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from "@tanstack/react-query";

import { api } from "../client.js";

// ─── Types ───────────────────────────────────

/**
 * One row of the PUBLIC storefront catalogue, `GET /api/v1/store/products` —
 * `storeService.getProducts()` in apps/api/src/services/store.service.ts:696,
 * whose row type is declared at :6.
 *
 * `name`, `imageUrl` and `thumbnail` are NOT sent — the wire has `title` and
 * `images: { url, alt }[]`. `name` was even declared REQUIRED, so
 * `product.name` type-checked everywhere and was `undefined` everywhere.
 */
export interface Product {
  id: string;
  handle: string;
  /** The display name. There is no `name` field. */
  title: string;
  description: string;
  features: string[];
  price: number;
  compareAtPrice: number | null;
  discount: number;
  currency: string;
  /** There is no `imageUrl` / `thumbnail`; use `images[0]?.url`. */
  images: Array<{ url: string; alt: string }>;
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
  image?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  product?: Product;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
  currency: string;
}

export interface Order {
  id: string;
  status: string;
  total: number;
  currency: string;
  items: CartItem[];
  createdAt: string;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

// ─── Query Keys ──────────────────────────────

export const storeQueryKeys = {
  products: (params?: Record<string, unknown>) =>
    ["store", "products", params] as const,
  product: (handle: string) => ["store", "product", handle] as const,
  collections: ["store", "collections"] as const,
  cart: ["store", "cart"] as const,
  order: (id: string) => ["store", "order", id] as const,
};

// ─── Hooks ───────────────────────────────────

/**
 * The PUBLIC storefront catalogue — `GET /api/v1/store/products`, the
 * unauthenticated, edge-cached list every shopper sees.
 *
 * ⚠ NOT A MERCHANT'S OWN CATALOGUE. The name says "products" and says nothing
 * about WHOSE, and that ambiguity is what put seed data on a store owner's own
 * screen: `(store-admin)/products.tsx` and `(store-admin)/dashboard.tsx` both
 * called this hook and listed the platform's demo catalogue as the owner's
 * inventory (PAR-24; guarded now by apps/mobile/lib/__tests__/
 * store-and-gaushala-contracts.par24.test.ts, which fails if either screen
 * mentions `useProducts` again).
 *
 * A merchant's real inventory is `GET /api/v1/store-admin/products`, which is
 * role-gated on STORE_OWNER, scoped to that user's `StoreProfile`, and answers
 * `{ products, storeProfileMissing? }` — a different endpoint with a different
 * shape. See apps/mobile/lib/store-admin-catalogue.ts.
 *
 * `usePublicStoreProducts` is the same hook under the unambiguous name; prefer
 * it in new code.
 */
export function useProducts(
  params?: {
    collection?: string;
    category?: string;
    q?: string;
    sort?: string;
    page?: number;
    limit?: number;
  },
  options?: Omit<UseQueryOptions<ProductsResponse>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: storeQueryKeys.products(params),
    queryFn: () =>
      api.get<ProductsResponse>("/api/v1/store/products", {
        params: params as Record<string, string | number | boolean | undefined>,
      }),
    ...options,
  });
}

/** `useProducts` under a name that says which catalogue it reads. */
export const usePublicStoreProducts = useProducts;

export function useProduct(
  handle: string,
  options?: Omit<UseQueryOptions<{ product: Product }>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: storeQueryKeys.product(handle),
    queryFn: () =>
      api.get<{ product: Product }>(`/api/v1/store/products/${handle}`),
    enabled: !!handle,
    ...options,
  });
}

export function useCollections(
  options?: Omit<
    UseQueryOptions<{ collections: Collection[] }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery({
    queryKey: storeQueryKeys.collections,
    queryFn: () =>
      api.get<{ collections: Collection[] }>("/api/v1/store/collections"),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
}

export function useCart(
  options?: Omit<UseQueryOptions<Cart>, "queryKey" | "queryFn">
) {
  return useQuery({
    queryKey: storeQueryKeys.cart,
    queryFn: () => api.get<Cart>("/api/v1/store/cart"),
    ...options,
  });
}

export function useAddToCart(
  options?: UseMutationOptions<
    Cart,
    Error,
    { productId: string; quantity: number }
  >
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => api.post<Cart>("/api/v1/store/cart/items", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storeQueryKeys.cart });
    },
    ...options,
  });
}

export function useUpdateCartItem(
  options?: UseMutationOptions<Cart, Error, { id: string; quantity: number }>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, quantity }) =>
      api.patch<Cart>(`/api/v1/store/cart/items/${id}`, { quantity }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storeQueryKeys.cart });
    },
    ...options,
  });
}

export function useRemoveCartItem(
  options?: UseMutationOptions<Cart, Error, string>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.delete<Cart>(`/api/v1/store/cart/items/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: storeQueryKeys.cart });
    },
    ...options,
  });
}
