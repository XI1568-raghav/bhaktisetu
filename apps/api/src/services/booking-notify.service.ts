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
import { deliverOrQueue } from '../lib/email-outbox.js';
import {
  sendEmail,
  bookingConfirmationEmail,
  videoReadyEmail,
  refundProcessedEmail,
  bookingCancelledEmail,
  panditAssignedEmail,
} from '../lib/email.js';
import { parseSlotMinutes } from '../lib/slot-time.js';
import { REFUND_DAYS_LABEL } from '../lib/refund-timing.js';
import { recordNotification } from '../lib/notification-log.js';

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

/**
 * NOTIF-06 (2026-08-12): 'eta' is GONE.
 *
 * It was declared here, mapped to the `pandit_eta` WhatsApp template and given
 * push copy ("Pandit on the way"), and no code path anywhere produced it —
 * there is no day-of trigger in the repo. A declared event with no producer
 * reads as shipped policy that was not shipped: it inflates the 11-template
 * Meta approval effort tracked in TASKS.md and tells the next reader that
 * devotees get an on-the-way notice they have never received. Deleted rather
 * than left as a promise the product does not keep; re-add it together with the
 * trigger that fires it.
 */
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
  | 'refund'; // refund processed

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
          ? `${amount} refunded for your ${puja} — it reaches your account in ${REFUND_DAYS_LABEL} (international cards can take longer).`
          : `Refund for your ${puja} is on its way (${REFUND_DAYS_LABEL}; international cards can take longer).`,
      };
    }
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

/**
 * What actually happened on one channel.
 *
 *   sent      — the transport accepted the message.
 *   skipped   — the channel is UNCONFIGURED (no Resend key, no WhatsApp BSP
 *               credentials, no VAPID keys, or no stored push subscription).
 *               Every integration here is env-or-noop by convention, so this is
 *               the normal outcome today — see NOTIF-03, owner-gated.
 *   failed    — the channel is configured and rejected or errored.
 *   no-target — we had no address for this devotee on this channel at all.
 *
 * `skipped` is deliberately NOT folded into `sent`. That conflation is what
 * NOTIF-03 measured on the diagnostic endpoint (`{ok:true, sent:0}`) and it is
 * why a paying devotee hearing nothing looked green to an operator.
 */
export type ChannelOutcome = 'sent' | 'skipped' | 'failed' | 'no-target';

export interface NotifyOutcome {
  event: BookingEvent;
  bookingId: string;
  push: ChannelOutcome;
  whatsapp: ChannelOutcome;
  email: ChannelOutcome;
  /** True only when at least one channel actually accepted the message. */
  delivered: boolean;
}

export interface NotifyDevoteeOptions {
  /**
   * The caller has ALREADY DELIVERED this event's email itself — not merely
   * attempted it. Used by refund.service.processRefund, which has its own
   * refundSuccessEmail, so wiring the fan-out in cannot produce a duplicate.
   *
   * Callers must set this from the transport's actual result (`res.ok`), never
   * from "I called sendEmail": with RESEND_API_KEY unset sendEmail returns
   * {ok:false, skipped:true}, and passing true there would both suppress this
   * function's fallback email and book a delivery that never happened.
   */
  emailAlreadySent?: boolean;
}

/** Map a lib SendResult ({ok, skipped}) onto a ChannelOutcome. */
function outcomeOfSend(res: { ok: boolean; skipped?: boolean } | undefined): ChannelOutcome {
  if (!res) return 'failed';
  if (res.ok) return 'sent';
  return res.skipped ? 'skipped' : 'failed';
}

/**
 * Make every attempt durable, and a devotee who heard NOTHING loud.
 *
 * Two records, deliberately:
 *
 *  - a `notification_log` ROW (NOTIF-14). Before this nothing persisted the
 *    result of any send, so a devotee who missed a push had no history to look
 *    at, support could not answer "did the confirmation go out?" for any
 *    booking, and no retry was possible because nothing knew a send had failed.
 *  - a structured stdout line with a stable, greppable marker for the
 *    undelivered case — the same convention the ledger uses for
 *    `[ledger-manual-review]`. It survives the log table being unavailable,
 *    which is exactly when you most want it.
 *
 * Fire-and-forget by contract: the write is awaited only far enough to swallow
 * its own failure. A logging problem must never break a booking flow.
 */
