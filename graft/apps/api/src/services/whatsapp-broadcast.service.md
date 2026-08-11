# apps\api\src\services\whatsapp-broadcast.service.ts

- ensureSchema · function · L34-L71 — async function ensureSchema(): Promise<void>
- normalisePhone · function · L73-L78 — function normalisePhone(input: string): string
- loadOptOuts · function · L80-L86 — async function loadOptOuts(): Promise<Set<string>>
- recordDelivery · function · L88-L115 — async function recordDelivery(params: { phone: string; template: string; language: string; audience: string; status: 'SENT' | 'FAILED' | 'SKIPPED' | 'OPTED_OUT'; messageId?: string; error?: string; triggeredBy?: string; }): Promise<void>
- recordOptOut · function · L117-L133 — async function recordOptOut(params: { phone: string; reason?: string; source?: string; }): Promise<void>
- isOptedOut · function · L135-L143 — async function isOptedOut(phone: string): Promise<boolean>
- BroadcastResult · interface · L145-L154 — interface BroadcastResult
- BroadcastInput · interface · L156-L161 — interface BroadcastInput
- broadcastToWaitlist · function · L168-L185 — async function broadcastToWaitlist(input: BroadcastInput): Promise<BroadcastResult>
- broadcastToBookingHolders · function · L191-L211 — async function broadcastToBookingHolders( input: BroadcastInput ): Promise<BroadcastResult>
- broadcastToAll · function · L217-L246 — async function broadcastToAll(input: BroadcastInput): Promise<BroadcastResult>
- runBroadcast · function · L248-L339 — async function runBroadcast(params: { audience: string; phones: string[]; optOut: Set<string>; input: BroadcastInput; }): Promise<BroadcastResult>
- recentDeliveries · function · L341-L366 — async function recentDeliveries(limit = 50): Promise< Array<{ id: string; phone: string; template: string; audience: string; status: string; created_at: Date; }> >
