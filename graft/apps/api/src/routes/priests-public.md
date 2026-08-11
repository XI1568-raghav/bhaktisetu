# apps\api\src\routes\priests-public.ts

- OfferingRow · type · L35-L46 — type OfferingRow = { id: string; priestId: string; name: string; description: string | null; deity: string; basePrice: { toString(): string }; durationMinutes: number; isActive: boolean; createdAt: Date; updatedAt: Date; };
- serializeOffering · function · L48-L61 — function serializeOffering(o: OfferingRow)
- PriestRow · type · L63-L74 — type PriestRow = { id: string; displayName: string; avatarUrl: string | null; bio: string | null; languages: string[]; specializations: string[]; experienceYears: number; ratingAvg: number; ratingCount: number; isVerified: boolean; };
- serializePriest · function · L76-L90 — function serializePriest(p: PriestRow, offeringCount: number)
- priestsPublicRoutes · function · L92-L199 — async function priestsPublicRoutes(server: FastifyInstance)
