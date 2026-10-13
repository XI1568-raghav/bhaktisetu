import { Resend } from 'resend';
import { esc } from './html-escape.js';
import { REFUND_DAYS_LABEL, REFUND_INTERNATIONAL_CARD_LABEL } from './refund-timing.js';

/**
 * Single source of truth for transactional email.
 * - Active when RESEND_API_KEY is set; otherwise sendEmail() resolves to
 *   `{ skipped: true }` and the rest of the app continues normally
 *   (useful for demo / local without a key).
 * - FROM_EMAIL defaults to no-reply@darshya.online; change in env if your
 *   verified Resend domain is different.
 */
const apiKey = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? 'Darshya <no-reply@darshya.online>';
const REPLY_TO = process.env.RESEND_REPLY_TO ?? 'support@darshya.online';

const resend = apiKey ? new Resend(apiKey) : null;

/**
 * NOTIF-03: whether this channel can actually deliver.
 *
 * The other three transports (`whatsapp`, `webPushConfig`, `fcmConfig`) each
 * already export an `enabled` flag; email was the one that did not, so nothing
 * could ask "is mail configured?" without reaching into `process.env` a second
 * time and re-deriving the answer. `/health/channels` reads all four.
 */
export const emailConfig = { enabled: !!apiKey, from: FROM_EMAIL };

/**
 * SCAL-11: which allowance this mail is allowed to spend.
 *
 * `transactional` — a receipt, an 80G donation certificate, a password reset, a
 * booking confirmation. Someone is waiting for it and there is no second copy.
 * `bulk` — the weekly digest, drip and marketing. Valuable, but a day late is
 * not a broken promise.
 */
export type EmailKind = 'transactional' | 'bulk';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string }[];
  /** Defaults to `transactional` — an unlabelled mail is never yielded. */
  kind?: EmailKind;
  /**
   * Resend `Idempotency-Key`: the same key within 24h returns the original
   * response instead of sending again. The email outbox sets it so an inline
   * send that timed out but was delivered is never duplicated by its retry.
   */
  idempotencyKey?: string;
}

interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
  /** SCAL-11: true when the provider refused because the daily budget is gone. */
  rateLimited?: boolean;
  /**
   * SCAL-11: a BULK mail we declined to send so the day's remaining allowance
   * stays available for receipts and password resets. Nothing was attempted and
   * nothing is charged — the caller should retry on a later day rather than
   * record a delivery.
   */
  deferred?: boolean;
}

// ─── SCAL-11: daily send budget ────────────────────────────────────────────
//
// Resend free is 100 emails/day (3,000/mo). docs/free-tier-budgets.md does the
// arithmetic: at ~3 mails per signup that is ~33 signups a day, and the same
// allowance has to cover welcome mails, booking receipts, 80G donation
// receipts, password resets and referral notifications. It is the FIRST hard
// business cap this platform hits — well before storage or rows.
//
// Before this, hitting it was silent: Resend answers 429, the catch below
// folded it into an anonymous `{ ok:false, error }`, and no caller checks the
// result. On the day a temple partnership lands, devotee number 34 simply
// never receives the receipt that IS her proof of purchase, and the first
// signal is a support ticket accusing the platform of fraud.
//
// So: count every attempt against the UTC day Resend resets on, name a 429 for
// what it is, and announce the threshold BEFORE the cap bites. This does not
// buy headroom — splitting drip/marketing traffic off Resend and budgeting the
// paid tier are business calls — it makes the wall visible while there is
// still time to act.
//
// Caveat, stated rather than hidden: this counter is per PROCESS. Render free
// runs a single always-on API instance today, so it is accurate now; if the
// API is ever scaled out, each instance counts only its own share and the
// warning fires late. A shared counter needs Redis, which SCAL-08 records as
// unconfigured.
const DAILY_CAP = Number(process.env.RESEND_DAILY_CAP ?? 100);
const WARN_AT = Number(process.env.RESEND_DAILY_WARN_AT ?? 70);

