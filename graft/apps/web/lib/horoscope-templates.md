# apps\web\lib\horoscope-templates.ts

- ElementKey · type · L7-L7 — type ElementKey = 'fire' | 'earth' | 'air' | 'water';
- AreaKey · type · L8-L8 — type AreaKey = 'career' | 'love' | 'finance' | 'health';
- PakshaKind · type · L9-L9 — type PakshaKind = 'shukla' | 'krishna';
- dayOfYearIST · function · L152-L167 — function dayOfYearIST(date: Date): number
- istDateParts · function · L169-L187 — function istDateParts(date: Date): { iso: string; dayName: string; prettyDate: string; dow: number; }
- pickArea · function · L189-L193 — function pickArea(element: ElementKey, area: AreaKey, doy: number): string
- pakshaFromTithi · function · L195-L199 — function pakshaFromTithi(tithi: string): PakshaKind
- buildGeneralPrediction · function · L201-L224 — function buildGeneralPrediction(args: { rashiEnglish: string; element: ElementKey; tithi: string; dow: number; rulingPlanet: string; }): string
- elementOfRashi · function · L226-L232 — function elementOfRashi(rawElement: string): ElementKey
- luckyColorOfDay · function · L238-L241 — function luckyColorOfDay(rashiLuckyColor: string, doy: number): string
- luckyNumberOfDay · function · L243-L247 — function luckyNumberOfDay(rashiLuckyNumber: number, doy: number): number
