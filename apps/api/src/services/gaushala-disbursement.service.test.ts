import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { listGaushalaBalances, recordDisbursement } from './gaushala-disbursement.service.js';

/**
 * Customer test 2026-10-05 — gaushala donations are collected by the platform
 * and nothing ever sends them on. The donee's balance stayed 0 and there was no
 * record of what had been paid out. Disbursement is a manual bank transfer, so
 * the system's job is: show what each gaushala is owed, take the transfer's
 * reference, and never let more be recorded than was received.
 */
const U = '96fcee5a-a89f-434b-8905-14a484a62f02';

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prismaMock));
});

describe('listGaushalaBalances', () => {
  it('derives owed = paid donations minus disbursed, as numbers', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { user_id: U, gaushala_name: 'Ram Gaushala', donations_count: 2n, paid_inr: '1002.00', disbursed_inr: '500.00',
        bank_account_number: '123456789012', bank_ifsc: 'HDFC0001234', bank_holder_name: 'Ram Trust' },
    ] as never);
    const [row] = await listGaushalaBalances();
    expect(row).toMatchObject({ gaushalaUserId: U, name: 'Ram Gaushala', donationsCount: 2, paidInr: 1002, disbursedInr: 500, owedInr: 502 });
    expect(row!.payTo).toEqual({ holderName: 'Ram Trust', accountNumber: '123456789012', ifsc: 'HDFC0001234' });
  });

  it('payTo is null when the gaushala has no bank record', async () => {
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { user_id: U, gaushala_name: 'G', donations_count: 1n, paid_inr: '100', disbursed_inr: '0', bank_account_number: null, bank_ifsc: null, bank_holder_name: null },
    ] as never);
    expect((await listGaushalaBalances())[0]!.payTo).toBeNull();
  });
});

describe('recordDisbursement', () => {
  const balance = (paid: string, sent: string) =>
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ paid_inr: paid, disbursed_inr: sent }] as never);

  it('records a transfer within the balance and returns the new owed amount', async () => {
    balance('1002', '0');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'd1' }] as never);
    const r = await recordDisbursement({ gaushalaUserId: U, amountInr: 502, reference: 'UTR111', adminId: 'a1' });
    expect(r).toEqual({ ok: true, id: 'd1', owedInr: 500 });
  });

  it('refuses more than is owed, and writes nothing', async () => {
    balance('1002', '900');
    const r = await recordDisbursement({ gaushalaUserId: U, amountInr: 200, reference: 'UTR222', adminId: 'a1' });
    expect(r).toEqual({ ok: false, code: 'exceeds_balance', owedInr: 102 });
    expect(prismaMock.$queryRawUnsafe).toHaveBeenCalledTimes(1);
  });

  it('a repeated reference for the same gaushala is not recorded twice', async () => {
    balance('1002', '502');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([] as never); // ON CONFLICT DO NOTHING -> no row
    const r = await recordDisbursement({ gaushalaUserId: U, amountInr: 100, reference: 'UTR111', adminId: 'a1' });
    expect(r).toEqual({ ok: false, code: 'duplicate_reference', owedInr: 500 });
  });

  it('takes the gaushala lock inside the transaction, so two admins cannot both overspend', async () => {
    balance('100', '0');
    prismaMock.$queryRawUnsafe.mockResolvedValueOnce([{ id: 'd1' }] as never);
    await recordDisbursement({ gaushalaUserId: U, amountInr: 100, reference: 'UTR333', adminId: 'a1' });
    const sqls = prismaMock.$executeRawUnsafe.mock.calls.map((c) => String(c[0]));
    expect(sqls.some((s) => /pg_advisory_xact_lock/.test(s))).toBe(true);
  });
});
