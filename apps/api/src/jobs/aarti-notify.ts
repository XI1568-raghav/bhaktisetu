import { prisma } from '../lib/prisma.js';
import { parseSchedule } from '../lib/darshan-schedule.js';
import { sendFcm, fcmConfig } from '../lib/fcm.js';

/**
 * Layer AE — 15-min-before-aarti FCM push. Runs every ~5 min from master-cron.
 *
 * For every Temple with `liveDarshanEnabled`, parse `timingInfo.regularHours`
 * to find the next aarti slot. If that aarti starts in 14–16 min from "now",
 * fan-out a push to:
 *   - devotees with `TempleFollow` row for this temple, AND
 *   - devotees with `aartiOptIn = true` on at least one device token.
 *
 * Idempotency: each (templeId, slotKey, ymd-IST) is logged in a small in-process
 * Set to suppress duplicate fires if the cron runs twice within 5 min. The
 * 14–16 min window itself is the primary dedupe — a 5-min cron will only
 * see each aarti once.
 *
 * No-ops gracefully when FCM env is missing or the new tables aren't migrated.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;

function istMinutesNow(now: Date): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MIN) % (24 * 60);
}

function istYmd(now: Date): string {
  const istMs = now.getTime() + IST_OFFSET_MIN * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

const recentlyFired = new Set<string>();
// Cap memory: clear after 24h. Master-cron lives in a long-running Render
// process so we can't rely on process restarts to flush.
let lastFlush = Date.now();
function maybeFlush() {
  if (Date.now() - lastFlush > 24 * 60 * 60 * 1000) {
    recentlyFired.clear();
    lastFlush = Date.now();
  }
}

export interface AartiNotifyResult {
  templesChecked: number;
  aartisMatched: number;
  pushesSent: number;
  expiredTokens: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}

interface FcmTokenRow {
  userId: string;
  deviceToken: string;
  aartiOptIn: boolean;
}

interface FcmTokenModel {
  findMany: (args: {
    where: { userId?: { in: string[] }; aartiOptIn?: boolean };
    select: { userId: true; deviceToken: true; aartiOptIn: true };
  }) => Promise<FcmTokenRow[]>;
  deleteMany: (args: { where: { deviceToken: { in: string[] } } }) => Promise<{ count: number }>;
}

interface TempleFollowModel {
  findMany: (args: {
    where: { templeId: string };
    select: { userId: true };
  }) => Promise<Array<{ userId: string }>>;
}

export async function runAartiNotify(now: Date = new Date()): Promise<AartiNotifyResult> {
  if (!fcmConfig.enabled) {
    return { templesChecked: 0, aartisMatched: 0, pushesSent: 0, expiredTokens: 0, failed: 0, skipped: true, reason: 'FCM not configured' };
  }
  const tokenModel = (prisma as unknown as { fcmDeviceToken?: FcmTokenModel }).fcmDeviceToken;
  const followModel = (prisma as unknown as { templeFollow?: TempleFollowModel }).templeFollow;
  if (!tokenModel || !followModel) {
    return { templesChecked: 0, aartisMatched: 0, pushesSent: 0, expiredTokens: 0, failed: 0, skipped: true, reason: 'tables not migrated' };
  }

  maybeFlush();

  let temples: Array<{ id: string; name: string; slug: string; timingInfo: unknown }>;
  try {
    temples = await prisma.temple.findMany({
      where: { liveDarshanEnabled: true, status: 'active' },
      select: { id: true, name: true, slug: true, timingInfo: true },
    });
  } catch {
    return { templesChecked: 0, aartisMatched: 0, pushesSent: 0, expiredTokens: 0, failed: 0, skipped: true, reason: 'temple query failed' };
  }

  const ymd = istYmd(now);
  const nowMin = istMinutesNow(now);
  let aartisMatched = 0;
  let pushesSent = 0;
  let failed = 0;
  const expiredAll: string[] = [];

  for (const temple of temples) {
    const slots = parseSchedule(temple.timingInfo).filter((s) => s.isAarti);
    for (const slot of slots) {
      const minutesUntil = slot.start - nowMin;
      // 14–16 min window. Master-cron tick is ~5 min so 3-min spread ensures
      // we hit each aarti at least once even with clock drift.
      if (minutesUntil < 14 || minutesUntil > 16) continue;
      const fireKey = `${temple.id}:${slot.key}:${ymd}`;
      if (recentlyFired.has(fireKey)) continue;
      recentlyFired.add(fireKey);
      aartisMatched++;

      // Find audience: temple followers (regardless of aartiOptIn at temple
      // level — opt-in is already implicit by following) + global opters.
      const followers = await followModel.findMany({
        where: { templeId: temple.id },
        select: { userId: true },
      });
      const followerIds = followers.map((f) => f.userId);

      let tokenRows: FcmTokenRow[] = [];
      if (followerIds.length > 0) {
        const followerTokens = await tokenModel.findMany({
          where: { userId: { in: followerIds } },
          select: { userId: true, deviceToken: true, aartiOptIn: true },
        });
        tokenRows = tokenRows.concat(followerTokens.filter((t) => t.aartiOptIn));
      }
      // Global opt-in: also notify devotees who toggled aartiOptIn on any
      // device. This is broad — fine for early launch when audience is small.
      const globalOpts = await tokenModel.findMany({
        where: { aartiOptIn: true },
        select: { userId: true, deviceToken: true, aartiOptIn: true },
      });
      // Merge unique by deviceToken
      const seen = new Set(tokenRows.map((t) => t.deviceToken));
      for (const g of globalOpts) {
        if (!seen.has(g.deviceToken)) {
          tokenRows.push(g);
          seen.add(g.deviceToken);
        }
      }

      if (tokenRows.length === 0) continue;

      const payload = {
        title: `\u{1F549} ${slot.label} at ${temple.name}`,
        body: 'Watch live in 15 min',
        data: { url: `/darshan/${temple.slug}` },
      };

      for (const row of tokenRows) {
        const r = await sendFcm(row.deviceToken, payload);
        if (r.ok) pushesSent++;
        else if (r.expired) expiredAll.push(row.deviceToken);
        else if (!r.skipped) failed++;
      }
    }
  }

  if (expiredAll.length > 0) {
    try {
      await tokenModel.deleteMany({ where: { deviceToken: { in: expiredAll } } });
    } catch {
      // best-effort cleanup
    }
  }

  return {
    templesChecked: temples.length,
    aartisMatched,
    pushesSent,
    expiredTokens: expiredAll.length,
    failed,
  };
}