async function reportOutcome(
  outcome: NotifyOutcome,
  meta: {
    audience: 'devotee' | 'priest';
    userId?: string | null;
    title: string;
    body: string;
    url?: string | null;
  },
): Promise<NotifyOutcome> {
  if (!outcome.delivered) {
    console.warn(
      `[booking-notify][UNDELIVERED][${meta.audience}]`,
      JSON.stringify({
        bookingId: outcome.bookingId,
        event: outcome.event,
        push: outcome.push,
        whatsapp: outcome.whatsapp,
        email: outcome.email,
      }),
    );
  }
  try {
    await recordNotification({
      userId: meta.userId ?? null,
      audience: meta.audience,
      event: outcome.event,
      bookingId: outcome.bookingId,
      title: meta.title,
      body: meta.body,
      url: meta.url ?? null,
      push: outcome.push,
      whatsapp: outcome.whatsapp,
      email: outcome.email,
      delivered: outcome.delivered,
    });
  } catch (err) {
    console.warn('[booking-notify] notification log write failed:', err);
  }
  return outcome;
}

/** The undelivered-on-every-channel record, for the paths that bail early. */
async function missOutcome(
  event: BookingEvent,
  bookingId: string,
  audience: 'devotee' | 'priest' = 'devotee',
): Promise<NotifyOutcome> {
  return reportOutcome(
    {
      event,
      bookingId,
      push: 'no-target',
      whatsapp: 'no-target',
      email: 'no-target',
      delivered: false,
    },
    { audience, title: '', body: '' },
  );
}

/**
 * The email leg, per event. Returns 'no-target' for events that carry no email
 * by design (a pandit-assignment does not warrant one).
 */
async function emailLegFor(
  event: BookingEvent,
  ctx: BookingCtx,
  opts: NotifyDevoteeOptions,
): Promise<ChannelOutcome> {
  // The caller delivered it. Counts as a real delivery — the devotee was
  // reached in writing — so this event must NOT be reported as undelivered.
  if (opts.emailAlreadySent) return 'sent';
  switch (event) {
    case 'confirmed': {
      // RV-18 (2026-08-10): the confirmation email rides the SAME event the
      // payment path already fires, so the devotee finally gets the schedule in
      // writing without a new call site having to be remembered anywhere. The
      // send re-reads the booking by id rather than trusting the ctx, because
      // the callers' `include` blocks do not select User.email.
      const res = await sendBookingConfirmationEmail(ctx.bookingId);
      if (res.sent) return 'sent';
      if (res.reason === 'no-email') return 'no-target';
      return res.reason === 'email-disabled' ? 'skipped' : 'failed';
    }
    case 'video_ready':
      return sendCtxEmail(
        ctx,
        videoReadyEmail({
          devoteeName: ctx.devoteeName ?? 'Devotee',
          pujaName: ctx.pujaName ?? 'Puja',
          templeName: ctx.templeName ?? 'Darshya',
          bookingNumber: ctx.bookingNumber ?? ctx.bookingId,
          // Deep-link to the booking page, never the raw storage URL — the
          // proof object is served through the authorised route.
          videoUrl: `https://darshya.online/bookings/${encodeURIComponent(
            ctx.bookingNumber ?? ctx.bookingId,
          )}`,
          priestName: ctx.priestName,
          performedOn: ctx.scheduledDate,
        }),
      );
    case 'refund':
      return sendCtxEmail(
        ctx,
        refundProcessedEmail({
          devoteeName: ctx.devoteeName ?? 'Devotee',
          pujaName: ctx.pujaName ?? 'Puja',
          templeName: ctx.templeName ?? 'Darshya',
          bookingNumber: ctx.bookingNumber ?? ctx.bookingId,
          amount: formatInr(ctx.amountInr),
        }),
      );
    case 'cancelled':
    case 'assigned': {
      // Slice L: neither had an email leg. The callers' selects often omit User.email
      // (bookings route cancel, dispatch), so re-read it by booking id.
      const withEmail = ctx.devoteeEmail ? ctx : await ctxWithEmail(ctx);
      if (event === 'cancelled') {
        return sendCtxEmail(
          withEmail,
          bookingCancelledEmail({
            devoteeName: withEmail.devoteeName ?? 'Devotee',
            pujaName: withEmail.pujaName ?? 'Puja',
            templeName: withEmail.templeName ?? 'Darshya',
            bookingNumber: withEmail.bookingNumber ?? 'your booking',
          }),
        );
      }
      return sendCtxEmail(
        withEmail,
        panditAssignedEmail({
          devoteeName: withEmail.devoteeName ?? 'Devotee',
          pujaName: withEmail.pujaName ?? 'Puja',
          templeName: withEmail.templeName ?? 'Darshya',
          bookingNumber: withEmail.bookingNumber ?? 'your booking',
          priestName: withEmail.priestName,
          scheduledDate: withEmail.scheduledDate,
        }),
      );
    }
    default:
      return 'no-target';
  }
}

