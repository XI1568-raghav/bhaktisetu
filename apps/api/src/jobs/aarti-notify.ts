import { prisma } from '../lib/prisma.js';
import { parseSchedule } from '../lib/darshan-schedule.js';
import { sendFcm, fcmConfig } from '../lib/fcm.js';
import { claimRun } from '../lib/notification-run-log.js';

/**
 * Layer AE — pre-aarti FCM push.
 *
 * For every Temple with `liveDarshanEnabled`, parse `timingInfo.regularHours`
 * to find aarti slots starting soon, and push to the devotees who FOLLOW that
 * temple and have aarti reminders on.
 *
 * NOTIF-09 (2026-08-12) — audience is followers ONLY.
 *
 *   The job used to append every token with `aartiOptIn: true` to the audience
 *   of EVERY temple, "fine for early launch when audience is small". It is not:
 *   the seeded temples with live darshan carry 20 aarti slots a day between
 *   them, so a single opt-in bought 20 pushes a day about temples the devotee
 *   never chose, starting at 02:45 IST (Tirumala suprabhatam) and ending 21:00
 *   (Kashi shringar). That is a same-day uninstall or a browser-level
 *   notification block — which also kills booking-confirmed and video-ready,
 *   the pushes that carry the paid product. `aartiOptIn` now means what its UI
 *   copy implies: aarti reminders for the temples I follow.
 *
 * NOTIF-08 (2026-08-12) — the match window derives from the real tick cadence.
 *
 *   It was hardcoded to 14–16 minutes, justified by "master-cron tick is ~5 min".
 *   The tick is 30 minutes (jobs/scheduler.ts DEFAULT_INTERVAL_MS / the
 *   documented cron-job.org cadence), so 27 of every 30 minutes of an aarti's
 *   approach were invisible and ~90% of reminders were structurally impossible.
 *   A reminder that works 10% of the time is worse than none. We now fire on the
 *   FIRST tick that can still see the aarti — anything up to one tick + the lead
 *   time away — and the copy states the ACTUAL minutes remaining rather than a
 *   hardcoded "15 min" that would usually be wrong.
 *
 * Idempotency: a durable per-(temple, slot, IST date) claim in
 * notification-run-log. The old module-level `Set` was emptied by every Render
 * restart and shared with no second instance, which is exactly what a wider
 * window cannot tolerate.
 *
 * No-ops gracefully when FCM env is missing or the tables aren't migrated.
 */

const IST_OFFSET_MIN = 5 * 60 + 30;

/** How far ahead of the aarti we would LIKE to land. */
const LEAD_MIN = 15;
const DEFAULT_TICK_MIN = 30;

function istMinutesNow(now: Date): number {
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  return (utcMinutes + IST_OFFSET_MIN) % (24 * 60);
}

function istYmd(now: Date, dayOffset = 0): string {
  const istMs = now.getTime() + IST_OFFSET_MIN * 60 * 1000 + dayOffset * 24 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

/**
 * Minutes the ops scheduler leaves between ticks.
 *
 * Read from the SAME env var jobs/scheduler.ts resolves (`OPS_TICK_INTERVAL_MS`,
 * floored at a minute there too) so the window and the cadence cannot drift
 * apart again — that drift, one file saying 5 minutes and another 30, is the
 * whole of NOTIF-08.
 */
export function tickIntervalMinutes(): number {
  const raw = Number(process.env.OPS_TICK_INTERVAL_MS);
  if (!Number.isFinite(raw) || raw < 60_000) return DEFAULT_TICK_MIN;
  return Math.ceil(raw / 60_000);
}

export interface AartiNotifyResult {
  templesChecked: number;
  aartisMatched: number;
  pushesSent: number;
  expiredTokens: number;
  /**
   * Tokens FCM refused as malformed. NOT deleted — see NOTIF-07: these are a bug
   * on the registration path, and deleting them destroys the only evidence.
   */
  invalidTokens: number;
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
    where: { templeId: string; userId?: { gt: string } };
    select: { userId: true };
    orderBy?: { userId: 'asc' };
    take?: number;
  }) => Promise<Array<{ userId: string }>>;
}

/**
 * SCAL-06 (2026-08-13): followers are read a page at a time.
 *
 * The audience read used to be `followModel.findMany({ where: { templeId } })`
 * with no take and no cursor, and its whole result then went straight back to
 * Postgres as `userId: { in: [...] }` for the token lookup. One popular temple
 * firing its 06:00 aarti is therefore one unbounded read plus an IN list of the
 * same size, resident together in a 512 MB Render container — and the
 * morning-aarti push is the highest-value engagement moment in the product, so
 * it is the exact moment the job would OOM. When it dies mid-loop the temples
 * after it get nothing, silently, and because master-cron is triggered by an
 * external HTTP POST the timeout looks like a failed webhook rather than a
 * product outage.
 *
 * Keyset paging on userId (rather than a cursor object) works whether or not
 * TempleFollow's compound unique has been migrated, and it drops nobody: the
 * scan still visits every follower, just never all at once.
 */
