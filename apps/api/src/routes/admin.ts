import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { adminService } from '../services/admin.service.js';
import { prisma } from '../lib/prisma.js';
import type { Prisma } from '@prisma/client';

// ─── Zod Schemas ────────────────────────────────────────────────────────────────

const userQuerySchema = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});

const userUpdateSchema = z.object({
  approved: z.boolean().optional(),
  blocked: z.boolean().optional(),
  roles: z.array(z.enum([
    'DEVOTEE', 'PANDIT', 'STORE_OWNER', 'ASTROLOGER',
    'WELLNESS_INSTRUCTOR', 'GAUSHALA_MANAGER', 'TEMPLE_MANAGER', 'ADMIN',
  ])).optional(),
});

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function adminRoutes(server: FastifyInstance) {
  // All admin routes require authentication + admin role
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /users — List all users with filters ───────────────────────────────

  server.get('/users', { preHandler: adminPreHandlers }, async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const parsed = userQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    }

    const result = await adminService.getUsers({
      role: parsed.data.role,
      status: parsed.data.status,
      search: parsed.data.search,
      page: parsed.data.page ? Number(parsed.data.page) : undefined,
      limit: parsed.data.limit ? Number(parsed.data.limit) : undefined,
    });

    return result;
  });

  // ─── GET /users/:id — User detail with profile ─────────────────────────────

  server.get('/users/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = await adminService.getUserById(id);

    if (!user) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return { user };
  });

  // ─── PATCH /users/:id — Update user (approve, block, roles) ────────────────

  server.patch('/users/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const result = await adminService.updateUser(id, parsed.data);

    if (!result) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return result;
  });

  // ─── GET /dashboard — Platform stats ────────────────────────────────────────

  server.get('/dashboard', { preHandler: adminPreHandlers }, async (request, reply) => {
    const stats = await adminService.getDashboard();
    return stats;
  });

  // ─── GET /revenue — Revenue breakdown ───────────────────────────────────────

  server.get('/revenue', { preHandler: adminPreHandlers }, async (request, reply) => {
    const revenue = await adminService.getRevenue();
    return revenue;
  });

  // ─── GET /pending-approvals — Providers awaiting approval ───────────────────

  server.get('/pending-approvals', { preHandler: adminPreHandlers }, async (request, reply) => {
    const approvals = await adminService.getPendingApprovals();
    return { approvals, total: approvals.length };
  });

  // ─── Existing Temple/Priest/Puja/Content/Booking/Payment CRUD ───────────────
  // Kept from original admin.ts for backward compatibility

  server.get('/temples', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, q } = request.query as {
      page?: string; limit?: string; status?: string; q?: string;
    };
    return { temples: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  server.post('/temples', { preHandler: adminPreHandlers }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    return { message: 'Temple created', temple: body };
  });

  server.patch('/temples/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    return { message: 'Temple updated', templeId: id, updates: body };
  });

  server.delete('/temples/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: 'Temple deleted', templeId: id };
  });

  server.get('/priests', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, q } = request.query as {
      page?: string; limit?: string; status?: string; q?: string;
    };
    return { priests: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  server.post('/priests', { preHandler: adminPreHandlers }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    return { message: 'Priest created', priest: body };
  });

  server.patch('/priests/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    return { message: 'Priest updated', priestId: id, updates: body };
  });

  server.delete('/priests/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: 'Priest deleted', priestId: id };
  });

  server.get('/pujas', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, q } = request.query as { page?: string; limit?: string; q?: string; };
    return { pujas: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  server.post('/pujas', { preHandler: adminPreHandlers }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    return { message: 'Puja type created', puja: body };
  });

  server.patch('/pujas/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    return { message: 'Puja type updated', pujaId: id, updates: body };
  });

  server.delete('/pujas/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: 'Puja type deleted', pujaId: id };
  });

  server.get('/content', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, type, status, q } = request.query as {
      page?: string; limit?: string; type?: string; status?: string; q?: string;
    };
    return { content: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  server.post('/content', { preHandler: adminPreHandlers }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    return { message: 'Content created', content: body };
  });

  server.patch('/content/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    return { message: 'Content updated', contentId: id, updates: body };
  });

  server.delete('/content/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: 'Content deleted', contentId: id };
  });

  // GET /bookings moved to apps/api/src/routes/admin-bookings.ts (M2 layer).
  // Registered separately at /api/v1/admin/bookings prefix in server.ts.

  server.get('/payments', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, dateFrom, dateTo } = request.query as {
      page?: string; limit?: string; status?: string; dateFrom?: string; dateTo?: string;
    };
    return {
      payments: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20,
      filters: { status, dateFrom, dateTo },
    };
  });

  server.post('/users', { preHandler: adminPreHandlers }, async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    return { message: 'User created', user: body };
  });

  server.delete('/users/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    return { message: 'User deleted', userId: id };
  });

  // ─── GET /commissions — paginated commission ledger ─────────────────────────

  const commissionQuerySchema = z.object({
    status: z.enum(['PENDING', 'PAID']).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    providerId: z.string().uuid().optional(),
    page: z.coerce.number().int().positive().default(1),
    pageSize: z.coerce.number().int().positive().max(200).default(20),
  });

  server.get('/commissions', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = commissionQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    }
    const { status, from, to, providerId, page, pageSize } = parsed.data;
    const where: Prisma.CommissionWhereInput = {};
    if (status) where.status = status;
    if (providerId) where.providerId = providerId;
    if (from || to) {
      where.createdAt = {};
      if (from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(from);
      if (to) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(to);
    }
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.commission.count({ where }),
    ]);
    const data = rows.map((c) => ({
      ...c,
      amount: c.amount.toString(),
      percentage: c.percentage.toString(),
    }));
    return { data, page, pageSize, total };
  });

  // ─── Ratings moderation ───────────────────────────────────────────────────
  // The Review model is schema-locked: there is no isHidden column. Until a
  // migration adds one, the "Hide rating" action is a no-op that we log so
  // ops sees the moderator intent. The list endpoint still works.
  const ratingsQuerySchema = z.object({
    stars: z.string().optional(),
    providerId: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(50),
  });

  server.get('/ratings', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = ratingsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    }
    const { stars, providerId, page, pageSize } = parsed.data;
    const where: Prisma.ReviewWhereInput = {};
    if (stars) {
      const n = Number(stars);
      if (Number.isFinite(n) && n >= 1 && n <= 5) where.rating = n;
    }
    if (providerId) where.providerId = providerId;
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      prisma.review.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.review.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        id: r.id,
        userId: r.userId,
        providerId: r.providerId,
        providerType: r.providerType,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        // isHidden column not in schema yet — always false until migration.
        isHidden: false,
      })),
      page,
      pageSize,
      total,
    };
  });

  server.post('/ratings/:id/hide', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    // Schema-locked: no isHidden column on reviews. We log the moderator
    // intent so ops can act manually until the migration lands.
    server.log.warn(
      { reviewId: id, moderator: request.currentUser?.id },
      'Admin attempted to hide rating but isHidden column is not in schema. Skipped.',
    );
    return reply.send({
      ok: false,
      skipped: true,
      reason: 'Review.isHidden column not present in current schema. Logged moderator intent.',
    });
  });
}
