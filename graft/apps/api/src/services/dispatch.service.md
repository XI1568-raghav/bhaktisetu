# apps\api\src\services\dispatch.service.ts

- TierKey · type · L55-L55 — type TierKey = keyof typeof TIER_CONFIG;
- haversineKm · function · L58-L66 — function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number
- DispatchService · class · L68-L376 — class DispatchService
- selectCandidates · method · L75-L135 — async selectCandidates(opts: { tier: TierKey; bookingLat?: number | null; bookingLng?: number | null; bookingCity?: string | null; specializations?: string[]; excludePriestIds?: string[]; }): Promise<Array<{ id: string; displayName: string; userId: string }>>
- broadcast · method · L142-L204 — async broadcast(bookingId: string, tier: TierKey, round = 1): Promise<number>
- accept · method · L211-L277 — async accept(bookingId: string, priestId: string): Promise<{ bookingId: string; priestId: string }>
- decline · method · L284-L290 — async decline(bookingId: string, priestId: string): Promise<void>
- updateAcceptanceRate · method · L296-L311 — async updateAcceptanceRate(priestId: string): Promise<number>
- sweepExpiredOffers · method · L320-L375 — async sweepExpiredOffers(): Promise<{ expired: number; rebroadcast: number; escalated: number }>