const FOLLOWER_PAGE_SIZE = 500;

function emptyResult(reason: string): AartiNotifyResult {
  return {
    templesChecked: 0,
    aartisMatched: 0,
    pushesSent: 0,
    expiredTokens: 0,
    invalidTokens: 0,
    failed: 0,
    skipped: true,
    reason,
  };
}

export async function runAartiNotify(now: Date = new Date()): Promise<AartiNotifyResult> {
  if (!fcmConfig.enabled) return emptyResult('FCM not configured');
  const tokenModel = (prisma as unknown as { fcmDeviceToken?: FcmTokenModel }).fcmDeviceToken;
  const followModel = (prisma as unknown as { templeFollow?: TempleFollowModel }).templeFollow;
  if (!tokenModel || !followModel) return emptyResult('tables not migrated');

  let temples: Array<{ id: string; name: string; slug: string; timingInfo: unknown }>;
  try {
    temples = await prisma.temple.findMany({
      where: { liveDarshanEnabled: true, status: 'active' },
      select: { id: true, name: true, slug: true, timingInfo: true },
    });
  } catch {
    return emptyResult('temple query failed');
  }

  const nowMin = istMinutesNow(now);
  // Everything from "starting now" out to one full tick beyond the lead time:
  // if we skip it this tick, the next tick is already too late.
  const windowMax = tickIntervalMinutes() + LEAD_MIN;
  let aartisMatched = 0;
  let pushesSent = 0;
  let failed = 0;
  let invalidTokens = 0;
  const expiredAll: string[] = [];

  for (const temple of temples) {
    const slots = parseSchedule(temple.timingInfo).filter((s) => s.isAarti);
    for (const slot of slots) {
      // Wrap across midnight IST: a 03:00 aarti seen at 23:50 is 190 minutes
      // away, not -1250. Without the wrap the whole small-hours block (Tirumala
      // suprabhatam, Kashi mangala) could only ever match on the same IST day.
      const minutesUntil = (slot.start - nowMin + 24 * 60) % (24 * 60);
      if (minutesUntil > windowMax) continue;

      // The aarti's OWN IST date, so two ticks straddling midnight cannot claim
      // two different keys for one aarti.
      const aartiYmd = istYmd(now, slot.start >= nowMin ? 0 : 1);
      const fireKey = `aarti:${temple.id}:${slot.key}:${aartiYmd}`;
      // Durable claim: exactly one tick, on exactly one instance, sends.
      if (!(await claimRun(fireKey))) continue;
      aartisMatched++;

      // Say the real number of minutes. "Watch live in 15 min" was hardcoded and
      // is wrong for every tick that isn't exactly 15 minutes out.
      const payload = {
        title: `\u{1F549} ${slot.label} at ${temple.name}`,
        body:
          minutesUntil <= 1
            ? 'Starting now — watch live'
            : `Starts in ${minutesUntil} min — watch live`,
        data: { url: `/darshan/${temple.slug}` },
      };

      // Audience: devotees who FOLLOW this temple and have reminders on, read
      // and pushed one page at a time (SCAL-06).
      let afterUserId: string | undefined;
      for (;;) {
        const followers = await followModel.findMany({
          where: {
            templeId: temple.id,
            ...(afterUserId ? { userId: { gt: afterUserId } } : {}),
          },
          select: { userId: true },
          orderBy: { userId: 'asc' },
          take: FOLLOWER_PAGE_SIZE,
        });
        if (followers.length === 0) break;
        const followerIds = followers.map((f) => f.userId);
        afterUserId = followerIds[followerIds.length - 1];

        const followerTokens = await tokenModel.findMany({
          where: { userId: { in: followerIds }, aartiOptIn: true },
          select: { userId: true, deviceToken: true, aartiOptIn: true },
        });
        // One push per device even if the row set repeats it. Pages are disjoint
        // by userId, so a device cannot straddle two pages.
        const byToken = new Map<string, FcmTokenRow>();
        for (const t of followerTokens) {
          if (t.aartiOptIn) byToken.set(t.deviceToken, t);
        }

        for (const row of byToken.values()) {
          const r = await sendFcm(row.deviceToken, payload);
          if (r.ok) pushesSent++;
          else if (r.expired) expiredAll.push(row.deviceToken);
          else if (r.invalidToken) {
            // NOTIF-07: keep the row. This is a registration-path bug (a Web Push
            // endpoint URL stored as an FCM token), and deleting it makes the
            // devotee's stuck toggle undiagnosable instead of merely broken.
            invalidTokens++;
            console.warn(
              '[aarti-notify][INVALID-TOKEN]',
              JSON.stringify({
                userId: row.userId,
                templeId: temple.id,
                reason: r.error ?? 'not an FCM registration token',
              }),
            );
          } else if (!r.skipped) failed++;
        }

        if (followers.length < FOLLOWER_PAGE_SIZE) break;
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
    invalidTokens,
    failed,
  };
}
