import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { AdminService } from './admin.service.js';

let service: AdminService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new AdminService();
});

describe('AdminService.getUsers', () => {
  it('queries users with search filter spanning name+email+phone', async () => {
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.user.count.mockResolvedValue(0);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

    await service.getUsers({ search: 'priya' });

    const call = prismaMock.user.findMany.mock.calls[0]![0]!;
    expect(call.where.OR).toEqual([
      { fullName: { contains: 'priya', mode: 'insensitive' } },
      { email: { contains: 'priya', mode: 'insensitive' } },
      { phone: { contains: 'priya' } },
    ]);
  });

  it('paginates skip/take and returns enriched roles', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u-1',
        fullName: 'A',
        email: 'a@e',
        phone: '1',
        subscriptionTier: 'FREE',
        createdAt: new Date(),
      },
      {
        id: 'u-2',
        fullName: 'B',
        email: 'b@e',
        phone: '2',
        subscriptionTier: 'PRO',
        createdAt: new Date(),
      },
    ]);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u-1', role: 'PANDIT' },
      { userId: 'u-1', role: 'DEVOTEE' },
    ]);

    const out = await service.getUsers({ page: 2, limit: 5 });

    expect(prismaMock.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    const u1 = out.users.find((u) => u.id === 'u-1');
    expect(u1!.roles).toEqual(expect.arrayContaining(['PANDIT', 'DEVOTEE']));
    const u2 = out.users.find((u) => u.id === 'u-2');
    expect(u2!.roles).toEqual(['DEVOTEE']);
  });

  it('post-filters by role when filter present', async () => {
    prismaMock.user.findMany.mockResolvedValue([
      {
        id: 'u-1',
        fullName: 'A',
        email: 'a@e',
        phone: '1',
        subscriptionTier: null,
        createdAt: new Date(),
      },
      {
        id: 'u-2',
        fullName: 'B',
        email: 'b@e',
        phone: '2',
        subscriptionTier: null,
        createdAt: new Date(),
      },
    ]);
    prismaMock.user.count.mockResolvedValue(2);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u-1', role: 'PANDIT' },
      { userId: 'u-2', role: 'STORE_OWNER' },
    ]);

    const out = await service.getUsers({ role: 'PANDIT' });

    expect(out.users).toHaveLength(1);
    expect(out.users[0]!.id).toBe('u-1');
  });

  it('throws on DB failure instead of serving mock data', async () => {
    // Changed 2026-07-17: the catch block used to return MOCK_USERS, masking
    // real DB outages with fake admin data. Now it rethrows so the operator
    // sees the error and the admin UI surfaces 500.
    prismaMock.user.findMany.mockRejectedValue(new Error('db down'));
    await expect(service.getUsers({})).rejects.toThrow('db down');
  });
});

describe('AdminService.getUserById', () => {
  it('returns null when prisma user.findUnique returns null', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const out = await service.getUserById('nope');
    expect(out).toBeNull();
  });

  it('attaches role names + per-type profiles when found', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'a@e' });
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([{ userId: 'u-1', role: 'PANDIT' }]);
    prismaMock.panditProfile.findUnique.mockResolvedValue({ id: 'pp-1' });
    prismaMock.storeProfile.findUnique.mockResolvedValue(null);
    prismaMock.astrologerProfile.findUnique.mockResolvedValue(null);
    prismaMock.wellnessProfile.findUnique.mockResolvedValue(null);
    prismaMock.gaushalaProfile.findUnique.mockResolvedValue(null);
    prismaMock.templeProfile.findUnique.mockResolvedValue(null);

    const out = await service.getUserById('u-1');

    expect((out as any).roles).toEqual(['PANDIT']);
    expect((out as any).profiles.pandit.id).toBe('pp-1');
    expect((out as any).profiles.store).toBeNull();
  });
});

describe('AdminService.updateUser', () => {
  it('returns null when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    const out = await service.updateUser('u-x', { approved: true });
    expect(out).toBeNull();
  });

  it('replaces role assignments via deleteMany+createMany when roles provided', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
    prismaMock.userRoleAssignment.deleteMany.mockResolvedValue({ count: 0 });
    prismaMock.userRoleAssignment.createMany.mockResolvedValue({ count: 2 });
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([]);

    const out = await service.updateUser('u-1', { roles: ['PANDIT', 'DEVOTEE'] });

    expect(prismaMock.userRoleAssignment.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'u-1' },
    });
    const createCall = prismaMock.userRoleAssignment.createMany.mock.calls[0]![0]!;
    expect(createCall.data).toEqual([
      { userId: 'u-1', role: 'PANDIT', isPrimary: true },
      { userId: 'u-1', role: 'DEVOTEE', isPrimary: false },
    ]);
    expect((out as any).message).toBe('User updated');
  });

  it('routes approval to correct profile updateMany based on role', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ id: 'u-1' });
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { userId: 'u-1', role: 'STORE_OWNER' },
    ]);
    prismaMock.storeProfile.updateMany.mockResolvedValue({ count: 1 });

    await service.updateUser('u-1', { approved: true });

    expect(prismaMock.storeProfile.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u-1' },
        data: { approved: true },
      }),
    );
  });
});

