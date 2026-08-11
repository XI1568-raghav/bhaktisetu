# apps\api\src\routes\temple-portal.ts

- hasTempleManagerRole · function · L67-L69 — function hasTempleManagerRole(req: { currentUser?: { roles?: string[] } }): boolean
- OrgRole · type · L71-L71 — type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';
- userCanEditTemple · function · L81-L101 — async function userCanEditTemple( templeId: string, userId: string, hasManagerRole: boolean, isAdmin: boolean, ): Promise<boolean>
- resolveManagerTempleId · function · L109-L120 — async function resolveManagerTempleId(userId: string): Promise<string | null>
- templePortalRoutes · function · L122-L705 — async function templePortalRoutes(server: FastifyInstance)
- serializeOffering · function · L351-L373 — function serializeOffering(o: { id: string; templeId: string; pujaTypeId: string; priceOverride: { toString(): string } | null; nriPrice: { toString(): string } | null; assignedPriestId: string | null; availableSlots: unknown; maxBookingsPerSlot: number; isActive: boolean; })
- serializeDarshan · function · L526-L568 — function serializeDarshan(s: { id: string; templeId: string; streamKey: string; playbackUrl: string; status: StreamStatus; scheduledStart: Date | null; actualStart: Date | null; viewerCount: number; peakViewers: number; isPremium: boolean; streamProvider: StreamProvider; youtubeVideoId: string | null; youtubeChannelId: string | null; attribution: string | null; title: string | null; description: string | null; cameraLocation: string | null; createdAt: Date; updatedAt: Date; })
