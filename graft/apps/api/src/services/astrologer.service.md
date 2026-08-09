# apps\api\src\services\astrologer.service.ts

- Presence · interface · L27-L31 — interface Presence
- setAstrologerOnline · function · L36-L52 — function setAstrologerOnline( userId: string, online: boolean, mode?: { chat?: boolean; call?: boolean }, ): Presence
- getAstrologerPresence · function · L54-L62 — function getAstrologerPresence(userId: string): Presence
- computeAstrologerSplit · function · L67-L78 — function computeAstrologerSplit(totalInr: number): { platformAmount: number; astrologerAmount: number; platformRate: number; }
- astrologerContact · function · L83-L101 — async function astrologerContact(ref: string): Promise<{ userId: string; displayName: string; phone: string | null } | null>
- notifyAstrologerNewConsult · function · L108-L126 — async function notifyAstrologerNewConsult(params: { astrologerRef: string; // profile id / userId / displayName devoteeName?: string | null; minutes: number; amountInr: number; consultationId: string; }): Promise<void>
- notifyDevoteeConsultConfirmed · function · L129-L144 — async function notifyDevoteeConsultConfirmed(params: { devoteeUserId: string; astrologerName: string; minutes: number; consultationId: string; }): Promise<void>
