# apps\web\lib\rahu-kalam.ts

- DoshaKind · type · L10-L10 — type DoshaKind = 'rahu' | 'yamaganda' | 'gulika';
- DoshaWindow · type · L12-L24 — type DoshaWindow = { kind: DoshaKind; label: string; // "Rahu Kalam" sanskrit: string; octet: number; // 1..8 startTime: string; // HH:MM local endTime: string; startMinutes: number; endMinutes: number; isCurrent: boolean; ruler: string; avoid: string; // what to skip during this window };
- RahuKalamDay · type · L26-L37 — type RahuKalamDay = { date: string; city: string; weekday: string; sunrise: string; sunset: string; dayLengthHours: number; octetLengthMin: number; windows: DoshaWindow[]; // ordered by startMinutes currentDosha: DoshaWindow | null; nextDosha: DoshaWindow | null; };
- parseHHMM · function · L70-L73 — function parseHHMM(s: string): number
- minutesToHHMM · function · L75-L80 — function minutesToHHMM(min: number): string
- RahuKalamInput · type · L82-L88 — type RahuKalamInput = { date: string; lat: number; lng: number; tz: number; city: string; };
- computeRahuKalam · function · L90-L150 — function computeRahuKalam(input: RahuKalamInput, asOf?: Date): RahuKalamDay | null
- buildWindow · function · L108-L125 — function buildWindow(kind: DoshaKind, octet: number): DoshaWindow
