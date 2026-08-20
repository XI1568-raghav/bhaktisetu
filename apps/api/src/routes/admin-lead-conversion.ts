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
      // SCAL-04 (2026-08-16): the whole funnel is now computed in Postgres.
      //
      // This block used to read the ENTIRE `leads` table and the ENTIRE
      // `outreach_logs` table — no where, no take, no cursor — and reduce both
      // to 35 integers with JavaScript Sets. `outreach_logs` gains a row per
      // message per lead, so it is a MULTIPLE of the lead table and the fastest-
      // growing table in the app; one operator opening this dashboard dragged
      // both into a 512 MB Render container, and neither read had any ceiling.
      //
      // Five grouped reads replace them, each returning at most one row per
      // role (the lead funnel: one per role×status). `Lead.outreachLogs` is a
      // declared relation in prisma/schema.prisma, so a `some` filter pushes the
      // lead↔log join into SQL — which is exactly what the JS Sets were doing by
      // hand. Zero lead rows and zero log rows cross the wire.
      //
      // `converted` is deliberately two reads. The old rule was
      // `status === 'CONVERTED' || convertedUserId`, and a single group over
      // status silently drops every lead that was linked to a real account but
      // never re-stamped — under-reporting the one number the funnel exists to
      // show. The second read asks for exactly that residue, with
      // `status: { not: 'CONVERTED' }` so nothing is counted twice.
      const [statusGroups, convertedByLink, emailedGroups, openedGroups, clickedGroups] =
        await Promise.all([
          prisma.lead.groupBy({ by: ['role', 'status'], _count: { _all: true } }),
          prisma.lead.groupBy({
            by: ['role'],
            where: { convertedUserId: { not: null }, status: { not: 'CONVERTED' } },
            _count: { _all: true },
          }),
          prisma.lead.groupBy({
            by: ['role'],
            where: { outreachLogs: { some: {} } },
            _count: { _all: true },
          }),
          prisma.lead.groupBy({
            by: ['role'],
            where: {
              outreachLogs: { some: { OR: [{ openedAt: { not: null } }, { openCount: { gt: 0 } }] } },
            },
            _count: { _all: true },
          }),
          prisma.lead.groupBy({
            by: ['role'],
            where: {
              outreachLogs: { some: { OR: [{ clickedAt: { not: null } }, { clickCount: { gt: 0 } }] } },
            },
            _count: { _all: true },
          }),
        ]);

      type RoleCountRow = { role: string; _count: { _all: number } };

      for (const row of statusGroups as unknown as Array<RoleCountRow & { status: string }>) {
        const r = row.role as Role;
        if (!byRole[r]) continue;
        const n = row._count._all;
        byRole[r].total += n;
        totals.total += n;
        if (row.status === 'REPLIED' || row.status === 'CONVERTED') {
          byRole[r].replied += n;
          totals.replied += n;
        }
        if (row.status === 'CONVERTED') {
          byRole[r].converted += n;
          totals.converted += n;
        }
      }

      for (const row of convertedByLink as unknown as RoleCountRow[]) {
        const r = row.role as Role;
        if (!byRole[r]) continue;
        byRole[r].converted += row._count._all;
        totals.converted += row._count._all;
      }

      const applyRoleCounts = (rows: RoleCountRow[], key: 'emailed' | 'opened' | 'clicked') => {
        for (const row of rows) {
          const r = row.role as Role;
          if (!byRole[r]) continue;
          byRole[r][key] = row._count._all;
          totals[key] += row._count._all;
        }
      };
      applyRoleCounts(emailedGroups as unknown as RoleCountRow[], 'emailed');
      applyRoleCounts(openedGroups as unknown as RoleCountRow[], 'opened');
      applyRoleCounts(clickedGroups as unknown as RoleCountRow[], 'clicked');

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

    // ── SCAL-04: Postgres buckets the days; Node only reads the buckets ──────
    //
    // This was `outreachLog.findMany({ where: { sentAt: { gte: since } } })` —
    // no take, no cursor — over a window the CALLER sizes (?days, up to 120),
    // five columns wide, reduced to at most 120 tuples of four integers by the
    // JS loop that used to live here. `outreach_logs` is the fastest-growing
    // table the product has: one row per MESSAGE per lead, several per lead per
    // campaign, and a lead row is never deleted — so its row count is a
    // multiple of the lead table's, and this was the single largest read left
    // in the admin surface.
    //
    // WHY RAW SQL, AND WHY IT WAS REFUSED TWICE BEFORE. Prisma cannot express
    // `date_trunc`, and the ratchet's own notes (lib/unbounded-findmany.scal04
    // .test.ts) refused this rewrite because a raw statement that Postgres
    // rejects would fall into the catch below and answer an all-zero timeline —
    // converting a slow dashboard into a silently empty one, which is exactly
    // what the `referredByEmail` groupBy did to /admin/waitlist/stats. Three
    // things changed that calculus:
    //
    //   1. The identifiers are no longer assumed. `OutreachLog` maps every
    //      column (`@map("sent_at")` …) and migration 20260503_perf_indexes
    //      creates an index ON "outreach_logs" ("lead_id", "channel",
    //      "sent_at" DESC) — so the snake_case names are established by DDL in
    //      this repo, not inferred. `admin-lead-conversion.timeline-sql.scal04
    //      .test.ts` re-checks every quoted identifier here against
    //      prisma/schema.prisma on every run, which is the one oracle a mock
    //      cannot agree with.
    //   2. The shape is copied from a statement already running in production:
    //      admin-metrics.ts `loadFunnelDaily` ships the identical
    //      `to_char(date_trunc('day', …), 'YYYY-MM-DD')` + `count(*)::int`
    //      per-day group, including the `count(*) FILTER (WHERE …)` form.
    //   3. A failure is no longer silent. `degraded` is on the response, so an
    //      empty timeline and a broken query stop being the same JSON.
    //
    // No DateTime in this schema carries `@db.Timestamptz`, so `sent_at` is a
    // plain `timestamp(3)` holding UTC and `date_trunc('day', …)` reproduces
    // the `toISOString().slice(0, 10)` key the JS loop produced, exactly.
    //
    // The `buckets.get(k)` guard is kept rather than trusting the window: it is
    // what confined the old loop to the seeded days, so keeping it makes the
    // response byte-identical instead of merely equivalent.
    type DayRow = { day: string | null; n: number | bigint | null };
    type SentRow = DayRow & { replied: number | bigint | null };
    const toCount = (n: number | bigint | null | undefined): number =>
      n == null ? 0 : typeof n === 'bigint' ? Number(n) : n;

    let degraded = false;
    try {
      const [sentRows, openedRows, clickedRows] = await Promise.all([
        prisma.$queryRaw<SentRow[]>`
          SELECT to_char(date_trunc('day', "sent_at"), 'YYYY-MM-DD') AS day,
                 count(*)::int AS n,
                 count(*) FILTER (
                   WHERE "status"::text = 'REPLIED' OR "template_key" = 'inbound_reply'
                 )::int AS replied
          FROM "outreach_logs"
          WHERE "sent_at" >= ${since}
          GROUP BY 1
        `,
        prisma.$queryRaw<DayRow[]>`
          SELECT to_char(date_trunc('day', "opened_at"), 'YYYY-MM-DD') AS day, count(*)::int AS n
          FROM "outreach_logs"
          WHERE "sent_at" >= ${since} AND "opened_at" IS NOT NULL
          GROUP BY 1
        `,
        prisma.$queryRaw<DayRow[]>`
          SELECT to_char(date_trunc('day', "clicked_at"), 'YYYY-MM-DD') AS day, count(*)::int AS n
          FROM "outreach_logs"
          WHERE "sent_at" >= ${since} AND "clicked_at" IS NOT NULL
          GROUP BY 1
        `,
      ]);

      for (const r of sentRows ?? []) {
        const b = r.day ? buckets.get(r.day) : undefined;
        if (!b) continue;
        b.sent += toCount(r.n);
        b.replied += toCount(r.replied);
      }
      for (const r of openedRows ?? []) {
        const b = r.day ? buckets.get(r.day) : undefined;
        if (b) b.opened += toCount(r.n);
      }
      for (const r of clickedRows ?? []) {
        const b = r.day ? buckets.get(r.day) : undefined;
        if (b) b.clicked += toCount(r.n);
      }
    } catch (err) {
      degraded = true;
      request.log.warn({ err }, 'admin lead conversion timeline failed');
    }

    // `degraded` is additive and load-bearing: without it a query the database
    // rejected and a genuinely quiet month return the same body, which is how
    // the /admin/waitlist/stats outage survived for six days.
    return { days, timeline: Array.from(buckets.values()), degraded };
  });
}
