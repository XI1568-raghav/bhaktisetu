# apps\web\lib\shubh-muhurat.ts

- EventType · type · L11-L23 — type EventType = | 'marriage' | 'griha-pravesh' | 'vehicle' | 'property' | 'naming' | 'mundan' | 'business-start' | 'signing' | 'travel' | 'surgery' | 'study' | 'general';
- MuhuratWindow · type · L50-L61 — type MuhuratWindow = { startTime: string; // HH:MM endTime: string; startMinutes: number; endMinutes: number; score: number; // 0..100 verdict: 'excellent' | 'good' | 'fair' | 'avoid'; horaPlanet: Planet; choghadiyaName: string; reasons: string[]; // chips warnings: string[]; };
- MuhuratResult · type · L63-L77 — type MuhuratResult = { date: string; city: string; weekday: string; event: EventType; eventLabel: string; sunrise: string; sunset: string; topWindows: MuhuratWindow[]; // sorted desc by score, top 6 allWindows: MuhuratWindow[]; // Diagnostic block choghadiya: ChoghadiyaDay; hora: HoraDay; rahuKalam: RahuKalamDay; };
- MuhuratInput · type · L79-L86 — type MuhuratInput = { date: string; lat: number; lng: number; tz: number; city: string; event: EventType; };
- overlaps · function · L88-L90 — function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean
- chogQualityAt · function · L92-L102 — function chogQualityAt(cd: ChoghadiyaDay, midMin: number): { kind: string; quality: 'auspicious' | 'neutral' | 'inauspicious' }
- rahuPenaltyAt · function · L104-L114 — function rahuPenaltyAt(rd: RahuKalamDay, startMin: number, endMin: number): { penalty: number; warnings: string[] }
- computeShubhMuhurat · function · L116-L196 — function computeShubhMuhurat(input: MuhuratInput, asOf?: Date): MuhuratResult | null
