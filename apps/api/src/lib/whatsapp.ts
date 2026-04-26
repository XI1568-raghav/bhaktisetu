/**
 * WhatsApp Business Cloud API (Meta Graph) — direct integration.
 *
 * Free tier: 1,000 service conversations / month + unlimited utility
 * messages. We use template messages for OTP, booking confirmations, and
 * donation receipts. Templates must be pre-approved in WhatsApp Manager.
 *
 * Env vars (set on Render):
 *   WHATSAPP_PHONE_NUMBER_ID  — numeric id from Meta WA Business Manager
 *   WHATSAPP_ACCESS_TOKEN     — long-lived system-user token
 *   WHATSAPP_API_VERSION      — defaults to v21.0 if unset
 *
 * If env vars are absent, every send returns {skipped:true} — keeps the
 * stack working in dev/demo without a verified Meta business account.
 */

const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const apiVersion = process.env.WHATSAPP_API_VERSION ?? 'v21.0';

const enabled = !!(phoneNumberId && accessToken);

interface SendResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Normalises an Indian number to WA's expected international format
 * (no leading + or 0). Accepts "+91 98765 43210", "919876543210",
 * "9876543210" — defaults to country code 91 when only a 10-digit
 * mobile is supplied.
 */
function normalisePhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  if (digits.startsWith('0') && digits.length === 11) return `91${digits.slice(1)}`;
  return digits;
}

async function callGraph(payload: Record<string, unknown>): Promise<SendResult> {
  if (!enabled) return { ok: false, skipped: true };
  try {
    const res = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
    );
    const data = (await res.json()) as { messages?: Array<{ id: string }>; error?: { message: string } };
    if (!res.ok) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Send a pre-approved template. The template name + language code must
 * match what's been approved in WhatsApp Manager. Variables are mapped
 * positionally to {{1}}, {{2}}, ... in the template body.
 */
export async function sendWhatsappTemplate(params: {
  to: string;
  template: string;
  languageCode?: string;
  variables?: string[];
}): Promise<SendResult> {
  return callGraph({
    messaging_product: 'whatsapp',
    to: normalisePhone(params.to),
    type: 'template',
    template: {
      name: params.template,
      language: { code: params.languageCode ?? 'en' },
      components: params.variables?.length
        ? [
            {
              type: 'body',
              parameters: params.variables.map((v) => ({ type: 'text', text: v })),
            },
          ]
        : undefined,
    },
  });
}

/**
 * Send plain text (only valid within a 24-hour conversation window after
 * the user has messaged us). Used for AI-pandit replies, not for
 * proactive outreach.
 */
export async function sendWhatsappText(params: {
  to: string;
  text: string;
}): Promise<SendResult> {
  return callGraph({
    messaging_product: 'whatsapp',
    to: normalisePhone(params.to),
    type: 'text',
    text: { body: params.text.slice(0, 4096) },
  });
}

export const whatsapp = { enabled, phoneNumberId, apiVersion };
