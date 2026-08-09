# apps\api\src\jobs\daily-panchang-cron.ts

- PanchangBlastResult · interface · L17-L22 — interface PanchangBlastResult
- sleep · function · L24-L26 — function sleep(ms: number): Promise<void>
- panchangEmailHtml · function · L28-L77 — function panchangEmailHtml(params: { fullName?: string | null; panchang: { tithi: string; nakshatra: string; yoga: string; karana: string; sunrise: string; sunset: string; rahuKaal: string; festivals?: string[]; vrat?: string[]; specialInfo?: string | null; }; city: string; dateStr: string; }): string
- runDailyPanchangBlast · function · L79-L196 — async function runDailyPanchangBlast(): Promise<PanchangBlastResult>
- BatchRow · type · L107-L107 — type BatchRow = { id: string; email: string; fullName: string | null };