async function ctxWithEmail(ctx: BookingCtx): Promise<BookingCtx> {
  try {
    const b = await prisma.pujaBooking.findUnique({
      where: { id: ctx.bookingId },
      select: { user: { select: { email: true, fullName: true } } },
    });
    return { ...ctx, devoteeEmail: b?.user?.email ?? null, devoteeName: ctx.devoteeName ?? b?.user?.fullName ?? null };
  } catch {
    return ctx;
  }
}

/** Send a prebuilt template to ctx.devoteeEmail. Never throws. */
async function sendCtxEmail(
  ctx: BookingCtx,
  tpl: { subject: string; html: string; text: string },
): Promise<ChannelOutcome> {
  if (!ctx.devoteeEmail) return 'no-target';
  try {
    return outcomeOfSend(await sendEmail({ to: ctx.devoteeEmail, ...tpl }));
  } catch {
    return 'failed';
  }
}

/**
 * Send WhatsApp + push (+ email, where the event carries one) to the DEVOTEE.
 *
 * Never throws — a notification must never break a booking flow. Returns a
 * per-channel report instead of swallowing the result, because the honest
 * answer to "was the devotee told?" is the whole point of NOTIF-04.
 */
export async function notifyDevotee(
  event: BookingEvent,
  ctx: BookingCtx,
  opts: NotifyDevoteeOptions = {},
): Promise<NotifyOutcome> {
  let push: ChannelOutcome = 'no-target';
  let whatsapp: ChannelOutcome = 'no-target';
  let email: ChannelOutcome = 'no-target';
  const text = pushTextFor(event, ctx);
  const url = `/bookings/${ctx.bookingId}`;

  try {
    if (ctx.devoteeUserId) {
      // notifyUser returns the number of subscriptions that actually accepted
      // the push. Zero means VAPID is unset or the devotee has no live
      // subscription — a skip, never a delivery.
      // NOTIF-14: `record: false` — this function writes its own three-channel
      // row below (push + WhatsApp + email in ONE entry). Letting notifyUser log
      // as well would put two items in the devotee's notification centre for a
      // single booking event, one of them describing only the push leg.
      push = await notifyUser(ctx.devoteeUserId, { ...text, url }, { record: false }).then(
        (n) => (typeof n === 'number' && n > 0 ? 'sent' : 'skipped'),
        () => 'failed' as ChannelOutcome,
      );
    }
    if (ctx.devoteePhone) {
      whatsapp = await sendWhatsappTemplate({
        to: ctx.devoteePhone,
        template: TEMPLATE[event],
        variables: varsFor(event, ctx),
      }).then(outcomeOfSend, () => 'failed' as ChannelOutcome);
    }
    email = await emailLegFor(event, ctx, opts);
  } catch (err) {
    console.warn('[booking-notify] devotee notify failed:', err);
  }

  return reportOutcome(
    {
      event,
      bookingId: ctx.bookingId,
      push,
      whatsapp,
      email,
      delivered: push === 'sent' || whatsapp === 'sent' || email === 'sent',
    },
    { audience: 'devotee', userId: ctx.devoteeUserId, title: text.title, body: text.body, url },
  );
}

/**
 * RV-18 (2026-08-10): send the human booking confirmation — date, time, temple,
 * pandit, booking number — to the devotee.
 *
 * This is NOT the payment receipt (payment.service.sendPujaBookingInvoice). The
 * invoice PDF's `puja_booking` variant renders createdAt as the invoice date and
 * has no scheduled-date/slot field at all, so before this a paying devotee was
 * never told in writing WHEN their puja would be performed.
 *
 * Best-effort by contract: returns a result, never throws, and never blocks a
 * captured payment. `{ sent: false, reason: 'no-email' }` is the normal outcome
 * for a phone-OTP devotee — that cohort is served by the push + WhatsApp legs of
 * notifyDevotee('confirmed').
 */
