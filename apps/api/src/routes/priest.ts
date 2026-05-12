import { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { priestService } from '../services/priest.service.js';
import { prisma } from '../lib/prisma.js';
import { presignR2Upload, r2 } from '../lib/r2.js';
import { BookingStatus, PayoutStatus } from '@prisma/client';

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
   */
  async function getPriestId(userId: string): Promise<string> {
    const priest = await prisma.priest.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!priest) {
      throw new Error('Priest account not found.');
    }
    return priest.id;
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
}
