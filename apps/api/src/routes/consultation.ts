import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import crypto from 'node:crypto';
import { randomBytes } from 'node:crypto';
import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { astrologyService } from '../services/astrology.service.js';
import { assertNotProductionDemo } from '../lib/payment-mode.js';

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
  : new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

async function ensureConsultationTables() {
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
};

function nextConsultRef(): string {
  const d = new Date();
  const ymd = `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCDate()).padStart(2, '0')}`;
  return `AC-${ymd}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

const bookSchema = z.object({
  astrologerId: z.string().min(1).max(64),
  minutes: z.number().int().min(5).max(60),
  scheduledAt: z.string().datetime().optional(),
}).refine(
  (v) => !v.scheduledAt || new Date(v.scheduledAt).getTime() > Date.now(),
  { message: 'scheduledAt must be in the future', path: ['scheduledAt'] },
);

const verifySchema = z.object({
  consultationId: z.string().uuid(),
  razorpay_order_id: z.string().optional(),
  razorpay_payment_id: z.string().optional(),
  razorpay_signature: z.string().optional(),
});

// Admin LIST query — status filter optional, paginated. Bounds tight enough
// to prevent admin-page slowdown if rows grow into the thousands.
const adminListSchema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'completed', 'cancelled']).optional(),
  astrologerId: z.string().min(1).max(64).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Astrologer LIST query — same shape minus astrologerId (implicit: caller).
// Astrologer side filters by their own currentUser.id; only status + paging.
const astrologerListSchema = z.object({
  status: z.enum(['pending_payment', 'confirmed', 'completed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const __testing = { bookSchema, verifySchema, adminListSchema, astrologerListSchema, nextConsultRef };

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

    // Trust the in-memory astrology service as source-of-truth for rate +
    // identity. Client cannot inject a fake rate this way.
    const astrologer = astrologyService.getAstrologerById(astrologerId);
    if (!astrologer) {
      return reply.code(404).send({ error: 'Astrologer not found.' });
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
        server.log.error({ err }, 'razorpay.orders.create failed (consultation)');
        return reply.code(502).send({ error: 'Payment gateway unavailable. Please retry.' });
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
    if (row.status === 'confirmed') {
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
    }

    // Mint a fresh Jitsi room and flip status.
    const slug = row.astrologer_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 24);
    const roomName = `darshya-astrologer-${slug}-${randomBytes(12).toString('hex')}`;

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

    // P0 #AP-06 (2026-07-09): write a Commission ledger row so the astrologer's
    // earnings are reconcilable. The booking stores astrologer_id as a TEXT
    // (mock id / slug today, real AstrologerProfile.id once profiles are live),
    // so resolve it to a real AstrologerProfile → userId for providerId. If no
    // real profile exists (mock astrologer), skip — there is no real provider
    // to credit, and we must not violate Commission.providerId's UUID constraint.
    // Idempotent (findFirst on bookingId). Fire-and-forget: a ledger write
    // failure must never block the verified response.
    void (async () => {
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
        if (!profile?.userId) return; // mock astrologer — no real provider to credit
        const total = Number(row.amount_inr);
        const COMMISSION_RATE = 0.3; // platform takes 30%, astrologer keeps 70%
        const commissionAmount = Math.round(total * COMMISSION_RATE * 100) / 100;
        await prisma.commission.create({
          data: {
            bookingId: row.id,
            providerId: profile.userId,
            amount: commissionAmount,
            percentage: COMMISSION_RATE,
            status: 'PENDING',
          },
        });
      } catch (err) {
        server.log.warn({ err }, '[consultation] commission write failed');
      }
    })();

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
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
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
      return reply.send({ cancelled: true, refundEligible: false, alreadyCancelled: true });
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

    await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations
       SET status = 'cancelled'
       WHERE id = $1::uuid;`,
      id,
    );

    return reply.send({
      cancelled: true,
      refundEligible,
      consultationId: row.id,
      reference: row.reference,
      note: refundEligible
        ? 'Cancellation accepted. Refund will be processed within 5-7 business days.'
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
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
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
    const isAssignedAstrologer = row.astrologer_id === request.currentUser!.id;
    if (!isAdmin && !isAssignedAstrologer) {
      return reply.code(403).send({ error: 'Only the assigned astrologer or admin can mark complete.' });
    }
    if (row.status === 'completed') {
      return reply.send({ completed: true, alreadyCompleted: true, consultationId: row.id });
    }
    if (row.status !== 'confirmed') {
      return reply.code(409).send({ error: `Cannot complete a ${row.status} consultation.` });
    }
    await prisma.$executeRawUnsafe(
      `UPDATE astrologer_consultations SET status = 'completed' WHERE id = $1::uuid;`,
      id,
    );
    return reply.send({ completed: true, consultationId: row.id, reference: row.reference });
  });

  // ─── GET /:id ───────────────────────────────────────────────────────────
  // Fetch single consultation (success page + portal).
  server.get('/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
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
      },
    });
  });

  // ─── GET /astrologer/mine ───────────────────────────────────────────────
  // Astrologer-side LIST of AstrologerConsultation rows assigned to the
  // calling user. Filter is `astrologer_id = currentUser.id` (UUID equality).
  // The slug↔UUID onboarding gap means rows whose astrologer_id is still a
  // slug like 'astro_002' won't match a real User.id UUID — those simply
  // don't appear in the result. Once onboarding maps slug → User row this
  // endpoint surfaces them transparently.
  server.get(
    '/astrologer/mine',
    { preHandler: [authenticateUser, requireRole('ASTROLOGER')] },
    async (request, reply) => {
      const parsed = astrologerListSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', issues: parsed.error.flatten() });
      }
      const { status, limit, offset } = parsed.data;
      const astrologerId = request.currentUser!.id;
      await ensureConsultationTables();

      const params: unknown[] = [astrologerId];
      let whereSql = `WHERE astrologer_id = $1`;
      if (status) {
        params.push(status);
        whereSql += ` AND status = $${params.length}`;
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
          userId: row.user_id,
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

    return reply.send({
      total,
      limit,
      offset,
      consultations: rows.map((row) => ({
        id: row.id,
        reference: row.reference,
        userId: row.user_id,
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
