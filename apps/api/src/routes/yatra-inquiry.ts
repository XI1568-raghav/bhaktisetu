import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { randomBytes } from 'node:crypto';
import Razorpay from 'razorpay';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sendEmail } from '../lib/email.js';
import { sendWhatsappTemplate, whatsapp } from '../lib/whatsapp.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';
import { authenticateUser } from '../middlewares/auth.js';
import { computeYatraTotalInr } from '../lib/yatra-pricing.js';

/**
 * Yatra package commerce — inquiry intake (legacy) + real Razorpay checkout
 * (R-Q2-P-003). The inquiry route stays for affiliate/handoff cases where
 * pandit + hotel + transport availability needs manual confirmation; the new
 * /create-order + /verify-payment endpoints wire a real Razorpay checkout
 * for the 5 packaged tours we have hotel + pandit confirmations locked in
 * for (Char Dham, Vaishno Devi, Tirupati, Kashi, Shirdi). Demo-mode keys
 * mint synthetic order ids so dev + e2e stays green w/o real RZP creds.
 */

assertNotProductionDemo('routes/yatra-inquiry');

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isDemoPayment = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo';
const razorpay = isDemoPayment
  ? null
  : new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

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

// New Razorpay checkout schema for the 5 packaged tours w/ locked availability.
// Tighter shape — no free-form notes, no traveler dossier (collected separately
// once payment lands).
const createOrderSchema = z.object({
  yatraSlug: z.string().min(1).max(80),
  yatraTitle: z.string().max(160),
  packageTier: z.enum(['economy', 'standard', 'premium']),
  startDate: z.string().min(1).max(40),
  travelersCount: z.number().int().min(1).max(50),
  // COM-05: `totalInr` used to BE the amount charged (floor ₹500), so a
  // ₹2,98,000 package could be paid for with ₹500 — and /verify-payment
  // signed off on it, because the HMAC is checked against a Razorpay order
  // the server minted at the attacker's own figure. The price now comes from
  // lib/yatra-pricing.ts. `totalInr` is accepted only for backward compat and
  // ignored; `confirmTotalInr` is the number the client actually SHOWED the
  // buyer — when it disagrees with the server price we refuse rather than
  // charge a different amount than the screen promised.
  totalInr: z.number().int().min(0).max(2_000_000).optional(),
  confirmTotalInr: z.number().int().min(0).max(20_000_000).optional(),
  buyer: z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
    phone: z.string().min(6).max(40),
    country: z.string().max(80).optional().default('India'),
  }),
});

const verifyPaymentSchema = z.object({
  yatraBookingId: z.string().uuid(),
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1).optional(),
});

function refId(): string {
  const bytes = randomBytes(3).toString('hex').toUpperCase();
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `YTR-${ymd}-${bytes}`;
}

async function ensureYatraBookingsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS yatra_bookings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference TEXT UNIQUE NOT NULL,
      yatra_slug TEXT NOT NULL,
      yatra_title TEXT NOT NULL,
      package_tier TEXT NOT NULL,
      start_date TEXT NOT NULL,
      travelers_count INT NOT NULL,
      amount_inr NUMERIC(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      buyer_name TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      buyer_phone TEXT,
      buyer_country TEXT,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      created_at TIMESTAMPTZ DEFAULT now(),
      paid_at TIMESTAMPTZ
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS yatra_bookings_status_idx ON yatra_bookings (status);`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS yatra_bookings_slug_idx ON yatra_bookings (yatra_slug);`,
  );
}

type YatraBookingRow = {
  id: string;
  reference: string;
  yatra_slug: string;
  yatra_title: string;
  package_tier: string;
  start_date: string;
  travelers_count: number;
  amount_inr: string;
  currency: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string | null;
  buyer_country: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  status: string;
  created_at: Date;
  paid_at: Date | null;
};

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

export const __testing = { inquirySchema, createOrderSchema, verifyPaymentSchema, refId };

