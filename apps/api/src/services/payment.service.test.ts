import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// RV-12: the whole finding is "the wrong AMOUNT reaches the gateway", so the
// refund tests must assert on the paise figure actually sent. The demo proxy
// baked into payment.service ignores its arguments, so we stand in a real
// (mocked) Razorpay class and drive the tests with a non-demo key. Tests that
// keep RAZORPAY_KEY_ID='rzp_test_demo' never construct it.
const { razorpayRefundMock, razorpayOrderCreateMock } = vi.hoisted(() => ({
  razorpayRefundMock: vi.fn(),
  razorpayOrderCreateMock: vi.fn(),
}));

vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    payments = { refund: razorpayRefundMock, fetch: vi.fn() };
    orders = { create: razorpayOrderCreateMock };
  },
}));

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RAZORPAY_KEY_ID = 'rzp_test_demo';
  process.env.RAZORPAY_KEY_SECRET = 'test_secret_key';
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test_webhook_secret';
});

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

// Helper: re-import service after env mutation. Razorpay client is
// initialised at module load, but the demo proxy is selected when
// RAZORPAY_KEY_ID is empty or "rzp_test_demo" — so we always run
// against the proxy here.
async function loadService() {
  vi.resetModules();
  const mod = await import('./payment.service.js');
  return new mod.PaymentService();
}

function hmacHex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

describe('PaymentService.verifyPayment', () => {
  it('throws on invalid signature', async () => {
    const service = await loadService();
    await expect(
      service.verifyPayment('order_x', 'pay_x', 'wrong_signature')
    ).rejects.toThrow(/invalid signature/);
  });

  it('throws when no payment record found', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue(null);

    await expect(
      service.verifyPayment('order_x', 'pay_x', sig)
    ).rejects.toThrow(/Payment record not found/);
  });

  it('throws when payment has no linked booking', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      booking: null,
    });

    await expect(
      service.verifyPayment('order_x', 'pay_x', sig)
    ).rejects.toThrow(/No booking linked/);
  });

  it('captures payment + confirms pending booking on valid signature', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      booking: { id: 'bk-1', bookingNumber: 'BS-X', status: 'pending_payment' },
    });
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.pujaBooking.update.mockResolvedValue({});

    const out = await service.verifyPayment('order_x', 'pay_x', sig);

    expect(out).toEqual({ verified: true, bookingId: 'bk-1', bookingNumber: 'BS-X' });
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pmt-1' },
        data: { status: 'captured', gatewayPaymentId: 'pay_x' },
      })
    );
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk-1' },
        data: { status: 'confirmed' },
      })
    );
  });

  // ── RV-04 / S2C-15 (2026-08-11) ─────────────────────────────────────────
  //
  // This is the PRIMARY commission writer — production confirms via this path
  // (and the webhook), not via a status PATCH — and it had no test coverage of
  // the row it writes at all. Both fields were wrong in opposite directions and
  // had to move together: fixing the key alone would have connected every
  // pandit to a row carrying the platform's 20%, i.e. a live 75% underpayment
  // in place of an inert orphan.
  describe('RV-04 — the commission row it writes on confirm', () => {
    // verifyPayment ends with `void fireAndForgetPostConfirmSideEffects(...)`,
    // whose dynamic imports keep issuing prisma calls after the awaited call
    // resolves. These tests mock the booking fully enough that the chain gets
    // far enough to pollute the NEXT test's spy counts, so drain it here.
    const settleSideEffects = () => new Promise((r) => setTimeout(r, 25));

    function confirmingPayment() {
      prismaMock.payment.findFirst.mockResolvedValue({
        id: 'pmt-1',
        booking: { id: 'bk-1', bookingNumber: 'BS-X', status: 'pending_payment' },
      });
      prismaMock.payment.update.mockResolvedValue({});
      prismaMock.pujaBooking.update.mockResolvedValue({});
      // ₹1,100 puja + ₹51 platform fee: pandit 80% = ₹880, platform 20% = ₹220.
      prismaMock.pujaBooking.findUnique.mockResolvedValue({
        id: 'bk-1',
        templeId: 't-1',
        priceAmount: new Prisma.Decimal(1151),
        priestPayout: new Prisma.Decimal(880),
        platformCommission: new Prisma.Decimal(220),
        priestId: 'pr-1',
        priest: { userId: 'user-pandit-1' },
      });
      prismaMock.commission.findFirst.mockResolvedValue(null);
      prismaMock.commission.create.mockResolvedValue({ id: 'c-1' });
    }

    it("keys on the pandit's User.id and carries the pandit's 80%", async () => {
      const service = await loadService();
      const sig = hmacHex('test_secret_key', 'order_x|pay_x');
      confirmingPayment();

      await service.verifyPayment('order_x', 'pay_x', sig);

      const data = (prismaMock.commission.create.mock.calls[0]![0] as any).data;
      // Was `booking.priestId` — a Priest.id, which matches no payout read.
      expect(data.providerId).toBe('user-pandit-1');
      expect(data.providerId).not.toBe('pr-1');
      // Was `booking.platformCommission` (₹220) in the field the payout engine
      // reads as the provider's net earning.
      expect(data.amount.toString()).toBe('880');
      // `percentage` is the PLATFORM's take rate, never the provider's share —
      // one column, one meaning (lib/commission-math.ts). Reading it as the
      // provider's share is what inverted /astrologer-portal/earnings.
      expect(data.percentage.toNumber()).toBeCloseTo((1151 - 880) / 1151, 12);
      expect(data.status).toBe('PENDING');

      await settleSideEffects();
    });

    it('writes nothing when the pandit has no linked user (no new orphans)', async () => {
      const service = await loadService();
      const sig = hmacHex('test_secret_key', 'order_x|pay_x');
      confirmingPayment();
      prismaMock.pujaBooking.findUnique.mockResolvedValue({
        id: 'bk-1',
        templeId: 't-1',
        priceAmount: new Prisma.Decimal(1151),
        priestPayout: new Prisma.Decimal(880),
        platformCommission: new Prisma.Decimal(220),
        priestId: 'pr-1',
        priest: null,
      });

      await service.verifyPayment('order_x', 'pay_x', sig);

      expect(prismaMock.commission.create).not.toHaveBeenCalled();

      await settleSideEffects();
    });
  });

  it('does not re-confirm an already-confirmed booking', async () => {
    const service = await loadService();
    const sig = hmacHex('test_secret_key', 'order_x|pay_x');
    prismaMock.payment.findFirst.mockResolvedValue({
      id: 'pmt-1',
      booking: { id: 'bk-1', bookingNumber: 'BS-X', status: 'confirmed' },
    });
    prismaMock.payment.update.mockResolvedValue({});
    // The preceding confirm tests end with fire-and-forget side-effects whose
    // async continuations can still land here. Clear immediately before the
    // act so this assertion measures only this call.
    prismaMock.pujaBooking.update.mockClear();

    await service.verifyPayment('order_x', 'pay_x', sig);

    expect(prismaMock.pujaBooking.update).not.toHaveBeenCalled();
  });
});

