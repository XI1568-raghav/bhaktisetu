import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { panchangService } from '../services/panchang.service.js';
import { parseSchedule } from '../lib/darshan-schedule.js';
import { claimRun, releaseRun } from '../lib/notification-run-log.js';

/**
 * Weekly devotee digest — Sunday 9 AM IST fan-out.
 *
 * For each opted-in user we send one email with four sections:
 *   1. Upcoming aartis at temples they follow (next 7 days)
 *   2. New content published in the last 7 days (top 3)
 *   3. A personalized puja recommendation (top puja in their gotra/deity)
 *   4. Panchang highlights for the upcoming week (today's tithi/festivals)
 *
 * Privacy: the email body for one devotee NEVER includes another devotee's
 * name, email, phone, or any PII. We render only the user's own profile
 * fields and global content/temple metadata.
 *
 * Throughput: 50 messages/second cap (Resend free-tier limit) implemented
 * as a 20ms inter-send sleep.
 *
 * Opt-out: users land in the WeeklyDigestOptOut table when they hit the
 * unsubscribe link. Default state is opted-IN per signup ToS. If the
 * opt-out table doesn't exist (migration pending) we send to everyone.
 *
 * Idempotency: the job records lastRunAt in WeeklyDigestRun. Master-cron
 * gates calls behind a 6-day cooldown. The actual day-of-week + hour
 * filter is enforced in maybeRunWeeklyDigest().
 */

const SEND_RATE_MS = 20; // 50/sec
const BATCH_SIZE = 200;

export interface WeeklyDigestResult {
  sent: number;
  skipped: number;
  failed: number;
  /**
   * NOTIF-13: recipients this tick did NOT email because an earlier tick of the
   * SAME edition already delivered to them. Deliberately its own counter —
   * folding it into `sent` would report deliveries that did not happen on this
   * run, the same conflation that made a comms layer with zero configured
   * channels read green (NOTIF-03).
   */
  alreadyDelivered: number;
  /**
   * SCAL-11: recipients the day's BULK budget refused. Distinct from `skipped`
   * (opted out / no address / channel unconfigured — nothing is owed) and from
   * `failed` (the provider tried and could not). A deferral is "come back
   * tomorrow", so it must keep the edition open; folding it into `skipped`
   * stamps the run complete and writes those devotees off for the week, which
   * is the whole of NOTIF-13 restored through a new door.
   */
  deferred: number;
  reason?: string;
}

/**
 * The edition a digest belongs to, as an IST calendar week.
 *
 * The per-recipient delivery claim is keyed on this, so "already got this
 * week's digest" survives a process restart and a second cron instance, while
 * next week's digest is a fresh key and goes out to everyone again.
 */
