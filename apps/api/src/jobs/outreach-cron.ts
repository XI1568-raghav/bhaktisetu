import { prisma } from '../lib/prisma.js';
import {
  sendEmail,
  sendWhatsApp,
  recordOutreach,
  incrementContactCount,
  firstTouchTemplateKey,
  followupTemplateKey,
} from '../services/outreach.service.js';
import type { Lead } from '@prisma/client';

/**
 * Outreach cron tick. Runs every 30 minutes via /api/v1/admin/outreach/run
 * (Render free tier has no built-in cron — invoked by GitHub Actions or
 * external scheduler).
 *
 * Per tick:
 *   1. Pick up to 50 NEW leads → first-touch email + flip to EMAILED.
 *   2. Pick EMAILED leads where lastContactedAt < 3 days ago AND no 3day
 *      follow-up logged yet → 3-day follow-up.
 *   3. Pick EMAILED leads where lastContactedAt < 7 days ago AND
 *      contactCount < 3 AND no 7day follow-up logged yet → 7-day follow-up.
 *
 * Rate limit: 50 first-touch / tick = ~100 emails/hr at 30min cadence.
 * Resend free tier is 3000/mo — comfortably under.
 */

const FIRST_TOUCH_BATCH = 50;
const FOLLOWUP_BATCH = 50;
const MAX_CONTACT_COUNT = 3;

export interface OutreachTickResult {
  firstTouch: { attempted: number; ok: number; failed: number };
  followup3day: { attempted: number; ok: number; failed: number };
  followup7day: { attempted: number; ok: number; failed: number };
  durationMs: number;
}

async function alreadySent(leadId: string, templateKey: string): Promise<boolean> {
  const existing = await prisma.outreachLog.findFirst({
    where: { leadId, templateKey, status: { in: ['SENT', 'DELIVERED', 'OPENED', 'REPLIED'] } },
    select: { id: true },
  });
  return !!existing;
}

async function sendFirstTouch(lead: Lead): Promise<{ ok: boolean; error?: string }> {
  const templateKey = firstTouchTemplateKey(lead.role);
  // Skip excluded roles — none currently excluded, but kept for future.
  if (!templateKey) return { ok: false, error: 'no template for role' };

  // Email first
  const emailResult = await sendEmail({ lead, templateKey, language: 'hi' });
  if (emailResult.ok) {
    await recordOutreach({
      leadId: lead.id,
      channel: 'EMAIL',
      templateKey,
      status: 'SENT',
      payload: { providerId: emailResult.id },
    });
  } else if (!emailResult.skipped) {
    await recordOutreach({
      leadId: lead.id,
      channel: 'EMAIL',
      templateKey,
      status: 'FAILED',
      error: emailResult.error,
    });
  }

  // WhatsApp (best-effort, not required)
  if (lead.whatsappNumber || lead.phone) {
    const waResult = await sendWhatsApp({ lead, templateKey });
    if (waResult.ok) {
      await recordOutreach({
        leadId: lead.id,
        channel: 'WHATSAPP',
        templateKey,
        status: 'SENT',
        payload: { providerId: waResult.id },
      });
    } else if (!waResult.skipped) {
      await recordOutreach({
        leadId: lead.id,
        channel: 'WHATSAPP',
        templateKey,
        status: 'FAILED',
        error: waResult.error,
      });
    }
  }

  await incrementContactCount(lead.id);
  await prisma.lead.update({
    where: { id: lead.id },
    data: { status: 'EMAILED' },
  });
  return { ok: emailResult.ok || !!emailResult.skipped };
}

async function sendFollowup(lead: Lead, days: 3 | 7): Promise<{ ok: boolean; error?: string }> {
  const templateKey = followupTemplateKey(lead.role, days);
  if (await alreadySent(lead.id, templateKey)) {
    return { ok: true };
  }
  const result = await sendEmail({ lead, templateKey, language: 'hi' });
  if (result.ok) {
    await recordOutreach({
      leadId: lead.id,
      channel: 'EMAIL',
      templateKey,
      status: 'SENT',
      payload: { providerId: result.id },
    });
    await incrementContactCount(lead.id);
    return { ok: true };
  }
  if (result.skipped) return { ok: true };
  await recordOutreach({
    leadId: lead.id,
    channel: 'EMAIL',
    templateKey,
    status: 'FAILED',
    error: result.error,
  });
  return { ok: false, error: result.error };
}

export async function runOutreachTick(): Promise<OutreachTickResult> {
  const t0 = Date.now();
  const result: OutreachTickResult = {
    firstTouch: { attempted: 0, ok: 0, failed: 0 },
    followup3day: { attempted: 0, ok: 0, failed: 0 },
    followup7day: { attempted: 0, ok: 0, failed: 0 },
    durationMs: 0,
  };

  // ── 1. First touch ─────────────────────────────────────────────────
  const newLeads = await prisma.lead.findMany({
    where: {
      status: 'NEW',
      email: { not: null },
    },
    take: FIRST_TOUCH_BATCH,
    orderBy: { createdAt: 'asc' },
  });
  for (const lead of newLeads) {
    result.firstTouch.attempted++;
    const r = await sendFirstTouch(lead);
    if (r.ok) result.firstTouch.ok++;
    else result.firstTouch.failed++;
  }

  // ── 2. 3-day follow-up ─────────────────────────────────────────────
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const followup3Leads = await prisma.lead.findMany({
    where: {
      status: 'EMAILED',
      lastContactedAt: { lt: threeDaysAgo, gt: sevenDaysAgo },
      contactCount: { lt: MAX_CONTACT_COUNT },
      email: { not: null },
    },
    take: FOLLOWUP_BATCH,
    orderBy: { lastContactedAt: 'asc' },
  });
  for (const lead of followup3Leads) {
    result.followup3day.attempted++;
    const r = await sendFollowup(lead, 3);
    if (r.ok) result.followup3day.ok++;
    else result.followup3day.failed++;
  }

  // ── 3. 7-day follow-up ─────────────────────────────────────────────
  const followup7Leads = await prisma.lead.findMany({
    where: {
      status: 'EMAILED',
      lastContactedAt: { lt: sevenDaysAgo },
      contactCount: { lt: MAX_CONTACT_COUNT },
      email: { not: null },
    },
    take: FOLLOWUP_BATCH,
    orderBy: { lastContactedAt: 'asc' },
  });
  for (const lead of followup7Leads) {
    result.followup7day.attempted++;
    const r = await sendFollowup(lead, 7);
    if (r.ok) result.followup7day.ok++;
    else result.followup7day.failed++;
  }

  result.durationMs = Date.now() - t0;
  return result;
}
