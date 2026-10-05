import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { timingSafeEqual } from 'node:crypto';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';
import { runDailyOps } from '../jobs/master-cron.js';
import { sendEmail } from '../lib/email.js';
import { onboardingService } from '../services/onboarding.service.js';
import { mapLeadRoleToOnboarding, isLeadRole, leadProfileSeed } from '../lib/lead-role-mapping.js';
import { signToken, ONBOARDING_TOKEN_TTL_MIN } from './magic-link.js';

/**
 * PJ-08. The one credential a provisioned lead can actually use.
 *
 * The CONVERTED branch below mints a User + role assignment + approved provider
 * profile (PBO-6). It does NOT mint a password, because there is no password
 * column on User anywhere in schema.prisma — web sign-in is Supabase
 * email+password or phone OTP, and a lead has neither. So "Sign in at
 * darshya.online" was an instruction the recipient could not follow even before
 * you notice the URL it pointed at, `/auth/sign-in`, is not a route in apps/web
 * (the directory has `login`).
 *
 * The magic link is the credential: /auth/verify?token= POSTs to
 * /auth/magic-link/verify, which finds the User by email and issues a session.
 * Same HMAC, same verifier, longer TTL — see ONBOARDING_TOKEN_TTL_MIN.
 */
function onboardingSignInUrl(email: string): string {
  const base = process.env.WEB_BASE_URL ?? 'https://darshya.online';
  // Signed over the address EXACTLY as the User row was created with. /verify
  // resolves the account by `findFirst({ where: { email } })` and CREATES one
  // when it misses, so normalising the case here would hand the pandit a second,
  // empty devotee account instead of the provider account just approved.
  const { token } = signToken(email.trim(), ONBOARDING_TOKEN_TTL_MIN);
  return `${base}/auth/verify?token=${encodeURIComponent(token)}`;
}

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

