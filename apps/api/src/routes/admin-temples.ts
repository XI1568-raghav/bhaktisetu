import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

// Admin temple timing correction routes.
//
// Mounted under /api/v1/admin/temple-timings (separate from the legacy
// /admin/temples stub in admin.ts). All routes are gated by the standard
// adminPreHandlers (authenticateUser + requireRole('admin')).
//
// Temple.timingInfo is an untyped Prisma Json column. We validate the shape
// at the boundary (regularHours = HH:MM - HH:MM map) and persist as JSON.
// Audit history: best-effort lookup of an optional TempleTimingAuditLog
// table via a $queryRaw call. If the table doesn't exist, we silently
// return an empty history and log to server.log on every PATCH.

const HHMM_RANGE = /^([01]\d|2[0-3]):[0-5]\d\s*-\s*([01]\d|2[0-3]):[0-5]\d$/;

const timingsBodySchema = z.object({
  regularHours: z.record(z.string().regex(HHMM_RANGE, 'Expected "HH:MM - HH:MM"')),
  closedOn: z.string().optional(),
  specialDays: z.string().optional(),
});

type TimingInfo = {
  regularHours?: Record<string, string>;
  closedOn?: string;
  specialDays?: string;
} & Record<string, unknown>;

interface AuditRow {
  id: string;
  temple_id: string;
  changed_by: string | null;
  before: unknown;
  after: unknown;
  created_at: Date;
}

async function loadAuditHistory(templeId: string): Promise<AuditRow[]> {
  try {
    const rows = await prisma.$queryRawUnsafe<AuditRow[]>(
      'SELECT id, temple_id, changed_by, before, after, created_at FROM "TempleTimingAuditLog" WHERE temple_id = $1 ORDER BY created_at DESC LIMIT 5',
      templeId
    );
    return rows ?? [];
  } catch {
    return [];
  }
}

async function tryWriteAudit(
  templeId: string,
  changedBy: string | null,
  before: unknown,
  after: unknown
): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      'INSERT INTO "TempleTimingAuditLog" (id, temple_id, changed_by, before, after, created_at) VALUES (gen_random_uuid(), $1, $2, $3::jsonb, $4::jsonb, NOW())',
      templeId,
      changedBy,
      JSON.stringify(before ?? null),
      JSON.stringify(after ?? null)
    );
  } catch {
    // Table not migrated; silently no-op. The PATCH handler logs to server.log.
  }
}

export async function adminTemplesRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /admin/temple-timings ────────────────────────────────────────────
  server.get('/', { preHandler: adminPreHandlers }, async (request, _reply) => {
    try {
      const temples = await prisma.temple.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          state: true,
          timingInfo: true,
          updatedAt: true,
        },
        orderBy: { name: 'asc' },
      });
      return { temples };
    } catch (err) {
      request.log.warn({ err }, 'admin temples list failed');
      return { temples: [] };
    }
  });

  // ─── GET /admin/temple-timings/:slug ──────────────────────────────────────
  server.get<{ Params: { slug: string } }>(
    '/:slug',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      try {
        const temple = await prisma.temple.findUnique({
          where: { slug: request.params.slug },
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            state: true,
            timingInfo: true,
            updatedAt: true,
          },
        });
        if (!temple) return reply.code(404).send({ error: 'Temple not found' });
        const history = await loadAuditHistory(temple.id);
        return { temple, history };
      } catch (err) {
        request.log.error({ err }, 'admin temple detail failed');
        return reply.code(500).send({ error: 'Failed to fetch temple' });
      }
    }
  );

  // ─── PATCH /admin/temple-timings/:slug ────────────────────────────────────
  server.patch<{ Params: { slug: string } }>(
    '/:slug',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = timingsBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({
          error: 'Invalid body',
          details: parsed.error.flatten(),
        });
      }
      try {
        const existing = await prisma.temple.findUnique({
          where: { slug: request.params.slug },
          select: { id: true, timingInfo: true },
        });
        if (!existing) return reply.code(404).send({ error: 'Temple not found' });

        const merged: TimingInfo = {
          ...(typeof existing.timingInfo === 'object' && existing.timingInfo !== null
            ? (existing.timingInfo as Record<string, unknown>)
            : {}),
          regularHours: parsed.data.regularHours,
        };
        if (parsed.data.closedOn !== undefined) merged.closedOn = parsed.data.closedOn;
        if (parsed.data.specialDays !== undefined) merged.specialDays = parsed.data.specialDays;

        const updated = await prisma.temple.update({
          where: { slug: request.params.slug },
          data: { timingInfo: merged as unknown as object },
          select: {
            id: true,
            slug: true,
            name: true,
            city: true,
            state: true,
            timingInfo: true,
            updatedAt: true,
          },
        });

        const changedBy = request.currentUser?.email ?? request.currentUser?.id ?? null;
        await tryWriteAudit(existing.id, changedBy, existing.timingInfo, merged);
        request.log.info(
          { templeId: existing.id, slug: request.params.slug, changedBy },
          'admin temple timings updated'
        );

        return { temple: updated };
      } catch (err) {
        request.log.error({ err }, 'admin temple timings update failed');
        return reply.code(500).send({ error: 'Failed to update timings' });
      }
    }
  );
}
