# apps\web\lib\daily-horoscope.ts

- PeriodKind · type · L39-L39 — type PeriodKind = 'today' | 'week' | 'month';
- DailyHoroscope · interface · L41-L63 — interface DailyHoroscope
- rashiIndex · function · L91-L94 — function rashiIndex(rashi: string): number
- houseFromNatal · function · L96-L98 — function houseFromNatal(transitRashi: number, natalIdx: number): number
- midUtJdForDate · function · L100-L103 — function midUtJdForDate(date: Date): number
- moonNakshatra · function · L105-L110 — function moonNakshatra(jd: number): string
- todayTithi · function · L112-L119 — function todayTithi(jd: number): string
- Transits · interface · L121-L129 — interface Transits
- computeTransits · function · L131-L150 — function computeTransits(jd: number, natalIdx: number): Transits
- sid · function · L133-L133 — sid = (long: number)
- houseScore · function · L172-L181 — function houseScore(t: Transits): number
- scoreToRating · function · L183-L189 — function scoreToRating(s: number): number
- pickPrediction · function · L247-L264 — function pickPrediction(t: Transits, rating: number): string
- luckyNumberFor · function · L266-L273 — function luckyNumberFor(rashi: string, date: Date): number
- getDailyHoroscope · function · L275-L308 — function getDailyHoroscope(rashi: string, date: Date): DailyHoroscope
- getPeriodHoroscope · function · L313-L348 — function getPeriodHoroscope( rashi: string, startDate: Date, period: PeriodKind, ): DailyHoroscope
