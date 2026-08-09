# apps\web\app\panchang\[city]\page.tsx

- generateStaticParams · function · L42-L44 — function generateStaticParams()
- generateMetadata · function · L46-L61 — async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata>
- computeSunriseSunset · function · L65-L115 — function computeSunriseSunset(date: Date, lat: number, lon: number): { sunriseIST: string; sunsetIST: string; sunriseMinUTC: number; sunsetMinUTC: number; }
- formatMin · function · L117-L123 — function formatMin(min: number): string
- formatMinIST · function · L125-L128 — function formatMinIST(minIST: number): string
- daysSinceEpoch · function · L170-L172 — function daysSinceEpoch(d: Date): number
- todayIST · function · L174-L186 — function todayIST(): Date
- dayOfWeekIST · function · L188-L192 — function dayOfWeekIST(d: Date): number
- computeAngas · function · L194-L201 — function computeAngas(d: Date)
- dayLength · function · L203-L209 — function dayLength(sunriseMin: number, sunsetMin: number): string
- Muhurat · interface · L211-L217 — interface Muhurat
- buildMuhurats · function · L219-L270 — function buildMuhurats(sunriseMin: number, sunsetMin: number, wkday: number): Muhurat[]
- PanchangCityPage · function · L278-L446 — async function PanchangCityPage({ params }: { params: Promise<{ city: string }> })
