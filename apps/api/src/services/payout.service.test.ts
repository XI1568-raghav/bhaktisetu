import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock prisma before importing the service.
const { prismaMock } = vi.hoisted(() => {
  const mock: Record<string, unknown> = {
    commission: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    payoutRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    user: { findMany: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  };
  return { prismaMock: mock };
});

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

import {
  getPayoutBalance,
  getKycStatus,
  requestPayout,
  processPayout,
} from './payout.service.js';

const commission = prismaMock.commission as {
  findMany: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
};
const payoutRequest = prismaMock.payoutRequest as {
  create: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};
const $queryRawUnsafe = prismaMock.$queryRawUnsafe as ReturnType<typeof vi.fn>;
const $transaction = prismaMock.$transaction as ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('payout.service — getPayoutBalance', () => {
  it('sums PENDING unlinked commissions as available, PAID as paidOut, in-flight as pending', async () => {
    // getPayoutBalance calls findMany 3x: PENDING-unlinked, PAID, in-flight.
    commission.findMany
      .mockResolvedValueOnce([{ amount: 100 }, { amount: 250 }]) // PENDING unlinked
      .mockResolvedValueOnce([{ amount: 500 }]) // PAID
      .mockResolvedValueOnce([{ amount: 100 }]); // in-flight (part of the 350)
    const b = await getPayoutBalance('prov-1');
    expect(b.pendingInr).toBe(100); // in-flight
    expect(b.availableInr).toBe(250); // 350 - 100 in-flight
    expect(b.paidOutInr).toBe(500);
  });

  it('returns zeros for a provider with no commissions', async () => {
    commission.findMany.mockResolvedValue([]);
    const b = await getPayoutBalance('prov-none');
    expect(b).toEqual({ availableInr: 0, pendingInr: 0, paidOutInr: 0 });
  });
});

describe('payout.service — KYC gating', () => {
  it('reads verified + bank presence from provider_kyc', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: true, bank_account_number: '1234', bank_ifsc: 'HDFC0001234' }]);
    const k = await getKycStatus('prov-1');
    expect(k.verified).toBe(true);
    expect(k.hasBank).toBe(true);
  });

  it('returns unverified when no KYC row', async () => {
    $queryRawUnsafe.mockResolvedValue([]);
    const k = await getKycStatus('prov-none');
    expect(k.verified).toBe(false);
    expect(k.hasBank).toBe(false);
  });
});

describe('payout.service — requestPayout gating', () => {
  it('rejects when KYC has no bank details', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: true, bank_account_number: null, bank_ifsc: null }]);
    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/bank\/UPI details/);
  });

  it('rejects when KYC not verified', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: false, bank_account_number: '1', bank_ifsc: 'HDFC0001234' }]);
    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/pending verification/);
  });

  it('rejects when no withdrawable balance', async () => {
    $queryRawUnsafe.mockResolvedValue([{ verified: true, bank_account_number: '1', bank_ifsc: 'HDFC0001234' }]);
    commission.findMany.mockResolvedValue([]); // no commissions at all
    await expect(requestPayout('prov-1', 'PANDIT')).rejects.toThrow(/No withdrawable balance/);
  });
});

describe('payout.service — processPayout', () => {
  it('complete marks commissions PAID + sets reference', async () => {
    payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: 350, providerId: 'prov-1' });
    payoutRequest.update.mockResolvedValue({ id: 'pr-1', status: 'completed', amount: 350, providerId: 'prov-1' });
    $transaction.mockImplementation(async (fn) => fn({ payoutRequest, commission }));

    const out = await processPayout('pr-1', 'complete', 'admin-1', 'UTR123');
    expect(out.status).toBe('completed');
    expect(commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payoutRequestId: 'pr-1' },
        data: expect.objectContaining({ status: 'PAID' }),
      }),
    );
  });

  it('reject releases commissions back to PENDING (unlinks, balance preserved)', async () => {
    payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'pending', amount: 350, providerId: 'prov-1' });
    payoutRequest.update.mockResolvedValue({ id: 'pr-1', status: 'rejected', amount: 350, providerId: 'prov-1' });
    $transaction.mockImplementation(async (fn) => fn({ payoutRequest, commission }));

    const out = await processPayout('pr-1', 'reject', 'admin-1', undefined, 'bank rejected');
    expect(out.status).toBe('rejected');
    expect(commission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { payoutRequestId: 'pr-1' },
        data: { payoutRequestId: null },
      }),
    );
  });

  it('is idempotent on an already-completed payout', async () => {
    payoutRequest.findUnique.mockResolvedValue({ id: 'pr-1', status: 'completed', amount: 350, providerId: 'prov-1' });
    $transaction.mockImplementation(async (fn) => fn({ payoutRequest, commission }));
    const out = await processPayout('pr-1', 'complete', 'admin-1');
    expect(out.status).toBe('completed');
    expect(payoutRequest.update).not.toHaveBeenCalled();
  });
});
