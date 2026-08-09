# apps\web\app\admin\consultations\page.tsx

- AdminConsultation · type · L18-L33 — type AdminConsultation = { id: string; reference: string; userId: string; astrologerId: string; astrologerName: string; minutes: number; amountInr: number; currency: string; status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | string; roomName: string | null; jitsiUrl: string | null; scheduledAt: string | null; createdAt: string; paidAt: string | null; };
- StatusFilter · type · L35-L35 — type StatusFilter = 'all' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled';
- buildAuthHeaders · function · L48-L50 — function buildAuthHeaders(accessToken: string | undefined): Record<string, string>
- statusBadge · function · L52-L65 — function statusBadge(status: string)
- shortId · function · L67-L69 — function shortId(uuid: string): string
- formatWhen · function · L71-L75 — function formatWhen(iso: string | null): string
- ListContent · function · L77-L294 — function ListContent()
- handleComplete · function · L116-L136 — async function handleComplete(c: AdminConsultation)
- AdminConsultationsPage · function · L296-L302 — function AdminConsultationsPage()
