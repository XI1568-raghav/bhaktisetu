# apps\web\app\wellness-portal\page.tsx

- formatCurrency · function · L21-L23 — function formatCurrency(amount: number): string
- formatTime · function · L25-L28 — function formatTime(dateStr: string): string
- formatDate · function · L30-L33 — function formatDate(dateStr: string): string
- ApiWellnessSession · type · L37-L45 — type ApiWellnessSession = { id: string; title: string; scheduledAt: string; durationMinutes: number; capacity: number; priceInr: number; enrolled: number; };
- ApiWellnessDashboard · type · L47-L61 — type ApiWellnessDashboard = { profile: { fullName?: string | null } | null; stats: { totalSessions: number; upcomingSessions: number; completedSessions: number; totalStudents: number; totalEarningsInr: number; monthEarningsInr: number; instructorShare?: number; platformRate?: number; }; upcomingSessions: ApiWellnessSession[]; recentSessions: unknown[]; };
- WellnessDashboard · function · L63-L244 — function WellnessDashboard()
