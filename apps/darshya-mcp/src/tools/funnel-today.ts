import { z } from 'zod';
import { getPrisma } from '../prisma.js';

// "Today" = since midnight UTC. Prod (Supabase) stores timestamps in UTC, so a
// UTC day boundary is the correct and deterministic cut. The 7d window is the
// rolling 7 days ending now.
export const FunnelTodaySchema = z.object({}).strict();

type FunnelResult = {
  today: {
    signups: number;
    bookings: number;
    bookingsByStatus: Record<string, number>;
    capturedRevenueInr: number;
    donationsInr: number;
  };
  last7d: {
    signups: number;
    bookings: number;
    capturedRevenueInr: number;
    donationsInr: number;
  };
  generatedAt: string;
};

async function windowCounts(from: Date, to: Date) {
  const prisma = getPrisma();
  const [signups, bookings, bookingsByStatusRows, payments, donations] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.pujaBooking.count({ where: { createdAt: { gte: from, lt: to } } }),
    prisma.pujaBooking.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lt: to } },
      _count: { _all: true },
    }),
    // Only 'captured' = money actually received. initiated/authorized is not revenue yet.
    prisma.payment.aggregate({
      _sum: { amount: true },
      where: { status: 'captured', createdAt: { gte: from, lt: to } },
    }),
    // Donation "money received" state is 'paid' (DonationStatus = created|paid|failed),
    // NOT 'captured' — that is PaymentStatus. Using the wrong enum would silently match zero rows.
    prisma.donation.aggregate({
      _sum: { amountInr: true },
      where: { status: 'paid', createdAt: { gte: from, lt: to } },
    }),
  ]);

  const bookingsByStatus: Record<string, number> = {};
  for (const row of bookingsByStatusRows) {
    bookingsByStatus[row.status] = row._count._all;
  }

  return {
    signups,
    bookings,
    bookingsByStatus,
    capturedRevenueInr: Number(payments._sum?.amount ?? 0),
    donationsInr: Number(donations._sum?.amountInr ?? 0),
  };
}

export async function funnelToday(_args: z.infer<typeof FunnelTodaySchema>) {
  const now = new Date();
  const startOfTodayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [today, last7dRaw] = await Promise.all([
    windowCounts(startOfTodayUtc, now),
    windowCounts(sevenDaysAgo, now),
  ]);

  const result: FunnelResult = {
    today,
    last7d: {
      signups: last7dRaw.signups,
      bookings: last7dRaw.bookings,
      capturedRevenueInr: last7dRaw.capturedRevenueInr,
      donationsInr: last7dRaw.donationsInr,
    },
    generatedAt: now.toISOString(),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}

export const funnelTodayToolDef = {
  name: 'funnel_today',
  description:
    "Darshya funnel for today + last 7 days (UTC). Returns signups, bookings (by status), captured revenue (INR), donations (INR). Read-only. Use this to answer 'what is my funnel today?'",
  inputSchema: {
    type: 'object' as const,
    properties: {},
    additionalProperties: false,
  },
};
