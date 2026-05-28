import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { sendEmail } from '../lib/email.js';

/**
 * Gift puja inquiry intake. NRI submits buyer + Indian recipient details +
 * desired puja + occasion. We email gift@darshya.online (or fallback
 * RESEND_INQUIRIES_TO) and return a reference id.
 *
 * No DB write — Prisma schema does not yet have a GiftPujaInquiry model and
 * we're not changing schema in agent runs. When volume justifies it, promote
 * to a real model with Lead-style status tracking.
 */

const inquirySchema = z.object({
  buyer: z.object({
    name: z.string().max(120).optional().default(''),
    email: z.string().email(),
    country: z.string().max(80).optional().default(''),
  }),
  recipient: z.object({
    name: z.string().min(1).max(120),
    whatsapp: z.string().min(6).max(20),
    city: z.string().max(80).optional().default(''),
  }),
  puja: z.string().max(120).optional().default(''),
  occasion: z.string().max(120).optional().default(''),
  message: z.string().max(2000).optional().default(''),
  source: z.string().max(80).optional().default('web-gift'),
});

function refId(): string {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `GIFT-${yyyymmdd}-${bytes}`;
}

function inquiryHtml(referenceId: string, b: z.infer<typeof inquirySchema>): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#fbf7f1;padding:16px;color:#333">
<div style="max-width:560px;margin:auto;background:#fff;padding:24px;border-radius:12px">
<h2 style="color:#ea580c;margin:0 0 12px">Gift puja inquiry — ${referenceId}</h2>
<table style="width:100%;font-size:14px;border-collapse:collapse">
<tr><td style="padding:4px 0;color:#666">Buyer</td><td>${escape(b.buyer.name)} &lt;${escape(b.buyer.email)}&gt;</td></tr>
<tr><td style="padding:4px 0;color:#666">Country</td><td>${escape(b.buyer.country)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Recipient</td><td>${escape(b.recipient.name)}</td></tr>
<tr><td style="padding:4px 0;color:#666">WhatsApp</td><td>${escape(b.recipient.whatsapp)}</td></tr>
<tr><td style="padding:4px 0;color:#666">City</td><td>${escape(b.recipient.city)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Puja</td><td>${escape(b.puja)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Occasion</td><td>${escape(b.occasion)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Message</td><td>${escape(b.message)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Source</td><td>${escape(b.source)}</td></tr>
</table>
<p style="font-size:12px;color:#888;margin-top:16px">Reply within 4 hours with available pandit + dates.</p>
</div></body></html>`;
}

function escape(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  ));
}

export async function giftPujaRoutes(server: FastifyInstance) {
  // P0 — abuse vector closure. Endpoint triggers outbound email to recipient
  // contacts (and in Sub-batch 4 will also trigger WhatsApp). Per-IP 5/hr cap
  // prevents mass-spam without killing the only NRI conversion path (which
  // requires unauth submission today; auth requirement lands in Sub-batch 4
  // when payment flow ships and account create becomes natural).
  server.post('/inquiry', {
    config: { rateLimit: { max: 5, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const parsed = inquirySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const body = parsed.data;
    const referenceId = refId();

    const to = process.env.GIFT_INQUIRY_TO || 'gift@darshya.online';
    const result = await sendEmail({
      to,
      subject: `[Gift Puja] ${body.puja || 'Inquiry'} — ${body.recipient.name}`,
      html: inquiryHtml(referenceId, body),
    }).catch((e: unknown) => ({ ok: false, error: (e as Error).message }));

    request.log.info({ referenceId, email: body.buyer.email, puja: body.puja, sent: 'ok' in result ? result.ok : false }, '[gift-puja] inquiry');

    // Send buyer confirmation too.
    await sendEmail({
      to: body.buyer.email,
      subject: `Gift puja inquiry received — ${referenceId}`,
      html: `<p>Namaste${body.buyer.name ? ` ${escape(body.buyer.name)}` : ''},</p>
<p>We have received your gift puja inquiry for <strong>${escape(body.recipient.name)}</strong>${body.recipient.city ? ` in ${escape(body.recipient.city)}` : ''}.</p>
<p>Reference: <strong>${referenceId}</strong></p>
<p>Our team will reply within 4 hours with available pandits, dates, and final pricing in your currency.</p>
<p>— Darshya team</p>`,
    }).catch(() => null);

    return reply.status(200).send({ referenceId, ok: true });
  });
}
