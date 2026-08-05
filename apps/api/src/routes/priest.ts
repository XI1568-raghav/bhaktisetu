import { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { priestService } from '../services/priest.service.js';
import { dispatchService } from '../services/dispatch.service.js';
import { cancellationService } from '../services/cancellation.service.js';
import { prisma } from '../lib/prisma.js';
import { presignR2Upload, r2 } from '../lib/r2.js';
import { BookingStatus, PayoutStatus } from '@prisma/client';

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

export const __testing = {
  priestOfferingCreateSchema,
  priestOfferingUpdateSchema,
};

const MAX_VIDEO_MB = 200;
const ALLOWED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);

// Pagination clamp — without this, an attacker (or a buggy client) can
// request limit=100000 and force a full-table scrape into memory.
const bookingsQuerySchema = z.object({
  status: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

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
      const priestId = await getPriestId(request.currentUser!.id);
      const dashboard = await priestService.getDashboard(priestId);
      return dashboard;
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── GET /bookings ──────────────────────────────────────────────────────────

  server.get('/bookings', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const parsed = bookingsQuerySchema.safeParse(request.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
      }
      const { status, dateFrom, dateTo, page, limit } = parsed.data;

      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.getAssignedBookings(priestId, {
        status: status as BookingStatus | undefined,
        dateFrom,
        dateTo,
        page,
        limit,
      });

      return result;
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
    }
  });

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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
        if (!r2.enabled) {
          return reply.code(503).send({
            error: 'Storage backend not configured.',
            message:
              'Set R2_ACCOUNT_ID/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY (preferred) or SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY.',
          });
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
        if (booking.status !== 'completed') {
          return reply.code(409).send({
            error: `Video proof can only be uploaded for bookings in "completed" status. Current: "${booking.status}".`,
          });
        }

        const ext = (body.ext ?? contentType.split('/')[1] ?? 'mp4').replace(/[^a-z0-9]/gi, '').slice(0, 6);
        const rand = randomBytes(6).toString('hex');
        const key = `booking-proofs/${id}/${Date.now()}-${rand}.${ext}`;

        const signed = await presignR2Upload({ key, contentType, expiresInSec: 300 });
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
        reply.code(400).send({ error: err.message });
      }
    }
  );

  // ─── POST /bookings/:id/video ───────────────────────────────────────────────

  server.post('/bookings/:id/video', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { videoUrl } = request.body as { videoUrl: string };

      if (!videoUrl || typeof videoUrl !== 'string') {
        return reply.code(400).send({ error: 'videoUrl is required.' });
      }

      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.uploadVideoProof(id, priestId, videoUrl);
      return { message: 'Video proof uploaded successfully.', booking: result };
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── GET /payouts ───────────────────────────────────────────────────────────

  server.get('/payouts', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const { status, page, limit } = request.query as {
        status?: string;
        page?: string;
        limit?: string;
      };

      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.getPayoutHistory(priestId, {
        status: status as PayoutStatus | undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      return result;
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── GET /profile ───────────────────────────────────────────────────────────

  server.get('/profile', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const priestId = await getPriestId(request.currentUser!.id);
      const profile = await priestService.getProfile(priestId);
      return profile;
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── PATCH /profile ─────────────────────────────────────────────────────────

  server.patch('/profile', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const body = request.body as {
        displayName?: string;
        bio?: string;
        languages?: string[];
        specializations?: string[];
        experienceYears?: number;
        avatarUrl?: string;
      };

      const priestId = await getPriestId(request.currentUser!.id);
      const updated = await priestService.updateProfile(priestId, body);
      return { message: 'Profile updated successfully.', profile: updated };
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
    }
  });

  // ─── GET /reviews ───────────────────────────────────────────────────────────
  // Reviews authored by devotees about this priest. The Review.providerId
  // column stores the User UUID of the provider (not Priest.id) — mirrors
  // the ratings.ts convention. Empty array when none.

  server.get('/reviews', { preHandler: priestAuth }, async (request, reply) => {
    try {
      const userId = request.currentUser!.id;
      const rows = await prisma.review.findMany({
        where: { providerId: userId, providerType: 'PANDIT' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      return reply.send({
        reviews: rows.map((r) => ({
          id: r.id,
          userId: r.userId,
          providerId: r.providerId,
          providerType: r.providerType,
          rating: r.rating,
          comment: r.comment,
          createdAt: r.createdAt.toISOString(),
        })),
        total: rows.length,
      });
    } catch (err: any) {
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
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
      reply.code(400).send({ error: err.message });
    }
  });
}
