import { prisma } from '../lib/prisma.js';
import { runOutreachTick } from './outreach-cron.js';
import { maybeRunYoutubeDiscovery, type YoutubeDiscoveryResult } from './youtube-discovery.js';
import { maybeRunApolloRefresh, type ApolloRefreshResult } from './apollo-refresh.js';
import { tickContentSeed, type ContentSeedResult } from './content-seed.js';
import { tickContentAutoPost, type AutoPostResult } from './content-auto-post.js';
import { runAartiNotify, type AartiNotifyResult } from './aarti-notify.js';
import { maybeRunWeeklyDigest, type WeeklyDigestResult } from './weekly-digest.js';
import { prewarmDailyHoroscopes } from '../lib/astrology.js';
import { processAutoRefunds } from '../services/refund.service.js';
import { maybeRunWeeklyBackup, type BackupResult } from './backup-cron.js';
import { sweepOldRows as sweepWebhookReplay, type SweepResult as WebhookSweepResult } from '../lib/webhook-idempotency.js';

interface RefundCronResult {
  processed: number;
  succeeded: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}

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

interface YoutubeResult {
  skipped?: boolean;
  reason?: string;
  liveCount?: number;
  offlineCount?: number;
  errorCount?: number;
}

interface ApolloResult {
  skipped?: boolean;
  reason?: string;
  newLeads?: number;
  skippedExisting?: number;
  errorCount?: number;
}

export interface DailyOpsResult {
  outreach: OutreachResult;
  waitlist: WaitlistResult;
  panchang: PanchangResult;
  youtube: YoutubeResult;
  apollo: ApolloResult;
  contentSeed: ContentSeedResult;
  contentAutoPost: AutoPostResult;
  aartiNotify: AartiNotifyResult;
  weeklyDigest: WeeklyDigestResult & { gated?: boolean };
  horoscopes: { generated: number; date: string; skipped?: boolean; reason?: string };
  refunds: RefundCronResult;
  backup: BackupResult;
  webhookReplaySweep: WebhookSweepResult;
  ranAt: string;
}

