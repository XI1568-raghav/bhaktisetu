import { FastifyInstance } from 'fastify';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { priestService } from '../services/priest.service.js';
import { prisma } from '../lib/prisma.js';
import { BookingStatus, PayoutStatus } from '@prisma/client';

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
      const { status, dateFrom, dateTo, page, limit } = request.query as {
        status?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: string;
        limit?: string;
      };

      const priestId = await getPriestId(request.currentUser!.id);
      const result = await priestService.getAssignedBookings(priestId, {
        status: status as BookingStatus | undefined,
        dateFrom,
        dateTo,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
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
