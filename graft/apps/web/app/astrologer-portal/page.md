# apps\web\app\astrologer-portal\page.tsx

- ApiAstroDashboard · type · L32-L46 — type ApiAstroDashboard = { profile: { fullName?: string | null; rating?: number | null; ratingCount?: number | null } | null; stats: { totalConsultations: number; rating: number; pricePerMinute: number; approved: boolean; consultationsToday: number; earningsTodayInr: number; earningsMonthInr: number; totalEarningsInr: number; activeClients: number; }; upcomingSessions: unknown[]; };
- AstrologerDashboard · function · L48-L251 — function AstrologerDashboard()
- toggleOnline · function · L69-L81 — async function toggleOnline(next: boolean)
