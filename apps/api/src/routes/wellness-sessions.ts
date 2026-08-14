import { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { z } from 'zod';
import Razorpay from 'razorpay';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { generateInvoice } from '../lib/pdf-invoice.js';
import { sendEmail } from '../lib/email.js';

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
  priceInr: z.number().nonnegative(),
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
  priceInr: z.number().nonnegative().optional(),
  status: z.enum(['SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

const updateRoomSchema = z.object({
  roomUrl: z.string().url(),
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

    await prisma.commission.create({
      data: {
        wellnessEnrollmentId: enrollment.id,
        providerId: enrollment.session.instructorId,
        amount: instructorShare,
        percentage: platformRate,
        status: 'PENDING',
      },
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
        if (!existing) {
          const held = await prisma.wellnessEnrollment.count({
            where: { sessionId: session.id, status: { in: ['PAID', 'PENDING_PAYMENT'] } },
          });
          if (held >= session.capacity) {
            return reply.code(409).send({ error: 'Session is full' });
          }
        }
        const freeEnrollment = existing
          ? await prisma.wellnessEnrollment.update({
              where: { id: existing.id },
              data: { status: 'PAID' },
            })
          : await prisma.wellnessEnrollment.create({
              data: { sessionId: session.id, userId, status: 'PAID' },
            });
        return reply.code(201).send({
          data: {
            enrollmentId: freeEnrollment.id,
            free: true,
            amount: 0,
            currency: 'INR',
          },
        });
      }

      let razorpayOrderId: string;
      if (razorpay && amountPaise > 0) {
        const order = await razorpay.orders.create({
          amount: amountPaise,
          currency: 'INR',
          notes: { sessionId: session.id, userId },
        });
        razorpayOrderId = order.id;
      } else {
        razorpayOrderId = `order_demo_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      }

      // P0 #wp-01 (2026-07-09): capacity check. The old handler created a
      // PENDING_PAYMENT enrollment without comparing the enrolled count to
      // session.capacity, so N concurrent enrolls over-booked past the cap.
      // Count PAID + PENDING_PAYMENT (pending holds a slot until payment
      // completes or the enrollment is reaped). Re-enrolling an existing
      // pending row does not consume a new slot, so only gate the create path.
      if (!existing) {
        const held = await prisma.wellnessEnrollment.count({
          where: { sessionId: session.id, status: { in: ['PAID', 'PENDING_PAYMENT'] } },
        });
        if (held >= session.capacity) {
          return reply.code(409).send({ error: 'Session is full' });
        }
      }

      const enrollment = existing
        ? await prisma.wellnessEnrollment.update({
            where: { id: existing.id },
            data: { status: 'PENDING_PAYMENT', razorpayOrderId },
          })
        : await prisma.wellnessEnrollment.create({
            data: {
              sessionId: session.id,
              userId,
              status: 'PENDING_PAYMENT',
              razorpayOrderId,
            },
          });

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

      // Best-effort tax invoice — failure here must NOT block the PAID flip.
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
            subject: `Darshya tax invoice — ${detail.session.title}`,
            html: `<p>Namaste ${detail.user.fullName},</p><p>Your tax invoice for <strong>${detail.session.title}</strong> is attached.</p>`,
            text: `Tax invoice for ${detail.session.title} attached.`,
            attachments: [
              { filename: `invoice-wellness-${detail.session.id.slice(0, 8)}.pdf`, content: pdf },
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
