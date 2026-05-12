import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BookingStatus } from '@prisma/client';
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

function hasTempleManagerRole(req: { currentUser?: { roles?: string[] } }): boolean {
  return req.currentUser?.roles?.includes('TEMPLE_MANAGER') ?? false;
}

type OrgRole = 'OWNER' | 'ADMIN' | 'MEMBER';

/**
 * Layer AM gate. If the temple is linked to an Org (org_id set), only
 * OWNER/ADMIN of that org may edit. For legacy unlinked temples, falls
 * back to the existing TEMPLE_MANAGER role check so we don't break
 * trusts that haven't migrated yet.
 */
async function userCanEditTemple(
  templeId: string,
  userId: string,
  hasManagerRole: boolean,
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ org_id: string | null }[]>(
    `SELECT org_id FROM temples WHERE id = $1::uuid LIMIT 1`,
    templeId,
  );
  const orgId = rows[0]?.org_id;
  if (!orgId) return hasManagerRole;
  const member = await prisma.$queryRawUnsafe<{ role: OrgRole }[]>(
    `SELECT role FROM org_members WHERE org_id = $1::uuid AND user_id = $2::uuid LIMIT 1`,
    orgId,
    userId,
  );
  const role = member[0]?.role;
  return role === 'OWNER' || role === 'ADMIN';
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
      const allowed = await userCanEditTemple(temple.id, request.currentUser!.id, hasManager);
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
      const allowed = await userCanEditTemple(tRow.id, request.currentUser!.id, hasManager);
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
}
