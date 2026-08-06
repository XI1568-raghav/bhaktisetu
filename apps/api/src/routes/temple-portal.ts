import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus, StreamStatus, StreamProvider } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { authenticateUser } from '../middlewares/auth.js';

/**
 * Temple manager self-service routes. Today scoped via ?slug=<temple-slug>
 * — schema does not yet have an explicit Temple ↔ TempleManager relation, so
 * the gate is "user has TEMPLE_MANAGER role". Once a relation exists, lock
 * down to managers of that specific temple.
 */

const HH_MM_RANGE = /^\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}\s*$/;

const timingsSchema = z.object({
  regularHours: z.record(z.string().regex(HH_MM_RANGE, 'must be HH:MM - HH:MM')),
  closedOn: z.string().nullable().optional(),
  specialDays: z.string().nullable().optional(),
});

// Temple-puja offering CRUD. Mirrors the temple_puja_offerings columns —
// templeId comes from the resolved temple, not the body, so it's omitted.
const pujaOfferingCreateSchema = z.object({
  pujaTypeId: z.string().uuid(),
  priceOverride: z.number().nonnegative().nullable().optional(),
  nriPrice: z.number().nonnegative().nullable().optional(),
  assignedPriestId: z.string().uuid().nullable().optional(),
  availableSlots: z.array(z.unknown()).max(200).optional(),
  maxBookingsPerSlot: z.number().int().min(1).max(1000).optional(),
  isActive: z.boolean().optional(),
});
const pujaOfferingUpdateSchema = pujaOfferingCreateSchema.partial();

// Darshan stream CRUD. youtube fields optional — when streamProvider is
// YOUTUBE, the portal sets youtubeVideoId; for IVS/EXTERNAL_RTMP only
// streamKey + playbackUrl matter.
const STREAM_PROVIDERS = ['YOUTUBE', 'IVS', 'EXTERNAL_RTMP'] as const;
const STREAM_STATUSES = ['offline', 'live', 'scheduled'] as const;
const STREAM_STATUS_PATCH = ['scheduled', 'live', 'ended'] as const;

const darshanCreateSchema = z.object({
  streamKey: z.string().min(1).max(200),
  playbackUrl: z.string().url().max(1000),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  cameraLocation: z.string().max(200).optional(),
  streamProvider: z.enum(STREAM_PROVIDERS).optional(),
  youtubeVideoId: z.string().max(40).optional(),
  youtubeChannelId: z.string().max(60).optional(),
  attribution: z.string().max(200).optional(),
  scheduledStart: z.string().datetime().optional(),
  isPremium: z.boolean().optional(),
  status: z.enum(STREAM_STATUSES).optional(),
});
const darshanUpdateSchema = darshanCreateSchema.partial();
const darshanStatusSchema = z.object({ status: z.enum(STREAM_STATUS_PATCH) });

export const __testing = {
  pujaOfferingCreateSchema,
  pujaOfferingUpdateSchema,
  darshanCreateSchema,
  darshanUpdateSchema,
  darshanStatusSchema,
};

function hasTempleManagerRole(req: { currentUser?: { roles?: string[] } }): boolean {
  return req.currentUser?.roles?.includes('TEMPLE_MANAGER') ?? false;
}

type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Layer AM gate. If the temple is linked to an Org (org_id set), only
 * OWNER/ADMIN of that org may edit. P0 #B1 (2026-07-09): legacy unlinked
 * temples (no org_id) are admin-ONLY editable — the old `return
 * hasManagerRole` fallback let ANY TEMPLE_MANAGER overwrite ANY unlinked
 * temple's timingInfo by guessing the slug. Unlinked temples must be
 * migrated to an org (or made admin-only) to be editable.
 */
