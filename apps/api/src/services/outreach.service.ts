import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resend } from 'resend';
import { prisma } from '../lib/prisma.js';
import { HAS_80G } from '../lib/eighty-g.js';
import { HAS_PANDIT_VETTING } from '../lib/pandit-vetting.js';
import type { Lead, OutreachChannel, OutreachStatus } from '@prisma/client';

/**
 * Outreach service: sends cold email + WhatsApp first-touch and follow-ups
 * to scraped leads. Logs every send to OutreachLog for audit + dedup.
 *
 * Env:
 *   RESEND_API_KEY                    — required for email; if absent, sendEmail returns {skipped:true}
 *   OUTREACH_FROM_EMAIL               — default: "Darshya <outreach@darshya.online>"
 *   OUTREACH_REPLY_TO                 — default: founder@darshya.online
 *   WHATSAPP_TOKEN                    — required for WhatsApp; if absent, sendWhatsApp no-ops
 *   WHATSAPP_PHONE_ID                 — required for WhatsApp; if absent, sendWhatsApp no-ops
 *   WHATSAPP_API_VERSION              — default: v21.0
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'outreach');

const FROM_EMAIL = process.env.OUTREACH_FROM_EMAIL ?? process.env.RESEND_FROM ?? 'Darshya <support@darshya.online>';
const REPLY_TO = process.env.OUTREACH_REPLY_TO ?? 'support@darshya.online';
const TRACKING_BASE = (
  process.env.OUTREACH_TRACKING_BASE_URL ??
  process.env.PUBLIC_API_URL ??
  'https://api.darshya.online'
).replace(/\/+$/, '');

/**
 * Wrap every <a href> in the rendered HTML with a click-tracking redirect,
 * and append a 1×1 open-tracking pixel before </body>. The unsubscribe link
 * and any href that already points at the tracking host are left alone so
 * we don't recursively wrap our own infrastructure.
 */
function injectTracking(html: string, logId: string): string {
  if (!logId) return html;
  const pixel =
    `<img src="${TRACKING_BASE}/api/v1/outreach/pixel.gif?id=${encodeURIComponent(logId)}" ` +
    `width="1" height="1" alt="" style="display:none;border:0;outline:none;" />`;

  const wrapped = html.replace(/href="([^"]+)"/g, (match, raw: string) => {
    const url = raw.trim();
    // Skip mailto/tel/anchor/template-placeholder hrefs.
    if (/^(mailto:|tel:|#|\{\{)/i.test(url)) return match;
    // Skip the unsubscribe link — it must remain a direct CAN-SPAM compliant URL.
    if (/\/unsubscribe(\?|$)/i.test(url)) return match;
    // Skip our tracking host to avoid wrapping our own redirects.
    if (url.startsWith(TRACKING_BASE)) return match;
    const encoded = Buffer.from(url, 'utf-8').toString('base64url');
    const tracked = `${TRACKING_BASE}/api/v1/outreach/click?id=${encodeURIComponent(logId)}&u=${encoded}`;
    return `href="${tracked}"`;
  });

  if (wrapped.includes('</body>')) {
    return wrapped.replace('</body>', `${pixel}</body>`);
  }
  return `${wrapped}${pixel}`;
}

const resendKey = process.env.RESEND_API_KEY;
const resend = resendKey ? new Resend(resendKey) : null;

const whatsappToken = process.env.WHATSAPP_TOKEN ?? process.env.WHATSAPP_ACCESS_TOKEN;
const whatsappPhoneId = process.env.WHATSAPP_PHONE_ID ?? process.env.WHATSAPP_PHONE_NUMBER_ID;
const whatsappApiVersion = process.env.WHATSAPP_API_VERSION ?? 'v21.0';
const whatsappEnabled = !!(whatsappToken && whatsappPhoneId);

