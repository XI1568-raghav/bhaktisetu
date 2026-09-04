import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { sendEmail, donationReceiptEmail } from '../lib/email.js';
import { generate80GReceipt, is80GEligible } from '../lib/pdf-receipt.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';
import { resolveGaushalaDonee } from '../lib/gaushala-donee.js';
// OPS-05: the durable money trail. `recordMoneyEvent` never throws and never
// joins a caller's transaction, so every call here is `void`-safe.
//
// Donations were the last money rail with NO audit coverage at all.
// `MONEY_EVENTS.DONATION_RECEIVED` was a declared constant with zero writers
// anywhere outside `lib/audit-money.ts` and its own unit test — so the one
// money flow that also mints an 80G tax receipt (a document handed to the
// Income Tax department) was the one flow whose history existed only in the
// Render log stream. Donations do not write a `prisma.payment` row either
// (raw INSERT, no Payment), so NOTHING in the payment-side wiring reached them.
import { MONEY_EVENTS, recordMoneyEvent, type MoneyActorType } from '../lib/audit-money.js';
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
  gaushala_id: string | null;
  temple_id: string | null;
  amount_inr: string; // numeric → string in Prisma raw queries
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  receipt_number: string | null;
  status: 'created' | 'paid' | 'failed';
  // P0 #PBO-14 (2026-07-09): donor PAN + dedication are persisted at create
  // time so the 80G receipt can carry the donor PAN.
  donor_pan: string | null;
  dedication: string | null;
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

// P0 #PBO-10/PBO-11 (2026-07-09): the donation confirm + receipt flow, in one
// place. Previously this lived inline in the /verify handler, so the webhook
// backstop (PBO-11) couldn't reuse it and a double-verify (PBO-10) would mint
// a second receipt. This helper:
//  - is IDEMPOTENT: if the donation is already paid, returns the existing
//    receipt_number without re-minting or re-emailing (fixes PBO-10).
//  - is shared by /verify AND the Razorpay webhook backstop (PBO-11), so a
//    closed browser (client-verify never fires) still flips the donation paid
//    + sends the receipt when Razorpay posts payment.captured.
// `log` is optional (the webhook has no Fastify server in scope here).
//
// OPS-05: `audit` is optional and DEFAULTS TO THE WEBHOOK SHAPE
// (`actorType: 'gateway'`, no actor id). That default is deliberate: the
// webhook backstop in `payment.service.processWebhookEvent` calls this helper
// positionally and passes nothing beyond `log`, so making the default anything
// other than "Razorpay acted" would mislabel every browser-died-mid-checkout
// donation as a devotee action. `/verify` — where a signed-in donor's browser
// really did return the result — overrides it explicitly. Distinguishing the
// two rails is the whole point of recording actor type at all: "which rail got
// there first" is unanswerable if both write `system`.
export interface DonationAuditContext {
  actorType?: MoneyActorType;
  actorId?: string | null;
  /** Which code path finalized, e.g. 'donations/verify'. Lands in metadata. */
  rail?: string;
  requestId?: string | null;
  ip?: string | null;
}