type ConfirmationMail = { to: string; subject: string; html: string; text: string };

async function loadBookingConfirmation(
  bookingId: string,
): Promise<{ mail: ConfirmationMail } | { reason: 'booking-not-found' | 'no-email' }> {
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
  if (!b) return { reason: 'booking-not-found' };
  if (!b.user?.email) return { reason: 'no-email' };
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
  return { mail: { to: b.user.email, subject, html, text } };
}

/** The confirmation email rebuilt from the booking id (used by the outbox retry job). */
export async function composeBookingConfirmationMail(bookingId: string): Promise<ConfirmationMail | null> {
  const r = await loadBookingConfirmation(bookingId);
  return 'mail' in r ? r.mail : null;
}

export async function sendBookingConfirmationEmail(
  bookingId: string,
): Promise<{ sent: boolean; reason?: string }> {
  try {
    const loaded = await loadBookingConfirmation(bookingId);
    if (!('mail' in loaded)) return { sent: false, reason: loaded.reason };
    // Inline attempt, then the email outbox retries a failure (lib/email-outbox.ts).
    const res = await deliverOrQueue(loaded.mail, { kind: 'booking_confirmation', refId: bookingId });
    return { sent: res.sent, reason: res.sent ? undefined : (res.skipped ? 'email-disabled' : res.error) };
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
 * WIRED 2026-08-12 (NOTIF-04) into BOTH refund rails, immediately after each
 * one's transaction commits:
 *   refund.service.processRefund   — devotee-initiated + the cron auto-refund
 *   payment.service.processRefund  — the admin rail
 *
 * EMAIL IS CONDITIONAL, not absent. refund.service has its own local
 * refundSuccessEmail and passes `emailAlreadySent: true`, so that rail cannot
 * double-email. The admin rail sends nothing of its own, so there this function
 * owns the written notice too.
 *
 * Never throws; safe to call after the refund transaction has committed.
 */
export async function notifyRefundProcessed(params: {
  bookingId: string;
  /** Refunded amount. Pass a Prisma.Decimal via `.toString()`, not Number(). */
  amountInr?: number | string | null;
  /** The caller already emailed the devotee — suppress this function's email leg. */
  emailAlreadySent?: boolean;
}): Promise<NotifyOutcome> {
  const miss = (): Promise<NotifyOutcome> => missOutcome('refund', params.bookingId);
  try {
    const b = await prisma.pujaBooking.findUnique({
      where: { id: params.bookingId },
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        temple: { select: { name: true } },
        pujaType: { select: { name: true } },
        priest: { select: { displayName: true } },
      },
    });
    if (!b) return miss();
    return await notifyDevotee(
      'refund',
      { ...buildBookingCtx(b), amountInr: params.amountInr ?? null },
      { emailAlreadySent: params.emailAlreadySent === true },
    );
  } catch (err) {
    console.warn('[booking-notify] notifyRefundProcessed failed:', err);
    return miss();
  }
}

/**
 * NOTIF-05 (2026-08-12): announce a READY VIDEO PROOF on push + WhatsApp + email.
 *
 * Video proof is business rule #1 and the entire justification for 9-10x NRI
 * pricing, and we promise its delivery in writing in two places:
 *   lib/email.ts (bookingConfirmationEmail) — "You'll receive an email when the
 *     recording is ready."
 *   apps/web /nri-pujas — "a 3-7 minute video clip arrives on WhatsApp".
 * Neither was implemented. The BookingEvent 'video_ready' and its template
 * 'puja_video_ready' were declared here and passed to notifyDevotee from
 * nowhere; the only thing that fired was a web-push, which needs a desktop
 * browser with granted permission — essentially nobody in the NRI cohort. They
 * could not know the puja had happened until they logged in and looked.
 *
 * Called from BOTH paths that set `video_uploaded` (booking.service's
 * uploadVideoProof and updateBookingStatus). Re-reads the booking by id rather
 * than trusting a ctx, because neither caller's select carries User.email.
 *
 * Never throws; safe to call fire-and-forget once the proof is stored.
 */
export async function notifyVideoReady(bookingId: string): Promise<NotifyOutcome> {
  return notifyBookingEvent(bookingId, 'video_ready');
}

/**
 * NOTIF-06 (2026-08-14): fan out ANY lifecycle event from a booking id alone.
 *
 * The generic form of notifyVideoReady, and for the same reason: the only
 * caller that knows a transition happened is booking.service's
 * `updateBookingStatus`, whose `BOOKING_STATUS_RESPONSE_INCLUDE` selects
 * `user: { select: { id: true } }` — no phone, no email. Building a ctx from
 * that row would silently produce `devoteePhone: null` and
 * `devoteeEmail: null`, i.e. a fan-out whose WhatsApp and email legs are both
 * 'no-target' by construction: notifications that look wired and reach a
 * phone-OTP devotee on no channel at all. Re-reading with the right select is
 * the difference between "sent" and "sent nowhere".
 *
 * Used for the three transitions that reached a devotee on nothing (or on a
 * browser push only): `in_progress`, `completed` and the service-side
 * `cancelled`. Their WhatsApp templates (puja_started, puja_completed,
 * booking_cancelled) and push copy were already written and unreachable.
 *
 * Never throws; safe to call fire-and-forget after the status flip commits.
 */
export async function notifyBookingEvent(
  bookingId: string,
  event: BookingEvent,
): Promise<NotifyOutcome> {
  const miss = (): Promise<NotifyOutcome> => missOutcome(event, bookingId);
  try {
    const b = await prisma.pujaBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        bookingNumber: true,
        scheduledDate: true,
        scheduledTimeSlot: true,
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        temple: { select: { name: true } },
        pujaType: { select: { name: true } },
        priest: { select: { displayName: true } },
      },
    });
    if (!b) return miss();
    return await notifyDevotee(event, buildBookingCtx(b));
  } catch (err) {
    console.warn(`[booking-notify] notifyBookingEvent(${event}) failed:`, err);
    return miss();
  }
}