function digestEditionKey(now: Date): string {
  // IST date, then the Sunday that starts its week — the same anchor the
  // Sunday 09:00 IST window uses, so both ticks inside that hour agree.
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const sunday = new Date(ist);
  sunday.setUTCDate(ist.getUTCDate() - ist.getUTCDay());
  return `digest:${sunday.toISOString().slice(0, 10)}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isSunday9AmIst(now: Date): boolean {
  // IST = UTC+5:30. Sunday 9 AM IST = Sunday 03:30 UTC.
  const istMinutesOfWeek =
    (now.getUTCDay() * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes() + 330) %
    (7 * 24 * 60);
  const istHour = Math.floor((istMinutesOfWeek % (24 * 60)) / 60);
  const istDow = Math.floor(istMinutesOfWeek / (24 * 60)); // 0=Sun
  return istDow === 0 && istHour === 9;
}

/**
 * The instant this week's edition became due: Sunday 09:00 IST, as UTC.
 *
 * NOTIF-13, last half. The gate used to be "is it Sunday 09:00 IST" and then
 * "has it been 6 days", which locks every retry inside a single 60-minute
 * window. The thing that makes a run incomplete is the Resend 100/day cap
 * (docs/free-tier-budgets.md), and that does not reset until the next UTC day —
 * so both ticks of that hour fail on the same wall, and recipient 101 is
 * written off for the week exactly as before. Not stamping the run bought
 * nothing while the clock decided who may run.
 *
 * Keying on the edition instead makes the question answerable: this edition is
 * OWED until a completed run is stamped at or after its start, and a drain on
 * Tuesday carries the same `digestEditionKey` (also Sunday-anchored) and
 * therefore the same per-recipient delivery claims. Nobody is mailed twice; the
 * people the cap locked out are simply reached when the quota comes back.
 *
 * It also repairs a quieter loss: a Sunday the cron missed entirely used to
 * mean a skipped week, silently.
 */
function editionStartInstant(now: Date): Date {
  const istMinutesOfWeek =
    (now.getUTCDay() * 24 * 60 + now.getUTCHours() * 60 + now.getUTCMinutes() + 330) %
    (7 * 24 * 60);
  // Minutes elapsed since Sunday 09:00 IST of the CURRENT IST week.
  const sinceStart = (istMinutesOfWeek - 9 * 60 + 7 * 24 * 60) % (7 * 24 * 60);
  const startMs = now.getTime() - sinceStart * 60_000;
  // Truncate to the minute so a mid-minute `now` cannot drift the anchor.
  return new Date(startMs - (startMs % 60_000));
}

interface DigestContext {
  upcomingAartis: Array<{ templeName: string; aarti: string; whenLocal: string }>;
  newContent: Array<{ title: string; type: string; slug: string }>;
  recommendedPuja: { name: string; deity: string; slug: string; price: string } | null;
  panchang: { tithi: string; festivals: string[]; specialInfo: string | null } | null;
}

interface UserRow {
  id: string;
  email: string | null;
  fullName: string;
  gotra: string | null;
  rashi: string | null;
  preferredLanguage: string;
}

function digestEmailHtml(params: {
  user: UserRow;
  ctx: DigestContext;
  weekStartLabel: string;
  unsubscribeUrl: string;
}): { subject: string; html: string; text: string } {
  const { user, ctx, weekStartLabel, unsubscribeUrl } = params;
  const greet = `Namaste ${user.fullName.split(/\s+/)[0] ?? 'Devotee'},`;

  const aartisBlock =
    ctx.upcomingAartis.length > 0
      ? `<h2 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:#5b3a1d;">Upcoming aartis at temples you follow</h2>
         <ul style="margin:0 0 12px 18px;padding:0;">
         ${ctx.upcomingAartis
           .slice(0, 5)
           .map(
             (a) =>
               `<li style="margin:4px 0;font-size:14px;line-height:1.5;"><strong>${escapeHtml(a.aarti)}</strong> · ${escapeHtml(a.templeName)} · ${escapeHtml(a.whenLocal)}</li>`,
           )
           .join('')}
         </ul>`
      : '';

  const contentBlock =
    ctx.newContent.length > 0
      ? `<h2 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:#5b3a1d;">New this week</h2>
         <ul style="margin:0 0 12px 18px;padding:0;">
         ${ctx.newContent
           .map(
             (c) =>
               `<li style="margin:4px 0;font-size:14px;line-height:1.5;"><a href="https://darshya.online/content/${encodeURIComponent(c.slug)}" style="color:#ea580c;text-decoration:none;">${escapeHtml(c.title)}</a> · <span style="color:#999;">${escapeHtml(c.type)}</span></li>`,
           )
           .join('')}
         </ul>`
      : '';

  // NOTIF-13: the old copy read "Based on your <gotra> gotra, devotees often
  // book:" while fetchRecommendedPuja took the user and never read it — the
  // gotra branch was an empty block and the query returned the same row for
  // everybody. Claiming a personalisation we did not perform is worse than
  // offering none, for a product whose differentiator is knowing the devotee's
  // gotra and rashi. Say what this actually is until a real gotra-to-deity
  // mapping exists (owner/content call, see the note on fetchRecommendedPuja).
  const recoBlock = ctx.recommendedPuja
    ? `<h2 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:#5b3a1d;">Popular this week</h2>
       <p style="font-size:14px;line-height:1.5;margin:0 0 8px;">Devotees are booking:</p>
       <p style="font-size:14px;margin:0 0 4px;"><strong>${escapeHtml(ctx.recommendedPuja.name)}</strong> for ${escapeHtml(ctx.recommendedPuja.deity)} — ${escapeHtml(ctx.recommendedPuja.price)}</p>
       <p style="margin:8px 0 12px;"><a href="https://darshya.online/pujas/${encodeURIComponent(ctx.recommendedPuja.slug)}" style="display:inline-block;background:#ea580c;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none;font-size:13px;font-weight:500;">Book this puja</a></p>`
    : '';

  const panchangBlock = ctx.panchang
    ? `<h2 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:#5b3a1d;">Panchang highlights</h2>
       <p style="font-size:14px;line-height:1.5;margin:0 0 4px;"><strong>Today's tithi:</strong> ${escapeHtml(ctx.panchang.tithi)}</p>
       ${ctx.panchang.festivals.length > 0 ? `<p style="font-size:14px;line-height:1.5;margin:0 0 4px;"><strong>Festivals this week:</strong> ${ctx.panchang.festivals.map(escapeHtml).join(', ')}</p>` : ''}
       ${ctx.panchang.specialInfo ? `<p style="font-size:13px;color:#7a5a3a;font-style:italic;margin:4px 0 12px;">${escapeHtml(ctx.panchang.specialInfo)}</p>` : ''}`
    : '';

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fbf7f1;color:#3d2e1f;margin:0;padding:0;">
<div style="max-width:560px;margin:24px auto;padding:32px 28px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:22px;font-weight:600;color:#ea580c;margin-bottom:8px;">Darshya</div>
<p style="font-size:12px;color:#999;margin:0 0 16px;">Your weekly devotional digest · ${escapeHtml(weekStartLabel)}</p>
<h1 style="font-size:18px;font-weight:600;margin:0 0 16px;">${escapeHtml(greet)}</h1>
${aartisBlock}
${contentBlock}
${recoBlock}
${panchangBlock}
<div style="font-size:11px;color:#999;margin-top:28px;padding-top:16px;border-top:1px solid #eee;text-align:center;">
  Darshya · India's Devotional Super App<br>
  https://darshya.online · <a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe from weekly digest</a>
</div>
</div></body></html>`;

  const subject = `Your weekly Darshya digest · ${weekStartLabel}`;
  const text = [
    greet,
    '',
    'Upcoming aartis:',
    ...ctx.upcomingAartis.slice(0, 5).map((a) => `  - ${a.aarti} at ${a.templeName} (${a.whenLocal})`),
    '',
    'New content:',
    ...ctx.newContent.map((c) => `  - ${c.title} (${c.type})`),
    '',
    ctx.recommendedPuja ? `Recommended: ${ctx.recommendedPuja.name} for ${ctx.recommendedPuja.deity}` : '',
    '',
    'https://darshya.online',
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join('\n');

  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchOptOutSet(): Promise<Set<string>> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ user_id: string }[]>(
      `SELECT user_id FROM "WeeklyDigestOptOut"`,
    );
    return new Set(rows.map((r) => r.user_id));
  } catch {
    // Table missing → no one opted out yet.
    return new Set<string>();
  }
}

