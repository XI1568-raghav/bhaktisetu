/**
 * booking-notify.service.ts — WhatsApp + push + email notifications for the
 * puja booking lifecycle.
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
 *
 * RV-18 / RV-19 (2026-08-10): this file also owns the two BOOKING EMAILS that
 * had no working path to the devotee, because a booking notification is one
 * fan-out across every channel we have, not three unrelated code paths that
 * each miss a different cohort. Before this, the channels had disjoint holes:
 * cancellation fired push+WhatsApp and no email, the refund fired email and no
 * push/WhatsApp, and the confirmation email was dead code — so there was no
 * single channel on which a devotee reliably learned what happened to their
 * booking, and a phone-OTP devotee (null User.email — the exact cohort the
 * WhatsApp-first GTM targets) learned nothing at all.
 */

import { sendWhatsappTemplate, sendWhatsappText } from '../lib/whatsapp.js';
import { notifyUser } from '../routes/notifications.js';
import { prisma } from '../lib/prisma.js';
import { sendEmail, bookingConfirmationEmail } from '../lib/email.js';
import { parseSlotMinutes } from '../lib/slot-time.js';

export interface BookingCtx {
  bookingId: string;
  devoteeUserId?: string | null;
  bookingNumber?: string | null;
  pujaName?: string | null;
  templeName?: string | null;
  devoteeName?: string | null;
  devoteePhone?: string | null;
  devoteeEmail?: string | null;
  priestName?: string | null;
  scheduledDate?: string | null;
  timeSlot?: string | null;
  /**
   * Money as a DISPLAY value. Pass a Prisma.Decimal through `.toString()` —
   * never `Number(decimal)` — so the rupee/paisa figure the devotee is shown is
   * exactly the stored one.
   */
  amountInr?: number | string | null;
}

/** Indian-grouped rupee string built from the decimal text, never via float. */
function formatInr(amount: number | string | null | undefined): string | null {
  if (amount === null || amount === undefined || amount === '') return null;
  const [intPart = '0', fracPart = ''] = String(amount).split('.');
  const digits = intPart.replace(/^-/, '');
  const negative = intPart.startsWith('-');
  // Integer rupees are far inside the safe-integer range, so grouping via
  // toLocaleString cannot lose a paisa; the fractional half is carried as text.
  const grouped = Number(digits || '0').toLocaleString('en-IN');
  // Paisa are shown only when non-zero, but then always as TWO digits: a
  // Decimal(10,2) of "1100.50" must read ₹1,100.50, never ₹1,100.5.
  const trimmed = fracPart.replace(/0+$/, '');
  const frac = trimmed ? trimmed.slice(0, 2).padEnd(2, '0') : '';
  return `${negative ? '-' : ''}₹${grouped}${frac ? `.${frac}` : ''}`;
}

/**
 * Render a booking's stored DATE column for a human.
 *
 * `scheduledDate` is a DATE (see lib/slot-time.ts): it arrives as UTC midnight,
 * so it MUST be formatted in UTC — formatting in any negative-offset zone would
 * print the previous calendar day and tell the devotee the wrong date.
 */
