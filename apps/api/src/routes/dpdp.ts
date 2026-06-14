import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { authenticateUser, requireRole } from '../middlewares/auth.js';

/**
 * DPDP (Digital Personal Data Protection Act, 2023) compliance surface.
 *
 * Roadmap item R-Q3-L-001 — "DPDP user-rights audit — DSAR endpoint +
 * consent log + 30-day SLA + counsel sign-off".
 *
 * Three surfaces:
 *
 *   1. POST   /api/v1/dpdp/dsar          (authed user)
 *        File a Data Subject Access Request. One of:
 *          - access   — export everything we hold on the caller
 *          - erasure  — request account + data deletion
 *          - rectify  — flag a field as incorrect; ops corrects manually
 *          - portability — same as access but JSON-only machine-readable
 *        Creates a `dsar_requests` row with sla_deadline = now + 30 days
 *        (DPDP §13 calls for "reasonable time"; we pin 30d as published SLA).
 *
 *   2. GET    /api/v1/dpdp/dsar/mine     (authed user)
 *        List the caller's own DSAR history with status + resolved_at.
 *
 *   3. POST   /api/v1/dpdp/consent       (authed user)
 *        Record a consent event (granted / withdrawn) for a specific
 *        processing purpose (marketing_email, whatsapp, analytics, etc).
 *        Append-only — never updates a prior row. The latest row per
 *        (user_id, purpose) is the current consent state.
 *
 *   4. GET    /api/v1/dpdp/consent/mine  (authed user)
 *        Return the caller's current consent state per purpose
 *        (latest event collapsed per purpose).
 *
 *   5. GET    /api/v1/admin/dpdp/dsar    (admin only)
 *        Ops dashboard — list DSARs sorted by sla_deadline asc so the
 *        oldest at-risk ones float to top. Counsel sign-off workflow is
 *        ops-manual: admin reads request, resolves in DB via PATCH below.
 *
 *   6. PATCH  /api/v1/admin/dpdp/dsar/:id (admin only)
 *        Mark a DSAR as resolved with optional resolution note. Sets
 *        resolved_at = now() and status = 'resolved' | 'rejected'.
 *
 * Schema (consent_log + dsar_requests) is replayed in ensure-schema.ts
 * so Render's start-command bypass doesn't lose the tables.
 *
 * Counsel sign-off: tracked out-of-band in
 * docs/legal/R-Q3-L-001-handoff.md. Founder pastes signed counsel memo
 * URL into the doc when received; this code surface is operational.
 */

const dsarKindEnum = z.enum(['access', 'erasure', 'rectify', 'portability']);
const dsarStatusEnum = z.enum(['pending', 'in_progress', 'resolved', 'rejected']);
const consentPurposeEnum = z.enum([
  'marketing_email',
  'marketing_whatsapp',
  'marketing_sms',
  'analytics',
  'cookies_nonessential',
  'data_sharing_partner',
  'profile_visibility',
]);
const consentActionEnum = z.enum(['granted', 'withdrawn']);

const dsarFileSchema = z.object({
  kind: dsarKindEnum,
  note: z.string().max(2000).optional(),
});

