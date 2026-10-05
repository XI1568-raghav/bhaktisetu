import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { commissionGross, commissionPlatformCut } from '../lib/commission-math.js';
import { authenticateUser } from '../middlewares/auth.js';
import {
  setAstrologerOnline,
  getAstrologerPresence,
  ASTROLOGER_SHARE,
} from '../services/astrologer.service.js';
import { isUpcomingCommission, unfinishedConsultationIds } from '../services/payout.service.js';

/**
 * PAR-13. `AstrologerProfile.userId` and `Commission.providerId` are both
 * `@db.Uuid`. The demo astrologer signs in with `user.id = "demo-astro"`, which
 * cannot be cast to a uuid, so every lookup keyed on it threw Prisma P2023 and
 * the portal home answered 500 with the server's absolute path and four lines
 * of source in the body — on both web and the app, for that account.
 *
 * A value that cannot be a uuid cannot match a uuid column: the honest result is
 * a miss, not an exception. Every other portal (priest/temple/store/gaushala/
 * wellness) already answers 200 for the same class of id; this is that same
 * behaviour, made explicit.
 *
 * Same regex as routes/priests-public.ts:29 and lib/gaushala-donee.ts:27.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function isUuid(value: string | null | undefined): boolean {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** No ledger rows can exist for an id the ledger cannot store. All zeros. */
function emptyAstrologerLedger() {
  return {
    data: [] as Array<Record<string, unknown>>,
    summary: {
      totalEarningsInr: 0,
      pendingInr: 0,
      upcomingInr: 0,
      paidInr: 0,
      monthEarningsInr: 0,
      todayEarningsInr: 0,
      astrologerShare: ASTROLOGER_SHARE,
    },
  };
}

const profileUpdateSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  specialties: z.array(z.string().max(50)).max(20).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  languages: z.array(z.string().max(30)).max(20).optional(),
  // P0 #AP-09 (2026-07-09): floor at ₹1/min, not 0. The old .min(0) let an
  // astrologer save ₹0/min; devotees then hit /consultation/book's "Minimum
  // consultation amount is ₹50" 400 with no hint that the rate was the cause.
  // ₹1/min × the shortest slot still clears ₹50 for any reasonable duration;
  // the booking endpoint enforces the absolute ₹50 floor independently.
  pricePerMinute: z.number().min(1, 'Per-minute rate must be at least ₹1.').max(100000).optional(),
  bio: z.string().max(2000).optional(),
});

// Availability is intentionally free-form JSON so the portal can iterate on
// the slot shape without a migration. Cap at 64KB to prevent abuse.
const availabilityUpdateSchema = z.object({
  availability: z.unknown().refine((v) => {
    try {
      return JSON.stringify(v).length <= 64 * 1024;
    } catch {
      return false;
    }
  }, 'availability JSON exceeds 64KB cap'),
});

// astro-wellness-3 (2026-09-09, P2): this lived inline in POST /online as a
// bare `.parse()`. Hoisted here so it is declared the way every other body
// schema in this file is, and so the handler can `safeParse` it.
const onlineUpdateSchema = z.object({
  online: z.boolean(),
  chat: z.boolean().optional(),
  call: z.boolean().optional(),
});

export const __testing = { profileUpdateSchema, availabilityUpdateSchema, onlineUpdateSchema };

/**
 * The caller's consultation earnings, straight off the Commission ledger.
 *
 * AW-04 (2026-08-12, P1): /dashboard and /earnings each computed money their
 * own way — /dashboard summed `astrologer_consultations.amount_inr` (GROSS,
 * before the 20% platform cut) and /earnings summed `Commission.amount` (the
 * astrologer's actual 80%). The two screens therefore stated different rupee
 * figures for the same day, and the dashboard's gross number was rendered under
 * the label "Paid out" while nothing had settled. One reader, one source: this.
 *
 * `Commission.amount` IS the provider's earning and `percentage` IS the
 * platform's take rate — see lib/commission-math.ts. Nothing here re-derives
 * either.
 */
