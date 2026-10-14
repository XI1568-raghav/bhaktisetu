import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { addStandardOfferings } from '../services/temple-standard-offerings.service.js';
import { doneeTaxSchema, readDoneeTax, taxInfoView, writeDoneeTax } from '../lib/donee-tax.js';

/**
 * Admin temple editor: GET /temples/:id, PATCH /temples/:id and
 * POST /temples/:id/standard-offerings, registered on the /admin prefix by
 * routes/admin.ts (the list and create routes stay there).
 *
 * Why it exists: temples created from a temple-manager profile
 * (admin-temple-links) are born with lat/lng 0, an empty pincode and status
 * pending_review. Until an admin fixes and verifies them devotees cannot book
 * (booking.service requires Temple.isVerified). PATCH used to answer 501.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PINCODE_RE = /^\d{6}$/;

const TEMPLE_STATUSES = ['active', 'inactive', 'pending_review'] as const;

/** Editable fields only. Unknown keys are rejected (strict), never silently dropped. */
export const templeEditSchema = z
  .object({
    name: z.string().trim().min(2).max(200),
    description: z.string().trim().min(2).max(5000),
    deityPrimary: z.string().trim().min(2).max(120),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().min(1).max(120),
    addressLine: z.string().trim().min(2).max(300),
    pincode: z.string().trim().regex(PINCODE_RE, 'pincode must be exactly 6 digits'),
    lat: z.number().min(-90, 'lat must be between -90 and 90').max(90, 'lat must be between -90 and 90'),
    lng: z
      .number()
      .min(-180, 'lng must be between -180 and 180')
      .max(180, 'lng must be between -180 and 180'),
    isVerified: z.boolean(),
    status: z.enum(TEMPLE_STATUSES),
  })
  .partial()
  .strict();

export type TempleEdit = z.infer<typeof templeEditSchema>;

export interface TempleFlagInput {
  lat: number;
  lng: number;
  pincode: string;
}

/** Data-quality flags an operator should see. A temple at 0,0 is "Null Island". */
export function templeFlags(t: TempleFlagInput): string[] {
  const flags: string[] = [];
  if (t.lat === 0 && t.lng === 0) flags.push('coordinates_missing');
  if (!PINCODE_RE.test(t.pincode ?? '')) flags.push('pincode_invalid');
  return flags;
}

const EDITOR_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  deityPrimary: true,
  city: true,
  state: true,
  addressLine: true,
  pincode: true,
  lat: true,
  lng: true,
  isVerified: true,
  verificationDate: true,
  status: true,
  updatedAt: true,
  _count: { select: { pujaOfferings: { where: { isActive: true } } } },
} as const;

type EditorRow = Prisma.TempleGetPayload<{ select: typeof EDITOR_SELECT }>;

function shape(row: EditorRow) {
  const { _count, ...rest } = row;
  return {
    ...rest,
    activeOfferings: _count?.pujaOfferings ?? 0,
    flags: templeFlags(row),
  };
}