// ─── Template loading ───────────────────────────────────────────────────

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
  .signature { margin-top: 28px; padding-top: 16px; border-top: 1px solid #eee;
               font-size: 13px; color: #555; }
  .footer { font-size: 11px; color: #999; margin-top: 28px;
            padding-top: 16px; border-top: 1px solid #eee; text-align: center; }
`;

const layoutStart = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${baseStyles}</style></head>
<body><div class="container"><div class="brand">Darshya</div>`;

function layoutEnd(unsubUrl: string): string {
  return `<div class="footer">Darshya · India's Devotional Super App · https://darshya.online<br>
You received this because we found your contact during temple/provider research.<br>
<a href="${unsubUrl}">Unsubscribe</a> · IT Rules 2021 / CAN-SPAM / CASL compliant</div>
</div></body></html>`;
}

const templateCache = new Map<string, string>();

function loadTemplate(filename: string): string {
  if (templateCache.has(filename)) return templateCache.get(filename)!;
  const fullPath = path.join(TEMPLATES_DIR, filename);
  const raw = fs.readFileSync(fullPath, 'utf-8');
  templateCache.set(filename, raw);
  return raw;
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/**
 * TC-01 (P0, trust) — the 80G honesty gate for outbound prospect copy.
 *
 * A previous wave corrected the gaushala first-touch email SUBJECT here, and
 * the WhatsApp warm-intro text in lib/wa-warm-intro-helpers.ts. It did not
 * touch the email BODIES, which are HTML files on disk that this service reads
 * and sends — so `templates/outreach/gaushala_first_touch.{en,hi}.html`,
 * `gaushala_first_touch.txt` (the WhatsApp copy) and
 * `gaushala_followup_3day.html` went on offering gaushala trusts "automatic
 * 80G receipts" in the body under a subject that no longer said it.
 *
 * Darshya holds no Section 80G registration (apps/web/lib/company.ts
 * `HAS_80G_VERIFIED` false, `eightyGNumber` and `pan` null), and
 * `lib/pdf-receipt.ts` `is80GEligible()` needs a donee 80G number AND PAN from
 * `gaushala_profiles.regn_80g` / `.pan`, which no route in this repository
 * writes. Every receipt the platform mints therefore prints "Proof of donation
 * — not a tax exemption certificate".
 *
 * These substitutions are appended AFTER the caller's `variables`, so no call
 * site can override the gate. Flip `lib/eighty-g.ts` on the day the
 * certificate is on file and every template returns to the 80G wording
 * unchanged.
 */
const EIGHTY_G_VARS: Record<string, string> = {
  receiptFeatureEn: HAS_80G
    ? 'automatic 80G receipt generation'
    : 'automatic numbered donation receipts',
  receiptFeatureHi: HAS_80G
    ? 'automatic 80G receipt generation'
    : 'automatic numbered donation receipts',
  receiptLineEn: HAS_80G
    ? 'Every donation generates an 80G tax receipt PDF automatically, emailed to the donor.'
    : 'Every donation generates a numbered receipt PDF automatically, emailed to the donor. ' +
      'It is proof of payment, not a tax-exemption certificate: Darshya holds no Section 80G ' +
      'registration yet, so a donation made today cannot be claimed as an 80G deduction.',
  receiptLineHi: HAS_80G
    ? 'Har donation par 80G tax receipt PDF automatically donor ko email ho jaati hai.'
    : 'Har donation par ek numbered receipt PDF automatically donor ko email ho jaati hai. ' +
      'Wo proof of payment hai, tax-exemption certificate nahi — Darshya ke paas abhi Section 80G ' +
      'registration nahi hai, is liye aaj kiye gaye donation par 80G deduction claim nahi kiya ja sakta.',
  // WhatsApp is capped at 1000 characters below, so it gets the short form.
  receiptShortHi: HAS_80G
    ? 'har donation par 80G receipt'
    : 'har donation par numbered receipt PDF (proof of payment — Darshya ke paas abhi 80G registration nahi hai)',
  /**
   * TC-08 (P1, trust). `priest_first_touch.en.html` recruited pandits onto "a
   * devotional platform where verified pandits perform online pujas", and the
   * Hindi copy said the same. Nothing promotes a `Priest` to verified —
   * `routes/priest.ts` writes `verificationStatus: 'pending'` and no route
   * writes `'approved'`, so `routes/priests-public.ts`, which filters on
   * `isVerified`, can only ever list seeded rows. Bound to
   * `lib/pandit-vetting.ts`.
   *
   * Scoped to pandits deliberately. `AstrologerProfile.approved` and
   * `Temple.isVerified` DO have production writers
   * (`services/onboarding.service.ts`, `services/admin.service.ts`,
   * `routes/admin.ts`), so the astrologer and temple templates are not part of
   * this finding and are left alone.
   */
  panditsPhraseEn: HAS_PANDIT_VETTING ? 'verified pandits' : 'pandits',
  panditsPhraseHi: HAS_PANDIT_VETTING ? 'verified पंडित जी' : 'पंडित जी',
};

/**
 * Exported so `lib/outbound-80g-honesty.tc01.test.ts` can assert on the exact
 * bytes `sendEmail` hands to Resend, rather than on a re-implementation of the
 * substitution. `sendEmail` calls this; the test calls the same function.
 */
export function renderEmailTemplate(filename: string, vars: Record<string, string>): string {
  const tpl = loadTemplate(filename);
  const unsubUrl = `https://darshya.online/unsubscribe?lead=${encodeURIComponent(vars.leadId ?? '')}`;
  const replaced = tpl
    .replace(/\{\{layoutStart\}\}/g, layoutStart)
    .replace(/\{\{layoutEnd\}\}/g, layoutEnd(unsubUrl));
  return interpolate(replaced, { ...vars, ...EIGHTY_G_VARS });
}

// ─── Subject lines per template ─────────────────────────────────────────

const SUBJECTS: Record<string, string> = {
  temple_first_touch: 'Darshya — आपके मंदिर के लिए digital booking platform',
  temple_followup_3day: 'Re: आपके मंदिर के लिए Darshya partnership',
  temple_followup_7day: 'Last reminder — Darshya 100-temple early-mover slot',
  temple_followup_14day: 'Gentle nudge — आपकी मंदिर पूछताछ अभी भी खुली है',
  priest_first_touch: 'Darshya — पंडित जी के लिए online पूजा platform',
  priest_followup_3day: 'Re: Darshya priest partnership',
  priest_followup_7day: 'Last reminder — Darshya priest slot',
  priest_followup_14day: 'Gentle nudge — आपकी पंडित partnership पूछताछ खुली है',
  astrologer_first_touch: 'Darshya — verified astrologers के लिए online platform',
  astrologer_followup_3day: 'Re: Darshya astrologer partnership',
  astrologer_followup_7day: 'Last reminder — Darshya astrologer slot',
  astrologer_followup_14day: 'Gentle nudge — आपकी astrologer partnership पूछताछ खुली है',
  wellness_first_touch: 'Darshya — invite for wellness instructors (yoga / pranayama / meditation)',
  wellness_followup_3day: 'Re: Darshya wellness instructor partnership',
  wellness_followup_7day: 'Last reminder — Darshya wellness slot',
  wellness_followup_14day: 'Gentle nudge — आपकी wellness instructor पूछताछ खुली है',
  // TC-01: this subject line promised an 80G platform to gaushala trusts.
  // Darshya holds no Section 80G registration and no route writes the donee
  // columns (gaushala_profiles.regn_80g / .pan) that would let one issue an
  // 80G receipt through us, so a trust reading this subject was being
  // recruited on a capability the product does not have.
  gaushala_first_touch: 'Darshya — आपकी गौशाला के लिए online donation platform',
  gaushala_followup_3day: 'Re: Darshya gaushala partnership',
  gaushala_followup_7day: 'Last reminder — Darshya gaushala slot',
  gaushala_followup_14day: 'Gentle nudge — आपकी गौशाला partnership पूछताछ खुली है',
};

// ─── Public API ─────────────────────────────────────────────────────────

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

interface LeadLike {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  city: string | null;
  role: string;
}

export interface SendEmailParams {
  lead: LeadLike;
  templateKey: string;
  variables?: Record<string, string>;
  language?: 'hi' | 'en';
  /** OutreachLog id used to wrap href links + open pixel. When omitted, no tracking is injected. */
  logId?: string;
}

/**
 * Resolve the template filename. Tries `<key>.<lang>.html` first, then
 * `<key>.html`, then `<key>.en.html` as final fallback.
 */
function resolveEmailFile(templateKey: string, lang: 'hi' | 'en'): string | null {
  const candidates = [`${templateKey}.${lang}.html`, `${templateKey}.html`, `${templateKey}.en.html`];
  for (const c of candidates) {
    const full = path.join(TEMPLATES_DIR, c);
    if (fs.existsSync(full)) return c;
  }
  return null;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  const { lead, templateKey, variables = {}, language = 'hi', logId } = params;
  if (!lead.email) {
    return { ok: false, error: 'lead has no email' };
  }
  if (!resend) {
    return { ok: false, skipped: true };
  }
  const file = resolveEmailFile(templateKey, language);
  if (!file) {
    return { ok: false, error: `template not found: ${templateKey}` };
  }
  const rendered = renderEmailTemplate(file, {
    leadId: lead.id,
    name: lead.name || 'ji',
    city: lead.city || 'India',
    ...variables,
    // TC-01: renderEmailTemplate appends EIGHTY_G_VARS after these, so no
    // caller can override the honesty gate.
  });
  const html = logId ? injectTracking(rendered, logId) : rendered;
  const subject = SUBJECTS[templateKey] ?? 'A note from Darshya';
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: lead.email,
      replyTo: REPLY_TO,
      subject,
      html,
      headers: {
        'List-Unsubscribe': `<https://darshya.online/api/v1/outreach/unsubscribe?lead=${lead.id}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, id: data?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── WhatsApp ───────────────────────────────────────────────────────────

function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

function loadWhatsappTemplate(templateKey: string): string | null {
  const file = path.join(TEMPLATES_DIR, `${templateKey}.txt`);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, 'utf-8').trim();
}

/**
 * The exact text `sendWhatsApp` posts to the Graph API, minus the network.
 * Returns null when the template file does not exist.
 *
 * Exported for the same reason as `renderEmailTemplate`: a WhatsApp message is
 * unrecallable once sent, so TC-01's regression test asserts on the real
 * rendered string rather than on a copy of the substitution logic. The 80G
 * gate vars are applied AFTER the caller's, so no call site can override them.
 */
export function renderWhatsappMessage(
  templateKey: string,
  vars: Record<string, string>,
): string | null {
  const tpl = loadWhatsappTemplate(templateKey);
  if (!tpl) return null;
  return interpolate(tpl, { ...vars, ...EIGHTY_G_VARS }).slice(0, 1000);
}

export interface SendWhatsAppParams {
  lead: LeadLike;
  templateKey: string;
  variables?: Record<string, string>;
}

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendResult> {
  const { lead, templateKey, variables = {} } = params;
  if (!whatsappEnabled) return { ok: false, skipped: true };
  const target = lead.whatsappNumber ?? lead.phone;
  if (!target) return { ok: false, error: 'lead has no whatsapp/phone' };

  const text = renderWhatsappMessage(templateKey, {
    leadId: lead.id,
    name: lead.name || 'ji',
    city: lead.city || 'India',
    ...variables,
  });
  if (text === null) return { ok: false, error: `whatsapp template missing: ${templateKey}` };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: normalisePhone(target),
          type: 'text',
          text: { body: text, preview_url: true },
        }),
      },
    );
    const data = (await res.json()) as {
      messages?: Array<{ id: string }>;
      error?: { message: string };
    };
    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, id: data.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ─── Logging + counters ─────────────────────────────────────────────────

export interface RecordOutreachParams {
  leadId: string;
  channel: OutreachChannel;
  templateKey: string;
  status: OutreachStatus;
  payload?: Record<string, unknown>;
  error?: string;
  /** Optional pre-generated id so callers can wire tracking links/pixel before the row is written. */
  id?: string;
}

export async function recordOutreach(params: RecordOutreachParams): Promise<{ id: string }> {
  const created = await prisma.outreachLog.create({
    data: {
      ...(params.id ? { id: params.id } : {}),
      leadId: params.leadId,
      channel: params.channel,
      templateKey: params.templateKey,
      status: params.status,
      payload: params.payload as object | undefined,
      errorMsg: params.error,
    },
    select: { id: true },
  });
  return { id: created.id };
}

export async function incrementContactCount(leadId: string): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      contactCount: { increment: 1 },
      lastContactedAt: new Date(),
    },
  });
}

// ─── Per-role first-touch template selection ───────────────────────────

export function firstTouchTemplateKey(role: Lead['role']): string {
  switch (role) {
    case 'TEMPLE': return 'temple_first_touch';
    case 'PRIEST': return 'priest_first_touch';
    case 'ASTROLOGER': return 'astrologer_first_touch';
    case 'WELLNESS_INSTRUCTOR': return 'wellness_first_touch';
    case 'GAUSHALA': return 'gaushala_first_touch';
    default: return 'temple_first_touch';
  }
}

export function followupTemplateKey(role: Lead['role'], days: 3 | 7 | 14): string {
  const base = firstTouchTemplateKey(role).replace('_first_touch', '');
  return `${base}_followup_${days}day`;
}

export const outreachConfig = {
  whatsappEnabled,
  emailEnabled: !!resend,
  fromEmail: FROM_EMAIL,
  replyTo: REPLY_TO,
};
