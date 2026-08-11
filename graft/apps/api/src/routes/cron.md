# apps\api\src\routes\cron.ts

- JobResult · interface · L21-L27 — interface JobResult
- runJob · function · L29-L42 — async function runJob(name: string, fn: () => Promise<unknown>): Promise<JobResult>
- refreshPanchang · function · L46-L51 — async function refreshPanchang(): Promise<{ daysRefreshed: number }>
- sendFestivalReminders · function · L53-L57 — async function sendFestivalReminders(): Promise<{ sent: number }>
- expireBookings · function · L59-L63 — async function expireBookings(): Promise<{ expired: number }>
- cronRoutes · function · L73-L99 — async function cronRoutes(server: FastifyInstance)
