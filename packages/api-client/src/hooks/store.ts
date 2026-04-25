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

export interface Product {
  id: string;
  handle: string;
  name: string;
  title?: string;
  description: string;
  price: number;
  category: string;
  collection?: string;
  imageUrl?: string;
  thumbnail?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
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
