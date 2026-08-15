import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { adminService } from '../services/admin.service.js';
import { prisma } from '../lib/prisma.js';
import { commissionGross, commissionPlatformCut } from '../lib/commission-math.js';
import { resolveProviderRole } from '../services/payout.service.js';
// AO-16: the previously-stubbed admin lists are real queries now and take the
// same page/limit clamp every other list route uses.
import { clampLimit, clampPage } from '../lib/pagination.js';
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
  // Why a moderation action was taken has to survive the request. Zod strips
  // unknown keys, so without this the reason an admin typed was silently
  // dropped and every blocked account looked identical in the audit trail —
  // no way to tell a payments-fraud ban from a duplicate-account cleanup.
  blockedReason: z.string().max(500).optional(),
  roles: z
    .array(
      z.enum([
        'DEVOTEE',
        'PANDIT',
        'STORE_OWNER',
        'ASTROLOGER',
        'WELLNESS_INSTRUCTOR',
        'GAUSHALA_MANAGER',
        'TEMPLE_MANAGER',
        'ADMIN',
      ]),
    )
    .optional(),
});

// Permissive write schemas for admin CRUD stubs. Even though these handlers
// echo today, validating the boundary now means future implementations
// (see /admin/temples wire-up task) inherit a real safety net instead of
// trusting `Record<string, unknown>` casts.
const TRADITIONS = [
  'shaiva',
  'vaishnava',
  'shakta',
  'smarta',
  'jain',
  'sikh',
  'buddhist',
  'other',
] as const;
const TEMPLE_STATUSES = ['active', 'inactive', 'pending_review'] as const;

// Strict create schema — Temple has many required NOT NULL columns; if we
// only validated a subset, prisma.create would 500 on missing fields.
const templeCreateSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, 'lowercase letters, digits, dashes only')
    .optional(),
  description: z.string().min(2).max(5000),
  deityPrimary: z.string().min(2).max(120),
  deities: z.array(z.string().max(120)).default([]),
  tradition: z.enum(TRADITIONS).default('other'),
  addressLine: z.string().min(2).max(300),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(120),
  pincode: z.string().min(3).max(12),
  country: z.string().max(60).default('India'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  websiteUrl: z.string().url().max(500).optional(),
  isVerified: z.boolean().optional(),
  status: z.enum(TEMPLE_STATUSES).optional(),
});

// Patch is permissive — anything in the create shape, all optional. Body
// keys outside the create shape are dropped via strict schema below.
const templePatchSchema = templeCreateSchema.partial();

// Legacy permissive schema retained for /admin/temples/:id update echo
// path until full PATCH wiring lands.
const templeWriteSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    isVerified: z.boolean().optional(),
  })
  .passthrough();

function slugifyTempleName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const priestWriteSchema = z
  .object({
    displayName: z.string().min(2).max(120).optional(),
    isVerified: z.boolean().optional(),
    status: z.enum(['active', 'suspended', 'inactive']).optional(),
  })
  .passthrough();

const pujaWriteSchema = z
  .object({
    name: z.string().min(2).max(200).optional(),
    category: z.string().max(80).optional(),
    basePriceInr: z.number().nonnegative().optional(),
  })
  .passthrough();

const contentWriteSchema = z
  .object({
    title: z.string().min(2).max(300).optional(),
    type: z.string().max(40).optional(),
    status: z.string().max(40).optional(),
  })
  .passthrough();

const userCreateSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    email: z.string().email(),
    role: z
      .enum([
        'DEVOTEE',
        'PANDIT',
        'STORE_OWNER',
        'ASTROLOGER',
        'WELLNESS_INSTRUCTOR',
        'GAUSHALA_MANAGER',
        'TEMPLE_MANAGER',
        'ADMIN',
      ])
      .optional(),
  })
  .passthrough();

function validateBody<T extends z.ZodTypeAny>(
  schema: T,
  body: unknown,
  reply: import('fastify').FastifyReply,
): z.infer<T> | null {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    return null;
  }
  return parsed.data;
}

// ─── Routes ─────────────────────────────────────────────────────────────────────

