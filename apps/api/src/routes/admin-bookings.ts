import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus, Prisma } from '@prisma/client';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { processRefund } from '../services/refund.service.js';
import {
  listPayoutRequests,
  processPayout,
  resolveProviderRole,
} from '../services/payout.service.js';

// Admin bookings + payouts + refunds ops dashboards.
//
// Mounted at /api/v1/admin/bookings (see server.ts). All routes gated by
// authenticateUser + requireRole('admin').
//
// Schema gaps flagged in this file (do NOT mutate schema here — let user
// refine separately):
//   • Booking has no `payoutPaidAt`. We use the PriestPayout sidecar table
//     for PRIEST bookings only. For ASTROLOGER / WELLNESS_INSTRUCTOR /
//     GAUSHALA_MANAGER there is no payout sidecar yet, so we sum ALL paid
//     bookings ungrouped (no "already paid out" filter possible).
//   • BookingStatus has no REFUND_REQUESTED / REFUND_APPROVED /
//     REFUND_REJECTED. We treat `cancelled` (with refund flag in payment)
//     as "refund requested" and use `refunded` / `cancelled` for terminal
//     states. The list-refunds query returns [] + log when the enum is
//     absent.

// AO-18 (prod sweep 2026-08-12): `status` was `z.string().optional()`.
//
// Any string passed validation and went straight into `where.status`. Prisma
// rejects a value the enum has never held, the list handler's own catch
// swallows the throw, and the caller gets 200 with `{"bookings":[],"total":0}`
// — which an operator reads as "no bookings are in that state". Measured live:
// `?status=NOT_A_STATUS` -> 200 empty, while the sibling payout-requests and
// commissions endpoints both answer 400 and name their legal values.
//
// The enum is generated from the Prisma column, so the accepted spellings are
// exactly the ones the database can store and no list can drift out of date.
//
// SCOPE, deliberately not widened: the second half of AO-18 observes that this
// surface wants lowercase while /admin/commissions wants uppercase. Making
// those agree changes what a LIVE, shipped API accepts, so it is an owner
// decision and is NOT done here — only the silent-empty-page bug is closed.
const listQuerySchema = z.object({
  status: z.nativeEnum(BookingStatus).optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const rejectBodySchema = z.object({
  reason: z.string().min(1).max(500),
});

// RV-22 (2026-08-10): the pending-payouts summary scanned the whole booking
// table, the whole completed-payout table, and re-ran an identical unfiltered
// commission scan once per non-priest role. Every scan is now bounded by this
// window (newest first) and the commission fetch happens exactly once.
// `limit` lets an operator widen it for a big settlement run.
const PAYOUT_SCAN_DEFAULT = 500;
const PAYOUT_SCAN_MAX = 2000;
const PAYOUT_SCAN_MIN = 50;

const payoutScanQuerySchema = z.object({
  limit: z.string().optional(),
});

function resolveScanLimit(raw: string | undefined): number {
  const n = Number(raw ?? '');
  if (!Number.isFinite(n) || n <= 0) return PAYOUT_SCAN_DEFAULT;
  return Math.min(PAYOUT_SCAN_MAX, Math.max(PAYOUT_SCAN_MIN, Math.floor(n)));
}

// DI-03 (2026-08-12): `payoutMultiplier` is GONE, not corrected.
//
// It recomputed a pandit's earning as `price_amount * 0.75`, which was wrong
// twice over. 0.75 is a legacy 25% take that matches neither the uniform
// 20%/80% doctrine nor the pandit's own negotiated `commissionRate`; and
// `price_amount` carries the Rs 51 platform fee plus the Rs 150 prasad-delivery
// pass-through that routes/bookings.ts documents as platform revenue, on which
// no pandit has a claim. Measured over priest 6a56eba6's 42 payable bookings:
// authoritative sum(priest_payout) Rs 32,340 versus this formula's Rs 34,803 —
// Rs 2,463 (+7.6%) overstated. Settlement here is a MANUAL bank/UPI transfer,
// so that inflated figure is what an admin actually paid.
//
// `PujaBooking.priestPayout` already holds the resolved split, written at
// creation time honouring that pandit's rate. Sum the column. A second
// recomputation anywhere in the codebase is guaranteed to drift from
// booking.service again — which is exactly how this one got here.

export const __testing = {
  resolveScanLimit,
  PAYOUT_SCAN_DEFAULT,
  PAYOUT_SCAN_MAX,
  PAYOUT_SCAN_MIN,
};

export async function adminBookingsRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /admin/bookings ──────────────────────────────────────────────────
  server.get('/', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = listQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const page = Math.max(1, Number(parsed.data.page ?? '1') || 1);
    const limit = Math.min(100, Math.max(1, Number(parsed.data.limit ?? '50') || 50));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (parsed.data.status) where.status = parsed.data.status;

    try {
      const [bookings, total] = await Promise.all([
        prisma.pujaBooking.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
          include: {
            pujaType: { select: { name: true, slug: true } },
            temple: { select: { name: true, slug: true, city: true } },
            user: { select: { fullName: true, phone: true } },
          },
        }),
        prisma.pujaBooking.count({ where }),
      ]);
      return { bookings, page, limit, total };
    } catch (err) {
      request.log.warn({ err }, 'admin bookings list failed');
      return { bookings: [], page, limit, total: 0 };
    }
  });

  // ─── GET /admin/bookings/payouts/pending ──────────────────────────────────
  server.get('/payouts/pending', { preHandler: adminPreHandlers }, async (request) => {
    // No hardcoded role list any more: PRIEST is the legacy booking-backed rail
    // below, and every other role is whatever the Commission ledger says a
    // provider is owed, labelled by payout precedence. The old list omitted
    // STORE_OWNER and TEMPLE_MANAGER entirely.
    const groups: Array<{
      providerId: string;
      providerName: string;
      role: string;
      bookingsCount: number;
      totalPayout: number;
      // DI-04: per-rail breakdown so a merged row stays reconcilable against
      // the two underlying ledgers. Additive — existing consumers ignore it.
      rails: Array<{ rail: 'priest_payout' | 'commission'; bookingsCount: number; totalPayout: number }>;
    }> = [];
    const parsedQuery = payoutScanQuerySchema.safeParse(request.query ?? {});
    const scanLimit = resolveScanLimit(parsedQuery.success ? parsedQuery.data.limit : undefined);
    // True when a scan hit its window and older rows were not considered — the
    // summary is then a partial view and the admin must be told, not left to
    // read an under-count as "nothing left to pay".
    let truncated = false;

    try {
      // Paid bookings — status is 'completed', 'video_uploaded', or 'delivered'.
      // Without a payoutPaidAt column we sum every paid booking grouped by
      // priestId. The user can refine the "not yet paid out" filter later.
      const paidStatuses = ['completed', 'video_uploaded', 'delivered'] as const;

      // PRIEST: use priestId on Booking, exclude bookings already in PriestPayout.
      const priestBookings = await prisma.pujaBooking.findMany({
        where: { status: { in: paidStatuses as unknown as never }, priestId: { not: null } },
        // DI-03: priestPayout is the authoritative, fee-exclusive, per-pandit
        // split written at booking creation. It is what the pandit's own portal
        // shows, and it is what must be settled.
        select: { id: true, priestId: true, priestPayout: true },
        orderBy: { createdAt: 'desc' },
        take: scanLimit,
      });
      if (priestBookings.length >= scanLimit) truncated = true;
      let alreadyPaidIds = new Set<string>();
      try {
        // Bounded by construction: only the bookings in this window can be
        // marked as already paid, so there is no reason to read the whole
        // PriestPayout table — and NO `take` belongs here. A truncated
        // already-paid set would under-detect settled bookings and re-surface
        // them as pending, which is the one failure mode that can make an
        // admin pay a pandit twice.
        const paid = await prisma.priestPayout.findMany({
          where: { status: 'completed', bookingId: { in: priestBookings.map((b) => b.id) } },
          select: { bookingId: true },
        });
        alreadyPaidIds = new Set(paid.map((p) => p.bookingId));
      } catch (err) {
        request.log.warn({ err }, 'priest payout lookup failed');
      }
      // batch9-review (2026-08-11): a booking the Commission ledger owns is not
      // the legacy rail's to pay. payment.service.createPriestPayout now REFUSES
      // when a Commission already exists for the booking (the mutual-exclusion
      // guard that stops a double transfer), so a rail-A-settled booking never
      // gets a PriestPayout row and could never enter `alreadyPaidIds` above —
      // it was reported as an outstanding priest payout FOREVER. On a Rs 5,000
      // booking whose Rs 4,000 commission was already paid through
      // /payout-requests, this endpoint kept showing Rs 3,750 owed to the same
      // pandit, and an admin working the list paid Rs 7,750 on Rs 5,000 of
      // revenue. The write path was guarded; this read path was not.
      //
      // Deliberately NOT inside the try above: if we cannot tell which bookings
      // the ledger owns, the honest answer is the outer catch's `ok: false`, not
      // a confident over-report of what is owed.
      if (priestBookings.length > 0) {
        const ledgerOwned = await prisma.commission.findMany({
          where: { bookingId: { in: priestBookings.map((b) => b.id) } },
          select: { bookingId: true },
        });
        for (const c of ledgerOwned) {
          if (c.bookingId) alreadyPaidIds.add(c.bookingId);
        }
      }
      // DI-04 (2026-08-12): ONE ROW PER HUMAN.
      //
      // The priest rail was keyed on `Priest.id` and the ledger rail on
      // `User.id`, so the same pandit appeared twice — {6a56eba6, 'Demo
      // Pandit', PRIEST, Rs 10,763.25} AND {b61f02c9, 'Demo Pandit', PANDIT,
      // Rs 770} — with nothing on the screen saying they are one person or
      // that the rails are mutually exclusive. Settlement is a manual
      // transfer; paying both rows is the natural mistake, and it pays the
      // same provider twice. Everything below aggregates into ONE map keyed on
      // the canonical User.id, carrying a per-rail breakdown so the total
      // stays reconcilable.
      const byUser = new Map<
        string,
        {
          name: string | null;
          count: number;
          total: Prisma.Decimal;
          rails: Map<'priest_payout' | 'commission', { count: number; total: Prisma.Decimal }>;
        }
      >();
      const addToUser = (
        userId: string,
        rail: 'priest_payout' | 'commission',
        amount: Prisma.Decimal,
        name?: string | null,
      ) => {
        const cur = byUser.get(userId) ?? {
          name: null,
          count: 0,
          total: new Prisma.Decimal(0),
          rails: new Map<'priest_payout' | 'commission', { count: number; total: Prisma.Decimal }>(),
        };
        if (name && !cur.name) cur.name = name;
        cur.count += 1;
        cur.total = cur.total.add(amount);
        const r = cur.rails.get(rail) ?? { count: 0, total: new Prisma.Decimal(0) };
        r.count += 1;
        r.total = r.total.add(amount);
        cur.rails.set(rail, r);
        byUser.set(userId, cur);
      };

      const byPriest = new Map<string, { count: number; total: Prisma.Decimal }>();
      for (const b of priestBookings) {
        if (alreadyPaidIds.has(b.id) || !b.priestId) continue;
        const cur = byPriest.get(b.priestId) ?? { count: 0, total: new Prisma.Decimal(0) };
        cur.count += 1;
        // DI-03: the persisted split, not a recomputation. `priestPayout` is
        // fee-exclusive and rate-correct per pandit; `priceAmount * 0.75` was
        // neither.
        cur.total = cur.total.add(new Prisma.Decimal((b.priestPayout ?? 0).toString()));
        byPriest.set(b.priestId, cur);
      }
      // Priest rows whose User link is missing: the money is still owed, so it
      // is reported under the Priest id rather than silently dropped.
      const orphanPriestRail: Array<{ priestId: string; name: string; count: number; total: Prisma.Decimal }> = [];
      if (byPriest.size > 0) {
        const priests = await prisma.priest.findMany({
          where: { id: { in: Array.from(byPriest.keys()) } },
          select: { id: true, userId: true, user: { select: { fullName: true } } },
        });
        for (const p of priests) {
          const agg = byPriest.get(p.id);
          if (!agg) continue;
          const name = p.user?.fullName ?? 'Unknown priest';
          if (!p.userId) {
            orphanPriestRail.push({ priestId: p.id, name, count: agg.count, total: agg.total });
            continue;
          }
          const entry = byUser.get(p.userId) ?? {
            name: null,
            count: 0,
            total: new Prisma.Decimal(0),
            rails: new Map<'priest_payout' | 'commission', { count: number; total: Prisma.Decimal }>(),
          };
          entry.name = entry.name ?? name;
          entry.count += agg.count;
          entry.total = entry.total.add(agg.total);
          entry.rails.set('priest_payout', { count: agg.count, total: agg.total });
          byUser.set(p.userId, entry);
        }
      }

      // Every non-PRIEST role settles off the Commission ledger — there is no
      // payout sidecar table for them, and bookings only carry priestId, so the
      // ledger IS the record of what they are owed.
      // RV-22: the identical PENDING-commission scan used to run once PER ROLE
      // (three serial full-table reads of the same rows). Fetch it once.
      //
      // batch9-review (2026-08-11): `payoutRequestId: null` was missing, so a
      // commission already claimed by an OPEN PayoutRequest was reported as owed
      // here at the same time as it sat in the admin payout queue — commissions
      // stay PENDING while linked (processPayout only flips them to PAID on
      // completion). An astrologer's Rs 9,000 showed as owed in this summary AND
      // as a pending request; an admin who settled from the summary by UPI and
      // then completed the request transferred Rs 18,000 on Rs 11,250 of
      // revenue. Same double-transfer class the processPayout completion guard
      // prevents, reappearing at the read layer where no guard exists. This
      // summary now reports only balance that no request has claimed; the
      // in-flight figure belongs to the payout queue (and getPayoutBalance
      // already reports it as pendingInr).
      let pendingEarnings: Array<{ providerId: string; amount: Prisma.Decimal }> = [];
      try {
        pendingEarnings = await prisma.commission.findMany({
          where: { status: 'PENDING', payoutRequestId: null },
          select: { providerId: true, amount: true },
          orderBy: { createdAt: 'desc' },
          take: scanLimit,
        });
        if (pendingEarnings.length >= scanLimit) truncated = true;
      } catch (err) {
        request.log.warn({ err }, 'pending commission fetch failed (model missing?)');
      }

      // batch9-review (2026-08-11): this used to loop the role list and push one
      // group per ROLE the provider holds, each carrying the SAME full total —
      // the loop filtered which providers appeared, never which commissions
      // belonged to that role. A provider holding ASTROLOGER +
      // WELLNESS_INSTRUCTOR with Rs 9,000 pending appeared twice at Rs 9,000, so
      // the dashboard's "Total owed" read Rs 18,000 against a real Rs 9,000 and
      // an admin settling row-by-row paid twice. Cross-role providers are
      // exactly the population the unified payout rail (#233) exists to serve.
      //
      // One group per provider now, labelled with the SAME precedence the payout
      // engine stamps onto a PayoutRequest (payout.service
      // resolveProviderRoleForUser), so this summary and the payout queue never
      // disagree about a provider's role. It also stops silently dropping
      // STORE_OWNER and TEMPLE_MANAGER, which the hardcoded role list above
      // never queried — their pending commissions appeared nowhere at all.
      if (pendingEarnings.length > 0) {
        // `Commission.amount` is ALREADY the provider's net earning
        // (lib/commission-math.ts) and `providerId` is ALREADY a User.id, so it
        // merges straight into the canonical map beside the priest rail.
        // Applying a payout multiplier here discounted it a second time
        // (0.80 x 0.70 = 56% of gross reported as owed) — found by adversarial
        // review 2026-08-11.
        for (const e of pendingEarnings) {
          addToUser(e.providerId, 'commission', new Prisma.Decimal(e.amount));
        }
      }

      // ── Resolve every payee once, across both rails ────────────────────────
      if (byUser.size > 0) {
        const providerIds = Array.from(byUser.keys());
        // Both lookups are bounded by an IN list built from the already-bounded
        // scan windows, so no `take` belongs here — a truncated join would drop
        // providers who ARE owed money out of the only screen that shows it.
        let assignments: Array<{ userId: string; role: string; isPrimary: boolean }> = [];
        let users: Array<{ id: string; fullName: string | null }> = [];
        try {
          [assignments, users] = await Promise.all([
            prisma.userRoleAssignment.findMany({
              where: { userId: { in: providerIds } },
              select: { userId: true, role: true, isPrimary: true },
            }),
            prisma.user.findMany({
              where: { id: { in: providerIds } },
              select: { id: true, fullName: true },
            }),
          ]);
        } catch (err) {
          request.log.warn({ err }, 'payee identity lookup failed');
        }
        const rolesByUser = new Map<string, Array<{ role: string; isPrimary: boolean }>>();
        for (const a of assignments) {
          const list = rolesByUser.get(a.userId) ?? [];
          list.push({ role: a.role as string, isPrimary: a.isPrimary });
          rolesByUser.set(a.userId, list);
        }
        const userById = new Map(users.map((u) => [u.id, u.fullName] as const));
        for (const providerId of providerIds) {
          const agg = byUser.get(providerId);
          if (!agg) continue;
          const held = rolesByUser.get(providerId) ?? [];
          // Primary assignment wins, then declared precedence — identical to
          // resolveProviderRoleForUser, which is what stamps PayoutRequest.role.
          const resolved =
            resolveProviderRole(held.filter((h) => h.isPrimary).map((h) => h.role)) ??
            resolveProviderRole(held.map((h) => h.role));
          const onPriestRail = agg.rails.has('priest_payout');
          if (!resolved && !onPriestRail) {
            // A commission with no payout-capable role assignment is a data
            // fault, but the money is still owed. Reporting it as UNKNOWN gets
            // it investigated; dropping it silently is how a balance goes
            // unsettled forever.
            request.log.warn(
              { providerId },
              'pending commissions for a provider with no payout role assignment',
            );
          }
          groups.push({
            providerId,
            providerName: agg.name ?? userById.get(providerId) ?? 'Unknown',
            role: resolved ?? (onPriestRail ? 'PRIEST' : 'UNKNOWN'),
            bookingsCount: agg.count,
            totalPayout: agg.total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber(),
            rails: Array.from(agg.rails.entries()).map(([rail, r]) => ({
              rail,
              bookingsCount: r.count,
              totalPayout: r.total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber(),
            })),
          });
        }
      }

      // A Priest row with no linked User cannot be merged onto a human, but the
      // money is real — surface it under the Priest id and say so.
      for (const o of orphanPriestRail) {
        const total = o.total.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber();
        groups.push({
          providerId: o.priestId,
          providerName: `${o.name} (no linked user account)`,
          role: 'PRIEST',
          bookingsCount: o.count,
          totalPayout: total,
          rails: [{ rail: 'priest_payout', bookingsCount: o.count, totalPayout: total }],
        });
      }

      groups.sort((a, b) => b.totalPayout - a.totalPayout);
      return {
        ok: true,
        groups,
        scanLimit,
        truncated,
        schemaNote:
          'One row per payee, keyed on User.id. The PriestPayout sidecar rail and the Commission ledger are mutually exclusive per booking and are MERGED here — see `rails` for the split. Priest amounts are the persisted PujaBooking.priestPayout, never a recomputation. Balance already claimed by an open payout request is excluded — settle that from the payout queue.',
      };
    } catch (err) {
      // RV-22: the failure branch used to be indistinguishable from a genuinely
      // empty payout queue, so a broken query read as "nothing to settle". Keep
      // the 200 (the dashboard renders around it) but say so explicitly.
      request.log.warn({ err }, 'admin payouts pending failed');
      return {
        ok: false,
        groups: [],
        scanLimit,
        truncated: false,
        schemaNote: 'aggregation failed; see server logs',
      };
    }
  });

  // ─── GET /admin/bookings/payout-requests — list payout requests (admin) ──────
  //
  // batch9-review (2026-08-11): the status filter went straight from the query
  // string into Prisma with no schema and no try/catch, so `?status=Pending`
  // (wrong case, a typo, or the 'reversed' that migration 20260810000000 added
  // to ProviderPayoutStatus but NOT to PayoutRequestStatus) threw
  // PrismaClientValidationError out of an unhandled handler and 500'd the whole
  // admin payout queue. Validate at the boundary — a bad filter is the caller's
  // mistake and deserves a 400 that names the legal values, not an engine crash.
  // An absent/empty status is the "All" filter.
  const payoutRequestQuerySchema = z.object({
    status: z.enum(['pending', 'processing', 'completed', 'failed', 'rejected']).optional(),
  });
  server.get('/payout-requests', { preHandler: adminPreHandlers }, async (request, reply) => {
    const raw = (request.query ?? {}) as { status?: string };
    const parsed = payoutRequestQuerySchema.safeParse(raw.status ? raw : {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const requests = await listPayoutRequests(parsed.data.status);
    return reply.send({ requests });
  });

  // ─── POST /admin/bookings/payout-requests/:id/process — settle/release ────────
  // Cross-cutting Phase 2: admin records the real transfer (UPI/bank/Razorpay
  // Route) via reference; completing marks the linked Commissions PAID. Reject
  // /fail releases the balance back to PENDING so the provider doesn't lose it.
  const processPayoutSchema = z.object({
    action: z.enum(['complete', 'reject', 'fail']),
    reference: z.string().max(200).optional(),
    failureReason: z.string().max(500).optional(),
  });
  server.post('/payout-requests/:id/process', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = processPayoutSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    try {
      const updated = await processPayout(
        id,
        parsed.data.action,
        request.currentUser!.id,
        parsed.data.reference,
        parsed.data.failureReason,
      );
      // DI-10: a repeat Complete must not read like the first one.
      //
      // The bank/UPI transfer happens outside this system, so this response is
      // the ONLY thing telling the admin whether their click did anything. Five
      // concurrent completes and a later sequential one all returned an
      // identical 200 body; the ledger stayed correct but nothing said "already
      // settled", which invites a second real-world transfer. `processedAt` and
      // `reference` come off the STORED row, so the no-op answers with the
      // reference the money actually moved under rather than the one just
      // typed into the second click.
      return reply.send({
        ok: true,
        payout: {
          id: updated.id,
          status: updated.status,
          alreadyCompleted: updated.alreadyCompleted,
          processedAt: updated.processedAt ?? null,
          reference: updated.reference ?? null,
        },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to process payout';
      if (msg.includes('not found')) return reply.code(404).send({ error: msg });
      return reply.code(400).send({ error: msg });
    }
  });

  // ─── GET /admin/bookings/refunds/pending ──────────────────────────────────
  server.get('/refunds/pending', { preHandler: adminPreHandlers }, async (request) => {
    // BookingStatus enum has no REFUND_REQUESTED. We treat `cancelled`
    // bookings whose Payment is still 'captured' (not yet 'refunded') as
    // refund-pending. If the schema later adds REFUND_REQUESTED, swap this
    // filter accordingly.
    try {
      const bookings = await prisma.pujaBooking.findMany({
        where: { status: 'cancelled' },
        orderBy: { cancelledAt: 'desc' },
        take: 200,
        include: {
          pujaType: { select: { name: true, slug: true } },
          temple: { select: { name: true, slug: true, city: true } },
          user: { select: { fullName: true, phone: true } },
          payments: { select: { id: true, status: true, amount: true } },
        },
      });
      const pending = bookings.filter((b) =>
        b.payments.some((p) => p.status === 'captured' || p.status === 'authorized')
      );
      return {
        bookings: pending,
        schemaNote: 'REFUND_REQUESTED status missing — using cancelled bookings with un-refunded captures.',
      };
    } catch (err) {
      request.log.warn({ err }, 'admin refunds pending failed');
      return { bookings: [], schemaNote: 'query failed' };
    }
  });

  // ─── POST /admin/bookings/refunds/:bookingId/approve ──────────────────────
  // Calls refund.service.processRefund which (a) fires the Razorpay refund
  // REST call, (b) updates Payment + PujaBooking rows, (c) sends a refund-
  // success email via sendEmail. Idempotent — already-refunded bookings
  // return `{ skipped: true }` instead of double-charging.
  server.post<{ Params: { bookingId: string }; Body: unknown }>(
    '/refunds/:bookingId/approve',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      const approveBodySchema = z.object({
        reason: z.string().max(500).optional(),
        refundType: z.enum(['full', 'partial']).optional(),
        amountInr: z.number().positive().optional(),
      });
      const parsed = approveBodySchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      try {
        const exists = await prisma.pujaBooking.findUnique({
          where: { id: bookingId },
          select: { id: true },
        });
        if (!exists) return reply.code(404).send({ error: 'Booking not found' });

        const result = await processRefund({
          bookingId,
          reason: parsed.data.reason ?? 'Admin-approved refund',
          refundType: parsed.data.refundType ?? 'full',
          amountInr: parsed.data.amountInr,
          initiatedBy: request.currentUser?.id ?? 'admin',
        });

        if (!result.ok) {
          request.log.warn({ bookingId, result }, 'refund failed');
          return reply.code(502).send({ error: result.error ?? 'Refund failed', refund: result });
        }
        request.log.info({ bookingId, refundId: result.refundId, skipped: result.skipped }, 'admin refund approved');
        return { ok: true, refund: result };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin refund approve failed');
        return reply.code(500).send({ error: 'Failed to approve refund' });
      }
    }
  );

  // ─── POST /admin/bookings/refunds/:bookingId/reject ───────────────────────
  server.post<{ Params: { bookingId: string }; Body: unknown }>(
    '/refunds/:bookingId/reject',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      const parsed = rejectBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      try {
        const booking = await prisma.pujaBooking.findUnique({ where: { id: bookingId } });
        if (!booking) return reply.code(404).send({ error: 'Booking not found' });

        // No REFUND_REJECTED status — fall back to leaving status as-is and
        // tagging cancellationReason with the marker. Mirror the rejection
        // reason into Payment.metadata.refundRejectedReason for audit.
        const updated = await prisma.pujaBooking.update({
          where: { id: bookingId },
          data: {
            cancellationReason: `[refund-rejected] ${parsed.data.reason}`.slice(0, 500),
          },
        });
        try {
          const captured = await prisma.payment.findFirst({
            where: { bookingId, status: { in: ['captured', 'partially_refunded'] } },
            orderBy: { createdAt: 'desc' },
          });
          if (captured) {
            await prisma.payment.update({
              where: { id: captured.id },
              data: {
                metadata: {
                  ...((captured.metadata as Record<string, unknown>) ?? {}),
                  refundRejectedReason: parsed.data.reason,
                  refundRejectedAt: new Date().toISOString(),
                  refundRejectedBy: request.currentUser?.id ?? 'admin',
                },
              },
            });
          }
        } catch (err) {
          request.log.warn({ err, bookingId }, 'failed to mirror reject reason into payment.metadata');
        }
        request.log.info({ bookingId, reason: parsed.data.reason }, 'admin refund rejected');
        return { booking: updated };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin refund reject failed');
        return reply.code(500).send({ error: 'Failed to reject refund' });
      }
    }
  );

  // ─── POST /admin/bookings/:bookingId/video-proof/flag ─────────────────────
  //
  // Flags an uploaded video proof as invalid. Clears videoProofUrl /
  // videoUploadedAt and reverts status to `completed` so the assigned
  // priest can re-upload. Idempotent: flagging an already-empty proof is
  // a no-op (returns the current row).
  server.post<{ Params: { bookingId: string }; Body: unknown }>(
    '/:bookingId/video-proof/flag',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { bookingId } = request.params;
      const parsed = rejectBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply
          .code(400)
          .send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      try {
        const booking = await prisma.pujaBooking.findUnique({
          where: { id: bookingId },
          select: {
            id: true,
            status: true,
            videoProofUrl: true,
            cancellationReason: true,
          },
        });
        if (!booking) {
          return reply.code(404).send({ error: 'Booking not found' });
        }
        if (!booking.videoProofUrl) {
          return reply.code(409).send({
            error: 'No video proof on this booking to flag.',
          });
        }
        const updated = await prisma.pujaBooking.update({
          where: { id: bookingId },
          data: {
            videoProofUrl: null,
            videoUploadedAt: null,
            status: 'completed',
            cancellationReason: `[video-flagged] ${parsed.data.reason}`,
          },
          select: {
            id: true,
            bookingNumber: true,
            status: true,
            videoProofUrl: true,
          },
        });
        request.log.info(
          { bookingId, reason: parsed.data.reason },
          'admin flagged video proof as invalid'
        );
        return { booking: updated };
      } catch (err) {
        request.log.error({ err, bookingId }, 'admin video flag failed');
        return reply.code(500).send({ error: 'Failed to flag video' });
      }
    }
  );

  // ─── Provider KYC verification ──────────────────────────────────────────
  //
  // PJ-01 (2026-08-12, P0). `payout.service` gates BOTH payout paths on
  // `provider_kyc.verified`: requestPayout throws "Your KYC is pending
  // verification. Payouts unlock once an admin verifies it." and the Monday
  // settlement sweep does `if (!kyc.verified || !kyc.hasBank) { skippedKyc++ }`.
  //
  // Nothing in the codebase ever set that column to true. A repo-wide search
  // for provider_kyc returned three files: the provider's own submit route
  // (which only ever writes `verified = false`), the CREATE TABLE, and the
  // payout gate that READS it. routes/provider-kyc.ts:29 even documents
  // "Approval (verified=true) is admin-driven" — describing an admin route that
  // was never written.
  //
  // Net effect: every pandit, astrologer, wellness instructor, store owner and
  // temple manager who earned money was permanently told their KYC was pending
  // and could never withdraw a rupee, by either path. This is the missing
  // writer. The actual bank transfer stays owner-gated on RazorpayX/Cashfree —
  // this unblocks the request, not the rail.
  const kycDecisionSchema = z.object({
    action: z.enum(['verify', 'reject']),
    reason: z.string().min(3).max(500).optional(),
  }).refine((d) => d.action !== 'reject' || !!d.reason, {
    message: 'A reason is required when rejecting KYC',
    path: ['reason'],
  });

  server.patch(
    '/provider-kyc/:userId',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)) {
        return reply.code(400).send({ error: 'userId must be a UUID' });
      }
      const parsed = kycDecisionSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
      }
      const { action, reason } = parsed.data;

      try {
        // Verifying requires bank details on file — otherwise we would unlock a
        // payout that has nowhere to send the money, which is how a "verified"
        // provider ends up stuck one step further along with no explanation.
        const rows = await prisma.$queryRawUnsafe<
          Array<{ user_id: string; bank_account_number: string | null; bank_ifsc: string | null }>
        >(
          `SELECT user_id, bank_account_number, bank_ifsc FROM provider_kyc WHERE user_id = $1::uuid LIMIT 1`,
          userId,
        );
        const row = rows[0];
        if (!row) {
          return reply.code(404).send({ error: 'No KYC submission found for this provider' });
        }

        if (action === 'verify') {
          if (!row.bank_account_number || !row.bank_ifsc) {
            return reply.code(409).send({
              error: 'Cannot verify: this provider has no bank account on file. Ask them to resubmit KYC with bank details.',
            });
          }
          await prisma.$executeRawUnsafe(
            `UPDATE provider_kyc
                SET verified = true, verified_at = now(), rejection_reason = NULL, updated_at = now()
              WHERE user_id = $1::uuid`,
            userId,
          );
        } else {
          await prisma.$executeRawUnsafe(
            `UPDATE provider_kyc
                SET verified = false, verified_at = NULL, rejection_reason = $2, updated_at = now()
              WHERE user_id = $1::uuid`,
            userId,
            reason,
          );
        }

        request.log.info({ userId, action, adminId: request.currentUser!.id }, 'provider KYC decision');
        return reply.send({ ok: true, userId, verified: action === 'verify', reason: reason ?? null });
      } catch (err) {
        request.log.error({ err, userId }, 'provider KYC decision failed');
        return reply.code(500).send({ error: 'Failed to record the KYC decision' });
      }
    },
  );

  // GET the queue an admin actually works from. Without this the decision
  // endpoint above is unreachable in practice — nobody knows who is waiting.
  server.get('/provider-kyc', { preHandler: adminPreHandlers }, async (request, reply) => {
    const status = (request.query as { status?: string })?.status ?? 'pending';
    try {
      const where =
        status === 'verified' ? 'k.verified = true'
        : status === 'rejected' ? 'k.verified = false AND k.rejection_reason IS NOT NULL'
        : 'k.verified = false AND k.rejection_reason IS NULL';
      const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        `SELECT k.user_id, k.verified, k.verified_at, k.rejection_reason, k.created_at,
                (k.bank_account_number IS NOT NULL AND k.bank_ifsc IS NOT NULL) AS has_bank,
                u.full_name, u.email
           FROM provider_kyc k
           LEFT JOIN users u ON u.id = k.user_id
          WHERE ${where}
          ORDER BY k.created_at ASC
          LIMIT 200`,
      );
      // Never return raw account numbers to a list view.
      return reply.send({ status, submissions: rows });
    } catch (err) {
      request.log.error({ err }, 'provider KYC queue failed');
      return reply.code(500).send({ error: 'Failed to load the KYC queue' });
    }
  });
}
