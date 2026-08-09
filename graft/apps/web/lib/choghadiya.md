# apps\web\lib\choghadiya.ts

- ChoghadiyaKind · type · L10-L17 — type ChoghadiyaKind = | 'Amrit' // most auspicious — start anything | 'Shubh' // auspicious — wedding, ceremonies | 'Labh' // gain — business, money | 'Char' // movement — neutral, ideal for travel | 'Kaal' // inauspicious — avoid new starts | 'Rog' // inauspicious — avoid health-critical work | 'Udveg';
- ChoghadiyaQuality · type · L19-L19 — type ChoghadiyaQuality = 'auspicious' | 'inauspicious' | 'neutral';
- ChoghadiyaPeriod · type · L21-L32 — type ChoghadiyaPeriod = { index: number; // 1..8 kind: ChoghadiyaKind; quality: ChoghadiyaQuality; startTime: string; // HH:MM local endTime: string; startMinutes: number; // minutes from midnight local endMinutes: number; isCurrent: boolean; ruler: string; // planetary lord bestFor: string; };
- ChoghadiyaDay · type · L34-L45 — type ChoghadiyaDay = { date: string; // YYYY-MM-DD city: string; sunrise: string; // HH:MM local sunset: string; nextSunrise: string; weekday: string; day: ChoghadiyaPeriod[]; // 8 periods sunrise → sunset night: ChoghadiyaPeriod[]; // 8 periods sunset → next sunrise currentPeriod: ChoghadiyaPeriod | null; nextAuspicious: ChoghadiyaPeriod | null; };
- norm360 · function · L125-L128 — function norm360(d: number): number
- dayOfYear · function · L131-L135 — function dayOfYear(y: number, m: number, d: number): number
- solarTime · function · L141-L180 — function solarTime(y: number, m: number, d: number, lat: number, lng: number, tzOffset: number, rising: boolean): number
- hoursToHHMM · function · L182-L187 — function hoursToHHMM(h: number): string
- hoursToMinutes · function · L189-L191 — function hoursToMinutes(h: number): number
- ChoghadiyaInput · type · L193-L199 — type ChoghadiyaInput = { date: string; // YYYY-MM-DD lat: number; lng: number; tz: number; // hours offset city: string; };
- computeChoghadiya · function · L201-L273 — function computeChoghadiya(input: ChoghadiyaInput, asOf?: Date): ChoghadiyaDay | null
- buildPeriod · function · L233-L248 — function buildPeriod(i: number, startH: number, lenH: number, kind: ChoghadiyaKind): ChoghadiyaPeriod
