# apps\api\src\routes\priest.ts

- priestRoutes · function · L48-L602 — async function priestRoutes(server: FastifyInstance)
- getPriestId · function · L59-L97 — async function getPriestId(userId: string): Promise<string>
- serializeOffering · function · L463-L491 — function serializeOffering(o: { id: string; priestId: string; name: string; description: string | null; deity: string; basePrice: { toString(): string }; durationMinutes: number; isActive: boolean; maxBookingsPerSlot?: number; availableSlots?: unknown; createdAt: Date; updatedAt: Date; })
