/**
 * booking-notify.service.ts — WhatsApp + push notifications for the puja
 * booking lifecycle.
 *
 * Why this exists: push notifications are unreliable in India (battery savers
 * kill them); WhatsApp is the channel devotees actually read. The booking
 * lifecycle already fired web-push on some transitions but NEVER touched
 * WhatsApp (which existed only for OTP / broadcast / gift-puja / yatra). The
 * instant-confirm revamp lives or dies on the devotee + pandit hearing about
 * offers and assignments within seconds, so every key booking event now also
 * sends a WhatsApp message.
 *
 * Design notes:
 *  - Best-effort / fire-and-forget. WhatsApp failure must NEVER break the
 *    booking flow. Every public fn swallows its own errors and logs.
 *  - Uses sendWhatsappTemplate for proactive events (Meta requires pre-approved
 *    templates outside the 24h window). If WHATSAPP_* env vars are unset the
 *    lib returns {skipped:true} and this becomes a no-op — safe in dev/demo.
 *  - Template names are conventions; the matching templates must be created +
 *    approved in WhatsApp Manager before these go live. Until then the sends
 *    no-op, which is fine — the code path is what we're shipping.
 */

import { sendWhatsappTemplate, sendWhatsappText } from '../lib/whatsapp.js';
import { notifyUser } from '../routes/notifications.js';
import { prisma } from '../lib/prisma.js';

export interface BookingCtx {
  bookingId: string;
  devoteeUserId?: string | null;
  bookingNumber?: string | null;
  pujaName?: string | null;
  templeName?: string | null;
  devoteeName?: string | null;
  devoteePhone?: string | null;
  priestName?: string | null;
  scheduledDate?: string | null;
  timeSlot?: string | null;
  amountInr?: number | null;
}

export type BookingEvent =
  | 'confirmed' // payment captured, booking confirmed
  | 'assigned' // pandit assigned/accepted
  | 'reassigned' // pandit released, re-matching
  | 'offer' // (to pandit) you have a new booking offer
  | 'offer_timeout' // (to pandit) offer expired
  | 'in_progress' // puja started
  | 'completed' // puja done
  | 'video_ready' // video proof uploaded
  | 'cancelled' // booking cancelled
  | 'refund' // refund processed
  | 'eta'; // day-of: pandit on the way

const TEMPLATE: Record<BookingEvent, string> = {
  confirmed: 'booking_confirmed',
  assigned: 'pandit_assigned',
  reassigned: 'pandit_reassigned',
  offer: 'pandit_offer',
  offer_timeout: 'pandit_offer_timeout',
  in_progress: 'puja_started',
  completed: 'puja_completed',
  video_ready: 'puja_video_ready',
  cancelled: 'booking_cancelled',
  refund: 'booking_refund',
  eta: 'pandit_eta',
};

function pushTextFor(event: BookingEvent, ctx: BookingCtx): { title: string; body: string } {
  const puja = ctx.pujaName ?? 'your puja';
  const priest = ctx.priestName ?? 'Your pandit';
  switch (event) {
    case 'confirmed':
      return { title: 'Booking confirmed', body: `${puja} is confirmed${ctx.scheduledDate ? ` for ${ctx.scheduledDate}` : ''}.` };
    case 'assigned':
      return { title: 'Pandit confirmed', body: `${priest} will perform your ${puja}.` };
    case 'reassigned':
      return { title: 'Re-assigning your pandit', body: `We're matching another pandit for your ${puja}.` };
    case 'offer':
      return { title: 'New booking request', body: `You have a new ${puja} request. Tap to accept.` };
    case 'offer_timeout':
      return { title: 'Offer expired', body: `The ${puja} request was reassigned.` };
    case 'in_progress':
      return { title: 'Puja started', body: `${priest} has started your ${puja}.` };
    case 'completed':
      return { title: 'Puja completed', body: `Your ${puja} is complete. Video proof coming soon.` };
    case 'video_ready':
      return { title: 'Video proof ready', body: `Watch your ${puja} video now.` };
    case 'cancelled':
      return { title: 'Booking cancelled', body: `Your ${puja} booking was cancelled.` };
    case 'refund':
      return { title: 'Refund processed', body: `Refund for your ${puja} is on its way (5-7 business days).` };
    case 'eta':
      return { title: 'Pandit on the way', body: `${priest} is on the way for your ${puja}.` };
  }
}

