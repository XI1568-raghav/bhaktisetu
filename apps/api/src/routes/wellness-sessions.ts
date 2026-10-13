import { TOO_EARLY_TO_COMPLETE, tooEarlyToCompleteMessage } from '../lib/completion-window.js';
import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { httpUrlSchema } from '../lib/http-url.js';
import { sendEmail } from '../lib/email.js';
import { describeGatewayFailure } from '../lib/payment-gateway-error.js';

/**
 * Persisted wellness sessions — instructors schedule live yoga/meditation/etc
 * classes; devotees enrol against them. Payment goes through Razorpay so
 * unverified attendees can't see the Jitsi room URL until their money is
 * captured.
 *
 * Demo mode (no RAZORPAY_KEY_ID): the order id is synthesised and the
 * verify endpoint flips PENDING_PAYMENT → PAID without signature checks,
 * so the full flow is exercisable in dev.
 */

const razorpayKeyId = process.env.RAZORPAY_KEY_ID || '';
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
const isDemoPayment = !razorpayKeyId || razorpayKeyId === 'rzp_test_demo';

const razorpay = isDemoPayment
  ? null
  : new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

/**
 * ─── F455 / DI-09 limb 3 (2026-09-09): the enrolment capacity ceiling ────────
 *
 * THE DEFECT
 * POST /sessions/:id/enroll counted the held enrolments (:436 pre-fix) and then
 * created a row (:449 pre-fix) with no transaction, no lock and no constraint in
 * between. The free-satsang branch (:392 -> :404 pre-fix) had the identical
 * shape. Under READ COMMITTED (Postgres' default; Prisma passes no isolation
 * level) two devotees racing the last spot BOTH read `held = capacity - 1`, both
 * pass the gate and both INSERT. The session is oversold. On the paid branch the
 * count and the create are separated by a NETWORK CALL to Razorpay
 * (razorpay.orders.create), so the window is hundreds of milliseconds wide, not
 * microseconds — and each oversold enrolment is a real payment that mints a real
 * Commission, so the remedy is a refund plus a commission reversal, not an
 * apology.
 *
 * WHY NOT A UNIQUE INDEX
 * `wellness_enrollments_session_id_user_id_key` already enforces the OTHER
 * invariant on this table (one enrolment per session+user). A capacity ceiling
 * is a COUNT property, not a uniqueness property: no index can express "at most
 * N rows matching a predicate". The DI-06 migration
 * (20260908000000_di06_inflight_and_pair_money_uniques) says exactly this in its
 * THE ONES DELIBERATELY NOT CONSTRAINED footer and defers the fix to "a lock or
 * a trigger". This is that fix.
 *
 * WHY AN ADVISORY LOCK
 * It is already this repo's answer to this exact problem shape. RV-15 fixed the
 * identical count-then-create oversell on puja slots with `pg_advisory_xact_lock`
 * (services/booking.service.ts:161), and the shared priest-slot primitive
 * (lib/priest-slot.ts:64) issues the same call. Mirroring it keeps ONE mechanism
 * in the codebase instead of three.
 *   * vs `SELECT ... FOR UPDATE` on wellness_sessions: that locks the SESSION
 *     ROW, so every enrolment then contends with the instructor's own
 *     PATCH /sessions/:id and with the status transitions, and every instructor
 *     edit blocks enrolments. An advisory lock is keyed on an IDENTITY, not a
 *     row, so it serialises enrolments against each other and against nothing
 *     else.
 *   * vs SERIALIZABLE: correct, but it needs 40001 retry handling wrapped around
 *     a handler that has ALREADY created a live Razorpay order. Retrying the
 *     transaction cannot retry the order, so the retry loop would have to reason
 *     about reusing a minted order id — real complexity for the same outcome.
 *   * vs a trigger: strongest, but invisible to anyone reading this route, and
 *     unprovable in this suite (the Prisma client is mocked; there is no
 *     database). The repo's ONE trigger precedent
 *     (20260820120000_ops05_money_audit_events: money_audit_events_no_mutate) is
 *     an append-only guard rail on an audit table, not a business rule. A
 *     business-rule trigger here would also take effect at API boot via
 *     `migrate deploy`, and a migration that aborts on this project is an outage.
 *
 * NO MIGRATION IS REQUIRED. An advisory lock creates no schema object, so this
 * change adds no migration and cannot collide with the existing timestamps.
 *
 * BEST-EFFORT, DELIBERATELY. If the lock statement cannot run we warn and fall
 * through to the re-count inside the transaction. Degrading to the old (racy)
 * behaviour is strictly better than failing every enrolment, and the
 * session+user unique index still catches the same-user double-tap below.
 */
