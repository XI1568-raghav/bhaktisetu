import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * OPS-05 (donation rail) — the last money flow with NO audit trail at all.
 *
 * `MONEY_EVENTS.DONATION_RECEIVED` shipped as a declared constant with zero
 * writers: grepping `apps/api/src` for it returned `lib/audit-money.ts:91`
 * (the declaration) and `lib/audit-money.test.ts:731` (a unit test of the
 * writer) and nothing else. Every other money rail had been wired — payment,
 * refund, payout, commission, booking — and donations, which are the ONLY rail
 * that also mints an 80G tax receipt, had none.
 *
 * The gap is structural, not an oversight of one call site: donations write no
 * `prisma.payment` row (`routes/donations.ts` raw-INSERTs into `donations`),
 * so none of the Payment-keyed audit wiring in `payment.service.ts` can ever
 * reach them. A donor disputing "you took my money and sent me a receipt for
 * the wrong trust" had exactly one source of truth — the Render log stream,
 * days of retention on the free plan, and gone entirely while the service was
 * suspended.
 *
 * `finalizeDonationReceipt` is the single writer that flips a donation to
 * 'paid', shared by `/verify` and the webhook backstop in
 * `payment.service.processWebhookEvent`. Wiring it there covers both rails at
 * once, which is why the actor-type default matters and is asserted below.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { recordMoneyEventSpy } = vi.hoisted(() => ({
  recordMoneyEventSpy: vi.fn(() => Promise.resolve({ ok: true, wrote: true, id: 'evt-1' })),
}));

// MONEY_EVENTS stays real — asserting the literal string would let a renamed
// constant pass a test that no longer describes the shipped event.
vi.mock('../lib/audit-money.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audit-money.js')>();
  return { ...actual, recordMoneyEvent: recordMoneyEventSpy };
});

// The receipt PDF and the email are best-effort side effects of the finalize
// path; neither is under test here and both are slow.
vi.mock('../lib/pdf-receipt.js', () => ({
  generate80GReceipt: vi.fn(async () => Buffer.from('pdf')),
  is80GEligible: vi.fn(() => false),
}));
vi.mock('../lib/email.js', () => ({
  sendEmail: vi.fn(async () => undefined),
  donationReceiptEmail: vi.fn(() => ({ subject: 's', html: 'h', text: 't' })),
}));

type DonationRow = Parameters<
  Awaited<typeof import('./donations.js')>['finalizeDonationReceipt']
>[0];

const GAUSHALA_DONATION = {
  id: 'don_1756000000000_abcd1234',
  user_id: '22222222-2222-2222-2222-222222222222',
  gaushala_id: '33333333-3333-3333-3333-333333333333',
  temple_id: null,
  amount_inr: '2500.00',
  razorpay_order_id: 'order_ROrDeR001',
  razorpay_payment_id: null,
  receipt_number: null,
  status: 'created',
  donor_pan: 'ABCDE1234F',
  dedication: 'For the cows',
  created_at: new Date('2026-08-30T10:00:00Z'),
  paid_at: null,
} as unknown as DonationRow;

const TEMPLE_DONATION = {
  ...(GAUSHALA_DONATION as unknown as Record<string, unknown>),
  id: 'don_1756000000001_efgh5678',
  gaushala_id: null,
  temple_id: '44444444-4444-4444-4444-444444444444',
  razorpay_order_id: 'order_ROrDeR002',
} as unknown as DonationRow;

function arrangeFinalizeDeps() {
  prismaMock.user.findUnique.mockResolvedValue({
    id: GAUSHALA_DONATION.user_id,
    fullName: 'Devotee One',
    email: 'devotee@example.com',
  } as never);
  prismaMock.gaushalaProfile.findFirst.mockResolvedValue({
    userId: GAUSHALA_DONATION.gaushala_id,
    gaushalaName: 'Shri Krishna Gaushala',
    address: 'Vrindavan, UP',
  } as never);
  prismaMock.temple.findUnique.mockResolvedValue({
    id: TEMPLE_DONATION.temple_id,
    name: 'Somnath Temple',
    addressLine: 'Prabhas Patan',
    city: 'Veraval',
    state: 'Gujarat',
    pincode: '362268',
  } as never);
  // `SELECT pan, regn_80g ...` — no tax fields registered for any donee.
  prismaMock.$queryRawUnsafe.mockResolvedValue([] as never);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
}

/** Every money event recorded during the call, in order. */
function recordedEvents(): Array<Record<string, unknown>> {
  return recordMoneyEventSpy.mock.calls.map(
    (c) => (c as unknown as [Record<string, unknown>])[0],
  );
}

async function loadDonations() {
  vi.resetModules();
  return import('./donations.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  arrangeFinalizeDeps();
});

