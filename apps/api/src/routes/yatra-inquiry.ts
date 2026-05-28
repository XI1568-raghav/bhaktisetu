import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { sendEmail } from '../lib/email.js';
import { sendWhatsappTemplate, whatsapp } from '../lib/whatsapp.js';

/**
 * Yatra package inquiry intake. Affiliate program (U9) not approved yet —
 * collect inquiries via email so we can manually confirm pandit / hotel /
 * transport availability + send the final invoice in user's currency.
 *
 * When affiliate approves, swap this to a real booking + commission split.
 */

const travelerSchema = z.object({
  name: z.string().max(120),
  age: z.string().max(4),
  gender: z.enum(['male', 'female', 'other']).optional(),
});

const inquirySchema = z.object({
  yatraSlug: z.string().min(1).max(80),
  yatraTitle: z.string().max(160).optional().default(''),
  packageTier: z.enum(['economy', 'standard', 'premium']),
  startDate: z.string().min(1).max(40),
  pickupCity: z.string().max(80).optional().default(''),
  travelersCount: z.number().int().min(1).max(50),
  travelers: z.array(travelerSchema).max(50).optional().default([]),
  totalInr: z.number().nonnegative(),
  totalUsd: z.number().nonnegative().optional().default(0),
  buyer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().max(40).optional().default(''),
    country: z.string().max(80).optional().default('India'),
  }),
  notes: z.string().max(2000).optional().default(''),
});

function refId(): string {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `YTR-${ymd}-${bytes}`;
}

function esc(s: string | number): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  ));
}

function adminHtml(refId: string, b: z.infer<typeof inquirySchema>): string {
  const travelers = (b.travelers ?? [])
    .map((t, i) => `<tr><td style="padding:2px 0">${i + 1}</td><td>${esc(t.name)}</td><td>${esc(t.age)}</td><td>${esc(t.gender ?? '')}</td></tr>`)
    .join('');
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:16px;background:#fbf7f1;color:#333">
<div style="max-width:600px;margin:auto;background:#fff;padding:24px;border-radius:12px">
<h2 style="color:#ea580c;margin:0 0 8px">Yatra inquiry — ${refId}</h2>
<p style="margin:0 0 12px;color:#666">${esc(b.yatraTitle)} · <strong>${esc(b.packageTier)}</strong></p>
<table style="width:100%;font-size:14px;border-collapse:collapse">
<tr><td style="padding:4px 0;color:#666;width:140px">Buyer</td><td>${esc(b.buyer.name)} &lt;${esc(b.buyer.email)}&gt;</td></tr>
<tr><td style="padding:4px 0;color:#666">Phone</td><td>${esc(b.buyer.phone)} (${esc(b.buyer.country)})</td></tr>
<tr><td style="padding:4px 0;color:#666">Start date</td><td>${esc(b.startDate)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Pickup</td><td>${esc(b.pickupCity)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Travelers</td><td>${esc(b.travelersCount)}</td></tr>
<tr><td style="padding:4px 0;color:#666">Quote</td><td>₹${esc(b.totalInr.toLocaleString('en-IN'))}${b.totalUsd ? ` (≈ $${esc(b.totalUsd.toLocaleString('en-US'))})` : ''}</td></tr>
<tr><td style="padding:4px 0;color:#666">Notes</td><td>${esc(b.notes)}</td></tr>
</table>
${travelers ? `<h3 style="font-size:14px;margin:16px 0 4px">Travelers</h3><table style="width:100%;font-size:13px"><thead><tr style="color:#888"><th align="left">#</th><th align="left">Name</th><th align="left">Age</th><th align="left">Gender</th></tr></thead><tbody>${travelers}</tbody></table>` : ''}
<p style="margin-top:16px;font-size:12px;color:#888">Confirm hotel + transport availability and reply with invoice within 24h.</p>
</div></body></html>`;
}

export async function yatraInquiryRoutes(server: FastifyInstance) {
  server.post('/', async (request, reply) => {
    const parsed = inquirySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const body = parsed.data;
    const referenceId = refId();
    const to = process.env.YATRA_INQUIRY_TO || 'yatra@darshya.online';

    await sendEmail({
      to,
      subject: `[Yatra ${body.packageTier}] ${body.yatraTitle || body.yatraSlug} — ${body.travelersCount} pax`,
      html: adminHtml(referenceId, body),
    }).catch(() => null);

    await sendEmail({
      to: body.buyer.email,
      subject: `Yatra inquiry received — ${referenceId}`,
      html: `<p>Namaste ${esc(body.buyer.name)},</p>
<p>We received your inquiry for <strong>${esc(body.yatraTitle || body.yatraSlug)}</strong> (${esc(body.packageTier)}) starting ${esc(body.startDate)} for ${esc(body.travelersCount)} traveler(s).</p>
<p>Reference: <strong>${referenceId}</strong></p>
<p>Our yatra team will confirm hotel + transport availability and email final invoice within 24 hours. Quote shown: ₹${esc(body.totalInr.toLocaleString('en-IN'))}.</p>
<p>— Darshya yatra desk</p>`,
    }).catch(() => null);

    // WhatsApp handoff to ops + buyer (env-or-noop). Plan: Sprint 1 Sub-batch
    // 5 — replace email-only flow with WA primary channel so ops responds
    // within minutes, not hours. Templates 'yatra_inquiry_ops' (vars: ref,
    // tier, pax, start) + 'yatra_inquiry_received' (vars: name, title, ref)
    // must be pre-approved in WhatsApp Manager.
    let waDelivery: 'sent' | 'skipped' | 'failed' = 'skipped';
    if (whatsapp.enabled) {
      const opsTo = process.env.YATRA_OPS_WHATSAPP || '';
      if (opsTo) {
        await sendWhatsappTemplate({
          to: opsTo,
          template: 'yatra_inquiry_ops',
          languageCode: 'en',
          variables: [
            referenceId,
            body.packageTier,
            String(body.travelersCount),
            body.startDate,
          ],
        }).catch(() => null);
      }
      if (body.buyer.phone) {
        const r = await sendWhatsappTemplate({
          to: body.buyer.phone,
          template: 'yatra_inquiry_received',
          languageCode: 'en',
          variables: [
            body.buyer.name,
            body.yatraTitle || body.yatraSlug,
            referenceId,
          ],
        }).catch(() => ({ ok: false }));
        waDelivery = r.ok ? 'sent' : 'failed';
      }
    }

    request.log.info({ referenceId, yatraSlug: body.yatraSlug, tier: body.packageTier, waDelivery }, '[yatra-inquiry]');
    return reply.status(200).send({ referenceId, ok: true, waDelivery });
  });
}
