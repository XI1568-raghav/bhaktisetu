# apps\darshya-mcp\src\tools\kpi-snapshot.ts

- KpiResult · type · L10-L23 — type KpiResult = { allTime: { totalUsers: number; completedBookings: number; lifetimeRevenueInr: number; }; last7d: { newUsers: number; completedBookings: number; }; activeSubscriptions: number; pipelineLeads: number; generatedAt: string; };
- kpiSnapshot · function · L25-L69 — async function kpiSnapshot(_args: z.infer<typeof KpiSnapshotSchema>)
