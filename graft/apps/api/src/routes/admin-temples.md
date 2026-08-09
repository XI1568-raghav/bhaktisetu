# apps\api\src\routes\admin-temples.ts

- TimingInfo · type · L26-L30 — type TimingInfo = { regularHours?: Record<string, string>; closedOn?: string; specialDays?: string; } & Record<string, unknown>;
- AuditRow · interface · L32-L39 — interface AuditRow
- loadAuditHistory · function · L41-L51 — async function loadAuditHistory(templeId: string): Promise<AuditRow[]>
- tryWriteAudit · function · L53-L70 — async function tryWriteAudit( templeId: string, changedBy: string | null, before: unknown, after: unknown ): Promise<void>
- adminTemplesRoutes · function · L72-L181 — async function adminTemplesRoutes(server: FastifyInstance)
