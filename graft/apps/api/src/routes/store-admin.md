# apps\api\src\routes\store-admin.ts

- resolveStoreProfileId · function · L29-L35 — async function resolveStoreProfileId(userId: string): Promise<string | null>
- serializeProduct · function · L37-L65 — function serializeProduct(p: { id: string; storeProfileId: string; name: string; description: string | null; price: { toString(): string }; imageUrl: string | null; category: string | null; stock: number; sku: string | null; isActive: boolean; createdAt: Date; updatedAt: Date; })
- storeAdminRoutes · function · L67-L389 — async function storeAdminRoutes(server: FastifyInstance)
- attributeOrderToStore · function · L171-L188 — function attributeOrderToStore( items: unknown, productIds: Set<string>, ): { revenue: number; lines: Array<{ productId: string; qty: number; lineInr: number }> }