describe('PaymentService.handleWebhookRaw', () => {
  it('rejects when signature mismatches raw body HMAC', async () => {
    const service = await loadService();
    const rawBody = '{"event":"payment.captured"}';
    const wrong = hmacHex('different_secret', rawBody);

    await expect(
      service.handleWebhookRaw(rawBody, JSON.parse(rawBody), wrong)
    ).rejects.toThrow(/signature verification failed/);
  });

  it('rejects when signatures differ in length (timing-safe guard)', async () => {
    const service = await loadService();
    await expect(
      service.handleWebhookRaw('{}', {}, 'short')
    ).rejects.toThrow(/signature verification failed/);
  });

  it('accepts valid HMAC of raw body and dispatches event', async () => {
    const service = await loadService();
    const payload = { event: 'payment.captured', payload: { payment: { entity: { order_id: 'order_x' } } } };
    const rawBody = JSON.stringify(payload);
    const sig = hmacHex('test_webhook_secret', rawBody);
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const out = await service.handleWebhookRaw(rawBody, payload, sig);

    expect(out.handled).toBeDefined();
  });
});

describe('PaymentService.createPriestPayout — video proof gate (P0 #5)', () => {
  // Regression lock: payouts must only be creatable for bookings whose
  // status is video_uploaded or delivered. The state machine in
  // booking.service.ts forbids reaching `delivered` without first hitting
  // `video_uploaded`, so this is the single chokepoint enforcing
  // "no video proof → no priest payout".
  const baseBooking = {
    id: 'bk-1',
    priestId: 'priest-1',
    priestPayout: 350,
    currency: 'INR',
    bookingNumber: 'BS-20260512-AAAAA',
  };

  it.each([
    'pending_payment',
    'confirmed',
    'priest_assigned',
    'in_progress',
    'completed', // <-- the dangerous one: priest done, but no video proof yet
    'cancelled',
    'refunded',
  ])('refuses payout for status=%s (no video proof yet)', async (status) => {
    const service = await loadService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({ ...baseBooking, status });

    await expect(service.createPriestPayout('bk-1')).rejects.toThrow(
      /can only be created for bookings in "video_uploaded" or "delivered"/
    );
    expect(prismaMock.priestPayout.create).not.toHaveBeenCalled();
  });

  it.each(['video_uploaded', 'delivered'])(
    'allows payout for status=%s (video proof on file)',
    async (status) => {
      const service = await loadService();
      prismaMock.pujaBooking.findUnique.mockResolvedValue({ ...baseBooking, status });
      prismaMock.priest.findUnique.mockResolvedValue({
        aadhaarVerified: true,
        displayName: 'Test Priest',
      });
      prismaMock.priestPayout.findFirst.mockResolvedValue(null);
      // No Commission row for this booking -> the legacy rail owns it.
      prismaMock.commission.findFirst.mockResolvedValue(null);
      prismaMock.priestPayout.create.mockResolvedValue({
        id: 'po-1',
        priestId: 'priest-1',
        bookingId: 'bk-1',
        amount: 350,
        status: 'pending',
      });

      const out = await service.createPriestPayout('bk-1');
      expect('id' in out && out.id).toBe('po-1');
    }
  );

  // The double-pay rail, found by adversarial review 2026-08-11: repairing the
  // Commission key (RV-04) made the unified /payouts rail live for the same
  // money PriestPayout already carried, with nothing cross-checking them.
  // A reschedule detaches the pandit and REVERSES his commission. That voided
  // row must not block the replacement pandit: if the guard matched it, he
  // would be paid by neither rail (the unified rail has nothing live for him).
  it('ignores a REVERSED commission — a voided row must not strand the next pandit', async () => {
    const service = await loadService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...baseBooking,
      status: 'video_uploaded',
    });
    prismaMock.priest.findUnique.mockResolvedValue({
      aadhaarVerified: true,
      displayName: 'Replacement Priest',
    });
    prismaMock.priestPayout.findFirst.mockResolvedValue(null);
    // The guard filters REVERSED out in SQL, so the query returns nothing.
    prismaMock.commission.findFirst.mockResolvedValue(null);
    prismaMock.priestPayout.create.mockResolvedValue({ id: 'po-2', amount: 350 });

    const out = await service.createPriestPayout('bk-1');

    expect('id' in out && out.id).toBe('po-2');
    // Bind to the actual predicate — this is the half of the pair that makes
    // reversing (rather than deleting) safe in booking.service.
    const where = (prismaMock.commission.findFirst.mock.calls[0]![0] as any).where;
    expect(where.status).toEqual({ not: 'REVERSED' });
  });

  it('does NOT mint a PriestPayout when the unified Commission ledger owns the booking', async () => {
    const service = await loadService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...baseBooking,
      status: 'video_uploaded',
    });
    prismaMock.priest.findUnique.mockResolvedValue({
      aadhaarVerified: true,
      displayName: 'Test Priest',
    });
    prismaMock.priestPayout.findFirst.mockResolvedValue(null);
    prismaMock.commission.findFirst.mockResolvedValue({ id: 'c-1' });

    const out = await service.createPriestPayout('bk-1');

    expect('skipped' in out && out.skipped).toBe(true);
    // The whole point: no second payable row for money rail A already owns.
    expect(prismaMock.priestPayout.create).not.toHaveBeenCalled();
  });

  it('refuses payout when priest.aadhaarVerified=false (business rule #4)', async () => {
    const service = await loadService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...baseBooking,
      status: 'video_uploaded',
    });
    prismaMock.priest.findUnique.mockResolvedValue({
      aadhaarVerified: false,
      displayName: 'Unverified Priest',
    });

    await expect(service.createPriestPayout('bk-1')).rejects.toThrow(
      /has not completed Aadhaar verification/
    );
    expect(prismaMock.priestPayout.create).not.toHaveBeenCalled();
  });

  it('refuses payout when assigned priest record missing', async () => {
    const service = await loadService();
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...baseBooking,
      status: 'delivered',
    });
    prismaMock.priest.findUnique.mockResolvedValue(null);

    await expect(service.createPriestPayout('bk-1')).rejects.toThrow(
      /Assigned priest not found/
    );
    expect(prismaMock.priestPayout.create).not.toHaveBeenCalled();
  });
});