export async function yatraInquiryRoutes(server: FastifyInstance) {
  // ─── POST /                       Legacy inquiry intake (email + WA) ────
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

    let waDelivery: 'sent' | 'skipped' | 'failed' = 'skipped';
    if (whatsapp.enabled) {
      const opsTo = process.env.YATRA_OPS_WHATSAPP || '';
      if (opsTo) {
        await sendWhatsappTemplate({
          to: opsTo,
          template: 'yatra_inquiry_ops',
          languageCode: 'en',
          variables: [referenceId, body.packageTier, String(body.travelersCount), body.startDate],
        }).catch(() => null);
      }
      if (body.buyer.phone) {
        const r = await sendWhatsappTemplate({
          to: body.buyer.phone,
          template: 'yatra_inquiry_received',
          languageCode: 'en',
          variables: [body.buyer.name, body.yatraTitle || body.yatraSlug, referenceId],
        }).catch(() => ({ ok: false }));
        waDelivery = r.ok ? 'sent' : 'failed';
      }
    }

    request.log.info({ referenceId, yatraSlug: body.yatraSlug, tier: body.packageTier, waDelivery }, '[yatra-inquiry]');
    return reply.status(200).send({ referenceId, ok: true, waDelivery });
  });

  // ─── POST /create-order       Real Razorpay checkout (R-Q2-P-003) ───────
  // Replaces the prior setTimeout mock (HANDOFF 2026-05-27). Persists a
  // pending_payment yatra_bookings row + returns a Razorpay order id + keyId
  // so the web checkout component can open the gateway dialog. Demo-mode
  // keys synthesize an order id so dev + smoke stays green w/o RZP creds.
  // COM-05: `authenticateUser` — this endpoint mints a real Razorpay order and
  // a yatra_bookings row. It was public.
  server.post('/create-order', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const body = parsed.data;

    // COM-05: server-authoritative price. The client's `totalInr` is not used.
    const priced = computeYatraTotalInr(body.yatraSlug, body.packageTier, body.travelersCount);
    if (!priced.ok) {
      return reply.code(400).send({
        error: priced.reason,
        message:
          priced.reason === 'unknown_package'
            ? 'This yatra package is not available for online checkout.'
            : 'Invalid traveller count.',
      });
    }
    const serverTotalInr = priced.totalInr;
    // Both sides of the contract: if the page showed the buyer a different
    // number, do not quietly charge ours.
    if (
      typeof body.confirmTotalInr === 'number' &&
      body.confirmTotalInr !== serverTotalInr
    ) {
      return reply.code(409).send({
        error: 'price_mismatch',
        message: 'The price changed while you were booking. Please review and try again.',
        serverTotalInr,
      });
    }

    const reference = refId();
    const amountInPaise = Math.round(serverTotalInr * 100);

    await ensureYatraBookingsTable();

    let razorpayOrderId: string | null = null;
    if (!isDemoPayment && razorpay) {
      try {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: reference,
          notes: {
            yatraRef: reference,
            yatraSlug: body.yatraSlug,
            yatraTitle: body.yatraTitle,
            packageTier: body.packageTier,
            travelers: String(body.travelersCount),
          },
        });
        razorpayOrderId = order.id;
      } catch (err: any) {
        server.log.error({ err }, 'razorpay.orders.create failed (yatra)');
        return reply.code(502).send({ error: 'payment_gateway_unavailable' });
      }
    } else {
      razorpayOrderId = `order_demo_${randomBytes(8).toString('hex')}`;
    }

    const rows = await prisma.$queryRawUnsafe<YatraBookingRow[]>(
      `INSERT INTO yatra_bookings
        (reference, yatra_slug, yatra_title, package_tier, start_date,
         travelers_count, amount_inr, currency, buyer_name, buyer_email,
         buyer_phone, buyer_country, razorpay_order_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'INR', $8, $9, $10, $11, $12, 'pending_payment')
       RETURNING *;`,
      reference,
      body.yatraSlug,
      body.yatraTitle,
      body.packageTier,
      body.startDate,
      body.travelersCount,
      serverTotalInr,
      body.buyer.name,
      body.buyer.email,
      body.buyer.phone,
      body.buyer.country ?? 'India',
      razorpayOrderId,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(500).send({ error: 'persist_failed' });
    }

    return reply.code(201).send({
      yatraBookingId: row.id,
      reference: row.reference,
      amountInPaise,
      amountInr: serverTotalInr,
      currency: 'INR',
      razorpayOrderId,
      razorpayKeyId: isDemoPayment ? null : razorpayKeyId,
      demo: isDemoPayment,
    });
  });

  // ─── POST /verify-payment  Razorpay HMAC verify, flip status confirmed ──
  server.post('/verify-payment', async (request, reply) => {
    const parsed = verifyPaymentSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.flatten() });
    }
    const { yatraBookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    await ensureYatraBookingsTable();
    const rows = await prisma.$queryRawUnsafe<YatraBookingRow[]>(
      `SELECT * FROM yatra_bookings WHERE id = $1::uuid LIMIT 1;`,
      yatraBookingId,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(404).send({ error: 'booking_not_found' });
    }
    if (row.status === 'confirmed') {
      return reply.send({ verified: true, reference: row.reference, alreadyConfirmed: true });
    }

    if (!isDemoPayment) {
      if (!razorpay_signature) {
        return reply.code(400).send({ error: 'missing_signature' });
      }
      if (razorpay_order_id !== row.razorpay_order_id) {
        return reply.code(400).send({ error: 'order_id_mismatch' });
      }
      const expected = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(razorpay_signature, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return reply.code(400).send({ error: 'invalid_signature' });
      }
    }

    await prisma.$executeRawUnsafe(
      `UPDATE yatra_bookings
         SET razorpay_payment_id = $1, status = 'confirmed', paid_at = now()
       WHERE id = $2::uuid;`,
      razorpay_payment_id,
      yatraBookingId,
    );

    // Receipt to buyer (env-or-noop).
    await sendEmail({
      to: row.buyer_email,
      subject: `Yatra booking confirmed — ${row.reference}`,
      html: `<p>Namaste ${esc(row.buyer_name)},</p>
<p>Your payment of ₹${esc(Number(row.amount_inr).toLocaleString('en-IN'))} for <strong>${esc(row.yatra_title)}</strong> (${esc(row.package_tier)}) is confirmed.</p>
<p>Reference: <strong>${row.reference}</strong></p>
<p>Our yatra desk will reach out within 24h with the day-by-day itinerary, hotel vouchers, pickup details and pandit contact.</p>
<p>— Darshya yatra desk</p>`,
    }).catch(() => null);

    return reply.send({ verified: true, reference: row.reference, alreadyConfirmed: false });
  });
}