/**
 * SCAL-11, second half — how much of the day BULK mail may never touch.
 *
 * Instrumentation makes the wall visible; it does not decide who hits it first,
 * and today that is decided by luck. The weekly digest fans out to every
 * devotee from a single cron tick, so on any Sunday past 100 users it spends
 * the whole day's allowance before a single booking is made. The receipt that
 * IS the devotee's proof of purchase, and the 80G certificate that is a tax
 * document, then come back 429 — silently, because no caller checks.
 *
 * Reserving 30 of 100 for transactional mail is roughly ten signups' worth at
 * the doc's own "~3 mails per signup" arithmetic. It does not create headroom
 * (that is the paid tier, an owner call); it decides who goes without when
 * there is none, and a digest going out a day late is the correct answer to
 * that question.
 */
const BULK_RESERVE = Number(process.env.RESEND_BULK_RESERVE ?? 30);

interface EmailQuotaSnapshot {
  /** UTC calendar day these counters belong to, YYYY-MM-DD. */
  day: string;
  attempted: number;
  sent: number;
  failed: number;
  rateLimited: number;
  cap: number;
  warnAt: number;
}

const quota = {
  day: '',
  attempted: 0,
  sent: 0,
  failed: 0,
  rateLimited: 0,
  warned: false,
  capAnnounced: false,
  bulkDeferAnnounced: false,
};

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}

function rollDay(): void {
  const today = utcDay();
  if (quota.day === today) return;
  quota.day = today;
  quota.attempted = 0;
  quota.sent = 0;
  quota.failed = 0;
  quota.rateLimited = 0;
  quota.warned = false;
  quota.capAnnounced = false;
  quota.bulkDeferAnnounced = false;
}

/** Current day's send counters. Exported for ops surfaces and tests. */
export function getEmailQuotaSnapshot(): EmailQuotaSnapshot {
  rollDay();
  return {
    day: quota.day,
    attempted: quota.attempted,
    sent: quota.sent,
    failed: quota.failed,
    rateLimited: quota.rateLimited,
    cap: DAILY_CAP,
    warnAt: WARN_AT,
  };
}

/** True when the provider's refusal is a quota refusal rather than a bad address. */
function looksRateLimited(error: { message?: string; name?: string; statusCode?: number }): boolean {
  if (error.statusCode === 429) return true;
  return /429|rate limit|too many requests|daily quota|quota exceeded/i.test(
    `${error.name ?? ''} ${error.message ?? ''}`,
  );
}

function announceIfNearCap(): void {
  if (!quota.warned && quota.sent >= WARN_AT) {
    quota.warned = true;
    console.warn(
      `[email][SCAL-11] ${quota.sent}/${DAILY_CAP} Resend sends used on ${quota.day}. ` +
        'Transactional receipts and password resets share this allowance — ' +
        'pause any drip/digest sends now or they will consume the rest.',
    );
  }
  if (!quota.capAnnounced && quota.sent >= DAILY_CAP) {
    quota.capAnnounced = true;
    console.error(
      `[email][SCAL-11] Resend daily cap reached (${quota.sent}/${DAILY_CAP}) on ${quota.day}. ` +
        'Further sends will be refused with 429 — booking receipts and password ' +
        'resets are now failing for real users.',
    );
  }
}