const dsarListSchema = z.object({
  status: dsarStatusEnum.optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const dsarResolveSchema = z.object({
  status: z.enum(['resolved', 'rejected']),
  resolutionNote: z.string().max(2000).optional(),
});

const consentRecordSchema = z.object({
  purpose: consentPurposeEnum,
  action: consentActionEnum,
  source: z.string().max(120).optional(),
});

export const __testing = {
  dsarFileSchema,
  dsarListSchema,
  dsarResolveSchema,
  consentRecordSchema,
  dsarKindEnum,
  consentPurposeEnum,
};

const DSAR_SLA_DAYS = 30;

type RawRow = Record<string, unknown>;

function rowGet<T = unknown>(row: RawRow, key: string): T | undefined {
  if (!row) return undefined;
  return row[key] as T | undefined;
}

export async function dpdpRoutes(server: FastifyInstance) {
  // ─── POST /dsar — user files a DSAR ─────────────────────────────────────
  server.post('/dsar', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = dsarFileSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', issues: parsed.error.flatten() });
    }
    const { kind, note } = parsed.data;
    const userId = request.currentUser!.id;

    try {
      const rows = (await prisma.$queryRawUnsafe(
        `INSERT INTO "dsar_requests" ("user_id", "kind", "note", "status", "sla_deadline")
         VALUES ($1::uuid, $2, $3, 'pending', now() + ($4 || ' days')::interval)
         RETURNING "id", "kind", "status", "sla_deadline", "created_at"`,
        userId,
        kind,
        note ?? null,
        String(DSAR_SLA_DAYS),
      )) as RawRow[];
      const row = rows[0] ?? {};
      return reply.code(201).send({
        id: rowGet<string>(row, 'id'),
        kind: rowGet<string>(row, 'kind'),
        status: rowGet<string>(row, 'status'),
        slaDeadline: rowGet(row, 'sla_deadline'),
        createdAt: rowGet(row, 'created_at'),
        slaDays: DSAR_SLA_DAYS,
      });
    } catch (err) {
      request.log.error({ err: err instanceof Error ? err.message : String(err) }, 'dsar.file failed');
      return reply.code(500).send({ error: 'Failed to file DSAR' });
    }
  });

  // ─── GET /dsar/mine — caller lists own DSARs ────────────────────────────
  server.get('/dsar/mine', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    try {
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT "id", "kind", "status", "note", "sla_deadline", "resolved_at",
                "resolution_note", "created_at"
         FROM "dsar_requests"
         WHERE "user_id" = $1::uuid
         ORDER BY "created_at" DESC
         LIMIT 100`,
        userId,
      )) as RawRow[];
      return reply.send({
        total: rows.length,
        requests: rows.map((r) => ({
          id: rowGet<string>(r, 'id'),
          kind: rowGet<string>(r, 'kind'),
          status: rowGet<string>(r, 'status'),
          note: rowGet<string>(r, 'note'),
          slaDeadline: rowGet(r, 'sla_deadline'),
          resolvedAt: rowGet(r, 'resolved_at'),
          resolutionNote: rowGet<string>(r, 'resolution_note'),
          createdAt: rowGet(r, 'created_at'),
        })),
      });
    } catch (err) {
      request.log.error({ err: err instanceof Error ? err.message : String(err) }, 'dsar.mine failed');
      return reply.code(500).send({ error: 'Failed to load DSARs' });
    }
  });

  // ─── POST /consent — append-only consent event ──────────────────────────
  server.post('/consent', { preHandler: [authenticateUser] }, async (request, reply) => {
    const parsed = consentRecordSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', issues: parsed.error.flatten() });
    }
    const { purpose, action, source } = parsed.data;
    const userId = request.currentUser!.id;
    const ip = request.ip ?? null;
    const ua = request.headers['user-agent'] ?? null;

    try {
      const rows = (await prisma.$queryRawUnsafe(
        `INSERT INTO "consent_log" ("user_id", "purpose", "action", "source", "ip_address", "user_agent")
         VALUES ($1::uuid, $2, $3, $4, $5, $6)
         RETURNING "id", "purpose", "action", "source", "created_at"`,
        userId,
        purpose,
        action,
        source ?? null,
        ip,
        ua,
      )) as RawRow[];
      const row = rows[0] ?? {};
      return reply.code(201).send({
        id: rowGet<string>(row, 'id'),
        purpose: rowGet<string>(row, 'purpose'),
        action: rowGet<string>(row, 'action'),
        source: rowGet<string>(row, 'source'),
        createdAt: rowGet(row, 'created_at'),
      });
    } catch (err) {
      request.log.error({ err: err instanceof Error ? err.message : String(err) }, 'consent.record failed');
      return reply.code(500).send({ error: 'Failed to record consent' });
    }
  });

  // ─── GET /consent/mine — current state per purpose ──────────────────────
  server.get('/consent/mine', { preHandler: [authenticateUser] }, async (request, reply) => {
    const userId = request.currentUser!.id;
    try {
      // Latest-per-purpose: DISTINCT ON works in Postgres only.
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT DISTINCT ON ("purpose")
                "purpose", "action", "source", "created_at"
         FROM "consent_log"
         WHERE "user_id" = $1::uuid
         ORDER BY "purpose", "created_at" DESC`,
        userId,
      )) as RawRow[];
      return reply.send({
        consents: rows.map((r) => ({
          purpose: rowGet<string>(r, 'purpose'),
          action: rowGet<string>(r, 'action'),
          source: rowGet<string>(r, 'source'),
          createdAt: rowGet(r, 'created_at'),
        })),
      });
    } catch (err) {
      request.log.error({ err: err instanceof Error ? err.message : String(err) }, 'consent.mine failed');
      return reply.code(500).send({ error: 'Failed to load consent state' });
    }
  });

  // ─── GET /admin/dsar — ops dashboard, oldest SLA first ──────────────────
  server.get(
    '/admin/dsar',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      const parsed = dsarListSchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', issues: parsed.error.flatten() });
      }
      const { status, limit, offset } = parsed.data;

      try {
        const where = status ? `WHERE "status" = $3` : '';
        const args: unknown[] = [limit, offset];
        if (status) args.push(status);

        const rows = (await prisma.$queryRawUnsafe(
          `SELECT "id", "user_id", "kind", "status", "note", "sla_deadline",
                  "resolved_at", "resolution_note", "created_at",
                  (now() > "sla_deadline" AND "resolved_at" IS NULL) AS "sla_breached"
           FROM "dsar_requests"
           ${where}
           ORDER BY ("resolved_at" IS NULL) DESC, "sla_deadline" ASC
           LIMIT $1::int OFFSET $2::int`,
          ...args,
        )) as RawRow[];

        const countRows = (await prisma.$queryRawUnsafe(
          status
            ? `SELECT COUNT(*)::int AS "n" FROM "dsar_requests" WHERE "status" = $1`
            : `SELECT COUNT(*)::int AS "n" FROM "dsar_requests"`,
          ...(status ? [status] : []),
        )) as RawRow[];
        const total = Number(rowGet<number>(countRows[0] ?? {}, 'n') ?? 0);

        return reply.send({
          total,
          limit,
          offset,
          requests: rows.map((r) => ({
            id: rowGet<string>(r, 'id'),
            userId: rowGet<string>(r, 'user_id'),
            kind: rowGet<string>(r, 'kind'),
            status: rowGet<string>(r, 'status'),
            note: rowGet<string>(r, 'note'),
            slaDeadline: rowGet(r, 'sla_deadline'),
            resolvedAt: rowGet(r, 'resolved_at'),
            resolutionNote: rowGet<string>(r, 'resolution_note'),
            createdAt: rowGet(r, 'created_at'),
            slaBreached: rowGet<boolean>(r, 'sla_breached') ?? false,
          })),
        });
      } catch (err) {
        request.log.error({ err: err instanceof Error ? err.message : String(err) }, 'dsar.admin.list failed');
        return reply.code(500).send({ error: 'Failed to load DSARs' });
      }
    },
  );

  // ─── PATCH /admin/dsar/:id — resolve / reject ───────────────────────────
  server.patch<{ Params: { id: string } }>(
    '/admin/dsar/:id',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (request, reply) => {
      const parsed = dsarResolveSchema.safeParse(request.body ?? {});
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', issues: parsed.error.flatten() });
      }
      const { status, resolutionNote } = parsed.data;
      const id = request.params.id;
      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return reply.code(400).send({ error: 'Invalid id' });
      }

      try {
        const rows = (await prisma.$queryRawUnsafe(
          `UPDATE "dsar_requests"
           SET "status" = $1, "resolution_note" = $2, "resolved_at" = now()
           WHERE "id" = $3::uuid
           RETURNING "id", "status", "resolved_at", "resolution_note"`,
          status,
          resolutionNote ?? null,
          id,
        )) as RawRow[];
        if (rows.length === 0) {
          return reply.code(404).send({ error: 'DSAR not found' });
        }
        const row = rows[0]!;
        return reply.send({
          id: rowGet<string>(row, 'id'),
          status: rowGet<string>(row, 'status'),
          resolvedAt: rowGet(row, 'resolved_at'),
          resolutionNote: rowGet<string>(row, 'resolution_note'),
        });
      } catch (err) {
        request.log.error({ err: err instanceof Error ? err.message : String(err) }, 'dsar.admin.resolve failed');
        return reply.code(500).send({ error: 'Failed to resolve DSAR' });
      }
    },
  );
}
