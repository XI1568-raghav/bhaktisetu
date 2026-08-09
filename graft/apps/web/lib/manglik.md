# apps\web\lib\manglik.ts

- norm360 · function · L16-L19 — function norm360(deg: number): number
- marsTropicalLongitude · function · L23-L34 — function marsTropicalLongitude(jd: number): number
- ManglikResult · type · L36-L45 — type ManglikResult = { isManglik: boolean; severity: 'none' | 'anshik' | 'poorna'; marsHouseFromMoon: number; // 1-12 marsRashi: string; moonRashi: string; marsLongitude: number; // sidereal degrees moonLongitude: number; // sidereal degrees (from nakshatra finder) reasoning: string; };
- checkManglik · function · L60-L105 — function checkManglik(input: NakshatraFinderInput): ManglikResult | null
