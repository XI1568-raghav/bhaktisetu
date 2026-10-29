import { TOO_EARLY_TO_COMPLETE, tooEarlyToCompleteMessage } from '../lib/completion-window.js';
import { settleBounded } from '../lib/background.js';
import { FastifyInstance } from 'fastify';
import {
  ASTROLOGER_PLATFORM_RATE,
  notifyAstrologerNewConsult,
  notifyDevoteeConsultConfirmed,
  openConsultationThread,
} from '../services/astrologer.service.js';
import { z } from 'zod';
import crypto from 'node:crypto';
import { randomBytes } from 'node:crypto';
import Razorpay from 'razorpay';
import { withGatewayTimeout } from '../lib/razorpay-timeout.js';
import { checkGatewayPayment } from '../lib/razorpay-payment-check.js';
import { sendEmail, consultationCancelledEmail } from '../lib/email.js';
import { ensureConsultationRefundColumns, isRefundRetryable, refundConsultation } from '../services/consultation-refund.service.js';
import { prisma } from '../lib/prisma.js';
import { describeGatewayFailure } from '../lib/payment-gateway-error.js';
import {
  describeAvailability,
  isWithinAvailability,
  parseWeeklyAvailability,
} from '../lib/astrologer-availability.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';
import {
  reverseBookingLedger,
  // OPS-05: the shared COMMISSION_REVERSED emitter, beside the unwind it
  // describes. This rail unwinds the astrologer's earning and, before this,
  // wrote nothing durable about having done so.
  recordLedgerReversal,
  type LedgerReversalResult,
} from '../services/ledger-reversal.service.js';
// OPS-05: the durable money trail. `recordMoneyEvent` never throws and never
// joins the caller's transaction — record AFTER the `$transaction` resolves.
import { MONEY_EVENTS, recordMoneyEvent } from '../lib/audit-money.js';

assertNotProductionDemo('routes/consultation');

/**
 * Live consultation rooms backed by Jitsi Meet (meet.jit.si) + paid
 * astrology booking flow w/ Razorpay.
 *
 * Two surfaces:
 *   1. POST /start           — ephemeral Jitsi room (no payment, no DB row)
 *   2. POST /book + verify   — paid astrologer consultation
 *      Persists to raw-SQL `astrologer_consultations` (no Prisma model
 *      yet — same pattern as donations.ts / csr-match.ts).
 */

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isDemoPayment = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo';

const razorpay = isDemoPayment
  ? null
  : withGatewayTimeout(new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret }));

/**
 * Every handler awaits this, and it is five DDL statements (CREATE TABLE, three
 * CREATE INDEX, ALTER TABLE ... ADD COLUMN IF NOT EXISTS). Measured on prod
 * 2026-10-29: GET /consultation/mine took ~2.0 s for an empty result, almost all
 * of it these statements (each remote round trip is ~0.4 s) - and the ALTER
 * takes a table lock on every call even when the columns exist. The schema does
 * not change while the process runs, so do it once per process. A failure clears
 * the memo so the next request retries instead of caching the failure.
 */
let consultationTablesReady: Promise<void> | null = null;
export function ensureConsultationTables(): Promise<void> {
  if (!consultationTablesReady) {
    consultationTablesReady = createConsultationTables().catch((err) => {
      consultationTablesReady = null;
      throw err;
    });
  }
  return consultationTablesReady;
}
/** Test seam: forget that the DDL ran. */
export function __resetConsultationTablesMemo(): void {
  consultationTablesReady = null;
}

async function createConsultationTables() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS astrologer_consultations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reference TEXT UNIQUE NOT NULL,
      user_id UUID NOT NULL,
      astrologer_id TEXT NOT NULL,
      astrologer_name TEXT NOT NULL,
      minutes INT NOT NULL,
      per_minute_rate_inr NUMERIC(8,2) NOT NULL,
      amount_inr NUMERIC(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      scheduled_at TIMESTAMPTZ,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      room_name TEXT,
      status TEXT NOT NULL DEFAULT 'pending_payment',
      created_at TIMESTAMPTZ DEFAULT now(),
      paid_at TIMESTAMPTZ
    );
  `);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS astrologer_consultations_user_idx ON astrologer_consultations (user_id);`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS astrologer_consultations_astrologer_idx ON astrologer_consultations (astrologer_id);`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS astrologer_consultations_status_idx ON astrologer_consultations (status);`,
  );
  await ensureConsultationRefundColumns();
}

type ConsultationRow = {
  id: string;
  reference: string;
  user_id: string;
  astrologer_id: string;
  astrologer_name: string;
  minutes: number;
  per_minute_rate_inr: string;
  amount_inr: string;
  currency: string;
  scheduled_at: Date | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  room_name: string | null;
  status: string;
  created_at: Date;
  paid_at: Date | null;
  refund_status?: string | null;
  refund_id?: string | null;
  refund_started_at?: Date | string | null;
};