export function registerAdminTempleEditor(
  server: FastifyInstance,
  preHandler: preHandlerHookHandler[],
) {
  server.get('/temples/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(404).send({ error: 'Temple not found' });
    try {
      const row = await prisma.temple.findUnique({ where: { id }, select: EDITOR_SELECT });
      if (!row) return reply.code(404).send({ error: 'Temple not found' });
      return { temple: shape(row) };
    } catch (err) {
      request.log.error({ err }, 'admin GET /temples/:id failed');
      return reply.code(500).send({ error: 'Failed to load temple' });
    }
  });

  // Donee tax identifiers for donation receipts (PAN + 80G registration).
  server.get('/temples/:id/tax-info', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(404).send({ error: 'Temple not found' });
    const exists = await prisma.temple.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return reply.code(404).send({ error: 'Temple not found' });
    return taxInfoView(await readDoneeTax('temple', id));
  });

  server.put('/temples/:id/tax-info', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(404).send({ error: 'Temple not found' });
    const parsed = doneeTaxSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    if (parsed.data.pan === undefined && parsed.data.regn80g === undefined) {
      return reply.code(400).send({ error: 'Nothing to update' });
    }
    const exists = await prisma.temple.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return reply.code(404).send({ error: 'Temple not found' });
    await writeDoneeTax('temple', id, parsed.data);
    request.log.info({ templeId: id, by: request.currentUser?.id }, 'admin set temple tax info');
    return taxInfoView(await readDoneeTax('temple', id));
  });

  server.patch('/temples/:id', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(404).send({ error: 'Temple not found' });

    const parsed = templeEditSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const patch = parsed.data;
    if (Object.keys(patch).length === 0) {
      return reply.code(400).send({ error: 'Nothing to update' });
    }

    try {
      const before = await prisma.temple.findUnique({ where: { id }, select: EDITOR_SELECT });
      if (!before) return reply.code(404).send({ error: 'Temple not found' });

      const merged = { ...before, ...patch };

      // Verifying is the act that lets devotees book, so it requires a real
      // location. A temple left at 0,0 or with a broken pincode cannot be
      // verified, but the same PATCH may fix the fields and verify at once.
      // The same holds for editing the location of a temple that is ALREADY
      // verified: moving it back to 0,0 or blanking the pincode while it stays
      // bookable was accepted (role pass 2026-10-07). Un-verify it first.
      const touchesLocation =
        patch.lat !== undefined || patch.lng !== undefined || patch.pincode !== undefined;
      if (patch.isVerified === true || (merged.isVerified === true && patch.isVerified !== false && touchesLocation)) {
        const problems = templeFlags(merged);
        if (problems.length > 0) {
          return reply.code(400).send({
            error: 'Cannot verify this temple until its location is fixed',
            flags: problems,
          });
        }
      }

      const data: Prisma.TempleUpdateInput = { ...patch };
      if (patch.isVerified === true) {
        if (patch.status === undefined) data.status = 'active';
        if (!before.verificationDate) data.verificationDate = new Date();
      } else if (patch.isVerified === false && patch.status === undefined) {
        data.status = 'pending_review';
      }

      const after = await prisma.temple.update({ where: { id }, data, select: EDITOR_SELECT });

      // Audit trail. There is no audit table and prod migrations are manual, so
      // the before/after diff of every changed field goes to the structured log
      // (and back to the caller) with the acting admin.
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of Object.keys(data) as (keyof typeof data)[]) {
        const from = (before as Record<string, unknown>)[key as string];
        const to = (after as Record<string, unknown>)[key as string];
        if (from instanceof Date || to instanceof Date
          ? String(from) !== String(to)
          : from !== to) {
          changes[key as string] = { from, to };
        }
      }
      request.log.info(
        {
          audit: 'admin.temple.update',
          templeId: id,
          adminId: request.currentUser?.id ?? null,
          adminEmail: request.currentUser?.email ?? null,
          changes,
        },
        'admin updated temple',
      );

      return { message: 'Temple updated', temple: shape(after), changes };
    } catch (err) {
      request.log.error({ err }, 'admin PATCH /temples/:id failed');
      return reply.code(500).send({ error: 'Failed to update temple' });
    }
  });

  server.post('/temples/:id/standard-offerings', { preHandler }, async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!UUID_RE.test(id)) return reply.code(404).send({ error: 'Temple not found' });
    try {
      const result = await addStandardOfferings(id);
      if (!result) return reply.code(404).send({ error: 'Temple not found' });
      request.log.info(
        {
          audit: 'admin.temple.standard-offerings',
          templeId: id,
          adminId: request.currentUser?.id ?? null,
          ...result,
        },
        'admin added standard offerings',
      );
      return { message: result.added > 0 ? 'Standard offerings added' : 'Nothing to add', ...result };
    } catch (err) {
      request.log.error({ err }, 'admin POST /temples/:id/standard-offerings failed');
      return reply.code(500).send({ error: 'Failed to add standard offerings' });
    }
  });
}
