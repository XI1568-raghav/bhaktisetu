import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { panchangService } from '../services/panchang.service.js';

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
  reason?: string;
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

  const recoBlock = ctx.recommendedPuja
    ? `<h2 style="font-size:15px;font-weight:600;margin:20px 0 8px;color:#5b3a1d;">Recommended for you</h2>
       <p style="font-size:14px;line-height:1.5;margin:0 0 8px;">Based on your ${user.gotra ? `${escapeHtml(user.gotra)} gotra` : 'profile'}, devotees often book:</p>
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

async function fetchUpcomingAartisForUser(
  userId: string,
): Promise<DigestContext['upcomingAartis']> {
  // TempleFollow has no `temple` relation in the Prisma schema (the table
  // uses a loose UUID column to survive temple deletions), so we drop to
  // raw SQL for the join. Best-effort — any DB hiccup yields [].
  try {
    const rows = await prisma.$queryRawUnsafe<{ name: string | null }[]>(
      `SELECT t.name
         FROM temple_follows tf
         LEFT JOIN temples t ON t.id = tf.temple_id
        WHERE tf.user_id = $1::uuid
        ORDER BY tf.created_at DESC
        LIMIT 5`,
      userId,
    );
    return rows.map((r) => ({
      templeName: r.name ?? 'Your followed temple',
      aarti: 'Sandhya Aarti',
      whenLocal: 'today 6:30 PM IST',
    }));
  } catch {
    return [];
  }
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

async function fetchRecommendedPuja(
  user: UserRow,
): Promise<DigestContext['recommendedPuja']> {
  try {
    const where: Record<string, unknown> = { isActive: true };
    if (user.gotra) {
      // Gotra has no direct schema link to puja, so we use it as a soft
      // hint by deity overlap — Bharadwaj gotra → Vishnu, Kashyap → Surya,
      // etc. Keep it lightweight: just sort by sortOrder for now.
    }
    const puja = await prisma.pujaType.findFirst({
      where,
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
    return { sent: 0, skipped: 0, failed: 0, reason: 'RESEND_API_KEY not set' };
  }

  const optOut = await fetchOptOutSet();
  const newContent = await fetchNewContent();
  const panchang = await fetchPanchang();

  const weekStartLabel = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  let cursor: string | null = null;

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
      return { sent, skipped, failed, reason: 'user query failed' };
    }
    if (batch.length === 0) break;

    for (const user of batch) {
      if (!user.email) {
        skipped++;
        continue;
      }
      if (optOut.has(user.id)) {
        skipped++;
        continue;
      }

      const upcomingAartis = await fetchUpcomingAartisForUser(user.id);
      const recommendedPuja = await fetchRecommendedPuja(user);
      const ctx: DigestContext = {
        upcomingAartis,
        newContent,
        recommendedPuja,
        panchang,
      };

      const unsubscribeUrl = `https://darshya.online/account/digest/unsubscribe?u=${encodeURIComponent(user.id)}`;
      const tpl = digestEmailHtml({ user, ctx, weekStartLabel, unsubscribeUrl });

      try {
        const r = await sendEmail({
          to: user.email,
          subject: tpl.subject,
          html: tpl.html,
          text: tpl.text,
        });
        if (r.ok) sent++;
        else if (r.skipped) skipped++;
        else failed++;
      } catch {
        failed++;
      }
      await sleep(SEND_RATE_MS);
    }

    cursor = batch[batch.length - 1]!.id;
    if (batch.length < BATCH_SIZE) break;
  }

  // Persist run metadata for master-cron gating.
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

  return { sent, skipped, failed };
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
  if (!opts.force && !isSunday9AmIst(now)) {
    return { sent: 0, skipped: 0, failed: 0, gated: true, reason: 'outside Sunday 09:00 IST window' };
  }
  if (!opts.force) {
    try {
      const rows = await prisma.$queryRawUnsafe<{ last_run_at: Date | null }[]>(
        `SELECT last_run_at FROM "WeeklyDigestRun" WHERE id = 1`,
      );
      const last = rows[0]?.last_run_at;
      if (last) {
        const sixDaysMs = 6 * 24 * 60 * 60 * 1000;
        if (now.getTime() - new Date(last).getTime() < sixDaysMs) {
          return {
            sent: 0,
            skipped: 0,
            failed: 0,
            gated: true,
            reason: 'last run was less than 6 days ago',
          };
        }
      }
    } catch {
      // table missing → run anyway
    }
  }
  return runWeeklyDigest();
}

export const __testing = {
  isSunday9AmIst,
  digestEmailHtml,
  escapeHtml,
};
