# apps\web\app\temple-portal\page.tsx

- formatCurrency · function · L20-L22 — function formatCurrency(amount: number): string
- getStatusBadge · function · L24-L31 — function getStatusBadge(status: string)
- ApiBooking · type · L35-L43 — type ApiBooking = { id: string; bookingNumber: string; devotee: string; pujaName: string; scheduledDate: string; priceInr: number; status: string; };
- ApiDashboard · type · L45-L55 — type ApiDashboard = { profile: { templeName?: string | null; templeCity?: string | null; templeState?: string | null } | null; stats: { totalBookings: number; monthBookings: number; totalRevenueInr: number; monthRevenueInr: number; totalStreams: number; }; recentBookings: ApiBooking[]; };
- TempleDashboard · function · L59-L226 — function TempleDashboard()