/**
 * Send WhatsApp + push to the PANDIT for a booking event. Never throws.
 *
 * NOTIF-06 (2026-08-12): this had ZERO call sites — not even a test — so a
 * pandit was never notified of anything after the initial dispatch offer: not
 * that his offer expired, not that the booking was reassigned away from him.
 * Wired into dispatch.service's offer sweep, where an expiry is actually known.
 *
 * It also discarded both channel results (`.catch(() => undefined)` on each leg,
 * `Promise<void>` out), so "was the pandit told?" had no answer anywhere. It now
 * returns the same per-channel NotifyOutcome as notifyDevotee and persists the
 * attempt — `skipped` (channel unconfigured) stays distinct from `sent`.
 */
export async function notifyPriest(
  priestUserId: string,
  priestPhone: string | null | undefined,
  event: BookingEvent,
  ctx: BookingCtx,
): Promise<NotifyOutcome> {
  let push: ChannelOutcome = 'no-target';
  let whatsapp: ChannelOutcome = 'no-target';
  const text = pushTextFor(event, ctx);
  const url = `/priest/bookings/${ctx.bookingId}`;
  try {
    // NOTIF-14: same reason as the devotee leg — the combined row is written
    // below with audience 'priest'.
    push = await notifyUser(priestUserId, { ...text, url }, { record: false }).then(
      (n) => (typeof n === 'number' && n > 0 ? 'sent' : 'skipped'),
      () => 'failed' as ChannelOutcome,
    );
    if (priestPhone) {
      whatsapp = await sendWhatsappTemplate({
        to: priestPhone,
        template: TEMPLATE[event],
        variables: varsFor(event, ctx),
      }).then(outcomeOfSend, () => 'failed' as ChannelOutcome);
    }
  } catch (err) {
    console.warn('[booking-notify] priest notify failed:', err);
  }
  return reportOutcome(
    {
      event,
      bookingId: ctx.bookingId,
      push,
      whatsapp,
      // A pandit-facing event carries no email by design.
      email: 'no-target',
      delivered: push === 'sent' || whatsapp === 'sent',
    },
    { audience: 'priest', userId: priestUserId, title: text.title, body: text.body, url },
  );
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
    await notifyUser(
      priestUserId,
      {
        title: 'New booking request',
        body: `${pujaName ?? 'Puja'} request — accept within ${Math.round(expiresInSec / 60)} min.`,
        url: `/priest/bookings/${bookingId}`,
      },
      // NOTIF-14: this one DOES record — it writes no row of its own, and the
      // dispatch offer is exactly the event an operator gets asked about
      // ("was the pandit ever told?").
      { event: 'dispatch_offer', audience: 'priest', bookingId },
    ).catch(() => undefined);
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