function nextConsultRef(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `AC-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

// A real uuid shape. `/^[0-9a-f-]{36}$/` also matched 36 hyphens, which then failed the
// `$1::uuid` cast inside Postgres and answered 500 instead of 400.
const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_BOOKING_HORIZON_MS = 60 * 24 * 60 * 60 * 1000;

const bookSchema = z.object({
  astrologerId: z.string().min(1).max(64),
  minutes: z.number().int().min(5).max(60),
  scheduledAt: z.string().datetime().optional(),
}).refine(
  (v) => !v.scheduledAt || new Date(v.scheduledAt).getTime() > Date.now(),
  { message: 'scheduledAt must be in the future', path: ['scheduledAt'] },
).refine(
  // A slot years out is never a real booking (2099 was accepted on prod) and the
  // 24 h refund window would be meaningless for it.
  (v) => !v.scheduledAt || new Date(v.scheduledAt).getTime() <= Date.now() + MAX_BOOKING_HORIZON_MS,
  { message: 'scheduledAt must be within the next 60 days', path: ['scheduledAt'] },
);

const verifySchema = z.object({
  consultationId: z.string().uuid(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

// Admin LIST query — status filter optional, paginated. Bounds tight enough
// to prevent admin-page slowdown if rows grow into the thousands.
// PAY-01: `payment_review` is the admin queue jobs/consultation-expire.ts now
// parks a stale row in instead of destroying one that may hold a capture. It
// has to be filterable or the queue is invisible to the operator who works it.
const adminListSchema = z.object({
  status: z.enum(['pending_payment', 'payment_review', 'confirmed', 'completed', 'cancelled']).optional(),
  astrologerId: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Astrologer LIST query — same shape minus astrologerId (implicit: caller).
// Astrologer side filters by their own currentUser.id; only status + paging.
const astrologerListSchema = z.object({
  status: z.enum(['pending_payment', 'payment_review', 'confirmed', 'completed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const __testing = { bookSchema, verifySchema, adminListSchema, astrologerListSchema, nextConsultRef };

/**
 * Minimal logger shape shared by the route (fastify's `server.log`) and the
 * PAY-01 webhook backstop (console). Keeps ONE ledger writer callable by both.
 */
interface ConsultationLogger {
  error(obj: Record<string, unknown>, msg?: string): void;
  warn(obj: Record<string, unknown>, msg?: string): void;
}

const consoleConsultationLogger: ConsultationLogger = {
  error: (obj, msg) => console.error(msg ?? '[consultation]', JSON.stringify(obj)),
  warn: (obj, msg) => console.warn(msg ?? '[consultation]', JSON.stringify(obj)),
};

/** Fresh Jitsi room name for a paid consultation. */
export function mintConsultationRoom(astrologerName: string): string {
  const slug = (astrologerName || 'astrologer')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 24);
  return `darshya-astrologer-${slug}-${randomBytes(12).toString('hex')}`;
}

/**
 * P0 #AP-06 (2026-07-09): write a Commission ledger row so the astrologer's
 * earnings are reconcilable. The booking stores astrologer_id as a TEXT
 * (mock id / slug today, real AstrologerProfile.id once profiles are live),
 * so resolve it to a real AstrologerProfile -> userId for providerId. If no
 * real profile exists (mock astrologer), skip — there is no real provider
 * to credit, and we must not violate Commission.providerId's UUID constraint.
 * Idempotent (findFirst on bookingId).
 *
 * PAY-01 (2026-08-20): extracted out of the /verify-payment handler so the
 * Razorpay webhook backstop credits the astrologer through the IDENTICAL
 * rule. A second copy of a take-rate calculation is exactly the drift that
 * produced the 75% underpayment fixed here on 2026-08-11 — do not re-inline.
 */
export async function writeConsultationCommission(
  row: ConsultationRow,
  log: ConsultationLogger = consoleConsultationLogger,
): Promise<void> {
  try {
    const existing = await prisma.commission.findFirst({
      where: { bookingId: row.id },
      select: { id: true },
    });
    if (existing) return;
    const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.astrologer_id);
    const profile = looksLikeUuid
      ? await prisma.astrologerProfile.findUnique({ where: { id: row.astrologer_id }, select: { id: true, userId: true } })
      : await prisma.astrologerProfile.findFirst({ where: { displayName: row.astrologer_name }, select: { id: true, userId: true } });
    if (!profile?.userId) {
      // AW-02 (2026-08-12, P0): this used to be a bare `return` — money was
      // captured and the ledger gap was invisible. /book now refuses
      // non-onboarded astrologer ids, so reaching here means one of:
      //   (a) a legacy row booked against a fixture BEFORE that guard shipped
      //       and only now being verified, or
      //   (b) the AstrologerProfile was deleted between /book and /verify.
      // Either way a devotee has paid and nobody can be credited — that is an
      // operational incident, not a no-op. Log it at ERROR (greppable by
      // `commission_gap`) and surface it on GET /consultation/admin/all via
      // `commissionMissing` so an operator can refund. Never fabricate a
      // provider to make the ledger look balanced.
      log.error(
        {
          event: 'commission_gap',
          consultationId: row.id,
          reference: row.reference,
          astrologerId: row.astrologer_id,
          astrologerName: row.astrologer_name,
          amountInr: Number(row.amount_inr),
          devoteeUserId: row.user_id,
        },
        '[consultation] PAID consultation has no creditable astrologer — no Commission row written, manual refund required',
      );
      return;
    }
    const total = Number(row.amount_inr);
    // Astrologer revamp (2026-08-05): align with the priest take-rate cut —
    // platform 20% / astrologer 80% (was 30/70). Research: AstroTalk takes
    // 50%, so even 30% was supply-competitive; 20% + demand is the win.
    // ASTROLOGER_PLATFORM_RATE is the single source of truth.
    // Commission.amount is the PROVIDER's earning — it is what
    // payout.service.getPayoutBalance pays out (see lib/commission-math.ts).
    // This wrote the PLATFORM's 20% into it while keying on a real User.id,
    // so every astrologer's withdrawable balance was 20% of gross instead of
    // 80% — a live 75% underpayment through the unified payout rail and the
    // weekly settlement cron. Found by adversarial review 2026-08-11.
    const platformCut = Math.round(total * ASTROLOGER_PLATFORM_RATE * 100) / 100;
    const astrologerEarning = Math.round((total - platformCut) * 100) / 100;
    // DI-06 (F367): ON CONFLICT DO NOTHING, not a bare INSERT. This writes the
    // SAME unique key as the puja-booking mint — `commissions.booking_id`,
    // which migration 20260824000000 makes UNIQUE — because the column is
    // polymorphic across puja_bookings and astrologer_consultations (see the
    // DI-07 note on Commission.bookingId in schema.prisma). Both confirmation
    // rails (POST /consultation/verify-payment and the Razorpay webhook
    // backstop) call this function for one consultation, so the race is real,
    // not theoretical. Rationale in full at
    // payment.service.writePujaCommissionOnConfirm.
    await prisma.commission.createMany({
      data: [
        {
          bookingId: row.id,
          providerId: profile.userId,
          amount: astrologerEarning,
          percentage: ASTROLOGER_PLATFORM_RATE,
          status: 'PENDING',
        },
      ],
      skipDuplicates: true,
    });

    // AW-14 (2026-08-12, P2): AstrologerProfile.totalConsultations was a
    // counter column NOTHING ever wrote, so it stayed 0 for life. The
    // astrologer's own dashboard now derives its lifetime figure from the
    // consultations table (routes/astrologer-portal.ts) — but the PUBLIC
    // directory badge reads this column (routes/astrology.ts:82,153) and
    // also ORDERs by it, so it has to become real. This sits inside the
    // `existing` idempotency guard above: one increment per consultation,
    // never on a replayed verify. Its own try — a counter is cosmetic and
    // must never be able to unwind or mask the ledger write that preceded
    // it. Worst case is an undercount, never a double count.
    try {
      await prisma.astrologerProfile.update({
        where: { id: profile.id },
        data: { totalConsultations: { increment: 1 } },
      });
    } catch (err) {
      log.warn(
        { err, astrologerProfileId: profile.id, consultationId: row.id },
        '[consultation] totalConsultations increment failed (ledger row already written)',
      );
    }
  } catch (err) {
    log.warn({ err }, '[consultation] commission write failed');
  }
}

/**
 * PAY-01 (2026-08-20, P0): resolve a consultation by its Razorpay order id.
 *
 * Consultations write NO `prisma.payment` row — /book raw-INSERTs into
 * `astrologer_consultations` carrying only `razorpay_order_id` — so the
 * Razorpay webhook, which resolves orders via `payment.findFirst` and
 * `findDonationByOrderId`, could never see one. Mirrors
 * `routes/donations.findDonationByOrderId`, which exists for the same reason.
 */
export async function findConsultationByOrderId(
  razorpayOrderId: string,
): Promise<ConsultationRow | null> {
  if (!razorpayOrderId) return null;
  try {
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations WHERE razorpay_order_id = $1 LIMIT 1;`,
      razorpayOrderId,
    );
    return (rows as ConsultationRow[])[0] ?? null;
  } catch {
    return null;
  }
}

export interface ConsultationBackstopResult {
  handled: boolean;
  consultationId?: string;
  reference?: string;
  roomName?: string;
  /** True when the row had already been taken out by the expiry cron. */
  recovered?: boolean;
  reason?: string;
}

/**
 * PAY-01 (2026-08-20, P0): confirm a consultation from a Razorpay
 * `payment.captured` webhook.
 *
 * Without this, a devotee who paid and closed the tab before /verify-payment
 * was never confirmed — and `jobs/consultation-expire.ts` then flipped the row
 * to `cancelled` 30 minutes later. Money captured, the record says the
 * consultation was never ordered, no refund, no notice.
 *
 * The claim is a conditional UPDATE rather than read-then-write:
 *   - it is the idempotency guard (a replayed webhook updates 0 rows), and
 *   - it is the single-winner gate against /verify-payment running
 *     concurrently, so the astrologer is never notified twice for one consult.
 *
 * It deliberately accepts `cancelled` and `payment_review` rows as well as
 * `pending_payment`: RECOVERING a consultation the expiry cron already took
 * out is the whole point of the finding. `paid_at` and `room_name` use
 * COALESCE so a recovery never rewrites the original values.
 */
