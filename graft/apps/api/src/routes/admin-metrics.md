# apps\api\src\routes\admin-metrics.ts

- tokenAuthorised · function · L19-L27 — function tokenAuthorised(provided: string | undefined): boolean
- authorised · function · L29-L43 — async function authorised(request: FastifyRequest, query: { token?: string }): Promise<boolean>
- TokenQuery · interface · L45-L47 — interface TokenQuery
- FunnelQuery · interface · L49-L51 — interface FunnelQuery extends TokenQuery
- startOfDayUtc · function · L54-L58 — function startOfDayUtc(d: Date): Date
- dayKey · function · L60-L62 — function dayKey(d: Date): string
- daysAgo · function · L64-L66 — function daysAgo(n: number): Date
- decToPaise · function · L69-L74 — function decToPaise(d: unknown): number
- adminMetricsRoutes · function · L76-L287 — async function adminMetricsRoutes(server: FastifyInstance)
- Stages · type · L212-L212 — type Stages = { landing: number; signup: number; kyc: number; booking: number; payment_success: number };