export async function adminRoutes(server: FastifyInstance) {
  // All admin routes require authentication + admin role
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /users — List all users with filters ───────────────────────────────

  server.get('/users', { preHandler: adminPreHandlers }, async (request, reply) => {
    const query = request.query as Record<string, string | undefined>;
    const parsed = userQuerySchema.safeParse(query);

    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid query parameters', details: parsed.error.flatten() });
    }

    try {
      const result = await adminService.getUsers({
        role: parsed.data.role,
        status: parsed.data.status,
        search: parsed.data.search,
        page: parsed.data.page ? Number(parsed.data.page) : undefined,
        limit: parsed.data.limit ? Number(parsed.data.limit) : undefined,
      });

      return result;
    } catch (err) {
      request.log.error({ err }, 'admin /users failed');
      return reply.code(500).send({ error: 'Failed to list users' });
    }
  });

  // ─── GET /users/:id — User detail with profile ─────────────────────────────

  server.get('/users/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const user = await adminService.getUserById(id);

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      return { user };
    } catch (err) {
      request.log.error({ err, id }, 'admin /users/:id failed');
      return reply.code(500).send({ error: 'Failed to load user' });
    }
  });

  // ─── PATCH /users/:id — Update user (approve, block, roles) ────────────────

  server.patch('/users/:id', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const parsed = userUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'Invalid request body', details: parsed.error.flatten() });
    }

    const result = await adminService.updateUser(id, parsed.data);

    if (!result) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return result;
  });

  // ─── GET /dashboard — Platform stats ────────────────────────────────────────

  server.get('/dashboard', { preHandler: adminPreHandlers }, async (request, reply) => {
    try {
      const stats = await adminService.getDashboard();
      return stats;
    } catch (err) {
      request.log.error({ err }, 'admin /dashboard failed');
      return reply.code(500).send({ error: 'Failed to load dashboard' });
    }
  });

  // ─── GET /revenue — Revenue breakdown ───────────────────────────────────────

  server.get('/revenue', { preHandler: adminPreHandlers }, async (request, reply) => {
    const revenue = await adminService.getRevenue();
    return revenue;
  });

  // ─── GET /reports — Aggregated charts for /admin/reports ────────────────────
  // Replaces the hardcoded constants the reports page used to render. All
  // numbers are derived from live tables (User, PujaBooking, PujaType,
  // WellnessEnrollment, ChatConversation). Empty arrays on DB failure so the
  // UI surfaces "no data yet" instead of fabricated charts.

  server.get('/reports', { preHandler: adminPreHandlers }, async (request, reply) => {
    const reports = await adminService.getReports();
    return reports;
  });

  // ─── GET /pending-approvals — Providers awaiting approval ───────────────────

  server.get('/pending-approvals', { preHandler: adminPreHandlers }, async (request, reply) => {
    try {
      // SCAL-04: `total` is now counted in SQL rather than being
      // `approvals.length`. The response shape the admin page consumes
      // (`{ approvals, total }`) is unchanged; `hasMore` is additive and tells
      // an operator when the backlog is longer than the page they are looking
      // at, which `approvals.length` never could.
      const page = await adminService.getPendingApprovals();
      return { approvals: page.items, total: page.total, hasMore: page.hasMore };
    } catch (err) {
      request.log.error({ err }, 'admin /pending-approvals failed');
      return reply.code(500).send({ error: 'Failed to load pending approvals' });
    }
  });

  // ─── Existing Temple/Priest/Puja/Content/Booking/Payment CRUD ───────────────
  //
  // ┌── AO-16 (prod sweep 2026-08-12) ────────────────────────────────────────┐
  // │ Nine of these were hardcoded stubs, live and admin-authenticated, and   │
  // │ they lied in two different ways.                                        │
  // │                                                                          │
  // │ The READS answered `{"temples":[],"total":0}` against 20 seeded temples, │
  // │ total 0 against 3 priests, and empty arrays for pujas, content and       │
  // │ payments. Those are now real Prisma queries — every model already        │
  // │ existed, the handlers simply never asked. A failed read answers 500      │
  // │ rather than an empty list, because "none" and "could not look" must not  │
  // │ render identically.                                                      │
  // │                                                                          │
  // │ The WRITES fabricated success: PATCH/DELETE on a NON-EXISTENT uuid       │
  // │ returned 200 {"message":"Temple deleted"}, and POST /users answered      │
  // │ "User created" having created nobody. A stub that says "deleted" is more │
  // │ dangerous than one that 404s — it tells an operator a destructive action │
  // │ landed. Making them real needs cascade behaviour, an audit trail and a   │
  // │ GDPR answer for user deletion, so until that ships they answer 501 and   │
  // │ say so. Never a 200 for something that did not happen.                   │
  // │                                                                          │
  // │ POST /temples is untouched: it was always real.                          │
  // └──────────────────────────────────────────────────────────────────────────┘

  /** AO-16: one shape for every write that is declared but not built. */
  function notImplemented(reply: import('fastify').FastifyReply, what: string) {
    return reply.code(501).send({
      error: 'Not implemented',
      message:
        `${what} is not available through the API yet. Nothing was changed. ` +
        'Use the database or the role-specific portal until this ships.',
    });
  }

  server.get('/temples', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, q } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      q?: string;
    };
    const take = clampLimit(limit);
    const skip = (clampPage(page) - 1) * take;
    const where: Prisma.TempleWhereInput = {};
    if (status === 'verified') where.isVerified = true;
    if (status === 'unverified') where.isVerified = false;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }
    try {
      const [temples, total] = await Promise.all([
        prisma.temple.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            deityPrimary: true,
            isVerified: true,
            liveDarshanEnabled: true,
            createdAt: true,
          },
        }),
        prisma.temple.count({ where }),
      ]);
      return { temples, total, page: clampPage(page), limit: take };
    } catch (err) {
      request.log.error({ err }, 'admin /temples failed');
      return reply.code(500).send({ error: 'Failed to list temples' });
    }
  });

  server.post('/temples', { preHandler: adminPreHandlers }, async (request, reply) => {
    const body = validateBody(templeCreateSchema, request.body, reply);
    if (!body) return;
    const slug = body.slug ?? slugifyTempleName(body.name);
    if (!slug) {
      return reply
        .code(400)
        .send({ error: 'Could not derive slug from name; provide explicit slug.' });
    }
    try {
      const temple = await prisma.temple.create({
        data: {
          name: body.name,
          slug,
          description: body.description,
          deityPrimary: body.deityPrimary,
          deities: body.deities,
          tradition: body.tradition,
          addressLine: body.addressLine,
          city: body.city,
          state: body.state,
          pincode: body.pincode,
          country: body.country,
          lat: body.lat,
          lng: body.lng,
          phone: body.phone ?? null,
          email: body.email ?? null,
          websiteUrl: body.websiteUrl ?? null,
          isVerified: body.isVerified ?? false,
          status: body.status ?? (body.isVerified ? 'active' : 'pending_review'),
        },
      });
      return reply.code(201).send({ message: 'Temple created', temple });
    } catch (err) {
      const e = err as { code?: string; meta?: { target?: string[] | string } };
      // Prisma uniqueness violation on slug — surface as 409 not 500 so the
      // admin UI can show a clean "slug taken" message.
      if (e.code === 'P2002') {
        return reply.code(409).send({ error: 'Slug already in use', slug });
      }
      throw err;
    }
  });

  server.patch('/temples/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Updating a temple'),
  );

  server.delete('/temples/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Deleting a temple'),
  );

  server.get('/priests', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, q } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      q?: string;
    };
    const take = clampLimit(limit);
    const skip = (clampPage(page) - 1) * take;
    const where: Prisma.PriestWhereInput = {};
    if (status === 'verified') where.isVerified = true;
    if (status === 'unverified') where.isVerified = false;
    if (q) where.displayName = { contains: q, mode: 'insensitive' };
    try {
      const [priests, total] = await Promise.all([
        prisma.priest.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            userId: true,
            displayName: true,
            isVerified: true,
            isOnDuty: true,
            ratingAvg: true,
            ratingCount: true,
            commissionRate: true,
            createdAt: true,
          },
        }),
        prisma.priest.count({ where }),
      ]);
      return { priests, total, page: clampPage(page), limit: take };
    } catch (err) {
      request.log.error({ err }, 'admin /priests failed');
      return reply.code(500).send({ error: 'Failed to list priests' });
    }
  });

  server.post('/priests', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Creating a pandit'),
  );

  // NOTE: the negotiated-rate write a pandit's pay actually depends on is
  // PATCH /priests/:id/commission-rate below, and it is REAL. This generic
  // patch only ever echoed its body.
  server.patch('/priests/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Updating a pandit'),
  );

  server.delete('/priests/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Deleting a pandit'),
  );

  // ─── PATCH /priests/:id/commission-rate — negotiated pandit share ──────────
  //
  // PM-03 (prod sweep 2026-08-12). `Priest.commissionRate` is the PANDIT's
  // share, not the platform's: 0.80 means the pandit keeps 80% and Darshya
  // takes 20%. resolvePriestShare (bookings.ts) and booking.service both treat
  // any stored value in (0,1] as authoritative, so this column IS the pandit's
  // pay for every booking they take.
  //
  // The schema default has been corrected to 0.80 (migration
  // 20260812000000_priest_commission_rate_80), but nothing in the API could
  // ever WRITE the column — PATCH /priests/:id above echoes its body and
  // touches no row. So the finding's own instruction, "do not treat a stored
  // 0.70 as unset, that would silently override any pandit genuinely
  // negotiated onto 70%", had no way to be honoured: a negotiated rate could
  // only be applied with raw SQL against production. This is that path.
  const priestCommissionSchema = z.object({
    // The PANDIT's share. Same units as the column and as
    // DEFAULT_PRIEST_SHARE — a fraction, never a percentage.
    commissionRate: z.number().finite(),
    reason: z.string().max(500).optional(),
  });

  server.patch(
    '/priests/:id/commission-rate',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = validateBody(priestCommissionSchema, request.body, reply);
      if (!body) return;

      const share = body.commissionRate;
      // (0,1] is exactly the band resolvePriestShare trusts; anything outside
      // it silently falls back to DEFAULT_PRIEST_SHARE at booking time, so
      // storing it would look applied and never be.
      if (!(share > 0 && share <= 1)) {
        return reply.code(400).send({
          error:
            'commissionRate is the pandit\'s SHARE as a fraction in (0,1] — 0.8 means the pandit keeps 80%. A percentage like 80 is not accepted.',
        });
      }
      // A share under half means a platform take over 50%. The uniform rate is
      // 20%, the category tops out near 25%, and the most common way to land
      // here is entering the PLATFORM's number in the PANDIT's field. Refuse
      // it: paying a pandit less than half of their own booking should not be
      // reachable by a typo.
      if (share < 0.5) {
        return reply.code(400).send({
          error:
            'commissionRate below 0.5 would take more than half of the pandit\'s booking. If that is genuinely intended it needs a schema-level decision, not an admin override.',
        });
      }

      const existing = await prisma.priest.findUnique({
        where: { id },
        select: { id: true, displayName: true, commissionRate: true },
      });
      if (!existing) {
        return reply.code(404).send({ error: 'Priest not found' });
      }

      const updated = await prisma.priest.update({
        where: { id },
        data: { commissionRate: share },
        select: { id: true, displayName: true, commissionRate: true },
      });

      request.log?.info(
        {
          priestId: id,
          adminId: request.currentUser?.id,
          from: existing.commissionRate,
          to: share,
          reason: body.reason ?? null,
        },
        'admin override: pandit commission rate',
      );

      return {
        message: 'Commission rate updated',
        priest: {
          id: updated.id,
          displayName: updated.displayName,
          // The pandit's share, as stored.
          commissionRate: updated.commissionRate,
          // The platform's take — the number Commission.percentage carries.
          // Stated explicitly so the two halves of the split can never be
          // confused by whoever reads this response.
          platformTakeRate: 1 - updated.commissionRate,
        },
        previousCommissionRate: existing.commissionRate,
      };
    },
  );


  server.get('/pujas', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, q } = request.query as { page?: string; limit?: string; q?: string };
    const take = clampLimit(limit);
    const skip = (clampPage(page) - 1) * take;
    const where: Prisma.PujaTypeWhereInput = q
      ? { name: { contains: q, mode: 'insensitive' } }
      : {};
    try {
      const [pujas, total] = await Promise.all([
        prisma.pujaType.findMany({
          where,
          orderBy: { name: 'asc' },
          skip,
          take,
          select: {
            id: true,
            name: true,
            slug: true,
            category: true,
            basePrice: true,
            nriPrice: true,
            durationMinutes: true,
            isActive: true,
          },
        }),
        prisma.pujaType.count({ where }),
      ]);
      return { pujas, total, page: clampPage(page), limit: take };
    } catch (err) {
      request.log.error({ err }, 'admin /pujas failed');
      return reply.code(500).send({ error: 'Failed to list puja types' });
    }
  });

  server.post('/pujas', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Creating a puja type'),
  );

  server.patch('/pujas/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Updating a puja type'),
  );

  server.delete('/pujas/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Deleting a puja type'),
  );

  server.get('/content', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, type, status, q } = request.query as {
      page?: string;
      limit?: string;
      type?: string;
      status?: string;
      q?: string;
    };
    const take = clampLimit(limit);
    const skip = (clampPage(page) - 1) * take;
    // `type` and `status` are Prisma enums; an unknown value must not become a
    // 500. Cast only what the caller supplied and let a bad one match nothing.
    const where: Prisma.ContentItemWhereInput = {};
    if (type) where.type = type as Prisma.ContentItemWhereInput['type'];
    if (status) where.status = status as Prisma.ContentItemWhereInput['status'];
    if (q) where.title = { contains: q, mode: 'insensitive' };
    try {
      const [content, total] = await Promise.all([
        prisma.contentItem.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            title: true,
            slug: true,
            type: true,
            status: true,
            language: true,
            isPremium: true,
            viewCount: true,
            publishedAt: true,
            createdAt: true,
          },
        }),
        prisma.contentItem.count({ where }),
      ]);
      return { content, total, page: clampPage(page), limit: take };
    } catch (err) {
      request.log.error({ err }, 'admin /content failed');
      return reply.code(500).send({ error: 'Failed to list content' });
    }
  });

  server.post('/content', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Creating content'),
  );

  server.patch('/content/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Updating content'),
  );

  server.delete('/content/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Deleting content'),
  );

  // GET /bookings moved to apps/api/src/routes/admin-bookings.ts (M2 layer).
  // Registered separately at /api/v1/admin/bookings prefix in server.ts.

  server.get('/payments', { preHandler: adminPreHandlers }, async (request, reply) => {
    const { page, limit, status, dateFrom, dateTo } = request.query as {
      page?: string;
      limit?: string;
      status?: string;
      dateFrom?: string;
      dateTo?: string;
    };
    const take = clampLimit(limit);
    const skip = (clampPage(page) - 1) * take;
    const where: Prisma.PaymentWhereInput = {};
    if (status) where.status = status as Prisma.PaymentWhereInput['status'];
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as { gte?: Date }).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as { lte?: Date }).lte = new Date(dateTo);
    }
    try {
      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take,
          select: {
            id: true,
            bookingId: true,
            amount: true,
            currency: true,
            status: true,
            paymentGateway: true,
            gatewayPaymentId: true,
            method: true,
            refundAmount: true,
            createdAt: true,
          },
        }),
        prisma.payment.count({ where }),
      ]);
      return {
        payments,
        total,
        page: clampPage(page),
        limit: take,
        filters: { status, dateFrom, dateTo },
      };
    } catch (err) {
      request.log.error({ err }, 'admin /payments failed');
      return reply.code(500).send({ error: 'Failed to list payments' });
    }
  });

  // Account creation goes through Supabase auth, not this route — it never
  // created anybody and there is no password/identity path here to make it real.
  server.post('/users', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Creating a user'),
  );

  // Blocking a user IS real: PATCH /users/:id (adminService.updateUser). Hard
  // deletion needs a cascade + retention answer, so it is not faked here.
  server.delete('/users/:id', { preHandler: adminPreHandlers }, async (_request, reply) =>
    notImplemented(reply, 'Deleting a user'),
  );

  // ─── GET /commissions — paginated commission ledger ─────────────────────────

  const commissionQuerySchema = z.object({
    // batch9-review (2026-08-11): REVERSED was missing. Migration
    // 20260810000000 added it to CommissionStatus and refund.service writes it,
    // so `?status=REVERSED` 400'd and an admin could not isolate the reversed
    // rows after a refund — on a Rs 5,000 refunded booking the priest's reversed
    // Rs 4,000 and the temple's Rs 250 were scattered through an unfiltered list
    // with no way to see them as a class. (They were always RETURNED: `where.
    // status` is only set when a status is supplied. They just couldn't be
    // filtered FOR.)
    status: z.enum(['PENDING', 'PAID', 'REVERSED']).optional(),
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
    const [rows, total, totalsByRate] = await Promise.all([
      prisma.commission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        // The transfer that settled this row: reference + processedAt live on
        // the PayoutRequest, not the Commission. One join, not a second query.
        include: {
          payoutRequest: { select: { reference: true, processedAt: true } },
        },
      }),
      prisma.commission.count({ where }),
      // DI-08 (2026-08-12): /admin/revenue reported 1142.91 and this ledger
      // 6580 at the same instant, both under the word "commissions" — the
      // first is the PLATFORM's take, the second is PROVIDER earnings, and
      // nothing said so. Ship both totals here too, over the SAME filter the
      // rows use (not over the page), so the relationship is visible instead
      // of inferred. Grouping by rate keeps it exact and bounded: there are a
      // handful of distinct take rates, not a row per commission.
      prisma.commission.groupBy({
        by: ['percentage'],
        where,
        _sum: { amount: true },
      }),
    ]);

    // batch9-review (2026-08-11): this endpoint returned the raw Commission row
    // and nothing else, so the admin ledger rendered Gross '—', Net '—',
    // Reference '—', and the provider and booking as raw UUIDs — unusable for
    // reconciliation. On a Rs 1,100 puja an admin saw "provider earning
    // Rs 880" with no way to confirm the 20/80 split or even tell WHICH
    // provider the row belonged to before authorising a transfer, and every
    // store-order / wellness commission (bookingId null) showed a blank cell.
    // `percentage` was fetched, stringified, and then never sent to any UI
    // field, so the take rate was invisible too.
    //
    // Everything derived here goes through lib/commission-math.ts — the whole
    // point of that module is that no reader re-invents `gross = amount /
    // (1 - percentage)` inline and gets a different answer.
    const providerIds = Array.from(new Set(rows.map((r) => r.providerId)));
    const bookingIds = rows.map((r) => r.bookingId).filter((id): id is string => !!id);
    const storeOrderIds = rows.map((r) => r.storeOrderId).filter((id): id is string => !!id);
    const enrollmentIds = rows
      .map((r) => r.wellnessEnrollmentId)
      .filter((id): id is string => !!id);

    // Each lookup is one batched IN over the current page — bounded by pageSize
    // (max 200), never a per-row query.
    const [providers, assignments, bookings, storeOrders, enrollments] = await Promise.all([
      providerIds.length
        ? prisma.user.findMany({
            where: { id: { in: providerIds } },
            select: { id: true, fullName: true },
          })
        : Promise.resolve([]),
      providerIds.length
        ? prisma.userRoleAssignment.findMany({
            where: { userId: { in: providerIds } },
            select: { userId: true, role: true, isPrimary: true },
          })
        : Promise.resolve([]),
      bookingIds.length
        ? prisma.pujaBooking.findMany({
            where: { id: { in: bookingIds } },
            select: { id: true, bookingNumber: true, pujaType: { select: { name: true } } },
          })
        : Promise.resolve([]),
      storeOrderIds.length
        ? prisma.storeOrder.findMany({
            where: { id: { in: storeOrderIds } },
            select: { id: true, orderNumber: true },
          })
        : Promise.resolve([]),
      enrollmentIds.length
        ? prisma.wellnessEnrollment.findMany({
            where: { id: { in: enrollmentIds } },
            select: { id: true, session: { select: { title: true } } },
          })
        : Promise.resolve([]),
    ]);

    const providerName = new Map(providers.map((p) => [p.id, p.fullName] as const));
    const heldRoles = new Map<string, Array<{ role: string; isPrimary: boolean }>>();
    for (const a of assignments) {
      const list = heldRoles.get(a.userId) ?? [];
      list.push({ role: a.role as string, isPrimary: a.isPrimary });
      heldRoles.set(a.userId, list);
    }
    const bookingById = new Map(bookings.map((b) => [b.id, b] as const));
    const orderById = new Map(storeOrders.map((o) => [o.id, o] as const));
    const enrollmentById = new Map(enrollments.map((e) => [e.id, e] as const));

    const data = rows.map((c) => {
      const held = heldRoles.get(c.providerId) ?? [];
      // Same precedence the payout engine stamps on a PayoutRequest, so a
      // dual-role provider is named identically in the ledger and the queue.
      const role =
        resolveProviderRole(held.filter((h) => h.isPrimary).map((h) => h.role)) ??
        resolveProviderRole(held.map((h) => h.role));
      const booking = c.bookingId ? bookingById.get(c.bookingId) : undefined;
      const order = c.storeOrderId ? orderById.get(c.storeOrderId) : undefined;
      const enrollment = c.wellnessEnrollmentId
        ? enrollmentById.get(c.wellnessEnrollmentId)
        : undefined;
      const { payoutRequest, ...row } = c;
      return {
        ...row,
        // `amount` IS the provider's earning (commission-math.ts). Gross and the
        // platform's cut are derived from it and the take rate — never the other
        // way round, and never inline.
        amount: c.amount.toString(),
        percentage: c.percentage.toString(),
        grossAmount: commissionGross(c.amount, c.percentage).toString(),
        platformCut: commissionPlatformCut(c.amount, c.percentage).toString(),
        // Decimal, not `Number(percentage) * 100` — a 5% rate float-multiplies
        // to 5.000000000000001 and renders as that in the take-rate column.
        ratePercent: c.percentage.mul(100).toDecimalPlaces(2).toNumber(),
        providerName: providerName.get(c.providerId) ?? null,
        providerRole: role,
        bookingNumber: booking?.bookingNumber ?? order?.orderNumber ?? null,
        itemName: booking?.pujaType?.name ?? enrollment?.session?.title ?? (order ? 'Store order' : null),
        payoutReference: payoutRequest?.reference ?? null,
        processedAt: c.paidAt ?? payoutRequest?.processedAt ?? null,
      };
    });
    // Every figure below goes through lib/commission-math.ts for the same
    // reason the per-row columns do: one module owns `gross = amount /
    // (1 - percentage)`, so a total can never disagree with the rows under it.
    const totals = (
      totalsByRate as Array<{
        percentage: Prisma.Decimal;
        _sum: { amount: Prisma.Decimal | null };
      }>
    ).reduce(
      (acc, bucket) => {
        const providerEarning = bucket._sum.amount;
        // A rate bucket with no summed amount contributes nothing; skipping it
        // is the only honest reading (a fabricated zero row would still be
        // zero, but the guard keeps the arithmetic total rather than partial).
        if (!providerEarning) return acc;
        acc.providerEarningsInr += providerEarning.toNumber();
        acc.platformTakeInr += commissionPlatformCut(
          providerEarning,
          bucket.percentage,
        ).toNumber();
        acc.grossInr += commissionGross(providerEarning, bucket.percentage).toNumber();
        return acc;
      },
      { providerEarningsInr: 0, platformTakeInr: 0, grossInr: 0 },
    );

    return { data, page, pageSize, total, totals };
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

// Test-only exports — kept off the public surface so route consumers cannot
// accidentally import implementation details.
export const __testing = {
  slugifyTempleName,
  templeCreateSchema,
  templePatchSchema,
};
