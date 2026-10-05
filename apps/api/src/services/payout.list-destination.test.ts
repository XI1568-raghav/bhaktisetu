import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * Customer test 2026-10-05 — an admin settling a payout request could not see
 * WHERE to send the money. The queue showed name, email and amount; the bank
 * account lives only in provider_kyc and was never returned, so the transfer
 * (done outside this system) needed a database query. The admin queue now
 * carries the payee's bank details for requests still awaiting transfer, and
 * nothing for settled ones.
 */
const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    payoutRequest: { findMany: vi.fn() },
    user: { findMany: vi.fn() },
    commission: { groupBy: vi.fn() },
    $queryRawUnsafe: vi.fn(),
  },
}));
vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { listPayoutRequests } from './payout.service.js';

const req = (id: string, providerId: string, status: string) => ({
  id, providerId, status, amount: new Prisma.Decimal('360.8'), requestedAt: new Date(),
});

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findMany.mockResolvedValue([{ id: 'u1', fullName: 'Pandit A', email: 'a@x.com' }, { id: 'u2', fullName: 'Pandit B', email: 'b@x.com' }]);
  prismaMock.commission.groupBy.mockResolvedValue([]);
  prismaMock.$queryRawUnsafe.mockResolvedValue([
    { user_id: 'u1', bank_account_number: '123456789012', bank_ifsc: 'HDFC0001234', bank_holder_name: 'Ramesh Sharma' },
    { user_id: 'u2', bank_account_number: '999988887777', bank_ifsc: 'SBIN0000001', bank_holder_name: 'B' },
  ]);
});

describe('listPayoutRequests payee details', () => {
  it('gives the admin the bank details to pay a pending request', async () => {
    prismaMock.payoutRequest.findMany.mockResolvedValue([req('r1', 'u1', 'pending')]);
    const [r] = await listPayoutRequests();
    expect(r!.payTo).toEqual({ holderName: 'Ramesh Sharma', accountNumber: '123456789012', ifsc: 'HDFC0001234' });
  });

  it('is null when the provider has no bank record', async () => {
    prismaMock.payoutRequest.findMany.mockResolvedValue([req('r1', 'u1', 'pending')]);
    prismaMock.$queryRawUnsafe.mockResolvedValue([]);
    const [r] = await listPayoutRequests();
    expect(r!.payTo).toBeNull();
  });

  it('does not expose account numbers on settled or rejected requests', async () => {
    prismaMock.payoutRequest.findMany.mockResolvedValue([req('r1', 'u1', 'completed'), req('r2', 'u2', 'rejected')]);
    const rows = await listPayoutRequests();
    expect(rows.every((r) => r.payTo === null)).toBe(true);
  });

  it('reads KYC only for pending providers, in one query', async () => {
    prismaMock.payoutRequest.findMany.mockResolvedValue([req('r1', 'u1', 'pending'), req('r2', 'u2', 'pending'), req('r3', 'u1', 'completed')]);
    await listPayoutRequests();
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });
});
