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

interface DonationStore {
  id: string;
  userId: string;
  gaushalaId: string;
  amountInr: number;
  razorpayOrderId: string;
  status: 'created' | 'paid' | 'failed';
  createdAt: Date;
}

// In-memory store; for production this should be a `donations` Prisma table.
// Schema is identical fields → easy migration later.
const donationStore = new Map<string, DonationStore>();

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

    donationStore.set(donationId, {
      id: donationId,
      userId,
      gaushalaId: body.gaushalaId,
      amountInr: amount,
      razorpayOrderId,
      status: 'created',
      createdAt: new Date(),
    });

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
    const donation = donationStore.get(body.donationId);
    if (!donation) {
      return reply.code(404).send({ error: 'Donation not found' });
    }

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
        donation.status = 'failed';
        return reply.code(400).send({ error: 'Invalid payment signature' });
      }
    }

    donation.status = 'paid';

    // Lookup user + gaushala for receipt
    const user = await prisma.user.findUnique({ where: { id: donation.userId } });
    const gaushalaProfile = await prisma.gaushalaProfile.findFirst({
      where: { userId: donation.gaushalaId },
    }).catch(() => null);

    const receiptNumber = nextReceiptNumber();
    const donationDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    // Generate 80G PDF
    let pdfBuffer: Buffer | null = null;
    try {
      pdfBuffer = await generate80GReceipt({
        donorName: user?.fullName ?? 'Devotee',
        donorEmail: user?.email ?? '',
        amountInr: donation.amountInr,
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
        amount: `₹${donation.amountInr.toLocaleString('en-IN')}`,
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
      amount: donation.amountInr,
      status: 'paid',
    });
  });
}