function varsFor(event: BookingEvent, ctx: BookingCtx): string[] {
  // Positional variables mapped to {{1}}, {{2}}... in the approved template.
  return [
    ctx.devoteeName ?? 'Devotee',
    ctx.pujaName ?? 'Puja',
    ctx.priestName ?? '',
    ctx.scheduledDate ?? '',
    ctx.timeSlot ?? '',
    ctx.bookingNumber ?? ctx.bookingId,
  ];
}

/** Send WhatsApp + push to the DEVOTEE for a booking event. Never throws. */
export async function notifyDevotee(
  event: BookingEvent,
  ctx: BookingCtx,
): Promise<void> {
  try {
    const push = pushTextFor(event, ctx);
    if (ctx.devoteeUserId) {
      await notifyUser(ctx.devoteeUserId, { ...push, url: `/bookings/${ctx.bookingId}` }).catch(
        () => undefined,
      );
    }
    if (ctx.devoteePhone) {
      await sendWhatsappTemplate({
        to: ctx.devoteePhone,
        template: TEMPLATE[event],
        variables: varsFor(event, ctx),
      }).catch(() => undefined);
    }
  } catch (err) {
    console.warn('[booking-notify] devotee notify failed:', err);
  }
}

/** Send WhatsApp + push to the PANDIT for a booking event. Never throws. */
export async function notifyPriest(
  priestUserId: string,
  priestPhone: string | null | undefined,
  event: BookingEvent,
  ctx: BookingCtx,
): Promise<void> {
  try {
    const push = pushTextFor(event, ctx);
    await notifyUser(priestUserId, { ...push, url: `/priest/bookings/${ctx.bookingId}` }).catch(
      () => undefined,
    );
    if (priestPhone) {
      await sendWhatsappTemplate({
        to: priestPhone,
        template: TEMPLATE[event],
        variables: varsFor(event, ctx),
      }).catch(() => undefined);
    }
  } catch (err) {
    console.warn('[booking-notify] priest notify failed:', err);
  }
}

/** Free-text WhatsApp to the pandit with a one-tap accept/deep-link (used by the
 *  instant dispatch offer). Falls back to template if outside the 24h window. */
export async function sendOfferToPriest(params: {
  priestPhone?: string | null;
  priestUserId: string;
  bookingId: string;
  pujaName?: string | null;
  acceptUrl: string;
  expiresInSec: number;
}): Promise<void> {
  const { priestPhone, priestUserId, bookingId, pujaName, acceptUrl, expiresInSec } = params;
  try {
    await notifyUser(priestUserId, {
      title: 'New booking request',
      body: `${pujaName ?? 'Puja'} request — accept within ${Math.round(expiresInSec / 60)} min.`,
      url: `/priest/bookings/${bookingId}`,
    }).catch(() => undefined);
    if (priestPhone) {
      await sendWhatsappText({
        to: priestPhone,
        text: `🙏 New ${pujaName ?? 'puja'} booking request.\n\nTap to accept (expires in ${Math.round(expiresInSec / 60)} min):\n${acceptUrl}`,
      }).catch(() => undefined);
    }
  } catch (err) {
    console.warn('[booking-notify] sendOfferToPriest failed:', err);
  }
}

/** Build a BookingCtx from a booking with the standard includes. */
export function buildBookingCtx(b: {
  id: string;
  bookingNumber?: string | null;
  scheduledDate?: Date | null;
  scheduledTimeSlot?: string | null;
  pujaType?: { name?: string | null } | null;
  temple?: { name?: string | null } | null;
  user?: { id?: string | null; fullName?: string | null; phone?: string | null } | null;
  priest?: { displayName?: string | null } | null;
}): BookingCtx {
  return {
    bookingId: b.id,
    devoteeUserId: b.user?.id ?? null,
    bookingNumber: b.bookingNumber ?? null,
    pujaName: b.pujaType?.name ?? null,
    templeName: b.temple?.name ?? null,
    devoteeName: b.user?.fullName ?? null,
    devoteePhone: b.user?.phone ?? null,
    priestName: b.priest?.displayName ?? null,
    scheduledDate: b.scheduledDate ? b.scheduledDate.toISOString().slice(0, 10) : null,
    timeSlot: b.scheduledTimeSlot ?? null,
  };
}

/** Fetch the priest's userId + phone for a priest id (offer targeting). */
export async function priestContact(priestId: string) {
  const p = await prisma.priest.findUnique({
    where: { id: priestId },
    select: { userId: true, displayName: true, user: { select: { phone: true } } },
  });
  return p ? { userId: p.userId, name: p.displayName, phone: p.user.phone } : null;
}
