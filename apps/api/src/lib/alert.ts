import { sendEmail } from './email.js';

/**
 * Lightweight ops alerter. Used to ping the on-call human when something
 * worth seeing in real time happens (hot lead replied, payment failed, etc).
 *
 * Routing precedence:
 *   1. SLACK_WEBHOOK_URL — POST a simple text payload to the incoming-webhook URL
 *   2. ADMIN_EMAILS      — comma-separated list, sent via Resend (lib/email.ts)
 *   3. neither set       — log + skip (graceful degradation)
 *
 * Never throws. Always resolves to `{ ok, channel, skipped?, error? }` so
 * callers can `void sendOpsAlert(...)` inside try/catch-light paths
 * (e.g. webhooks that must still ACK 200).
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface OpsAlertParams {
  subject: string;
  body: string;
  severity?: AlertSeverity;
}

export interface OpsAlertResult {
  ok: boolean;
  channel: 'slack' | 'email' | 'none';
  skipped?: boolean;
  error?: string;
}

const SEVERITY_EMOJI: Record<AlertSeverity, string> = {
  low: ':information_source:',
  medium: ':warning:',
  high: ':rotating_light:',
  critical: ':fire:',
};

async function postSlack(
  webhookUrl: string,
  params: OpsAlertParams,
): Promise<OpsAlertResult> {
  const severity = params.severity ?? 'medium';
  const emoji = SEVERITY_EMOJI[severity];
  const text = `${emoji} *${params.subject}*\n${params.body}`;
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        ok: false,
        channel: 'slack',
        error: `slack webhook ${res.status}: ${body.slice(0, 200)}`,
      };
    }
    return { ok: true, channel: 'slack' };
  } catch (err) {
    return {
      ok: false,
      channel: 'slack',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function postEmail(
  recipients: string[],
  params: OpsAlertParams,
): Promise<OpsAlertResult> {
  const severity = params.severity ?? 'medium';
  const tag = severity.toUpperCase();
  const safeBody = params.body.replace(/[<>]/g, (c) =>
    c === '<' ? '&lt;' : '&gt;',
  );
  try {
    const result = await sendEmail({
      to: recipients,
      subject: `[Darshya ops · ${tag}] ${params.subject}`,
      html: `<h1>${params.subject}</h1><pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;background:#f5f5f5;padding:12px;border-radius:6px;">${safeBody}</pre>`,
      text: `[${tag}] ${params.subject}\n\n${params.body}`,
    });
    if (result.skipped) {
      return { ok: false, channel: 'email', skipped: true };
    }
    if (!result.ok) {
      return { ok: false, channel: 'email', error: result.error };
    }
    return { ok: true, channel: 'email' };
  } catch (err) {
    return {
      ok: false,
      channel: 'email',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function sendOpsAlert(
  params: OpsAlertParams,
): Promise<OpsAlertResult> {
  const slackUrl = process.env.SLACK_WEBHOOK_URL?.trim();
  if (slackUrl) {
    return postSlack(slackUrl, params);
  }

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (adminEmails.length > 0) {
    return postEmail(adminEmails, params);
  }

  console.log(
    `[ops-alert] no SLACK_WEBHOOK_URL or ADMIN_EMAILS set — skipping. subject="${params.subject}"`,
  );
  return { ok: false, channel: 'none', skipped: true };
}
