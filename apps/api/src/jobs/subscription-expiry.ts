import { findUpcomingExpirations } from '../services/subscription.service.js';
import { sendEmail } from '../lib/email.js';

export interface SubscriptionExpiryResult {
  notified: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}

/**
 * Daily cron tick: notify users whose subscriptions expire within
 * `lookaheadDays` (default 3). Idempotent across the day window via the
 * date-window filter; mailer is best-effort and won't throw.
 */
export async function runSubscriptionExpiryNotice(lookaheadDays = 3): Promise<SubscriptionExpiryResult> {
  let due: Awaited<ReturnType<typeof findUpcomingExpirations>>;
  try {
    due = await findUpcomingExpirations(lookaheadDays);
  } catch (err) {
    return {
      notified: 0,
      failed: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }

  let notified = 0;
  let failed = 0;
  for (const row of due) {
    if (!row.email) continue;
    const days = Math.max(0, Math.ceil((row.endDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));
    const html = `
      <p>Your Darshya subscription expires in ${days} day${days === 1 ? '' : 's'} on ${row.endDate.toISOString().slice(0, 10)}.</p>
      <p><a href="https://darshya.online/upgrade">Renew now</a> to keep unlimited access to AI Pandit, astrology guidance, and priority support.</p>
    `;
    try {
      const r = await sendEmail({
        to: row.email,
        subject: `Darshya — your subscription expires in ${days} day${days === 1 ? '' : 's'}`,
        html,
      });
      if (r.ok || r.skipped) notified++;
      else failed++;
    } catch {
      failed++;
    }
  }

  return { notified, failed };
}
