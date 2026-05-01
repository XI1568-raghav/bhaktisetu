import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { runDailyOps } from '../jobs/master-cron.js';

// Lead pipeline + Outreach + Waitlist admin routes.
//
// Defensive against missing tables: if the Lead/OutreachLog/Waitlist models
// haven't been migrated yet (other agents own those migrations in this run),
// the queries are wrapped in try/catch and return empty stats rather than
// 500ing. This keeps the admin dashboard usable while migrations land.

const leadsQuerySchema = z.object({
  role: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  page: z.string().optional(),
  pageSize: z.string().optional(),
});

const importBodySchema = z.object({
  role: z.enum(['TEMPLE', 'PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA']),
  leads: z.array(z.object({
    name: z.string(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().optional(),
    whatsappNumber: z.string().optional(),
    source: z.string(),
    sourceUrl: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  })),
});

const noteBodySchema = z.object({
  note: z.string().min(1),
});

type LeadModel = {
  findMany: (args: unknown) => Promise<any[]>;
  count: (args?: unknown) => Promise<number>;
  groupBy: (args: unknown) => Promise<any[]>;
  upsert: (args: unknown) => Promise<any>;
  update: (args: unknown) => Promise<any>;
  findUnique: (args: unknown) => Promise<any>;
};

function leadModel(): LeadModel | null {
  const m = (prisma as unknown as { lead?: LeadModel }).lead;
  return m ?? null;
}

function outreachModel(): {
  findMany: (args: unknown) => Promise<any[]>;
  count: (args?: unknown) => Promise<number>;
  groupBy: (args: unknown) => Promise<any[]>;
} | null {
  const m = (prisma as unknown as {
    outreachLog?: {
      findMany: (args: unknown) => Promise<any[]>;
      count: (args?: unknown) => Promise<number>;
      groupBy: (args: unknown) => Promise<any[]>;
    };
  }).outreachLog;
  return m ?? null;
}

function waitlistModel(): {
  findMany: (args: unknown) => Promise<any[]>;
  count: (args?: unknown) => Promise<number>;
  groupBy: (args: unknown) => Promise<any[]>;
} | null {
  const m = (prisma as unknown as {
    waitlist?: {
      findMany: (args: unknown) => Promise<any[]>;
      count: (args?: unknown) => Promise<number>;
      groupBy: (args: unknown) => Promise<any[]>;
    };
  }).waitlist;
  return m ?? null;
}

function startOfDayUtc(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function lastNDays(n: number): Date[] {
  const out: Date[] = [];
  const today = startOfDayUtc(new Date());
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d);
  }
  return out;
}

