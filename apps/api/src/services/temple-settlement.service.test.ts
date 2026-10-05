import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { listTempleBalances, recordDonationTransfer, recordPujaShareTransfer } from './temple-settlement.service.js';

/**
 * Temple manager test 2026-10-05. A temple's 5% share of each puja was written
 * `pending` and nothing ever set it `completed`; donations to a temple were
 * collected into Darshya's account with no way to send them on. The manager's
 * "Pending settlement" figure could only grow and the admin had no screen.
 */
const T = '56955f8d-1b90-47f5-97ea-f86560cb58fe';

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaMock));
});

describe('listTempleBalances', () => {
  it('separates share owed for performed pujas from share held on pujas not yet performed', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      {
        temple_id: T, name: 'QA Mandir', share_owed: '100.00', share_held: '45.10', share_sent: '20.00',
        donations_count: 2n, donations_paid: '1002.00', donations_sent: '500.00',
        bank_account_number: '123456789012', bank_ifsc: 'HDFC0001234', bank_holder_name: 'Trust',
      },
    ] as never);
    const [row] = await listTempleBalances();
    expect(row).toMatchObject({
      templeId: T, pujaShareOwedInr: 100, pujaShareHeldInr: 45.1, pujaShareSentInr: 20,
      donationsCount: 2, donationsPaidInr: 1002, donationsSentInr: 500, donationsOwedInr: 502,
    });
    expect(row!.payTo).toEqual({ holderName: 'Trust', accountNumber: '123456789012', ifsc: 'HDFC0001234' });
  });

  it('payTo is null when the temple has no bank record, and only performed pujas count as payable', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { temple_id: T, name: 'T', share_owed: 0, share_held: 10, share_sent: 0, donations_count: 0n, donations_paid: 0, donations_sent: 0, bank_account_number: null, bank_ifsc: null, bank_holder_name: null },
    ] as never);
    expect((await listTempleBalances())[0]!.payTo).toBeNull();
    const sql = String(prismaMock.$queryRawUnsafe.mock.calls[0]![0]);
    expect(sql).toMatch(/'completed','video_uploaded','delivered'/);
  });
});

describe('recordPujaShareTransfer', () => {
  const payable = (...amounts: string[]) =>
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce(amounts.map((a, i) => ({ id: `p${i}`, amount: a })) as never);

  it('settles every payable row when the amount equals their total', async () => {
    payable('100.00', '45.10');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([] as never); // no duplicate reference
    const r = await recordPujaShareTransfer({ templeId: T, amountInr: 145.1, reference: 'UTR111' });
    expect(r).toEqual({ ok: true, settled: 2, owedInr: 0 });
    const update = prismaMock.$executeRawUnsafe.mock.calls.find((c) => /UPDATE temple_payouts/.test(String(c[0])));
    expect(update?.[1]).toEqual(['p0', 'p1']);
    expect(update?.[2]).toBe('UTR111');
  });

  it('refuses a part-payment and settles nothing', async () => {
    payable('100.00', '45.10');
    const r = await recordPujaShareTransfer({ templeId: T, amountInr: 100, reference: 'UTR222' });
    expect(r).toEqual({ ok: false, code: 'amount_mismatch', owedInr: 145.1 });
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /UPDATE temple_payouts/.test(String(c[0])))).toBe(false);
  });

  it('refuses when nothing is payable yet (pujas not performed)', async () => {
    payable();
    const r = await recordPujaShareTransfer({ templeId: T, amountInr: 50, reference: 'UTR333' });
    expect(r).toEqual({ ok: false, code: 'nothing_payable', owedInr: 0 });
  });

  it('does not reuse a reference already recorded for this temple', async () => {
    payable('100.00');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'x' }] as never);
    const r = await recordPujaShareTransfer({ templeId: T, amountInr: 100, reference: 'UTR111' });
    expect(r).toEqual({ ok: false, code: 'duplicate_reference', owedInr: 100 });
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /UPDATE temple_payouts/.test(String(c[0])))).toBe(false);
  });

  it('only selects rows of bookings whose puja was performed, under a per-temple lock', async () => {
    payable('100.00');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([] as never);
    await recordPujaShareTransfer({ templeId: T, amountInr: 100, reference: 'UTR444' });
    expect(String(prismaMock.$queryRawUnsafe.mock.calls[0]![0])).toMatch(/b\.status::text IN \('completed','video_uploaded','delivered'\)/);
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => /pg_advisory_xact_lock/.test(String(c[0])))).toBe(true);
  });
});

describe('recordDonationTransfer', () => {
  const balance = (paid: string, sent: string) =>
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ paid_inr: paid, disbursed_inr: sent }] as never);

  it('records a transfer within the balance and returns what is still owed', async () => {
    balance('1002', '0');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'd1' }] as never);
    expect(await recordDonationTransfer({ templeId: T, amountInr: 502, reference: 'UTR1', adminId: 'a1' })).toEqual({ ok: true, settled: 1, owedInr: 500 });
  });

  it('refuses more than was received', async () => {
    balance('1002', '900');
    expect(await recordDonationTransfer({ templeId: T, amountInr: 200, reference: 'UTR2', adminId: 'a1' })).toEqual({ ok: false, code: 'exceeds_balance', owedInr: 102 });
  });

  it('a repeated reference is not recorded twice', async () => {
    balance('1002', '502');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([] as never);
    expect(await recordDonationTransfer({ templeId: T, amountInr: 100, reference: 'UTR1', adminId: 'a1' })).toEqual({ ok: false, code: 'duplicate_reference', owedInr: 500 });
  });
});
