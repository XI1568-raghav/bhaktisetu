import { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { priestService, PujaStateConflictError } from '../services/priest.service.js';
import { dispatchService } from '../services/dispatch.service.js';
import { cancellationService } from '../services/cancellation.service.js';
import { prisma } from '../lib/prisma.js';
import { listPendingForPriest, respondToInvite } from '../services/temple-priest-invite.service.js';
import { presignR2Upload, r2 } from '../lib/r2.js';
import { isDemoMode } from '../lib/supabase.js';
import { httpUrlSchema } from '../lib/http-url.js';
import { BookingStatus, PayoutStatus, Prisma } from '@prisma/client';

// Zod gates for the pandit-owned puja offering CRUD. Hoisted to module
// scope so tests can import them via __testing without spinning a server.
const priestOfferingCreateSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(5000).optional(),
  deity: z.string().min(1).max(120),
  basePrice: z.number().nonnegative(),
  durationMinutes: z.number().int().min(5).max(600),
  isActive: z.boolean().optional(),
  // Slot capacity (E7 follow-up). availableSlots accepts either an array
  // of "HH:MM" strings or an array of {time,label} objects — same shape
  // as TemplePujaOffering.availableSlots so the public /bookings/slots
  // endpoint can reuse its label renderer.
  maxBookingsPerSlot: z.number().int().min(1).max(1000).optional(),
  availableSlots: z.array(z.unknown()).max(200).optional(),
});
const priestOfferingUpdateSchema = priestOfferingCreateSchema.partial();

/**
 * PF-13, the half the `?status` enum did not close.
 *
 * Every handler below ends `catch (err: any) { reply.code(400).send({ error:
 * err.message }) }`. That catch cannot tell a deliberate 4xx ("This booking is
 * not assigned to you", which the portal renders) from an infrastructure fault,
 * and a Prisma fault's `message` is a multi-line block carrying the server's
 * absolute path, the source file, the line number and four lines of source.
 * Constraining `?status` removed one way to trigger it; a bad date range, a
 * non-UUID id or a dropped connection are all still live.
 *
 * server.ts's setErrorHandler cannot cover this: it sanitises 5xx only, and
 * only for errors that PROPAGATE — these are caught and answered 400 by hand,
 * and 400 is on its `safeToEcho` list on purpose.
 *
 * So the discrimination has to happen here. A message is echoed only if it
 * looks like something a person wrote for another person: one line, short, and
 * free of any filesystem path, ORM invocation or source frame. Anything else is
 * replaced. The real error is still logged (see the callers) — nothing is lost
 * except the copy of it that was being handed to the client.
 */