export async function adminLeadsRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /admin/leads ────────────────────────────────────────────────────
  server.get('/leads', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = leadsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const lead = leadModel();
    if (!lead) {
      return { data: [], page: 1, total: 0, pageSize: 50 };
    }
    const page = Math.max(1, Number(parsed.data.page ?? 1));
    const pageSize = Math.min(200, Math.max(1, Number(parsed.data.pageSize ?? 50)));

    const where: Record<string, unknown> = {};
    if (parsed.data.role) where.role = parsed.data.role;
    if (parsed.data.status) where.status = parsed.data.status;
    if (parsed.data.city) where.city = { contains: parsed.data.city, mode: 'insensitive' };

    try {
      const [data, total] = await Promise.all([
        lead.findMany({
          where,
          orderBy: { updatedAt: 'desc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        lead.count({ where }),
      ]);
      return { data, page, total, pageSize };
    } catch (err) {
      request.log.warn({ err }, 'admin leads query failed');
      return { data: [], page, total: 0, pageSize };
    }
  });

  // ─── GET /admin/leads/stats ──────────────────────────────────────────────
  server.get('/leads/stats', { preHandler: adminPreHandlers }, async (_req, _reply) => {
    const lead = leadModel();
    if (!lead) {
      return { byRole: {}, total: 0, replied: 0, converted: 0 };
    }
    try {
      const grouped = await lead.groupBy({
        by: ['role', 'status'],
        _count: { _all: true },
      });
      const byRole: Record<string, Record<string, number>> = {};
      let total = 0;
      let replied = 0;
      let converted = 0;
      for (const row of grouped as Array<{ role: string; status: string; _count: { _all: number } }>) {
        const c = row._count._all;
        byRole[row.role] ??= {};
        byRole[row.role]![row.status] = c;
        total += c;
        if (row.status === 'REPLIED') replied += c;
        if (row.status === 'CONVERTED') converted += c;
      }
      return { byRole, total, replied, converted };
    } catch {
      return { byRole: {}, total: 0, replied: 0, converted: 0 };
    }
  });

  // ─── GET /admin/outreach/stats ───────────────────────────────────────────
  server.get('/outreach/stats', { preHandler: adminPreHandlers }, async () => {
    const outreach = outreachModel();
    const days = lastNDays(30);
    if (!outreach) {
      return {
        daily: days.map((d) => ({ date: d.toISOString().slice(0, 10), sent: 0, replied: 0, bounced: 0 })),
        totals: { sent: 0, replied: 0, bounced: 0 },
      };
    }
    try {
      const since = days[0]!;
      const logs = await outreach.findMany({
        where: { sentAt: { gte: since } },
        select: { status: true, sentAt: true },
      });
      const buckets: Record<string, { sent: number; replied: number; bounced: number }> = {};
      for (const d of days) {
        buckets[d.toISOString().slice(0, 10)] = { sent: 0, replied: 0, bounced: 0 };
      }
      let totalSent = 0;
      let totalReplied = 0;
      let totalBounced = 0;
      for (const l of logs as Array<{ status: string; sentAt: Date }>) {
        const k = startOfDayUtc(new Date(l.sentAt)).toISOString().slice(0, 10);
        const b = buckets[k];
        if (!b) continue;
        if (l.status === 'SENT' || l.status === 'DELIVERED' || l.status === 'OPENED') {
          b.sent++;
          totalSent++;
        } else if (l.status === 'REPLIED') {
          b.replied++;
          totalReplied++;
        } else if (l.status === 'BOUNCED' || l.status === 'FAILED') {
          b.bounced++;
          totalBounced++;
        }
      }
      const daily = days.map((d) => {
        const k = d.toISOString().slice(0, 10);
        return { date: k, ...buckets[k]! };
      });
      return { daily, totals: { sent: totalSent, replied: totalReplied, bounced: totalBounced } };
    } catch {
      return {
        daily: days.map((d) => ({ date: d.toISOString().slice(0, 10), sent: 0, replied: 0, bounced: 0 })),
        totals: { sent: 0, replied: 0, bounced: 0 },
      };
    }
  });

  // ─── GET /admin/waitlist/stats ───────────────────────────────────────────
  server.get('/waitlist/stats', { preHandler: adminPreHandlers }, async () => {
    const waitlist = waitlistModel();
    const days = lastNDays(30);
    const emptyDaily = days.map((d) => ({ date: d.toISOString().slice(0, 10), signups: 0 }));
    if (!waitlist) {
      return {
        total: 0,
        confirmed: 0,
        invited: 0,
        converted: 0,
        topReferrers: [],
        daily: emptyDaily,
        funnel: { pending: 0, confirmed: 0, invited: 0, converted: 0 },
      };
    }
    try {
      const since = days[0]!;
      const [all, recent] = await Promise.all([
        waitlist.findMany({
          select: { status: true, referredByEmail: true, email: true },
        }),
        waitlist.findMany({
          where: { createdAt: { gte: since } },
          select: { createdAt: true },
        }),
      ]);
      let total = 0;
      let pending = 0;
      let confirmed = 0;
      let invited = 0;
      let converted = 0;
      const refCounts: Record<string, number> = {};
      for (const r of all as Array<{ status: string; referredByEmail: string | null }>) {
        total++;
        if (r.status === 'PENDING') pending++;
        else if (r.status === 'CONFIRMED') confirmed++;
        else if (r.status === 'INVITED') invited++;
        else if (r.status === 'CONVERTED') converted++;
        if (r.referredByEmail) refCounts[r.referredByEmail] = (refCounts[r.referredByEmail] ?? 0) + 1;
      }
      const topReferrers = Object.entries(refCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([email, count], i) => ({ rank: i + 1, email, referralCount: count }));

      const buckets: Record<string, number> = {};
      for (const d of days) buckets[d.toISOString().slice(0, 10)] = 0;
      for (const r of recent as Array<{ createdAt: Date }>) {
        const k = startOfDayUtc(new Date(r.createdAt)).toISOString().slice(0, 10);
        if (k in buckets) buckets[k]!++;
      }
      const daily = days.map((d) => {
        const k = d.toISOString().slice(0, 10);
        return { date: k, signups: buckets[k] ?? 0 };
      });

      return {
        total,
        confirmed,
        invited,
        converted,
        topReferrers,
        daily,
        funnel: { pending, confirmed, invited, converted },
      };
    } catch {
      return {
        total: 0,
        confirmed: 0,
        invited: 0,
        converted: 0,
        topReferrers: [],
        daily: emptyDaily,
        funnel: { pending: 0, confirmed: 0, invited: 0, converted: 0 },
      };
    }
  });

  // ─── POST /admin/leads/import ────────────────────────────────────────────
  server.post('/leads/import', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = importBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const lead = leadModel();
    if (!lead) {
      return reply.code(503).send({ error: 'Lead model not available yet' });
    }
    let inserted = 0;
    let skipped = 0;
    for (const l of parsed.data.leads) {
      // Email + phone are unique per role; pick whichever exists for upsert.
      const where = l.email
        ? { role_email: { role: parsed.data.role, email: l.email } }
        : l.phone
          ? { role_phone: { role: parsed.data.role, phone: l.phone } }
          : null;
      if (!where) {
        skipped++;
        continue;
      }
      try {
        await lead.upsert({
          where,
          create: {
            role: parsed.data.role,
            name: l.name,
            city: l.city ?? null,
            state: l.state ?? null,
            country: l.country ?? 'India',
            phone: l.phone ?? null,
            email: l.email ?? null,
            whatsappNumber: l.whatsappNumber ?? null,
            source: l.source,
            sourceUrl: l.sourceUrl ?? null,
            metadata: l.metadata ?? {},
          },
          update: {
            name: l.name,
            city: l.city ?? undefined,
            state: l.state ?? undefined,
          },
        });
        inserted++;
      } catch (err) {
        request.log.warn({ err, lead: l }, 'lead upsert failed');
        skipped++;
      }
    }
    return { inserted, skipped, total: parsed.data.leads.length };
  });

  // ─── POST /admin/leads/:id/notes ─────────────────────────────────────────
  server.post<{ Params: { id: string } }>(
    '/leads/:id/notes',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = noteBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const lead = leadModel();
      if (!lead) {
        return reply.code(503).send({ error: 'Lead model not available yet' });
      }
      try {
        const existing = await lead.findUnique({ where: { id: request.params.id } });
        if (!existing) return reply.code(404).send({ error: 'Lead not found' });
        const author = request.currentUser?.email ?? 'admin';
        const stamp = new Date().toISOString();
        const prepended = `[${stamp} ${author}] ${parsed.data.note}\n${(existing as { notes?: string | null }).notes ?? ''}`;
        const updated = await lead.update({
          where: { id: request.params.id },
          data: { notes: prepended },
        });
        return { lead: updated };
      } catch (err) {
        request.log.error({ err }, 'append note failed');
        return reply.code(500).send({ error: 'Failed to append note' });
      }
    }
  );

  // ─── GET /admin/leads/:id ────────────────────────────────────────────────
  // Detail endpoint for the drawer — full lead + recent OutreachLog history.
  server.get<{ Params: { id: string } }>(
    '/leads/:id',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const lead = leadModel();
      if (!lead) {
        return reply.code(503).send({ error: 'Lead model not available yet' });
      }
      try {
        const detail = await lead.findUnique({
          where: { id: request.params.id },
          include: { outreachLogs: { orderBy: { sentAt: 'desc' }, take: 50 } },
        });
        if (!detail) return reply.code(404).send({ error: 'Lead not found' });
        return { lead: detail };
      } catch (err) {
        request.log.error({ err }, 'get lead detail failed');
        return reply.code(500).send({ error: 'Failed to fetch lead' });
      }
    }
  );

  // ─── POST /admin/jobs/daily-ops ──────────────────────────────────────────
  // Note: POST /admin/outreach/run is provided by outreach-webhook.ts
  // (outreachAdminRoutes). The frontend "Run outreach now" button hits
  // that endpoint directly.
  // Master cron entrypoint. Render free tier has no cron, so this is invoked
  // by an external scheduler (cron-job.org / GitHub Actions / QStash).
  server.post('/jobs/daily-ops', { preHandler: adminPreHandlers }, async () => {
    const result = await runDailyOps();
    return result;
  });
}