/** "3:00 AM IST" from a minutes-past-IST-midnight offset. */
function formatIstClock(minutes: number): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const mm = String(minutes % 60).padStart(2, '0');
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${mm} ${suffix} IST`;
}

/**
 * Every followed temple's REAL aarti windows, for a whole batch of users, in
 * ONE query.
 *
 * NOTIF-13 replaced two things here:
 *
 *  - the FABRICATION. This returned `aarti: 'Sandhya Aarti'` and
 *    `whenLocal: 'today 6:30 PM IST'` for every followed temple regardless of
 *    that temple's actual timings, while the DB holds real per-temple windows
 *    (Govind Dev Ji has 6, Shirdi 4). A devotee acting on that time misses the
 *    aarti — the one thing this email exists to prevent. Times now come from
 *    Temple.timingInfo through the same parseSchedule the darshan pages use, and
 *    a temple with no parseable aarti window contributes no row at all.
 *  - the N+1. It ran once per recipient, inside the send loop.
 *
 * TempleFollow has no `temple` relation in the Prisma schema (the table uses a
 * loose UUID column to survive temple deletions), so the join is raw SQL.
 * Best-effort: any DB hiccup yields an empty map and the section is omitted.
 */
async function fetchUpcomingAartisForBatch(
  userIds: string[],
): Promise<Map<string, DigestContext['upcomingAartis']>> {
  const out = new Map<string, DigestContext['upcomingAartis']>();
  if (userIds.length === 0) return out;
  try {
    const rows = await prisma.$queryRawUnsafe<
      { user_id: string; name: string | null; timing_info: unknown }[]
    >(
      `SELECT tf.user_id, t.name, t.timing_info
         FROM temple_follows tf
         LEFT JOIN temples t ON t.id = tf.temple_id
        WHERE tf.user_id = ANY($1::uuid[])
        ORDER BY tf.created_at DESC`,
      userIds,
    );
    for (const r of rows) {
      const list = out.get(r.user_id) ?? [];
      out.set(r.user_id, list);
      if (list.length >= 5) continue;
      const aartis = parseSchedule(r.timing_info)
        .filter((sl) => sl.isAarti)
        .slice(0, 2);
      for (const sl of aartis) {
        if (list.length >= 5) break;
        list.push({
          templeName: r.name ?? 'Your followed temple',
          aarti: sl.label,
          whenLocal: `daily at ${formatIstClock(sl.start)}`,
        });
      }
    }
  } catch {
    return new Map();
  }
  return out;
}

async function fetchNewContent(): Promise<DigestContext['newContent']> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const items = await prisma.contentItem.findMany({
      where: {
        status: 'published',
        publishedAt: { gte: sevenDaysAgo },
      },
      orderBy: { publishedAt: 'desc' },
      take: 3,
      select: { title: true, type: true, slug: true },
    });
    return items.map((c) => ({ title: c.title, type: String(c.type), slug: c.slug }));
  } catch {
    return [];
  }
}

/**
 * The one puja this week's digest promotes.
 *
 * NOTIF-13: this took `user` and never read it. The gotra branch was an empty
 * block with a comment, and the query was `findFirst({isActive:true},
 * orderBy:sortOrder)` — identical for every recipient — so N identical queries
 * returned one identical row while the email claimed the result was personal.
 * It is now what it always was: ONE query for the whole run, honestly labelled
 * "Popular this week" in the template.
 *
 * A real gotra-to-deity mapping is a content decision (which rishi lineage maps
 * to which deity, and which puja follows from it) that belongs to the owner, not
 * to this function inventing one. Until that exists, no personalisation is
 * claimed.
 */
async function fetchRecommendedPuja(): Promise<DigestContext['recommendedPuja']> {
  try {
    const puja = await prisma.pujaType.findFirst({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { name: true, deity: true, slug: true, basePrice: true },
    });
    if (!puja) return null;
    return {
      name: puja.name,
      deity: puja.deity,
      slug: puja.slug,
      price: `₹${Number(puja.basePrice).toLocaleString('en-IN')}`,
    };
  } catch {
    return null;
  }
}

async function fetchPanchang(): Promise<DigestContext['panchang']> {
  try {
    const p = await panchangService.getToday();
    if (!p) return null;
    const pp = p as {
      tithi: string;
      festivals?: string[];
      specialInfo?: string | null;
    };
    return {
      tithi: pp.tithi,
      festivals: pp.festivals ?? [],
      specialInfo: pp.specialInfo ?? null,
    };
  } catch {
    return null;
  }
}

export async function runWeeklyDigest(): Promise<WeeklyDigestResult> {
  if (!process.env.RESEND_API_KEY) {
    return { sent: 0, skipped: 0, failed: 0, alreadyDelivered: 0, deferred: 0, reason: 'RESEND_API_KEY not set' };
  }

  const optOut = await fetchOptOutSet();
  const newContent = await fetchNewContent();
  const panchang = await fetchPanchang();
  // Shared across every recipient — hoisted out of the per-user loop, which is
  // what made the job 1+2N queries (20,001 at 10,000 users).
  const recommendedPuja = await fetchRecommendedPuja();

  const weekStartLabel = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let alreadyDelivered = 0;
  let deferred = 0;
  let cursor: string | null = null;
  const edition = digestEditionKey(new Date());

  while (true) {
    let batch: UserRow[];
    try {
      batch = await prisma.user.findMany({
        where: { email: { not: null } },
        orderBy: { id: 'asc' },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          email: true,
          fullName: true,
          gotra: true,
          rashi: true,
          preferredLanguage: true,
        },
      });
    } catch {
      return { sent, skipped, failed, alreadyDelivered, deferred, reason: 'user query failed' };
    }
    if (batch.length === 0) break;

    // One join for the whole batch instead of one per recipient.
    const aartisByUser = await fetchUpcomingAartisForBatch(batch.map((u) => u.id));

    for (const user of batch) {
      if (!user.email) {
        skipped++;
        continue;
      }
      if (optOut.has(user.id)) {
        skipped++;
        continue;
      }

      const ctx: DigestContext = {
        upcomingAartis: aartisByUser.get(user.id) ?? [],
        newContent,
        recommendedPuja,
        panchang,
      };

      // NOTIF-13: claim this recipient for this edition BEFORE sending.
      //
      // Not stamping WeeklyDigestRun after a partial run is what lets the job
      // retry at all — but without a per-recipient claim that retry restarts
      // from user #1. On a list larger than the 100/day Resend cap that means
      // the first hundred are emailed the identical digest again on every tick
      // and every following Sunday, while recipient 101 is never reached,
      // because each retry burns the day's quota on people who already have it.
      //
      // The claim is durable and atomic (INSERT … ON CONFLICT DO NOTHING), so
      // two cron instances in the same window cannot both send, and it degrades
      // to in-process dedupe when the table is unavailable — the same contract
      // aarti-notify relies on.
      const claimKey = `${edition}:${user.id}`;
      if (!(await claimRun(claimKey))) {
        alreadyDelivered++;
        continue;
      }

      const unsubscribeUrl = `https://darshya.online/account/digest/unsubscribe?u=${encodeURIComponent(user.id)}`;
      const tpl = digestEmailHtml({ user, ctx, weekStartLabel, unsubscribeUrl });

      try {
        const r = await sendEmail({
          to: user.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
          // SCAL-11: the digest is bulk. It gets the day's allowance down to the
          // transactional reserve and no further, so a Sunday fan-out to a list
          // larger than the Resend cap can no longer eat the booking receipt
          // and 80G certificate budget of everyone who books that day.
          kind: 'bulk',
        });
        if (r.ok) {
          sent++;
        } else if (r.deferred) {
          // The budget said "not today". Nothing was attempted and the devotee
          // is still owed this edition: release the claim so the drain
          // (NOTIF-13) reaches them once the day rolls over, and keep the run
          // unstamped so the drain is allowed to happen at all.
          deferred++;
          await releaseRun(claimKey);
        } else if (r.skipped) {
          // The channel is unconfigured — nothing was attempted, so the claim
          // must go back or the recipient is permanently marked as handled for
          // an edition they were never sent.
          skipped++;
          await releaseRun(claimKey);
        } else {
          failed++;
          await releaseRun(claimKey);
        }
      } catch {
        failed++;
        await releaseRun(claimKey);
      }
      await sleep(SEND_RATE_MS);
    }

    cursor = batch[batch.length - 1]!.id;
    if (batch.length < BATCH_SIZE) break;
  }

  // Persist run metadata for master-cron gating.
  //
  // NOTIF-13: this stamped UNCONDITIONALLY, and maybeRunWeeklyDigest enforces a
  // 6-day cooldown off the row. So the moment the Resend free-tier cap (100/day,
  // docs/free-tier-budgets.md) started answering ok:false, recipients 101+ were
  // counted as `failed`, never retried, and written off for a week — no
  // dead-letter, and nothing in the product aware of it. A run that did not
  // reach everyone is not a completed run: leave the stamp alone so the next
  // tick tries again. `skipped` (opted out, no address, or the channel being
  // unconfigured) is NOT a failure and must never block the stamp forever.
  if (failed > 0 || deferred > 0) {
    console.warn(
      '[weekly-digest][INCOMPLETE]',
      JSON.stringify({ sent, skipped, failed, deferred, note: 'run not stamped; will retry next tick' }),
    );
    return {
      sent,
      skipped,
      failed,
      alreadyDelivered,
      deferred,
      reason: 'incomplete run - not stamped, will retry',
    };
  }

  try {
    await prisma.$executeRawUnsafe(
      `INSERT INTO "WeeklyDigestRun" (id, last_run_at, last_sent, last_skipped)
       VALUES (1, NOW(), $1, $2)
       ON CONFLICT (id) DO UPDATE SET last_run_at = EXCLUDED.last_run_at,
                                       last_sent = EXCLUDED.last_sent,
                                       last_skipped = EXCLUDED.last_skipped`,
      sent,
      skipped,
    );
  } catch {
    // best-effort — migration may be pending
  }

  return { sent, skipped, failed, alreadyDelivered, deferred };
}

