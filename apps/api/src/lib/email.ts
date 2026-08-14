import { Resend } from 'resend';

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

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  attachments?: { filename: string; content: Buffer | string }[];
}

interface SendEmailResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
  /** SCAL-11: true when the provider refused because the daily budget is gone. */
  rateLimited?: boolean;
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

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    // No key configured — nothing was sent, so nothing is charged to the day.
    return { ok: false, skipped: true };
  }
  rollDay();
  quota.attempted += 1;
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: REPLY_TO,
      attachments: params.attachments,
    });
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
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * RV-18 (2026-08-10): this template was DEAD CODE — it had exactly one
 * reference in the repo, its own definition. The only email a paying devotee
 * received was the tax invoice (payment.service.sendPujaBookingInvoice), whose
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
      5-7 business days to post it to your statement.</p>
      <p style="font-size:12px;color:#999;">If you do not see it after 7 business days, reply to this
      email with your booking number and we will trace it with the payment gateway.</p>
    `),
    text: `Namaste ${devoteeName}, your refund is on its way.\n\n${amountText}Puja: ${pujaName}\nTemple: ${templeName}\nBooking: ${bookingNumber}\n\nThe amount has been returned to your original payment method. Banks typically take 5-7 business days to post it.`,
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

export function donationReceiptEmail(params: {
  donorName: string;
  amount: string;
  gaushalaName: string;
  receiptNumber: string;
  date: string;
}): { subject: string; html: string; text: string } {
  const { donorName, amount, gaushalaName, receiptNumber, date } = params;
  return {
    subject: `Thank you — donation receipt for ${gaushalaName}`,
    html: shell(`
      <h1>Thank you, ${donorName}</h1>
      <p>Your donation of <strong>${amount}</strong> to ${gaushalaName} has been received.</p>
      <p><strong>Receipt #:</strong> ${receiptNumber}<br>
      <strong>Date:</strong> ${date}</p>
      <p>Your 80G tax receipt PDF is attached to this email. Please retain it for your records.</p>
      <p>The cows you support will be fed, sheltered, and cared for with your seva.</p>
      <a class="btn" href="https://darshya.online/gaushala">Visit gaushala</a>
    `),
    text: `Thank you ${donorName}!\n\nYour donation of ${amount} to ${gaushalaName} has been received.\nReceipt #${receiptNumber} dated ${date}\n\nYour 80G tax receipt is attached.`,
  };
}
