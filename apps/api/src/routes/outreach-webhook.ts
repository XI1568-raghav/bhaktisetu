import { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { generateText } from '../integrations/claude.js';
import {
  recordOutreach,
  sendEmail,
  outreachConfig,
} from '../services/outreach.service.js';
import { runOutreachTick } from '../jobs/outreach-cron.js';

/**
 * Inbound reply + unsubscribe + admin-trigger routes.
 *
 *   POST /api/v1/outreach/reply-webhook  — Resend inbound parse webhook
 *   GET  /api/v1/outreach/unsubscribe    — One-click unsub (CAN-SPAM / IT Rules 2021)
 *   POST /api/v1/outreach/unsubscribe    — RFC 8058 one-click POST
 *   POST /api/v1/admin/outreach/run      — Manual cron tick (admin only)
 *   POST /api/v1/outreach/bounce-webhook — Resend bounce webhook
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates', 'outreach');

const POSITIVE_INTENT = /\b(interested|join|onboard|register|connect|sign\s*up|tell\s*me\s*more|count me in)\b|कैसे|जोड़ें|रुचि|जुड़ना|ज्वाइन/i;
const NEGATIVE_INTENT = /\b(unsubscribe|stop|remove|opt[-\s]?out|no\s+thanks|not interested)\b|बंद|हटा|मना/i;

// ─── Reply payload schema (Resend inbound) ──────────────────────────────

const replySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
  text: z.string().optional(),
  html: z.string().optional(),
  // Resend inbound includes a `headers` array
  headers: z.array(z.object({ name: z.string(), value: z.string() })).optional(),
  // Optional explicit lead id when sender provides X-Darshya-Lead header
  leadId: z.string().uuid().optional(),
});

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
  const systemPrompt = `You are Darshya's onboarding assistant. Reply to this provider lead in their language (Hindi / English / Hinglish — match the tone they used). Be warm, respectful, concise (max 6 sentences). Acknowledge their interest, share signup link ${portal}, and ask for the best time today/tomorrow for a 15-minute call. Sign as "Team Darshya". Do NOT invent prices or features — keep it factual.`;
  const userMessage = `Lead name: ${lead.name}\nCity: ${lead.city ?? 'unknown'}\nRole: ${lead.role}\n\nTheir reply:\n"""\n${replyText.slice(0, 1500)}\n"""\n\nWrite the reply email body only (no subject line, no headers).`;
  try {
    return await generateText({ systemPrompt, userMessage, maxTokens: 400 });
  } catch {
    return `Namaste ${lead.name},\n\nThank you for your interest in Darshya! You can sign up here: ${portal}\n\nCould you share a 15-minute window today or tomorrow for a quick call?\n\nWarm regards,\nTeam Darshya`;
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

export async function outreachWebhookRoutes(server: FastifyInstance) {
  // ── Inbound reply parsing ──────────────────────────────────────────
  server.post('/reply-webhook', async (request, reply) => {
    const parsed = replySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid payload', details: parsed.error.flatten() });
    }
    const { from, text = '', html = '', headers, leadId: explicitId } = parsed.data;
    const leadId = explicitId ?? extractLeadIdFromHeaders(headers, text, html);
    if (!leadId) {
      return reply.code(202).send({ ok: false, reason: 'no leadId resolvable' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return reply.code(202).send({ ok: false, reason: 'lead not found' });
    }

    // Negative intent → unsubscribe
    if (NEGATIVE_INTENT.test(text) || NEGATIVE_INTENT.test(html)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'UNSUBSCRIBED' },
      });
      await recordOutreach({
        leadId: lead.id,
        channel: 'EMAIL',
        templateKey: 'inbound_reply',
        status: 'REPLIED',
        payload: { from, intent: 'negative' },
      });
      return reply.send({ ok: true, action: 'unsubscribed' });
    }

    // Positive intent → flip REPLIED + AI auto-reply
    if (POSITIVE_INTENT.test(text) || POSITIVE_INTENT.test(html)) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { status: 'REPLIED' },
      });
      await recordOutreach({
        leadId: lead.id,
        channel: 'EMAIL',
        templateKey: 'inbound_reply',
        status: 'REPLIED',
        payload: { from, intent: 'positive' },
      });

      const replyBody = await aiAutoReply(lead, text || html);
      const sendResult = await sendEmail({
        lead,
        templateKey: 'ai_auto_reply',
        // Use a synthetic inline template — fall back to plain text
        variables: {},
      });

      // sendEmail looks up a file; for AI replies we want to send raw HTML.
      // Bypass via direct Resend call when configured; otherwise just log.
      if (!sendResult.ok && !sendResult.skipped) {
        // Direct send not possible without template — log the AI body so the
        // founder can pick it up.
        await recordOutreach({
          leadId: lead.id,
          channel: 'EMAIL',
          templateKey: 'ai_auto_reply',
          status: 'FAILED',
          payload: { aiBody: replyBody },
          error: 'auto-reply send not yet wired to direct HTML send',
        });
      }
      return reply.send({ ok: true, action: 'replied', config: outreachConfig.emailEnabled });
    }

    // Neutral / unclear → just log
    await recordOutreach({
      leadId: lead.id,
      channel: 'EMAIL',
      templateKey: 'inbound_reply',
      status: 'REPLIED',
      payload: { from, intent: 'neutral' },
    });
    return reply.send({ ok: true, action: 'logged' });
  });

  // ── Bounce webhook (Resend / SES style) ────────────────────────────
  server.post('/bounce-webhook', async (request, reply) => {
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
