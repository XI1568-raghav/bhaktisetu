import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { sendEmail } from '../lib/email.js';
import { prisma } from '../lib/prisma.js';
import { whatsapp } from '../lib/whatsapp.js';

/**
 * Gift puja — two surfaces:
 *
 *   1. POST /inquiry        — email intake. Ops reply with pandits, dates and
 *                             final pricing, and take payment out of band.
 *   2. GET  /config         — feature flags so the web form knows which path
 *                             to take.
 *
 * **Stripe removed 2026-08-11 (owner directive).** This flow used to take card
 * payment directly: `POST /create-order` opened a USD Stripe PaymentIntent and
 * `POST /verify-payment` re-fetched it before firing the recipient's WhatsApp
 * template. Both routes are deleted, not disabled — Razorpay is the only rail
 * and INR the only currency platform-wide, and a dormant USD card path is how
 * a future edit reintroduces the currency confusion that produced RV-01 (NRI
 * devotees billed 83.5×). The self-serve gift purchase returns with the
 * PayPal-via-Razorpay rail; until then this is an inquiry funnel.
 *
 * No Prisma schema change — gift_puja_orders is a raw-SQL table created on
 * first call (same pattern as csr-match.ts, astrologer_consultations). It is
 * retained (with its now-vestigial stripe_* columns) so historical orders stay
 * readable and the future rail can reuse it; nothing writes to it today.
 *
 * Honest copy mandate, unchanged and now unconditional: the web form tells the
 * buyer the truth — ops reply with a payment link rather than an automatic
 * checkout.
 */

const inquirySchema = z.object({
  buyer: z.object({
    name: z.string().max(120).optional().default(''),
    email: z.string().email(),
    country: z.string().max(80).optional().default(''),
  }),
  recipient: z.object({
    name: z.string().min(1).max(120),
    whatsapp: z.string().regex(/^\+?[1-9]\d{6,14}$/, 'invalid phone format (use E.164 e.g. +919876543210)'),
    city: z.string().max(80).optional().default(''),
  }),
  puja: z.string().max(120).optional().default(''),
  occasion: z.string().max(120).optional().default(''),
  message: z.string().max(2000).optional().default(''),
  source: z.string().max(80).optional().default('web-gift'),
});

// createOrderSchema (amountUsd) and verifyPaymentSchema (paymentIntentId) were
// removed 2026-08-11 with the Stripe rail — the last USD-denominated request
// bodies in the API.

function refId(): string {
  const bytes = crypto.randomBytes(4).toString('hex').toUpperCase();
  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `GIFT-${yyyymmdd}-${bytes}`;
}

function escape(s: string): string {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c
  ));
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

async function ensureGiftPujaTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS gift_puja_orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference TEXT UNIQUE NOT NULL,
      buyer_email TEXT NOT NULL,
      buyer_name TEXT,
      buyer_country TEXT,
      recipient_name TEXT NOT NULL,
      recipient_whatsapp TEXT NOT NULL,
      recipient_city TEXT,
      puja TEXT,
      occasion TEXT,
      message TEXT,
      amount_usd NUMERIC(8,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      stripe_payment_intent_id TEXT,
      stripe_client_secret TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      wa_message_id TEXT,
      wa_status TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      paid_at TIMESTAMPTZ
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS gift_puja_orders_email_idx ON gift_puja_orders (buyer_email);`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS gift_puja_orders_status_idx ON gift_puja_orders (status);`,
  );
}

// GiftPujaOrderRow was the row type for the removed Stripe order/verify pair.
// The table itself is kept (see the file header) but nothing reads it today.

export async function giftPujaRoutes(server: FastifyInstance) {
  await ensureGiftPujaTables().catch((err) => server.log.warn({ err }, 'gift_puja_orders init failed'));

  // ─── GET /config ────────────────────────────────────────────────────────
  // Feature flags so the web form knows whether to show "Pay now" or
  // "Request invite". Public — leaks only boolean readiness.
  server.get('/config', async () => {
    return {
      // No self-serve gift payment rail exists since Stripe was removed
      // (2026-08-11). Kept as fields rather than dropped so the web form's
      // existing branch keeps working and flips back on its own when the
      // PayPal-via-Razorpay rail lands.
      paymentEnabled: false,
      whatsappEnabled: whatsapp.enabled,
      autoFlowReady: false,
    };
  });

  // ─── POST /inquiry ──────────────────────────────────────────────────────
  // Legacy email-only intake. Kept as the safe fallback even when payment +
  // WA are wired — ops can still receive manual leads from buyers who
  // prefer to talk before paying.
  // Anon-allowed (NRI gift flow is primary monetization vector — auth would
  // block legit buyers). Tightened to 2/hr/IP to bound Resend (100/day cap)
  // and ops inbox abuse. Each call also emails buyer confirmation = 2 sends.
  server.post('/inquiry', {
    config: { rateLimit: { max: 2, timeWindow: '1 hour' } },
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

  // POST /create-order and POST /verify-payment — REMOVED 2026-08-11 with the
  // Stripe rail (owner directive). They were the only USD card path left in
  // the API. See the file header for why they were deleted rather than gated.
}
