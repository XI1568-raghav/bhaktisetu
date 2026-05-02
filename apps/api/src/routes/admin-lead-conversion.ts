import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

// Lead conversion funnel dashboard data.
//
// Mounted at /api/v1/admin/leads/conversion (see server.ts). Gated by
// authenticateUser + requireRole('admin'). All queries are wrapped in
// try/catch — if the Lead/OutreachLog tables haven't been migrated, the
// route returns zeroed counts so the admin UI degrades gracefully.
//
// Funnel definition (per role):
//   total       — leads in pipeline
//   emailed     — leads with at least one OutreachLog SENT/DELIVERED/etc.
//   opened      — OutreachLogs with openedAt set
//   clicked     — OutreachLogs with clickedAt set
//   replied     — Lead.status in (REPLIED, CONVERTED) OR OutreachLog.status REPLIED
//   interested  — count of REPLIED OutreachLogs whose payload.classifiedIntent='INTERESTED'
//   converted   — Lead.status=CONVERTED OR convertedUserId IS NOT NULL

const ROLES = ['TEMPLE', 'PRIEST', 'ASTROLOGER', 'WELLNESS_INSTRUCTOR', 'GAUSHALA'] as const;
type Role = typeof ROLES[number];

interface RoleStats {
  total: number;
  emailed: number;
  opened: number;
  clicked: number;
  replied: number;
  interested: number;
  converted: number;
}

function emptyStats(): RoleStats {
  return { total: 0, emailed: 0, opened: 0, clicked: 0, replied: 0, interested: 0, converted: 0 };
}

const timelineQuerySchema = z.object({
  days: z.string().optional(),
});

