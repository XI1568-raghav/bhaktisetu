# apps\web\lib\nakshatra-finder.ts

- NakshatraFinderInput · type · L14-L18 — type NakshatraFinderInput = { dob: string; // YYYY-MM-DD time: string; // HH:MM (24h, local) timezoneOffset: number; // hours, e.g. 5.5 for IST };
- NakshatraFinderResult · type · L20-L32 — type NakshatraFinderResult = { input: NakshatraFinderInput; julianDay: number; moonTropicalLongitude: number; // degrees [0,360) moonSiderealLongitude: number; // degrees [0,360), after Lahiri ayanamsa ayanamsa: number; // degrees nakshatra: Nakshatra; nakshatraIndex: number; // 0-26 pada: 1 | 2 | 3 | 4; padaLongitude: number; // position within the nakshatra (0-13.33) rashi: string; // 12 zodiac signs rashiIndex: number; // 0-11 };
- norm360 · function · L54-L57 — function norm360(deg: number): number
- julianDay · function · L60-L74 — function julianDay(year: number, month: number, day: number, hourUtc: number): number
- lahiriAyanamsa · function · L79-L82 — function lahiriAyanamsa(jd: number): number
- moonTropicalLongitude · function · L86-L122 — function moonTropicalLongitude(jd: number): number
- findNakshatra · function · L124-L200 — function findNakshatra(input: NakshatraFinderInput): NakshatraFinderResult | null
- daysInMonth · function · L202-L209 — function daysInMonth(year: number, month: number): number
