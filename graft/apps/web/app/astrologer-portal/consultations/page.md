# apps\web\app\astrologer-portal\consultations\page.tsx

- TabKey · type · L18-L18 — type TabKey = 'upcoming' | 'past';
- Consultation · interface · L20-L32 — interface Consultation
- formatCurrency · function · L34-L36 — function formatCurrency(amount: number): string
- formatDateTime · function · L38-L41 — function formatDateTime(dateStr: string): string
- getModeConfig · function · L43-L49 — function getModeConfig(mode: string)
- getStatusConfig · function · L51-L60 — function getStatusConfig(status: string)
- AstrologerConsultationsPage · function · L62-L279 — function AstrologerConsultationsPage()
- handleJoin · function · L100-L125 — async function handleJoin(c: Consultation)
- handlePatch · function · L127-L149 — async function handlePatch(c: Consultation, status: 'COMPLETED' | 'CANCELLED')
