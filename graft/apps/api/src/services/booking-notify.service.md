# apps\api\src\services\booking-notify.service.ts

- BookingCtx · interface · L28-L40 — interface BookingCtx
- BookingEvent · type · L42-L53 — type BookingEvent = | 'confirmed' // payment captured, booking confirmed | 'assigned' // pandit assigned/accepted | 'reassigned' // pandit released, re-matching | 'offer' // (to pandit) you have a new booking offer | 'offer_timeout' // (to pandit) offer expired | 'in_progress' // puja started | 'completed' // puja done | 'video_ready' // video proof uploaded | 'cancelled' // booking cancelled | 'refund' // refund processed | 'eta';
- pushTextFor · function · L69-L96 — function pushTextFor(event: BookingEvent, ctx: BookingCtx): { title: string; body: string }
- varsFor · function · L98-L108 — function varsFor(event: BookingEvent, ctx: BookingCtx): string[]
- notifyDevotee · function · L111-L132 — async function notifyDevotee( event: BookingEvent, ctx: BookingCtx, ): Promise<void>
- notifyPriest · function · L135-L156 — async function notifyPriest( priestUserId: string, priestPhone: string | null | undefined, event: BookingEvent, ctx: BookingCtx, ): Promise<void>
- sendOfferToPriest · function · L160-L184 — async function sendOfferToPriest(params: { priestPhone?: string | null; priestUserId: string; bookingId: string; pujaName?: string | null; acceptUrl: string; expiresInSec: number; }): Promise<void>
- buildBookingCtx · function · L187-L209 — function buildBookingCtx(b: { id: string; bookingNumber?: string | null; scheduledDate?: Date | null; scheduledTimeSlot?: string | null; pujaType?: { name?: string | null } | null; temple?: { name?: string | null } | null; user?: { id?: string | null; fullName?: string | null; phone?: string | null } | null; priest?: { displayName?: string | null } | null; }): BookingCtx
- priestContact · function · L212-L218 — async function priestContact(priestId: string)