describe('PaymentService — no cross-rail Commission writer (markPayoutPaid stays deleted)', () => {
  // The mutual-exclusion guard tested above protects the WRITE path: a booking
  // the Commission ledger owns never gets a second payable PriestPayout row.
  // `markPayoutPaid` was the hole in it — a callerless method that completed a
  // PriestPayout and flipped the first Commission matching the same bookingId
  // to PAID with no `status`/`payoutRequestId` predicate. Because
  // refund.service scopes its REVERSED write to `payoutRequestId: null`, it was
  // the only code path in the repo that could put a non-PENDING row inside an
  // OPEN PayoutRequest, which permanently strands that request: processPayout's
  // completion guard throws, reject unlinks the rows, and the already-PAID one
  // drops out of getPayoutBalance with the provider's money on it.
  //
  // These two assertions are the lock. Reintroducing the method fails the
  // first; reintroducing the ledger write under any other name fails the
  // second. A test that only drove the surviving methods would pass with the
  // bug back, so it has to bind to the absence itself.

  it('exposes no markPayoutPaid on the service surface', async () => {
    const service = await loadService();
    expect((service as unknown as Record<string, unknown>).markPayoutPaid).toBeUndefined();
    expect(Object.getOwnPropertyNames(Object.getPrototypeOf(service))).not.toContain(
      'markPayoutPaid'
    );
  });

  it('never mutates an existing Commission row — it only mints PENDING ones', () => {
    const source = readFileSync(
      fileURLToPath(new URL('./payment.service.ts', import.meta.url)),
      'utf8'
    );
    // Strip comments so the tombstone explaining the removal cannot satisfy
    // (or trip) the match.
    const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    expect(code).not.toMatch(/commission\s*\.\s*(update|updateMany|upsert|delete|deleteMany)\b/);
    // Commission lifecycle after minting belongs to payout.service (PAID) and
    // refund.service (REVERSED). This service creates and reads, nothing else.
    expect(code).toMatch(/commission\s*\.\s*create\b/);
  });
});

