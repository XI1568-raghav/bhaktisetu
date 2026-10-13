import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';
import { sendEmail, donationReceiptEmail } from '../lib/email.js';
import { generate80GReceipt, is80GEligible } from '../lib/pdf-receipt.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';
import { resolveGaushalaDonee } from '../lib/gaushala-donee.js';
import { deliverOrQueue, type OutboxMail } from '../lib/email-outbox.js';
import { readDoneeTax } from '../lib/donee-tax.js';
import { donorContactMap, saveDonorContact } from '../lib/donation-contact.js';
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
import { withGatewayTimeout } from '../lib/razorpay-timeout.js';
import { SQL_UTC_NOW } from '../lib/sql-time.js';
import { describeGatewayFailure } from '../lib/payment-gateway-error.js';

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
  : withGatewayTimeout(new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret }));

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

interface DoneeContext {
  doneeName: string;
  doneeAddress: string | undefined;
  /** Donee PAN + 80G registration, null when none is on file. */
  taxFields: GaushalaTaxRow | null;
}

/**
 * Who the money went to, and the tax identifiers on file for them. Gaushalas keep
 * them on gaushala_profiles, temples on temples (donee-tax.ts); both are read with
 * raw SQL that tolerates the columns being absent.
 */
async function loadDoneeContext(donation: DonationRow): Promise<DoneeContext> {
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
  } else if (temple) {
    // Honest equivalent for temples: the same pair of facts, from temples.pan /
    // temples.regn_80g. Empty until the temple manager or an admin enters them.
    const t = await readDoneeTax('temple', temple.id);
    taxFields = { pan: t.pan, regn_80g: t.regn80g };
  }
  const doneeName = isTempleDonation
    ? (temple?.name ?? 'Darshya Temple')
    : (gaushalaProfile?.gaushalaName ?? 'Darshya Gaushala Network');
  const doneeAddress = isTempleDonation && temple
    ? `${temple.addressLine}, ${temple.city}, ${temple.state} ${temple.pincode}`
    : gaushalaProfile?.address ?? undefined;
  return { doneeName, doneeAddress, taxFields };
}

function istDate(d: Date): string {
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata',
  });
}

/** The covering email for a receipt, using the same 80G predicate as the PDF. */
function receiptEmail(args: {
  to: string;
  donorName: string;
  amountInr: number;
  doneeName: string;
  receiptNumber: string;
  donationDate: string;
  taxFields: GaushalaTaxRow | null;
  pdf: Buffer;
}): OutboxMail {
  const tpl = donationReceiptEmail({
    donorName: args.donorName,
    amount: `₹${args.amountInr.toLocaleString('en-IN')}`,
    gaushalaName: args.doneeName,
    receiptNumber: args.receiptNumber,
    date: args.donationDate,
    // COM-02: one source of truth for the 80G claim — the same predicate
    // the PDF uses: donee registration AND donee PAN AND the platform flag.
    is80G: is80GEligible({
      gaushala80GNumber: args.taxFields?.regn_80g ?? undefined,
      gaushalaPan: args.taxFields?.pan ?? undefined,
    }),
  });
  return {
    to: args.to,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
    attachments: [
      { filename: `Darshya-Donation-Receipt-${args.receiptNumber}.pdf`, content: args.pdf },
    ],
  };
}

/**
 * Regenerate the receipt email for an already-paid donation from its id alone
 * (no PDF is stored). Used by the email-outbox retry job. null = nothing to send.
 */
export async function buildDonationReceiptMail(donationId: string): Promise<OutboxMail | null> {
  const rows = await prisma.$queryRawUnsafe<DonationRow[]>(
    `SELECT id, user_id, gaushala_id, temple_id, amount_inr, razorpay_order_id,
            razorpay_payment_id, receipt_number, status, donor_pan, dedication, created_at, paid_at
       FROM donations WHERE id = $1 LIMIT 1`,
    donationId,
  );
  const donation = Array.isArray(rows) ? rows[0] : undefined;
  if (!donation || donation.status !== 'paid' || !donation.receipt_number) return null;
  const user = await prisma.user.findUnique({ where: { id: donation.user_id } });
  if (!user?.email) return null;
  const { doneeName, doneeAddress, taxFields } = await loadDoneeContext(donation);
  const contact = (await donorContactMap([donation.id])).get(donation.id);
  const donorName = contact?.name ?? user.fullName ?? 'Devotee';
  const amountInr = Number(donation.amount_inr);
  const donationDate = istDate(donation.paid_at ? new Date(donation.paid_at) : new Date());
  const pdf = await generate80GReceipt({
    donorName,
    donorEmail: user.email,
    amountInr,
    donationDate,
    receiptNumber: donation.receipt_number,
    paymentMode: 'UPI',
    paymentReference: donation.razorpay_payment_id ?? undefined,
    donorPan: donation.donor_pan ?? undefined,
    gaushalaName: doneeName,
    gaushala80GNumber: taxFields?.regn_80g ?? undefined,
    gaushalaPan: taxFields?.pan ?? undefined,
    gaushalaAddress: doneeAddress ?? undefined,
  });
  return receiptEmail({
    to: user.email, donorName, amountInr, doneeName,
    receiptNumber: donation.receipt_number, donationDate, taxFields, pdf,
  });
}

