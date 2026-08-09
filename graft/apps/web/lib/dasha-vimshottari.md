# apps\web\lib\dasha-vimshottari.ts

- DashaLord · type · L12-L14 — type DashaLord = | 'Ketu' | 'Venus' | 'Sun' | 'Moon' | 'Mars' | 'Rahu' | 'Jupiter' | 'Saturn' | 'Mercury';
- MahadashaPeriod · type · L38-L45 — type MahadashaPeriod = { lord: DashaLord; startDate: string; // YYYY-MM-DD endDate: string; years: number; isCurrent: boolean; antardashas?: AntardashaPeriod[]; };
- AntardashaPeriod · type · L47-L53 — type AntardashaPeriod = { lord: DashaLord; startDate: string; endDate: string; years: number; isCurrent: boolean; };
- DashaResult · type · L55-L62 — type DashaResult = { janmaLord: DashaLord; janmaNakshatra: string; birthBalanceYears: number; // remaining yrs in first mahadasha at birth timeline: MahadashaPeriod[]; currentMahadasha: MahadashaPeriod | null; currentAntardasha: AntardashaPeriod | null; };
- addYears · function · L67-L71 — function addYears(iso: string, years: number): string
- lordFromNakIndex · function · L73-L76 — function lordFromNakIndex(nakIdx: number): DashaLord
- computeDasha · function · L78-L152 — function computeDasha(input: NakshatraFinderInput, asOfDate?: string): DashaResult | null
- computeAntardashas · function · L157-L179 — function computeAntardashas(md: MahadashaPeriod, today: string): AntardashaPeriod[]
