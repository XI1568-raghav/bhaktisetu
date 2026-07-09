import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { sendEmail, donationReceiptEmail } from '../lib/email.js';
import { generate80GReceipt } from '../lib/pdf-receipt.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';
import Razorpay from 'razorpay';

assertNotProductionDemo('routes/donations');

/**
 * Gaushala donation endpoints. Razorpay-backed payment + 80G receipt PDF
 * email on success.
 *
 * Flow:
 *   1. POST /donations/create-order  { gaushalaId, amountInr, planId? }
 *      → returns { razorpayOrderId, amount, currency, donationId }
 *      Frontend opens Razorpay checkout with this orderId
 *   2. POST /donations/verify        { donationId, razorpay_payment_id,
 *                                       razorpay_order_id, razorpay_signature }
 *      → verify signature, mark donation paid, email PDF receipt
 *
 * If RAZORPAY_KEY_ID is unset (demo mode), we still record the donation
 * but skip signature verification — the receipt email goes out so the
 * full flow can be exercised without a real merchant account.
 */

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isDemoPayment = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo';

const razorpay = isDemoPayment
  ? null
  : new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

// Donations live in the `donations` table. Raw SQL is used because the
// generated Prisma client may lag schema changes when the dll is locked
// on Windows; the migration's CHECK constraints + this module's narrow
// surface are the integrity gates.
type DonationRow = {
  id: string;
  user_id: string;
  gaushala_id: string;
  amount_inr: string; // numeric → string in Prisma raw queries
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  receipt_number: string | null;
  status: 'created' | 'paid' | 'failed';
  created_at: Date;
  paid_at: Date | null;
};

type GaushalaTaxRow = {
  pan: string | null;
  regn_80g: string | null;
};

// Idempotent column adds so 80G receipts can carry real PAN + registration
// numbers. Schema.prisma update tracked separately — raw SQL avoids client
// regeneration mid-deploy (same pattern as gift_puja_orders, astrologer_consultations).
async function ensureGaushalaTaxFields() {
  await prisma.$executeRawUnsafe(
    `ALTER TABLE gaushala_profiles ADD COLUMN IF NOT EXISTS pan TEXT;`,
  );
  await prisma.$executeRawUnsafe(
    `ALTER TABLE gaushala_profiles ADD COLUMN IF NOT EXISTS regn_80g TEXT;`,
  );
}

function nextReceiptNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DR-${ymd}-${rand}`;
}

// Floor: ₹101. Below ₹100 is below the 80G receipt threshold and ₹1
// donations are an obvious fraud/dust vector. Cap: ₹10,00,000 per single
// transaction — a misclick safety rail; large donors should call us.
const createOrderSchema = z.object({
  gaushalaId: z.string().min(1, 'gaushalaId is required'),
  amountInr: z.number({ invalid_type_error: 'amountInr must be a number' })
    .int('amountInr must be a whole number of rupees')
    .min(101, 'Minimum donation is ₹101')
    .max(1000000, 'Maximum single donation via this endpoint is ₹10,00,000'),
  planId: z.string().optional(),
});

const verifyDonationSchema = z.object({
  donationId: z.string().min(1, 'donationId is required'),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

export async function donationRoutes(server: FastifyInstance) {
  await ensureGaushalaTaxFields().catch((err) =>
    server.log.warn({ err }, 'gaushala_profiles tax-field add failed'),
  );

  // ── Create order ─────────────────────────────────────────────────────
  server.post('/create-order', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }
    const { gaushalaId, amountInr, planId } = parsed.data;
    const amount = amountInr;

    const userId = request.currentUser!.id;
    const donationId = `don_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let razorpayOrderId: string;
    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: donationId,
        notes: { gaushalaId, planId: planId ?? '', userId },
      });
      razorpayOrderId = order.id;
    } else {
      razorpayOrderId = `order_demo_${Date.now()}`;
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO donations (id, user_id, gaushala_id, amount_inr, razorpay_order_id, status)
       VALUES ($1, $2::uuid, $3, $4, $5, 'created')`,
      donationId,
      userId,
      gaushalaId,
      amount,
      razorpayOrderId,
    );

    return reply.send({
      donationId,
      razorpayOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      keyId: razorpayKeyId || 'rzp_test_demo',
      isDemoPayment,
    });
  });

  // ── Verify payment ──────────────────────────────────────────────────
  server.post('/verify', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = verifyDonationSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }
    const body = parsed.data;
    const rows = await prisma.$queryRawUnsafe<DonationRow[]>(
      `SELECT id, user_id, gaushala_id, amount_inr, razorpay_order_id,
              razorpay_payment_id, receipt_number, status, created_at, paid_at
         FROM donations
        WHERE id = $1
        LIMIT 1`,
      body.donationId,
    );
    const donation = rows[0];
    if (!donation) {
      return reply.code(404).send({ error: 'Donation not found' });
    }

    // P0 #PBO-1 (2026-07-09): ownership guard. The old handler verified a
    // Razorpay signature but never checked that the caller owns this
    // donation, so an attacker could pay ₹101 anywhere and mark a victim's
    // ₹10,00,000 donation paid + receive an 80G receipt for money they
    // never gave. Mirror consultation.ts:270.
    const me = request.currentUser!;
    if (donation.user_id !== me.id && !me.roles.includes('ADMIN')) {
      return reply.code(403).send({
        error: 'Forbidden',
        message: 'Not authorized to verify this donation.',
      });
    }

    const amountInr = Number(donation.amount_inr);

    // Verify Razorpay signature (skip in demo mode)
    if (!isDemoPayment) {
      if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
        return reply.code(400).send({ error: 'Razorpay verification fields missing' });
      }
      // P0 #PBO-1 (2026-07-09): order-id match. The signature was verified
      // over the client-supplied order id but never compared to the donation
      // row's stored order id — so a valid signature for ANY of the caller's
      // orders would mark THIS donation paid. Mirror consultation.ts:288.
      if (body.razorpay_order_id !== donation.razorpay_order_id) {
        return reply.code(400).send({ error: 'Order id mismatch.' });
      }
      const expected = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
        .digest('hex');
      // Timing-safe compare — `===` on hex strings leaks signature bytes
      // through response-time deltas under load.
      const expBuf = Buffer.from(expected, 'utf8');
      const sigBuf = Buffer.from(body.razorpay_signature, 'utf8');
      const sigOk =
        expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
      if (!sigOk) {
        await prisma.$executeRawUnsafe(
          `UPDATE donations SET status = 'failed' WHERE id = $1`,
          donation.id,
        );
        return reply.code(400).send({ error: 'Invalid payment signature' });
      }
    }

    // Lookup user + gaushala for receipt
    const user = await prisma.user.findUnique({ where: { id: donation.user_id } });
    const gaushalaProfile = await prisma.gaushalaProfile.findFirst({
      where: { userId: donation.gaushala_id },
    }).catch(() => null);

    // Raw SQL fetch for pan + regn_80g — not in Prisma client until next
    // schema regeneration (see ensureGaushalaTaxFields).
    let taxFields: GaushalaTaxRow | null = null;
    if (gaushalaProfile) {
      const taxRows = await prisma.$queryRawUnsafe<GaushalaTaxRow[]>(
        `SELECT pan, regn_80g FROM gaushala_profiles WHERE user_id = $1::uuid LIMIT 1;`,
        donation.gaushala_id,
      ).catch(() => [] as GaushalaTaxRow[]);
      taxFields = taxRows[0] ?? null;
    }

    const receiptNumber = nextReceiptNumber();
    const donationDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    await prisma.$executeRawUnsafe(
      `UPDATE donations
          SET status = 'paid',
              paid_at = now(),
              razorpay_payment_id = $2,
              receipt_number = $3
        WHERE id = $1`,
      donation.id,
      body.razorpay_payment_id ?? null,
      receiptNumber,
    );

    // Generate 80G PDF
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generate80GReceipt({
        donorName: user?.fullName ?? 'Devotee',
        donorEmail: user?.email ?? '',
        amountInr,
        donationDate,
        receiptNumber,
        paymentMode: isDemoPayment ? 'Other' : 'UPI',
        paymentReference: body.razorpay_payment_id,
        gaushalaName: gaushalaProfile?.gaushalaName ?? 'Darshya Gaushala Network',
        gaushala80GNumber: taxFields?.regn_80g ?? undefined,
        gaushalaPan: taxFields?.pan ?? undefined,
        gaushalaAddress: gaushalaProfile?.address ?? undefined,
      });
    } catch (err) {
      server.log.error({ err }, 'Failed to generate 80G receipt PDF');
    }

    // Email the donor
    if (user?.email && pdfBuffer) {
      const tpl = donationReceiptEmail({
        donorName: user.fullName ?? 'Devotee',
        amount: `₹${amountInr.toLocaleString('en-IN')}`,
        gaushalaName: gaushalaProfile?.gaushalaName ?? 'Darshya Gaushala Network',
        receiptNumber,
        date: donationDate,
      });
      await sendEmail({
        to: user.email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        attachments: [
          { filename: `Darshya-Donation-Receipt-${receiptNumber}.pdf`, content: pdfBuffer },
        ],
      });
    }

    return reply.send({
      ok: true,
      donationId: donation.id,
      receiptNumber,
      amount: amountInr,
      status: 'paid',
    });
  });
}
