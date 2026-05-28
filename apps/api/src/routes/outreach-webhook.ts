import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { generateText } from '../integrations/claude.js';
import {
  recordOutreach,
  outreachConfig,
} from '../services/outreach.service.js';
import { sendEmail as sendRawEmail } from '../lib/email.js';
import { runOutreachTick } from '../jobs/outreach-cron.js';
import { sendOpsAlert } from '../lib/alert.js';

/**
 * Inbound reply + unsubscribe + admin-trigger routes.
 *
 *   POST /api/v1/outreach/reply-webhook  — Resend inbound parse webhook (legacy alias)
 *   POST /api/v1/outreach/inbound        — Resend inbound parse webhook (current)
 *   GET  /api/v1/outreach/unsubscribe    — One-click unsub (CAN-SPAM / IT Rules 2021)
 *   POST /api/v1/outreach/unsubscribe    — RFC 8058 one-click POST
 *   POST /api/v1/admin/outreach/run      — Manual cron tick (admin only)
 *   POST /api/v1/outreach/bounce-webhook — Resend bounce webhook
 *
 * Inbound replies run through a Groq classifier (with regex fallback) into
 * one of: INTERESTED, NEEDS_INFO, UNSUBSCRIBE, SPAM, OUT_OF_OFFICE. The
 * `classifiedIntent` is persisted in OutreachLog.payload (no schema change
 * needed — the column is JSON). Lead.status is updated for INTERESTED /
 * NEEDS_INFO (→ REPLIED) and UNSUBSCRIBE (→ UNSUBSCRIBED); SPAM and
 * OUT_OF_OFFICE leave status untouched. INTERESTED also pings ADMIN_EMAILS.
 *
 * Every external call is wrapped — the webhook ALWAYS returns 200 (Resend
 * retries on 5xx and we don't want loops).
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'outreach');

const POSITIVE_INTENT = /\b(interested|join|onboard|register|connect|sign\s*up|tell\s*me\s*more|count me in)\b|कैसे|जोड़ें|रुचि|जुड़ना|ज्वाइन/i;
const NEGATIVE_INTENT = /\b(unsubscribe|stop|remove|opt[-\s]?out|no\s+thanks|not interested)\b|बंद|हटा|मना/i;
const OOO_INTENT = /\b(out of office|out-of-office|on (vacation|leave|holiday)|annual leave|away from (?:my )?desk|will be back|automatic reply|auto[-\s]?reply)\b/i;

const CALENDAR_LINK = process.env.OUTREACH_CALENDAR_URL ?? 'https://cal.com/darshya/intro';

type IntentLabel = 'INTERESTED' | 'NEEDS_INFO' | 'UNSUBSCRIBE' | 'SPAM' | 'OUT_OF_OFFICE';

const VALID_INTENTS: ReadonlySet<IntentLabel> = new Set([
  'INTERESTED',
  'NEEDS_INFO',
  'UNSUBSCRIBE',
  'SPAM',
  'OUT_OF_OFFICE',
]);

// ─── Reply payload schema (Resend inbound) ──────────────────────────────
//
// Resend's inbound webhook posts `from` as either a plain string or a
// `{ email, name }` object. We accept both shapes — anything else falls
// through to undefined.

const fromSchema = z.union([
  z.string(),
  z.object({ email: z.string().optional(), name: z.string().optional() }).passthrough(),
]);

const replySchema = z.object({
  from: fromSchema.optional(),
  to: z.union([z.string(), z.array(z.string())]).optional(),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  // Resend inbound includes a `headers` array
  headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  // Optional explicit lead id when sender provides X-Darshya-Lead header
  leadId: z.string().uuid().optional(),
});

function fromToString(from: z.infer<typeof fromSchema> | undefined): string | undefined {
  if (!from) return undefined;
  if (typeof from === 'string') return from;
  return from.email ?? from.name;
}

function fromToEmail(from: z.infer<typeof fromSchema> | undefined): string | null {
  if (!from) return null;
  if (typeof from === 'string') {
    const m = from.match(/<?([\w.+-]+@[\w.-]+)>?/);
    return m && m[1] ? m[1].toLowerCase() : null;
  }
  return (from.email ?? null)?.toLowerCase() ?? null;
}

function extractLeadIdFromHeaders(
  headers: Array<{ name: string; value: string }> | undefined,
  text: string,
  html: string,
): string | null {
  if (headers) {
    const h = headers.find((x) => x.name.toLowerCase() === 'x-darshya-lead');
    if (h && /^[0-9a-f-]{36}$/i.test(h.value)) return h.value;
  }
  const re = /lead=([0-9a-f-]{36})/i;
  const m = (text + ' ' + html).match(re);
  return m?.[1] ?? null;
}

async function aiAutoReply(lead: {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  role: string;
}, replyText: string): Promise<string> {
  const role = lead.role.toLowerCase().replace('_instructor', '').replace('_', '-');
  const portal = `https://darshya.online/${role}-portal/signup`;
  const systemPrompt = `You are Darshya's onboarding assistant. Reply to this provider lead in their language (Hindi / English / Hinglish — match the tone they used). Be warm, respectful, concise (max 6 sentences). Acknowledge their interest, share signup link ${portal} and the calendar booking link ${CALENDAR_LINK}, and ask them to pick a 15-minute slot. Sign as "Team Darshya". Do NOT invent prices or features — keep it factual.`;
  const userMessage = `Lead name: ${lead.name}\nCity: ${lead.city ?? 'unknown'}\nRole: ${lead.role}\n\nTheir reply:\n"""\n${replyText.slice(0, 1500)}\n"""\n\nWrite the reply email body only (no subject line, no headers).`;
  try {
    return await generateText({ systemPrompt, userMessage, maxTokens: 400 });
  } catch {
    return `Namaste ${lead.name},\n\nThank you for your interest in Darshya! You can sign up here: ${portal}\n\nPick a 15-minute slot here: ${CALENDAR_LINK}\n\nWarm regards,\nTeam Darshya`;
  }
}

async function aiNeedsInfoReply(lead: {
  id: string;
  name: string;
  email: string | null;
  city: string | null;
  role: string;
}, replyText: string): Promise<string> {
  const role = lead.role.toLowerCase().replace('_instructor', '').replace('_', '-');
  const portal = `https://darshya.online/${role}-portal/signup`;
  const systemPrompt = `You are Darshya's onboarding assistant. The provider lead asked specific questions before committing. Match their language (Hindi / English / Hinglish). Be concise (max 8 sentences). Use ONLY these factual answers — do NOT invent figures:
- Pricing: zero setup fee. Platform commission 20–40% depending on category, settled on each completed booking.
- Video proof: every puja booking is recorded by the priest and uploaded before payout (mandatory).
- Payouts: priest payout = booking price minus commission, released after Aadhaar verification + video upload, within 7 working days.
- Free tier: applicants pay nothing to list.
Acknowledge their question, answer the relevant FAQ items above (skip irrelevant ones), share signup link ${portal} and calendar link ${CALENDAR_LINK}, and invite them to book a 15-minute call. Sign as "Team Darshya".`;
  const userMessage = `Lead name: ${lead.name}\nCity: ${lead.city ?? 'unknown'}\nRole: ${lead.role}\n\nTheir reply (with questions):\n"""\n${replyText.slice(0, 1500)}\n"""\n\nWrite the reply email body only (no subject line, no headers).`;
  try {
    return await generateText({ systemPrompt, userMessage, maxTokens: 500 });
  } catch {
    return `Namaste ${lead.name},

Thanks for your questions. Quick answers:
- Pricing: no setup fee. Platform commission is 20–40% depending on category, applied per completed booking.
- Video proof: every puja booking is recorded by the priest and uploaded before payout (mandatory on Darshya).
- Payouts: settled within 7 working days of video upload, after Aadhaar verification.

Sign-up: ${portal}
Book a 15-minute call: ${CALENDAR_LINK}

Warm regards,
Team Darshya`;
  }
}

/**
 * Classify a single inbound reply into one of the five intent buckets.
 * Wraps the LLM call: any failure (no key, network, malformed response)
 * yields `null`, which the caller falls back to regex heuristics.
 */