async function userCanEditTemple(
  templeId: string,
  userId: string,
  hasManagerRole: boolean,
  isAdmin: boolean,
): Promise<boolean> {
  void hasManagerRole; // legacy role check no longer grants access to unlinked temples
  const rows = await prisma.$queryRawUnsafe<{ org_id: string | null }[]>(
    `SELECT org_id FROM temples WHERE id = $1::uuid LIMIT 1`,
    templeId,
  );
  const orgId = rows[0]?.org_id;
  if (!orgId) return isAdmin;
  const member = await prisma.$queryRawUnsafe<{ role: OrgRole }[]>(
    `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
    orgId,
    userId,
  );
  const role = member[0]?.role;
  return role === 'OWNER' || role === 'ADMIN';
}

/**
 * Resolve the Temple this TEMPLE_MANAGER owns. Mirrors the dashboard's
 * name-match shim (TempleProfile ↔ Temple have no FK today, see
 * schema.prisma TempleProfile comment). Returns null when the manager has
 * no profile or the profile name doesn't match any Temple row.
 */
async function resolveManagerTempleId(userId: string): Promise<string | null> {
  const profile = await prisma.templeProfile.findUnique({
    where: { userId },
    select: { templeName: true },
  });
  if (!profile) return null;
  const temple = await prisma.temple.findFirst({
    where: { name: profile.templeName },
    select: { id: true },
  });
  return temple?.id ?? null;
}

export async function templePortalRoutes(server: FastifyInstance) {
  // GET /dashboard — TempleProfile + booking/donation aggregates when the
  // marketplace temple-profile is linkable to a real Temple row by name match
  // (no FK exists today — see schema.prisma:779-797). Falls back to zeros if
  // no matching Temple row.
  server.get('/dashboard', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }

    const profile = await prisma.templeProfile.findUnique({ where: { userId } });
    if (!profile) {
      return reply.send({
        profile: null,
        stats: { totalBookings: 0, monthBookings: 0, totalRevenueInr: 0, monthRevenueInr: 0, totalStreams: 0 },
        recentBookings: [],
      });
    }

    const matchedTemple = await prisma.temple.findFirst({
      where: { name: profile.templeName },
      select: { id: true },
    });

    if (!matchedTemple) {
      return reply.send({
        profile,
        stats: {
          totalBookings: 0, monthBookings: 0,
          totalRevenueInr: 0, monthRevenueInr: 0,
          totalStreams: profile.totalStreams,
        },
        recentBookings: [],
      });
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere = {
      templeId: matchedTemple.id,
      status: { in: [BookingStatus.confirmed, BookingStatus.completed] },
    };

    const [totalCount, monthCount, totalSum, monthSum, recent] = await Promise.all([
      prisma.pujaBooking.count({ where: baseWhere }),
      prisma.pujaBooking.count({ where: { ...baseWhere, createdAt: { gte: monthStart } } }),
      prisma.pujaBooking.aggregate({ where: baseWhere, _sum: { priceAmount: true } }),
      prisma.pujaBooking.aggregate({
        where: { ...baseWhere, createdAt: { gte: monthStart } },
        _sum: { priceAmount: true },
      }),
      prisma.pujaBooking.findMany({
        where: { templeId: matchedTemple.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          user: { select: { fullName: true } },
          pujaType: { select: { name: true } },
        },
      }),
    ]);

    return reply.send({
      profile,
      stats: {
        totalBookings: totalCount,
        monthBookings: monthCount,
        totalRevenueInr: Number(totalSum._sum?.priceAmount ?? 0),
        monthRevenueInr: Number(monthSum._sum?.priceAmount ?? 0),
        totalStreams: profile.totalStreams,
      },
      recentBookings: recent.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        devotee: b.user.fullName ?? 'Devotee',
        pujaName: b.pujaType.name,
        scheduledDate: b.scheduledDate,
        priceInr: Number(b.priceAmount),
        status: b.status,
      })),
    });
  });

  server.get<{ Querystring: { slug?: string } }>(
    '/schedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      // Mirror PATCH gate: read access also scoped to org membership when
      // the temple is org-linked. Otherwise legacy TEMPLE_MANAGER fallback.
      // Without this, any TEMPLE_MANAGER could enumerate timingInfo for
      // every temple in the system by guessing slugs.
      const hasManager = hasTempleManagerRole(request);
      const slug = request.query.slug;
      if (!slug) return reply.code(400).send({ error: 'slug required' });
      const temple = await prisma.temple.findUnique({ where: { slug }, select: { id: true, slug: true, name: true, timingInfo: true } });
      if (!temple) return reply.code(404).send({ error: 'Temple not found' });
      const allowed = await userCanEditTemple(temple.id, request.currentUser!.id, hasManager, request.currentUser!.roles.includes('ADMIN'));
      if (!allowed) {
        return reply.code(403).send({ error: 'NotAuthorizedForTemple' });
      }
      return temple;
    },
  );

  server.patch<{ Querystring: { slug?: string }; Body: unknown }>(
    '/schedule',
    { preHandler: [authenticateUser] },
    async (request, reply) => {
      const hasManager = hasTempleManagerRole(request);
      const slug = request.query.slug;
      if (!slug) return reply.code(400).send({ error: 'slug required' });
      const tRow = await prisma.temple.findUnique({ where: { slug }, select: { id: true } });
      if (!tRow) return reply.code(404).send({ error: 'Temple not found' });
      const allowed = await userCanEditTemple(tRow.id, request.currentUser!.id, hasManager, request.currentUser!.roles.includes('ADMIN'));
      if (!allowed) {
        return reply.code(403).send({ error: 'NotAuthorizedForTemple' });
      }
      const parsed = timingsSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const next = {
        regularHours: parsed.data.regularHours,
        closedOn: parsed.data.closedOn ?? undefined,
        specialDays: parsed.data.specialDays ?? undefined,
      };
      const temple = await prisma.temple.update({
        where: { slug },
        data: { timingInfo: next as object },
        select: { id: true, slug: true, name: true, timingInfo: true },
      });
      server.log.info({ slug, userId: request.currentUser?.id }, 'temple-portal schedule update');
      return temple;
    },
  );

  // ─── GET /donations ─────────────────────────────────────────────────────────
  // Temple donations live on the polymorphic Donation.templeId column
  // (migration 20260520020000). Response shape mirrors
  // gaushala-portal/donations so the temple manager UI can reuse the
  // same DonationRow component. Status filter mapping is identical:
  //   pending  → created
  //   received → paid
  //   failed   → failed
  server.get('/donations', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(userId);
    if (!templeId) {
      // Manager has no profile or the profile name doesn't match a
      // verified Temple row. Empty list — same as the dashboard path.
      return reply.send({ donations: [], total: 0 });
    }
    const q = request.query as { status?: string; limit?: string };
    const limit = Math.min(Number(q.limit) || 100, 500);
    const statusMap: Record<string, 'created' | 'paid' | 'failed'> = {
      pending: 'created',
      received: 'paid',
      failed: 'failed',
    };
    const mapped = q.status ? statusMap[q.status.toLowerCase()] : undefined;
    const where: any = { templeId, ...(mapped ? { status: mapped } : {}) };
    const donations = await prisma.donation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { user: { select: { fullName: true, email: true } } },
    });
    return reply.send({
      donations: donations.map((d) => ({
        id: d.id,
        donor: d.user?.fullName ?? 'Anonymous',
        email: d.user?.email ?? null,
        amountInr: Number(d.amountInr),
        status: d.status, // created | paid | failed
        receiptNumber: d.receiptNumber ?? null,
        createdAt: d.createdAt,
        paidAt: d.paidAt,
      })),
      total: donations.length,
    });
  });

  // ─── GET /payouts — the temple's share of puja revenue (TemplePayout) ──────
  // Cross-cutting Phase 2: temple managers previously saw an empty stub (the
  // CommissionsPanel queried by providerId=user.id, but no Commission is ever
  // keyed to a temple). This surfaces the temple's actual payout rows.
  server.get('/payouts', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ payouts: [], total: 0, pendingInr: 0, paidInr: 0 });
    const rows = await prisma.templePayout.findMany({
      where: { templeId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const pending = rows.filter((r) => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
    const paid = rows.filter((r) => r.status === 'completed').reduce((s, r) => s + Number(r.amount), 0);
    return reply.send({
      payouts: rows.map((r) => ({
        id: r.id,
        bookingId: r.bookingId,
        amount: r.amount.toString(),
        status: r.status,
        reference: r.reference,
        processedAt: r.processedAt,
        createdAt: r.createdAt,
      })),
      total: rows.length,
      pendingInr: Math.round(pending * 100) / 100,
      paidInr: Math.round(paid * 100) / 100,
    });
  });


  // ─── CRUD /pujas ────────────────────────────────────────────────────────────
  // Temple manager-authored offerings against the templeId resolved from
  // their TempleProfile. All writes 403 if the user has no matched temple
  // — surfaces the "your profile name doesn't match a Temple row" UX bug
  // instead of silently 404ing on every save.

  function serializeOffering(o: {
    id: string;
    templeId: string;
    pujaTypeId: string;
    priceOverride: { toString(): string } | null;
    nriPrice: { toString(): string } | null;
    assignedPriestId: string | null;
    availableSlots: unknown;
    maxBookingsPerSlot: number;
    isActive: boolean;
  }) {
    return {
      id: o.id,
      templeId: o.templeId,
      pujaTypeId: o.pujaTypeId,
      priceOverride: o.priceOverride ? o.priceOverride.toString() : null,
      nriPrice: o.nriPrice ? o.nriPrice.toString() : null,
      assignedPriestId: o.assignedPriestId,
      availableSlots: o.availableSlots,
      maxBookingsPerSlot: o.maxBookingsPerSlot,
      isActive: o.isActive,
    };
  }

  server.get('/pujas', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ offerings: [] });
    const offerings = await prisma.templePujaOffering.findMany({
      where: { templeId },
      orderBy: { id: 'desc' },
    });
    return reply.send({ offerings: offerings.map(serializeOffering) });
  });

  server.post('/pujas', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) {
      return reply.code(400).send({ error: 'No matched Temple for this manager' });
    }
    const parsed = pujaOfferingCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    try {
      const offering = await prisma.templePujaOffering.create({
        data: {
          templeId,
          pujaTypeId: parsed.data.pujaTypeId,
          priceOverride: parsed.data.priceOverride ?? null,
          nriPrice: parsed.data.nriPrice ?? null,
          assignedPriestId: parsed.data.assignedPriestId ?? null,
          availableSlots: (parsed.data.availableSlots ?? []) as object,
          maxBookingsPerSlot: parsed.data.maxBookingsPerSlot ?? 5,
          isActive: parsed.data.isActive ?? true,
        },
      });
      return reply.code(201).send({ offering: serializeOffering(offering) });
    } catch (err) {
      const e = err as { code?: string };
      if (e.code === 'P2002') {
        return reply.code(409).send({ error: 'This puja type is already offered by your temple.' });
      }
      throw err;
    }
  });

  server.patch('/pujas/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.code(400).send({ error: 'No matched Temple for this manager' });
    const { id } = request.params as { id: string };
    const parsed = pujaOfferingUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.templePujaOffering.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Offering not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this offering.' });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.pujaTypeId !== undefined) data.pujaTypeId = parsed.data.pujaTypeId;
    if (parsed.data.priceOverride !== undefined) data.priceOverride = parsed.data.priceOverride;
    if (parsed.data.nriPrice !== undefined) data.nriPrice = parsed.data.nriPrice;
    if (parsed.data.assignedPriestId !== undefined) data.assignedPriestId = parsed.data.assignedPriestId;
    if (parsed.data.availableSlots !== undefined) data.availableSlots = parsed.data.availableSlots;
    if (parsed.data.maxBookingsPerSlot !== undefined) data.maxBookingsPerSlot = parsed.data.maxBookingsPerSlot;
    if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;
    const offering = await prisma.templePujaOffering.update({ where: { id }, data });
    return reply.send({ offering: serializeOffering(offering) });
  });

  server.delete('/pujas/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.code(400).send({ error: 'No matched Temple for this manager' });
    const { id } = request.params as { id: string };
    const existing = await prisma.templePujaOffering.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Offering not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this offering.' });
    }
    await prisma.templePujaOffering.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // ─── GET /bookings — ALL puja bookings for the manager's temple ─────────────
  // Temple revamp (2026-08-05): managers previously saw only the dashboard's
  // 10 most recent bookings — no list/filter. This is the full booking view so
  // a temple manager can run their seva calendar (the single biggest gap vs
  // temple ERPs like 3ioSetu/Sankalpa which center the booking roster).
  server.get('/bookings', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ bookings: [] });
    const { status, dateFrom, dateTo, limit } = request.query as {
      status?: string; dateFrom?: string; dateTo?: string; limit?: string;
    };
    const where: Record<string, unknown> = { templeId };
    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      if (dateFrom) (where.scheduledDate as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.scheduledDate as Record<string, unknown>).lte = new Date(dateTo);
    }
    const bookings = await prisma.pujaBooking.findMany({
      where: where as never,
      orderBy: [{ scheduledDate: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Number(limit) || 100, 500),
      include: {
        pujaType: { select: { name: true, category: true } },
        priest: { select: { displayName: true } },
        user: { select: { fullName: true, email: true } },
      },
    });
    return reply.send({
      bookings: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        scheduledDate: b.scheduledDate,
        scheduledTimeSlot: b.scheduledTimeSlot,
        priceAmount: b.priceAmount.toString(),
        pujaName: b.pujaType.name,
        pujaCategory: b.pujaType.category,
        priestName: b.priest?.displayName ?? null,
        devoteeName: b.user.fullName,
        devoteeEmail: b.user.email,
        dispatchTier: b.dispatchTier,
        assignedVia: b.assignedVia,
        createdAt: b.createdAt,
      })),
      total: bookings.length,
    });
  });

  // ─── CRUD /darshan ──────────────────────────────────────────────────────────

  function serializeDarshan(s: {
    id: string;
    templeId: string;
    streamKey: string;
    playbackUrl: string;
    status: StreamStatus;
    scheduledStart: Date | null;
    actualStart: Date | null;
    viewerCount: number;
    peakViewers: number;
    isPremium: boolean;
    streamProvider: StreamProvider;
    youtubeVideoId: string | null;
    youtubeChannelId: string | null;
    attribution: string | null;
    title: string | null;
    description: string | null;
    cameraLocation: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: s.id,
      templeId: s.templeId,
      streamKey: s.streamKey,
      playbackUrl: s.playbackUrl,
      status: s.status,
      scheduledStart: s.scheduledStart,
      actualStart: s.actualStart,
      viewerCount: s.viewerCount,
      peakViewers: s.peakViewers,
      isPremium: s.isPremium,
      streamProvider: s.streamProvider,
      youtubeVideoId: s.youtubeVideoId,
      youtubeChannelId: s.youtubeChannelId,
      attribution: s.attribution,
      title: s.title,
      description: s.description,
      cameraLocation: s.cameraLocation,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }

  server.get('/darshan', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.send({ streams: [] });
    const streams = await prisma.liveDarshanStream.findMany({
      where: { templeId },
      orderBy: { createdAt: 'desc' },
    });
    return reply.send({ streams: streams.map(serializeDarshan) });
  });

  server.post('/darshan', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) {
      return reply.code(400).send({ error: 'No matched Temple for this manager' });
    }
    const parsed = darshanCreateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const stream = await prisma.liveDarshanStream.create({
      data: {
        templeId,
        streamKey: parsed.data.streamKey,
        playbackUrl: parsed.data.playbackUrl,
        title: parsed.data.title ?? null,
        description: parsed.data.description ?? null,
        cameraLocation: parsed.data.cameraLocation ?? null,
        streamProvider: parsed.data.streamProvider ?? 'YOUTUBE',
        youtubeVideoId: parsed.data.youtubeVideoId ?? null,
        youtubeChannelId: parsed.data.youtubeChannelId ?? null,
        attribution: parsed.data.attribution ?? null,
        scheduledStart: parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : null,
        isPremium: parsed.data.isPremium ?? false,
        status: parsed.data.status ?? 'offline',
      },
    });
    return reply.code(201).send({ stream: serializeDarshan(stream) });
  });

  server.patch('/darshan/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.code(400).send({ error: 'No matched Temple for this manager' });
    const { id } = request.params as { id: string };
    const parsed = darshanUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.liveDarshanStream.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Stream not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this stream.' });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.streamKey !== undefined) data.streamKey = parsed.data.streamKey;
    if (parsed.data.playbackUrl !== undefined) data.playbackUrl = parsed.data.playbackUrl;
    if (parsed.data.title !== undefined) data.title = parsed.data.title;
    if (parsed.data.description !== undefined) data.description = parsed.data.description;
    if (parsed.data.cameraLocation !== undefined) data.cameraLocation = parsed.data.cameraLocation;
    if (parsed.data.streamProvider !== undefined) data.streamProvider = parsed.data.streamProvider;
    if (parsed.data.youtubeVideoId !== undefined) data.youtubeVideoId = parsed.data.youtubeVideoId;
    if (parsed.data.youtubeChannelId !== undefined) data.youtubeChannelId = parsed.data.youtubeChannelId;
    if (parsed.data.attribution !== undefined) data.attribution = parsed.data.attribution;
    if (parsed.data.scheduledStart !== undefined) {
      data.scheduledStart = parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : null;
    }
    if (parsed.data.isPremium !== undefined) data.isPremium = parsed.data.isPremium;
    if (parsed.data.status !== undefined) data.status = parsed.data.status;
    const stream = await prisma.liveDarshanStream.update({ where: { id }, data });
    return reply.send({ stream: serializeDarshan(stream) });
  });

  server.delete('/darshan/:id', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.code(400).send({ error: 'No matched Temple for this manager' });
    const { id } = request.params as { id: string };
    const existing = await prisma.liveDarshanStream.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Stream not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this stream.' });
    }
    await prisma.liveDarshanStream.delete({ where: { id } });
    return reply.send({ ok: true });
  });

  // PATCH /darshan/:id/status — flip between scheduled/live/ended. The
  // LiveDarshanStream.status enum is offline | live | scheduled; we map
  // the public "ended" verb to offline + clear actualStart, and "live"
  // stamps actualStart if missing. Without these side effects the
  // manager UI would have to call /darshan/:id with a second PATCH.
  server.patch('/darshan/:id/status', { preHandler: [authenticateUser] }, async (request, reply) => {
    const roles = request.currentUser!.roles ?? [];
    if (!roles.includes('TEMPLE_MANAGER')) {
      return reply.code(403).send({ error: 'TEMPLE_MANAGER role required' });
    }
    const templeId = await resolveManagerTempleId(request.currentUser!.id);
    if (!templeId) return reply.code(400).send({ error: 'No matched Temple for this manager' });
    const { id } = request.params as { id: string };
    const parsed = darshanStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() });
    }
    const existing = await prisma.liveDarshanStream.findUnique({ where: { id } });
    if (!existing) return reply.code(404).send({ error: 'Stream not found' });
    if (existing.templeId !== templeId) {
      return reply.code(403).send({ error: 'You do not own this stream.' });
    }
    const data: Record<string, unknown> = {};
    if (parsed.data.status === 'scheduled') {
      data.status = 'scheduled';
    } else if (parsed.data.status === 'live') {
      data.status = 'live';
      if (!existing.actualStart) data.actualStart = new Date();
    } else {
      // ended → offline. Keep actualStart for analytics.
      data.status = 'offline';
    }
    const stream = await prisma.liveDarshanStream.update({ where: { id }, data });
    return reply.send({ stream: serializeDarshan(stream) });
  });
}
