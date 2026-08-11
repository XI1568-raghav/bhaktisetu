# apps\darshya-mcp\src\tools\funnel-today.ts

- FunnelResult · type · L9-L24 — type FunnelResult = { today: { signups: number; bookings: number; bookingsByStatus: Record<string, number>; capturedRevenueInr: number; donationsInr: number; }; last7d: { signups: number; bookings: number; capturedRevenueInr: number; donationsInr: number; }; generatedAt: string; };
- windowCounts · function · L26-L61 — async function windowCounts(from: Date, to: Date)
- funnelToday · function · L63-L89 — async function funnelToday(_args: z.infer<typeof FunnelTodaySchema>)
