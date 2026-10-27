import { describe, it, expect, beforeEach, vi } from 'vitest';

// getPayoutBalance used to await nine reads one after another. The independent
// ones now run together; the figures must be exactly what they were.

const state = vi.hoisted(() => ({ inFlight: 0, maxInFlight: 0 }));
const { prismaMock } = vi.hoisted(() => {
  const tick = async <T>(v: T): Promise<T> => {
    state.inFlight++;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    await new Promise((r) => setTimeout(r, 5));
    state.inFlight--;
    return v;
  };
  const mock = {
    commission: {
      aggregate: vi.fn(async ({ where }: { where: any }) => {
        let sum = 0;
        if (where.status === 'PAID') sum = 700;
        else if (where.payoutRequest) sum = 300; // in flight
        else if (where.wellnessEnrollmentId?.in) sum = 40; // upcoming wellness
        else if (where.bookingId?.in) sum = 60; // upcoming puja
        else sum = 1000; // withdrawable
        return tick({ _sum: { amount: sum } });
      }),
      findMany: vi.fn(async () => tick([{ bookingId: 'b-1' }])),
    },
    wellnessEnrollment: { findMany: vi.fn(async () => tick([{ id: 'e-1' }])) },
    pujaBooking: { findMany: vi.fn(async () => tick([{ id: 'b-1' }])) },
    priest: { findUnique: vi.fn(async () => tick({ id: 'pr-1' })) },
    priestPayout: {
      findMany: vi.fn(async () =>
        tick([
          { bookingId: 'b-9', amount: 25, status: 'completed' },
          { bookingId: 'b-8', amount: 15, status: 'pending' },
        ]),
      ),
    },
    $queryRawUnsafe: vi.fn(async (sql: string) =>
      tick(sql.includes('to_regclass') ? [{ present: true }] : [{ id: 'c-1' }]),
    ),
  };
  return { prismaMock: mock };
});

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

import { getPayoutBalance } from './payout.service.js';

beforeEach(() => {
  state.inFlight = 0;
  state.maxInFlight = 0;
  (prismaMock.commission.aggregate as any).mockClear();
});

describe('getPayoutBalance — independent reads run together', () => {
  it('returns the same figures as the sequential version', async () => {
    const b = await getPayoutBalance('prov-1');
    expect(b).toEqual({
      availableInr: 1000,
      upcomingInr: 100,
      pendingInr: 300,
      paidOutInr: 700,
      legacyPandit: { hasLegacyRail: true, pendingInr: 15, paidOutInr: 25 },
    });
  });

  it('issues the held-id lookups, PAID, in-flight and the pandit probe concurrently', async () => {
    await getPayoutBalance('prov-1');
    // wellness ids + puja ids + consultation probe + paid + in-flight + priest.
    expect(state.maxInFlight).toBeGreaterThanOrEqual(5);
  });

  it('still skips the upcoming sums when nothing is held', async () => {
    (prismaMock.wellnessEnrollment.findMany as any).mockResolvedValueOnce([]);
    (prismaMock.pujaBooking.findMany as any).mockResolvedValueOnce([]);
    (prismaMock.$queryRawUnsafe as any).mockResolvedValueOnce([{ present: false }]);
    (prismaMock.priest.findUnique as any).mockResolvedValueOnce(null);
    const b = await getPayoutBalance('prov-1');
    expect(b.upcomingInr).toBe(0);
    expect(b.legacyPandit.hasLegacyRail).toBe(false);
    const wheres = (prismaMock.commission.aggregate as any).mock.calls.map((c: any[]) => c[0].where);
    expect(wheres.some((w: any) => w.wellnessEnrollmentId?.in || w.bookingId?.in)).toBe(false);
  });
});
