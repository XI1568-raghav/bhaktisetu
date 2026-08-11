# apps\api\src\lib\astro-mappings.ts

- NakshatraInfo · interface · L5-L11 — interface NakshatraInfo
- RashiInfo · interface · L45-L51 — interface RashiInfo
- LifeEventPujaInfo · interface · L70-L78 — interface LifeEventPujaInfo
- getDeityForNakshatra · function · L178-L181 — function getDeityForNakshatra(nakshatra: string): NakshatraInfo | null
- getPujaCategoriesForEvent · function · L186-L189 — function getPujaCategoriesForEvent(event: string): LifeEventPujaInfo | null
- getRecommendedDeity · function · L195-L239 — function getRecommendedDeity( rashi?: string, nakshatra?: string ): { primaryDeity: string; alternateDeities: string[]; reasoning: string }
- getComprehensiveRecommendation · function · L244-L281 — function getComprehensiveRecommendation(params: { lifeEvent?: string; rashi?: string; nakshatra?: string; }): { deities: { primaryDeity: string; alternateDeities: string[]; reasoning: string }; pujas: string[]; mantras: string[]; categories: string[]; }