async function classifyIntent(replyText: string): Promise<IntentLabel | null> {
  const text = replyText.trim();
  if (!text) return null;
  const systemPrompt =
    'You classify B2B email replies. Return ONLY one word: INTERESTED, NEEDS_INFO, UNSUBSCRIBE, SPAM, or OUT_OF_OFFICE.';
  try {
    const raw = await generateText({
      systemPrompt,
      userMessage: text.slice(0, 2000),
      maxTokens: 8,
    });
    const cleaned = raw
      .replace(/[^A-Za-z_]/g, ' ')
      .trim()
      .toUpperCase()
      .split(/\s+/)[0];
    if (cleaned && VALID_INTENTS.has(cleaned as IntentLabel)) {
      return cleaned as IntentLabel;
    }
    return null;
  } catch {
    return null;
  }
}

function heuristicIntent(replyText: string): IntentLabel {
  if (NEGATIVE_INTENT.test(replyText)) return 'UNSUBSCRIBE';
  if (OOO_INTENT.test(replyText)) return 'OUT_OF_OFFICE';
  if (POSITIVE_INTENT.test(replyText)) return 'INTERESTED';
  return 'NEEDS_INFO';
}

async function notifyAdminsOfInterestedReply(
  lead: { id: string; name: string; email: string | null; city: string | null; role: string },
  replyText: string,
  fromEmail: string | null,
): Promise<void> {
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  if (adminEmails.length === 0) return;
  const safeText = replyText.slice(0, 4000).replace(/[<>]/g, (c) => (c === '<' ? '&lt;' : '&gt;'));
  try {
    await sendRawEmail({
      to: adminEmails,
      subject: `[Darshya] INTERESTED reply from ${lead.name} (${lead.role})`,
      html: `<h1>Interested lead replied</h1>
<p><strong>Name:</strong> ${lead.name}<br/>
<strong>Role:</strong> ${lead.role}<br/>
<strong>City:</strong> ${lead.city ?? 'unknown'}<br/>
<strong>Email:</strong> ${lead.email ?? fromEmail ?? 'unknown'}<br/>
<strong>Lead ID:</strong> ${lead.id}</p>
<h2>Their reply</h2>
<pre style="white-space:pre-wrap;background:#f5f5f5;padding:12px;border-radius:6px;">${safeText}</pre>
<p>Calendar link sent: <a href="${CALENDAR_LINK}">${CALENDAR_LINK}</a></p>`,
      text: `Interested lead: ${lead.name} (${lead.role}, ${lead.city ?? 'unknown'})\nLead ID: ${lead.id}\n\nReply:\n${safeText}\n\nCalendar: ${CALENDAR_LINK}`,
    });
  } catch {
    // Notification is best-effort; never break the webhook.
  }
}

