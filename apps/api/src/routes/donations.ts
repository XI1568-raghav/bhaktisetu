import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { sendEmail, donationReceiptEmail } from '../lib/email.js';
import { generate80GReceipt } from '../lib/pdf-receipt.js';
import Razorpay from 'razorpay';

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

function nextReceiptNumber(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `DR-${ymd}-${rand}`;
}

export async function donationRoutes(server: FastifyInstance) {
  // ── Create order ─────────────────────────────────────────────────────
  server.post('/create-order', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      gaushalaId?: string;
      amountInr?: number;
      planId?: string;
    };
    const amount = Number(body.amountInr);
    if (!body.gaushalaId || !amount || amount < 1) {
      return reply.code(400).send({ error: 'gaushalaId and amountInr (>=1) required' });
    }

    const userId = request.currentUser!.id;
    const donationId = `don_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let razorpayOrderId: string;
    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: donationId,
        notes: { gaushalaId: body.gaushalaId, planId: body.planId ?? '', userId },
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
      body.gaushalaId,
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
    const body = (request.body ?? {}) as {
      donationId?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };
    if (!body.donationId) {
      return reply.code(400).send({ error: 'donationId required' });
    }
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
    const amountInr = Number(donation.amount_inr);

    // Verify Razorpay signature (skip in demo mode)
    if (!isDemoPayment) {
      if (!body.razorpay_order_id || !body.razorpay_payment_id || !body.razorpay_signature) {
        return reply.code(400).send({ error: 'Razorpay verification fields missing' });
      }
      const expected = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${body.razorpay_order_id}|${body.razorpay_payment_id}`)
        .digest('hex');
      if (expected !== body.razorpay_signature) {
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
        gaushala80GNumber: gaushalaProfile ? 'AAAGD1234F' : undefined,
        gaushalaPan: gaushalaProfile ? 'AAAGD1234F' : undefined,
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
