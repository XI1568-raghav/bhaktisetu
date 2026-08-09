# apps\web\lib\sade-sati.ts

- norm360 · function · L21-L24 — function norm360(d: number): number
- saturnTropicalLongitude · function · L28-L38 — function saturnTropicalLongitude(jd: number): number
- ayanamsaForJD · function · L41-L44 — function ayanamsaForJD(jd: number): number
- jdForISODate · function · L47-L57 — function jdForISODate(iso: string): number
- saturnRashiOn · function · L60-L64 — function saturnRashiOn(jd: number): number
- SadeSatiPhaseKind · type · L66-L72 — type SadeSatiPhaseKind = | 'rising' // 12th from moon | 'peak' // 1st from moon (janma shani) | 'setting' // 2nd from moon | 'dhaiya-4th' // 4th from moon (kantaka shani) | 'dhaiya-8th' // 8th from moon (ardha-kantaka shani) | 'normal';
- SadeSatiPhase · type · L74-L82 — type SadeSatiPhase = { kind: SadeSatiPhaseKind; startDate: string; // YYYY-MM-DD endDate: string; saturnRashi: string; isCurrent: boolean; ageStart: number; // age at start of phase ageEnd: number; };
- SadeSatiResult · type · L84-L93 — type SadeSatiResult = { moonRashi: string; moonRashiIdx: number; currentSaturnRashi: string; currentPhase: SadeSatiPhaseKind; currentPhaseLabel: string; currentPhaseDescription: string; phases: SadeSatiPhase[]; // sade sati + dhaiya phases through 90 yrs reasoning: string; };
- isoFromJD · function · L156-L162 — function isoFromJD(jd: number): string
- classifyPhase · function · L164-L173 — function classifyPhase(saturnRashiIdx: number, moonRashiIdx: number): SadeSatiPhaseKind
- computeSadeSati · function · L175-L271 — function computeSadeSati(input: NakshatraFinderInput, asOfDate?: string): SadeSatiResult | null