/**
 * Cron-gated wrapper. Runs only when (a) we're in the Sunday 09:00 IST
 * window and (b) at least 6 days have elapsed since the last run.
 * Returns `{skipped:true, reason}` when gated.
 */
export async function maybeRunWeeklyDigest(
  opts: { force?: boolean; now?: Date } = {},
): Promise<WeeklyDigestResult & { gated?: boolean }> {
  const now = opts.now ?? new Date();
  if (opts.force) return runWeeklyDigest();

  // Has THIS edition already been delivered in full? `WeeklyDigestRun` is
  // stamped only by a run that reached everyone (failed === 0), so a stamp at
  // or after the edition start is the one durable proof that nothing is owed.
  const editionStart = editionStartInstant(now);
  let stampedThisEdition = false;
  try {
    const rows = await prisma.$queryRawUnsafe<{ last_run_at: Date | null }[]>(
      `SELECT last_run_at FROM "WeeklyDigestRun" WHERE id = 1`,
    );
    const last = rows[0]?.last_run_at;
    stampedThisEdition = !!last && new Date(last).getTime() >= editionStart.getTime();
  } catch {
    // Table missing → treat the edition as unstamped and let the send window
    // decide, which is the pre-existing behaviour for a fresh database.
  }

  if (stampedThisEdition) {
    return {
      sent: 0,
      skipped: 0,
      failed: 0,
      alreadyDelivered: 0,
      deferred: 0,
      gated: true,
      reason: 'this week\'s edition already completed',
    };
  }

  // Unstamped. Send inside the Sunday 09:00 IST window as always — and, on any
  // later tick of the SAME edition, drain what the window could not finish.
  // Both paths share `digestEditionKey`, so a recipient already claimed on
  // Sunday is skipped here rather than mailed a second time.
  if (!isSunday9AmIst(now)) {
    if (now.getTime() < editionStart.getTime()) {
      // Cannot happen with the anchor above (sinceStart is never negative), but
      // an edition that has not begun must never send early.
      return {
        sent: 0,
        skipped: 0,
        failed: 0,
        alreadyDelivered: 0,
        deferred: 0,
        gated: true,
        reason: 'edition has not started',
      };
    }
    console.warn(
      '[weekly-digest][DRAIN]',
      JSON.stringify({
        editionStart: editionStart.toISOString(),
        note: 'edition unfinished; resuming outside the Sunday window',
      }),
    );
  }

  return runWeeklyDigest();
}

export const __testing = {
  isSunday9AmIst,
  digestEmailHtml,
  escapeHtml,
};