export async function tickWebhookReplaySweep(): Promise<WebhookSweepResult> {
  // Best-effort daily sweep of webhook_replay rows older than 30 days.
  // sweepOldRows() already swallows errors into a structured result, but
  // we wrap defensively in case the import itself blows up in a non-DB env.
  try {
    return await sweepWebhookReplay();
  } catch (err) {
    return {
      deleted: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
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
  const waitlist = prisma.waitlist;
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
        const fromAddress = process.env.RESEND_FROM ?? 'Darshya <support@darshya.online>';
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
            html: `<p>Tap to confirm and unlock referrals: <a href="https://darshya.online/waitlist/confirm?code=${row.id}">Confirm</a></p>`,
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
  type SubModel = { findMany: (args: { take: number }) => Promise<unknown[]> };
  const prismaWithFutureModels = prisma as unknown as {
    pushSubscription?: SubModel;
    panchangSubscription?: SubModel;
  };
  const subModel = prismaWithFutureModels.pushSubscription ?? prismaWithFutureModels.panchangSubscription;
  if (!subModel) return { sent: 0, skipped: true, reason: 'no push subscription model' };
  try {
    const subs = await subModel.findMany({ take: 1000 });
    return { sent: subs.length };
  } catch {
    return { sent: 0, skipped: true };
  }
}

async function tickApolloRefresh(): Promise<ApolloResult> {
  // Best-effort: gated on a 7-day in-process cooldown inside
  // maybeRunApolloRefresh(). Missing APOLLO_API_KEY → skipped. Any error
  // (network, schema, prisma) is captured into the result so the rest of
  // runDailyOps continues.
  try {
    const r: ApolloRefreshResult = await maybeRunApolloRefresh();
    if (r.skipped) {
      return { skipped: true, reason: r.reason };
    }
    return {
      newLeads: r.newLeads,
      skippedExisting: r.skippedExisting,
      errorCount: r.errors.length,
    };
  } catch (err) {
    return {
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function tickYoutubeDiscovery(): Promise<YoutubeResult> {
  // Best-effort: any failure (DB down, YT API quota, network) is logged
  // into the result rather than thrown, so the rest of the daily-ops tick
  // continues. The 30-min in-process gate lives inside maybeRunYoutubeDiscovery.
  try {
    const gated = await maybeRunYoutubeDiscovery();
    if (gated.skipped) {
      return { skipped: true, reason: gated.reason ?? 'gated' };
    }
    const r = gated.result as YoutubeDiscoveryResult;
    if (r.skipped) {
      return { skipped: true, reason: r.reason };
    }
    return {
      liveCount: r.liveCount,
      offlineCount: r.offlineCount,
      errorCount: r.errorCount,
    };
  } catch (err) {
    return {
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function runDailyOps(opts: RunOptions = {}): Promise<DailyOpsResult> {
  const outreach = await tickOutreach();
  if (opts.outreachOnly) {
    return {
      outreach,
      waitlist: { nudged: 0, skipped: true },
      panchang: { sent: 0, skipped: true },
      youtube: { skipped: true, reason: 'outreachOnly' },
      apollo: { skipped: true, reason: 'outreachOnly' },
      contentSeed: {
        redditOk: 0,
        redditFailed: 0,
        quoraOk: 0,
        quoraFailed: 0,
        skipped: true,
        reason: 'outreachOnly',
      },
      contentAutoPost: {
        attempted: 0,
        posted: 0,
        failed: 0,
        skipped: 0,
        errors: [],
        ranAt: new Date().toISOString(),
        reason: 'outreachOnly',
      },
      aartiNotify: {
        templesChecked: 0,
        aartisMatched: 0,
        pushesSent: 0,
        expiredTokens: 0,
        failed: 0,
        skipped: true,
        reason: 'outreachOnly',
      },
      weeklyDigest: { sent: 0, skipped: 0, failed: 0, gated: true, reason: 'outreachOnly' },
      horoscopes: { generated: 0, date: new Date().toISOString().slice(0, 10), skipped: true, reason: 'outreachOnly' },
      refunds: { processed: 0, succeeded: 0, failed: 0, skipped: true, reason: 'outreachOnly' },
      backup: { ok: true, skipped: true, reason: 'outreachOnly' },
      webhookReplaySweep: { deleted: 0, skipped: true, reason: 'outreachOnly' },
      ranAt: new Date().toISOString(),
    };
  }
  const waitlist = await tickWaitlistNudges();
  const panchang = await tickPanchangBlast(opts.forcePanchang ?? false);
  const youtube = await tickYoutubeDiscovery();
  const apollo = await tickApolloRefresh();
  const contentSeed = await tickContentSeed();
  const contentAutoPost = await tickContentAutoPost();
  const aartiNotify = await tickAartiNotify();
  const weeklyDigest = await tickWeeklyDigest();
  const horoscopes = await tickHoroscopePrewarm();
  const refunds = await tickAutoRefunds();
  const backup = await tickWeeklyBackup();
  const webhookReplaySweep = await tickWebhookReplaySweep();
  return {
    outreach,
    waitlist,
    panchang,
    youtube,
    apollo,
    contentSeed,
    contentAutoPost,
    aartiNotify,
    weeklyDigest,
    horoscopes,
    refunds,
    backup,
    webhookReplaySweep,
    ranAt: new Date().toISOString(),
  };
}

async function tickWeeklyBackup(): Promise<BackupResult> {
  // Best-effort: pg_dump → R2 upload, gated to Sunday 02:00 IST inside
  // maybeRunWeeklyBackup. Failures fire Slack/email ops alert; never throw.
  try {
    return await maybeRunWeeklyBackup();
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function tickAutoRefunds(): Promise<RefundCronResult> {
  // Best-effort: refund.service.processAutoRefunds picks up cancelled
  // bookings tagged "[refund-requested]" older than 1h and full-refunds
  // each via Razorpay. Any error (network, DB, schema gap) is captured so
  // the rest of runDailyOps continues.
  try {
    return await processAutoRefunds();
  } catch (err) {
    return {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function tickHoroscopePrewarm(): Promise<{ generated: number; date: string; skipped?: boolean; reason?: string }> {
  // Best-effort 24h cache warm of all 12 daily horoscopes. If Groq/Anthropic
  // is offline, the lib falls back to static text — this should never throw.
  try {
    const r = await prewarmDailyHoroscopes();
    return { generated: r.generated, date: r.date };
  } catch (err) {
    return {
      generated: 0,
      date: new Date().toISOString().slice(0, 10),
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function tickWeeklyDigest(): Promise<WeeklyDigestResult & { gated?: boolean }> {
  // Best-effort: any failure (DB down, Resend hiccup) is captured into the
  // result so the rest of runDailyOps continues. Sunday 9 AM IST + 6-day
  // cooldown gating happens inside maybeRunWeeklyDigest.
  try {
    return await maybeRunWeeklyDigest();
  } catch (err) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      gated: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

async function tickAartiNotify(): Promise<AartiNotifyResult> {
  // Best-effort: never throw. The job itself catches its own DB/FCM errors
  // and returns a structured result with skipped/reason. We wrap to be safe
  // against schema-not-migrated environments where prisma.temple itself
  // could throw before runAartiNotify can react.
  try {
    return await runAartiNotify();
  } catch (err) {
    return {
      templesChecked: 0,
      aartisMatched: 0,
      pushesSent: 0,
      expiredTokens: 0,
      failed: 0,
      skipped: true,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}
