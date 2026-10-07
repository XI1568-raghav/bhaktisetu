/**
 * Role pass 2026-10-07: after Rs 300 consultation + Rs 500 wellness + Rs 500
 * store + Rs 1,151 puja the admin `totalRevenue` read 1651 and Rs 800 was
 * missing, because consultations and wellness enrolments never write a
 * `Payment` row.
 *
 * Formula (lib/off-payment-revenue.ts):
 *   revenue = captured Payments (not on cancelled bookings)
 *           + paid/confirmed/completed consultations with no Payment row
 *           + PAID/ATTENDED wellness enrolments with no Payment row
 * so 1151 + 500 + 300 + 500 = 2451. The SQL itself is exercised against a real
 * Postgres in the QA note; here the raw-SQL boundary is faked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';
import { sumOffPaymentRevenue } from '../lib/off-payment-revenue.js';

type Consult = { amount: number; status: string; paid: boolean; hasPaymentRow?: boolean };
type Enrol = { price: number; status: string; hasPaymentRow?: boolean };

/** Answers the three raw statements the way the SQL filters read. */
function wireRaw(opts: { tablePresent: boolean; consults: Consult[]; enrols: Enrol[] }) {
  prismaMock.$queryRawUnsafe.mockImplementation((async (sql: string) => {
    if (sql.includes('to_regclass')) return [{ present: opts.tablePresent }];
    if (sql.includes('astrologer_consultations a')) {
      if (!opts.tablePresent) throw new Error('relation "astrologer_consultations" does not exist');
      const total = opts.consults
        .filter((c) => ['confirmed', 'completed'].includes(c.status) && c.paid && !c.hasPaymentRow)
        .reduce((s, c) => s + c.amount, 0);
      return [{ total }];
    }
    if (sql.includes('wellness_enrollments e')) {
      const total = opts.enrols
        .filter((e) => ['PAID', 'ATTENDED'].includes(e.status) && !e.hasPaymentRow)
        .reduce((s, e) => s + e.price, 0);
      return [{ total }];
    }
    return [];
  }) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0 as never);
  prismaMock.userRoleAssignment.groupBy.mockResolvedValue([] as never);
  prismaMock.marketplaceSubscription.count.mockResolvedValue(0 as never);
  prismaMock.transaction.findMany.mockResolvedValue([] as never);
  prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 0 } } as never);
  for (const m of ['panditProfile', 'storeProfile', 'astrologerProfile', 'wellnessProfile', 'gaushalaProfile', 'templeProfile'] as const) {
    (prismaMock as any)[m].count.mockResolvedValue(0);
  }
  // Captured Payment rows: puja 1151 + store 500 (consultation and wellness have none).
  prismaMock.payment.aggregate.mockImplementation((async (args: { where: any }) => {
    if (args.where?.booking?.status === 'cancelled') return { _sum: { amount: null } };
    return { _sum: { amount: 1651 } };
  }) as never);
});

describe('admin dashboard revenue includes consultations and wellness', () => {
  it('mixed scenario: puja 1151 + store 500 + consultation 300 + wellness 500 = 2451', async () => {
    wireRaw({
      tablePresent: true,
      consults: [{ amount: 300, status: 'confirmed', paid: true }],
      enrols: [{ price: 500, status: 'PAID' }],
    });
    const out = await new AdminService().getDashboard();
    expect(out.totalRevenue).toBe(2451);
  });

  it('does not double count rows that already have a Payment row, and leaves refunds out', async () => {
    wireRaw({
      tablePresent: true,
      consults: [
        { amount: 300, status: 'confirmed', paid: true },
        { amount: 900, status: 'confirmed', paid: true, hasPaymentRow: true }, // already in the Payment sum
        { amount: 400, status: 'cancelled', paid: true }, // refunded
        { amount: 250, status: 'pending_payment', paid: false },
      ],
      enrols: [
        { price: 500, status: 'ATTENDED' },
        { price: 700, status: 'REFUNDED' },
        { price: 600, status: 'PENDING_PAYMENT' },
        { price: 800, status: 'PAID', hasPaymentRow: true },
      ],
    });
    const out = await new AdminService().getDashboard();
    expect(out.totalRevenue).toBe(1651 + 300 + 500);
  });

  it('keeps working when the lazily created astrologer_consultations table is absent', async () => {
    wireRaw({
      tablePresent: false,
      consults: [],
      enrols: [{ price: 500, status: 'PAID' }],
    });
    const out = await new AdminService().getDashboard();
    expect(out.totalRevenue).toBe(1651 + 500);
    const statements = prismaMock.$queryRawUnsafe.mock.calls.map((c: unknown[]) => String(c[0]));
    expect(statements.some((s) => s.includes('astrologer_consultations a'))).toBe(false);
  });

  it('degrades to 0 for a term whose statement fails instead of failing the dashboard', async () => {
    prismaMock.$queryRawUnsafe.mockRejectedValue(new Error('boom') as never);
    const out = await new AdminService().getDashboard();
    expect(out.totalRevenue).toBe(1651);
    await expect(sumOffPaymentRevenue(prismaMock as never)).resolves.toEqual({
      consultationsInr: 0,
      wellnessInr: 0,
      totalInr: 0,
    });
  });
});