function nextReceiptNumber(): string {
  // QA 2026-10-13: the date in the number must be the date printed on the
  // receipt, and that is the Indian date. The server runs in UTC, so between
  // 18:30 and 24:00 UTC (00:00-05:30 IST) the number said yesterday.
  const ymd = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
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
  const { doneeName, doneeAddress, taxFields } = await loadDoneeContext(donation);

  const receiptNumber = nextReceiptNumber();
  const donationDate = istDate(new Date());

  // ── DI-09 (F455): `AND status <> 'paid'` is what makes this a CLAIM ─────────
  //
  // The early return above closes the SEQUENTIAL double-verify (PBO-10) and
  // nothing more. Both rails read their `DonationRow` before calling — /verify
  // from the request, the webhook backstop via `findDonationByOrderId` — so two
  // concurrent finalizations both hold a snapshot saying `status: 'created'`,
  // both pass that return, and both reach this statement.
  //
  // Unconditional, the second UPDATE overwrites the first. `donations` already
  // carries `donations_receipt_number_key`, and it does not help: the two calls
  // generate DIFFERENT numbers (`nextReceiptNumber()` is date + 4 random hex,
  // one per call), so the unique index is satisfied by both and the collision is
  // a row overwriting its OWN column — the one shape no index can express.
  //
  // The damage is not cosmetic. By the time the loser writes, the winner has
  // already rendered an 80G PDF and emailed it to the donor bearing the FIRST
  // number, and that number then exists nowhere in the database. `donations` is
  // what an Income-Tax 80G claim is reconciled against.
  //
  // This is the same single-winner claim `claimCaptureTransition` makes at
  // services/payment.service.ts:398 (`... AND status <> 'captured'`), read the
  // same way: `$executeRawUnsafe` returns the affected-row count, exactly one
  // caller sees 1, and everyone else sees 0.
  const claimed = await prisma.$executeRawUnsafe(
    `UPDATE donations
        SET status = 'paid',
            paid_at = ${SQL_UTC_NOW},
            razorpay_payment_id = $2,
            receipt_number = $3
      WHERE id = $1 AND status <> 'paid'`,
    donation.id,
    paymentId,
    receiptNumber,
  );

  if (Number(claimed) !== 1) {
    // Lost the race (or the row is gone). `receiptNumber` above was generated
    // but never stored, so it must not be returned, logged or emailed —
    // reporting it would hand the caller a receipt number that exists in no
    // database. Re-read the winner's instead and answer exactly as the
    // already-paid early return does.
    //
    // Everything below this point is skipped deliberately: the audit event
    // (this call received no money), the 80G PDF and the receipt email. Two 80G
    // receipts for one donation is two tax documents for one gift.
    const winner = await prisma
      .$queryRawUnsafe<Array<{ receipt_number: string | null }>>(
        `SELECT receipt_number FROM donations WHERE id = $1 LIMIT 1`,
        donation.id,
      )
      .catch(() => [] as Array<{ receipt_number: string | null }>);

    return { receiptNumber: winner[0]?.receipt_number ?? null, alreadyPaid: true };
  }

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

  // The name the donor typed on the form (when they gave one) is the name on
  // their tax receipt; the account name is the fallback.
  const contact = (await donorContactMap([donation.id])).get(donation.id);
  const donorName = contact?.name ?? user?.fullName ?? 'Devotee';

  let pdfBuffer: Buffer | null = null;
  try {
    pdfBuffer = await generate80GReceipt({
      donorName,
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
      // Inline attempt with a short timeout; on failure the mail is recorded in
      // email_outbox and the retry job regenerates it from the donation id.
      const sent = await deliverOrQueue(
        receiptEmail({
          to: user.email, donorName, amountInr, doneeName, receiptNumber, donationDate, taxFields, pdf: pdfBuffer,
        }),
        { kind: 'donation_receipt', refId: donation.id },
      );
      if (sent.queued) logger.warn({ donationId: donation.id, error: sent.error }, 'Donation receipt email queued for retry');
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
  // The donor's own details as typed on the form (not the paying account's). The
  // recipient's portal shows these; the account name / email remain the fallback.
  donorName: z.string().trim().min(1).max(120).optional(),
  donorEmail: z.string().trim().email().max(200).optional(),
  donorPhone: z.string().trim().regex(/^\+?[0-9]{10,13}$/, 'Invalid phone number').optional(),
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

/**
 * A temple can take a donation only if an admin has approved a manager profile
 * for it. TempleProfile has no FK to Temple; the portal links them by name
 * (case- and whitespace-tolerant), so this does too.
 */
async function templeHasApprovedManager(templeName: string, templeId?: string): Promise<boolean> {
  const profile = await prisma.templeProfile.findFirst({
    where: { approved: true, templeName: { equals: templeName.trim(), mode: 'insensitive' } },
    select: { userId: true },
  });
  if (profile) return true;
  // An admin's explicit link (temple_manager_links) outranks the name match in
  // the temple portal, so a linked manager with an approved profile whose
  // typed name differs from the Temple row IS the temple's payee. Ignoring the
  // link refused donations for a temple whose portal would have shown them.
  if (!templeId) return false;
  try {
    const rows = await prisma.$queryRawUnsafe<{ ok: number }[]>(
      `SELECT 1 AS ok FROM temple_manager_links l
         JOIN temple_profiles p ON p.user_id = l.manager_user_id AND p.approved = true
        WHERE l.temple_id = $1::uuid LIMIT 1`,
      templeId,
    );
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function donationRoutes(server: FastifyInstance) {
  await ensureGaushalaTaxFields().catch((err) =>
    server.log.warn({ err }, 'gaushala_profiles tax-field add failed'),
  );

  // ── Temples that can receive a donation ──────────────────────────────
  // The donations page listed every verified catalogue temple, including ones
  // with no manager and so no way to be paid. This is the list the form may
  // offer: verified temples with an approved manager profile.
  server.get('/temples', async (request, reply) => {
    try {
      const profiles = await prisma.templeProfile.findMany({
        where: { approved: true },
        select: { templeName: true },
        take: 500,
      });
      const names = [...new Set(profiles.map((p) => (p.templeName ?? '').trim()).filter(Boolean))];
      // QA 2026-10-13: create-order also accepts a temple an admin LINKED to an approved
      // manager profile (temple_manager_links), whatever name that profile typed. The
      // list the form offers has to be the same set, or a payable temple is invisible.
      let linkedIds: string[] = [];
      try {
        const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
          `SELECT DISTINCT l.temple_id::text AS id FROM temple_manager_links l
             JOIN temple_profiles p ON p.user_id = l.manager_user_id AND p.approved = true`,
        );
        linkedIds = Array.isArray(rows) ? rows.map((r) => r.id) : [];
      } catch {
        // table absent on an unmigrated database: name matches alone
      }
      if (names.length === 0 && linkedIds.length === 0) return { temples: [] };
      const temples = await prisma.temple.findMany({
        where: {
          isVerified: true,
          OR: [
            ...names.map((name) => ({ name: { equals: name, mode: 'insensitive' as const } })),
            ...(linkedIds.length ? [{ id: { in: linkedIds } }] : []),
          ],
        },
        select: { id: true, name: true, city: true, state: true, deityPrimary: true, description: true, images: true },
        orderBy: { name: 'asc' },
        take: 100,
      });
      return { temples };
    } catch (err) {
      request.log.error({ err }, 'donatable temples failed');
      return reply.code(500).send({ error: 'Could not load temples.' });
    }
  });

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

    // The temple path got none of the S-05 checks. A catalogue temple with no
    // manager (Kashi, Tirupati ...) was accepted and the money banked for a donee
    // that cannot be paid, and an unknown id opened a Razorpay order and then
    // failed on the INSERT with a 500. Same rule as the gaushala: the donee must
    // exist, be verified, and have an approved manager the money can go to.
    if (kind === 'temple') {
      const temple = await prisma.temple.findUnique({
        where: { id: templeId! },
        select: { id: true, name: true, isVerified: true },
      });
      if (!temple) {
        return reply.code(404).send({
          code: 'temple_not_found',
          error: 'Temple not found',
          message: 'We could not find that temple. Please choose a temple from the list.',
        });
      }
      const manager = temple.isVerified ? await templeHasApprovedManager(temple.name, temple.id) : false;
      if (!manager) {
        return reply.code(400).send({
          code: 'temple_not_onboarded',
          error: 'Temple not available for donations',
          message:
            'This temple is not yet onboarded to receive donations through Darshya. Please choose a temple that is listed on the donations page.',
        });
      }
    }

    // QA 2026-10-13: idempotency. The mobile app opens an order and then the web form
    // opened a SECOND one for the same donor, donee and amount, leaving an orphan
    // 'created' row. A still-open order for the same (user, donee, amount) created
    // within the last 15 minutes is reused: same donationId, same gateway order.
    // Changing the PAN / dedication on the reused row keeps the receipt truthful.
    const doneeColumn = kind === 'temple' ? 'temple_id' : 'gaushala_id';
    const doneeCast = kind === 'temple' ? '$2::uuid' : '$2';
    try {
      const open = await prisma.$queryRawUnsafe<{ id: string; razorpay_order_id: string }[]>(
        `SELECT id, razorpay_order_id FROM donations
          WHERE user_id = $1::uuid AND ${doneeColumn} = ${doneeCast} AND status = 'created'
            AND amount_inr = $3 AND created_at > (${SQL_UTC_NOW} - interval '15 minutes')
          ORDER BY created_at DESC LIMIT 1`,
        userId,
        kind === 'temple' ? templeId : doneeGaushalaId,
        amount,
      );
      const reuse = Array.isArray(open) ? open[0] : undefined;
      if (reuse?.id && reuse.razorpay_order_id) {
        await prisma.$executeRawUnsafe(
          `UPDATE donations SET donor_pan = COALESCE($2, donor_pan), dedication = COALESCE($3, dedication) WHERE id = $1 AND status = 'created'`,
          reuse.id,
          parsed.data.donorPan ?? null,
          parsed.data.dedication ?? null,
        );
        await saveDonorContact(reuse.id, {
          name: parsed.data.donorName, email: parsed.data.donorEmail, phone: parsed.data.donorPhone,
        });
        return reply.send({
          donationId: reuse.id,
          razorpayOrderId: reuse.razorpay_order_id,
          amount: Math.round(amount * 100),
          currency: 'INR',
          keyId: razorpayKeyId || 'rzp_test_demo',
          isDemoPayment,
          reused: true,
        });
      }
    } catch (err) {
      // A failed lookup must never block a donation: fall through to a fresh order.
      server.log.warn({ err }, 'donation open-order lookup failed');
    }

    const donationId = `don_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    let razorpayOrderId: string;
    if (razorpay) {
      try {
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
      } catch (err) {
        // Razorpay rejects with a plain `{ statusCode: 401, ... }` object when
        // its credentials are refused. Left to the global handler that 401
        // became "Please sign in to continue" for a signed-in donor.
        const f = describeGatewayFailure(err);
        server.log.error({ gatewayStatus: f.status, gatewayCode: f.code, gatewayReason: f.reason }, 'razorpay.orders.create failed (donation)');
        return reply.code(503).send({
          error: 'We could not open the payment page right now. Nothing has been charged. Please try again in a few minutes.',
          code: 'PAYMENT_GATEWAY_UNAVAILABLE',
        });
      }
    } else {
      razorpayOrderId = `order_demo_${Date.now()}`;
    }

    // P0 #PBO-2 (2026-07-09): write the correct donee id. Temple donations
    // set temple_id (gaushala_id NULL); gaushala donations keep the legacy
    // stringified-user_id in gaushala_id. The Donation row's polymorphic
    // invariant (exactly one non-null) is upheld by the schema refine above.
    if (kind === 'temple') {
      await prisma.$executeRawUnsafe(
        `INSERT INTO donations (id, user_id, temple_id, amount_inr, razorpay_order_id, status, donor_pan, dedication, created_at)
         VALUES ($1, $2::uuid, $3::uuid, $4, $5, 'created', $6, $7, ${SQL_UTC_NOW})`,
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
        `INSERT INTO donations (id, user_id, gaushala_id, amount_inr, razorpay_order_id, status, donor_pan, dedication, created_at)
         VALUES ($1, $2::uuid, $3, $4, $5, 'created', $6, $7, ${SQL_UTC_NOW})`,
        donationId,
        userId,
        doneeGaushalaId,
        amount,
        razorpayOrderId,
        parsed.data.donorPan ?? null,
        parsed.data.dedication ?? null,
      );
    }

    await saveDonorContact(donationId, {
      name: parsed.data.donorName, email: parsed.data.donorEmail, phone: parsed.data.donorPhone,
    });

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
          // QA 2026-10-13: never demote a donation that is already paid (the donor
          // can re-post a bad signature after success) - that stripped the 80G
          // receipt's backing status while the receipt number stayed issued.
          `UPDATE donations SET status = 'failed' WHERE id = $1 AND status <> 'paid'`,
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

