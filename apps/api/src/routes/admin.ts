import { FastifyInstance } from 'fastify';

export async function adminRoutes(server: FastifyInstance) {
  // GET /dashboard - Admin dashboard overview
  server.get('/dashboard', async (request, reply) => {
    // TODO: verify admin role, aggregate platform stats
    return {
      totalUsers: 0,
      totalTemples: 0,
      totalPriests: 0,
      totalBookings: 0,
      totalRevenue: 0,
      activeSubscriptions: 0,
      recentBookings: [],
      recentPayments: [],
    };
  });

  // ----- Temples CRUD -----

  // GET /temples - List all temples (admin view)
  server.get('/temples', async (request, reply) => {
    const { page, limit, status, q } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      q?: string;
    };
    return { temples: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  // POST /temples - Create a new temple
  server.post('/temples', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    // TODO: validate input, create temple record
    return { message: 'Temple created', temple: body };
  });

  // PATCH /temples/:id - Update a temple
  server.patch('/temples/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    // TODO: update temple record
    return { message: 'Temple updated', templeId: id, updates: body };
  });

  // DELETE /temples/:id - Delete a temple
  server.delete('/temples/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: soft-delete temple
    return { message: 'Temple deleted', templeId: id };
  });

  // ----- Priests CRUD -----

  // GET /priests - List all priests
  server.get('/priests', async (request, reply) => {
    const { page, limit, status, q } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      q?: string;
    };
    return { priests: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  // POST /priests - Add a new priest
  server.post('/priests', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    // TODO: create priest record, send invitation
    return { message: 'Priest created', priest: body };
  });

  // PATCH /priests/:id - Update a priest
  server.patch('/priests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    // TODO: update priest record
    return { message: 'Priest updated', priestId: id, updates: body };
  });

  // DELETE /priests/:id - Remove a priest
  server.delete('/priests/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: soft-delete priest
    return { message: 'Priest deleted', priestId: id };
  });

  // ----- Pujas CRUD -----

  // GET /pujas - List all puja types (admin view)
  server.get('/pujas', async (request, reply) => {
    const { page, limit, q } = request.query as {
      page?: string;
      limit?: string;
      q?: string;
    };
    return { pujas: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  // POST /pujas - Create a new puja type
  server.post('/pujas', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    // TODO: validate input, create puja type
    return { message: 'Puja type created', puja: body };
  });

  // PATCH /pujas/:id - Update a puja type
  server.patch('/pujas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    // TODO: update puja type
    return { message: 'Puja type updated', pujaId: id, updates: body };
  });

  // DELETE /pujas/:id - Delete a puja type
  server.delete('/pujas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: soft-delete puja type
    return { message: 'Puja type deleted', pujaId: id };
  });

  // ----- Content CRUD -----

  // GET /content - List all content (admin view)
  server.get('/content', async (request, reply) => {
    const { page, limit, type, status, q } = request.query as {
      page?: string;
      limit?: string;
      type?: string;
      status?: string;
      q?: string;
    };
    return { content: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  // POST /content - Create new content
  server.post('/content', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    // TODO: validate input, create content record
    return { message: 'Content created', content: body };
  });

  // PATCH /content/:id - Update content
  server.patch('/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    // TODO: update content record
    return { message: 'Content updated', contentId: id, updates: body };
  });

  // DELETE /content/:id - Delete content
  server.delete('/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: soft-delete content
    return { message: 'Content deleted', contentId: id };
  });

  // ----- Bookings (read-only for admin) -----

  // GET /bookings - List all bookings with filters
  server.get('/bookings', async (request, reply) => {
    const { page, limit, status, templeId, priestId, dateFrom, dateTo } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      templeId?: string;
      priestId?: string;
      dateFrom?: string;
      dateTo?: string;
    };
    // TODO: fetch all bookings with admin filters
    return {
      bookings: [],
      total: 0,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      filters: { status, templeId, priestId, dateFrom, dateTo },
    };
  });

  // ----- Payments (read-only for admin) -----

  // GET /payments - List all payments with filters
  server.get('/payments', async (request, reply) => {
    const { page, limit, status, dateFrom, dateTo } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    };
    // TODO: fetch all payments with admin filters
    return {
      payments: [],
      total: 0,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
      filters: { status, dateFrom, dateTo },
    };
  });

  // ----- Users CRUD -----

  // GET /users - List all users
  server.get('/users', async (request, reply) => {
    const { page, limit, role, q } = request.query as {
      page?: string;
      limit?: string;
      role?: string;
      q?: string;
    };
    return { users: [], total: 0, page: Number(page) || 1, limit: Number(limit) || 20 };
  });

  // POST /users - Create a user (admin-created accounts)
  server.post('/users', async (request, reply) => {
    const body = request.body as Record<string, unknown>;
    // TODO: create user record
    return { message: 'User created', user: body };
  });

  // PATCH /users/:id - Update a user
  server.patch('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    // TODO: update user record (role, status, etc.)
    return { message: 'User updated', userId: id, updates: body };
  });

  // DELETE /users/:id - Delete a user
  server.delete('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    // TODO: soft-delete user, revoke tokens
    return { message: 'User deleted', userId: id };
  });
}
