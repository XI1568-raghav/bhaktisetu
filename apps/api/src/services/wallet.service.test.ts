import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import type { PrismaClient } from '@prisma/client';
import { WalletService, WalletInvariantError } from './wallet.service.js';

let wallet: WalletService;

beforeEach(() => {
  vi.clearAllMocks();
  wallet = new WalletService(prismaMock as unknown as PrismaClient);
});

describe('WalletService.creditUser', () => {
  const baseInput = {
    userId: 'user-1',
    deltaPaise: 10000,
    reason: 'referral_reward' as const,
    idempotencyKey: 'ref-claim-abc123def',
  };

  it('credits a new user — creates row + ledger entry, returns balance', async () => {
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValueOnce(null);
    prismaMock.userCredit.upsert.mockResolvedValueOnce({
      id: 'credit-1',
      userId: 'user-1',
      balancePaise: 10000,
    });
    prismaMock.creditLedgerEntry.create.mockResolvedValueOnce({ id: 'ledger-1' });

    const result = await wallet.creditUser(baseInput);

    expect(result.reused).toBe(false);
    expect(result.newBalancePaise).toBe(10000);
    expect(result.ledgerEntryId).toBe('ledger-1');
    expect(prismaMock.$transaction).toHaveBeenCalledOnce();
    expect(prismaMock.userCredit.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: { userId: 'user-1', balancePaise: 10000 },
        update: { balancePaise: { increment: 10000 } },
      }),
    );
  });

  it('idempotent: second call w/ same key returns existing ledger entry, no double credit', async () => {
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValueOnce({
      id: 'ledger-existing',
      userId: 'user-1',
      deltaPaise: 10000,
    });
    prismaMock.userCredit.findUnique.mockResolvedValueOnce({
      id: 'credit-1',
      userId: 'user-1',
      balancePaise: 10000,
    });

    const result = await wallet.creditUser(baseInput);

    expect(result.reused).toBe(true);
    expect(result.ledgerEntryId).toBe('ledger-existing');
    expect(result.newBalancePaise).toBe(10000);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.userCredit.upsert).not.toHaveBeenCalled();
  });

  it('rejects zero delta', async () => {
    await expect(
      wallet.creditUser({ ...baseInput, deltaPaise: 0 }),
    ).rejects.toThrow(WalletInvariantError);
  });

  it('rejects non-integer delta', async () => {
    await expect(
      wallet.creditUser({ ...baseInput, deltaPaise: 100.5 }),
    ).rejects.toThrow(WalletInvariantError);
  });

  it('rejects short idempotency key (< 8 chars)', async () => {
    await expect(
      wallet.creditUser({ ...baseInput, idempotencyKey: 'short' }),
    ).rejects.toThrow(WalletInvariantError);
  });

  it('blocks overdraft: debit that would push balance negative throws', async () => {
    prismaMock.creditLedgerEntry.findUnique.mockResolvedValueOnce(null);
    prismaMock.userCredit.upsert.mockResolvedValueOnce({
      id: 'credit-1',
      userId: 'user-1',
      balancePaise: -500, // simulated post-decrement underflow
    });

    await expect(
      wallet.creditUser({
        userId: 'user-1',
        deltaPaise: -10000,
        reason: 'redemption_debit',
        idempotencyKey: 'redeem-xyz-789',
      }),
    ).rejects.toThrow(/overdraft/);
  });
});

describe('WalletService.getBalance', () => {
  it('returns 0 for user with no wallet row', async () => {
    prismaMock.userCredit.findUnique.mockResolvedValueOnce(null);
    const bal = await wallet.getBalance('user-empty');
    expect(bal.balancePaise).toBe(0);
    expect(bal.currency).toBe('INR');
  });

  it('returns stored balance', async () => {
    prismaMock.userCredit.findUnique.mockResolvedValueOnce({
      balancePaise: 25000,
      currency: 'INR',
    });
    const bal = await wallet.getBalance('user-1');
    expect(bal.balancePaise).toBe(25000);
  });
});

describe('WalletService.verifyInvariant', () => {
  it('passes when balance equals ledger sum', async () => {
    prismaMock.userCredit.findUnique.mockResolvedValueOnce({ balancePaise: 30000 });
    prismaMock.creditLedgerEntry.aggregate.mockResolvedValueOnce({ _sum: { deltaPaise: 30000 } });
    const r = await wallet.verifyInvariant('user-1');
    expect(r.balancePaise).toBe(30000);
    expect(r.ledgerSumPaise).toBe(30000);
  });

  it('throws when drift detected', async () => {
    prismaMock.userCredit.findUnique.mockResolvedValueOnce({ balancePaise: 30000 });
    prismaMock.creditLedgerEntry.aggregate.mockResolvedValueOnce({ _sum: { deltaPaise: 20000 } });
    await expect(wallet.verifyInvariant('user-1')).rejects.toThrow(/drift/);
  });
});
