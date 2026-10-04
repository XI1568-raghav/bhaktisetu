import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * DI-09 (F455), part 2 — the receipt mint is a row overwriting its own column,
 * which is the one shape no index can defend.
 *
 * `donations` already carries `donations_receipt_number_key`
 * (migrations/20260428_donations:28). It is not the missing piece. The bug is
 * that `finalizeDonationReceipt` mints with an UPDATE that carries no state
 * predicate (routes/donations.ts:175):
 *
 *     UPDATE donations
 *        SET status='paid', paid_at=now(), razorpay_payment_id=$2, receipt_number=$3
 *      WHERE id=$1
 *
 * The early return at :134 (`if (donation.status === 'paid')`) closes the
 * SEQUENTIAL case only. Both rails read their `DonationRow` BEFORE calling —
 * `/verify` from the request and the webhook backstop from
 * `payment.service.processWebhookEvent` via `findDonationByOrderId` — so two
 * concurrent finalizations both hold a snapshot saying `status: 'created'`,
 * both pass the early return, and both run that UPDATE. `nextReceiptNumber()`
 * (:88) is `DR-<date>-<4 random hex>`, freshly generated per call, so the two
 * receipt numbers DIFFER: the unique index is satisfied by both, and the second
 * UPDATE simply overwrites the first row's `receipt_number`.
 *
 * That is not a cosmetic race. The 80G PDF and the receipt email have already
 * gone to the donor carrying the FIRST number, and that number no longer exists
 * anywhere in the database. `donations` is the table an Income-Tax 80G claim is
 * reconciled against.
 *
 * The fix is the shape this codebase already uses for exactly this problem —
 * `claimCaptureTransition` (services/payment.service.ts:398), a conditional
 * UPDATE whose affected-row count elects a single winner:
 *
 *     UPDATE payments SET status='captured' WHERE id=$1 AND status <> 'captured'
 *
 * One line, `AND status <> 'paid'`, plus reading the count that
 * `$executeRawUnsafe` already returns.
 *
 * NON-VACUITY. Against pre-fix HEAD, 'the loser does not mint a second receipt'
 * fails with `expected 'DR-…' to be null` — the loser returned a brand-new
 * receipt number it had just written over the winner's — and 'the loser reports
 * alreadyPaid' fails with `expected false to be true`. 'the UPDATE is
 * conditional' fails because the SQL contains no `status <>` at all. The three
 * remaining tests passed pre-fix and pin the winner's path, which must not
 * change.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

const generate80GReceiptMock = vi.fn(async () => Buffer.from('pdf'));
const sendEmailMock = vi.fn(async () => undefined);
vi.mock('../lib/pdf-receipt.js', () => ({
  generate80GReceipt: generate80GReceiptMock,
  is80GEligible: vi.fn(() => false),
}));
vi.mock('../lib/email.js', () => ({
  sendEmail: sendEmailMock,
  donationReceiptEmail: vi.fn(() => ({ subject: 's', html: 'h', text: 't' })),
}));

type DonationRow = Parameters<
  Awaited<typeof import('./donations.js')>['finalizeDonationReceipt']
>[0];

/**
 * The snapshot BOTH rails hold in the race: read while the donation was still
 * 'created', which is the whole reason the early return cannot help.
 */
const STALE_CREATED_SNAPSHOT = {
  id: 'don_1757000000000_race0001',
  user_id: '22222222-2222-2222-2222-222222222222',
  gaushala_id: '33333333-3333-3333-3333-333333333333',
  temple_id: null,
  amount_inr: '2500.00',
  razorpay_order_id: 'order_RrAcE0001',
  razorpay_payment_id: null,
  receipt_number: null,
  status: 'created',
  donor_pan: 'ABCDE1234F',
  dedication: 'For the cows',
  created_at: new Date('2026-09-08T10:00:00Z'),
  paid_at: null,
} as unknown as DonationRow;

function arrangeFinalizeDeps() {
  prismaMock.user.findUnique.mockResolvedValue({
    id: STALE_CREATED_SNAPSHOT.user_id,
    fullName: 'Devotee One',
    email: 'devotee@example.com',
  } as never);
  prismaMock.gaushalaProfile.findFirst.mockResolvedValue({
    userId: STALE_CREATED_SNAPSHOT.gaushala_id,
    gaushalaName: 'Shri Krishna Gaushala',
    address: 'Vrindavan, UP',
  } as never);
  prismaMock.$queryRawUnsafe.mockResolvedValue([] as never);
}

