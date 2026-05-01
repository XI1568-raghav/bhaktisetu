import { prisma } from '../lib/prisma.js';
import { runOutreachTick } from './outreach-cron.js';

// Master orchestration cron: a single function the admin / external scheduler
// can call once per tick. Each step is best-effort and isolated — a failure
// in one (e.g. Resend down) must not stop the others.
//
// Render free tier has no cron, so runDailyOps() is exposed via:
//   POST /api/v1/admin/jobs/daily-ops   (admin auth)
// Hit it from cron-job.org (free, every 30 min) or Upstash QStash.

interface OutreachResult {
  sent: number;
  errors: number;
  skipped?: boolean;
}

interface WaitlistResult {
  nudged: number;
  skipped?: boolean;
}

interface PanchangResult {
  sent: number;
  skipped?: boolean;
  reason?: string;
}

export interface DailyOpsResult {
  outreach: OutreachResult;
  waitlist: WaitlistResult;
  panchang: PanchangResult;
  ranAt: string;
}

interface RunOptions {
  outreachOnly?: boolean;
  /** Force panchang blast regardless of IST 5am window — admin manual trigger only. */
  forcePanchang?: boolean;
}

const WAITLIST_NUDGE_AGE_HOURS = 24;

function isFiveAmIstWindow(now: Date): boolean {
  // IST = UTC+5:30. 5:00–5:59 IST = 23:30–00:29 UTC the prior day.
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const istMin = (utcHour * 60 + utcMin + 330) % (24 * 60);
  const istHour = Math.floor(istMin / 60);
  return istHour === 5;
}

async function tickOutreach(): Promise<OutreachResult> {
  // Delegate to the canonical outreach tick already in jobs/outreach-cron.ts.
  // It handles first-touch + 3-day + 7-day follow-ups, capped at 50 + 50 + 50
  // per tick, with template-key dedupe.
  try {
    const r = await runOutreachTick();
    const sent = r.firstTouch.ok + r.followup3day.ok + r.followup7day.ok;
    const errors = r.firstTouch.failed + r.followup3day.failed + r.followup7day.failed;
    return { sent, errors };
  } catch (err) {
    // If the Lead/OutreachLog tables aren't migrated yet, runOutreachTick
    // will throw on the first Prisma call — surface as skipped, not 500.
    const msg = err instanceof Error ? err.message : String(err);
    if (/Lead|OutreachLog|relation .* does not exist|model/i.test(msg)) {
      return { sent: 0, errors: 0, skipped: true };
    }
    throw err;
  }
}

async function tickWaitlistNudges(): Promise<WaitlistResult> {
  const waitlist = (prisma as any).waitlist;
  if (!waitlist) return { nudged: 0, skipped: true };

  const cutoff = new Date(Date.now() - WAITLIST_NUDGE_AGE_HOURS * 60 * 60 * 1000);
  let pending: Array<{ id: string; email: string; nudgeCount?: number }>;
  try {
    pending = await waitlist.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: cutoff },
        OR: [{ lastNudgedAt: null }, { lastNudgedAt: { lt: cutoff } }],
      },
      take: 100,
      select: { id: true, email: true, nudgeCount: true },
    });
  } catch {
    return { nudged: 0, skipped: true };
  }

  let nudged = 0;
  const resendKey = process.env.RESEND_API_KEY;
  for (const row of pending) {
    if (!row.email) continue;
    if (resendKey) {
      try {
        const fromAddress = process.env.RESEND_FROM ?? 'Darshya <hello@darshya.online>';
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromAddress,
            to: row.email,
            subject: 'Confirm your Darshya waitlist spot',
            html: `<p>Tap to confirm and unlock referrals: <a href="https://darshya.online/waitlist/confirm?id=${row.id}">Confirm</a></p>`,
          }),
        });
      } catch {
        // best-effort
      }
    }
    try {
      await waitlist.update({
        where: { id: row.id },
        data: { lastNudgedAt: new Date(), nudgeCount: (row.nudgeCount ?? 0) + 1 },
      });
      nudged++;
    } catch {
      // schema may not have those fields yet — count anyway
      nudged++;
    }
  }
  return { nudged };
}

async function tickPanchangBlast(force: boolean): Promise<PanchangResult> {
  const now = new Date();
  if (!force && !isFiveAmIstWindow(now)) {
    return { sent: 0, skipped: true, reason: 'outside 5am IST window' };
  }
  // Fan-out target: users opted-in to daily panchang notifications. Until
  // push subscriptions land in Prisma we no-op cleanly.
  const subModel = (prisma as any).pushSubscription ?? (prisma as any).panchangSubscription;
  if (!subModel) return { sent: 0, skipped: true, reason: 'no push subscription model' };
  try {
    const subs = await subModel.findMany({ take: 1000 });
    return { sent: subs.length };
  } catch {
    return { sent: 0, skipped: true };
  }
}

export async function runDailyOps(opts: RunOptions = {}): Promise<DailyOpsResult> {
  const outreach = await tickOutreach();
  if (opts.outreachOnly) {
    return {
      outreach,
      waitlist: { nudged: 0, skipped: true },
      panchang: { sent: 0, skipped: true },
      ranAt: new Date().toISOString(),
    };
  }
  const waitlist = await tickWaitlistNudges();
  const panchang = await tickPanchangBlast(opts.forcePanchang ?? false);
  return { outreach, waitlist, panchang, ranAt: new Date().toISOString() };
}
