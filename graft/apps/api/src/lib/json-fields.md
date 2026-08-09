# apps\api\src\lib\json-fields.ts

- StatusHistoryEntry · interface · L30-L35 — interface StatusHistoryEntry
- appendStatusHistory · function · L47-L66 — function appendStatusHistory( current: unknown, entry: Omit<StatusHistoryEntry, 'changedAt'> & { changedAt?: string | Date }, ): Prisma.InputJsonValue[]
- StoreOrderItem · type · L75-L75 — type StoreOrderItem = z.infer<typeof storeOrderItemSchema>;
- validateStoreOrderItems · function · L82-L90 — function validateStoreOrderItems(items: unknown): StoreOrderItem[]