/** The SQL text of the mint UPDATE, whitespace-collapsed. */
function mintSql(): string {
  const call = prismaMock.$executeRawUnsafe.mock.calls.find((c) =>
    /UPDATE\s+donations/i.test(String((c as unknown as unknown[])[0])),
  );
  return String((call as unknown as unknown[] | undefined)?.[0] ?? '').replace(/\s+/g, ' ').trim();
}

async function loadDonations() {
  vi.resetModules();
  return import('./donations.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  arrangeFinalizeDeps();
});

describe('DI-09 — two concurrent receipt mints elect one winner', () => {
  it('the UPDATE is conditional on the row not already being paid', async () => {
    const { finalizeDonationReceipt } = await loadDonations();
    // Winner: the conditional UPDATE matches its row.
    prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);

    await finalizeDonationReceipt(STALE_CREATED_SNAPSHOT, 'pay_Rwinner01');

    // Without this predicate the statement is unconditional and the second
    // caller overwrites the first caller's receipt number.
    expect(mintSql()).toMatch(/WHERE\s+id\s*=\s*\$1\s+AND\s+status\s*<>\s*'paid'/i);
  });

  it('the winner mints, reports its receipt, and emails it', async () => {
    const { finalizeDonationReceipt } = await loadDonations();
    prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);

    const out = await finalizeDonationReceipt(STALE_CREATED_SNAPSHOT, 'pay_Rwinner01');

    expect(out.alreadyPaid).toBe(false);
    expect(out.receiptNumber).toMatch(/^DR-\d{8}-[0-9A-F]{4}$/);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('the loser does not mint a second receipt', async () => {
    const { finalizeDonationReceipt } = await loadDonations();
    // The conditional UPDATE matched nothing: the winner already flipped the
    // row to 'paid'. This is the ONLY signal the loser gets — its own snapshot
    // still says 'created'.
    prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);
    // Re-read of the row the winner wrote.
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { receipt_number: 'DR-20260908-AAAA', status: 'paid' },
    ] as never);

    const out = await finalizeDonationReceipt(STALE_CREATED_SNAPSHOT, 'pay_Rloser001');

    // The winner's number, not a fresh one. A fresh number here means the
    // loser overwrote a receipt already emailed to the donor.
    expect(out.receiptNumber).toBe('DR-20260908-AAAA');
    expect(out.alreadyPaid).toBe(true);
  });

  it('the loser sends no second receipt email and renders no second PDF', async () => {
    const { finalizeDonationReceipt } = await loadDonations();
    prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { receipt_number: 'DR-20260908-AAAA', status: 'paid' },
    ] as never);

    await finalizeDonationReceipt(STALE_CREATED_SNAPSHOT, 'pay_Rloser001');

    // Two 80G receipts for one donation is two tax documents for one gift.
    expect(generate80GReceiptMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('the loser records no second DONATION_RECEIVED', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const { finalizeDonationReceipt } = await loadDonations();
    prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);
    prismaMock.$queryRawUnsafe.mockResolvedValue([
      { receipt_number: 'DR-20260908-AAAA', status: 'paid' },
    ] as never);

    await finalizeDonationReceipt(STALE_CREATED_SNAPSHOT, 'pay_Rloser001');

    // recordMoneyEvent's namespaced unique would collapse a duplicate anyway,
    // but the trail must not depend on that: this call received no money.
    const received = recordMoneyEventSpy.mock.calls
      .map((c) => (c as unknown as [Record<string, unknown>])[0])
      .filter((e) => e.eventType === MONEY_EVENTS.DONATION_RECEIVED);
    expect(received).toEqual([]);
  });

  it('a loser that cannot re-read the winner’s row still refuses to claim a receipt', async () => {
    const { finalizeDonationReceipt } = await loadDonations();
    prismaMock.$executeRawUnsafe.mockResolvedValue(0 as never);
    // Re-read fails or returns nothing. Reporting the number this call
    // generated would be a receipt that exists in no database.
    prismaMock.$queryRawUnsafe.mockResolvedValue([] as never);

    const out = await finalizeDonationReceipt(STALE_CREATED_SNAPSHOT, 'pay_Rloser002');

    expect(out.receiptNumber).toBeNull();
    expect(out.alreadyPaid).toBe(true);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
