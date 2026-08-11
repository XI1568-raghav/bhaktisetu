# apps\web\lib\yatra-data.ts

- YatraRegion · type · L8-L8 — type YatraRegion = 'north' | 'south' | 'east' | 'west' | 'himalayas';
- YatraDifficulty · type · L9-L9 — type YatraDifficulty = 'easy' | 'moderate' | 'challenging' | 'extreme';
- YatraBudgetTier · type · L10-L10 — type YatraBudgetTier = 'economy' | 'standard' | 'premium';
- YatraItineraryDay · interface · L12-L19 — interface YatraItineraryDay
- YatraPackageTier · interface · L21-L31 — interface YatraPackageTier
- YatraReview · interface · L33-L40 — interface YatraReview
- YatraFaq · interface · L42-L45 — interface YatraFaq
- Yatra · interface · L47-L72 — interface Yatra
- TravelCompanion · interface · L74-L98 — interface TravelCompanion
- SacredSite · interface · L100-L108 — interface SacredSite
- getYatraBySlug · function · L896-L898 — function getYatraBySlug(slug: string): Yatra | undefined
- getCompanionById · function · L900-L902 — function getCompanionById(id: string): TravelCompanion | undefined
- formatINR · function · L904-L906 — function formatINR(amount: number): string
