# packages\api-client\src\hooks\store.ts

- Product · interface · L17-L31 — interface Product
- Collection · interface · L33-L40 — interface Collection
- CartItem · interface · L42-L49 — interface CartItem
- Cart · interface · L51-L57 — interface Cart
- Order · interface · L59-L66 — interface Order
- ProductsResponse · interface · L68-L73 — interface ProductsResponse
- useProducts · function · L88-L107 — function useProducts( params?: { collection?: string; category?: string; q?: string; sort?: string; page?: number; limit?: number; }, options?: Omit<UseQueryOptions<ProductsResponse>, "queryKey" | "queryFn"> )
- useProduct · function · L109-L120 — function useProduct( handle: string, options?: Omit<UseQueryOptions<{ product: Product }>, "queryKey" | "queryFn"> )
- useCollections · function · L122-L135 — function useCollections( options?: Omit< UseQueryOptions<{ collections: Collection[] }>, "queryKey" | "queryFn" > )
- useCart · function · L137-L145 — function useCart( options?: Omit<UseQueryOptions<Cart>, "queryKey" | "queryFn"> )
- useAddToCart · function · L147-L162 — function useAddToCart( options?: UseMutationOptions< Cart, Error, { productId: string; quantity: number } > )
- useUpdateCartItem · function · L164-L176 — function useUpdateCartItem( options?: UseMutationOptions<Cart, Error, { id: string; quantity: number }> )
- useRemoveCartItem · function · L178-L189 — function useRemoveCartItem( options?: UseMutationOptions<Cart, Error, string> )