export async function finalizeDonationReceipt(
  donation: DonationRow,
  paymentId: string | null,
  log?: { warn: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void } | undefined,
  audit?: DonationAuditContext,
): Promise<{ receiptNumber: string | null; alreadyPaid: boolean }> {
  const noop = () => {};
  const logger = log ?? { warn: noop, error: noop };

  // PBO-10 idempotency: already paid -> return existing receipt, no re-mint.
  if (donation.status === 'paid') {
    return { receiptNumber: donation.receipt_number ?? null, alreadyPaid: true };
  }

  const amountInr = Number(donation.amount_inr);

  // Entity resolution (PBO-2): temple vs gaushala donee.
  const user = await prisma.user.findUnique({ where: { id: donation.user_id } });
  const isTempleDonation = !!donation.temple_id;
  const temple = isTempleDonation
    ? await prisma.temple.findUnique({
        where: { id: donation.temple_id! },
        select: { id: true, name: true, addressLine: true, city: true, state: true, pincode: true },
      }).catch(() => null)
    : null;
  const gaushalaProfile = !isTempleDonation
    ? await prisma.gaushalaProfile.findFirst({
        where: { userId: donation.gaushala_id ?? undefined },
      }).catch(() => null)
    : null;
  let taxFields: GaushalaTaxRow | null = null;
  if (gaushalaProfile && donation.gaushala_id) {
    const taxRows = await prisma.$queryRawUnsafe<GaushalaTaxRow[]>(
      `SELECT pan, regn_80g FROM gaushala_profiles WHERE user_id = $1::uuid LIMIT 1;`,
      donation.gaushala_id,
    ).catch(() => [] as GaushalaTaxRow[]);
    taxFields = taxRows[0] ?? null;
  }
  const doneeName = isTempleDonation
    ? (temple?.name ?? 'Darshya Temple')
    : (gaushalaProfile?.gaushalaName ?? 'Darshya Gaushala Network');
  const doneeAddress = isTempleDonation && temple
    ? `${temple.addressLine}, ${temple.city}, ${temple.state} ${temple.pincode}`
    : gaushalaProfile?.address;

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
    paymentId,
    receiptNumber,
  );

  // OPS-05: the donation is now durably 'paid' and a receipt number has been
  // minted. Log it HERE — after the UPDATE resolved, before the PDF and the
  // email, both of which are best-effort and swallow their own errors. A
  // receipt that failed to render is still a donation that was received, and
  // logging after the email would lose exactly the rows a donor disputes.
  //
  // Keyed on `donation.id`: one receive per donation, forever. The two rails
  // (`/verify` and the webhook backstop) can both reach this line for the same
  // donation in a race — the early-return above closes the common case, but not
  // a true concurrent one — and the namespaced unique key collapses that to a
  // single row instead of double-counting the money.
  void recordMoneyEvent({
    eventType: MONEY_EVENTS.DONATION_RECEIVED,
    actorType: audit?.actorType ?? 'gateway',
    actorId: audit?.actorId ?? null,
    subjectType: 'donation',
    subjectId: donation.id,
    // Rupees, straight off the stored DECIMAL(10,2) — not `amountInr`, which is
    // a float round-trip. The trail figure must be the ledger figure.
    amount: donation.amount_inr,
    currency: 'INR',
    gateway: 'razorpay',
    gatewayOrderId: donation.razorpay_order_id,
    gatewayPaymentId: paymentId,
    statusBefore: donation.status,
    statusAfter: 'paid',
    idempotencyKey: donation.id,
    requestId: audit?.requestId ?? null,
    ip: audit?.ip ?? null,
    note: `donation received via ${audit?.rail ?? 'razorpay-webhook-backstop'}`,
    metadata: {
      rail: audit?.rail ?? 'razorpay-webhook-backstop',
      receiptNumber,
      doneeKind: isTempleDonation ? 'temple' : 'gaushala',
      doneeId: isTempleDonation ? donation.temple_id : donation.gaushala_id,
      doneeName,
      // Deliberately NOT donor_pan. The trail is a support tool, not a second
      // store of tax identifiers.
    },
  });

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generate80GReceipt({
      donorName: user?.fullName ?? 'Devotee',
      donorEmail: user?.email ?? '',
      amountInr,
      donationDate,
      receiptNumber,
      paymentMode: 'UPI',
      paymentReference: paymentId ?? undefined,
      // P0 #PBO-14: carry the donor's PAN onto the 80G receipt.
      donorPan: donation.donor_pan ?? undefined,
      gaushalaName: doneeName,
      gaushala80GNumber: taxFields?.regn_80g ?? undefined,
      gaushalaPan: taxFields?.pan ?? undefined,
      gaushalaAddress: doneeAddress ?? undefined,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to generate 80G receipt PDF');
  }

  if (user?.email && pdfBuffer) {
    try {
      const tpl = donationReceiptEmail({
        donorName: user.fullName ?? 'Devotee',
        amount: `₹${amountInr.toLocaleString('en-IN')}`,
        gaushalaName: doneeName,
        receiptNumber,
        date: donationDate,
        // COM-02: one source of truth for the 80G claim — the same predicate
        // the PDF uses. Both are false today for every donee (regn_80g / pan
        // are written nowhere), and the temple branch never loads them at all.
        is80G: is80GEligible({
          gaushala80GNumber: taxFields?.regn_80g ?? undefined,
          gaushalaPan: taxFields?.pan ?? undefined,
        }),
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
    } catch (err) {
      logger.error({ err }, 'Failed to email donation receipt');
    }
  }

  return { receiptNumber, alreadyPaid: false };
}

// Look up a donation by its Razorpay order id (raw SQL — donations use a raw
// INSERT, no prisma.payment row). Returns null if no match. Used by the webhook
// backstop (PBO-11).
export async function findDonationByOrderId(razorpayOrderId: string): Promise<DonationRow | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<DonationRow[]>(
      `SELECT id, user_id, gaushala_id, temple_id, amount_inr, razorpay_order_id,
              razorpay_payment_id, receipt_number, status, donor_pan, dedication, created_at, paid_at
         FROM donations
         WHERE razorpay_order_id = $1
         LIMIT 1`,
      razorpayOrderId,
    );
    return (rows as DonationRow[])[0] ?? null;
  } catch {
    return null;
  }
}