const HELD_STATUSES = ['PAID', 'PENDING_PAYMENT'] as const;

/** The devotee already holds a PAID enrolment on this session. */
class AlreadyEnrolledError extends Error {
  constructor() {
    super('You are already enrolled');
    this.name = 'AlreadyEnrolledError';
  }
}

/** Held enrolments have reached session.capacity. */
class SessionFullError extends Error {
  constructor() {
    super('Session is full');
    this.name = 'SessionFullError';
  }
}

/**
 * Stable advisory-lock key for one session's capacity bucket. A lock taken on a
 * different key is the same as no lock at all, so every writer that consumes a
 * spot must derive its key here.
 */
function sessionCapacityKey(sessionId: string): string {
  return `wellness-session-capacity:${sessionId}`;
}

/** Any Prisma client that can run raw SQL — top-level or an open transaction. */
type CapacityLockClient = {
  $queryRawUnsafe: (sql: string, ...values: unknown[]) => Promise<unknown>;
};

/**
 * Take a transaction-scoped advisory lock on a session's capacity key.
 *
 * `pg_advisory_xact_lock` releases at COMMIT, so it is safe under Supabase's
 * transaction-mode pooler (a session-level lock would leak across pooled
 * clients). MUST be the first statement inside the transaction it guards —
 * taking it after the count leaves the TOCTOU window wide open.
 */
async function lockSessionCapacity(tx: CapacityLockClient, key: string): Promise<void> {
  try {
    await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', key);
  } catch (err) {
    console.warn('[wellness-sessions] capacity advisory lock unavailable:', err);
  }
}

/** Prisma raises P2002 when the session+user unique index rejects the INSERT. */
function isDuplicateEnrollment(err: unknown): boolean {
  return (err as { code?: string } | null)?.code === 'P2002';
}

/**
 * Claim a spot and write the enrolment, serialised per session.
 *
 * Everything that decides whether a spot exists happens INSIDE the transaction,
 * AFTER the lock: the enrolment is re-read (the row the caller saw may have been
 * created by a concurrent request from the same devotee) and the held count is
 * re-taken — that count is the authoritative one, the caller's pre-check is only
 * an early exit. Capacity itself is passed in from the caller's session read
 * rather than re-read here, matching services/booking.service.ts, which likewise
 * compares against the ceiling it read outside the lock: enrol-vs-enrol is the
 * race being closed, and keeping the lock hold short matters more than racing
 * the instructor's own PATCH.
 *
 * The Razorpay order is created by the caller BEFORE this runs and stays outside
 * the transaction on purpose — a DB transaction must never be held open across a
 * third-party network call.
 */
async function enrollUnderCapacityLock(opts: {
  sessionId: string;
  userId: string;
  capacity: number;
  status: 'PAID' | 'PENDING_PAYMENT';
  razorpayOrderId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    await lockSessionCapacity(
      tx as unknown as CapacityLockClient,
      sessionCapacityKey(opts.sessionId),
    );

    const current = await tx.wellnessEnrollment.findUnique({
      where: { sessionId_userId: { sessionId: opts.sessionId, userId: opts.userId } },
    });
    if (current && current.status === 'PAID') throw new AlreadyEnrolledError();

    // Re-enrolling an existing held row does not consume a NEW spot, so only the
    // create path is gated — the same rule the pre-fix code applied, now taken
    // under the lock. `capacity` is INTEGER NOT NULL in the schema and every
    // write path validates `.positive()`, so there is no null case to interpret;
    // a capacity of 0 (reachable only by a direct DB write) still means "refuse
    // everyone", exactly as `held >= 0` did before.
    if (!current) {
      const held = await tx.wellnessEnrollment.count({
        where: { sessionId: opts.sessionId, status: { in: [...HELD_STATUSES] } },
      });
      if (held >= opts.capacity) throw new SessionFullError();
    }

    const data =
      opts.razorpayOrderId === undefined
        ? { status: opts.status }
        : { status: opts.status, razorpayOrderId: opts.razorpayOrderId };

    return current
      ? tx.wellnessEnrollment.update({ where: { id: current.id }, data })
      : tx.wellnessEnrollment.create({
          data: { sessionId: opts.sessionId, userId: opts.userId, ...data },
        });
  });
}

const createSessionSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(1).max(5000),
  type: z.enum(['YOGA', 'MEDITATION', 'VIPASSANA', 'PRANAYAMA', 'OTHER']).default('OTHER'),
  // Past-time guard. List endpoint already filters to gte(now) so a session
  // created in the past would be invisible — we'd silently lose the row.
  scheduledAt: z
    .string()
    .datetime()
    .refine((s) => new Date(s).getTime() >= Date.now() - 60_000, {
      message: 'scheduledAt cannot be in the past.',
    }),
  durationMinutes: z.number().int().positive().max(600),
  capacity: z.number().int().positive().max(10000),
  priceInr: z.number().nonnegative().max(1_000_000),
  // Wellness revamp: free daily satsang / donation-model sessions are the
  // top-of-funnel per research (Isha/AoL satsang are free/donation). isFree
  // marks a session free so the public catalog can show a "Free" badge and the
  // enroll flow can skip payment.
  isFree: z.boolean().optional(),
});

// Instructor edit — every field optional. scheduledAt may push into past for
// CANCELLED clean-up so we relax the past-time refine here.
const updateSessionSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  type: z.enum(['YOGA', 'MEDITATION', 'VIPASSANA', 'PRANAYAMA', 'OTHER']).optional(),
  scheduledAt: z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().max(600).optional(),
  capacity: z.number().int().positive().max(10000).optional(),
  priceInr: z.number().nonnegative().max(1_000_000).optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

const updateRoomSchema = z.object({
  roomUrl: httpUrlSchema('roomUrl'),
});

const verifyEnrollmentSchema = z.object({
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
});

// P0 #wp-03 (2026-07-09): write the instructor's Commission row on PAID.
// Previously the verify handler flipped PENDING_PAYMENT -> PAID and stopped,
// so wellness instructors had no payout ledger entry (earnings effectively ₹0).
// This writes a PENDING Commission row for the instructor's share
// (priceInr * (1 - platformCommission)) keyed on wellnessEnrollmentId.
// Idempotent: a duplicate verify does not double-write. Fire-and-forget so a
// ledger failure cannot roll back the PAID flip.
const WELLNESS_PLATFORM_COMMISSION = Number(process.env.WELLNESS_PLATFORM_COMMISSION ?? '0.20');
async function writeWellnessCommissionOnPaid(enrollmentId: string): Promise<void> {
  try {
    const existing = await prisma.commission.findFirst({
      where: { wellnessEnrollmentId: enrollmentId },
      select: { id: true },
    });
    if (existing) return;

    const enrollment = await prisma.wellnessEnrollment.findUnique({
      where: { id: enrollmentId },
      select: {
        id: true,
        session: { select: { instructorId: true, priceInr: true } },
      },
    });
    if (!enrollment?.session) return;

    const price = Number(enrollment.session.priceInr);
    if (!Number.isFinite(price) || price <= 0) return;

    const platformRate = Number.isFinite(WELLNESS_PLATFORM_COMMISSION)
      ? WELLNESS_PLATFORM_COMMISSION
      : 0.20;
    const instructorShare = Math.round(price * (1 - platformRate) * 100) / 100;

    // DI-06 (F367): ON CONFLICT DO NOTHING against UNIQUE
    // `commissions_wellness_enrollment_id_key` (migration 20260824000000), so a
    // replayed PAID flip cannot mint a second instructor earning in the window
    // between the findFirst above and this INSERT. Rationale in full at
    // payment.service.writePujaCommissionOnConfirm.
    await prisma.commission.createMany({
      data: [
        {
          wellnessEnrollmentId: enrollment.id,
          providerId: enrollment.session.instructorId,
          amount: instructorShare,
          percentage: platformRate,
          status: 'PENDING',
        },
      ],
      skipDuplicates: true,
    });
  } catch (err) {
    console.warn('[wellness-sessions] writeWellnessCommissionOnPaid failed:', err);
  }
}

const sessionIdParams = z.object({ id: z.string().uuid() });
const enrollmentIdParams = z.object({ id: z.string().uuid() });

function isAdmin(req: { currentUser?: { roles?: string[] } }): boolean {
  return Array.isArray(req.currentUser?.roles) && req.currentUser.roles.includes('ADMIN');
}

function serializeSession(s: any) {
  return {
    ...s,
    priceInr: s.priceInr?.toString?.() ?? s.priceInr,
  };
}

// AW-07 — the seat count a devotee-facing surface is allowed to publish.
//
// PAID + PENDING_PAYMENT both HOLD a seat, and this is the same set the enroll
// handler's capacity gate counts. If a read endpoint counted anything else, the
// catalog would advertise a seat /enroll then refuses with 409 "Session is
// full" — the class of defect where the UI invites a payment the server has
// already decided not to accept. Both the listing and the detail route include
// this exact clause so they can never drift apart.
const SEAT_HOLDING_STATUSES: ('PAID' | 'PENDING_PAYMENT')[] = ['PAID', 'PENDING_PAYMENT'];
const seatCountInclude = {
  instructor: { select: { id: true, fullName: true } },
  _count: { select: { enrollments: { where: { status: { in: SEAT_HOLDING_STATUSES } } } } },
};