describe('AdminService.getDashboard', () => {
  it('returns aggregated counts + recent transactions', async () => {
    prismaMock.user.count.mockResolvedValue(100);
    prismaMock.userRoleAssignment.findMany.mockResolvedValue([
      { role: 'DEVOTEE' },
      { role: 'DEVOTEE' },
      { role: 'PANDIT' },
    ]);
    prismaMock.marketplaceSubscription.count.mockResolvedValue(8);
    prismaMock.transaction.findMany.mockResolvedValue([
      {
        id: 't1',
        userId: 'u',
        type: 'BOOKING',
        amount: 1000,
        status: 'COMPLETED',
        createdAt: new Date('2026-04-10'),
      },
      {
        id: 't2',
        userId: 'u',
        type: 'SUBSCRIPTION',
        amount: 500,
        status: 'COMPLETED',
        createdAt: new Date('2026-04-09'),
      },
    ]);
    prismaMock.transaction.aggregate.mockResolvedValue({ _sum: { amount: 1500 } });
    prismaMock.panditProfile.count.mockResolvedValue(1);
    prismaMock.storeProfile.count.mockResolvedValue(2);
    prismaMock.astrologerProfile.count.mockResolvedValue(0);
    prismaMock.wellnessProfile.count.mockResolvedValue(0);
    prismaMock.gaushalaProfile.count.mockResolvedValue(0);
    prismaMock.templeProfile.count.mockResolvedValue(1);

    const out = await service.getDashboard();

    expect(out.totalUsers).toBe(100);
    expect(out.usersByRole).toEqual({ DEVOTEE: 2, PANDIT: 1 });
    expect(out.activeSubscriptions).toBe(8);
    expect(out.totalRevenue).toBe(1500);
    expect(out.pendingApprovals).toBe(4);
    expect(out.recentTransactions).toHaveLength(2);
  });

  it('throws on DB failure instead of serving fake metrics', async () => {
    // Changed 2026-07-17: the catch block used to return a mock dashboard
    // with 8 fake users + ₹125000 fake revenue, masking real DB outages.
    // Now it rethrows so the admin UI surfaces the real error.
    prismaMock.user.count.mockRejectedValue(new Error('db down'));
    await expect(service.getDashboard()).rejects.toThrow('db down');
  });
});

describe('AdminService.getRevenue', () => {
  it('aggregates paid + pending commissions and groups subs by plan/role', async () => {
    prismaMock.commission.findMany.mockResolvedValue([
      {
        id: 'c1',
        bookingId: 'b1',
        providerId: 'p1',
        // amount = the PROVIDER's earning; percentage = the PLATFORM's rate.
        // Rs 1,000 net at a 20% take rate means Rs 1,250 gross, Rs 250 to the
        // platform. See lib/commission-math.ts.
        amount: 1000,
        percentage: 0.2,
        status: 'PAID',
        createdAt: new Date(),
      },
      {
        id: 'c2',
        bookingId: 'b2',
        providerId: 'p1',
        amount: 500,
        percentage: 0.2,
        status: 'PENDING',
        createdAt: new Date(),
      },
    ]);
    prismaMock.marketplaceSubscription.findMany.mockResolvedValue([
      { plan: 'BASIC', role: 'PANDIT', amount: 999 },
      { plan: 'BASIC', role: 'PANDIT', amount: 999 },
      { plan: 'PRO', role: 'ASTROLOGER', amount: 2999 },
    ]);

    const out = await service.getRevenue();

    // Platform revenue is the platform's CUT, not the provider's earning.
    // Reporting Rs 1,000 here was a ~4x overstatement of revenue.
    expect(out.totalCommissions).toBe(250);
    // Pending payouts genuinely is what providers are owed — unchanged.
    expect(out.pendingPayouts).toBe(500);
    expect(out.totalSubscriptions).toBe(999 + 999 + 2999);
    const basicPandit = out.subscriptionRevenue.find(
      (g) => g.plan === 'BASIC' && g.role === 'PANDIT',
    );
    expect(basicPandit?.count).toBe(2);
    expect(basicPandit?.totalAmount).toBe(1998);
  });

  it('falls back to demo numbers on error', async () => {
    prismaMock.commission.findMany.mockRejectedValue(new Error());
    const out = await service.getRevenue();
    expect(out.totalCommissions).toBeGreaterThan(0);
  });
});