async function loadAstrologerLedger(userId: string) {
  // PAR-13: `Commission.providerId` is @db.Uuid — a non-UUID account id throws
  // P2023 here just as it does on astrologerProfile. No rows can be attributed
  // to an id that cannot be stored, so an empty ledger is the true answer.
  if (!isUuid(userId)) return emptyAstrologerLedger();
  const allRows = await prisma.commission.findMany({
    where: { providerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  // Commission has no source discriminator, and every provider role is keyed
  // by User.id — so once the puja writers were corrected to use User.id
  // (RV-04), a dual-role user's PUJA commissions started matching this query
  // and rendering as consultation earnings. Exclude anything whose bookingId
  // is a PujaBooking; what remains is this astrologer's consultations.
  const candidateIds = allRows.map((c) => c.bookingId).filter((id): id is string => !!id);
  const pujaRows = candidateIds.length
    ? await prisma.pujaBooking.findMany({
        where: { id: { in: candidateIds } },
        select: { id: true },
      })
    : [];
  const pujaIds = new Set(pujaRows.map((p) => p.id));
  const rows = allRows.filter((c) => !c.bookingId || !pujaIds.has(c.bookingId));

  // Consultations not yet completed are earned but not yet releasable: the same
  // hold GET /payouts/balance applies, reported here as `upcoming`.
  const heldKeys = {
    wellnessEnrollmentIds: new Set<string>(),
    bookingIds: new Set(await unfinishedConsultationIds(prisma, userId)),
  };

  const data = rows.map((c) => {
    const earnings = new Prisma.Decimal(c.amount);
    const gross = commissionGross(c.amount, c.percentage);
    const platformCut = commissionPlatformCut(c.amount, c.percentage);
    return {
      id: c.id,
      bookingId: c.bookingId,
      status: c.status,
      releaseStatus: isUpcomingCommission(c, heldKeys)
        ? 'upcoming'
        : c.status === 'PENDING'
          ? 'payable'
          : c.status.toLowerCase(),
      createdAt: c.createdAt,
      grossAmountInr: gross.toNumber(),
      platformCutInr: platformCut.toNumber(),
      earningsInr: earnings.toNumber(),
      astrologerShare: ASTROLOGER_SHARE,
    };
  });

  // A REVERSED row is a cancelled/refunded consultation (AW-06). It is not
  // earned, not pending and not paid — it must not appear in any total.
  const live = data.filter((r) => r.status !== 'REVERSED');
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const sum = (rs: typeof live) => round2(rs.reduce((s, r) => s + r.earningsInr, 0));

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  return {
    data,
    summary: {
      totalEarningsInr: sum(live),
      // Pending EXCLUDING upcoming consultations (still held), which are
      // reported separately so the two never read as one payable figure.
      pendingInr: sum(live.filter((r) => r.status === 'PENDING' && r.releaseStatus !== 'upcoming')),
      upcomingInr: sum(live.filter((r) => r.releaseStatus === 'upcoming')),
      paidInr: sum(live.filter((r) => r.status === 'PAID')),
      monthEarningsInr: sum(live.filter((r) => new Date(r.createdAt) >= monthStart)),
      todayEarningsInr: sum(live.filter((r) => new Date(r.createdAt) >= dayStart)),
      astrologerShare: ASTROLOGER_SHARE,
    },
  };
}

// No persistent Consultation model — Jitsi rooms are ephemeral (see consultation.ts).
// Stats below derive from AstrologerProfile counters maintained elsewhere; sessions
// + earnings remain 0 until a Consultation table lands.

export async function astrologerPortalRoutes(server: FastifyInstance) {
  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }

    // PAR-13: guarded — see isUuid. A miss, not a P2023 crash.
    const profile = isUuid(userId)
      ? await prisma.astrologerProfile.findUnique({ where: { userId } })
      : null;

    // P0 #AP-04/05 (2026-07-09): astrologer attribution. astrologer_consultations.
    // astrologer_id is TEXT and has been written as several forms over time —
    // the mock slug ('astro-001'), the AstrologerProfile.id (UUID), and (legacy)
    // the User UUID. Filtering on a single value (the User UUID) missed every
    // row stored under the profile id, so a real astrologer saw 0 consultations
    // / 0 earnings / 0 upcoming forever. Match on BOTH the profile id and the
    // User UUID so all attribution forms resolve. (Mock-slug demo rows still
    // won't match — correct, they aren't a real astrologer's bookings.)
    const astrologerIdValues = [profile?.id, userId].filter(
      (v): v is string => typeof v === 'string' && v.length > 0,
    );

    // AW-04 (2026-08-12, P1): every rupee on this dashboard now comes off the
    // Commission ledger — the same source /astrologer-portal/earnings and
    // payout.service.getPayoutBalance read — so the dashboard and the Earnings
    // page can no longer state different numbers for the same day. The raw
    // `astrologer_consultations` sums that used to feed these cards were GROSS
    // (pre-20%-cut) and were rendered under the label "Paid out".
    const ledger = await loadAstrologerLedger(userId);

    // Surface real bookings from raw-SQL astrologer_consultations table.
    // Safe-default empty arrays on table miss.
    let consultationsToday = 0;
    let upcomingSessions: unknown[] = [];
    // AW-14 (2026-08-12, P2): null means "the raw table could not be read", in
    // which case the stored counter is the only number available. A derived 0
    // and an unreadable table must not look the same.
    let consultationsLifetime: number | null = null;
    try {
      if (astrologerIdValues.length > 0) {
        // Build an IN-list placeholder per value ($2, $3, ...) — $1 is the count
        // for Postgres ANY-array isn't needed; use ANY($1::text[]) instead so we
        // pass a single array param regardless of how many ids resolved.
        const idArray = astrologerIdValues;
        const today = await prisma.$queryRawUnsafe<Array<{ count: string; sum: string | null }>>(
          `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_inr),0)::text AS sum
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'
             AND paid_at::date = CURRENT_DATE`,
          idArray,
        );
        consultationsToday = Number(today[0]?.count ?? 0);

        // AW-14 (2026-08-12, P2): the lifetime figure used to be
        // `AstrologerProfile.totalConsultations`, a counter column NOTHING in
        // the codebase ever incremented — so the card read 0 forever while the
        // card beside it read "Today's Sessions 1". Count the same rows that
        // produce `consultationsToday`, minus the date bound, so the two can
        // never contradict each other again. 'completed' is included because a
        // finished session is still a consultation the astrologer delivered.
        const lifetime = await prisma.$queryRawUnsafe<Array<{ count: string | number }>>(
          `SELECT COUNT(*)::text AS count
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status IN ('confirmed', 'completed')`,
          idArray,
        );
        consultationsLifetime = Number(lifetime[0]?.count ?? 0);

        // AW-01 (2026-08-12, P0): the dashboard "Upcoming Sessions" panel was a
        // hardcoded empty state, so this array was fetched and thrown away. It is
        // now rendered — and the astrologer needs a way INTO the room, not just
        // proof it exists, so derive the Jitsi URL here the way every other
        // consultation endpoint does (routes/consultation.ts) rather than making
        // the client reconstruct the meet.jit.si origin.
        const upcomingRows = await prisma.$queryRawUnsafe<
          Array<Record<string, unknown> & { room_name: string | null }>
        >(
          `SELECT id, reference, user_id, minutes, amount_inr, scheduled_at, room_name, status, created_at
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'
             AND (scheduled_at IS NULL OR scheduled_at >= now() - interval '1 hour')
           ORDER BY COALESCE(scheduled_at, created_at) ASC
           LIMIT 20`,
          idArray,
        );
        upcomingSessions = upcomingRows.map((r) => ({
          ...r,
          jitsiUrl: r.room_name ? `https://meet.jit.si/${r.room_name}` : null,
        }));
      }
    } catch (err) {
      server.log.warn({ err }, 'astrologer_consultations query failed (table may not exist yet)');
    }

    return reply.send({
      profile,
      stats: {
        // AW-14: derived when the ledger table answered; the stored counter is
        // the fallback for the table-missing case only.
        totalConsultations: consultationsLifetime ?? profile?.totalConsultations ?? 0,
        rating: profile?.rating ?? 0,
        pricePerMinute: profile ? Number(profile.pricePerMinute) : 0,
        approved: profile?.approved ?? false,
        consultationsToday,
        // All net (the astrologer's 80%), all from the Commission ledger.
        earningsTodayInr: ledger.summary.todayEarningsInr,
        earningsMonthInr: ledger.summary.monthEarningsInr,
        totalEarningsInr: ledger.summary.totalEarningsInr,
        // The paid/pending split the "Paid out" and "Pending payout" cards
        // needed. `pending` used to be passed as literal null by the page, so
        // "Pending payout" rendered as an em dash on every astrologer's screen.
        paidOutInr: ledger.summary.paidInr,
        pendingPayoutInr: ledger.summary.pendingInr,
        upcomingInr: ledger.summary.upcomingInr,
        astrologerShare: ledger.summary.astrologerShare,
        activeClients: upcomingSessions.length,
      },
      upcomingSessions,
    });
  });

  server.patch('/profile', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const parsed = profileUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    // PAR-13: this handler both reads and CREATES on the uuid-typed userId, so
    // a non-UUID account id would throw P2023 on findUnique and again on create.
    // There is no profile to read and none that could be written; say so.
    if (!isUuid(userId)) {
      return reply.code(409).send({
        error:
          'This account cannot own an astrologer profile. Sign in with a full Darshya account to edit your astrologer details.',
      });
    }
    const existing = await prisma.astrologerProfile.findUnique({ where: { userId } });
    if (!existing) {
      const profile = await prisma.astrologerProfile.create({
        data: {
          userId,
          displayName: parsed.data.displayName ?? 'Astrologer',
          specialties: parsed.data.specialties ?? [],
          languages: parsed.data.languages ?? [],
          experience: parsed.data.experience ?? 0,
          pricePerMinute: parsed.data.pricePerMinute ?? 10,
          bio: parsed.data.bio,
        },
      });
      return reply.send({ profile });
    }
    const profile = await prisma.astrologerProfile.update({
      where: { userId },
      data: parsed.data,
    });
    return reply.send({ profile });
  });

  // ─── PATCH /availability ────────────────────────────────────────────────────
  // Free-form weekly availability blob (see schema.prisma comment). Replaces
  // the previous value wholesale — partial merging is a UI concern.

  server.patch('/availability', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const parsed = availabilityUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    // PAR-13: this handler both reads and CREATES on the uuid-typed userId, so
    // a non-UUID account id would throw P2023 on findUnique and again on create.
    // There is no profile to read and none that could be written; say so.
    if (!isUuid(userId)) {
      return reply.code(409).send({
        error:
          'This account cannot own an astrologer profile. Sign in with a full Darshya account to edit your astrologer details.',
      });
    }
    const existing = await prisma.astrologerProfile.findUnique({ where: { userId } });
    if (!existing) {
      // Mirror PATCH /profile's auto-create behaviour so a fresh astrologer
      // can set availability before completing profile onboarding.
      const profile = await prisma.astrologerProfile.create({
        data: {
          userId,
          displayName: 'Astrologer',
          specialties: [],
          languages: [],
          experience: 0,
          pricePerMinute: 10,
          availability: parsed.data.availability as object,
        },
      });
      return reply.send({ availability: profile.availability });
    }
    const profile = await prisma.astrologerProfile.update({
      where: { userId },
      data: { availability: parsed.data.availability as object },
    });
    return reply.send({ availability: profile.availability });
  });

  // ─── POST /online — the astrologer's go-online/offline presence toggle ──────
  // Astrologer revamp (2026-08-05): the portal had NO live presence toggle —
  // devotees couldn't tell who was online, and the booking flow couldn't gate
  // on it. This is the Uber/AstroTalk "go online" switch. Presence is in-memory
  // (15-min heartbeat decay); a future migration can persist isOnline.
  server.post('/online', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    // astro-wellness-3 (2026-09-09, P2): measured on prod — `{"online":"yes"}`
    // and `{}` both answered 500 `{"error":"InternalServerError"}` because the
    // ZodError from `.parse()` escaped the handler. The astrologer was told the
    // server had broken when their own body was malformed, and every mistyped
    // toggle counted toward the 5xx rate on the endpoint this portal calls most.
    // Same 400 shape as PATCH /profile and PATCH /availability above.
    const parsed = onlineUpdateSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const presence = setAstrologerOnline(userId, body.online, { chat: body.chat, call: body.call });
    return reply.send({
      ok: true,
      online: presence.online,
      mode: presence.mode,
      message: presence.online ? 'You are now online.' : 'You are now offline.',
    });
  });

  // ─── GET /online — read the caller's current presence ───────────────────────
  // astro-wellness-2 (2026-09-09, P2): this was the one handler in the file with
  // no role check — measured on prod, it answered 200 to both the
  // wellness-instructor and the devotee token while the other five routes 403'd
  // the same two. Nothing leaked: `getAstrologerPresence` is keyed on
  // `currentUser.id`, so a non-astrologer only ever read their own permanently
  // default presence, and the write above was already gated. The guard is here
  // because the payload will not stay that thin — the moment presence carries
  // anything derived from the astrologer's profile or queue, the same 200
  // becomes a real read of astrologer state by someone who is not one.
  server.get('/online', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    const presence = getAstrologerPresence(userId);
    return reply.send({ online: presence.online, mode: presence.mode });
  });

  // ─── GET /earnings — the astrologer's OWN earnings (fixes the dead /admin/me)
  // Before: the Earnings page called /admin/commissions?providerId=me, an
  // admin-only route that 403'd every real astrologer — the page was dead.
  // This returns the caller's commission rows + derived payout (their 80%
  // share) so the portal Earnings panel actually works.
  server.get('/earnings', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('ASTROLOGER')) {
      return reply.code(403).send({ error: 'ASTROLOGER role required' });
    }
    // AW-04: shared with GET /dashboard. The two endpoints used to compute
    // money independently and disagreed on screen; there is now one reader.
    const { data, summary } = await loadAstrologerLedger(userId);
    return reply.send({
      data,
      summary: {
        totalEarningsInr: summary.totalEarningsInr,
        pendingInr: summary.pendingInr,
        upcomingInr: summary.upcomingInr,
        paidInr: summary.paidInr,
        astrologerShare: summary.astrologerShare,
      },
    });
  });
}
