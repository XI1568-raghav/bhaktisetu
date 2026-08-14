import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { MarketplaceSubscriptionStatus } from '@prisma/client';
import { authenticateUser, requireRole } from '../middlewares/auth.js';
import { prisma } from '../lib/prisma.js';

/**
 * GET /admin/subscriptions
 *
 * Admin-only list of marketplace subscriptions across all roles.
 *
 * AO-09 (prod sweep 2026-08-12, P1). This handler used to answer a literal
 * `const subs: unknown[] = []` with `active: 0, activeMrr: 0` and a `note`
 * reading "Marketplace subscriptions schema not yet shipped", while
 * `model MarketplaceSubscription` had been at schema.prisma:1078 the whole time
 * and admin.service.ts was querying it twice — `getDashboardStats` for
 * activeSubscriptions and `getRevenue` for subscriptionRevenue grouped by
 * plan+role. So /admin/subscriptions rendered "ACTIVE SUBS 0" next to
 * /admin/revenue's six rows, and the screen whose only job is subscriptions was
 * the one that was wrong.
 *
 * It now reads the same rows those two endpoints read. Three specific
 * temptations are refused:
 *
 *  - `razorpaySubscriptionId` is null on every row, because the model has no
 *    such column. The admin table renders "—" for it. Synthesising a handle to
 *    fill the column would be inventing a payment-gateway identifier.
 *  - There is no `activeMrr`. `amount` is what a subscription is billed over
 *    its own term (the live ENTERPRISE row is Rs 5,000 for a YEAR), so summing
 *    it and calling the result monthly recurring revenue overstates MRR 12x per
 *    annual plan. The billed total is reported under its own name.
 *  - A failed read is a 500, never an empty list. "Zero subscriptions" and
 *    "could not read the subscriptions" are different facts and this endpoint
 *    conflating them is the defect being fixed.
 */

/** The page's filter ids ↔ the enum. 'all' means no filter. */
const STATUS_FILTER = {
  all: null,
  active: MarketplaceSubscriptionStatus.ACTIVE,
  cancelled: MarketplaceSubscriptionStatus.CANCELLED,
  expired: MarketplaceSubscriptionStatus.EXPIRED,
  past_due: MarketplaceSubscriptionStatus.PAST_DUE,
} as const;

const querySchema = z.object({
  // An unknown value used to be passed through to the response untouched; a
  // future `where: { status }` off it would have reached Prisma raw. Gate it
  // here, at the boundary, like every other admin list route.
  status: z.enum(['all', 'active', 'cancelled', 'expired', 'past_due']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

type Row = {
  id: string;
  userId: string;
  plan: string;
  role: string;
  status: string;
  amount: unknown;
  startDate: Date | string;
  endDate: Date | string;
};

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Shape one row the way apps/web/app/admin/subscriptions/page.tsx renders it:
 * `plan?.name ?? planId`, `plan?.role`, `plan?.priceMonthly` under the column
 * header "Billed", lowercase `status` to match the filter ids, `startedAt` /
 * `currentPeriodEnd` for the two date columns.
 */
function serialise(row: Row) {
  return {
    id: row.id,
    userId: row.userId,
    planId: String(row.plan),
    plan: {
      name: String(row.plan),
      role: String(row.role),
      // Rendered under "Billed". This is the amount billed over startDate→
      // endDate, not a monthly figure; the column says so and the field name is
      // the web type's legacy one.
      priceMonthly: Number(row.amount ?? 0),
    },
    status: String(row.status).toLowerCase(),
    startedAt: iso(row.startDate),
    currentPeriodEnd: iso(row.endDate),
    cancelledAt: null,
    // No column on MarketplaceSubscription. Null, not invented.
    razorpaySubscriptionId: null,
  };
}

const route: FastifyPluginAsync = async (app) => {
  app.get(
    '/admin/subscriptions',
    { preHandler: [authenticateUser, requireRole('admin')] },
    async (req, reply) => {
      const parsed = querySchema.safeParse((req.query as Record<string, unknown>) ?? {});
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ error: 'Invalid query', details: parsed.error.flatten() });
      }
      const status = parsed.data.status ?? 'all';
      const limit = parsed.data.limit ?? 100;
      const where = STATUS_FILTER[status] ? { status: STATUS_FILTER[status]! } : {};

      try {
        const [rows, activeCount] = await Promise.all([
          prisma.marketplaceSubscription.findMany({
            where,
            orderBy: { startDate: 'desc' },
            take: limit,
          }),
          prisma.marketplaceSubscription.count({
            where: { status: MarketplaceSubscriptionStatus.ACTIVE },
          }),
        ]);

        const subscriptions = (rows as unknown as Row[]).map(serialise);

        // plan+role rollup over the rows actually returned — the same grouping
        // /admin/revenue does, so the two screens cannot disagree.
        const groups = new Map<
          string,
          { plan: string; role: string; subs: number; totalInr: number }
        >();
        for (const r of rows as unknown as Row[]) {
          const key = `${r.plan}-${r.role}`;
          const g = groups.get(key) ?? {
            plan: String(r.plan),
            role: String(r.role),
            subs: 0,
            totalInr: 0,
          };
          g.subs += 1;
          g.totalInr += Number(r.amount ?? 0);
          groups.set(key, g);
        }

        reply.header('cache-control', 'private, max-age=30');
        return {
          status,
          limit,
          subscriptions,
          total: subscriptions.length,
          active: activeCount,
          // Sum of `amount` across the returned rows. Deliberately NOT called
          // MRR — see the header comment.
          billedValueInr: subscriptions.reduce((sum, s) => sum + s.plan.priceMonthly, 0),
          plans: Array.from(groups.values()),
        };
      } catch (err) {
        app.log.error({ err }, 'admin-subscriptions: query failed');
        // No `subscriptions` key and no `active` key in this body: a client that
        // fell back to reading them would republish the zero this finding is
        // about. And no `String(err)` — that is how the Prisma leak in PF-13 and
        // PAR-13 reached callers.
        return reply.status(500).send({ error: 'Failed to load subscriptions' });
      }
    },
  );
};

export default route;