describe('PaymentService.processRefund — RV-12 partial refunds + cancellation ladder', () => {
  // RV-12 (2026-08-10): the admin refund endpoint had NO amount parameter and
  // always refunded 100% of the captured amount. On a Rs 1,100 booking
  // cancelled 12h before the slot the snapshotted ladder awards 50% (Rs 550);
  // the retained Rs 550 is pandit compensation, so a blanket 100% refund paid
  // it out of the pandit's pocket. These lock the amount that reaches Razorpay.

  // 2026-09-01 is a DATE column value (UTC midnight); '18:00' is IST, so the
  // real slot instant is 2026-09-01T12:30:00Z.
  const SLOT_DATE = new Date('2026-09-01');
  const SLOT = '18:00';

  function makePayment(over: Record<string, unknown> = {}) {
    return {
      id: 'pmt-1',
      amount: new Prisma.Decimal('1100.00'),
      refundAmount: null as Prisma.Decimal | null,
      status: 'captured',
      gatewayPaymentId: 'pay_abc123',
      metadata: { orderId: 'order_abc' },
      ...over,
    };
  }

  function makeBooking(over: Record<string, unknown> = {}, payment = makePayment()) {
    return {
      id: 'bk-1',
      bookingNumber: 'BS-20260901-AAAAA',
      scheduledDate: SLOT_DATE,
      scheduledTimeSlot: SLOT,
      priceAmount: new Prisma.Decimal('1100.00'),
      status: 'cancelled',
      cancelledAt: null as Date | null,
      cancellationReason: null as string | null,
      payments: [payment],
      ...over,
    };
  }

  /** Arrange: booking lookup, then cancellationService.getPolicy's own lookup. */
  function arrange(booking: unknown, cancelPolicyJson: unknown = null) {
    prismaMock.pujaBooking.findUnique
      .mockResolvedValueOnce(booking)
      .mockResolvedValueOnce({ cancelPolicyJson });
    prismaMock.payment.update.mockResolvedValue({});
    prismaMock.pujaBooking.update.mockResolvedValue({});
    // DI-02: the partial rail now reads the claimable ledger rows before
    // scaling them. Rs 880 is the pandit's 80% of a Rs 1,100 puja.
    prismaMock.commission.findMany.mockResolvedValue([
      { id: 'c1', amount: new Prisma.Decimal('880.00') },
    ]);
    prismaMock.commission.update.mockResolvedValue({});
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.templePayout.findMany.mockResolvedValue([]);
  }

  async function loadLiveService() {
    // Non-demo key so the mocked Razorpay class is constructed instead of the
    // argument-ignoring demo proxy.
    process.env.RAZORPAY_KEY_ID = 'rzp_live_unit_test';
    process.env.RAZORPAY_KEY_SECRET = 'secret_unit_test';
    vi.resetModules();
    const mod = await import('./payment.service.js');
    return new mod.PaymentService();
  }

  beforeEach(() => {
    // vi.clearAllMocks() does NOT drain a mockResolvedValueOnce queue. Tests
    // here enqueue two values but consume only one when the ladder is skipped,
    // so without an explicit reset the leftover poisons the next test.
    prismaMock.pujaBooking.findUnique.mockReset();
    razorpayRefundMock.mockReset();
    razorpayRefundMock.mockResolvedValue({ id: 'rfnd_test_1' });
  });

  // ── Ledger reversal on refund (2026-08-12, P0) ──────────────────────────
  //
  // There are TWO refund rails. refund.service reversed the provider ledger
  // (RV-02); THIS one refunded the devotee and left the pandit's earning
  // PENDING and fully withdrawable. Driven end to end by an audit agent:
  // BS-20260812-J3M76 was refunded Rs 1,151 here, then a Rs 770 payout request
  // was raised successfully against that same refunded booking — the platform
  // pays the devotee back AND pays the pandit, roughly 172% of booking value,
  // with no alert anywhere. Both rails now share reverseBookingLedger().
  it('reverses the provider ledger on a FULL refund — otherwise a refund pays out twice', async () => {
    const service = await loadLiveService();
    arrange(
      makeBooking({
        cancelledAt: new Date('2026-08-25T00:00:00Z'), // >7 days out -> 100% tier
        cancellationReason: '[refund-requested] full refund',
      })
    );
    prismaMock.commission.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.commission.count.mockResolvedValue(0);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 1 });

    const out = await service.processRefund('bk-1', 'admin-1');
    expect(out.status).toBe('refunded');

    // The assertion that matters: the pandit's earning is voided in the SAME
    // transaction as the refund, and only while it is still unclaimed.
    expect(prismaMock.commission.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'bk-1', status: 'PENDING', payoutRequestId: null },
      data: { status: 'REVERSED' },
    });
    // Money already paid out or mid-transfer is NEVER silently clawed back.
    expect(prismaMock.commission.count).toHaveBeenCalledWith({
      where: { bookingId: 'bk-1', OR: [{ status: 'PAID' }, { payoutRequestId: { not: null } }] },
    });
    // The temple's share follows the same rule.
    expect(prismaMock.templePayout.updateMany).toHaveBeenCalledWith({
      where: { bookingId: 'bk-1', status: 'pending' },
      data: { status: 'reversed' },
    });
  });

  it('unwinds the ledger PROPORTIONALLY on a PARTIAL refund (DI-02)', async () => {
    // This test used to assert the opposite — that a partial reversed NOTHING —
    // on the grounds that splitting an earning was an owner decision. It is
    // not: the take-rate doctrine is a uniform 20/80, and applying it to the
    // revenue actually retained is the same rule. Meanwhile the published
    // ladder (100/75/50/25/0) makes partial the NORMAL case, so every
    // mid-ladder cancellation refunded the devotee AND paid the pandit in full
    // — about -Rs 550 per cancellation on a Rs 1,100 puja.
    //
    // 50% tier: Rs 550 refunded of Rs 1,100, so the pandit keeps half of his
    // Rs 880 and the row is SCALED, never REVERSED.
    const service = await loadLiveService();
    arrange(
      makeBooking({
        cancelledAt: new Date('2026-09-01T00:30:00Z'), // 12h out -> 50% tier
        cancellationReason: '[refund-requested] partial',
      })
    );
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 });

    const out = await service.processRefund('bk-1', 'admin-1');
    expect(out.status).toBe('partially_refunded');
    expect(prismaMock.commission.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.commission.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' } }),
    );
    const amount = prismaMock.commission.update.mock.calls[0]![0].data.amount;
    expect(amount.toString()).toBe('440');
  });

  it('applies the 50% tier (12h out) instead of refunding 100%', async () => {
    const service = await loadLiveService();
    arrange(
      makeBooking({
        // 2026-09-01T00:30:00Z = 12h before the 12:30Z slot instant.
        cancelledAt: new Date('2026-09-01T00:30:00Z'),
        cancellationReason: '[refund-requested] changed my mind',
      })
    );

    const out = await service.processRefund('bk-1', 'admin-1');

    expect(out.amount).toBe(550);
    expect(out.status).toBe('partially_refunded');
    expect(out.refundFraction).toBe(0.5);
    // The load-bearing assertion: 55000 paise, NOT the old 110000.
    expect(razorpayRefundMock).toHaveBeenCalledWith(
      'pay_abc123',
      expect.objectContaining({ amount: 55000 })
    );
  });

  it('applies the 75% tier (36h out)', async () => {
    const service = await loadLiveService();
    arrange(makeBooking({ cancelledAt: new Date('2026-08-31T00:30:00Z') }));

    const out = await service.processRefund('bk-1', 'admin-1');

    expect(out.amount).toBe(825);
    expect(out.refundFraction).toBe(0.75);
    expect(razorpayRefundMock).toHaveBeenCalledWith(
      'pay_abc123',
      expect.objectContaining({ amount: 82500 })
    );
  });

  it('applies the 100% tier (72h out) and flips the booking to refunded', async () => {
    const service = await loadLiveService();
    arrange(makeBooking({ cancelledAt: new Date('2026-08-29T12:30:00Z') }));

    const out = await service.processRefund('bk-1', 'admin-1');

    expect(out.amount).toBe(1100);
    expect(out.status).toBe('refunded');
    expect(razorpayRefundMock).toHaveBeenCalledWith(
      'pay_abc123',
      expect.objectContaining({ amount: 110000 })
    );
    expect(prismaMock.pujaBooking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'bk-1' },
        data: expect.objectContaining({ status: 'refunded' }),
      })
    );
  });

  it('honours an explicit partial amount and marks the payment partially_refunded', async () => {
    const service = await loadLiveService();
    arrange(makeBooking());

    const out = await service.processRefund('bk-1', 'admin-1', { amountInr: 250 });

    expect(out.amount).toBe(250);
    expect(out.status).toBe('partially_refunded');
    expect(out.tierLabel).toBeUndefined();
    expect(razorpayRefundMock).toHaveBeenCalledWith(
      'pay_abc123',
      expect.objectContaining({ amount: 25000 })
    );
    expect(prismaMock.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'pmt-1' },
        data: expect.objectContaining({ status: 'partially_refunded' }),
      })
    );
  });

  it('does NOT flip the booking to refunded on a partial, and clears the refund-requested marker', async () => {
    // Otherwise processAutoRefunds (which selects on that marker and accepts a
    // partially_refunded payment) would refund the same booking again an hour later.
    const service = await loadLiveService();
    arrange(
      makeBooking({
        cancelledAt: new Date('2026-09-01T00:30:00Z'),
        cancellationReason: '[refund-requested] changed my mind',
      })
    );

    await service.processRefund('bk-1', 'admin-1');

    const bookingPatch = prismaMock.pujaBooking.update.mock.calls[0]![0].data as Record<
      string,
      unknown
    >;
    expect(bookingPatch.status).toBeUndefined();
    expect(String(bookingPatch.cancellationReason)).toMatch(/^\[partially-refunded 550\.00\]/);
    expect(String(bookingPatch.cancellationReason)).not.toMatch(/^\[refund-requested\]/);
  });

  it('fullRefund:true bypasses the ladder (pandit-fault path)', async () => {
    const service = await loadLiveService();
    arrange(makeBooking({ cancelledAt: new Date('2026-09-01T00:30:00Z') }));

    const out = await service.processRefund('bk-1', 'admin-1', { fullRefund: true });

    expect(out.amount).toBe(1100);
    expect(out.status).toBe('refunded');
    expect(out.tierLabel).toBeUndefined();
  });

  it('clamps an over-large explicit amount to what is still refundable', async () => {
    const service = await loadLiveService();
    arrange(makeBooking());

    const out = await service.processRefund('bk-1', 'admin-1', { amountInr: 99999 });

    expect(out.amount).toBe(1100);
    expect(out.status).toBe('refunded');
    expect(razorpayRefundMock).toHaveBeenCalledWith(
      'pay_abc123',
      expect.objectContaining({ amount: 110000 })
    );
  });

  it('tops up an already partially-refunded payment by the remaining balance only', async () => {
    const service = await loadLiveService();
    const payment = makePayment({
      status: 'partially_refunded',
      refundAmount: new Prisma.Decimal('550.00'),
    });
    arrange(makeBooking({}, payment), null);

    const out = await service.processRefund('bk-1', 'admin-1', { amountInr: 900 });

    // Only Rs 550 remains refundable — the top-up is clamped and completes the refund.
    expect(out.amount).toBe(550);
    expect(out.status).toBe('refunded');
    const paymentPatch = prismaMock.payment.update.mock.calls[0]![0].data as Record<
      string,
      unknown
    >;
    expect(String(paymentPatch.refundAmount)).toBe('1100');
  });

  it('refuses a second refund once the payment is fully refunded', async () => {
    const service = await loadLiveService();
    const payment = makePayment({
      status: 'partially_refunded',
      refundAmount: new Prisma.Decimal('1100.00'),
    });
    arrange(makeBooking({}, payment));

    await expect(service.processRefund('bk-1', 'admin-1')).rejects.toThrow(
      /already been fully refunded/
    );
    expect(razorpayRefundMock).not.toHaveBeenCalled();
  });

  it('rejects a non-positive explicit amount', async () => {
    const service = await loadLiveService();
    arrange(makeBooking());

    await expect(
      service.processRefund('bk-1', 'admin-1', { amountInr: 0 })
    ).rejects.toThrow(/positive number of rupees/);
    expect(razorpayRefundMock).not.toHaveBeenCalled();
  });

  it('honours a snapshotted policy that differs from the current default', async () => {
    const service = await loadLiveService();
    arrange(makeBooking({ cancelledAt: new Date('2026-09-01T00:30:00Z') }), {
      tiers: [{ minHoursBefore: 0, refundFraction: 0.1, label: 'legacy 10%' }],
      panditCancelRefundFraction: 1,
      noShowRefundFraction: 0,
      cancellationFeeToPriestFraction: 1,
      refundDaysLabel: '5-7 business days',
    });

    const out = await service.processRefund('bk-1', 'admin-1');

    expect(out.amount).toBe(110);
    expect(out.tierLabel).toBe('legacy 10%');
  });

  it('refuses to apply the ladder to a booking that was never cancelled', async () => {
    // hoursUntilSlot is negative on a delivered puja, so every tier fails and
    // cancellation.service's "?? last tier" fallback would silently hand back
    // 25%. The admin must name an amount (or fullRefund) instead.
    const service = await loadLiveService();
    arrange(makeBooking({ status: 'delivered', cancelledAt: null }));

    await expect(service.processRefund('bk-1', 'admin-1')).rejects.toThrow(
      /has not been cancelled/
    );
    expect(razorpayRefundMock).not.toHaveBeenCalled();
  });

  it('still refunds a never-cancelled booking when the admin is explicit', async () => {
    const service = await loadLiveService();
    arrange(makeBooking({ status: 'delivered', cancelledAt: null }));

    const out = await service.processRefund('bk-1', 'admin-1', { fullRefund: true });

    expect(out.amount).toBe(1100);
    expect(out.status).toBe('refunded');
  });

  it('still refuses when the booking has no refundable payment', async () => {
    const service = await loadLiveService();
    prismaMock.pujaBooking.findUnique.mockResolvedValueOnce(makeBooking({ payments: [] }));

    await expect(service.processRefund('bk-1', 'admin-1')).rejects.toThrow(
      /No captured payment found/
    );
  });
});

describe('PaymentService.handleWebhook (legacy JSON.stringify path)', () => {
  it('verifies against re-serialised JSON.stringify(payload)', async () => {
    const service = await loadService();
    const payload = { event: 'payment.captured', payload: {} };
    const sig = hmacHex('test_webhook_secret', JSON.stringify(payload));
    prismaMock.payment.findFirst.mockResolvedValue(null);

    const out = await service.handleWebhook(payload, sig);
    expect(out.handled).toBeDefined();
  });

  it('rejects bad signature', async () => {
    const service = await loadService();
    await expect(
      service.handleWebhook({ event: 'x' }, 'bad')
    ).rejects.toThrow(/signature verification failed/);
  });
});
