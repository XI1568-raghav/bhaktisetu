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
import { goLive } from '../lib/go-live.js';
import { onboardingService } from '../services/onboarding.service.js';
import { parseWeeklyAvailability } from '../lib/astrologer-availability.js';

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

/** Most rows read to build the totals, and the most returned as the visible list. */
const LEDGER_ROW_CAP = 5000;
const LEDGER_LIST_LIMIT = 100;

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
/** Midnight IST today and midnight IST on the 1st, as instants. */
export function istPeriodStarts(now: Date): { dayStart: Date; monthStart: Date } {
  const ist = new Date(now.getTime() + IST_OFFSET_MS);
  const dayStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS);
  const monthStart = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_OFFSET_MS);
  return { dayStart, monthStart };
}

/** No ledger rows can exist for an id the ledger cannot store. All zeros. */
function emptyAstrologerLedger() {
  return {
    data: [] as Array<Record<string, unknown>>,
    summary: {
      totalEarningsInr: 0,
      pendingInr: 0,
      readyInr: 0,
      requestedInr: 0,
      upcomingInr: 0,
      paidInr: 0,
      monthEarningsInr: 0,
      todayEarningsInr: 0,
      astrologerShare: ASTROLOGER_SHARE,
    },
  };
}

// Trim before measuring: "   " used to pass `.min(1)` and was stored as the
// astrologer's public name, and "" / "  " entries were stored as specialties.
const trimmedList = (max: number, itemMax: number) =>
  z
    .array(z.string().trim().min(1).max(itemMax))
    .max(max)
    // "Vedic" ticked twice (or "vedic ") is one specialty.
    .transform((xs) => [...new Map(xs.map((x) => [x.toLowerCase(), x])).values()]);

/** Highest per-minute rate the portal will save: 60 min must stay payable in one Razorpay/UPI order. */
export const MAX_PRICE_PER_MINUTE = 1000;

const profileUpdateSchema = z.object({
  displayName: z.string().trim().min(1, 'Display name is required.').max(100).optional(),
  specialties: trimmedList(20, 50).optional(),
  experience: z.number().int().min(0).max(80).optional(),
  languages: trimmedList(20, 30).optional(),
  // P0 #AP-09 (2026-07-09): floor at ₹1/min, not 0. The old .min(0) let an
  // astrologer save ₹0/min; devotees then hit /consultation/book's "Minimum
  // consultation amount is ₹50" 400 with no hint that the rate was the cause.
  // ₹1/min × the shortest slot still clears ₹50 for any reasonable duration;
  // the booking endpoint enforces the absolute ₹50 floor independently.
  //
  // Ceiling: it was 100000, so ₹100,000/min x 60 min = ₹60 lakh was a valid
  // save and a valid booking amount. Two decimals only - the column is
  // Decimal(10,2) and a rate of 25.555 was displayed as 25.555 and charged as 25.56.
  pricePerMinute: z
    .number()
    .min(1, 'Per-minute rate must be at least ₹1.')
    .max(MAX_PRICE_PER_MINUTE, `Per-minute rate can be at most ₹${MAX_PRICE_PER_MINUTE}.`)
    .transform((v) => Math.round(v * 100) / 100)
    .optional(),
  bio: z.string().max(2000).optional(),
});

