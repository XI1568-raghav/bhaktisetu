import { z } from 'zod';
import { getPrisma } from '../prisma.js';

// Headline numbers a founder checks first. "Completed booking" = a puja that was
// actually delivered (status completed OR delivered) — not just booked. Revenue
// is lifetime captured payments. Active subs = currently paying. Pipeline leads
// = NEW + QUEUED (not yet emailed/replied).
export const KpiSnapshotSchema = z.object({}).strict();

type KpiResult = {
  allTime: {
    totalUsers: number;
    completedBookings: number;
    lifetimeRevenueInr: number;
  };
  last7d: {
    newUsers: number;
    completedBookings: number;
  };
  activeSubscriptions: number;
  pipelineLeads: number;
  generatedAt: string;
};

export async function kpiSnapshot(_args: z.infer<typeof KpiSnapshotSchema>) {
  const prisma = getPrisma();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsers7d,
    completedBookingsAllTime,
    completedBookings7d,
    lifetimeRevenueAgg,
    activeSubscriptions,
    pipelineLeads,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    // completed OR delivered = a booking that was actually served.
    prisma.pujaBooking.count({ where: { status: { in: ['completed', 'delivered'] } } }),
    prisma.pujaBooking.count({
      where: { status: { in: ['completed', 'delivered'] }, createdAt: { gte: sevenDaysAgo } },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { status: 'captured' } }),
    prisma.subscription.count({ where: { status: 'active' } }),
    prisma.lead.count({ where: { status: { in: ['NEW', 'QUEUED'] } } }),
  ]);

  const result: KpiResult = {
    allTime: {
      totalUsers,
      completedBookings: completedBookingsAllTime,
      lifetimeRevenueInr: Number(lifetimeRevenueAgg._sum?.amount ?? 0),
    },
    last7d: {
      newUsers: newUsers7d,
      completedBookings: completedBookings7d,
    },
    activeSubscriptions,
    pipelineLeads,
    generatedAt: now.toISOString(),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}

export const kpiSnapshotToolDef = {
  name: 'kpi_snapshot',
  description:
    "Darshya headline KPIs. All-time: total users, completed bookings (status completed/delivered), lifetime captured revenue (INR). 7d delta: new users, completed bookings. Plus active subscriptions and pipeline leads (NEW+QUEUED). Read-only. Use for 'how is the business doing overall?'",
  inputSchema: {
    type: 'object' as const,
    properties: {},
    additionalProperties: false,
  },
};