describe('OPS-05 — donations are on the money trail', () => {
  it('records DONATION_RECEIVED when a gaushala donation is finalized', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const { finalizeDonationReceipt } = await loadDonations();

    const result = await finalizeDonationReceipt(GAUSHALA_DONATION, 'pay_RcApTuRe01', undefined, {
      actorType: 'devotee',
      actorId: GAUSHALA_DONATION.user_id,
      rail: 'donations/verify',
      requestId: 'req-77',
      ip: '203.0.113.9',
    });
    expect(result.alreadyPaid).toBe(false);

    const received = recordedEvents().filter(
      (e) => e.eventType === MONEY_EVENTS.DONATION_RECEIVED,
    );
    expect(received).toHaveLength(1);

    const event = received[0]!;
    expect(event.subjectType).toBe('donation');
    expect(event.subjectId).toBe(GAUSHALA_DONATION.id);
    // RUPEES off the stored DECIMAL(10,2), not paise and not a float
    // round-trip — the trail figure must be the ledger figure.
    expect(String(event.amount)).toBe('2500.00');
    expect(event.gateway).toBe('razorpay');
    expect(event.gatewayOrderId).toBe('order_ROrDeR001');
    expect(event.gatewayPaymentId).toBe('pay_RcApTuRe01');
    expect(event.statusBefore).toBe('created');
    expect(event.statusAfter).toBe('paid');
    // The bare natural key — recordMoneyEvent namespaces by eventType itself.
    expect(event.idempotencyKey).toBe(GAUSHALA_DONATION.id);
    expect(event.actorType).toBe('devotee');
    expect(event.actorId).toBe(GAUSHALA_DONATION.user_id);
    expect(event.requestId).toBe('req-77');
    expect(event.ip).toBe('203.0.113.9');

    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.doneeKind).toBe('gaushala');
    expect(metadata.doneeId).toBe(GAUSHALA_DONATION.gaushala_id);
    expect(metadata.doneeName).toBe('Shri Krishna Gaushala');
    // The receipt number is the document handed to the tax authority; a trail
    // that cannot name it cannot answer a receipt dispute.
    expect(String(metadata.receiptNumber)).toMatch(/^DR-\d{8}-[0-9A-F]{4}$/);
    // The donor PAN must NOT be copied into the audit log.
    expect(JSON.stringify(metadata)).not.toContain('ABCDE1234F');
  });

  it('names the temple donee on the temple rail', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const { finalizeDonationReceipt } = await loadDonations();

    await finalizeDonationReceipt(TEMPLE_DONATION, 'pay_RcApTuRe02');

    const event = recordedEvents().find(
      (e) => e.eventType === MONEY_EVENTS.DONATION_RECEIVED,
    )!;
    expect(event).toBeDefined();
    const metadata = event.metadata as Record<string, unknown>;
    expect(metadata.doneeKind).toBe('temple');
    expect(metadata.doneeId).toBe(TEMPLE_DONATION.temple_id);
    expect(metadata.doneeName).toBe('Somnath Temple');
  });

  it('defaults to the gateway actor so the webhook backstop is not mislabelled', async () => {
    const { finalizeDonationReceipt } = await loadDonations();

    // Exactly how payment.service.processWebhookEvent calls it: positionally,
    // with no audit context. If the default were 'devotee' or 'system', every
    // browser-died-mid-checkout donation would be attributed to the wrong
    // party — which is the fact a dispute actually turns on.
    await finalizeDonationReceipt(GAUSHALA_DONATION, 'pay_RcApTuRe03', undefined);

    const event = recordedEvents()[0]!;
    expect(event.actorType).toBe('gateway');
    expect(event.actorId).toBeNull();
    expect(String(event.metadata && (event.metadata as Record<string, unknown>).rail)).toMatch(
      /webhook/i,
    );
  });

  it('records nothing when the donation was already paid', async () => {
    const { finalizeDonationReceipt } = await loadDonations();

    const already = {
      ...(GAUSHALA_DONATION as unknown as Record<string, unknown>),
      status: 'paid',
      receipt_number: 'DR-20260830-AAAA',
    } as unknown as DonationRow;

    const result = await finalizeDonationReceipt(already, 'pay_RcApTuRe04');
    expect(result).toEqual({ receiptNumber: 'DR-20260830-AAAA', alreadyPaid: true });
    // A second receive for the same money would double-count it in the trail.
    expect(recordMoneyEventSpy).not.toHaveBeenCalled();
  });

  it('logs the receive before the receipt PDF, so a failed PDF still leaves a trail', async () => {
    const { MONEY_EVENTS } = await import('../lib/audit-money.js');
    const pdf = await import('../lib/pdf-receipt.js');
    vi.mocked(pdf.generate80GReceipt).mockRejectedValueOnce(new Error('pdfkit exploded'));
    const { finalizeDonationReceipt } = await loadDonations();

    await finalizeDonationReceipt(GAUSHALA_DONATION, 'pay_RcApTuRe05');

    expect(
      recordedEvents().filter((e) => e.eventType === MONEY_EVENTS.DONATION_RECEIVED),
    ).toHaveLength(1);
  });

  it('a failing audit write can never fail the donation', async () => {
    const { finalizeDonationReceipt } = await loadDonations();
    // recordMoneyEvent is contractually non-throwing, but a call site that
    // awaited a rejecting stub would take the money path down with it.
    recordMoneyEventSpy.mockRejectedValueOnce(new Error('audit table missing'));

    const result = await finalizeDonationReceipt(GAUSHALA_DONATION, 'pay_RcApTuRe06');
    expect(result.alreadyPaid).toBe(false);
    expect(result.receiptNumber).toMatch(/^DR-/);
  });
});
