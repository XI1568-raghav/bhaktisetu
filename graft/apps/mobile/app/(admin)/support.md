# apps\mobile\app\(admin)\support.tsx

- UiStatus · type · L10-L10 — type UiStatus = 'open' | 'in_progress' | 'resolved';
- UiPriority · type · L11-L11 — type UiPriority = 'low' | 'medium' | 'high';
- Ticket · interface · L13-L20 — interface Ticket
- RawTicket · interface · L22-L30 — interface RawTicket
- relativeTime · function · L32-L42 — function relativeTime(iso: string): string
- normalizeStatus · function · L44-L49 — function normalizeStatus(raw: string | undefined): UiStatus
- normalizePriority · function · L51-L56 — function normalizePriority(raw: string | undefined): UiPriority
- AdminSupport · function · L71-L140 — function AdminSupport()
- onRefresh · function · L89-L93 — async function onRefresh()
