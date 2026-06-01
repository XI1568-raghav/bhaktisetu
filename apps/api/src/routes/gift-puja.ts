import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { sendEmail } from '../lib/email.js';
import { prisma } from '../lib/prisma.js';
import { getStripe, isStripeDemoMode } from '../lib/stripe.js';
import { sendWhatsappTemplate, whatsapp } from '../lib/whatsapp.js';

/**
 * Gift puja — three surfaces:
 *
 *   1. POST /inquiry        — legacy email-only intake (kept for fallback).
 *   2. POST /create-order   — Stripe PaymentIntent in buyer currency
 *                             (USD default). Persists gift_puja_orders row
 *                             status='pending_payment'.
 *   3. POST /verify-payment — re-fetch the PaymentIntent from Stripe, flip
 *                             row → 'confirmed', trigger WhatsApp template
 *                             to recipient (env-or-noop if WA not configured).
 *   4. GET  /config         — feature flags so the web form knows which path
 *                             to take.
 *
 * No Prisma schema change — gift_puja_orders is a raw-SQL table created on
 * first call (same pattern as csr-match.ts, astrologer_consultations).
 *
 * Honest copy mandate: when Stripe/WA aren't both ready the web form falls
 * back to the inquiry path and we tell the buyer the truth: ops will reply
 * with a payment link instead of an automatic flow.
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

const createOrderSchema = inquirySchema.extend({
  amountUsd: z.number().int().min(20).max(2000).default(120),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().uuid(),
  paymentIntentId: z.string().min(8).max(200),
});

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

type GiftPujaOrderRow = {
  id: string;
  reference: string;
  buyer_email: string;
  buyer_name: string | null;
  recipient_name: string;
  recipient_whatsapp: string;
  recipient_city: string | null;
  puja: string | null;
  amount_usd: string;
  currency: string;
  stripe_payment_intent_id: string | null;
  stripe_client_secret: string | null;
  status: string;
  wa_message_id: string | null;
  wa_status: string | null;
  created_at: Date;
  paid_at: Date | null;
};

export async function giftPujaRoutes(server: FastifyInstance) {
  await ensureGiftPujaTables().catch((err) => server.log.warn({ err }, 'gift_puja_orders init failed'));

  // ─── GET /config ────────────────────────────────────────────────────────
  // Feature flags so the web form knows whether to show "Pay now" or
  // "Request invite". Public — leaks only boolean readiness.
  server.get('/config', async () => {
    return {
      paymentEnabled: !isStripeDemoMode,
      whatsappEnabled: whatsapp.enabled,
      // Both must be true for the auto end-to-end flow. Otherwise inquiry.
      autoFlowReady: !isStripeDemoMode && whatsapp.enabled,
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

  // ─── POST /create-order ─────────────────────────────────────────────────
  // Stripe PaymentIntent for NRI gift puja, billed in USD. Persists row +
  // returns client_secret for the buyer's checkout. Rate-limited to suppress
  // PaymentIntent abuse — Stripe charges per attempt above a threshold.
  server.post('/create-order', {
    config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const body = parsed.data;
    const reference = refId();
    const amountUsd = body.amountUsd;
    const amountInCents = amountUsd * 100;

    let paymentIntentId: string;
    let clientSecret: string | null;
    try {
      const stripe = await getStripe();
      const intent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        metadata: {
          giftRef: reference,
          buyerEmail: body.buyer.email,
          recipient: body.recipient.name,
          puja: body.puja || 'unspecified',
        },
        automatic_payment_methods: { enabled: true },
      });
      paymentIntentId = intent.id;
      clientSecret = intent.client_secret;
    } catch (err: any) {
      server.log.error({ err }, 'stripe.paymentIntents.create failed (gift-puja)');
      return reply.code(502).send({ error: 'Payment gateway unavailable. Please retry.' });
    }

    await ensureGiftPujaTables();
    const rows = await prisma.$queryRawUnsafe<GiftPujaOrderRow[]>(
      `INSERT INTO gift_puja_orders
        (reference, buyer_email, buyer_name, buyer_country,
         recipient_name, recipient_whatsapp, recipient_city,
         puja, occasion, message, amount_usd, currency,
         stripe_payment_intent_id, stripe_client_secret, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'USD', $12, $13, 'pending_payment')
       RETURNING *;`,
      reference,
      body.buyer.email,
      body.buyer.name || null,
      body.buyer.country || null,
      body.recipient.name,
      body.recipient.whatsapp,
      body.recipient.city || null,
      body.puja || null,
      body.occasion || null,
      body.message || null,
      amountUsd,
      paymentIntentId,
      clientSecret,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(500).send({ error: 'Failed to persist gift puja order.' });
    }

    return reply.code(201).send({
      orderId: row.id,
      reference: row.reference,
      amountUsd,
      amountInCents,
      currency: 'USD',
      paymentIntentId,
      clientSecret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY ?? '',
      demo: isStripeDemoMode,
    });
  });

  // ─── POST /verify-payment ───────────────────────────────────────────────
  // Buyer-side verification after Stripe Elements confirmation. Re-fetches
  // the PaymentIntent and only flips state if status === 'succeeded'. Then
  // fires WhatsApp template to recipient. Idempotent on 'confirmed'.
  server.post('/verify-payment', {
    config: { rateLimit: { max: 30, timeWindow: '1 hour' } },
  }, async (request, reply) => {
    const parsed = verifyPaymentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const { orderId, paymentIntentId } = parsed.data;
    await ensureGiftPujaTables();
    const rows = await prisma.$queryRawUnsafe<GiftPujaOrderRow[]>(
      `SELECT * FROM gift_puja_orders WHERE id = $1::uuid LIMIT 1;`,
      orderId,
    );
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: 'order_not_found' });
    if (row.stripe_payment_intent_id !== paymentIntentId) {
      return reply.code(400).send({ error: 'payment_intent_mismatch' });
    }
    if (row.status === 'confirmed') {
      return reply.send({ verified: true, reference: row.reference, status: 'confirmed' });
    }

    // Re-fetch from Stripe — don't trust client. Demo mode short-circuits.
    if (!isStripeDemoMode) {
      try {
        const stripe = await getStripe();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
          return reply.code(400).send({ error: 'payment_not_succeeded', stripeStatus: intent.status });
        }
      } catch (err: any) {
        server.log.error({ err }, 'stripe.paymentIntents.retrieve failed (gift-puja verify)');
        return reply.code(502).send({ error: 'Payment gateway unavailable.' });
      }
    }

    // Fire WhatsApp template — env-or-noop. Template name 'gift_puja_delivered'
    // must be approved in WA Manager with vars: {{1}}=recipient name,
    // {{2}}=puja name, {{3}}=buyer name. Fallback to empty strings.
    let waStatus = 'skipped';
    let waMessageId: string | null = null;
    if (whatsapp.enabled) {
      const waResult = await sendWhatsappTemplate({
        to: row.recipient_whatsapp,
        template: 'gift_puja_delivered',
        languageCode: 'en',
        variables: [
          row.recipient_name,
          row.puja || 'a special puja',
          row.buyer_name || 'your loved one',
        ],
      }).catch((err) => ({ ok: false, error: err instanceof Error ? err.message : String(err) }));
      waStatus = waResult.ok ? 'sent' : `failed:${('error' in waResult && waResult.error) || 'unknown'}`;
      waMessageId = ('messageId' in waResult && waResult.messageId) ? waResult.messageId : null;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE gift_puja_orders
       SET status = 'confirmed', paid_at = now(),
           wa_message_id = $1, wa_status = $2
       WHERE id = $3::uuid;`,
      waMessageId,
      waStatus,
      orderId,
    );

    // Also notify ops + buyer via email.
    const to = process.env.GIFT_INQUIRY_TO || 'gift@darshya.online';
    await sendEmail({
      to,
      subject: `[Gift Puja PAID] ${row.puja || 'puja'} — ${row.recipient_name} ($${row.amount_usd})`,
      html: `<p>Reference <strong>${row.reference}</strong> paid by ${escape(row.buyer_email)}.</p>
<p>Recipient: <strong>${escape(row.recipient_name)}</strong>, WA: ${escape(row.recipient_whatsapp)}, city: ${escape(row.recipient_city || '-')}</p>
<p>Puja: ${escape(row.puja || '-')}, amount: $${row.amount_usd}, WA delivery: ${escape(waStatus)}</p>`,
    }).catch(() => null);

    await sendEmail({
      to: row.buyer_email,
      subject: `Your gift puja is confirmed — ${row.reference}`,
      html: `<p>Namaste${row.buyer_name ? ` ${escape(row.buyer_name)}` : ''},</p>
<p>Your gift puja for <strong>${escape(row.recipient_name)}</strong> is confirmed.</p>
<p>Reference: <strong>${row.reference}</strong></p>
<p>We've notified the recipient on WhatsApp. Our temple coordinator will share scheduled date + pandit details within 4 hours.</p>
<p>— Darshya team</p>`,
    }).catch(() => null);

    return reply.send({
      verified: true,
      reference: row.reference,
      status: 'confirmed',
      whatsappDelivery: waStatus,
    });
  });
}
