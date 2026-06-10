import { randomUUID } from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  sendEmail,
  sendWhatsApp,
  recordOutreach,
  incrementContactCount,
  firstTouchTemplateKey,
  followupTemplateKey,
} from '../services/outreach.service.js';
import { generateText } from '../integrations/claude.js';
import type { Lead } from '@prisma/client';

/**
 * Generate a one-sentence personalized opener via Groq. Returns '' if the AI
 * provider is unavailable or the call fails — templates render fine without it.
 */
async function generatePersonalizedOpener(lead: Lead): Promise<string> {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === 'demo-key') {
    return '';
  }
  try {
    const systemPrompt =
      'You write one-sentence personalized openers for B2B cold emails to Indian devotional service providers. Output only the sentence, no quotes, no preamble. Max 20 words. Reference the city\'s devotional culture or notable temples briefly.';
    const userMessage = `Recipient name: ${lead.name}\nCity: ${lead.city ?? 'India'}\nRole: ${lead.role}\n\nWrite the one-sentence opener.`;
    const text = await generateText({ systemPrompt, userMessage, maxTokens: 80 });
    return text.trim().replace(/^["']|["']$/g, '').slice(0, 280);
  } catch {
    return '';
  }
}

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
const MAX_CONTACT_COUNT = 5;

// Resend free tier limits:
// - 2 requests/sec → throttle to 600ms between sends (1.67/sec, headroom)
// - 100 emails/day → cap at 90 (buffer for transactional emails like booking
//   confirmations + 80G receipts which share the daily quota)
// To raise these, upgrade Resend ($20/mo gets 50K/mo + 10/sec) and set
// `RESEND_TIER=pro` env var which lifts both limits.
const RESEND_THROTTLE_MS = process.env.RESEND_TIER === 'pro' ? 100 : 600;
const RESEND_DAILY_CAP = process.env.RESEND_TIER === 'pro' ? 5000 : 90;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureSendCounterTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS resend_daily_counter (
      day DATE PRIMARY KEY,
      sent_count INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `).catch(() => undefined);
}

async function getTodaySendCount(): Promise<number> {
  await ensureSendCounterTable();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.$queryRawUnsafe<Array<{ sent_count: number }>>(
    `SELECT sent_count FROM resend_daily_counter WHERE day = $1::date LIMIT 1`,
    today,
  );
  return rows[0]?.sent_count ?? 0;
}

async function bumpTodaySendCount(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await prisma.$executeRawUnsafe(
    `INSERT INTO resend_daily_counter (day, sent_count) VALUES ($1::date, 1)
     ON CONFLICT (day) DO UPDATE SET sent_count = resend_daily_counter.sent_count + 1, updated_at = now()`,
    today,
  ).catch(() => undefined);
}

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

  const personalizedOpener = await generatePersonalizedOpener(lead);

  // Email first. Pre-generate the OutreachLog id so click + open tracking
  // links can reference it before the row is written.
  const emailLogId = randomUUID();
  const emailResult = await sendEmail({
    lead,
    templateKey,
    language: 'hi',
    variables: { personalizedOpener },
    logId: emailLogId,
  });
  if (emailResult.ok) {
    await recordOutreach({
      id: emailLogId,
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
    const waResult = await sendWhatsApp({
      lead,
      templateKey,
      variables: { personalizedOpener },
    });
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
  const followupLogId = randomUUID();
  const result = await sendEmail({ lead, templateKey, language: 'hi', logId: followupLogId });
  if (result.ok) {
    await recordOutreach({
      id: followupLogId,
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

  // Resend daily quota check. If today's sends already at cap, skip entirely
  // — preserves headroom for transactional booking confirmation + 80G receipt
  // emails which share the same Resend account quota.
  const sentToday = await getTodaySendCount();
  if (sentToday >= RESEND_DAILY_CAP) {
    result.durationMs = Date.now() - t0;
    return result;
  }
  const remaining = () => Math.max(0, RESEND_DAILY_CAP - sentToday - result.firstTouch.ok - result.followup3day.ok - result.followup7day.ok);

  async function throttledSend<T>(fn: () => Promise<T>, ok: () => void): Promise<T> {
    const out = await fn();
    // Bump counter only on success (any send returning ok=true)
    if (out && (out as { ok?: boolean }).ok) {
      await bumpTodaySendCount();
      ok();
    }
    await sleep(RESEND_THROTTLE_MS);
    return out;
  }

  // ── 1. First touch ─────────────────────────────────────────────────
  const newLeads = await prisma.lead.findMany({
    where: {
      status: 'NEW',
      email: { not: null },
    },
    take: Math.min(FIRST_TOUCH_BATCH, remaining()),
    orderBy: { createdAt: 'asc' },
  });
  for (const lead of newLeads) {
    if (remaining() <= 0) break;
    result.firstTouch.attempted++;
    const r = await throttledSend(() => sendFirstTouch(lead), () => result.firstTouch.ok++);
    if (!r.ok) result.firstTouch.failed++;
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
    take: Math.min(FOLLOWUP_BATCH, remaining()),
    orderBy: { lastContactedAt: 'asc' },
  });
  for (const lead of followup3Leads) {
    if (remaining() <= 0) break;
    result.followup3day.attempted++;
    const r = await throttledSend(() => sendFollowup(lead, 3), () => result.followup3day.ok++);
    if (!r.ok) result.followup3day.failed++;
  }

  // ── 3. 7-day follow-up ─────────────────────────────────────────────
  const followup7Leads = await prisma.lead.findMany({
    where: {
      status: 'EMAILED',
      lastContactedAt: { lt: sevenDaysAgo },
      contactCount: { lt: MAX_CONTACT_COUNT },
      email: { not: null },
    },
    take: Math.min(FOLLOWUP_BATCH, remaining()),
    orderBy: { lastContactedAt: 'asc' },
  });
  for (const lead of followup7Leads) {
    if (remaining() <= 0) break;
    result.followup7day.attempted++;
    const r = await throttledSend(() => sendFollowup(lead, 7), () => result.followup7day.ok++);
    if (!r.ok) result.followup7day.failed++;
  }

  result.durationMs = Date.now() - t0;
  return result;
}
