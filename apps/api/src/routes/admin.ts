import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { adminService } from '../services/admin.service.js';

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

  server.get('/bookings', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, templeId, priestId, dateFrom, dateTo } = request.query as {
      page?: string; limit?: string; status?: string; templeId?: string; priestId?: string; dateFrom?: string; dateTo?: string;
    };
    return {
      bookings: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20,
      filters: { status, templeId, priestId, dateFrom, dateTo },
    };
  });

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
}
