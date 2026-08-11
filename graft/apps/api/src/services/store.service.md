# apps\api\src\services\store.service.ts

- Product · interface · L3-L23 — interface Product
- Collection · interface · L25-L32 — interface Collection
- CartItem · interface · L34-L40 — interface CartItem
- Cart · interface · L42-L51 — interface Cart
- ProductsParams · interface · L53-L62 — interface ProductsParams
- img · function · L68-L74 — function img(photoIdOrUrl: string, alt: string): { url: string; alt: string }
- generateCartItemId · function · L674-L676 — function generateCartItemId(): string
- StoreService · class · L680-L874 — class StoreService
- getProducts · method · L684-L751 — getProducts(params: ProductsParams)
- getProductByHandle · method · L756-L758 — getProductByHandle(handle: string): Product | null
- getCollections · method · L763-L765 — getCollections(): Collection[]
- createCartItem · method · L770-L801 — createCartItem(userId: string, productId: string, quantity: number): Cart
- getCart · method · L806-L809 — getCart(userId: string): Cart
- updateCartItem · method · L814-L835 — updateCartItem(userId: string, itemId: string, quantity: number): Cart
- removeCartItem · method · L840-L851 — removeCartItem(userId: string, itemId: string): Cart
- buildCart · method · L856-L873 — private buildCart(userId: string, items: CartItem[]): Cart
