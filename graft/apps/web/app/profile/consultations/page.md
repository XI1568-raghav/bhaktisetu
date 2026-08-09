# apps\web\app\profile\consultations\page.tsx

- Consultation · type · L21-L34 — type Consultation = { id: string; reference: string; astrologerId: string; astrologerName: string; minutes: number; amountInr: number; currency: string; status: 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | string; roomName: string | null; jitsiUrl: string | null; scheduledAt: string | null; createdAt: string; };
- buildAuthHeaders · function · L41-L43 — function buildAuthHeaders(accessToken: string | undefined): Record<string, string>
- statusBadge · function · L45-L58 — function statusBadge(status: string)
- ListContent · function · L60-L222 — function ListContent()
- handleCancel · function · L87-L107 — async function handleCancel(c: Consultation)
- MyConsultationsPage · function · L224-L230 — function MyConsultationsPage()