// Availability is intentionally free-form JSON so the portal can iterate on
// the slot shape without a migration. Cap at 64KB to prevent abuse. It must be a
// weekly schedule one of the two clients writes (see lib/astrologer-availability.ts)
// or `{}` to clear it: `null`, a number or an array used to be accepted and
// `null` crashed the write with a 500 (Prisma wants JsonNull for a null Json).
const availabilityUpdateSchema = z.object({
  availability: z
    .unknown()
    .refine((v) => {
      try {
        return JSON.stringify(v).length <= 64 * 1024;
      } catch {
        return false;
      }
    }, 'availability JSON exceeds 64KB cap')
    .refine(
      (v) =>
        typeof v === 'object' &&
        v !== null &&
        !Array.isArray(v) &&
        (Object.keys(v).length === 0 || parseWeeklyAvailability(v) !== null),
      'availability must be a weekly schedule',
    ),
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

type Settled<T> = { ok: true; value: T } | { ok: false; err: unknown };
function settle<T>(fn: () => Promise<T>): Promise<Settled<T>> {
  return fn().then((value) => ({ ok: true as const, value }), (err) => ({ ok: false as const, err }));
}

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
  // The summary used to be summed over `take: 100` rows, so an astrologer with
  // more than 100 commissions saw a "Total earnings" / "Paid out" / month figure
  // that silently dropped everything older. Read every row (bounded) for the
  // totals and return only the newest 100 as the list. The held-id lookup is
  // independent of the commission read, so the two go out together.
  const [allRows, unfinishedIds] = await Promise.all([
    prisma.commission.findMany({
      where: { providerId: userId },
      orderBy: { createdAt: 'desc' },
      take: LEDGER_ROW_CAP,
    }),
    // Consultations not yet completed are earned but not yet releasable: the same
    // hold GET /payouts/balance applies, reported here as `upcoming`.
    unfinishedConsultationIds(prisma, userId),
  ]);
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

  const heldKeys = {
    wellnessEnrollmentIds: new Set<string>(),
    bookingIds: new Set(unfinishedIds),
  };

  const allData = rows.map((c) => {
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
      // True once the row is inside a PayoutRequest: the astrologer has asked
      // for it and is waiting to be paid (vs. ready and still unrequested).
      requested: !!c.payoutRequestId,
      createdAt: c.createdAt,
      grossAmountInr: gross.toNumber(),
      platformCutInr: platformCut.toNumber(),
      earningsInr: earnings.toNumber(),
      astrologerShare: ASTROLOGER_SHARE,
    };
  });

  // A REVERSED row is a cancelled/refunded consultation (AW-06). It is not
  // earned, not pending and not paid — it must not appear in any total.
  const live = allData.filter((r) => r.status !== 'REVERSED');
  const data = allData.slice(0, LEDGER_LIST_LIMIT);
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const sum = (rs: typeof live) => round2(rs.reduce((s, r) => s + r.earningsInr, 0));

  // "Today" and "this month" are the astrologer's calendar, which is IST. The API
  // runs in UTC, so setHours(0) put the day boundary at 05:30 IST: earnings made
  // between midnight and 05:30 IST counted toward yesterday.
  const { dayStart, monthStart } = istPeriodStarts(new Date());

  return {
    data,
    summary: {
      totalEarningsInr: sum(live),
      // Pending EXCLUDING upcoming consultations (still held), which are
      // reported separately so the two never read as one payable figure.
      pendingInr: sum(live.filter((r) => r.status === 'PENDING' && r.releaseStatus !== 'upcoming')),
      // The two halves of pendingInr, so no screen has to call a mixed figure
      // "pending". Same definitions as GET /payouts/balance: `readyInr` is its
      // availableInr (PENDING, not in a request, not held) and `requestedInr`
      // its pendingInr (PENDING and already inside a payout request).
      readyInr: sum(live.filter((r) => r.status === 'PENDING' && !r.requested && r.releaseStatus !== 'upcoming')),
      requestedInr: sum(live.filter((r) => r.status === 'PENDING' && r.requested)),
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
    // Latency: the ledger is keyed on userId alone, so it is read together with
    // the profile instead of after the whole attribution chain.
    const [profile, ledger] = await Promise.all([
      isUuid(userId) ? prisma.astrologerProfile.findUnique({ where: { userId } }) : null,
      // AW-04 (2026-08-12, P1): every rupee on this dashboard now comes off the
      // Commission ledger, the same source /astrologer-portal/earnings and
      // payout.service.getPayoutBalance read, so the dashboard and the Earnings
      // page can no longer state different numbers for the same day.
      loadAstrologerLedger(userId),
    ]);

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

    // Surface real bookings from raw-SQL astrologer_consultations table.
    // Safe-default empty arrays on table miss.
    let consultationsToday = 0;
    let upcomingSessions: unknown[] = [];
    // AW-14 (2026-08-12, P2): null means "the raw table could not be read", in
    // which case the stored counter is the only number available. A derived 0
    // and an unreadable table must not look the same.
    let consultationsLifetime: number | null = null;
    let listing: Awaited<ReturnType<typeof onboardingService.describeListing>> | null | undefined;
    try {
      if (astrologerIdValues.length > 0) {
        // Build an IN-list placeholder per value ($2, $3, ...) — $1 is the count
        // for Postgres ANY-array isn't needed; use ANY($1::text[]) instead so we
        // pass a single array param regardless of how many ids resolved.
        const idArray = astrologerIdValues;
        // The three reads and the listing note are independent, so they go out
        // together. Results are applied in the original order and stop at the
        // first failure, so a partly unreadable table leaves exactly the
        // fields it always did.
        const [todaySettled, lifetimeSettled, upcomingSettled, listingNote] = await Promise.all([
          settle(() => prisma.$queryRawUnsafe<Array<{ count: string; sum: string | null }>>(
            `SELECT COUNT(*)::text AS count, COALESCE(SUM(amount_inr),0)::text AS sum
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status IN ('confirmed', 'completed')
             AND (paid_at AT TIME ZONE 'Asia/Kolkata')::date = (now() AT TIME ZONE 'Asia/Kolkata')::date`,
            idArray,
          )),
          // AW-14 (2026-08-12, P2): the lifetime figure counts the same rows
          // that produce `consultationsToday`, minus the date bound, so the two
          // can never contradict each other. 'completed' is included because a
          // finished session is still a consultation the astrologer delivered.
          settle(() => prisma.$queryRawUnsafe<Array<{ count: string | number }>>(
            `SELECT COUNT(*)::text AS count
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status IN ('confirmed', 'completed')`,
            idArray,
          )),
          // AW-01 (2026-08-12, P0): feeds the "Upcoming Sessions" panel; the
          // Jitsi URL is derived here the way routes/consultation.ts does.
          settle(() => prisma.$queryRawUnsafe<
            Array<Record<string, unknown> & { room_name: string | null }>
          >(
            `SELECT id, reference, user_id, minutes, amount_inr, scheduled_at, room_name, status, created_at
           FROM astrologer_consultations
           WHERE astrologer_id = ANY($1::text[]) AND status = 'confirmed'
             AND (scheduled_at IS NULL OR scheduled_at >= now() - interval '1 hour')
           ORDER BY COALESCE(scheduled_at, created_at) ASC
           LIMIT 20`,
            idArray,
          )),
          profile ? onboardingService.describeListing(userId, 'ASTROLOGER').catch(() => null) : Promise.resolve(null),
        ]);
        listing = listingNote;
        if (!todaySettled.ok) throw todaySettled.err;
        consultationsToday = Number(todaySettled.value[0]?.count ?? 0);
        if (!lifetimeSettled.ok) throw lifetimeSettled.err;
        consultationsLifetime = Number(lifetimeSettled.value[0]?.count ?? 0);
        if (!upcomingSettled.ok) throw upcomingSettled.err;
        const upcomingRows = upcomingSettled.value;
        upcomingSessions = upcomingRows.map((r) => ({
          ...r,
          jitsiUrl: r.room_name ? `https://meet.jit.si/${r.room_name}` : null,
        }));
      }
    } catch (err) {
      server.log.warn({ err }, 'astrologer_consultations query failed (table may not exist yet)');
    }

    // Honest listing state for the profile screen (never approval wording unless
    // the switch is on). Normally read in the wave above; read here only when
    // that wave did not run (no ids to match) or threw before assigning it.
    if (listing === undefined) {
      listing = profile ? await onboardingService.describeListing(userId, 'ASTROLOGER').catch(() => null) : null;
    }

    return reply.send({
      profile,
      listing,
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
        readyInr: ledger.summary.readyInr,
        requestedInr: ledger.summary.requestedInr,
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
    // An empty bio box means "remove my bio": store null, do not keep the old text.
    const { bio, ...rest } = parsed.data;
    const patch = { ...rest, ...(bio !== undefined ? { bio: bio.trim() || null } : {}) };
    const respond = async (profile: NonNullable<typeof existing>) => {
      const live = await goLive(userId, 'ASTROLOGER', profile, () => prisma.astrologerProfile.findUnique({ where: { userId } }), { priceProvided: parsed.data.pricePerMinute !== undefined });
      return reply.send({ profile: live, listing: live.approved ? null : await onboardingService.describeListing(userId, 'ASTROLOGER').catch(() => null) });
    };
    if (!existing) {
      // QA 2026-10-13 (mirrors gaushala S-08): no placeholder name on a public profile.
      if (!parsed.data.displayName) {
        return reply.code(400).send({
          code: 'display_name_required',
          error: 'Display name required',
          message: 'Enter your name as devotees should see it to create your astrologer profile.',
        });
      }
      try {
        const profile = await prisma.astrologerProfile.create({
          data: {
            userId,
            displayName: parsed.data.displayName,
            specialties: parsed.data.specialties ?? [],
            languages: parsed.data.languages ?? [],
            experience: parsed.data.experience ?? 0,
            pricePerMinute: parsed.data.pricePerMinute ?? 10,
            bio: patch.bio ?? undefined,
          },
        });
        return await respond(profile);
      } catch (err) {
        // A double-clicked first save: both requests saw "no profile", the second
        // create hit the unique userId index and answered 500. The first one won;
        // this request's values are applied on top of it as an ordinary update.
        if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
      }
    }
    const profile = await prisma.astrologerProfile.update({
      where: { userId },
      data: patch,
    });
    return respond(profile);
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
      // QA 2026-10-13: this used to auto-create a profile named 'Astrologer'. A profile
      // needs a real name, which only PATCH /profile collects.
      return reply.code(409).send({
        code: 'display_name_required',
        error: 'Create your astrologer profile first',
        message: 'Save your profile (with your display name) before setting availability.',
      });
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
        readyInr: summary.readyInr,
        requestedInr: summary.requestedInr,
        upcomingInr: summary.upcomingInr,
        paidInr: summary.paidInr,
        astrologerShare: summary.astrologerShare,
      },
    });
  });
}