let unsubHtmlCache: string | null = null;
function unsubscribeHtml(): string {
  if (unsubHtmlCache) return unsubHtmlCache;
  const file = path.join(TEMPLATES_DIR, '_unsubscribe_handler.html');
  unsubHtmlCache = fs.readFileSync(file, 'utf-8');
  return unsubHtmlCache;
}

// ─── Routes ─────────────────────────────────────────────────────────────

/**
 * Process one inbound reply. Always resolves — never throws.
 * Resend retries on 5xx, so we swallow every non-fatal error and return
 * an action string for the route handler to ship back as 200.
 */
async function handleInbound(body: unknown): Promise<{
  ok: boolean;
  action: string;
  intent?: IntentLabel;
  reason?: string;
}> {
  const parsed = replySchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, action: 'invalid_payload' };
  }
  const { from, text = '', html = '', headers, leadId: explicitId } = parsed.data;
  const leadId = explicitId ?? extractLeadIdFromHeaders(headers, text, html);
  const replyText = text || html;
  const fromEmail = fromToEmail(from);

  // Try to resolve the lead via id, else fall back to the sender email.
  let lead = leadId ? await prisma.lead.findUnique({ where: { id: leadId } }) : null;
  if (!lead && fromEmail) {
    lead = await prisma.lead.findFirst({ where: { email: fromEmail } });
  }
  if (!lead) {
    return { ok: false, action: 'lead_not_resolvable', reason: 'no leadId resolvable' };
  }

  // Classify (LLM, with regex fallback).
  const llmIntent = await classifyIntent(replyText);
  const intent: IntentLabel = llmIntent ?? heuristicIntent(replyText);

  const fromForLog = fromToString(from);
  const baseLogPayload = {
    from: fromForLog,
    classifiedIntent: intent,
    classifierSource: llmIntent ? 'llm' : 'heuristic',
  };

  try {
    switch (intent) {
      case 'UNSUBSCRIBE': {
        await prisma.lead.update({ where: { id: lead.id }, data: { status: 'UNSUBSCRIBED' } });
        await recordOutreach({
          leadId: lead.id,
          channel: 'EMAIL',
          templateKey: 'inbound_reply',
          status: 'REPLIED',
          payload: baseLogPayload,
        });
        return { ok: true, action: 'unsubscribed', intent };
      }

      case 'INTERESTED': {
        await prisma.lead.update({ where: { id: lead.id }, data: { status: 'REPLIED' } });
        let aiBody = '';
        try {
          aiBody = await aiAutoReply(lead, replyText);
        } catch {
          aiBody = '';
        }
        await recordOutreach({
          leadId: lead.id,
          channel: 'EMAIL',
          templateKey: 'inbound_reply',
          status: 'REPLIED',
          payload: { ...baseLogPayload, aiBody, calendarLink: CALENDAR_LINK },
        });

        if (lead.email && aiBody) {
          try {
            const replyHtml = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;">${aiBody.replace(/\n/g, '<br/>')}</div>`;
            await sendRawEmail({
              to: lead.email,
              subject: `Re: Darshya — quick chat?`,
              html: replyHtml,
              text: aiBody,
            });
          } catch {
            // Reply send is best-effort; admin notification still fires.
          }
        }

        await notifyAdminsOfInterestedReply(lead, replyText, fromEmail);

        // Real-time ops alert (Slack-first, email fallback). Wrapped so a
        // misconfigured webhook never breaks the 200 ACK Resend expects.
        try {
          const senderEmail = lead.email ?? fromEmail ?? 'unknown';
          const snippet = replyText.slice(0, 500).replace(/\s+/g, ' ').trim();
          await sendOpsAlert({
            subject: `Hot lead replied: ${senderEmail}`,
            body: `${snippet}\n\nLead: ${lead.name} (${lead.role}, ${lead.city ?? 'unknown'})\nAdmin: https://darshya.online/admin/leads/${lead.id}`,
            severity: 'high',
          });
        } catch {
          // best-effort — webhook must still ACK 200
        }

        return { ok: true, action: 'replied_interested', intent };
      }

      case 'NEEDS_INFO': {
        await prisma.lead.update({ where: { id: lead.id }, data: { status: 'REPLIED' } });
        let aiBody = '';
        try {
          aiBody = await aiNeedsInfoReply(lead, replyText);
        } catch {
          aiBody = '';
        }
        await recordOutreach({
          leadId: lead.id,
          channel: 'EMAIL',
          templateKey: 'inbound_reply',
          status: 'REPLIED',
          payload: { ...baseLogPayload, aiBody, calendarLink: CALENDAR_LINK },
        });
        if (lead.email && aiBody) {
          try {
            const replyHtml = `<div style="font-family:sans-serif;font-size:14px;line-height:1.6;">${aiBody.replace(/\n/g, '<br/>')}</div>`;
            await sendRawEmail({
              to: lead.email,
              subject: `Re: Darshya — quick answers`,
              html: replyHtml,
              text: aiBody,
            });
          } catch {
            // best-effort
          }
        }
        return { ok: true, action: 'replied_needs_info', intent };
      }

      case 'OUT_OF_OFFICE': {
        // Don't change status; we'll keep them in the cadence.
        await recordOutreach({
          leadId: lead.id,
          channel: 'EMAIL',
          templateKey: 'inbound_reply',
          status: 'REPLIED',
          payload: baseLogPayload,
        });
        return { ok: true, action: 'logged_ooo', intent };
      }

      case 'SPAM':
      default: {
        await recordOutreach({
          leadId: lead.id,
          channel: 'EMAIL',
          templateKey: 'inbound_reply',
          status: 'REPLIED',
          payload: baseLogPayload,
        });
        return { ok: true, action: 'logged_spam', intent };
      }
    }
  } catch (err) {
    // Last-resort: log a failure row so the inbound is auditable, then
    // tell Resend "got it" so it doesn't loop.
    try {
      await recordOutreach({
        leadId: lead.id,
        channel: 'EMAIL',
        templateKey: 'inbound_reply',
        status: 'FAILED',
        payload: { ...baseLogPayload, errored: true },
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // swallow — we still need to ack the webhook
    }
    return { ok: false, action: 'errored', intent };
  }
}

export async function outreachWebhookRoutes(server: FastifyInstance) {
  // ── Inbound reply parsing ──────────────────────────────────────────
  // Resend inbound parse webhooks sign the raw body with Svix headers, same
  // scheme as /bounce-webhook below. Without verification, anon callers can
  // flip Lead.status (UNSUBSCRIBED / REPLIED) or trigger autoresponder loops.
  // If RESEND_WEBHOOK_SECRET unset we 503 to fail-closed rather than open.
  const verifySvix = (
    request: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply,
  ): boolean => {
    const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
    if (!secret) {
      request.log.error('RESEND_WEBHOOK_SECRET unset — refusing inbound webhook to avoid anon Lead mutation');
      reply.code(503).send({ ok: false, error: 'webhook_unconfigured' });
      return false;
    }
    const svixId = request.headers['svix-id'];
    const svixTimestamp = request.headers['svix-timestamp'];
    const svixSignature = request.headers['svix-signature'];
    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? '';
    if (!svixId || !svixTimestamp || !svixSignature || !rawBody) {
      reply.code(400).send({ ok: false, error: 'missing_signature' });
      return false;
    }
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const signedContent = `${String(svixId)}.${String(svixTimestamp)}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
    const provided = String(svixSignature)
      .split(' ')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('v1,'))
      .map((s) => s.slice(3));
    const expBuf = Buffer.from(expected, 'utf8');
    const sigOk = provided.some((p) => {
      const pBuf = Buffer.from(p, 'utf8');
      return pBuf.length === expBuf.length && crypto.timingSafeEqual(pBuf, expBuf);
    });
    if (!sigOk) {
      reply.code(401).send({ ok: false, error: 'invalid_signature' });
      return false;
    }
    return true;
  };

  const inboundHandler = async (
    request: import('fastify').FastifyRequest,
    reply: import('fastify').FastifyReply,
  ) => {
    if (!verifySvix(request, reply)) return;
    try {
      const result = await handleInbound(request.body);
      return reply.code(200).send(result);
    } catch (err) {
      // Never crash inbound — Resend retries on 5xx and we don't want loops.
      request.log.error({ err }, 'inbound webhook unexpected failure');
      return reply.code(200).send({ ok: false, action: 'errored' });
    }
  };

  server.post('/reply-webhook', { config: { rawBody: true } }, inboundHandler);
  // Spec also wires Resend inbound parse webhook at /inbound — same handler.
  server.post('/inbound', { config: { rawBody: true } }, inboundHandler);

  // ── Bounce webhook (Resend / SES style) ────────────────────────────
  // Resend signs webhooks with Svix headers (svix-id, svix-timestamp,
  // svix-signature) over the raw body. If RESEND_WEBHOOK_SECRET is set
  // (format: `whsec_<base64>`) we require a valid signature; otherwise we
  // log and reject — open bounce endpoints let any anon flip Lead.status.
  server.post('/bounce-webhook', { config: { rawBody: true } }, async (request, reply) => {
    const secret = process.env.RESEND_WEBHOOK_SECRET ?? '';
    if (!secret) {
      request.log.error('RESEND_WEBHOOK_SECRET unset — refusing /bounce-webhook to avoid anon Lead mutation');
      return reply.code(503).send({ ok: false, error: 'webhook_unconfigured' });
    }

    const svixId = request.headers['svix-id'];
    const svixTimestamp = request.headers['svix-timestamp'];
    const svixSignature = request.headers['svix-signature'];
    const rawBody = (request as unknown as { rawBody?: string }).rawBody ?? '';
    if (!svixId || !svixTimestamp || !svixSignature || !rawBody) {
      return reply.code(400).send({ ok: false, error: 'missing_signature' });
    }

    // svix-signature header is space-separated `v1,<base64sig>` entries.
    // Secret is `whsec_<base64>`; HMAC SHA256 over `${id}.${ts}.${body}`.
    const secretBytes = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
    const signedContent = `${String(svixId)}.${String(svixTimestamp)}.${rawBody}`;
    const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
    const provided = String(svixSignature)
      .split(' ')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('v1,'))
      .map((s) => s.slice(3));
    const expBuf = Buffer.from(expected, 'utf8');
    const sigOk = provided.some((p) => {
      const pBuf = Buffer.from(p, 'utf8');
      return pBuf.length === expBuf.length && crypto.timingSafeEqual(pBuf, expBuf);
    });
    if (!sigOk) {
      return reply.code(401).send({ ok: false, error: 'invalid_signature' });
    }

    const body = request.body as { type?: string; data?: { email_id?: string; to?: string[]; email?: string } };
    const email = body?.data?.email ?? body?.data?.to?.[0];
    if (!email) return reply.code(202).send({ ok: false });
    const lead = await prisma.lead.findFirst({ where: { email } });
    if (!lead) return reply.code(202).send({ ok: false });
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'BOUNCED' },
    });
    await recordOutreach({
      leadId: lead.id,
      channel: 'EMAIL',
      templateKey: 'bounce',
      status: 'BOUNCED',
      payload: body as Record<string, unknown>,
    });
    return reply.send({ ok: true });
  });

  // ── Unsubscribe (GET + POST per RFC 8058) ──────────────────────────
  const unsubQuery = z.object({ lead: z.string().uuid() });

  const handleUnsubscribe = async (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => {
    const parsed = unsubQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).type('text/html').send('<h1>Invalid unsubscribe link</h1>');
    }
    const lead = await prisma.lead.findUnique({ where: { id: parsed.data.lead } });
    if (!lead) {
      return reply.code(404).type('text/html').send('<h1>Lead not found</h1>');
    }
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: 'UNSUBSCRIBED' },
    });
    await recordOutreach({
      leadId: lead.id,
      channel: 'EMAIL',
      templateKey: 'unsubscribe',
      status: 'REPLIED',
    });
    return reply.type('text/html').send(unsubscribeHtml());
  };

  server.get('/unsubscribe', handleUnsubscribe);
  server.post('/unsubscribe', handleUnsubscribe);
}

// ─── Admin trigger ──────────────────────────────────────────────────────

export async function outreachAdminRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  server.post('/run', { preHandler: adminPreHandlers }, async (_request, reply) => {
    const result = await runOutreachTick();
    return reply.send({ ok: true, result });
  });

  server.get('/logs', { preHandler: adminPreHandlers }, async (request, reply) => {
    const q = request.query as { leadId?: string; limit?: string };
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const logs = await prisma.outreachLog.findMany({
      where: q.leadId ? { leadId: q.leadId } : undefined,
      orderBy: { sentAt: 'desc' },
      take: limit,
    });
    return reply.send({ ok: true, logs });
  });

  server.get('/config', { preHandler: adminPreHandlers }, async (_request, reply) => {
    return reply.send({ ok: true, config: outreachConfig });
  });
}