// Floor: ₹101. Below ₹100 is below the 80G receipt threshold and ₹1
// donations are an obvious fraud/dust vector. Cap: ₹10,00,000 per single
// transaction — a misclick safety rail; large donors should call us.
const createOrderSchema = z.object({
  // P0 #PBO-2 (2026-07-09): polymorphic donee. The old schema required
  // gaushalaId, so temple donations were either rejected or forced through
  // the gaushala path (temple_id never set, receipts named the wrong entity).
  // Now the caller declares the cause kind; exactly one of (gaushalaId,
  // templeId) must match the kind. Backward-compat: omitting causeKind
  // defaults to 'gaushala' with gaushalaId required (legacy callers).
  causeKind: z.enum(['gaushala', 'temple']).optional(),
  gaushalaId: z.string().min(1).optional(),
  templeId: z.string().uuid().optional(),
  amountInr: z.number({ invalid_type_error: 'amountInr must be a number' })
    .int('amountInr must be a whole number of rupees')
    .min(101, 'Minimum donation is ₹101')
    .max(1000000, 'Maximum single donation via this endpoint is ₹10,00,000'),
  planId: z.string().optional(),
  // P0 #PBO-14 (2026-07-09): persist donor PAN (required ≥ ₹2,000 for 80G) +
  // the optional dedication. Previously accepted by the form but dropped here.
  donorPan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format').optional(),
  dedication: z.string().max(200).optional(),
}).refine(
  (d) => {
    const kind = d.causeKind ?? 'gaushala';
    if (kind === 'temple') return !!d.templeId && !d.gaushalaId;
    return !!d.gaushalaId && !d.templeId;
  },
  { message: 'Provide gaushalaId for a gaushala cause or templeId for a temple cause (not both).', path: ['causeKind'] },
);

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
    const { causeKind, gaushalaId, templeId, amountInr, planId } = parsed.data;
    const kind = causeKind ?? 'gaushala';
    const amount = amountInr;

    const userId = request.currentUser!.id;

    // S-05: resolve the gaushala donee BEFORE any money moves. The caller may
    // send a GaushalaProfile id, the owner's User id, or a legacy directory
    // fixture id; all three collapse to the owner id the gaushala portal
    // filters on. An id that matches no onboarded gaushala is refused — we do
    // not take a donation for a donee that cannot be paid and cannot be named
    // on the receipt.
    let doneeGaushalaId = gaushalaId;
    if (kind === 'gaushala') {
      const resolved = await resolveGaushalaDonee(gaushalaId!);
      if (!resolved.ok) {
        return reply.code(400).send({
          code: 'gaushala_not_onboarded',
          error: 'Gaushala not available for donations',
          message:
            'This gaushala is not yet onboarded to receive donations through Darshya. Please choose a verified gaushala.',
        });
      }
      doneeGaushalaId = resolved.donee.doneeUserId;
    }

    const donationId = `don_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let razorpayOrderId: string;
    if (razorpay) {
      const order = await razorpay.orders.create({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: donationId,
        notes: {
          causeKind: kind,
          ...(kind === 'temple' ? { templeId: templeId! } : { gaushalaId: doneeGaushalaId! }),
          planId: planId ?? '',
          userId,
        },
      });
      razorpayOrderId = order.id;
    } else {
      razorpayOrderId = `order_demo_${Date.now()}`;
    }

    // P0 #PBO-2 (2026-07-09): write the correct donee id. Temple donations
    // set temple_id (gaushala_id NULL); gaushala donations keep the legacy
    // stringified-user_id in gaushala_id. The Donation row's polymorphic
    // invariant (exactly one non-null) is upheld by the schema refine above.
    if (kind === 'temple') {
      await prisma.$executeRawUnsafe(
        `INSERT INTO donations (id, user_id, temple_id, amount_inr, razorpay_order_id, status, donor_pan, dedication)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5, 'created', $6, $7)`,
        donationId,
        userId,
        templeId,
        amount,
        razorpayOrderId,
        parsed.data.donorPan ?? null,
        parsed.data.dedication ?? null,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO donations (id, user_id, gaushala_id, amount_inr, razorpay_order_id, status, donor_pan, dedication)
         VALUES ($1, $2::uuid, $3, $4, $5, 'created', $6, $7)`,
        donationId,
        userId,
        doneeGaushalaId,
        amount,
        razorpayOrderId,
        parsed.data.donorPan ?? null,
        parsed.data.dedication ?? null,
      );
    }

    // OPS-05: the order is open and the donation row exists owing money. This
    // is the donation rail's equivalent of `PAYMENT_INITIATED` in
    // `payment.service.createOrder` — without it the trail's first entry for a
    // donation is the receive, so a donation that was opened and never
    // completed leaves no record that the donor ever tried, and the gap
    // between intent and capture (the window a chargeback lands in) is
    // invisible.
    void recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_INITIATED,
      actorType: 'devotee',
      actorId: userId,
      subjectType: 'donation',
      subjectId: donationId,
      amount,
      currency: 'INR',
      gateway: razorpay ? 'razorpay' : 'demo',
      gatewayOrderId: razorpayOrderId,
      statusAfter: 'created',
      idempotencyKey: razorpayOrderId,
      requestId: request.id ? String(request.id) : null,
      ip: request.ip ?? null,
      note: `donation order opened for ${kind}`,
      metadata: {
        rail: 'donations/create-order',
        doneeKind: kind,
        doneeId: kind === 'temple' ? templeId : doneeGaushalaId,
        planId: planId ?? null,
      },
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
    const parsed = verifyDonationSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({
        error: 'Invalid request body',
        details: parsed.error.flatten(),
      });
    }
    const body = parsed.data;
    const rows = await prisma.$queryRawUnsafe<DonationRow[]>(
      `SELECT id, user_id, gaushala_id, temple_id, amount_inr, razorpay_order_id,
              razorpay_payment_id, receipt_number, status, donor_pan, dedication, created_at, paid_at
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
        // OPS-05: this write destroys the only evidence of the attempt — the
        // row goes to 'failed' and the reason lives nowhere. A donor whose
        // bank statement shows a debit against a donation the product calls
        // 'failed' is the single hardest dispute to answer, and until now the
        // answer was "check the Render logs", which on the free plan are gone.
        // Keyed per gateway payment id so a second attempt logs a second row.
        void recordMoneyEvent({
          eventType: MONEY_EVENTS.PAYMENT_FAILED,
          actorType: 'devotee',
          actorId: request.currentUser?.id ?? null,
          subjectType: 'donation',
          subjectId: donation.id,
          amount: donation.amount_inr,
          currency: 'INR',
          gateway: 'razorpay',
          gatewayOrderId: donation.razorpay_order_id,
          gatewayPaymentId: body.razorpay_payment_id ?? null,
          statusBefore: donation.status,
          statusAfter: 'failed',
          idempotencyKey: `${donation.id}:${body.razorpay_payment_id ?? 'no-payment-id'}`,
          requestId: request.id ? String(request.id) : null,
          ip: request.ip ?? null,
          note: 'donation signature verification failed',
          // No signature, no order/payment pair beyond the ids already columned
          // — `redactMetadata` would blank a `razorpay_signature` key anyway,
          // and storing the bytes we just refused to trust helps nobody.
          metadata: { rail: 'donations/verify', reason: 'signature-mismatch' },
        });
        return reply.code(400).send({ error: 'Invalid payment signature' });
      }
    }

    // P0 #PBO-10/PBO-11 (2026-07-09): delegate to the shared
    // finalizeDonationReceipt helper. This makes /verify idempotent (a double-
    // verify no longer mints a second receipt — PBO-10) and lets the Razorpay
    // webhook backstop reuse the exact same confirm+receipt flow (PBO-11). The
    // entity resolution (temple vs gaushala donee — PBO-2) now lives in the
    // helper, so this handler is just: verify signature -> finalize.
    const finalized = await finalizeDonationReceipt(
      donation,
      body.razorpay_payment_id ?? null,
      server.log,
      // OPS-05: override the gateway default — a signed-in donor's browser
      // returned this result, which is a different fact from the webhook
      // backstop firing because that browser died.
      {
        actorType: 'devotee',
        actorId: request.currentUser?.id ?? null,
        rail: 'donations/verify',
        requestId: request.id ? String(request.id) : null,
        ip: request.ip ?? null,
      },
    );

    return reply.send({
      ok: true,
      donationId: donation.id,
      receiptNumber: finalized.receiptNumber,
      amount: amountInr,
      status: 'paid',
    });
  });
}

export const __testing = { createOrderSchema, finalizeDonationReceipt, findDonationByOrderId };