/**
 * Strip the relation/aggregate scaffolding off a session row and replace it
 * with the two public facts a devotee needs: who teaches it and how many seats
 * are left. `roomUrl` is removed here unconditionally — a caller that is
 * entitled to it re-attaches it after its own entitlement check.
 */
function publicSession(row: any) {
  const { roomUrl: _omitRoomUrl, instructor, _count, ...rest } = row as {
    roomUrl?: string | null;
    instructor?: { id: string; fullName: string | null } | null;
    _count?: { enrollments: number };
  } & Record<string, unknown>;
  void _omitRoomUrl;
  const enrolledCount = _count?.enrollments ?? 0;
  const capacity = Number((rest as { capacity?: unknown }).capacity ?? 0);
  return {
    ...serializeSession(rest),
    instructorName: instructor?.fullName ?? null,
    enrolledCount,
    // Never negative: an over-held class reads "0 left", not "-3 left".
    spotsLeft: Math.max(0, capacity - enrolledCount),
  };
}

export async function wellnessSessionRoutes(server: FastifyInstance) {
  // POST /sessions — instructor creates a new session
  server.post(
    '/sessions',
    { preHandler: [authenticateUser, requireRole('WELLNESS_INSTRUCTOR')] },
    async (request, reply) => {
      const parsed = createSessionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid request body', details: parsed.error.flatten() });
      }
      const instructorId = request.currentUser!.id;
      // Free satsang sessions are forced to price 0 (donation-model top-of-funnel).
      const isFree = parsed.data.isFree ?? false;
      const session = await prisma.wellnessSession.create({
        data: {
          instructorId,
          title: parsed.data.title,
          description: parsed.data.description,
          type: parsed.data.type,
          scheduledAt: new Date(parsed.data.scheduledAt),
          durationMinutes: parsed.data.durationMinutes,
          capacity: parsed.data.capacity,
          priceInr: isFree ? 0 : parsed.data.priceInr,
        },
      });
      return reply.code(201).send({ data: serializeSession(session) });
    }
  );

  // GET /sessions/mine — instructor's own sessions (all statuses, all dates)
  server.get(
    '/sessions/mine',
    { preHandler: [authenticateUser, requireRole('WELLNESS_INSTRUCTOR')] },
    async (request, reply) => {
      const instructorId = request.currentUser!.id;
      const sessions = await prisma.wellnessSession.findMany({
        where: { instructorId },
        orderBy: { scheduledAt: 'desc' },
        take: 500,
        include: { _count: { select: { enrollments: { where: { status: { in: ['PAID', 'ATTENDED'] } } } } } },
      });
      const data = sessions.map((s) => ({
        ...serializeSession(s),
        enrolled: s._count.enrollments,
      }));
      return reply.send({ data });
    }
  );

  // PATCH /sessions/:id — instructor edits their own session
  server.patch(
    '/sessions/:id',
    { preHandler: [authenticateUser, requireRole('WELLNESS_INSTRUCTOR')] },
    async (request, reply) => {
      const params = sessionIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid session id' });
      const body = updateSessionSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid request body', details: body.error.flatten() });
      }
      const session = await prisma.wellnessSession.findUnique({ where: { id: params.data.id } });
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      const userId = request.currentUser!.id;
      if (session.instructorId !== userId && !isAdmin(request)) {
        return reply.code(403).send({ error: 'Only the instructor can edit this session' });
      }
      // Completing a session releases the instructor's held earnings (payout.service
      // holds them until the class has happened or is COMPLETED), so the scheduled start
      // must have passed. Moving the start into the past would release them the same way.
      // Admin keeps both for remediation; CANCELLED clean-up may still back-date.
      if (!isAdmin(request)) {
        const effectiveStart = body.data.scheduledAt ? new Date(body.data.scheduledAt) : session.scheduledAt;
        if (body.data.status === 'COMPLETED' && session.status !== 'COMPLETED') {
          const early = tooEarlyToCompleteMessage(effectiveStart, 'session');
          if (early) {
            return reply.code(409).send({ error: early, code: TOO_EARLY_TO_COMPLETE });
          }
        }
        const finalStatus = body.data.status ?? session.status;
        if (
          body.data.scheduledAt &&
          effectiveStart.getTime() < Date.now() &&
          effectiveStart.getTime() < session.scheduledAt.getTime() &&
          finalStatus !== 'CANCELLED'
        ) {
          return reply.code(409).send({
            error: 'A session cannot be moved to a time that has already passed.',
            code: 'scheduled_in_past',
          });
        }
      }
      const data: Record<string, unknown> = {};
      if (body.data.title !== undefined) data.title = body.data.title;
      if (body.data.description !== undefined) data.description = body.data.description;
      if (body.data.type !== undefined) data.type = body.data.type;
      if (body.data.scheduledAt !== undefined) data.scheduledAt = new Date(body.data.scheduledAt);
      if (body.data.durationMinutes !== undefined) data.durationMinutes = body.data.durationMinutes;
      if (body.data.capacity !== undefined) data.capacity = body.data.capacity;
      if (body.data.priceInr !== undefined) data.priceInr = body.data.priceInr;
      if (body.data.status !== undefined) data.status = body.data.status;
      const updated = await prisma.wellnessSession.update({ where: { id: session.id }, data });
      return reply.send({ data: serializeSession(updated) });
    }
  );

  // DELETE /sessions/:id — instructor removes their own session
  server.delete(
    '/sessions/:id',
    { preHandler: [authenticateUser, requireRole('WELLNESS_INSTRUCTOR')] },
    async (request, reply) => {
      const params = sessionIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid session id' });
      const session = await prisma.wellnessSession.findUnique({ where: { id: params.data.id } });
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      const userId = request.currentUser!.id;
      if (session.instructorId !== userId && !isAdmin(request)) {
        return reply.code(403).send({ error: 'Only the instructor can delete this session' });
      }
      // Deleting a session with money attached erased the devotees' paid
      // enrolments (and their audit trail) with no refund. Cancel it instead.
      const paidCount = await prisma.wellnessEnrollment.count({
        where: { sessionId: session.id, status: { in: ['PAID', 'ATTENDED'] } },
      });
      if (paidCount > 0 && Number(session.priceInr) > 0) {
        return reply.code(409).send({
          error: 'This session has paid enrolments. Cancel it (status CANCELLED) so devotees can be refunded instead of deleting it.',
          code: 'session_has_paid_enrolments',
        });
      }
      // Cascade-clean enrollments first so we don't hit FK constraints.
      await prisma.wellnessEnrollment.deleteMany({ where: { sessionId: session.id } });
      await prisma.wellnessSession.delete({ where: { id: session.id } });
      return reply.send({ ok: true });
    }
  );

  // GET /sessions — public; lists upcoming SCHEDULED + LIVE sessions.
  //
  // AW-07 (2026-08-12, P1): this is the ONLY read a devotee-facing catalog can
  // build on, and it carried neither the instructor's name nor the seats left.
  // A catalog then either omits both or invents them — and inventing them is
  // exactly what /wellness shipped (six fictional classes, hardcoded "8 spots
  // left", against a real table). Both facts are now real and derived here so
  // no client re-implements the arithmetic.
  server.get('/sessions', async (request, reply) => {
    const sessions = await prisma.wellnessSession.findMany({
      where: {
        scheduledAt: { gte: new Date() },
        status: { in: ['SCHEDULED', 'LIVE'] },
      },
      orderBy: { scheduledAt: 'asc' },
      take: 200,
      include: seatCountInclude,
    });
    // Strip roomUrl from public listing — only enrolled paid users / instructor see it.
    const stripped = sessions.map(publicSession);
    return reply.send({ data: stripped });
  });

  // GET /sessions/:id — detail. roomUrl is gated.
  //
  // AW-07 remaining half (2026-08-14): this was a bare findUnique +
  // serializeSession, so it carried neither instructorName nor spotsLeft — and
  // ClassDetailClient, the ONLY devotee-facing enrolment surface, reads both.
  // With spotsLeft absent its `isFull = spots === 0` was permanently false, so
  // a class with zero seats rendered an enabled "Enrol — ₹1,000" button that
  // POST /enroll then refused with 409. It now returns exactly what the
  // listing returns (same include, same derivation) plus the gated roomUrl.
  server.get('/sessions/:id', async (request, reply) => {
    const params = sessionIdParams.safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'Invalid session id' });
    const session = await prisma.wellnessSession.findUnique({
      where: { id: params.data.id },
      include: seatCountInclude,
    });
    if (!session) return reply.code(404).send({ error: 'Session not found' });

    // Determine roomUrl visibility: instructor, admin, or PAID enrollee.
    let canSeeRoom = false;
    const auth = request.headers.authorization;
    if (auth) {
      try {
        await authenticateUser(request, reply);
      } catch {
        // Best-effort — public route still works without auth.
      }
      const userId = request.currentUser?.id;
      if (userId) {
        if (userId === session.instructorId || isAdmin(request)) {
          canSeeRoom = true;
        } else {
          const enrollment = await prisma.wellnessEnrollment.findUnique({
            where: { sessionId_userId: { sessionId: session.id, userId } },
          });
          if (enrollment && enrollment.status === 'PAID') canSeeRoom = true;
        }
      }
    }

    // publicSession always drops roomUrl; it is re-attached only for a caller
    // the server itself has decided is entitled to it.
    const out: { roomUrl?: string | null } & Record<string, unknown> = publicSession(session);
    if (canSeeRoom) out.roomUrl = (session as { roomUrl?: string | null }).roomUrl ?? null;
    return reply.send({ data: out });
  });

  // POST /sessions/:id/enroll — devotee enrols, returns Razorpay order
  server.post(
    '/sessions/:id/enroll',
    { preHandler: [authenticateUser, requireRole('DEVOTEE')] },
    async (request, reply) => {
      const params = sessionIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid session id' });

      const session = await prisma.wellnessSession.findUnique({
        where: { id: params.data.id },
      });
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      if (session.status === 'CANCELLED') {
        return reply.code(409).send({ error: 'Session is cancelled' });
      }
      if (session.status === 'COMPLETED') {
        return reply.code(409).send({ error: 'Session has already completed' });
      }
      // A SCHEDULED class whose start has passed is over or underway without the
      // instructor opening it; taking money for it sold a seat to nothing. A
      // LIVE class (the instructor opened the room) still takes late joiners.
      if (session.status !== 'LIVE' && session.scheduledAt.getTime() <= Date.now()) {
        return reply.code(409).send({
          error: 'This session has already started and is closed for enrolment.',
          code: 'session_started',
        });
      }

      // Role pass 2026-10-07: nobody pays an instructor an admin has not
      // approved (the astrologer booking path has the same gate). Without it a
      // self-created, unvetted profile could sell classes the moment it listed one.
      const instructorProfile = await prisma.wellnessProfile.findUnique({
        where: { userId: session.instructorId },
        select: { approved: true },
      });
      if (!instructorProfile?.approved) {
        return reply.code(409).send({ error: 'This instructor is not yet approved to take bookings.' });
      }

      const userId = request.currentUser!.id;

      // Reuse an existing PENDING_PAYMENT enrollment if present (idempotent retry).
      const existing = await prisma.wellnessEnrollment.findUnique({
        where: { sessionId_userId: { sessionId: session.id, userId } },
      });
      if (existing && existing.status === 'PAID') {
        return reply.code(409).send({ error: 'You are already enrolled' });
      }

      const priceInr = Number(session.priceInr);
      const amountPaise = Math.round(priceInr * 100);

      // Wellness revamp: FREE sessions (daily satsang top-of-funnel) enroll
      // instantly as PAID — no Razorpay order, no payment step. This is the
      // research-backed funnel (Isha/AoL free satsang → paid courses).
      if (priceInr <= 0) {
        // F455/DI-09: the free satsang branch is the SAME count-then-create race
        // as the paid one below. It is the top-of-funnel volume path — one
        // broadcast fills a class in seconds — so it is the branch most likely
        // to actually oversell, and it enrols straight to PAID, meaning an
        // oversold row is immediately entitled to the room URL. It takes the
        // same lock. No money moves here (priceInr <= 0, no Razorpay order, no
        // Commission), so the only thing the cap protects is a seat.
        let freeEnrollment;
        try {
          freeEnrollment = await enrollUnderCapacityLock({
            sessionId: session.id,
            userId,
            capacity: session.capacity,
            status: 'PAID',
          });
        } catch (err) {
          if (err instanceof SessionFullError) {
            return reply.code(409).send({ error: 'Session is full' });
          }
          if (err instanceof AlreadyEnrolledError || isDuplicateEnrollment(err)) {
            return reply.code(409).send({ error: 'You are already enrolled' });
          }
          throw err;
        }
        return reply.code(201).send({
          data: {
            enrollmentId: freeEnrollment.id,
            free: true,
            amount: 0,
            currency: 'INR',
          },
        });
      }

      // Cheap pre-check, deliberately BEFORE razorpay.orders.create. It is not
      // the authoritative gate — enrollUnderCapacityLock re-counts under the
      // lock — but it stops a provably-full session from minting a real
      // Razorpay order that nobody will ever be allowed to pay. Pre-fix this
      // check sat AFTER the order call (:436), so every attempt on a full class
      // left an orphan live order behind.
      if (!existing) {
        const held = await prisma.wellnessEnrollment.count({
          where: { sessionId: session.id, status: { in: [...HELD_STATUSES] } },
        });
        if (held >= session.capacity) {
          return reply.code(409).send({ error: 'Session is full' });
        }
      }

      let razorpayOrderId: string;
      if (razorpay && amountPaise > 0) {
        try {
          const order = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            notes: { sessionId: session.id, userId },
          });
          razorpayOrderId = order.id;
        } catch (err) {
          const f = describeGatewayFailure(err);
          server.log.error({ gatewayStatus: f.status, gatewayCode: f.code, gatewayReason: f.reason }, 'razorpay.orders.create failed (wellness)');
          return reply.code(503).send({
            error: 'We could not open the payment page right now. Nothing has been charged. Please try again in a few minutes.',
            code: 'PAYMENT_GATEWAY_UNAVAILABLE',
          });
        }
      } else {
        razorpayOrderId = `order_demo_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      }

      // P0 #wp-01 (2026-07-09) added a capacity check here; F455/DI-09
      // (2026-09-09) made it hold. The check counted PAID + PENDING_PAYMENT
      // (a pending row holds a spot until payment completes or it is reaped)
      // and then created, on the bare client, with the Razorpay round-trip
      // sitting between them — so it rejected the SEQUENTIAL over-cap enrol and
      // let the CONCURRENT one straight through. The count and the create now
      // happen in one transaction behind a per-session advisory lock.
      let enrollment;
      try {
        enrollment = await enrollUnderCapacityLock({
          sessionId: session.id,
          userId,
          capacity: session.capacity,
          status: 'PENDING_PAYMENT',
          razorpayOrderId,
        });
      } catch (err) {
        // The Razorpay order minted above is now orphaned. That is the correct
        // trade: an unpaid order expires on its own, whereas an oversold class
        // is a captured payment plus a minted Commission that has to be refunded
        // and reversed by hand.
        if (err instanceof SessionFullError) {
          return reply.code(409).send({ error: 'Session is full' });
        }
        if (err instanceof AlreadyEnrolledError || isDuplicateEnrollment(err)) {
          return reply.code(409).send({ error: 'You are already enrolled' });
        }
        throw err;
      }

      return reply.code(201).send({
        data: {
          enrollmentId: enrollment.id,
          razorpayOrderId,
          amount: amountPaise,
          currency: 'INR',
          keyId: razorpayKeyId || 'rzp_test_demo',
          isDemoPayment,
        },
      });
    }
  );

  // GET /enrollments/mine — the devotee's own wellness enrolments.
  //
  // AW-13 (2026-08-12, P2): there was no such route. A devotee paid ₹1,000 for a
  // class and, the moment they closed the tab, had no way back to it — the only
  // path in was already knowing the session UUID. /wellness/enrollments/mine,
  // /wellness/my-enrollments and /wellness/enrollments all 404'd. This mirrors
  // GET /consultation/mine and backs the devotee "My classes" page.
  //
  // The room gate is the same one GET /sessions/:id enforces: the join link is
  // a PAID entitlement. An enrolment sitting in PENDING_PAYMENT, CANCELLED or
  // REFUNDED still lists (the devotee needs to see it) but carries roomUrl null.
  server.get('/enrollments/mine', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const rows = await prisma.wellnessEnrollment.findMany({
      where: { userId },
      orderBy: { enrolledAt: 'desc' },
      take: 200,
      select: {
        id: true,
        sessionId: true,
        status: true,
        enrolledAt: true,
        attendedAt: true,
        session: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            scheduledAt: true,
            durationMinutes: true,
            capacity: true,
            priceInr: true,
            status: true,
            roomUrl: true,
            instructor: { select: { id: true, fullName: true } },
          },
        },
      },
    });

    const data = rows.map((row) => {
      const { session, ...enrollment } = row as typeof row & {
        session: {
          roomUrl: string | null;
          priceInr: unknown;
          instructor: { id: string; fullName: string | null } | null;
        } & Record<string, unknown>;
      };
      const { roomUrl, instructor, ...restOfSession } = session;
      const paid = enrollment.status === 'PAID' || enrollment.status === 'ATTENDED';
      return {
        ...enrollment,
        session: {
          ...serializeSession(restOfSession),
          instructorName: instructor?.fullName ?? null,
          // Withheld unless the money actually landed.
          roomUrl: paid ? roomUrl ?? null : null,
        },
      };
    });

    return reply.send({ data });
  });

  // POST /enrollments/:id/verify — verify Razorpay signature, flip PAID
  server.post(
    '/enrollments/:id/verify',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const params = enrollmentIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid enrollment id' });
      const body = verifyEnrollmentSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid request body', details: body.error.flatten() });
      }

      const enrollment = await prisma.wellnessEnrollment.findUnique({
        where: { id: params.data.id },
      });
      if (!enrollment) return reply.code(404).send({ error: 'Enrollment not found' });
      const userId = request.currentUser!.id;
      if (enrollment.userId !== userId && !isAdmin(request)) {
        return reply.code(403).send({ error: 'Not authorized to verify this enrollment' });
      }

      if (!isDemoPayment) {
        const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = body.data;
        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
          return reply.code(400).send({ error: 'Razorpay verification fields missing' });
        }
        // P0 #wp-02 (2026-07-10): order-id mismatch guard. The signature is
        // verified over the client-supplied order id but that id was never
        // compared to the order id persisted at enroll time — so a valid
        // signature for ANY of the caller's orders (incl. a stale/cancelled
        // order) would mark THIS enrollment paid. Mirrors donations.ts /
        // consultation.ts. A null stored order (pre-fix enrollment with no
        // recorded order) cannot be verified — reject rather than fall through
        // to signature-only, which would re-open the gap for null-order rows.
        if (!enrollment.razorpayOrderId || razorpayOrderId !== enrollment.razorpayOrderId) {
          return reply.code(400).send({ error: 'Order id mismatch.' });
        }
        const expected = crypto
          .createHmac('sha256', razorpayKeySecret)
          .update(`${razorpayOrderId}|${razorpayPaymentId}`)
          .digest('hex');
        // Timing-safe compare — `===` on hex strings leaks signature bytes
        // through response-time deltas under load (mirrors donations.ts).
        const expBuf = Buffer.from(expected, 'utf8');
        const sigBuf = Buffer.from(razorpaySignature, 'utf8');
        const sigOk =
          expBuf.length === sigBuf.length && crypto.timingSafeEqual(expBuf, sigBuf);
        if (!sigOk) {
          return reply.code(400).send({ error: 'Invalid payment signature' });
        }
      }

      const updated = await prisma.wellnessEnrollment.update({
        where: { id: enrollment.id },
        data: { status: 'PAID' },
      });

      // P0 #wp-03: record the instructor's payout ledger entry (fire-and-forget).
      void writeWellnessCommissionOnPaid(updated.id);

      // Best-effort payment receipt — failure here must NOT block the PAID flip.
      void (async () => {
        try {
          const detail = await prisma.wellnessEnrollment.findUnique({
            where: { id: updated.id },
            select: {
              enrolledAt: true,
              user: { select: { fullName: true, email: true } },
              session: {
                select: {
                  id: true,
                  title: true,
                  priceInr: true,
                  instructor: { select: { fullName: true } },
                },
              },
            },
          });
          if (!detail || !detail.user.email) return;
          const pdf = await generateInvoice({
            type: 'wellness_session',
            sessionId: detail.session.id,
            devoteeName: detail.user.fullName,
            instructorName: detail.session.instructor.fullName,
            sessionTitle: detail.session.title,
            amountInr: Number(detail.session.priceInr),
            createdAt: detail.enrolledAt.toISOString().slice(0, 10),
          });
          await sendEmail({
            to: detail.user.email,
            subject: `Darshya payment receipt — ${detail.session.title}`,
            html: `<p>Namaste ${detail.user.fullName},</p><p>Your payment receipt for <strong>${detail.session.title}</strong> is attached.</p>`,
            text: `Payment receipt for ${detail.session.title} attached.`,
            attachments: [
              { filename: `receipt-wellness-${detail.session.id.slice(0, 8)}.pdf`, content: pdf },
            ],
          });
        } catch (err) {
          console.warn('[wellness-sessions] invoice send failed:', err);
        }
      })();

      return reply.send({ data: updated });
    }
  );

  // PATCH /sessions/:id/room — instructor sets the Jitsi room URL
  server.patch(
    '/sessions/:id/room',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const params = sessionIdParams.safeParse(request.params);
      if (!params.success) return reply.code(400).send({ error: 'Invalid session id' });
      const body = updateRoomSchema.safeParse(request.body ?? {});
      if (!body.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid request body', details: body.error.flatten() });
      }
      const session = await prisma.wellnessSession.findUnique({
        where: { id: params.data.id },
      });
      if (!session) return reply.code(404).send({ error: 'Session not found' });
      const userId = request.currentUser!.id;
      if (session.instructorId !== userId && !isAdmin(request)) {
        return reply.code(403).send({ error: 'Only the instructor can set the room URL' });
      }
      const updated = await prisma.wellnessSession.update({
        where: { id: session.id },
        data: { roomUrl: body.data.roomUrl },
      });
      return reply.send({ data: serializeSession(updated) });
    }
  );
}
