# apps\api\src\lib\vedic-context.ts

- rashiFromLong · function · L92-L95 — function rashiFromLong(siderealDeg: number)
- nakshatraFromLong · function · L97-L103 — function nakshatraFromLong(siderealDeg: number)
- buildCurrentMahadasha · function · L105-L133 — function buildCurrentMahadasha(moonLong: number, dob: Date, today: Date)
- VedicContext · interface · L135-L146 — interface VedicContext
- placeToCoords · function · L148-L154 — function placeToCoords(place?: string)
- detectSadeSati · function · L156-L162 — function detectSadeSati(moonRashiIdx: number, saturnRashiIdx: number): 'none' | 'rising' | 'peak' | 'setting'
- detectManglik · function · L164-L170 — function detectManglik(marsRashiIdx: number, moonRashiIdx: number, lagnaRashiIdx: number): boolean
- detectKemadruma · function · L172-L177 — function detectKemadruma(moonRashiIdx: number, planetsByRashi: Set<number>): boolean
- computeVedicContext · function · L179-L251 — function computeVedicContext(birthDetails: { name?: string; date?: string; time?: string; place?: string; }): VedicContext | null