const statusBodySchema = z.object({
  status: z.enum(['NEW', 'QUEUED', 'EMAILED', 'REPLIED', 'CONVERTED', 'BOUNCED', 'UNSUBSCRIBED']),
  sendEmail: z.boolean().optional().default(false),
  reason: z.string().max(500).optional().default(''),
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
      // No delegate means the table was never migrated. Zeros are the only
      // honest answer, but they are a degraded answer, not a measured one.
      return {
        daily: days.map((d) => ({ date: d.toISOString().slice(0, 10), sent: 0, replied: 0, bounced: 0 })),
        totals: { sent: 0, replied: 0, bounced: 0 },
        degraded: true,
      };
    }
    try {
      const since = days[0]!;
      // ── SCAL-04: the day buckets are grouped by Postgres ──────────────────
      //
      // This read had no take and no cursor: every outreach row of the last 30
      // days, two columns wide, walked in JS to produce 30 tuples of three
      // integers. `outreach_logs` gains a row per MESSAGE per lead and never
      // loses one, so it grows faster than any other table here and the scan
      // grows with campaign volume rather than with anything on the screen.
      //
      // Identical technique and identical justification to the sibling fix in
      // routes/admin-lead-conversion.ts `/conversion/timeline` — see the long
      // note there for why the raw statement is safe to write without a
      // database to run it against: the column names come from
      // `@map(...)` in prisma/schema.prisma AND from the DDL of migration
      // 20260503_perf_indexes, the query shape is copied from admin-metrics
      // `loadFunnelDaily` which is already in production, and
      // `admin-lead-conversion.timeline-sql.scal04.test.ts` checks every
      // quoted identifier in BOTH files against the schema on every run.
      //
      // The `outreachModel()` guard above is kept: when the delegate is not
      // generated at all there is no table to query, and answering zeros
      // without a round trip is the behaviour this endpoint already had.
      type DayRow = {
        day: string | null;
        sent: number | bigint | null;
        replied: number | bigint | null;
        bounced: number | bigint | null;
      };
      const toCount = (n: number | bigint | null | undefined): number =>
        n == null ? 0 : typeof n === 'bigint' ? Number(n) : n;

      const rows = await prisma.$queryRaw<DayRow[]>`
        SELECT to_char(date_trunc('day', "sent_at"), 'YYYY-MM-DD') AS day,
               count(*) FILTER (WHERE "status"::text IN ('SENT', 'DELIVERED', 'OPENED'))::int AS sent,
               count(*) FILTER (WHERE "status"::text = 'REPLIED')::int AS replied,
               count(*) FILTER (WHERE "status"::text IN ('BOUNCED', 'FAILED'))::int AS bounced
        FROM "outreach_logs"
        WHERE "sent_at" >= ${since}
        GROUP BY 1
      `;

      const buckets: Record<string, { sent: number; replied: number; bounced: number }> = {};
      for (const d of days) {
        buckets[d.toISOString().slice(0, 10)] = { sent: 0, replied: 0, bounced: 0 };
      }
      let totalSent = 0;
      let totalReplied = 0;
      let totalBounced = 0;
      for (const r of rows ?? []) {
        // Same containment rule the JS loop had: a row outside the seeded days
        // counted toward neither its bucket nor the totals, so the totals stay
        // the sum of what is rendered rather than a second, larger number.
        const b = r.day ? buckets[r.day] : undefined;
        if (!b) continue;
        b.sent += toCount(r.sent);
        b.replied += toCount(r.replied);
        b.bounced += toCount(r.bounced);
        totalSent += toCount(r.sent);
        totalReplied += toCount(r.replied);
        totalBounced += toCount(r.bounced);
      }
      const daily = days.map((d) => {
        const k = d.toISOString().slice(0, 10);
        return { date: k, ...buckets[k]! };
      });
      return {
        daily,
        totals: { sent: totalSent, replied: totalReplied, bounced: totalBounced },
        degraded: false,
      };
    } catch {
      // Additive `degraded`: a rejected query and a quiet month used to return
      // byte-identical JSON, which is precisely how the /admin/waitlist/stats
      // outage recorded below stayed invisible.
      return {
        daily: days.map((d) => ({ date: d.toISOString().slice(0, 10), sent: 0, replied: 0, bounced: 0 })),
        totals: { sent: 0, replied: 0, bounced: 0 },
        degraded: true,
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
      // SCAL-04 (2026-08-14): the funnel and the leaderboard are computed in SQL.
      //
      // This was an unbounded read of the whole waitlist table — selecting
      // status + referredByEmail + email with no where, no take and no cursor —
      // followed by a JS for-loop that produced six scalars and a top-20 list.
      // Same shape as the 33,360 kB role-assignment scan the finding measured:
      // every row of a table that grows with signups, pulled into a 512 MB
      // container, to answer a question Postgres can answer with two grouped
      // reads. `groupBy` returns one row per status and a `take: 20` slice of
      // referrers instead.
      //
      // 2026-08-20: THE LEADERBOARD GROUP NAMED A COLUMN THAT DOES NOT EXIST,
      // and it took the whole endpoint down with it. It grouped by a
      // referrer-EMAIL field; `model Waitlist` has no such field. A referral is
      // stored as the referrer's CODE (routes/waitlist.ts writes
      // `referredByCode = referrer.referralCode`). Prisma rejects an unknown
      // `by` entry, that rejection propagated out of this `Promise.all`, and
      // the handler's catch answered the all-zero object below — so total,
      // confirmed, invited, converted, the 30-day series and the leaderboard
      // were ALL zero, not just the part with the wrong name. An operator
      // reading that screen concluded the waitlist was empty.
      //
      // Nothing could see it: `waitlistModel()` is hand-typed as
      // `(args: unknown) => Promise<any[]>` so tsc never checked the name, the
      // route's own test mocked `groupBy` and branched on the same wrong field,
      // and a dead endpoint and an empty waitlist return identical JSON.
      // `admin-leads.waitlist-schema.scal04.test.ts` now checks every field
      // name in these calls against prisma/schema.prisma, which is the only
      // oracle available with no database to query.
      const [statusGroups, referrerGroups, recent] = await Promise.all([
        waitlist.groupBy({ by: ['status'], _count: { _all: true } }),
        waitlist.groupBy({
          by: ['referredByCode'],
          where: { referredByCode: { not: null } },
          _count: { _all: true },
          orderBy: { _count: { referredByCode: 'desc' } },
          take: 20,
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
      for (const g of statusGroups as Array<{ status: string; _count: { _all: number } }>) {
        const n = g._count?._all ?? 0;
        total += n;
        if (g.status === 'PENDING') pending += n;
        else if (g.status === 'CONFIRMED') confirmed += n;
        else if (g.status === 'INVITED') invited += n;
        else if (g.status === 'CONVERTED') converted += n;
      }
      // The group above is keyed by referral CODE; the screen shows the person.
      // `Waitlist.referralCode` is @unique and the group is capped at 20, so
      // this resolves at most 20 rows — bounded by the leaderboard, never by
      // the table. Doing it as a second read rather than a relation join is
      // deliberate: a waitlist row referencing another waitlist row is a
      // self-relation the schema does not declare, and inventing one here would
      // be the same schema change SCAL-04 is still blocked on elsewhere.
      const referrerCounts = (
        referrerGroups as Array<{ referredByCode: string | null; _count: { _all: number } }>
      ).filter((g) => !!g.referredByCode);
      let emailByCode = new Map<string, string>();
      if (referrerCounts.length > 0) {
        const codes = referrerCounts.map((g) => g.referredByCode as string);
        const referrers = (await waitlist.findMany({
          where: { referralCode: { in: codes } },
          select: { referralCode: true, email: true },
          take: 20,
        })) as Array<{ referralCode: string; email: string }>;
        emailByCode = new Map(referrers.map((r) => [r.referralCode, r.email] as const));
      }
      const topReferrers = referrerCounts.map((g, i) => ({
        rank: i + 1,
        // A code whose owner row has since been deleted still referred real
        // people. Showing the code keeps that count on the screen; dropping the
        // row would silently shrink the leaderboard, which is the same
        // under-reporting this endpoint has just been repaired from.
        email: emailByCode.get(g.referredByCode as string) ?? (g.referredByCode as string),
        referralCount: g._count?._all ?? 0,
      }));

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

  // ─── PATCH /admin/leads/:id/status ───────────────────────────────────────
  // Transition lead status (e.g. NEW → CONVERTED for verified astrologer).
  // Optional welcome email on CONVERTED, optional reject email on UNSUBSCRIBED.
  server.patch<{ Params: { id: string } }>(
    '/leads/:id/status',
    { preHandler: adminPreHandlers },
    async (request, reply) => {
      const parsed = statusBodySchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'Invalid body', details: parsed.error.flatten() });
      }
      const lead = leadModel();
      if (!lead) return reply.code(503).send({ error: 'Lead model not available yet' });
      try {
        const existing = await lead.findUnique({ where: { id: request.params.id } });
        if (!existing) return reply.code(404).send({ error: 'Lead not found' });
        const author = request.currentUser?.email ?? 'admin';
        const stamp = new Date().toISOString();
        const noteLine = `[${stamp} ${author}] status → ${parsed.data.status}${parsed.data.reason ? ` (${parsed.data.reason})` : ''}`;
        const updated = await lead.update({
          where: { id: request.params.id },
          data: {
            status: parsed.data.status,
            notes: `${noteLine}\n${(existing as { notes?: string | null }).notes ?? ''}`,
          },
        });

        // PBO-6 (2026-07-10): on CONVERTED, provision a real User + provider
        // profile + approve it, so the lead can actually sign in. Previously
        // the handler flipped status + sent a "you're verified, sign in"
        // email WITHOUT creating any account — the lead hit a dead link.
        // Idempotent: if convertedUserId is already set we skip re-provisioning
        // (a second conversion click just re-sends the email). Best-effort:
        // wrapped so a profile-upsert failure logs but does not roll back the
        // status flip or block the email.
        let provisionedUserId: string | null = null;
        let profileApproved: boolean | null = null;
        if (parsed.data.status === 'CONVERTED' && !(existing as { convertedUserId?: string | null }).convertedUserId) {
          try {
            const leadEmail = (existing as { email?: string | null }).email;
            const leadRoleRaw = String((existing as { role?: string }).role ?? '');
            if (leadEmail && isLeadRole(leadRoleRaw)) {
              const mappedRole = mapLeadRoleToOnboarding(leadRoleRaw);

              // Find-or-create the User by email (mirrors magic-link.ts).
              let user = await prisma.user.findFirst({ where: { email: leadEmail } });
              if (!user) {
                user = await prisma.user.create({
                  data: {
                    email: leadEmail,
                    fullName: (existing as { name?: string }).name ?? leadEmail,
                    // phone is @unique; a lead may not have one yet, so use a
                    // stable placeholder keyed off the email (mirrors
                    // magic-link.ts) to avoid collisions on repeated converts.
                    phone: (existing as { phone?: string | null }).phone ?? `email-${leadEmail}`,
                    locationCity: (existing as { city?: string | null }).city ?? null,
                    locationState: (existing as { state?: string | null }).state ?? null,
                  },
                });
              }

              // Seed the DEVOTEE baseline (every provider is also a devotee)
              // + the provider role + profile, then flip approved=true so the
              // profile is immediately bookable.
              await prisma.userRoleAssignment.upsert({
                where: { userId_role: { userId: user.id, role: 'DEVOTEE' } },
                update: {},
                create: { userId: user.id, role: 'DEVOTEE', isPrimary: false },
              }).catch(() => undefined);
              await onboardingService.upsertProviderProfile(
                user.id,
                mappedRole,
                leadProfileSeed(leadRoleRaw, existing as Parameters<typeof leadProfileSeed>[1]),
              );
              // approveProviderProfile answers false when the profile is refused
              // (a temple or gaushala below the quality bar, or no profile row).
              // The email below must not call that an approval.
              profileApproved = await onboardingService.approveProviderProfile(user.id, mappedRole);

              provisionedUserId = user.id;
              await lead.update({
                where: { id: request.params.id },
                data: { convertedUserId: user.id },
              }).catch(() => undefined);
            }
          } catch (provErr) {
            request.log.error({ err: provErr, leadId: request.params.id }, 'lead conversion provisioning failed');
          }
        }

        if (parsed.data.sendEmail && existing.email) {
          const roleLabel = String(existing.role || 'partner').toLowerCase().replace('_', ' ');
          const isApproval = parsed.data.status === 'CONVERTED';
          const isReject = parsed.data.status === 'UNSUBSCRIBED' || parsed.data.status === 'BOUNCED';
          if (isApproval) {
            // PJ-08: the email may only promise a portal when one exists. An
            // account was provisioned on THIS request (provisionedUserId) or on
            // an earlier idempotent pass (convertedUserId already set); in
            // either case the applicant has a User row the magic link resolves.
            // If neither is true — an unmappable lead role, or the best-effort
            // provisioning block above threw — there is nothing to sign in to,
            // and saying otherwise is the defect this finding is about.
            const accountId =
              provisionedUserId ?? (existing as { convertedUserId?: string | null }).convertedUserId ?? null;
            const signInUrl = accountId ? onboardingSignInUrl(existing.email) : null;
            const nextStep = signInUrl
              ? `<p>Your Darshya portal is ready. Open it with the link below — it signs you in directly, no password needed, and is valid for 72 hours.</p><p><a href="${signInUrl}">Open your Darshya portal</a></p><p style="font-size:12px;color:#999;word-break:break-all;">${signInUrl}</p>`
              : `<p>Our partnerships team is setting up your portal and will email you the sign-in link shortly. Reply to this email if you do not hear back within two working days.</p>`;
            // The profile was created but refused by the quality gate (a temple or
            // gaushala needs a real description and address before it is listed).
            // Saying "approved" and "ready" here was false: tell them the real
            // next step instead.
            if (profileApproved === false) {
              const gateStep = signInUrl
                ? `<p>Your Darshya account is created, but your ${roleLabel} profile is not listed yet. Please open it with the link below (it signs you in directly and is valid for 72 hours) and add a description of at least a sentence and the full address. We will review it as soon as those are in.</p><p><a href="${signInUrl}">Open your Darshya account</a></p><p style="font-size:12px;color:#999;word-break:break-all;">${signInUrl}</p>`
                : `<p>Your ${roleLabel} profile needs a description and a full address before it can be listed. Our partnerships team will be in touch with the sign-in link shortly.</p>`;
              await sendEmail({
                to: existing.email,
                subject: `Next step for your Darshya ${roleLabel} listing`,
                html: `<p>Namaste ${existing.name},</p><p>Thank you for applying to join Darshya as a <strong>${roleLabel}</strong>.</p>${gateStep}${parsed.data.reason ? `<p>Note from our team: ${parsed.data.reason}</p>` : ''}<p>— Darshya partnerships team</p>`,
              }).catch(() => null);
              return { lead: updated, provisionedUserId, profileApproved };
            }
            await sendEmail({
              to: existing.email,
              subject: `You're verified on Darshya as a ${roleLabel}`,
              html: `<p>Namaste ${existing.name},</p><p>Your application to join Darshya as a <strong>${roleLabel}</strong> has been approved.</p>${nextStep}${parsed.data.reason ? `<p>Note from our team: ${parsed.data.reason}</p>` : ''}<p>— Darshya partnerships team</p>`,
            }).catch(() => null);
          } else if (isReject) {
            await sendEmail({
              to: existing.email,
              subject: `Update on your Darshya ${roleLabel} application`,
              html: `<p>Namaste ${existing.name},</p><p>Thank you for your interest in joining Darshya. After review, we are unable to onboard your application at this time.</p>${parsed.data.reason ? `<p>${parsed.data.reason}</p>` : ''}<p>You may reapply once the gaps below are addressed. Reach us at partnerships@darshya.online for clarification.</p><p>— Darshya partnerships team</p>`,
            }).catch(() => null);
          }
        }
        return { lead: updated, provisionedUserId, profileApproved };
      } catch (err) {
        request.log.error({ err }, 'status mutation failed');
        return reply.code(500).send({ error: 'Failed to update status' });
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

  // Public GET tick endpoint for free-tier external pingers (UptimeRobot etc).
  // Token-gated via CRON_TICK_TOKEN env. Returns 401 if missing/wrong.
  // Path mounts under same prefix as admin (/api/v1/admin) but bypasses auth.
  server.get('/cron/tick', async (request, reply) => {
    // P0 #PUB-03 (2026-07-09): header-only. The legacy `?token=` query fallback
    // leaked the cron secret into Render access logs + CDN caches. Header path
    // keeps it out of the URL. Timing-safe compare to defeat byte-by-byte
    // probe. Still 503 if env unset (default-deny).
    const provided = (request.headers['x-cron-token'] as string | undefined) ?? '';
    const expected = process.env.CRON_AUTH_TOKEN ?? process.env.CRON_TICK_TOKEN;
    if (!expected) {
      return reply.code(503).send({ error: 'CRON token not configured' });
    }
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    if (!ok) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
    const result = await runDailyOps();
    return result;
  });
}
