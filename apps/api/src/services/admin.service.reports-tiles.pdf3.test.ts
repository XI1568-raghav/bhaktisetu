/**
 * PDF3 #7 — /admin/reports booking tiles: the value is all-time, the comparison is
 * month-to-date vs the whole previous month. A percentage is only meaningful when last
 * month had bookings; "-100% vs last month" under a 0 and "0%" for 0 -> 0 were not.
 * The tile now carries the two raw counts and a null percentage when nothing to compare.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

const service = new AdminService();

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.count.mockResolvedValue(0 as never);
  prismaMock.pujaBooking.groupBy.mockResolvedValue([] as never);
  prismaMock.pujaType.findMany.mockResolvedValue([] as never);
  prismaMock.wellnessEnrollment.groupBy.mockResolvedValue([] as never);
  prismaMock.wellnessSession.findMany.mockResolvedValue([] as never);
  prismaMock.wellnessProfile.findMany.mockResolvedValue([] as never);
  prismaMock.chatConversation.groupBy.mockResolvedValue([] as never);
  prismaMock.astrologerProfile.findMany.mockResolvedValue([] as never);
  prismaMock.temple.findMany.mockResolvedValue([] as never);
  prismaMock.user.groupBy.mockResolvedValue([] as never);
});

describe('getReports bookingStats', () => {
  it('returns thisMonth/lastMonth and a null percentage when last month is empty', async () => {
    // Every count() is 0 except the all-time one, which has no createdAt filter.
    prismaMock.pujaBooking.count.mockImplementation((async (args: { where?: { createdAt?: unknown } }) =>
      args?.where?.createdAt ? 0 : 6) as never);
    const reports = await service.getReports();
    expect(reports.bookingStats.length).toBe(4);
    for (const s of reports.bookingStats) {
      expect(s.value).toBe(6);
      expect(s.thisMonth).toBe(0);
      expect(s.lastMonth).toBe(0);
      expect(s.changePct).toBeNull();
    }
  });

  it('still computes a percentage when last month had bookings', async () => {
    prismaMock.pujaBooking.count.mockImplementation((async (args: { where?: { createdAt?: { gte?: Date; lt?: Date } } }) => {
      const c = args?.where?.createdAt;
      if (!c) return 10;
      return c.lt ? 4 : 6; // previous month has an upper bound, month-to-date does not
    }) as never);
    const reports = await service.getReports();
    expect(reports.bookingStats[0]).toMatchObject({ thisMonth: 6, lastMonth: 4, changePct: 50 });
  });
});
