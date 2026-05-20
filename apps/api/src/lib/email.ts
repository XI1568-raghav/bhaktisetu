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
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    return { ok: false, skipped: true };
  }
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
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
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

export function bookingConfirmationEmail(params: {
  devoteeName: string;
  pujaName: string;
  templeName: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  bookingNumber: string;
  amount: string;
}): { subject: string; html: string; text: string } {
  const { devoteeName, pujaName, templeName, scheduledDate, scheduledTimeSlot, bookingNumber, amount } = params;
  return {
    subject: `Puja booking confirmed: ${pujaName} at ${templeName}`,
    html: shell(`
      <h1>Namaste ${devoteeName}, your puja is booked</h1>
      <p>Your booking has been confirmed. Booking number: <strong>${bookingNumber}</strong></p>
      <p><strong>Puja:</strong> ${pujaName}<br>
      <strong>Temple:</strong> ${templeName}<br>
      <strong>Date:</strong> ${scheduledDate}<br>
      <strong>Time:</strong> ${scheduledTimeSlot}<br>
      <strong>Amount paid:</strong> ${amount}</p>
      <p>The priest will perform the puja and upload a video proof. You'll receive an email when the recording is ready.</p>
      <a class="btn" href="https://darshya.online/bookings/${bookingNumber}">View booking</a>
    `),
    text: `Namaste ${devoteeName}, your puja is booked.\n\nBooking #${bookingNumber}\nPuja: ${pujaName}\nTemple: ${templeName}\nDate: ${scheduledDate} ${scheduledTimeSlot}\nAmount: ${amount}\n\nView at: https://darshya.online/bookings/${bookingNumber}`,
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