export async function finalizeConsultationPaymentFromWebhook(
  row: ConsultationRow,
  razorpayPaymentId: string | null,
  log: ConsultationLogger = consoleConsultationLogger,
): Promise<ConsultationBackstopResult> {
  if (row.status === 'confirmed' || row.status === 'completed') {
    return { handled: false, reason: 'already-confirmed', consultationId: row.id };
  }
  const roomName = row.room_name ?? mintConsultationRoom(row.astrologer_name);
  const claimed = Number(
    await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations
          SET status = 'confirmed',
              razorpay_payment_id = COALESCE($1, razorpay_payment_id),
              room_name = COALESCE(room_name, $2),
              paid_at = COALESCE(paid_at, now())
        WHERE id = $3::uuid
          AND status IN ('pending_payment', 'payment_review', 'cancelled');`,
      razorpayPaymentId ?? null,
      roomName,
      row.id,
    ),
  );
  if (!Number.isFinite(claimed) || claimed < 1) {
    return { handled: false, reason: 'not-claimable', consultationId: row.id };
  }

  log.warn(
    {
      event: 'consultation_webhook_backstop',
      consultationId: row.id,
      reference: row.reference,
      priorStatus: row.status,
      razorpayPaymentId,
    },
    '[consultation] confirmed from the Razorpay webhook — the devotee never reached /verify-payment',
  );

  // OPS-05 — "which rail got there first", for the consultation rail.
  //
  // That question is the one `lib/audit-money.ts` names in its own header as
  // unanswerable-before-the-trail, and for consultations it stayed unanswerable
  // after it: this backstop and POST /verify-payment write the SAME columns on
  // `astrologer_consultations` (status, razorpay_payment_id, paid_at, room_name)
  // and the row keeps no history, so once either had run the finished row was
  // byte-identical whichever rail produced it. `recovered` is the sharpest case
  // — a consultation the expiry cron had already flipped to `cancelled`, which
  // this rail silently un-cancels; the trail is now the only place that fact
  // survives at all.
  //
  // Recorded AFTER the claiming UPDATE, which is also the idempotency gate: a
  // replayed webhook updates 0 rows and returns above, so this never fires
  // twice for one capture. `idempotencyKey` is the gateway payment id, which
  // `recordMoneyEvent` namespaces by event type — so it does NOT collide with
  // the PAYMENT_VERIFIED row /verify-payment writes against the same id.
  await recordMoneyEvent({
    eventType: MONEY_EVENTS.PAYMENT_CAPTURED,
    // Razorpay acted, not a human and not our cron. That distinction is the
    // whole reason MoneyActorType carries 'gateway' separately from 'system'.
    actorType: 'gateway',
    actorId: null,
    subjectType: 'consultation',
    subjectId: row.id,
    amount: row.amount_inr,
    currency: row.currency ?? 'INR',
    gateway: 'razorpay',
    gatewayOrderId: row.razorpay_order_id,
    gatewayPaymentId: razorpayPaymentId ?? row.razorpay_payment_id,
    statusBefore: row.status,
    statusAfter: 'confirmed',
    idempotencyKey: razorpayPaymentId ?? row.id,
    note: 'consultation confirmed from the Razorpay webhook backstop',
    metadata: {
      rail: 'consultation-webhook-backstop',
      reference: row.reference,
      astrologerId: row.astrologer_id,
      astrologerName: row.astrologer_name,
      minutes: row.minutes,
      // True when the expiry cron had already cancelled this row.
      recovered: row.status === 'cancelled' || row.status === 'payment_review',
    },
  }).catch(() => undefined);

  await writeConsultationCommission(row, log);

  await settleBounded([
    notifyAstrologerNewConsult({
      astrologerRef: row.astrologer_id,
      devoteeName: null,
      minutes: row.minutes ?? 0,
      amountInr: Number(row.amount_inr ?? 0),
      consultationId: row.id,
    }),
    notifyDevoteeConsultConfirmed({
      devoteeUserId: row.user_id,
      astrologerName: row.astrologer_name ?? 'Your astrologer',
      minutes: row.minutes ?? 0,
      consultationId: row.id,
    }),
    openConsultationThread({
      astrologerRef: row.astrologer_id,
      devoteeUserId: row.user_id,
      astrologerName: row.astrologer_name ?? 'Your astrologer',
      minutes: row.minutes ?? 0,
      reference: row.reference,
      consultationId: row.id,
    }),
  ], 'consult-notify');

  return {
    handled: true,
    consultationId: row.id,
    reference: row.reference,
    roomName,
    recovered: row.status === 'cancelled' || row.status === 'payment_review',
  };
}


export async function consultationRoutes(server: FastifyInstance) {
  // Ephemeral Jitsi room. P0 #AP-02 (2026-07-09): the old implementation
  // minted a free room for ANY authenticated user with no payment, no role
  // check, and no DB row — the /astrology "Call" button used it to spin a
  // free branded room. Now /start requires a paid consultationId: it looks
  // up a 'confirmed' consultation owned by the caller (or assigned to them
  // as astrologer) and returns that row's stored room_name. The web room
  // page resolves the same room via GET /by-room/:room, so a room is only
  // ever embedded for a paid, authorized consultation.
  server.post('/start', { preHandler: [authenticateUser] }, async (request, reply) => {
    const body = (request.body ?? {}) as {
      consultationId?: string;
      providerId?: string;
      providerName?: string;
      kind?: 'astrologer' | 'priest' | 'wellness';
    };
    const me = request.currentUser!;

    if (!body.consultationId) {
      return reply.code(400).send({
        error: 'consultationId is required to start a paid consultation room.',
      });
    }

    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; user_id: string; astrologer_id: string; status: string;
      astrologer_name: string; room_name: string | null;
    }>>(
      `SELECT id, user_id, astrologer_id, status, astrologer_name, room_name
         FROM astrologer_consultations
        WHERE id = $1::uuid
        LIMIT 1;`,
      body.consultationId,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(404).send({ error: 'Consultation not found.' });
    }
    if (row.status !== 'confirmed' && row.status !== 'completed') {
      return reply.code(403).send({ error: 'Consultation is not paid/active.' });
    }

    // Authorization: the devotee who booked, the assigned astrologer, or admin.
    const isOwner = row.user_id === me.id;
    const isAdmin = me.roles.includes('ADMIN');
    let isAssignedAstrologer = false;
    if (!isOwner && !isAdmin) {
      const astro = await prisma.astrologerProfile.findUnique({
        where: { id: row.astrologer_id },
        select: { userId: true },
      }).catch(() => null);
      isAssignedAstrologer = !!astro && astro.userId === me.id;
    }
    if (!isOwner && !isAdmin && !isAssignedAstrologer) {
      return reply.code(403).send({ error: 'Not authorized for this consultation.' });
    }

    // Return the stored room_name (minted at verify-payment time). If for some
    // reason it is missing, mint one now and persist it.
    let roomName = row.room_name;
    if (!roomName) {
      const slug = (row.astrologer_name || 'provider')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 24);
      roomName = `darshya-astrologer-${slug}-${randomBytes(12).toString('hex')}`;
      await prisma.$executeRawUnsafe(
        `UPDATE astrologer_consultations SET room_name = $1 WHERE id = $2::uuid;`,
        roomName,
        row.id,
      );
    }
    const userDisplayName = encodeURIComponent(me.fullName ?? 'Devotee');

    return reply.send({
      roomName,
      consultationId: row.id,
      jitsiUrl: `https://meet.jit.si/${roomName}#userInfo.displayName=%22${userDisplayName}%22`,
      embedUrl: `https://meet.jit.si/${roomName}`,
      provider: 'jitsi',
      kind: body.kind ?? 'astrologer',
      createdAt: new Date().toISOString(),
    });
  });

  // ─── POST /book ─────────────────────────────────────────────────────────
  // Paid astrology consultation. Creates Razorpay order + raw-SQL row
  // status 'pending_payment'. Client opens Razorpay checkout w/ returned
  // order id, then calls /verify-payment with the gateway signature.
  server.post('/book', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = bookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { astrologerId, minutes, scheduledAt } = parsed.data;
    const userId = request.currentUser!.id;

    // Resolve the astrologer for rate + identity (server-side, so the client
    // cannot inject a fake rate).
    //
    // AW-02 (2026-08-12, P0): this used to fall back to
    // `astrologyService.getAstrologerById(slug)` — the 15-row in-memory MOCK
    // fixture at services/astrology.service.ts:118-374 ('astro_001'..'astro_015').
    // A devotee clicking any card on /astrology therefore paid real money to a
    // person who does not exist: the row was inserted, the payment captured, a
    // Jitsi room minted, "Your astrologer has been notified" shown — and then
    // verify-payment silently skipped the Commission write because no real
    // provider existed to credit. Guaranteed no-show, guaranteed manual refund.
    //
    // The ONLY bookable astrologer is now an approved AstrologerProfile row
    // (the same set `GET /astrology/astrologers/live` serves). A fixture slug is
    // REFUSED before any money moves. Refusing a sale is strictly better than
    // capturing money nobody can fulfil.
    //
    // Note on astrologer-resolver.ts: it exists and could map slug → user UUID,
    // but `astrologer_slug_map` is EMPTY and `astrologer_profiles.slug` does not
    // exist, so every lookup returns null. Wiring it would only add a DB round
    // trip before the same refusal — worse, it would imply the fixtures are one
    // admin action away from being bookable, which they are not: they are
    // invented people. Supply must be onboarded, not mapped.
    let astrologer: { name: string; perMinuteRate: number; userId: string; availability: unknown } | null = null;
    const looksLikeProfileId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(astrologerId);
    if (!looksLikeProfileId) {
      request.log.warn(
        { astrologerId, userId },
        '[consultation] refused booking against a non-onboarded astrologer id',
      );
      return reply.code(409).send({
        code: 'ASTROLOGER_NOT_BOOKABLE',
        error:
          'This astrologer is not available for booking. Browse approved astrologers at /astrology/astrologers/live.',
      });
    }
    const p = await prisma.astrologerProfile.findUnique({ where: { id: astrologerId } });
    if (p && p.approved) {
      astrologer = {
        name: p.displayName,
        perMinuteRate: Number(p.pricePerMinute),
        userId: p.userId,
        availability: p.availability,
      };
    }
    if (!astrologer) {
      return reply.code(404).send({ error: 'Astrologer not found.' });
    }

    // An astrologer paying themselves would mint a "completed consultation" (and
    // an 80% commission, a rating counter bump) out of nothing.
    if (astrologer.userId === userId) {
      return reply.code(409).send({
        code: 'SELF_BOOKING',
        error: 'You cannot book a consultation with yourself.',
      });
    }

    // The portal promises "devotees can book only during your available slots".
    // Enforce it for a requested slot. No `scheduledAt` (start when the astrologer
    // joins) is not a slot and is not restricted; an astrologer with no schedule
    // on file is not restricted either.
    if (scheduledAt) {
      const schedule = parseWeeklyAvailability(astrologer.availability);
      if (schedule && !isWithinAvailability(schedule, new Date(scheduledAt), minutes)) {
        return reply.code(409).send({
          code: 'OUTSIDE_AVAILABILITY',
          error: `${astrologer.name} is not taking bookings for that time. Their hours: ${describeAvailability(schedule)}. Pick a time inside those hours, or leave the slot blank.`,
        });
      }
    }

    const perMinuteRate = Number(astrologer.perMinuteRate);
    if (!Number.isFinite(perMinuteRate) || perMinuteRate <= 0) {
      return reply.code(400).send({ error: 'Astrologer rate not configured.' });
    }
    const amountInr = Math.round(perMinuteRate * minutes);
    if (amountInr < 50) {
      return reply.code(400).send({ error: 'Minimum consultation amount is ₹50.' });
    }
    const amountInPaise = amountInr * 100;

    await ensureConsultationTables();

    // Idempotency. Closing the Razorpay window and pressing Pay again (or a
    // double click that beat the disabled button) opened a NEW gateway order and a
    // NEW pending row every time, leaving the old ones for the expiry job. The same
    // devotee asking for the same astrologer, length, slot and price within 15
    // minutes gets the order they already have.
    const openOrders = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations
        WHERE user_id = $1::uuid AND astrologer_id = $2 AND minutes = $3
          AND status = 'pending_payment' AND razorpay_order_id IS NOT NULL
          AND amount_inr = $4 AND scheduled_at IS NOT DISTINCT FROM $5::timestamptz
          AND created_at > now() - interval '15 minutes'
        ORDER BY created_at DESC LIMIT 1;`,
      userId,
      astrologerId,
      minutes,
      amountInr,
      scheduledAt ?? null,
    );
    const reusable = Array.isArray(openOrders) ? openOrders[0] : undefined;
    if (reusable?.id && reusable.razorpay_order_id) {
      return reply.code(200).send({
        consultationId: reusable.id,
        reference: reusable.reference,
        astrologerName: reusable.astrologer_name,
        minutes: reusable.minutes,
        amountInr,
        amountInPaise,
        currency: 'INR',
        razorpayOrderId: reusable.razorpay_order_id,
        razorpayKeyId: isDemoPayment ? null : razorpayKeyId,
        demo: isDemoPayment,
        reused: true,
      });
    }

    const reference = nextConsultRef();

    let razorpayOrderId: string | null = null;
    if (!isDemoPayment && razorpay) {
      try {
        const order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: reference,
          notes: {
            consultationRef: reference,
            astrologerId,
            astrologerName: astrologer.name,
            userId,
            minutes: String(minutes),
          },
        });
        razorpayOrderId = order.id;
      } catch (err: any) {
        // Same structured fields the other rails log, so an operator can tell a
        // rejected key from a network fault. Never the keys.
        const f = describeGatewayFailure(err);
        server.log.error(
          { gatewayStatus: f.status, gatewayCode: f.code, gatewayReason: f.reason },
          'razorpay.orders.create failed (consultation)',
        );
        return reply.code(502).send({
          error: 'We could not open the payment page right now. Nothing has been charged. Please try again in a few minutes.',
          code: 'PAYMENT_GATEWAY_UNAVAILABLE',
        });
      }
    } else {
      // Demo mode — synthetic order id, so the demo-pay fallback button works.
      razorpayOrderId = `order_demo_${randomBytes(8).toString('hex')}`;
    }

    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `INSERT INTO astrologer_consultations
        (reference, user_id, astrologer_id, astrologer_name, minutes,
         per_minute_rate_inr, amount_inr, currency, scheduled_at,
         razorpay_order_id, status)
       VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, 'INR', $8::timestamptz, $9, 'pending_payment')
       RETURNING *;`,
      reference,
      userId,
      astrologerId,
      astrologer.name,
      minutes,
      perMinuteRate,
      amountInr,
      scheduledAt ?? null,
      razorpayOrderId,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(500).send({ error: 'Failed to persist consultation.' });
    }

    // OPS-05 — the opening of the consultation money story.
    //
    // Every other rail that opens a gateway order records this: the puja rail
    // in payment.service.createRazorpayOrder, the donation rail in
    // routes/donations. Consultations did not, so a devotee whose money was
    // captured against an order our own logs never recorded had no first entry
    // to reconstruct from — and this rail is the one that writes NO
    // `prisma.payment` row at all (see findConsultationByOrderId), so the
    // Payment table cannot stand in for the missing row the way it can
    // elsewhere. Without this the trail for a disputed consultation began at
    // confirmation, with the order id appearing from nowhere.
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_INITIATED,
      actorType: 'devotee',
      actorId: userId,
      subjectType: 'consultation',
      subjectId: row.id,
      amount: amountInr,
      currency: 'INR',
      gateway: isDemoPayment ? 'demo' : 'razorpay',
      gatewayOrderId: razorpayOrderId,
      statusAfter: 'pending_payment',
      idempotencyKey: razorpayOrderId,
      requestId: request.id ? String(request.id) : null,
      ip: request.ip ?? null,
      note: `consultation order opened for ${minutes} min with ${astrologer.name}`,
      metadata: {
        rail: 'consultation-book',
        reference: row.reference,
        astrologerId,
        astrologerName: astrologer.name,
        minutes,
        perMinuteRateInr: perMinuteRate,
        scheduledAt: scheduledAt ?? null,
        demo: isDemoPayment,
      },
    }).catch(() => undefined);

    return reply.code(201).send({
      consultationId: row.id,
      reference: row.reference,
      astrologerName: row.astrologer_name,
      minutes: row.minutes,
      amountInr,
      amountInPaise,
      currency: 'INR',
      razorpayOrderId,
      razorpayKeyId: isDemoPayment ? null : razorpayKeyId,
      demo: isDemoPayment,
    });
  });

  // ─── POST /verify-payment ───────────────────────────────────────────────
  // Razorpay HMAC verify. On success, flip status → 'confirmed', mint
  // Jitsi room name. Demo mode skips signature check (mirrors donations.ts).
  server.post('/verify-payment', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = verifySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const { consultationId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;
    const userId = request.currentUser!.id;

    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations WHERE id = $1::uuid LIMIT 1;`,
      consultationId,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(404).send({ error: 'Consultation not found.' });
    }
    if (row.user_id !== userId) {
      return reply.code(403).send({ error: 'Not authorized for this consultation.' });
    }
    // A completed consultation replayed through verify was rewritten back to
    // 'confirmed' (and its paid_at/room re-minted). Treat it as the same
    // idempotent success as a confirmed one.
    if (row.status === 'confirmed' || row.status === 'completed') {
      // Idempotent — return existing room.
      return reply.send({
        verified: true,
        consultationId: row.id,
        reference: row.reference,
        roomName: row.room_name,
        jitsiUrl: row.room_name ? `https://meet.jit.si/${row.room_name}` : null,
      });
    }

    if (!isDemoPayment) {
      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return reply.code(400).send({ error: 'Missing Razorpay verification fields.' });
      }
      if (razorpay_order_id !== row.razorpay_order_id) {
        return reply.code(400).send({ error: 'Order id mismatch.' });
      }
      const expected = crypto
        .createHmac('sha256', razorpayKeySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const a = Buffer.from(expected, 'utf8');
      const b = Buffer.from(razorpay_signature, 'utf8');
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return reply.code(400).send({ error: 'Invalid payment signature.' });
      }
      // Slice L: signature proves the pair is genuine, not the amount. Ask the gateway.
      const chk = await checkGatewayPayment(razorpay as never, {
        paymentId: razorpay_payment_id,
        orderId: row.razorpay_order_id,
        amountInr: Number(row.amount_inr),
        currency: row.currency,
      });
      if (chk.verdict === 'mismatch') {
        console.error('[consultation][amount-mismatch] verify refused', JSON.stringify({ consultationId: row.id, reason: chk.reason }));
        await prisma.$executeRawUnsafe(
          `UPDATE astrologer_consultations SET status = 'payment_review', razorpay_payment_id = $1
            WHERE id = $2::uuid AND status = 'pending_payment';`,
          razorpay_payment_id,
          consultationId,
        );
        await recordMoneyEvent({
          eventType: MONEY_EVENTS.PAYMENT_FAILED,
          actorType: 'devotee',
          actorId: userId,
          subjectType: 'consultation',
          subjectId: consultationId,
          amount: row.amount_inr,
          currency: row.currency ?? 'INR',
          gateway: 'razorpay',
          gatewayOrderId: row.razorpay_order_id,
          gatewayPaymentId: razorpay_payment_id,
          statusBefore: row.status,
          statusAfter: 'payment_review',
          idempotencyKey: `${consultationId}:${razorpay_payment_id}:gateway-check`,
          note: `consultation verify refused: ${chk.reason}`,
          metadata: { rail: 'consultation-verify-payment', needsAdminReview: true, reason: 'gateway-amount-mismatch' },
        }).catch(() => undefined);
        return reply.code(409).send({
          error: 'We could not confirm this payment with the payment gateway. Our team has been notified and will review it.',
          code: 'payment_needs_review',
        });
      }
      if (chk.verdict === 'unavailable') {
        server.log.warn({ reason: chk.reason }, '[consultation] gateway payment check unavailable, using signature result');
      }
    }

    // Mint a fresh Jitsi room and flip status.
    const roomName = mintConsultationRoom(row.astrologer_name);

    await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations
       SET status = 'confirmed',
           razorpay_payment_id = $1,
           room_name = $2,
           paid_at = now()
       WHERE id = $3::uuid;`,
      razorpay_payment_id ?? null,
      roomName,
      consultationId,
    );

    // OPS-05 — the devotee-driven confirmation rail.
    //
    // The signature has verified and the row is now `confirmed` and `paid_at`.
    // Until this call the only surviving evidence that a HUMAN completed this
    // payment (rather than the webhook backstop below completing it for them)
    // was the row's own final state, which both rails write identically. The
    // pair PAYMENT_VERIFIED-here / PAYMENT_CAPTURED-there is what makes the two
    // distinguishable after the fact.
    //
    // Recorded before the fire-and-forget notifications so a notification
    // failure cannot skip it, and awaited: this is a request handler, and the
    // extra millisecond buys the guarantee the row is down before the devotee
    // is told they are confirmed.
    await recordMoneyEvent({
      eventType: MONEY_EVENTS.PAYMENT_VERIFIED,
      actorType: 'devotee',
      actorId: userId,
      subjectType: 'consultation',
      subjectId: consultationId,
      amount: row.amount_inr,
      currency: row.currency ?? 'INR',
      gateway: isDemoPayment ? 'demo' : 'razorpay',
      gatewayOrderId: row.razorpay_order_id,
      gatewayPaymentId: razorpay_payment_id ?? null,
      statusBefore: row.status,
      statusAfter: 'confirmed',
      // The gateway payment id is the natural key; recordMoneyEvent namespaces
      // it by event type, so the webhook's PAYMENT_CAPTURED on the same id is a
      // second row rather than a silently-swallowed duplicate.
      idempotencyKey: razorpay_payment_id ?? consultationId,
      requestId: request.id ? String(request.id) : null,
      ip: request.ip ?? null,
      note: 'consultation confirmed from POST /verify-payment',
      metadata: {
        rail: 'consultation-verify-payment',
        reference: row.reference,
        astrologerId: row.astrologer_id,
        astrologerName: row.astrologer_name,
        minutes: row.minutes,
        demo: isDemoPayment,
      },
    }).catch(() => undefined);

    // Astrologer revamp (2026-08-05): ping the astrologer that a paid consult
    // just landed (there was NO astrologer notification before — they only saw
    // it by refreshing the portal). Fire-and-forget.
    await settleBounded([
      notifyAstrologerNewConsult({
        astrologerRef: row.astrologer_id,
        devoteeName: null,
        minutes: row.minutes ?? 0,
        amountInr: Number(row.amount_inr ?? 0),
        consultationId,
      }),
      notifyDevoteeConsultConfirmed({
        devoteeUserId: userId,
        astrologerName: row.astrologer_name ?? 'Your astrologer',
        minutes: row.minutes ?? 0,
        consultationId,
      }),
      openConsultationThread({
        astrologerRef: row.astrologer_id,
        devoteeUserId: userId,
        astrologerName: row.astrologer_name ?? 'Your astrologer',
        minutes: row.minutes ?? 0,
        reference: row.reference,
        consultationId,
      }),
    ], 'consult-notify');

    // P0 #AP-06 (2026-07-09): the Commission ledger write lives in
    // writeConsultationCommission (below) so the PAY-01 webhook backstop runs
    // the identical ledger rule. Fire-and-forget here: a ledger write failure
    // must never block the verified response.
    await settleBounded(Promise.resolve(writeConsultationCommission(row, server.log)), 'consult-commission');

    return reply.send({
      verified: true,
      consultationId: row.id,
      reference: row.reference,
      roomName,
      jitsiUrl: `https://meet.jit.si/${roomName}`,
    });
  });

  // ─── GET /mine ──────────────────────────────────────────────────────────
  // List the calling user's paid consultations (history + upcoming). Newest
  // first. Devotee profile page surfaces this. Static path MUST be declared
  // before `/:id` so the UUID regex doesn't 400 the literal string.
  server.get('/mine', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations
       WHERE user_id = $1::uuid
       ORDER BY COALESCE(scheduled_at, created_at) DESC
       LIMIT 100;`,
      userId,
    );
    return reply.send({
      consultations: rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        astrologerId: row.astrologer_id,
        astrologerName: row.astrologer_name,
        minutes: row.minutes,
        amountInr: Number(row.amount_inr),
        currency: row.currency,
        status: row.status,
        roomName: row.room_name,
        jitsiUrl: row.room_name ? `https://meet.jit.si/${row.room_name}` : null,
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
        paidAt: row.paid_at,
      })),
    });
  });

  // ─── POST /:id/cancel ───────────────────────────────────────────────────
  // Devotee-initiated cancellation. Per business rule #5: refund eligible
  // up to 24h before scheduled time. Pending-payment rows cancel free. Past
  // the window or already-completed rows refuse. Refund itself is ops-
  // executed via Razorpay dashboard — this endpoint only flips the row.
  server.post('/:id/cancel', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_SHAPE.test(id)) {
      return reply.code(400).send({ error: 'Invalid consultation id.' });
    }
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations WHERE id = $1::uuid LIMIT 1;`,
      id,
    );
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: 'Consultation not found.' });
    if (row.user_id !== request.currentUser!.id) {
      return reply.code(403).send({ error: 'Not authorized.' });
    }
    if (row.status === 'cancelled') {
      // A refund the gateway refused earlier is retried by repeating the cancel.
      const retried =
        isRefundRetryable(row)
          ? await refundConsultation(row, { type: 'devotee', id: request.currentUser!.id }, `consultation refund retry (${row.reference})`)
          : null;
      return reply.send({
        cancelled: true,
        refundEligible: false,
        alreadyCancelled: true,
        ...(retried ? { refundExecution: retried.execution } : {}),
      });
    }
    if (row.status === 'completed') {
      return reply.code(409).send({ error: 'Consultation already completed.' });
    }

    // Refund eligibility: pending_payment always refundable (no charge taken
    // yet for demo; for live, gateway holds funds 24h). Confirmed rows must
    // have scheduled_at and be > 24h away.
    let refundEligible = false;
    if (row.status === 'pending_payment') {
      refundEligible = true;
    } else if (row.status === 'confirmed') {
      if (row.scheduled_at) {
        const scheduledMs = new Date(row.scheduled_at).getTime();
        const cutoffMs = Date.now() + 24 * 60 * 60 * 1000;
        refundEligible = scheduledMs >= cutoffMs;
      } else {
        // No schedule yet — treat as window-open until astrologer starts.
        refundEligible = !row.paid_at || Date.now() - new Date(row.paid_at).getTime() < 24 * 60 * 60 * 1000;
      }
    }

    // AW-06 (2026-08-12, P1): the flip used to be the ONLY thing this handler
    // did. The Commission written at verify-payment (amount = the astrologer's
    // 80%) stayed PENDING and fully withdrawable, so a refund-eligible
    // cancellation refunded the devotee the whole gross AND still paid the
    // astrologer their share through /payouts and the weekly settlement cron —
    // a 100% loss plus an 80% payout, repeatable by anyone willing to book and
    // cancel against their own second account.
    //
    // The unwind runs in the SAME transaction as the status flip, through the
    // shared leaf module both puja refund rails already use — never a second
    // inlined copy of the reversal rules (which is exactly how the two puja
    // rails drifted apart in the first place). Only refund-eligible
    // cancellations reverse: outside the window no refund is owed, so the
    // astrologer keeps the earning.
    let reversal: LedgerReversalResult = {
      reversedCommissions: 0,
      reversedTemplePayouts: 0,
      alreadySettled: 0,
    };
    const cancelReason = `consultation cancelled by devotee (${row.reference})`;
    // The flip is conditional on the status this handler decided on. It used to
    // be `WHERE id = $1`, so a cancel racing the astrologer's "End" (or a second
    // cancel) overwrote 'completed' with 'cancelled' - after the earning had been
    // released - and ran the ledger reversal against a finished consultation.
    let flipped = 1;
    await prisma.$transaction(async (tx) => {
      flipped = Number(
        await tx.$executeRawUnsafe(
          `UPDATE astrologer_consultations
           SET status = 'cancelled'
           WHERE id = $1::uuid AND status = $2;`,
          id,
          row.status,
        ),
      );
      if (flipped === 0) return;
      if (refundEligible) {
        reversal = await reverseBookingLedger(tx, row.id, cancelReason);
      }
    });
    if (flipped === 0) {
      return reply.code(409).send({
        code: 'CONSULTATION_STATE_CHANGED',
        error: 'This consultation was just updated. Refresh the page and check its status.',
      });
    }

    // OPS-05 — the third refund rail, which until now emitted NOTHING.
    //
    // This handler cancels a paid astrology consultation, promises the devotee
    // a refund in the response body, and unwinds the astrologer's 80%. All
    // three are money facts and none of them was durable anywhere but the
    // Render log stream, which is days-retentive on the free plan and gone
    // entirely once the service is suspended. `astrologer_consultations` is a
    // raw-SQL table with no Prisma model and no status history, so the row
    // itself only ever shows `status = 'cancelled'` — not who cancelled it,
    // not when, not whether a refund was owed, and not whether the earning was
    // clawed back.
    //
    // Recorded AFTER the transaction commits, per the module contract. Both
    // calls are awaited so a cancellation cannot answer before the evidence is
    // down; neither can throw.
    //
    // REFUND_INITIATED, not REFUND_COMPLETED: no gateway refund is raised on
    // this path. The obligation is what starts here, and a later manual refund
    // in the Razorpay dashboard has no other origin record to be matched to.
    await recordMoneyEvent({
      eventType: refundEligible ? MONEY_EVENTS.REFUND_INITIATED : MONEY_EVENTS.REFUND_FAILED,
      // The devotee cancelled their own consultation — the ownership check
      // above already refused anyone else.
      actorType: 'devotee',
      actorId: request.currentUser!.id,
      subjectType: 'consultation',
      subjectId: row.id,
      amount: row.amount_inr,
      currency: row.currency,
      gateway: 'razorpay',
      gatewayOrderId: row.razorpay_order_id,
      gatewayPaymentId: row.razorpay_payment_id,
      statusBefore: row.status,
      statusAfter: 'cancelled',
      // The consultation id is the natural key: one cancellation per row, and
      // the early return above makes a second cancel a no-op anyway.
      idempotencyKey: row.id,
      note: refundEligible
        ? cancelReason
        : `${cancelReason} — outside the 24h window, no refund owed`,
      metadata: {
        rail: 'consultation-cancel',
        reference: row.reference,
        refundEligible,
        astrologerId: row.astrologer_id,
        scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
        // Why it was or was not refundable, so the decision can be re-checked
        // without re-deriving the window from a row that has since changed.
        priorStatus: row.status,
      },
    }).catch(() => undefined);

    // ...and the claw-back, through the same shared emitter the two puja refund
    // rails use. Skips silently when nothing moved; still records when the
    // unwind was BLOCKED by an already-settled row, which is the double-pay
    // case flagged as `consultation_ledger_manual_review` just below.
    if (refundEligible) {
      await recordLedgerReversal({
        bookingId: row.id,
        rail: 'consultation-cancel',
        reason: cancelReason,
        actorType: 'devotee',
        actorId: request.currentUser!.id,
        currency: row.currency,
        idempotencyKey: row.id,
        full: reversal,
      });
    }

    // Slice L: actually send the money back (full amount, by the policy above). Never throws.
    let refundExecution: 'gateway' | 'retry' | 'manual' | 'none' = 'none';
    if (refundEligible && row.status === 'confirmed') {
      try {
        const ex = await refundConsultation(row, { type: 'devotee', id: request.currentUser!.id }, cancelReason);
        refundExecution = ex.execution;
      } catch (err) {
        refundExecution = 'retry';
        server.log.error({ err }, '[consultation] gateway refund threw');
      }
    }

    if (reversal.alreadySettled > 0) {
      // Money has left or is mid-transfer — a refund handler must not claw it
      // back silently. Greppable by `consultation_ledger_manual_review`.
      server.log.error(
        {
          event: 'consultation_ledger_manual_review',
          consultationId: row.id,
          reference: row.reference,
          alreadySettled: reversal.alreadySettled,
          amountInr: Number(row.amount_inr ?? 0),
        },
        '[consultation] refund-eligible cancellation on a consultation whose commission is already settled — reconcile by hand',
      );
    }

    // Slice L: cancellation email to the devotee (best effort).
    await settleBounded((async () => {
      const u = await prisma.user.findUnique({
        where: { id: row.user_id },
        select: { email: true, fullName: true },
      });
      if (!u?.email) return;
      await sendEmail({
        to: u.email,
        ...consultationCancelledEmail({
          devoteeName: u.fullName ?? 'Devotee',
          reference: row.reference,
          astrologerName: row.astrologer_name,
          refundEligible: refundEligible && row.status === 'confirmed',
        }),
      });
    })(), 'consult-cancel-email');

    return reply.send({
      cancelled: true,
      refundEligible,
      consultationId: row.id,
      reference: row.reference,
      commissionReversed: reversal.reversedCommissions,
      ledgerManualReview: reversal.alreadySettled,
      refundExecution,
      note: refundEligible
        ? refundExecution === 'retry'
          ? 'Cancellation accepted. The refund could not be sent yet; repeat this request to retry.'
          : 'Cancellation accepted. Refund will be processed within 5-7 business days.'
        : 'Cancellation accepted. Refund not eligible — past the 24-hour cancellation window.',
    });
  });

  // ─── PATCH /:id/complete ────────────────────────────────────────────────
  // Marks a confirmed session done after the Jitsi call ends.
  //
  // Auth: ADMIN role always allowed. Astrologer-self gate is parked —
  // astrologer_id stores the in-memory astrology.service slug (e.g.
  // 'astro_002'), not a User.id UUID, so equality with currentUser.id can
  // never succeed for a real astrologer. Real astrologer onboarding (mapping
  // slug → User row) is a deferred design pass; until then only ADMIN can
  // close the lifecycle. Already-completed is idempotent; non-confirmed
  // refuses with 409.
  server.patch('/:id/complete', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_SHAPE.test(id)) {
      return reply.code(400).send({ error: 'Invalid consultation id.' });
    }
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations WHERE id = $1::uuid LIMIT 1;`,
      id,
    );
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: 'Consultation not found.' });
    const roles = request.currentUser!.roles ?? [];
    const isAdmin = roles.includes('ADMIN');
    // AP-08 (2026-07-09): resolve the caller's astrologer identity the same way
    // the portal dashboard does (AP-04/05). astrologer_consultations.
    // astrologer_id is TEXT and may be the mock slug, the AstrologerProfile.id
    // (UUID), or (legacy) the User UUID — so a bare `=== currentUser.id`
    // comparison only matched the legacy-UUID form and was never true for real
    // astrologers, leaving completion ADMIN-only. Match against the caller's
    // AstrologerProfile.id + userId instead.
    const callerId = request.currentUser!.id;
    let isAssignedAstrologer = row.astrologer_id === callerId;
    if (!isAssignedAstrologer) {
      const profile = await prisma.astrologerProfile
        .findUnique({ where: { userId: callerId }, select: { id: true } })
        .catch(() => null);
      if (profile && row.astrologer_id === profile.id) {
        isAssignedAstrologer = true;
      }
    }
    if (!isAdmin && !isAssignedAstrologer) {
      return reply.code(403).send({ error: 'Only the assigned astrologer or admin can mark complete.' });
    }
    if (row.status === 'completed') {
      return reply.send({ completed: true, alreadyCompleted: true, consultationId: row.id });
    }
    if (row.status !== 'confirmed') {
      return reply.code(409).send({ error: `Cannot complete a ${row.status} consultation.` });
    }
    // Completion releases the astrologer's held earning, so a booked slot must have
    // started first. Admin may force-complete (remediation). An on-demand
    // consultation has no scheduled_at and is not gated.
    if (!isAdmin && row.scheduled_at) {
      const early = tooEarlyToCompleteMessage(new Date(row.scheduled_at), 'consultation');
      if (early) {
        return reply.code(409).send({ error: early, code: TOO_EARLY_TO_COMPLETE });
      }
    }
    // Compare-and-set: only a row that is still 'confirmed' completes. A cancel
    // that landed between the read above and this write must not be overwritten
    // (the devotee has been told "refund on its way"), and a double click on End
    // must answer like the first one did.
    const completedRows = Number(
      await prisma.$executeRawUnsafe(
        `UPDATE astrologer_consultations SET status = 'completed' WHERE id = $1::uuid AND status = 'confirmed';`,
        id,
      ),
    );
    if (completedRows === 0) {
      const now = await prisma.$queryRawUnsafe<Array<{ status: string }>>(
        `SELECT status FROM astrologer_consultations WHERE id = $1::uuid LIMIT 1;`,
        id,
      );
      if (now[0]?.status === 'completed') {
        return reply.send({ completed: true, alreadyCompleted: true, consultationId: row.id });
      }
      return reply.code(409).send({ error: `Cannot complete a ${now[0]?.status ?? 'missing'} consultation.` });
    }
    return reply.send({ completed: true, consultationId: row.id, reference: row.reference });
  });

  // ─── GET /:id ───────────────────────────────────────────────────────────
  // Fetch single consultation (success page + portal).
  server.get('/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_SHAPE.test(id)) {
      return reply.code(400).send({ error: 'Invalid consultation id.' });
    }
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations WHERE id = $1::uuid LIMIT 1;`,
      id,
    );
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: 'Consultation not found.' });
    // P0 #AP-10 (2026-07-09): allow the assigned astrologer + admins too.
    // Previously only the booking devotee could fetch a single consultation,
    // so an astrologer opening their own session's detail/success URL got 403.
    const callerId = request.currentUser!.id;
    const isOwner = row.user_id === callerId;
    let isAssignedAstrologer = row.astrologer_id === callerId;
    // /book stores the AstrologerProfile.id, not the User id, so the user-id
    // comparison alone 403'd every real astrologer on their own consultation.
    if (!isOwner && !isAssignedAstrologer) {
      const profile = await prisma.astrologerProfile
        .findUnique({ where: { userId: callerId }, select: { id: true } })
        .catch(() => null);
      isAssignedAstrologer = !!profile && profile.id === row.astrologer_id;
    }
    const isAdmin = (request.currentUser!.roles ?? []).includes('ADMIN');
    if (!isOwner && !isAssignedAstrologer && !isAdmin) {
      return reply.code(403).send({ error: 'Not authorized.' });
    }
    return reply.send({
      consultation: {
        id: row.id,
        reference: row.reference,
        astrologerId: row.astrologer_id,
        astrologerName: row.astrologer_name,
        minutes: row.minutes,
        amountInr: Number(row.amount_inr),
        currency: row.currency,
        status: row.status,
        roomName: row.room_name,
        jitsiUrl: row.room_name ? `https://meet.jit.si/${row.room_name}` : null,
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
        paidAt: row.paid_at,
        // P0 #AP-10: surface the devotee id only to the owner/admin — the
        // assigned astrologer gets the consultation detail but not the
        // devotee's user id (privacy: astrologers see room + booking meta,
        // not the underlying account id).
        ...(isOwner || isAdmin ? { userId: row.user_id } : {}),
      },
    });
  });

  // ─── GET /astrologer/mine ───────────────────────────────────────────────
  // Astrologer-side LIST of AstrologerConsultation rows assigned to the
  // calling user.
  //
  // AW-01 (2026-08-12, P0): the filter was `astrologer_id = currentUser.id`
  // (the User UUID) alone. /book writes the AstrologerProfile.id, so a real
  // astrologer's own list was permanently empty — total 0 — while
  // /astrologer-portal/dashboard, which matches on BOTH identities
  // (routes/astrologer-portal.ts:63-65), could see the very same row. The web
  // Consultations page therefore reported "Upcoming 0" for a consultation the
  // devotee had already paid for: a guaranteed no-show.
  //
  // astrologer_consultations.astrologer_id is TEXT and has carried three forms
  // over time — AstrologerProfile.id (current), the User UUID (legacy), and the
  // mock slug (now un-bookable, see /book). Match the caller's profile id AND
  // user id so every attribution form resolves; mock-slug rows deliberately
  // still don't match, because they belong to nobody.
  server.get(
    '/astrologer/mine',
    { preHandler: [authenticateUser, requireRole('ASTROLOGER')] },
    async (request, reply) => {
      const parsed = astrologerListSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', issues: parsed.error.flatten() });
      }
      const { status, limit, offset } = parsed.data;
      const callerId = request.currentUser!.id;
      const profile = await prisma.astrologerProfile
        .findUnique({ where: { userId: callerId }, select: { id: true } })
        .catch(() => null);
      const astrologerIdValues = [profile?.id, callerId].filter(
        (v): v is string => typeof v === 'string' && v.length > 0,
      );
      await ensureConsultationTables();

      const params: unknown[] = [astrologerIdValues];
      let whereSql = `WHERE astrologer_id = ANY($1::text[])`;
      if (status) {
        params.push(status);
        whereSql += ` AND status = $${params.length}`;
      } else {
        // An astrologer's list is the sessions devotees actually paid for. Rows
        // that never got paid (an abandoned checkout, a payment held for review,
        // a pending order the devotee cancelled) are not bookings: they showed up
        // under "Upcoming" labelled "Devotee paid" with a Join/End pair that could
        // not work. An explicit ?status= still returns whatever was asked for.
        whereSql += ` AND (status IN ('confirmed', 'completed') OR (status = 'cancelled' AND paid_at IS NOT NULL))`;
      }
      params.push(limit);
      params.push(offset);
      const sql = `SELECT * FROM astrologer_consultations ${whereSql}
         ORDER BY scheduled_at DESC NULLS LAST, created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length};`;

      const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(sql, ...params);
      const countParams = params.slice(0, params.length - 2);
      const countSql = `SELECT COUNT(*)::int AS total FROM astrologer_consultations ${whereSql};`;
      const countRows = await prisma.$queryRawUnsafe<{ total: number }[]>(countSql, ...countParams);
      const total = countRows[0]?.total ?? 0;

      return reply.send({
        total,
        limit,
        offset,
        consultations: rows.map((row) => ({
          id: row.id,
          reference: row.reference,
          // No devotee account id: GET /:id already withholds it from the assigned
          // astrologer ("astrologers see room + booking meta, not the underlying
          // account id") and this list handed it over for every row.
          astrologerId: row.astrologer_id,
          astrologerName: row.astrologer_name,
          minutes: row.minutes,
          amountInr: Number(row.amount_inr),
          currency: row.currency,
          status: row.status,
          roomName: row.room_name,
          jitsiUrl: row.room_name ? `https://meet.jit.si/${row.room_name}` : null,
          scheduledAt: row.scheduled_at,
          createdAt: row.created_at,
          paidAt: row.paid_at,
        })),
      });
    },
  );

  // ─── POST /admin/:id/refund ─────────────────────────────────────────────
  // Admin queue action (slice L): retry the gateway refund of a CANCELLED, paid
  // consultation whose refund the gateway refused (refund_status = 'failed'; /admin/all
  // lists the column). Idempotent: a refunded row is a no-op, a FRESH 'sending' is not re-sent, a stale one
  // (no refund id, older than CONSULTATION_REFUND_STALE_MIN) is retried like 'failed'.
  server.post('/admin/:id/refund', { preHandler: [authenticateUser, requireRole('admin')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_SHAPE.test(id)) return reply.code(400).send({ error: 'Invalid consultation id.' });
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations WHERE id = $1::uuid LIMIT 1;`,
      id,
    );
    const row = rows[0];
    if (!row) return reply.code(404).send({ error: 'Consultation not found.' });
    if (row.status !== 'cancelled') {
      return reply.code(409).send({ error: 'Only a cancelled consultation can be refunded.' });
    }
    const ex = await refundConsultation(row, { type: 'admin', id: request.currentUser!.id }, `consultation refund by admin (${row.reference})`);
    return reply.send({ consultationId: row.id, refundExecution: ex.execution, refundId: ex.refundId ?? null });
  });

  // ─── GET /admin/stuck-refunds ───────────────────────────────────────────
  // Cancelled, paid consultations whose refund is 'failed' or 'sending' (with `retryable` per
  // isRefundRetryable), plus wellness Payment rows with an owed / in-flight refund marker.
  server.get('/admin/stuck-refunds', { preHandler: [authenticateUser, requireRole('admin')] }, async (_request, reply) => {
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(
      `SELECT * FROM astrologer_consultations
        WHERE status = 'cancelled' AND paid_at IS NOT NULL AND refund_status IN ('failed','sending')
        ORDER BY created_at DESC LIMIT 200;`,
    );
    const consultations = rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      amountInr: Number(r.amount_inr),
      refundStatus: r.refund_status ?? null,
      refundId: r.refund_id ?? null,
      refundStartedAt: r.refund_started_at ?? null,
      retryable: isRefundRetryable(r),
    }));
    const wellness = await prisma
      .$queryRawUnsafe<Array<{ id: string; amount: unknown; refund_amount: unknown; metadata: unknown }>>(
        `SELECT id, amount, refund_amount, metadata FROM payments
          WHERE metadata->>'rail' = 'wellness'
            AND (COALESCE(NULLIF(metadata->>'wellnessRefundOwedInr','')::numeric, 0) > 0
                 OR jsonb_typeof(metadata->'wellnessRefundInflight') = 'object')
          ORDER BY created_at DESC LIMIT 200;`,
      )
      .catch(() => []);
    return reply.send({
      consultations,
      wellness: wellness.map((p) => {
        const m = (p.metadata ?? {}) as Record<string, any>;
        return {
          paymentId: p.id,
          enrollmentId: m.wellnessEnrollmentId ?? null,
          amountInr: Number(p.amount),
          refundedInr: Number(p.refund_amount ?? 0),
          owedInr: Number(m.wellnessRefundOwedInr ?? 0),
          inflight: m.wellnessRefundInflight ?? null,
        };
      }),
    });
  });

  // ─── GET /admin/all ─────────────────────────────────────────────────────
  // ADMIN-only LIST across all AstrologerConsultation rows. Powers the
  // /admin/consultations dashboard. Optional status + astrologerId filters,
  // limit/offset pagination. Until real astrologer onboarding maps slug →
  // User UUID, admin is the only role that can drive the full lifecycle
  // (book → confirm → complete), so this list is the canonical operator view.
  server.get('/admin/all', { preHandler: [authenticateUser, requireRole('admin')] }, async (request, reply) => {
    const parsed = adminListSchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', issues: parsed.error.flatten() });
    }
    const { status, astrologerId, limit, offset } = parsed.data;
    await ensureConsultationTables();

    const where: string[] = [];
    const params: unknown[] = [];
    if (status) {
      params.push(status);
      where.push(`status = $${params.length}`);
    }
    if (astrologerId) {
      params.push(astrologerId);
      where.push(`astrologer_id = $${params.length}`);
    }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    params.push(limit);
    params.push(offset);
    const sql = `SELECT * FROM astrologer_consultations ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length};`;

    const rows = await prisma.$queryRawUnsafe<ConsultationRow[]>(sql, ...params);
    const countParams = params.slice(0, where.length);
    const countSql = `SELECT COUNT(*)::int AS total FROM astrologer_consultations ${whereSql};`;
    const countRows = await prisma.$queryRawUnsafe<{ total: number }[]>(countSql, ...countParams);
    const total = countRows[0]?.total ?? 0;

    // AW-02 (2026-08-12, P0): make the Commission gap VISIBLE. A consultation
    // can be 'confirmed' (money captured, room minted) and still have no ledger
    // row — that used to be a silent `return` in verify-payment, so the only way
    // an operator could find an unfulfillable paid booking was to diff this list
    // against /admin/commissions by hand. `commissionMissing: true` on a paid row
    // means: a devotee paid, nobody can be credited, refund manually.
    const paidIds = rows.filter((r) => r.status === 'confirmed' || r.status === 'completed').map((r) => r.id);
    let creditedIds = new Set<string>();
    if (paidIds.length > 0) {
      try {
        const credited = await prisma.commission.findMany({
          where: { bookingId: { in: paidIds } },
          select: { bookingId: true },
        });
        creditedIds = new Set(
          credited.map((c) => c.bookingId).filter((id): id is string => typeof id === 'string'),
        );
      } catch (err) {
        server.log.warn({ err }, '[consultation] commission lookup failed for admin list');
      }
    }

    // AO-17 (prod sweep 2026-08-12): say WHO the consultation is for.
    //
    // The USER column rendered `2b5bd615…` — a truncated UUID with no name and
    // no email — so the operator who is the only role able to drive the
    // lifecycle could not tell which devotee a Rs 500 consultation belonged to
    // without a separate database lookup. `astrologer_consultations.user_id` is
    // a TEXT column with no Prisma relation, so this is one explicit IN over
    // the page's ids: never per row (the page holds up to 50), and never a
    // reason for the ledger itself to fail — a cosmetic join that can blank the
    // list is worse than the missing name.
    const userIds = Array.from(
      new Set(rows.map((r) => r.user_id).filter((id): id is string => typeof id === 'string' && id.length > 0)),
    );
    const identities = new Map<string, { fullName: string | null; email: string | null }>();
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, email: true },
        });
        for (const u of users) identities.set(u.id, { fullName: u.fullName, email: u.email });
      } catch (err) {
        server.log.warn({ err }, '[consultation] devotee identity lookup failed for admin list');
      }
    }

    return reply.send({
      total,
      limit,
      offset,
      consultations: rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        userId: row.user_id,
        // AO-17: null, never a placeholder. A row whose devotee could not be
        // resolved must read as unknown, not as somebody.
        userName: identities.get(row.user_id)?.fullName ?? null,
        userEmail: identities.get(row.user_id)?.email ?? null,
        astrologerId: row.astrologer_id,
        astrologerName: row.astrologer_name,
        minutes: row.minutes,
        amountInr: Number(row.amount_inr),
        currency: row.currency,
        status: row.status,
        roomName: row.room_name,
        jitsiUrl: row.room_name ? `https://meet.jit.si/${row.room_name}` : null,
        scheduledAt: row.scheduled_at,
        createdAt: row.created_at,
        paidAt: row.paid_at,
        // Only meaningful for paid rows; an unpaid row has nothing to credit yet.
        commissionMissing:
          (row.status === 'confirmed' || row.status === 'completed') && !creditedIds.has(row.id),
      })),
    });
  });

  // ─── GET /by-room/:room ───────────────────────────────────────────────
  // P0 #AP-01 (2026-07-09): paid-gate for the video-call room. The web
  // /consultation/[id] page used to embed meet.jit.si for ANY visitor using a
  // client-constructed room name — a logged-out user got a free branded
  // room and could impersonate the astrologer. Now the page calls this
  // endpoint; it 403s unless the room is tied to a PAID ('confirmed')
  // consultation AND the caller is the devotee owner or the assigned
  // astrologer (or admin). Free-trial `/consultation/start` rooms are NOT
  // resolvable here (no row) → the page refuses to embed them.
  server.get('/by-room/:room', { preHandler: [authenticateUser] }, async (request, reply) => {
    const room = (request.params as { room: string }).room;
    const me = request.currentUser!;
    await ensureConsultationTables();
    const rows = await prisma.$queryRawUnsafe<Array<{
      id: string; user_id: string; astrologer_id: string; status: string;
      astrologer_name: string; reference: string; room_name: string | null;
    }>>(
      `SELECT id, user_id, astrologer_id, status, astrologer_name, reference, room_name
         FROM astrologer_consultations
        WHERE room_name = $1
        LIMIT 1;`,
      room,
    );
    const row = rows[0];
    if (!row) {
      return reply.code(404).send({ error: 'Consultation room not found.' });
    }
    if (row.status !== 'confirmed' && row.status !== 'completed') {
      return reply.code(403).send({ error: 'Consultation is not paid/active.' });
    }
    // Authorization: the devotee who booked, or the assigned astrologer (by
    // matching the astrologer_profile.user_id), or an admin.
    const isOwner = row.user_id === me.id;
    const isAdmin = me.roles.includes('ADMIN');
    let isAssignedAstrologer = false;
    if (!isOwner && !isAdmin) {
      const astro = await prisma.astrologerProfile.findUnique({
        where: { id: row.astrologer_id },
        select: { userId: true },
      }).catch(() => null);
      isAssignedAstrologer = !!astro && astro.userId === me.id;
    }
    if (!isOwner && !isAdmin && !isAssignedAstrologer) {
      return reply.code(403).send({ error: 'Not authorized for this consultation.' });
    }
    return reply.send({
      authorized: true,
      consultationId: row.id,
      reference: row.reference,
      astrologerName: row.astrologer_name,
      roomName: row.room_name,
      jitsiUrl: row.room_name ? `https://meet.jit.si/${row.room_name}` : null,
    });
  });
}
