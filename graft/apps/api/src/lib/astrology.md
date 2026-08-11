# apps\api\src\lib\astrology.ts

- KundliInput · type · L36-L36 — type KundliInput = z.infer<typeof KundliInputSchema>;
- HoroscopeQuery · type · L44-L44 — type HoroscopeQuery = z.infer<typeof HoroscopeQuerySchema>;
- nakshatraFromLongitude · function · L96-L103 — function nakshatraFromLongitude(longDeg: number): { index: number; pada: number }
- buildDashaSequence · function · L105-L141 — function buildDashaSequence(moonLongDeg: number, dob: Date): Array<{ planet: string; planetHindi: string; startDate: string; endDate: string; years: number; isCurrent: boolean; }>
- KundliPayload · interface · L145-L161 — interface KundliPayload
- DailyHoroscopePayload · interface · L163-L173 — interface DailyHoroscopePayload
- findRashiBySanskrit · function · L177-L180 — function findRashiBySanskrit(name: string)
- signatureFor · function · L182-L188 — function signatureFor(input: KundliInput): string
- generateKundli · function · L190-L261 — async function generateKundli(rawInput: unknown): Promise<KundliPayload>
- generateInterpretation · function · L263-L297 — async function generateInterpretation(args: { name: string; rashi: typeof RASHIS[number]; sunSign: typeof RASHIS[number]; nakshatra: readonly [string, string]; lagna: typeof RASHIS[number]; currentDasha: { planet: string; planetHindi: string; startDate: string; endDate: string; years: number } | null; }): Promise<string[]>
- normaliseSign · function · L326-L333 — function normaliseSign(input: string): string | null
- isoDateForScope · function · L335-L344 — function isoDateForScope(scope: 'today' | 'tomorrow' | 'week'): string
- getDailyHoroscope · function · L346-L394 — async function getDailyHoroscope(rawQuery: unknown): Promise<DailyHoroscopePayload>
- prewarmDailyHoroscopes · function · L398-L410 — async function prewarmDailyHoroscopes(): Promise<{ generated: number; signs: string[]; date: string }>
