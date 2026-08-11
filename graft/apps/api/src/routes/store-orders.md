# apps\api\src\routes\store-orders.ts

- nextOrderNumber · function · L63-L68 — function nextOrderNumber(): string
- isAdmin · function · L70-L72 — function isAdmin(req: any): boolean
- isStoreOwner · function · L74-L76 — function isStoreOwner(req: any): boolean
- resolveStoreProfileId · function · L81-L87 — async function resolveStoreProfileId(userId: string): Promise<string | null>
- canManageOrder · function · L92-L110 — async function canManageOrder( req: any, order: { items?: any[] } | null, ): Promise<boolean>
- serializeOrder · function · L118-L143 — function serializeOrder(order: any, productNameMap?: Map<string, string>)
- storeOrderRoutes · function · L145-L507 — async function storeOrderRoutes(server: FastifyInstance)
- StoreOrderItem · type · L463-L463 — type StoreOrderItem = { productId?: string; qty?: number; priceAtPurchase?: number; name?: string };
- StoreOrderAddr · type · L464-L467 — type StoreOrderAddr = { fullName?: string; line1?: string; line2?: string; city?: string; state?: string; pincode?: string; country?: string; };
