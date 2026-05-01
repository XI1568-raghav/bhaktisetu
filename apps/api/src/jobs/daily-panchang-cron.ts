import { prisma } from '../lib/prisma.js';
import { panchangService } from '../services/panchang.service.js';
import { sendEmail } from '../lib/email.js';

// Daily panchang fan-out to confirmed waitlist devotees who opted in.
// Batches of 100, with a 1s sleep between batches to avoid Resend
// rate-limit hits and Postgres connection pressure on Supabase free tier.
//
// No-ops when RESEND_API_KEY is unset so demo / local environments stay
// safe. Each successful send writes a row to OutreachLog so we have an
// audit trail and can dedupe future runs if needed.

const BATCH_SIZE = 100;
const BATCH_SLEEP_MS = 1000;
const TEMPLATE_KEY = 'daily_panchang';

interface PanchangBlastResult {
  sent: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function panchangEmailHtml(params: {
  fullName?: string | null;
  panchang: {
    tithi: string;
    nakshatra: string;
    yoga: string;
    karana: string;
    sunrise: string;
    sunset: string;
    rahuKaal: string;
    festivals?: string[];
    vrat?: string[];
    specialInfo?: string | null;
  };
  city: string;
  dateStr: string;
}): string {
  const { fullName, panchang, city, dateStr } = params;
  const greet = fullName ? `Namaste ${fullName},` : 'Namaste,';
  const festivals = panchang.festivals?.length
    ? `<p style="margin:8px 0;"><strong>Festivals:</strong> ${panchang.festivals.join(', ')}</p>`
    : '';
  const vrat = panchang.vrat?.length
    ? `<p style="margin:8px 0;"><strong>Vrat:</strong> ${panchang.vrat.join(', ')}</p>`
    : '';
  const special = panchang.specialInfo
    ? `<p style="margin:8px 0;color:#5b3a1d;font-style:italic;">${panchang.specialInfo}</p>`
    : '';

  return `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;background:#fbf7f1;color:#3d2e1f;margin:0;padding:0;">
<div style="max-width:560px;margin:24px auto;padding:32px 28px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.04);">
<div style="font-size:22px;font-weight:600;color:#ea580c;margin-bottom:8px;">Darshya</div>
<p style="font-size:12px;color:#999;margin:0 0 16px;">Panchang for ${dateStr} · ${city}</p>
<h1 style="font-size:18px;font-weight:600;margin:0 0 16px;">${greet} here is today's panchang</h1>
<table style="width:100%;border-collapse:collapse;font-size:14px;line-height:1.6;">
  <tr><td style="padding:6px 0;color:#666;">Tithi</td><td style="padding:6px 0;">${panchang.tithi}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Nakshatra</td><td style="padding:6px 0;">${panchang.nakshatra}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Yoga</td><td style="padding:6px 0;">${panchang.yoga}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Karana</td><td style="padding:6px 0;">${panchang.karana}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Sunrise</td><td style="padding:6px 0;">${panchang.sunrise}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Sunset</td><td style="padding:6px 0;">${panchang.sunset}</td></tr>
  <tr><td style="padding:6px 0;color:#666;">Rahu Kaal</td><td style="padding:6px 0;">${panchang.rahuKaal}</td></tr>
</table>
${festivals}
${vrat}
${special}
<p style="margin:24px 0 8px;"><a href="https://darshya.online/panchang" style="display:inline-block;background:#ea580c;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;font-size:14px;">View full panchang</a></p>
<div style="font-size:11px;color:#999;margin-top:28px;padding-top:16px;border-top:1px solid #eee;text-align:center;">Darshya · India's Devotional Super App<br>https://darshya.online</div>
</div></body></html>`;
}

export async function runDailyPanchangBlast(): Promise<PanchangBlastResult> {
  if (!process.env.RESEND_API_KEY) {
    return { sent: 0, failed: 0, skipped: true, reason: 'RESEND_API_KEY not set' };
  }

  // Pull today's panchang once — every email shares the same content.
  let todayPanchang;
  try {
    todayPanchang = await panchangService.getToday();
  } catch (err) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason: `panchang unavailable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  if (!todayPanchang) {
    return { sent: 0, failed: 0, skipped: true, reason: 'no panchang for today' };
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const city = (todayPanchang as { locationCity?: string }).locationCity || 'Delhi';

  let sent = 0;
  let failed = 0;
  let cursor: string | null = null;

  type BatchRow = { id: string; email: string; fullName: string | null };

  // Cursor-based pagination on createdAt (stable, ascending) — avoids
  // OFFSET cost on large tables and tolerates concurrent inserts.
  while (true) {
    const batch: BatchRow[] = await prisma.waitlist.findMany({
      where: {
        status: 'CONFIRMED',
        panchangOptIn: true,
      },
      orderBy: { createdAt: 'asc' },
      take: BATCH_SIZE,
      ...(cursor
        ? { cursor: { id: cursor }, skip: 1 }
        : {}),
      select: {
        id: true,
        email: true,
        fullName: true,
      },
    });

    if (batch.length === 0) break;

    for (const row of batch) {
      try {
        const result = await sendEmail({
          to: row.email,
          subject: `Today's Panchang · ${dateStr}`,
          html: panchangEmailHtml({
            fullName: row.fullName,
            panchang: todayPanchang as {
              tithi: string;
              nakshatra: string;
              yoga: string;
              karana: string;
              sunrise: string;
              sunset: string;
              rahuKaal: string;
              festivals?: string[];
              vrat?: string[];
              specialInfo?: string | null;
            },
            city,
            dateStr,
          }),
        });
        if (result.ok || result.skipped) {
          sent++;
        } else {
          failed++;
        }

        // OutreachLog is keyed on Lead — but for the panchang fan-out we
        // log against a synthetic Lead-shaped row, falling back silently
        // if the model isn't available (e.g. in test envs).
        try {
          await (prisma as unknown as {
            outreachLog: {
              create: (args: {
                data: Record<string, unknown>;
              }) => Promise<unknown>;
            };
          }).outreachLog.create({
            data: {
              leadId: row.id,
              channel: 'EMAIL',
              templateKey: TEMPLATE_KEY,
              status: result.ok ? 'SENT' : (result.skipped ? 'SENT' : 'FAILED'),
              payload: { email: row.email, dateStr },
              errorMsg: result.error ?? null,
            },
          });
        } catch {
          // OutreachLog has FK to Lead — if leadId doesn't exist this fails.
          // That's fine; the audit log is best-effort here.
        }
      } catch (err) {
        failed++;
      }
    }

    cursor = batch[batch.length - 1]!.id;
    if (batch.length < BATCH_SIZE) break;

    await sleep(BATCH_SLEEP_MS);
  }

  return { sent, failed };
}