/** The point past which bulk mail must yield to receipts and resets. */
function bulkCeiling(): number {
  return Math.max(0, DAILY_CAP - BULK_RESERVE);
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    // No key configured — nothing was sent, so nothing is charged to the day.
    return { ok: false, skipped: true };
  }
  rollDay();

  // SCAL-11: bulk yields. Checked against `attempted` rather than `sent`
  // because a mail Resend refused still consumed a request against the same
  // daily budget, and a bulk retry storm must not be able to spend the reserve
  // by failing repeatedly.
  if (params.kind === 'bulk' && quota.attempted >= bulkCeiling()) {
    if (!quota.bulkDeferAnnounced) {
      quota.bulkDeferAnnounced = true;
      console.warn(
        `[email][SCAL-11] Bulk mail deferred on ${quota.day}: ${quota.attempted}/${DAILY_CAP} of the ` +
          `Resend day is spent and the last ${BULK_RESERVE} are reserved for receipts, 80G ` +
          'certificates and password resets. The digest will resume on the next day with quota.',
      );
    }
    return {
      ok: false,
      skipped: true,
      deferred: true,
      error: `bulk send deferred — ${quota.attempted}/${DAILY_CAP} used, ${BULK_RESERVE} reserved for transactional mail`,
    };
  }

  quota.attempted += 1;
  try {
    const payload = {
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: REPLY_TO,
      attachments: params.attachments,
    };
    const { data, error } = params.idempotencyKey
      ? await resend.emails.send(payload, { idempotencyKey: params.idempotencyKey })
      : await resend.emails.send(payload);
    if (error) {
      quota.failed += 1;
      const rateLimited = looksRateLimited(error as { message?: string; name?: string });
      if (rateLimited) {
        quota.rateLimited += 1;
        console.error(
          `[email][SCAL-11] Resend refused a send as rate-limited on ${quota.day} ` +
            `(subject: ${params.subject}). This mail was NOT delivered.`,
        );
      }
      return { ok: false, error: error.message, rateLimited };
    }
    quota.sent += 1;
    announceIfNearCap();
    return { ok: true, id: data?.id };
  } catch (err) {
    quota.failed += 1;
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Common templates ──────────────────────────────────────────────────

const baseStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
         background: #fbf7f1; color: #3d2e1f; padding: 0; margin: 0; }
  .container { max-width: 560px; margin: 24px auto; padding: 32px 28px;
               background: white; border-radius: 12px;
               box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
  .brand { font-size: 22px; font-weight: 600; color: #ea580c; margin: 0 0 24px; }
  h1 { font-size: 18px; font-weight: 600; margin: 0 0 16px; }
  p { font-size: 14px; line-height: 1.6; margin: 0 0 12px; }
  .btn { display: inline-block; background: #ea580c; color: white !important;
         padding: 12px 24px; border-radius: 8px; text-decoration: none;
         font-weight: 500; font-size: 14px; margin: 12px 0; }
  .footer { font-size: 11px; color: #999; margin-top: 28px;
            padding-top: 16px; border-top: 1px solid #eee; text-align: center; }
`;

function shell(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body><div class="container"><div class="brand">Darshya</div>${content}
<div class="footer">Darshya · India's Devotional Super App<br>https://darshya.online</div>
</div></body></html>`;
}

export function magicLinkEmail(linkUrl: string): { subject: string; html: string; text: string } {
  return {
    subject: 'Your Darshya sign-in link',
    html: shell(`
      <h1>Sign in to Darshya</h1>
      <p>Click the button below to sign in. The link is valid for 15 minutes and works only once.</p>
      <a class="btn" href="${linkUrl}">Sign in to Darshya</a>
      <p style="font-size:12px;color:#999;">If the button doesn't work, paste this URL into your browser:<br>
      <span style="word-break:break-all;">${linkUrl}</span></p>
      <p style="font-size:12px;color:#999;">If you didn't request this email, you can safely ignore it.</p>
    `),
    text: `Sign in to Darshya\n\nOpen this link to sign in (valid for 15 minutes):\n${linkUrl}\n\nIf you didn't request this email, ignore it.`,
  };
}

/**
 * Escape untrusted text before interpolating it into an HTML template.
 * Only applied to the templates touched since RV-18; the older ones above
 * predate this helper and are left as-is deliberately (changing them is a
 * separate, wider change).
 */
export { esc };

/**
 * RV-18 (2026-08-10): this template was DEAD CODE — it had exactly one
 * reference in the repo, its own definition. The only email a paying devotee
 * received was the payment receipt (payment.service.sendPujaBookingInvoice), whose
 * `puja_booking` PDF variant renders createdAt as the INVOICE date and carries
 * no scheduledDate / scheduledTimeSlot field at all. Net effect: a devotee who
 * had just paid was never told, in writing, WHEN their puja would happen.
 *
 * This is now wired through booking-notify.service.sendBookingConfirmationEmail,
 * which the 'confirmed' devotee notification fires. `priestName` was added
 * because the assigned pandit is the other thing devotees ask support about.
 */
export function bookingConfirmationEmail(params: {
  devoteeName: string;
  pujaName: string;
  templeName: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  bookingNumber: string;
  amount: string;
  priestName?: string | null;
}): { subject: string; html: string; text: string } {
  const { devoteeName, pujaName, templeName, scheduledDate, scheduledTimeSlot, bookingNumber, amount, priestName } = params;
  const panditHtml = priestName
    ? `<strong>Pandit:</strong> ${esc(priestName)}<br>`
    : '<strong>Pandit:</strong> Being assigned — we\'ll confirm shortly<br>';
  const panditText = priestName ? `Pandit: ${priestName}\n` : 'Pandit: being assigned\n';
  return {
    subject: `Puja booking confirmed: ${pujaName} at ${templeName}`,
    html: shell(`
      <h1>Namaste ${esc(devoteeName)}, your puja is booked</h1>
      <p>Your booking has been confirmed. Booking number: <strong>${esc(bookingNumber)}</strong></p>
      <p><strong>Puja:</strong> ${esc(pujaName)}<br>
      <strong>Temple:</strong> ${esc(templeName)}<br>
      <strong>Date:</strong> ${esc(scheduledDate)}<br>
      <strong>Time:</strong> ${esc(scheduledTimeSlot)}<br>
      ${panditHtml}
      <strong>Amount paid:</strong> ${esc(amount)}</p>
      <p>The priest will perform the puja and upload a video proof. You'll receive an email when the recording is ready.</p>
      <p style="font-size:12px;color:#999;">Need to change or cancel? Cancellation is open until 24 hours before the slot time above — your booking page shows the refund that applies.</p>
      <a class="btn" href="https://darshya.online/bookings/${encodeURIComponent(bookingNumber)}">View booking</a>
    `),
    text: `Namaste ${devoteeName}, your puja is booked.\n\nBooking #${bookingNumber}\nPuja: ${pujaName}\nTemple: ${templeName}\nDate: ${scheduledDate}\nTime: ${scheduledTimeSlot}\n${panditText}Amount: ${amount}\n\nCancellation is open until 24 hours before the slot time.\nView at: https://darshya.online/bookings/${encodeURIComponent(bookingNumber)}`,
  };
}

/**
 * NOTIF-05 (2026-08-12): the email bookingConfirmationEmail PROMISES.
 *
 * Its body says, to every paying devotee: "The priest will perform the puja and
 * upload a video proof. You'll receive an email when the recording is ready."
 * No such template existed. The only thing that fired when a proof landed was a
 * web-push — which needs a desktop browser with granted permission, i.e.
 * essentially nobody in the NRI cohort that pays 9-10x precisely for this
 * artefact. Video proof is business rule #1; this is the written half of it.
 */
export function videoReadyEmail(params: {
  devoteeName: string;
  pujaName: string;
  templeName: string;
  bookingNumber: string;
  /** Deep link to the booking's video page. */
  videoUrl: string;
  priestName?: string | null;
  performedOn?: string | null;
}): { subject: string; html: string; text: string } {
  const { devoteeName, pujaName, templeName, bookingNumber, videoUrl, priestName, performedOn } =
    params;
  const priestHtml = priestName ? `<strong>Pandit:</strong> ${esc(priestName)}<br>` : '';
  const priestText = priestName ? `Pandit: ${priestName}\n` : '';
  const performedHtml = performedOn ? `<strong>Performed on:</strong> ${esc(performedOn)}<br>` : '';
  const performedText = performedOn ? `Performed on: ${performedOn}\n` : '';
  return {
    subject: `Your ${pujaName} video is ready`,
    html: shell(`
      <h1>Namaste ${esc(devoteeName)}, your puja video is ready</h1>
      <p>The recording of your puja has been uploaded. It shows the sankalp taken in your name,
      the ritual itself, and the prasad offering.</p>
      <p><strong>Puja:</strong> ${esc(pujaName)}<br>
      <strong>Temple:</strong> ${esc(templeName)}<br>
      ${priestHtml}${performedHtml}
      <strong>Booking:</strong> ${esc(bookingNumber)}</p>
      <a class="btn" href="${esc(videoUrl)}">Watch your puja video</a>
      <p style="font-size:12px;color:#999;">If the button doesn't work, paste this URL into your browser:<br>
      <span style="word-break:break-all;">${esc(videoUrl)}</span></p>
    `),
    text: `Namaste ${devoteeName}, your puja video is ready.\n\nPuja: ${pujaName}\nTemple: ${templeName}\n${priestText}${performedText}Booking: ${bookingNumber}\n\nWatch it here: ${videoUrl}`,
  };
}

/**
 * NOTIF-04 (2026-08-12): the refund notice for the ADMIN refund rail.
 *
 * refund.service.processRefund has always had its own local refundSuccessEmail.
 * The other rail — payment.service.processRefund, which is what the admin panel
 * calls — sent nothing at all: no email, no push, no WhatsApp. A devotee
 * refunded by an admin got their money back with zero written notice, and the
 * predictable next step is a chargeback on a refund that was already paid.
 *
 * Fired from booking-notify.notifyRefundProcessed, which suppresses it when the
 * caller reports it already sent one — so the two rails cannot double-email.
 */
export function refundProcessedEmail(params: {
  devoteeName: string;
  pujaName: string;
  templeName: string;
  bookingNumber: string;
  /** Pre-formatted display amount, e.g. "₹1,100.50". Built from the stored Decimal, never a float. */
  amount?: string | null;
}): { subject: string; html: string; text: string } {
  const { devoteeName, pujaName, templeName, bookingNumber, amount } = params;
  const amountHtml = amount
    ? `<p><strong>Amount refunded:</strong> ${esc(amount)}</p>`
    : '<p>Your refund has been issued.</p>';
  const amountText = amount ? `Amount refunded: ${amount}\n` : 'Your refund has been issued.\n';
  return {
    subject: `Refund processed for your ${pujaName} booking`,
    html: shell(`
      <h1>Namaste ${esc(devoteeName)}, your refund is on its way</h1>
      ${amountHtml}
      <p><strong>Puja:</strong> ${esc(pujaName)}<br>
      <strong>Temple:</strong> ${esc(templeName)}<br>
      <strong>Booking:</strong> ${esc(bookingNumber)}</p>
      <p>The amount has been returned to the payment method you used. Banks typically take
      ${REFUND_DAYS_LABEL} to post it to your statement. International cards can take
      ${REFUND_INTERNATIONAL_CARD_LABEL}, which is set by your card issuer and not by Darshya.</p>
      <p style="font-size:12px;color:#999;">If you do not see it after that, reply to this
      email with your booking number and we will trace it with the payment gateway.</p>
    `),
    text: `Namaste ${devoteeName}, your refund is on its way.\n\n${amountText}Puja: ${pujaName}\nTemple: ${templeName}\nBooking: ${bookingNumber}\n\nThe amount has been returned to your original payment method. Banks typically take ${REFUND_DAYS_LABEL} to post it; international cards can take ${REFUND_INTERNATIONAL_CARD_LABEL} (set by your card issuer, not by Darshya).`,
  };
}

export function providerApprovedEmail(params: {
  providerName: string;
  roleLabel: string;
  publicProfileUrl?: string;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const { providerName, roleLabel, publicProfileUrl, dashboardUrl } = params;
  const profileLink = publicProfileUrl
    ? `<p>Your public profile is now live: <a href="${publicProfileUrl}">${publicProfileUrl}</a></p>`
    : '';
  return {
    subject: `Your ${roleLabel} profile is approved on Darshya`,
    html: shell(`
      <h1>Welcome to Darshya, ${providerName}</h1>
      <p>Your ${roleLabel} profile has been reviewed and approved by our team.
      You can now receive bookings, consultations and donations from devotees.</p>
      ${profileLink}
      <a class="btn" href="${dashboardUrl}">Open your dashboard</a>
      <p style="font-size:12px;color:#999;">
      Need help getting started? Reply to this email or visit our help centre.</p>
    `),
    text: `Welcome to Darshya, ${providerName}!\n\nYour ${roleLabel} profile is now approved and live. You can receive bookings starting today.\n\nDashboard: ${dashboardUrl}${publicProfileUrl ? `\nPublic profile: ${publicProfileUrl}` : ''}`,
  };
}

export function providerRejectedEmail(params: {
  providerName: string;
  roleLabel: string;
  reason?: string;
  reapplyUrl: string;
}): { subject: string; html: string; text: string } {
  const { providerName, roleLabel, reason, reapplyUrl } = params;
  const reasonBlock = reason
    ? `<p><strong>Reviewer note:</strong> ${reason}</p>`
    : '';
  return {
    subject: `Update on your ${roleLabel} application`,
    html: shell(`
      <h1>Hello ${providerName}</h1>
      <p>Thank you for applying to list your ${roleLabel} profile on Darshya.
      After review, we are unable to approve your application at this time.</p>
      ${reasonBlock}
      <p>You're welcome to update your details and submit again.</p>
      <a class="btn" href="${reapplyUrl}">Update and resubmit</a>
      <p style="font-size:12px;color:#999;">
      If you have questions, reply to this email and our team will help.</p>
    `),
    text: `Hello ${providerName},\n\nWe were unable to approve your ${roleLabel} application at this time.${reason ? `\n\nReviewer note: ${reason}` : ''}\n\nYou can update your details and resubmit at: ${reapplyUrl}`,
  };
}

export function supportTicketAlertEmail(params: {
  ticketNumber: string;
  subject: string;
  body: string;
  category: string;
  priority: string;
  userName: string;
  userEmail: string;
  userPhone?: string | null;
  ticketId: string;
}): { subject: string; html: string; text: string } {
  const { ticketNumber, subject, body, category, priority, userName, userEmail, userPhone, ticketId } = params;
  const adminUrl = `https://darshya.online/admin/support/${ticketId}`;
  return {
    subject: `[${priority}] New support ticket ${ticketNumber}: ${subject}`,
    html: shell(`
      <h1>New support ticket</h1>
      <p><strong>Ticket:</strong> ${ticketNumber}<br>
      <strong>Subject:</strong> ${subject}<br>
      <strong>Category:</strong> ${category} &nbsp; <strong>Priority:</strong> ${priority}</p>
      <p><strong>From:</strong> ${userName} &lt;${userEmail}&gt;${userPhone ? ` · ${userPhone}` : ''}</p>
      <p><strong>Message:</strong></p>
      <p style="white-space:pre-wrap;background:#fbf7f1;padding:12px;border-radius:8px;">${body.replace(/</g, '&lt;')}</p>
      <a class="btn" href="${adminUrl}">Open in admin</a>
    `),
    text: `New support ticket ${ticketNumber}\nSubject: ${subject}\nCategory: ${category} | Priority: ${priority}\nFrom: ${userName} <${userEmail}>${userPhone ? ` · ${userPhone}` : ''}\n\n${body}\n\nOpen: ${adminUrl}`,
  };
}

export function supportTicketReceivedEmail(params: {
  userName: string;
  ticketNumber: string;
  subject: string;
}): { subject: string; html: string; text: string } {
  const { userName, ticketNumber, subject } = params;
  return {
    subject: `We've received your request — ticket ${ticketNumber}`,
    html: shell(`
      <h1>Namaste ${userName}, we've got your message</h1>
      <p>Your support ticket has been logged. Our team typically replies within 24 hours.</p>
      <p><strong>Ticket:</strong> ${ticketNumber}<br>
      <strong>Subject:</strong> ${subject}</p>
      <a class="btn" href="https://darshya.online/support/tickets/${ticketNumber}">View ticket status</a>
      <p style="font-size:12px;color:#999;">Reply to this email to add more details, or call +91 9255109400 (Mon–Sat 9am–7pm IST).</p>
    `),
    text: `Namaste ${userName},\n\nWe've received your support request.\nTicket: ${ticketNumber}\nSubject: ${subject}\n\nOur team replies within 24 hours.\nTrack: https://darshya.online/support/tickets/${ticketNumber}\nOr call +91 9255109400 (Mon–Sat 9am–7pm IST).`,
  };
}

export function supportTicketReplyEmail(params: {
  userName: string;
  ticketNumber: string;
  subject: string;
  replyBody: string;
}): { subject: string; html: string; text: string } {
  const { userName, ticketNumber, subject, replyBody } = params;
  return {
    subject: `Reply on your ticket ${ticketNumber}: ${subject}`,
    html: shell(`
      <h1>Namaste ${userName}, you have a new reply</h1>
      <p>Our team has responded on your support ticket.</p>
      <p style="white-space:pre-wrap;background:#fbf7f1;padding:12px;border-radius:8px;">${replyBody.replace(/</g, '&lt;')}</p>
      <a class="btn" href="https://darshya.online/support/tickets/${ticketNumber}">Open ticket</a>
    `),
    text: `Namaste ${userName},\n\nNew reply on ticket ${ticketNumber} — ${subject}\n\n${replyBody}\n\nOpen: https://darshya.online/support/tickets/${ticketNumber}`,
  };
}

/**
 * COM-02 (prod sweep 2026-08-12): `is80G` must mirror the attachment.
 *
 * This mail said "Your 80G tax receipt PDF is attached" for every donation,
 * while the donee's 80G registration number and PAN are NULL for every donee on
 * the platform — so the attachment is not an 80G instrument and the donor was
 * being told it was. The PDF now states its own status
 * (lib/pdf-receipt.ts is80GEligible); this copy has to agree with it, or the
 * donor believes the email and files the deduction anyway.
 */
export function donationReceiptEmail(params: {
  donorName: string;
  amount: string;
  gaushalaName: string;
  receiptNumber: string;
  date: string;
  is80G?: boolean;
}): { subject: string; html: string; text: string } {
  const { donorName, amount, gaushalaName, receiptNumber, date, is80G = false } = params;
  const attachmentLineHtml = is80G
    ? 'Your 80G tax receipt PDF is attached to this email. Please retain it for your records.'
    : 'Your donation receipt PDF is attached to this email. Please retain it for your records.';
  const attachmentLineText = is80G
    ? 'Your 80G tax receipt is attached.'
    : 'Your donation receipt is attached.';
  return {
    subject: `Thank you — donation receipt for ${gaushalaName}`,
    html: shell(`
      <h1>Thank you, ${donorName}</h1>
      <p>Your donation of <strong>${amount}</strong> to ${gaushalaName} has been received.</p>
      <p><strong>Receipt #:</strong> ${receiptNumber}<br>
      <strong>Date:</strong> ${date}</p>
      <p>${attachmentLineHtml}</p>
      <p>The cows you support will be fed, sheltered, and cared for with your seva.</p>
      <a class="btn" href="https://darshya.online/gaushala">Visit gaushala</a>
    `),
    text: `Thank you ${donorName}!\n\nYour donation of ${amount} to ${gaushalaName} has been received.\nReceipt #${receiptNumber} dated ${date}\n\n${attachmentLineText}`,
  };
}

/**
 * NOTIF-16 — the settlement mail a provider gets when their payout moves.
 *
 * Both payout notifications were web-push only, and `push_subscriptions` held a
 * single row in the entire database. Pandits are mobile-first and are the
 * cohort least likely to have granted desktop web-push permission, so a
 * completed transfer was in practice invisible until they opened /payouts.
 *
 * The transfer reference is the load-bearing field: the money moves outside the
 * system (bank/UPI/Route), so the reference is the only thing the provider can
 * match against a statement that has not updated yet.
 */
export function payoutSettledEmail(params: {
  providerName: string;
  /** Pre-formatted display amount, e.g. "₹9,000.00". Built from the stored Decimal. */
  amount: string;
  status: 'completed' | 'rejected' | 'failed';
  reference?: string | null;
  failureReason?: string | null;
}): { subject: string; html: string; text: string } {
  const { providerName, amount, status, reference, failureReason } = params;

  if (status === 'completed') {
    const refHtml = reference
      ? `<p><strong>Transfer reference:</strong> ${esc(reference)}</p>`
      : '<p>Your bank or UPI app will show the credit shortly.</p>';
    const refText = reference
      ? `Transfer reference: ${reference}\n`
      : 'Your bank or UPI app will show the credit shortly.\n';
    return {
      subject: `Your Darshya payout of ${amount} has been sent`,
      html: shell(`
        <h1>Namaste ${esc(providerName)}, your payout has been sent</h1>
        <p><strong>Amount:</strong> ${esc(amount)}</p>
        ${refHtml}
        <p>Transfers usually appear within one working day. If it has not arrived after
        that, reply to this email with the reference above and we will trace it.</p>
        <a class="btn" href="https://darshya.online/payouts">View your payouts</a>
      `),
      text: `Namaste ${providerName}, your payout has been sent.\n\nAmount: ${amount}\n${refText}\nTransfers usually appear within one working day.\n\nhttps://darshya.online/payouts`,
    };
  }

  const reasonHtml = failureReason
    ? `<p><strong>Reason:</strong> ${esc(failureReason)}</p>`
    : '';
  const reasonText = failureReason ? `Reason: ${failureReason}\n` : '';
  return {
    subject: `Your Darshya payout of ${amount} could not be completed`,
    html: shell(`
      <h1>Namaste ${esc(providerName)}, your payout did not go through</h1>
      <p><strong>Amount:</strong> ${esc(amount)}</p>
      ${reasonHtml}
      <p>Your balance is intact and is available to withdraw again. Please check the bank
      or UPI details on your profile before requesting the next payout.</p>
      <a class="btn" href="https://darshya.online/payouts">Check your balance</a>
    `),
    text: `Namaste ${providerName}, your payout of ${amount} could not be completed.\n${reasonText}\nYour balance is intact and available to withdraw again.\n\nhttps://darshya.online/payouts`,
  };
}