export async function adminLeadConversionRoutes(server: FastifyInstance) {
  const adminPreHandlers = [authenticateUser, requireRole('admin')];

  // ─── GET /admin/leads/conversion ──────────────────────────────────────────
  server.get('/conversion', { preHandler: adminPreHandlers }, async (request) => {
    const byRole: Record<Role, RoleStats> = {
      TEMPLE: emptyStats(),
      PRIEST: emptyStats(),
      ASTROLOGER: emptyStats(),
      WELLNESS_INSTRUCTOR: emptyStats(),
      GAUSHALA: emptyStats(),
    };
    const totals = emptyStats();
    let recent: Array<{
      id: string;
      leadId: string;
      leadName: string;
      role: string;
      city: string | null;
      email: string | null;
      sentAt: string;
      classifiedIntent: string | null;
      bodyPreview: string;
    }> = [];

    try {
      // Pull all leads grouped by role + status. Faster + simpler than role*status counts.
      const leads = await prisma.lead.findMany({
        select: { id: true, role: true, status: true, convertedUserId: true },
      });

      const leadIdsByRole: Record<Role, Set<string>> = {
        TEMPLE: new Set(),
        PRIEST: new Set(),
        ASTROLOGER: new Set(),
        WELLNESS_INSTRUCTOR: new Set(),
        GAUSHALA: new Set(),
      };

      for (const l of leads) {
        const r = l.role as Role;
        if (!byRole[r]) continue;
        byRole[r].total += 1;
        totals.total += 1;
        leadIdsByRole[r].add(l.id);
        if (l.status === 'REPLIED' || l.status === 'CONVERTED') {
          byRole[r].replied += 1;
          totals.replied += 1;
        }
        if (l.status === 'CONVERTED' || l.convertedUserId) {
          byRole[r].converted += 1;
          totals.converted += 1;
        }
      }

      // Outreach aggregates: emailed/opened/clicked per role via lead join.
      const logs = await prisma.outreachLog.findMany({
        select: {
          leadId: true,
          openedAt: true,
          clickedAt: true,
          openCount: true,
          clickCount: true,
          status: true,
        },
      });

      const emailedLeadIds: Record<Role, Set<string>> = {
        TEMPLE: new Set(),
        PRIEST: new Set(),
        ASTROLOGER: new Set(),
        WELLNESS_INSTRUCTOR: new Set(),
        GAUSHALA: new Set(),
      };
      const openedLeadIds: Record<Role, Set<string>> = {
        TEMPLE: new Set(),
        PRIEST: new Set(),
        ASTROLOGER: new Set(),
        WELLNESS_INSTRUCTOR: new Set(),
        GAUSHALA: new Set(),
      };
      const clickedLeadIds: Record<Role, Set<string>> = {
        TEMPLE: new Set(),
        PRIEST: new Set(),
        ASTROLOGER: new Set(),
        WELLNESS_INSTRUCTOR: new Set(),
        GAUSHALA: new Set(),
      };

      // Reverse-lookup: lead → role
      const roleByLeadId = new Map<string, Role>();
      for (const r of ROLES) {
        for (const id of leadIdsByRole[r]) roleByLeadId.set(id, r);
      }

      for (const log of logs) {
        const role = roleByLeadId.get(log.leadId);
        if (!role) continue;
        emailedLeadIds[role].add(log.leadId);
        if (log.openedAt || log.openCount > 0) openedLeadIds[role].add(log.leadId);
        if (log.clickedAt || log.clickCount > 0) clickedLeadIds[role].add(log.leadId);
      }

      for (const r of ROLES) {
        byRole[r].emailed = emailedLeadIds[r].size;
        byRole[r].opened = openedLeadIds[r].size;
        byRole[r].clicked = clickedLeadIds[r].size;
        totals.emailed += byRole[r].emailed;
        totals.opened += byRole[r].opened;
        totals.clicked += byRole[r].clicked;
      }

      // INTERESTED replies — count + recent feed.
      const replies = await prisma.outreachLog.findMany({
        where: { templateKey: 'inbound_reply', status: 'REPLIED' },
        orderBy: { sentAt: 'desc' },
        take: 200,
        include: {
          lead: { select: { id: true, name: true, role: true, city: true, email: true } },
        },
      });

      const recentInterested: typeof recent = [];
      for (const log of replies) {
        const payload = (log.payload ?? {}) as Record<string, unknown>;
        const classifiedIntent = typeof payload.classifiedIntent === 'string' ? payload.classifiedIntent : null;
        const role = log.lead?.role as Role | undefined;
        if (classifiedIntent === 'INTERESTED' && role && byRole[role]) {
          byRole[role].interested += 1;
          totals.interested += 1;
          if (recentInterested.length < 20) {
            const aiBody = typeof payload.aiBody === 'string' ? payload.aiBody : '';
            const fromVal = typeof payload.from === 'string' ? payload.from : '';
            const preview = (aiBody || fromVal).slice(0, 240);
            recentInterested.push({
              id: log.leadId,
              leadId: log.leadId,
              leadName: log.lead?.name ?? 'Unknown',
              role,
              city: log.lead?.city ?? null,
              email: log.lead?.email ?? null,
              sentAt: log.sentAt.toISOString(),
              classifiedIntent,
              bodyPreview: preview,
            });
          }
        }
      }
      recent = recentInterested;
    } catch (err) {
      request.log.warn({ err }, 'admin lead conversion query failed');
    }

    return { total: totals.total, byRole, totals, recent };
  });

  // ─── GET /admin/leads/conversion/timeline?days=30 ─────────────────────────
  server.get('/conversion/timeline', { preHandler: adminPreHandlers }, async (request, reply) => {
    const parsed = timelineQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid query', details: parsed.error.flatten() });
    }
    const days = Math.min(120, Math.max(1, Number(parsed.data.days ?? '30') || 30));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    since.setUTCHours(0, 0, 0, 0);

    const buckets = new Map<string, { date: string; sent: number; opened: number; clicked: number; replied: number }>();
    for (let i = 0; i < days; i += 1) {
      const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, sent: 0, opened: 0, clicked: 0, replied: 0 });
    }

    try {
      const logs = await prisma.outreachLog.findMany({
        where: { sentAt: { gte: since } },
        select: {
          status: true,
          sentAt: true,
          openedAt: true,
          clickedAt: true,
          templateKey: true,
        },
      });
      for (const log of logs) {
        const sentKey = log.sentAt.toISOString().slice(0, 10);
        const sentBucket = buckets.get(sentKey);
        if (sentBucket) {
          sentBucket.sent += 1;
          if (log.status === 'REPLIED' || log.templateKey === 'inbound_reply') {
            sentBucket.replied += 1;
          }
        }
        if (log.openedAt) {
          const k = log.openedAt.toISOString().slice(0, 10);
          const b = buckets.get(k);
          if (b) b.opened += 1;
        }
        if (log.clickedAt) {
          const k = log.clickedAt.toISOString().slice(0, 10);
          const b = buckets.get(k);
          if (b) b.clicked += 1;
        }
      }
    } catch (err) {
      request.log.warn({ err }, 'admin lead conversion timeline failed');
    }

    return { days, timeline: Array.from(buckets.values()) };
  });
}
