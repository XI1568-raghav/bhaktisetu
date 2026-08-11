# apps\api\src\lib\pricing-bands.ts

- PujaPriceBand · interface · L22-L34 — interface PujaPriceBand
- resolvePujaPrice · function · L154-L175 — function resolvePujaPrice(opts: { slug: string; tier?: 'budget' | 'mid' | 'premium'; city?: string; isMuhuratPeak?: boolean; surgeMultiplier?: number; // pre-cap surge (e.g. 1.6); clamped to INSTANT_SURGE_CAP }): { priceInr: number; baseInr: number; surgeApplied: number } | null