function formatBookingDate(date: Date | null | undefined): string {
  if (!date) return 'To be confirmed';
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

/** Render the IST slot as a friendly clock time, falling back to the raw label. */
function formatSlot(slot: string | null | undefined): string {
  if (!slot) return 'To be confirmed';
  const minutes = parseSlotMinutes(slot);
  if (minutes === null) return slot;
  const h24 = Math.floor(minutes / 60);
  const mm = String(minutes % 60).padStart(2, '0');
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix} IST`;
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
    case 'refund': {
      // RV-19: name the amount. A devotee who cannot see what came back is the
      // devotee who files a chargeback on a refund that was already issued.
      const amount = formatInr(ctx.amountInr);
      return {
        title: 'Refund processed',
        body: amount
          ? `${amount} refunded for your ${puja} — it reaches your account in 5-7 business days.`
          : `Refund for your ${puja} is on its way (5-7 business days).`,
      };
    }
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
    // RV-18 (2026-08-10): the confirmation email rides the SAME event the
    // payment path already fires, so the devotee finally gets the schedule in
    // writing without a new call site having to be remembered anywhere. The
    // send re-reads the booking by id rather than trusting the ctx, because the
    // callers' `include` blocks do not select User.email.
    if (event === 'confirmed') {
      await sendBookingConfirmationEmail(ctx.bookingId).catch(() => undefined);
    }
  } catch (err) {
    console.warn('[booking-notify] devotee notify failed:', err);
  }
}

/**
 * RV-18 (2026-08-10): send the human booking confirmation — date, time, temple,
 * pandit, booking number — to the devotee.
 *
 * This is NOT the tax invoice (payment.service.sendPujaBookingInvoice). The
 * invoice PDF's `puja_booking` variant renders createdAt as the invoice date and
 * has no scheduled-date/slot field at all, so before this a paying devotee was
 * never told in writing WHEN their puja would be performed.
 *
 * Best-effort by contract: returns a result, never throws, and never blocks a
 * captured payment. `{ sent: false, reason: 'no-email' }` is the normal outcome
 * for a phone-OTP devotee — that cohort is served by the push + WhatsApp legs of
 * notifyDevotee('confirmed').
 */
export async function sendBookingConfirmationEmail(
  bookingId: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const b = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        bookingNumber: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        priceAmount: true,
        user: { select: { fullName: true, email: true } },
        temple: { select: { name: true } },
        pujaType: { select: { name: true } },
        priest: { select: { displayName: true } },
      },
    });
    if (!b) return { sent: false, reason: 'booking-not-found' };
    if (!b.user?.email) return { sent: false, reason: 'no-email' };

    const { subject, html, text } = bookingConfirmationEmail({
      devoteeName: b.user.fullName ?? 'Devotee',
      pujaName: b.pujaType?.name ?? 'Puja',
      templeName: b.temple?.name ?? 'Darshya',
      scheduledDate: formatBookingDate(b.scheduledDate),
      scheduledTimeSlot: formatSlot(b.scheduledTimeSlot),
      bookingNumber: b.bookingNumber,
      // Decimal -> string, never Number(): the devotee is shown the stored figure.
      amount: formatInr(b.priceAmount?.toString()) ?? '—',
      priestName: b.priest?.displayName ?? null,
    });
    const res = await sendEmail({ to: b.user.email, subject, html, text });
    return { sent: res.ok, reason: res.ok ? undefined : (res.skipped ? 'email-disabled' : res.error) };
  } catch (err) {
    console.warn('[booking-notify] sendBookingConfirmationEmail failed:', err);
    return { sent: false, reason: 'error' };
  }
}

/**
 * RV-19 (2026-08-10): announce a PROCESSED REFUND on push + WhatsApp.
 *
 * The 'refund' event was declared here, mapped to a template and given push
 * copy — and never fired from anywhere in the repo. The only refund notice was
 * refund.service's sendEmail, gated twice (on the nullable User.email, then on
 * RESEND_API_KEY), so a phone-only devotee was told nothing on any channel when
 * their money went back. Worst on the cron auto-refund path, which runs an hour
 * after cancellation with no user-initiated trigger at all.
 *
 * DELIBERATELY DOES NOT SEND EMAIL: refund.service.processRefund already sends
 * refundSuccessEmail for devotees who have one. This function is the missing
 * half — the channels that reach everyone else — so wiring it in is purely
 * additive and cannot produce a duplicate email.
 *
 * Never throws; safe to call after the refund transaction has committed.
 */
export async function notifyRefundProcessed(params: {
  bookingId: string;
  /** Refunded amount. Pass a Prisma.Decimal via `.toString()`, not Number(). */
  amountInr?: number | string | null;
}): Promise<void> {
  try {
    const b = await prisma.pujaBooking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        user: { select: { id: true, fullName: true, phone: true } },
        temple: { select: { name: true } },
        pujaType: { select: { name: true } },
        priest: { select: { displayName: true } },
      },
    });
    if (!b) return;
    await notifyDevotee('refund', {
      ...buildBookingCtx(b),
      amountInr: params.amountInr ?? null,
    });
  } catch (err) {
    console.warn('[booking-notify] notifyRefundProcessed failed:', err);
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
  user?: { id?: string | null; fullName?: string | null; phone?: string | null; email?: string | null } | null;
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
    devoteeEmail: b.user?.email ?? null,
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