const PRISMA_ERROR_CODE = /^P\d{4}$/;
const LEAKY_MESSAGE =
  /(prisma\.[a-z]|invocation in|[a-z]:\\|\/(?:opt|home|usr|var|srv)\/|\.(?:ts|js|mjs|cjs):\d+|node_modules|→\s*\d+|\bat\s+\w+\s+\()/i;

export function safeErrorMessage(err: unknown): string {
  const GENERIC = 'Request failed. Please try again.';
  if (!err || typeof err !== 'object') {
    return typeof err === 'string' && err.trim() && !LEAKY_MESSAGE.test(err) && err.length <= 200
      ? err
      : GENERIC;
  }

  const e = err as { message?: unknown; code?: unknown; name?: unknown; clientVersion?: unknown };

  // Prisma tags every known request error with a P-code and every client error
  // class with a PrismaClient* name. Both are infrastructure by definition.
  if (typeof e.code === 'string' && PRISMA_ERROR_CODE.test(e.code)) return GENERIC;
  if (typeof e.name === 'string' && e.name.startsWith('PrismaClient')) return GENERIC;
  if (typeof e.clientVersion === 'string') return GENERIC;

  const message = typeof e.message === 'string' ? e.message.trim() : '';
  if (!message) return GENERIC;
  if (message.includes('\n')) return GENERIC;
  if (message.length > 200) return GENERIC;
  if (LEAKY_MESSAGE.test(message)) return GENERIC;
  return message;
}

export const __testing = {
  priestOfferingCreateSchema,
  priestOfferingUpdateSchema,
  safeErrorMessage,
  get bookingsQuerySchema() {
    return bookingsQuerySchema;
  },
  get payoutsQuerySchema() {
    return payoutsQuerySchema;
  },
  get videoProofBodySchema() {
    return videoProofBodySchema;
  },
  get storageReady() {
    return storageReady;
  },
};

const MAX_VIDEO_MB = 200;
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

// Pagination clamp — without this, an attacker (or a buggy client) can
// request limit=100000 and force a full-table scrape into memory.
//
// `status` is an enum, not a free string: an unknown value used to reach
// Prisma and come back as a 400 whose body carried the server's absolute path,
// the source file, the line number and the surrounding source lines.
const bookingsQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  view: z.enum(['all', 'confirmed', 'priest_assigned', 'in_progress', 'completed']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// PF-13: the bookings route got the enum treatment; the payouts route did not.
// `?status=zzz` was cast straight to PayoutStatus, reached Prisma, and came back
// as a 400 whose body carried the server's absolute path, the source file, the
// line number and the surrounding source lines. page/limit were `Number(...)`
// with no clamp either, so `?limit=100000` scraped the whole payout table.
const payoutsQuerySchema = z.object({
  status: z.nativeEnum(PayoutStatus).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// PATCH /priest/profile had no validation at all: `{"displayName":""}` blanked the
// pandit's public name (puja pages, receipts, the temple roster), and any string
// was accepted as avatarUrl/languages. Unknown keys are stripped, not rejected,
// so older clients that send extra fields keep working.
const priestProfileUpdateSchema = z.object({
  displayName: z.string().trim().min(2, 'displayName must be at least 2 characters').max(120).optional(),
  bio: z.string().max(2000).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(15).optional(),
  specializations: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  experienceYears: z.coerce.number().int().min(0).max(80).optional(),
  avatarUrl: httpUrlSchema('avatarUrl', 1000).optional(),
});

const videoProofBodySchema = z.object({
  // PF-06: `"  "` and `"not-a-url-at-all"` were both persisted verbatim as the
  // booking's video proof, then permanently blocked delivery. Mirrors the
  // `z.string().url()` gate the PATCH /bookings/:id proof field already uses.
  // `.url()` alone accepts any scheme: `javascript:alert(1)` and `file:///etc/x`
  // were stored as "proof" and rendered as the devotee's/admin's link. Only a
  // web link can be a recording.
  videoUrl: httpUrlSchema('videoUrl'),
});

/* ─── DI-05, the read half: /priest/payouts must see BOTH payout rails ───────
 *
 * The write half shipped 2026-08-12 (booking.service EARNING_ATTACH_STATUSES):
 * attaching a pandit to a paid temple booking now mints his Commission, so the
 * unified surfaces (/payouts/balance, /payouts/commissions) report him
 * correctly.
 *
 * It did not fix the screen he is actually sent to. The priest portal's only
 * money link is /priest/payouts (apps/web/app/priest/layout.tsx), and that
 * endpoint reads the PriestPayout sidecar table and nothing else — while
 * payment.service.createPriestPayout REFUSES to write a sidecar row whenever a
 * live Commission owns the booking (the two rails are mutually exclusive by
 * construction, and must stay that way or every pandit is paid twice).
 *
 * So minting the Commission is precisely what stops the row this endpoint reads
 * from ever existing. A pandit whose work came through the temple path still
 * opens his payout page and sees "No payouts found" over three Rs 0 cards.
 * routes/admin-bookings.ts already merges both rails for the ADMIN — the
 * operator could see money the earner could not.
 *
 * Nothing here computes what anyone is owed: `Commission.amount` IS the
 * provider's earning (lib/commission-math.ts) and is passed through untouched.
 * This is a read that had been looking at one of two tables.
 */

/** A commission-backed earning, shaped exactly like a PriestPayout row. */
type UnifiedRail = {
  id: string;
  rail: 'commission';
  amount: Prisma.Decimal;
  status: 'pending' | 'processing' | 'completed';
  payoutMethod: string;
  payoutReference: string | null;
  processedAt: Date | null;
  createdAt: Date;
  booking: {
    id: string;
    bookingNumber: string;
    pujaType: { name: string };
    temple: { name: string };
  };
};

/**
 * Puja-booking-backed, non-void commissions owned by this pandit's User id.
 *
 *  - `bookingId: { not: null }` — the ledger also carries store-order and
 *    wellness-enrollment rows for a provider who wears more than one hat. Those
 *    have no booking to render and belong to their own portals; the unified
 *    /payouts page is where a multi-role provider sees everything at once.
 *  - REVERSED is an audit record of a VOIDED earning (a reschedule detaches the
 *    pandit and reverses his commission). Showing it would promise money nobody
 *    owes — the same reason createPriestPayout ignores REVERSED rows.
 */
function unifiedBaseWhere(providerId: string): Prisma.CommissionWhereInput {
  return { providerId, bookingId: { not: null }, status: { not: 'REVERSED' } };
}

/** Open payout requests — a commission linked to one is in flight, not fresh. */
const IN_FLIGHT_REQUEST_STATUSES = ['pending', 'processing'] as const;

/**
 * The portal's payout vocabulary, expressed against the commission ledger.
 * Returns null when NO commission can ever match — `failed` is a property of a
 * bank transfer, and a failed PayoutRequest unlinks its commissions and returns
 * them to PENDING, so no commission is ever left in a failed state.
 *
 * The two PENDING branches are exact complements, so they agree with
 * `unifiedRowStatus` below by construction rather than by coincidence.
 */
function unifiedStatusFilter(status?: PayoutStatus): Prisma.CommissionWhereInput | null {
  switch (status) {
    case undefined:
      return {};
    case 'pending':
      return {
        status: 'PENDING',
        OR: [
          { payoutRequestId: null },
          { payoutRequest: { status: { notIn: [...IN_FLIGHT_REQUEST_STATUSES] } } },
        ],
      };
    case 'processing':
      return {
        status: 'PENDING',
        payoutRequest: { status: { in: [...IN_FLIGHT_REQUEST_STATUSES] } },
      };
    case 'completed':
      return { status: 'PAID' };
    case 'failed':
      return null;
    default:
      // Unreachable — Zod already rejected anything outside PayoutStatus. If the
      // enum ever grows, matching nothing is the conservative answer: it can
      // under-report a filtered VIEW, never the summary cards, which are
      // computed from the unfiltered ledger.
      return null;
  }
}

function unifiedRowStatus(row: {
  status: string;
  payoutRequest?: { status: string } | null;
}): 'pending' | 'processing' | 'completed' {
  if (row.status === 'PAID') return 'completed';
  const requestStatus = row.payoutRequest?.status;
  if (requestStatus && (IN_FLIGHT_REQUEST_STATUSES as readonly string[]).includes(requestStatus)) {
    return 'processing';
  }
  return 'pending';
}

/**
 * How deep the MERGED ledger can be paged when a pandit has rows on BOTH rails.
 *
 * Offset-paging a union needs the top (skip + limit) of each side, so the cost
 * grows with the page number. A pandit with rows on only one rail is unaffected
 * — that path pages the single rail directly, with no ceiling — and this bound
 * is ~500 completed pujas on the OTHER rail before it can bite. The response
 * says `mergeTruncated` when it does, rather than quietly ending the list.
 */
const RAIL_MERGE_WINDOW = 500;

const toDecimal = (value: Prisma.Decimal | number | string | null | undefined): Prisma.Decimal =>
  new Prisma.Decimal(value ?? 0);

/**
 * The same three earnings figures the dashboard card shows, taken off the
 * unified rail.
 *
 * PF-12 exists because /priest and /priest/payouts once disagreed about the
 * same account's money. Teaching only the payouts endpoint about the commission
 * ledger would recreate that contradiction with a bigger gap: Rs 770 owed on one
 * screen, Rs 0 on the other. Both read through here.
 *
 * `monthStart` is passed in rather than computed here so it is the CALLER's one
 * definition of "this month" — priest.service builds it as a local-time
 * `new Date(y, m, 1)`, and two boundaries that drift apart is the same defect
 * again in a different column.
 */
async function unifiedEarnings(providerId: string, monthStart: Date) {
  const base = unifiedBaseWhere(providerId);
  const [paid, paidThisMonth, pending] = await Promise.all([
    prisma.commission.aggregate({
      where: { ...base, status: 'PAID' },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { ...base, status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.commission.aggregate({
      where: { ...base, status: 'PENDING' },
      _sum: { amount: true },
    }),
  ]);
  return {
    total: toDecimal(paid._sum.amount),
    thisMonth: toDecimal(paidThisMonth._sum.amount),
    pending: toDecimal(pending._sum.amount),
  };
}

/**
 * PF-05: two modules disagreed about what "storage is configured" means.
 * `r2.enabled` is `r2Enabled || supabaseEnabled`, and lib/r2's `supabaseEnabled`
 * is true whenever SUPABASE_URL + a service key are set — including the
 * `https://demo.supabase.co` placeholder that lib/supabase treats as demo mode
 * and answers with a Proxy whose `storage` is a bare throwing function. So the
 * designed 503 never fired and the pandit got
 * `400 {"error":"supabaseAdmin.storage.from is not a function"}`.
 */
function storageReady(input: { enabled: boolean; backend: string; demoMode: boolean }): boolean {
  if (!input.enabled) return false;
  if (input.backend === 'supabase' && input.demoMode) return false;
  return true;
}

const STORAGE_UNCONFIGURED = {
  error: 'Storage backend not configured.',
  message:
    'Set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY (preferred) or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.',
};

export async function priestRoutes(server: FastifyInstance) {
  // All priest routes require authentication and priest role
  const priestAuth = [authenticateUser, requireRole('priest')];

  /**
   * Helper: resolve priest ID from the authenticated user.
   * Auto-upserts a Priest row from PanditProfile if missing — signup creates
   * PanditProfile, but Priest is only created via /onboarding/provider, so
   * pandits who skipped onboarding (e.g. marketplace-v2 signup) would 400
   * on every priest endpoint without this backfill.
   */
  async function getPriestId(userId: string): Promise<string> {
    const priest = await prisma.priest.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (priest) return priest.id;

    const profile = await prisma.panditProfile.findUnique({
      where: { userId },
      select: { id: true, experience: true, specialties: true, languages: true, bio: true },
    });
    if (!profile) {
      throw new Error('Priest account not found.');
    }
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const created = await prisma.priest.create({
      data: {
        userId,
        displayName: user?.fullName ?? 'Pandit',
        specializations: profile.specialties ?? [],
        languages: profile.languages ?? [],
        experienceYears: profile.experience ?? 0,
        bio: profile.bio ?? null,
        // P0 #ag-01 / pp-04 (2026-07-09): a backfilled Priest is NOT active
        // until an admin verifies it. The old default (status=active) granted
        // instant priest powers to any pandit who hit /priest/dashboard
        // without onboarding approval. Now backfill creates an inactive,
        // pending-verification row — requireRole('priest') blocks it until
        // an admin flips status to active.
        status: 'inactive',
        verificationStatus: 'pending',
      },
      select: { id: true },
    });
    return created.id;
  }

  // ─── GET /dashboard ─────────────────────────────────────────────────────────

  server.get('/dashboard', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const priestId = await getPriestId(userId);
      const dashboard = await priestService.getDashboard(priestId);

      // DI-05: the earnings card reads the PriestPayout sidecar rail, which a
      // temple-path pandit never has a row on. Same merge as GET /payouts, so
      // the two screens keep agreeing (PF-12).
      const unifiedAny = await prisma.commission.count({
        where: unifiedBaseWhere(userId),
      });
      if (!(unifiedAny > 0)) return dashboard;

      const now = new Date();
      // Identical construction to priest.service.getDashboard's firstOfMonth.
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const extra = await unifiedEarnings(userId, monthStart);

      return {
        ...dashboard,
        earnings: {
          total: toDecimal(dashboard.earnings.total).add(extra.total),
          thisMonth: toDecimal(dashboard.earnings.thisMonth).add(extra.thisMonth),
          pending: toDecimal(dashboard.earnings.pending).add(extra.pending),
        },
      };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── GET /bookings ──────────────────────────────────────────────────────────

  server.get('/bookings', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const parsed = bookingsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
      }
      const { status, view, dateFrom, dateTo, page, limit } = parsed.data;

      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.getAssignedBookings(priestId, {
        status,
        view,
        dateFrom,
        dateTo,
        page,
        limit,
      });

      return result;
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── GET /open-requests ───────────────────────────────────────────
  // Paid bookings no pandit has taken yet (the default "scheduled" tier). An
  // approved pandit picks one with PATCH /bookings/:id/accept. Not approved =>
  // `{ eligible: false, requests: [] }` so the portal can say why it is empty.

  server.get('/open-requests', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      return await priestService.getOpenRequests(priestId);
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── GET /bookings/:id ──────────────────────────────────────────────────────
  // PF-08: the detail page had no by-id read, so it downloaded the paginated
  // list and searched it client-side — anything past row 20 was unreachable,
  // and that page carries the only video-proof control.

  server.get('/bookings/:id', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      if (!z.string().uuid().safeParse(id).success) {
        return reply.code(404).send({ error: 'Booking not found.' });
      }
      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.getAssignedBookingById(priestId, id);
      if (!result.ok) {
        return result.reason === 'not_found'
          ? reply.code(404).send({ error: 'Booking not found.' })
          : reply
              .code(403)
              .send({ error: 'This booking is not assigned to you.' });
      }
      return { booking: result.booking };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── PATCH /bookings/:id/accept ─────────────────────────────────────────────

  server.patch('/bookings/:id/accept', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const booking = await priestService.acceptBooking(id, priestId);
      return { message: 'Booking accepted successfully.', booking };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── PATCH /bookings/:id/reject ─────────────────────────────────────────────
  // P0 #pp-05 (2026-07-09): priest releases an assigned booking back to the
  // queue. The accept/start/complete triplet had no escape valve — a priest
  // who couldn't fulfil left the booking stuck. Reject clears priestId +
  // drops to `confirmed` so the assignment queue re-picks it.

  server.patch('/bookings/:id/reject', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const booking = await priestService.rejectBooking(id, priestId);
      return { message: 'Booking released back to the queue.', booking };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── Dispatch engine routes (booking revamp 2026-08-04) ────────────────────
  // These power the T1/T2/T3 instant/1-hour/senior tiers. The one-tap accept
  // link in the WhatsApp/push offer hits /offers/:bookingId/accept.

  // PATCH /availability — the T1 on-duty toggle + heartbeat. Body: {isOnDuty}.
  // Sets isOnDuty and bumps lastSeenAt so the instant pool knows who's live.
  server.patch('/availability', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      const body = z.object({ isOnDuty: z.boolean() }).parse(request.body ?? {});
      const updated = await prisma.priest.update({
        where: { id: priestId },
        data: { isOnDuty: body.isOnDuty, lastSeenAt: new Date() },
        select: { id: true, isOnDuty: true, lastSeenAt: true, tier: true },
      });
      return { message: body.isOnDuty ? 'You are now on duty.' : 'You are now off duty.', priest: updated };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // POST /offers/:bookingId/accept — accept a dispatch offer (T1/T2/T3).
  server.post('/offers/:bookingId/accept', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { bookingId } = request.params as { bookingId: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const res = await dispatchService.accept(bookingId, priestId);
      return { message: 'Booking confirmed. You are assigned.', ...res };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // POST /offers/:bookingId/decline — decline a dispatch offer.
  server.post('/offers/:bookingId/decline', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { bookingId } = request.params as { bookingId: string };
      const priestId = await getPriestId(request.currentUser!.id);
      await dispatchService.decline(bookingId, priestId);
      return { message: 'Offer declined.' };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // GET /offers — list this priest's open (sent, unexpired) offers.
  server.get('/offers', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      const offers = await prisma.dispatchOffer.findMany({
        where: { priestId, state: 'sent', expiresAt: { gte: new Date() } },
        orderBy: { sentAt: 'desc' },
        include: {
          booking: {
            select: {
              id: true,
              bookingNumber: true,
              scheduledDate: true,
              scheduledTimeSlot: true,
              priceAmount: true,
              pujaType: { select: { name: true } },
              temple: { select: { name: true, city: true } },
            },
          },
        },
      });
      return { offers };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── Temple roster invitations ─────────────────────────────────────────────
  // A temple manager can only INVITE a pandit; the pandit decides. Accepting
  // creates the TemplePriest roster row, declining creates nothing.

  // GET /temple-invites — pending invitations addressed to this pandit.
  server.get('/temple-invites', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      return { invites: await listPendingForPriest(priestId) };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  for (const action of ['accept', 'decline'] as const) {
    server.post(`/temple-invites/:id/${action}`, { preHandler: priestAuth }, async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        if (!z.string().uuid().safeParse(id).success) {
          return reply.code(404).send({ error: 'Invitation not found' });
        }
        const priestId = await getPriestId(request.currentUser!.id);
        const res = await respondToInvite({ inviteId: id, priestId, accept: action === 'accept' });
        if (res.kind === 'not_found') return reply.code(404).send({ error: 'Invitation not found' });
        if (res.kind === 'already_answered') {
          return reply
            .code(409)
            .send({ error: `You already ${res.status} this invitation.`, status: res.status });
        }
        return {
          ok: true,
          status: res.status,
          message:
            res.status === 'accepted'
              ? 'You are now on this temple\'s roster.'
              : 'Invitation declined.',
        };
      } catch (err: any) {
        request.log?.error({ err }, 'priest route failed');
        reply.code(400).send({ error: safeErrorMessage(err) });
      }
    });
  }

  // POST /bookings/:id/pandit-cancel — pandit-side cancellation. Releases the
  // booking for re-dispatch and notifies the devotee (platform bears it).
  server.post('/bookings/:id/pandit-cancel', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const body = z.object({ reason: z.string().max(500).optional() }).parse(request.body ?? {});
      const res = await cancellationService.panditCancel(id, priestId, body.reason);
      return { message: 'Booking released. We are re-matching the devotee.', ...res };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── PATCH /bookings/:id/start ──────────────────────────────────────────────

  server.patch('/bookings/:id/start', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const booking = await priestService.startPuja(id, priestId);
      return { message: 'Puja started.', booking };
    } catch (err: any) {
      if (err instanceof PujaStateConflictError) return reply.code(409).send({ error: safeErrorMessage(err) });
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── PATCH /bookings/:id/complete ───────────────────────────────────────────

  server.patch('/bookings/:id/complete', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const booking = await priestService.completePuja(id, priestId);
      return { message: 'Puja completed.', booking };
    } catch (err: any) {
      if (err instanceof PujaStateConflictError) return reply.code(409).send({ error: safeErrorMessage(err), ...(err.code ? { code: err.code } : {}) });
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── POST /bookings/:id/video-proof/signed-url ──────────────────────────────
  //
  // Returns a presigned PUT URL the priest's browser uses to upload the
  // proof video directly to R2 (or Supabase Storage fallback). Auth gates
  // ensure only the assigned priest of this booking can request a URL.
  // 5-minute expiry, 200 MB cap (enforced client-side; backend enforces
  // type allowlist). Idempotent — repeated calls just return fresh URLs.

  server.post(
    '/bookings/:id/video-proof/signed-url',
    { preHandler: priestAuth },
    async (request, reply) => {
      try {
        const { id } = request.params as { id: string };
        const body = (request.body ?? {}) as { contentType?: string; ext?: string };
        const contentType = body.contentType ?? 'video/mp4';
        if (!ALLOWED_VIDEO_TYPES.has(contentType)) {
          return reply.code(400).send({
            error: `Unsupported contentType. Allowed: ${[...ALLOWED_VIDEO_TYPES].join(', ')}.`,
          });
        }
        if (!storageReady({ enabled: r2.enabled, backend: r2.backend, demoMode: isDemoMode })) {
          return reply.code(503).send(STORAGE_UNCONFIGURED);
        }

        const priestId = await getPriestId(request.currentUser!.id);
        const booking = await prisma.pujaBooking.findUnique({
          where: { id },
          select: { id: true, priestId: true, status: true },
        });
        if (!booking) return reply.code(404).send({ error: 'Booking not found.' });
        if (booking.priestId !== priestId) {
          return reply
            .code(403)
            .send({ error: 'Only the assigned priest can upload video proof for this booking.' });
        }
        if (booking.status !== 'in_progress' && booking.status !== 'completed') {
          return reply.code(409).send({
            error: `Video proof can only be uploaded once the puja has been started. Current: "${booking.status}".`,
          });
        }

        const ext = (body.ext ?? contentType.split('/')[1] ?? 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 6);
        const rand = randomBytes(6).toString('hex');
        const key = `booking-proofs/${id}/${Date.now()}-${rand}.${ext}`;

        // A storage misconfiguration must surface as an actionable 503, not as
        // a 400 carrying an internal TypeError. The generic catch below maps
        // everything to 400, which is how the pandit ended up reading
        // "supabaseAdmin.storage.from is not a function".
        let signed: Awaited<ReturnType<typeof presignR2Upload>>;
        try {
          signed = await presignR2Upload({ key, contentType, expiresInSec: 300 });
        } catch (storageErr) {
          request.log.error({ err: storageErr }, 'video-proof presign failed');
          return reply.code(503).send(STORAGE_UNCONFIGURED);
        }
        if (!signed) {
          return reply.code(500).send({ error: 'Failed to generate upload URL' });
        }

        return reply.send({
          uploadUrl: signed.uploadUrl,
          publicUrl: signed.publicUrl,
          backend: signed.backend,
          key,
          expiresIn: 300,
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          maxSizeMb: MAX_VIDEO_MB,
        });
      } catch (err: any) {
        request.log?.error({ err }, 'priest route failed');
        reply.code(400).send({ error: safeErrorMessage(err) });
      }
    }
  );

  // ─── POST /bookings/:id/video ───────────────────────────────────────────────

  server.post('/bookings/:id/video', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = videoProofBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          error:
            'videoUrl must be a full URL to the recording, e.g. https://drive.google.com/… .',
          details: parsed.error.flatten(),
        });
      }
      const videoUrl = parsed.data.videoUrl;

      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.uploadVideoProof(id, priestId, videoUrl);
      return { message: 'Video proof uploaded successfully.', booking: result };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── GET /payouts ───────────────────────────────────────────────────────────

  server.get('/payouts', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const parsed = payoutsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
      }
      const { status, page, limit } = parsed.data;

      const userId = request.currentUser!.id;
      const priestId = await getPriestId(userId);

      // DI-05: does this pandit have ANY earning on the unified rail? Gated on
      // the UNFILTERED set — a `?status=completed` filter that matches no
      // commission must not send us down the legacy-only path, because the
      // summary cards below it cover the whole ledger regardless of the filter.
      const baseWhere = unifiedBaseWhere(userId);
      const unifiedAny = await prisma.commission.count({ where: baseWhere });

      // Legacy-only pandit: the single-rail path, byte-for-byte the behaviour
      // this endpoint has always had, including unbounded deep paging.
      // Written as `> 0` rather than `=== 0` so that "no rows" and "no answer"
      // both fall back to the rail that has always worked — the merge is
      // additive, and must never be the reason a legacy ledger stops rendering.
      // A ledger read that THROWS still propagates to the 400 below, which is
      // what the page's PF-15 error banner exists for: an unread ledger is an
      // error, never a balance.
      if (!(unifiedAny > 0)) {
        return await priestService.getPayoutHistory(priestId, { status, page, limit });
      }

      // Defaults mirror priestService.getPayoutHistory so the two paths page
      // identically.
      const currentPage = page ?? 1;
      const pageSize = limit ?? 20;
      const skip = (currentPage - 1) * pageSize;
      const window = Math.min(skip + pageSize, RAIL_MERGE_WINDOW);

      const railFilter = unifiedStatusFilter(status);
      const filteredWhere: Prisma.CommissionWhereInput | null = railFilter
        ? { ...baseWhere, ...railFilter }
        : null;

      // Same helper the dashboard card uses, so the two screens cannot drift
      // apart on the same account's money again (PF-12). `thisMonth` is unused
      // here; one extra indexed aggregate is cheaper than a second definition.
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

      const [legacy, unifiedRows, unifiedTotal, unifiedSummary, lastPaid] = await Promise.all([
        // Top `window` of the sidecar rail. `total` and `summary` are
        // aggregates, so they are unaffected by asking for page 1.
        priestService.getPayoutHistory(priestId, { status, page: 1, limit: window }),
        filteredWhere
          ? prisma.commission.findMany({
              where: filteredWhere,
              select: {
                id: true,
                bookingId: true,
                amount: true,
                status: true,
                paidAt: true,
                createdAt: true,
                payoutRequest: {
                  select: { status: true, method: true, reference: true, processedAt: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: window,
            })
          : Promise.resolve([]),
        filteredWhere ? prisma.commission.count({ where: filteredWhere }) : Promise.resolve(0),
        unifiedEarnings(userId, monthStart),
        prisma.commission.findFirst({
          where: { ...baseWhere, status: 'PAID' },
          orderBy: { paidAt: 'desc' },
          select: { amount: true, paidAt: true },
        }),
      ]);

      // Hydrate the booking each commission belongs to. Commission carries a
      // bookingId scalar, not a relation, so this is a separate read — bounded
      // by an IN list drawn from the already-bounded page above.
      const bookingIds = Array.from(
        new Set(unifiedRows.map((c) => c.bookingId).filter((id): id is string => !!id)),
      );
      const bookings = bookingIds.length
        ? await prisma.pujaBooking.findMany({
            where: { id: { in: bookingIds } },
            select: {
              id: true,
              bookingNumber: true,
              pujaType: { select: { name: true } },
              temple: { select: { name: true } },
            },
            take: bookingIds.length,
          })
        : [];
      const bookingById = new Map(bookings.map((b) => [b.id, b] as const));

      const unified: UnifiedRail[] = unifiedRows.map((c) => {
        const booking = c.bookingId ? bookingById.get(c.bookingId) : undefined;
        return {
          id: c.id,
          rail: 'commission',
          amount: c.amount,
          status: unifiedRowStatus(c),
          // No request yet means no method has been chosen. Saying so beats
          // printing a bank transfer that nobody has asked for.
          payoutMethod: c.payoutRequest?.method ?? 'not_requested',
          payoutReference: c.payoutRequest?.reference ?? null,
          processedAt: c.paidAt ?? c.payoutRequest?.processedAt ?? null,
          createdAt: c.createdAt,
          // A booking we cannot read is a join problem, never a reason to drop
          // an earning off the only screen that shows it — the client renders
          // booking.* unconditionally, so the shape has to be complete.
          booking: {
            id: c.bookingId ?? c.id,
            bookingNumber: booking?.bookingNumber ?? '—',
            pujaType: { name: booking?.pujaType?.name ?? 'Puja' },
            temple: { name: booking?.temple?.name ?? '—' },
          },
        };
      });

      // ── DI-05: DEDUPE THE TWO RAILS BEFORE MERGING, AND BEFORE SUMMING ──
      //
      // The rails were only ONE-WAY exclusive: createPriestPayout refuses to
      // write a sidecar row when a live Commission exists, but the Commission
      // mint never checked for a PriestPayout. `video_uploaded -> delivered` is
      // a legal transition and both are in EARNING_ATTACH_STATUSES, so a booking
      // already carrying a legacy row minted a Commission on its next move and
      // landed on BOTH rails. This concatenation then rendered that booking
      // twice and `summary` added the same money twice — the pandit's own screen
      // telling him he is owed double. (The write side is symmetric now, in
      // services/provider-earning-mint.ts guard 2; this covers rows that already
      // exist.)
      //
      // Precedence: the COMMISSION row wins. That is the documented direction —
      // payment.service defers to the ledger, so the read must too, or the two
      // sides disagree about which rail owns the booking.
      //
      // Cost: ZERO extra queries for the common case. A temple-path pandit has
      // an empty legacy rail (`legacy.total === 0`), so the whole correction is
      // skipped. It only runs for the genuinely-overlapping ledger.
      //
      // Scope: bounded at RAIL_MERGE_WINDOW on the commission side, the same cap
      // the merge itself already accepts and already discloses via
      // `mergeTruncated`. Exact for any pandit whose ledger fits that window.
      let dupCount = 0;
      let dupEarned = new Prisma.Decimal(0);
      let dupPending = new Prisma.Decimal(0);
      let dupBookingIds: string[] = [];

      if (legacy.total > 0) {
        const commissionBookings = await prisma.commission.findMany({
          where: { ...baseWhere },
          select: { bookingId: true },
          take: RAIL_MERGE_WINDOW,
        });
        dupBookingIds = Array.from(
          new Set(commissionBookings.map((c) => c.bookingId).filter((id): id is string => !!id)),
        );

        if (dupBookingIds.length > 0) {
          // ONE read of the overlapping legacy rows, bounded by the same window.
          // Counting and summing in JS rather than firing three aggregates keeps
          // the correction and the row-level dedupe reading the identical set —
          // a count that disagrees with the list is how "four surfaces, four
          // numbers" started.
          const overlap = await prisma.priestPayout.findMany({
            where: { priestId, bookingId: { in: dupBookingIds } },
            select: { bookingId: true, amount: true, status: true },
            take: RAIL_MERGE_WINDOW,
          });

          // The legacy page/total carries the caller's ?status filter, so the
          // row subtraction has to carry it too or it corrects a number that
          // was never counted.
          dupCount = overlap.filter((p) => !status || p.status === status).length;
          for (const row of overlap) {
            if (row.status === 'completed') dupEarned = dupEarned.add(toDecimal(row.amount));
            else if (row.status === 'pending' || row.status === 'processing') {
              dupPending = dupPending.add(toDecimal(row.amount));
            }
          }
        }
      }

      const dupSet = new Set(dupBookingIds);

      // Both sides are the top `window` of their own rail sorted newest-first,
      // so the first `window` entries of the sorted concatenation are the true
      // top `window` of the union.
      const merged = [
        ...legacy.payouts
          .filter((p) => !(p.booking?.id && dupSet.has(p.booking.id)))
          .map((p) => ({ ...p, rail: 'priest_payout' as const })),
        ...unified,
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // `total` counts rows, so it drops the duplicated LEGACY rows only — the
      // commission rows they shadow are still in `unifiedTotal`. Floored at 0:
      // a count can never be negative, whatever the two rails disagree about.
      const total = Math.max(0, legacy.total + unifiedTotal - dupCount);

      // Money stays Decimal to the response boundary — never float-summed.
      // The duplicated LEGACY amounts come off, for the same reason.
      const totalEarned = toDecimal(legacy.summary.totalEarned)
        .add(unifiedSummary.total)
        .sub(dupEarned);
      const pending = toDecimal(legacy.summary.pending)
        .add(unifiedSummary.pending)
        .sub(dupPending);

      // Whichever rail settled most recently owns the "Last Payout" card.
      const legacyLast = legacy.summary.lastPayout;
      const unifiedLastAt = lastPaid?.paidAt ?? null;
      const legacyLastAt = legacyLast?.date ?? null;
      const lastPayout =
        unifiedLastAt && (!legacyLastAt || unifiedLastAt > legacyLastAt)
          ? { amount: lastPaid!.amount, date: unifiedLastAt }
          : legacyLast;

      return {
        payouts: merged.slice(skip, skip + pageSize),
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
        summary: { totalEarned, pending, lastPayout },
        // Say it out loud rather than ending the list without explanation.
        mergeTruncated: skip + pageSize > RAIL_MERGE_WINDOW,
      };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── GET /profile ───────────────────────────────────────────────────────────

  server.get('/profile', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      const profile = await priestService.getProfile(priestId);
      return profile;
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── PATCH /profile ─────────────────────────────────────────────────────────

  server.patch('/profile', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const parsed = priestProfileUpdateSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({
          error: parsed.error.issues[0]?.message ?? 'Invalid profile',
          details: parsed.error.flatten(),
        });
      }
      const body = parsed.data;

      const priestId = await getPriestId(request.currentUser!.id);
      const updated = await priestService.updateProfile(priestId, body);
      return { message: 'Profile updated successfully.', profile: updated };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── GET /reviews ───────────────────────────────────────────────────────────
  // Reviews authored by devotees about this priest, from BOTH writers.
  //
  // PF-11 (prod sweep 2026-08-12): there are two of them and this endpoint read
  // only one. `POST /bookings/:id/review` (booking.service.submitReview) writes
  // `PujaBooking.rating`/`reviewText` and bumps the priests aggregate — it never
  // inserts a Review row. `Review` rows come from the separate provider-review
  // flow (provider.service). So the dashboard Rating card climbed to 43 while
  // /priest/reviews stayed at "0.0 average, no reviews yet", and a pandit could
  // never read a single word of devotee feedback. Reading the booking column
  // also backfills every historical rating for free.
  //
  // Review.providerId stores the provider's User UUID (not Priest.id) — the
  // ratings.ts convention.

  const REVIEW_PAGE = 100;

  server.get('/reviews', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const priestId = await getPriestId(userId);

      const [rows, ratedBookings] = await Promise.all([
        prisma.review.findMany({
          where: { providerId: userId, providerType: 'PANDIT' },
          orderBy: { createdAt: 'desc' },
          take: REVIEW_PAGE,
        }),
        prisma.pujaBooking.findMany({
          where: { priestId, rating: { not: null } },
          orderBy: { updatedAt: 'desc' },
          take: REVIEW_PAGE,
          select: {
            id: true,
            bookingNumber: true,
            userId: true,
            rating: true,
            reviewText: true,
            createdAt: true,
            updatedAt: true,
            pujaType: { select: { name: true } },
          },
        }),
      ]);

      const iso = (d: Date | string | null | undefined) =>
        d instanceof Date ? d.toISOString() : (d ?? new Date(0).toISOString());

      const fromReviewTable = rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        providerId: r.providerId,
        providerType: r.providerType,
        rating: r.rating,
        comment: r.comment,
        createdAt: iso(r.createdAt),
        source: 'review' as const,
        bookingNumber: null as string | null,
        pujaName: null as string | null,
      }));

      const fromBookings = (ratedBookings ?? []).map((b) => ({
        // Prefixed so it can never collide with a Review row id.
        id: `booking:${b.id}`,
        userId: b.userId,
        providerId: userId,
        providerType: 'PANDIT' as const,
        rating: b.rating ?? 0,
        comment: b.reviewText,
        createdAt: iso(b.updatedAt ?? b.createdAt),
        source: 'booking' as const,
        bookingNumber: b.bookingNumber,
        pujaName: b.pujaType?.name ?? null,
      }));

      const reviews = [...fromReviewTable, ...fromBookings]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, REVIEW_PAGE);

      return reply.send({ reviews, total: reviews.length });
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // ─── Pandit-owned puja offerings ────────────────────────────────────────────
  // Distinct from the temple-anchored PujaType catalog: each row here is
  // authored by a single priest and surfaced on their public profile.
  // basePrice is Decimal(10,2); serialise as string to preserve precision
  // across JSON (matches the admin commissions pattern).

  const offeringCreateSchema = priestOfferingCreateSchema;
  const offeringUpdateSchema = priestOfferingUpdateSchema;

  function serializeOffering(o: {
    id: string;
    priestId: string;
    name: string;
    description: string | null;
    deity: string;
    basePrice: { toString(): string };
    durationMinutes: number;
    isActive: boolean;
    maxBookingsPerSlot?: number;
    availableSlots?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: o.id,
      priestId: o.priestId,
      name: o.name,
      description: o.description,
      deity: o.deity,
      basePrice: o.basePrice.toString(),
      durationMinutes: o.durationMinutes,
      isActive: o.isActive,
      maxBookingsPerSlot: o.maxBookingsPerSlot ?? 1,
      availableSlots: o.availableSlots ?? null,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }

  // GET /pujas — list the authenticated priest's offerings
  server.get('/pujas', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      const offerings = await prisma.priestPujaOffering.findMany({
        where: { priestId },
        orderBy: { createdAt: 'desc' },
      });
      return { offerings: offerings.map(serializeOffering) };
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // POST /pujas — create
  server.post('/pujas', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const parsed = offeringCreateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const priestId = await getPriestId(request.currentUser!.id);
      const offering = await prisma.priestPujaOffering.create({
        data: {
          priestId,
          name: parsed.data.name,
          description: parsed.data.description ?? null,
          deity: parsed.data.deity,
          basePrice: parsed.data.basePrice,
          durationMinutes: parsed.data.durationMinutes,
          isActive: parsed.data.isActive ?? true,
          maxBookingsPerSlot: parsed.data.maxBookingsPerSlot ?? 1,
          availableSlots: (parsed.data.availableSlots ?? null) as any,
        },
      });
      return reply.code(201).send({ offering: serializeOffering(offering) });
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // PATCH /pujas/:id — update; 403 if not owner
  server.patch('/pujas/:id', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = offeringUpdateSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const priestId = await getPriestId(request.currentUser!.id);
      const existing = await prisma.priestPujaOffering.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Offering not found' });
      if (existing.priestId !== priestId) {
        return reply.code(403).send({ error: 'You do not own this offering.' });
      }
      const data: Record<string, unknown> = {};
      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.description !== undefined) data.description = parsed.data.description;
      if (parsed.data.deity !== undefined) data.deity = parsed.data.deity;
      if (parsed.data.basePrice !== undefined) data.basePrice = parsed.data.basePrice;
      if (parsed.data.durationMinutes !== undefined) data.durationMinutes = parsed.data.durationMinutes;
      if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
      if (parsed.data.maxBookingsPerSlot !== undefined)
        data.maxBookingsPerSlot = parsed.data.maxBookingsPerSlot;
      if (parsed.data.availableSlots !== undefined)
        data.availableSlots = parsed.data.availableSlots;
      const offering = await prisma.priestPujaOffering.update({ where: { id }, data });
      return reply.send({ offering: serializeOffering(offering) });
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // DELETE /pujas/:id — owner only
  server.delete('/pujas/:id', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const existing = await prisma.priestPujaOffering.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Offering not found' });
      if (existing.priestId !== priestId) {
        return reply.code(403).send({ error: 'You do not own this offering.' });
      }
      await prisma.priestPujaOffering.delete({ where: { id } });
      return reply.send({ ok: true });
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });

  // PATCH /pujas/:id/toggle-active — flip isActive
  server.patch('/pujas/:id/toggle-active', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const priestId = await getPriestId(request.currentUser!.id);
      const existing = await prisma.priestPujaOffering.findUnique({ where: { id } });
      if (!existing) return reply.code(404).send({ error: 'Offering not found' });
      if (existing.priestId !== priestId) {
        return reply.code(403).send({ error: 'You do not own this offering.' });
      }
      const offering = await prisma.priestPujaOffering.update({
        where: { id },
        data: { isActive: !existing.isActive },
      });
      return reply.send({ offering: serializeOffering(offering) });
    } catch (err: any) {
      request.log?.error({ err }, 'priest route failed');
      reply.code(400).send({ error: safeErrorMessage(err) });
    }
  });
}
