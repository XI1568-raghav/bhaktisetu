import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * NOTIF-04 (P0) — a refunded devotee with no email address is told NOTHING.
 *
 * `notifyRefundProcessed` was written, documented as the fix for exactly this
 * gap, unit-tested — and never called. Repo-wide grep for the symbol returned
 * only its own definition (booking-notify.service.ts:285), its docblock and its
 * own test. The single refund notice in the product was refund.service's
 * `sendEmail`, gated twice: `if (booking.user.email)` then RESEND_API_KEY inside
 * sendEmail. A phone-OTP devotee — the cohort the WhatsApp-first GTM targets —
 * got their money back with zero notice on any channel. Worst on the cron
 * auto-refund path (processAutoRefunds), which fires an hour after cancellation
 * with no user-initiated trigger at all. The predictable next step is a
 * chargeback on a refund that was already paid.
 *
 * There are TWO refund rails and BOTH must announce. These tests assert the
 * dispatch on the REAL code path — driving processRefund end to end — not that
 * a helper exists.
 */

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const { notifyRefundProcessedMock, sendEmailMock, razorpayRefundMock } = vi.hoisted(() => ({
  notifyRefundProcessedMock: vi.fn(),
  sendEmailMock: vi.fn(),
  razorpayRefundMock: vi.fn(),
}));

vi.mock('./booking-notify.service.js', () => ({
  notifyRefundProcessed: notifyRefundProcessedMock,
}));

vi.mock('../lib/email.js', () => ({
  sendEmail: sendEmailMock,
}));

vi.mock('./cancellation.service.js', () => ({
  cancellationService: {
    getPolicy: vi.fn(async () => ({ tiers: [], refundDaysLabel: '5-7 business days' })),
    computeDevoteeRefund: vi.fn(() => ({
      refundFraction: 1,
      refundAmountInr: 1100,
      tierLabel: 'Full refund (48h+ before)',
    })),
  },
}));

vi.mock('razorpay', () => ({
  default: class MockRazorpay {
    payments = { refund: razorpayRefundMock, fetch: vi.fn() };
    orders = { create: vi.fn() };
  },
}));

const ORIG_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIG_ENV };
  vi.unstubAllGlobals();
});

// ── Rail 1: refund.service.processRefund (devotee + cron auto-refund) ────────

describe('NOTIF-04 — refund.service.processRefund announces the refund', () => {
  const BOOKING_ID = '11111111-1111-1111-1111-111111111111';

  /** A devotee with NO email — the cohort the finding is about. */
  function phoneOnlyBooking() {
    return {
      id: BOOKING_ID,
      bookingNumber: 'BS-20260810-ABCDE',
      status: 'cancelled',
      cancelledAt: new Date('2026-08-10T00:00:00Z'),
      cancellationReason: null,
      user: { email: null, fullName: 'Ravi Kumar' },
      pujaType: { name: 'Rudrabhishek' },
      temple: { name: 'Kashi Vishwanath' },
      payments: [
        {
          id: 'pay-1',
          status: 'captured',
          amount: 1100,
          gatewayPaymentId: 'pay_razorpay_1',
          metadata: {},
        },
      ],
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_KEY_ID = 'rzp_test_x';
    process.env.RAZORPAY_KEY_SECRET = 'secret';
    prismaMock.pujaBooking.findUnique.mockResolvedValue(phoneOnlyBooking() as never);
    prismaMock.payment.update.mockResolvedValue({} as never);
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockResolvedValue(0 as never);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
    // DI-02: the partial rail scales the claimable ledger rows; nothing to
    // scale here, but the reads must answer with a list.
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    prismaMock.templePayout.findMany.mockResolvedValue([] as never);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    sendEmailMock.mockResolvedValue({ ok: false, skipped: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ id: 'rfnd_1', status: 'processed' }),
      })),
    );
  });

  it('reaches a phone-only devotee — the refund is announced on the non-email channels', async () => {
    const { processRefund } = await import('./refund.service.js');

    const r = await processRefund({
      bookingId: BOOKING_ID,
      reason: 'devotee cancelled',
      refundType: 'full',
    });

    expect(r.ok).toBe(true);
    // This is the whole finding: before the fix this was 0.
    expect(notifyRefundProcessedMock).toHaveBeenCalledTimes(1);
    expect(notifyRefundProcessedMock.mock.calls[0]![0]).toMatchObject({
      bookingId: BOOKING_ID,
    });
    // The devotee has no email, so the email leg never even ran — the push +
    // WhatsApp legs are the ONLY notice this cohort can receive.
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('names the refunded amount so the devotee can match it to their statement', async () => {
    const { processRefund } = await import('./refund.service.js');
    await processRefund({ bookingId: BOOKING_ID, reason: 'x', refundType: 'full' });

    const arg = notifyRefundProcessedMock.mock.calls[0]![0] as { amountInr?: unknown };
    expect(arg.amountInr).toBeDefined();
    expect(String(arg.amountInr)).toContain('1100');
  });

  it('tells the notifier the email was already sent, so it cannot duplicate one', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...phoneOnlyBooking(),
      user: { email: 'anita@example.com', fullName: 'Anita Sharma' },
    } as never);
    sendEmailMock.mockResolvedValue({ ok: true, id: 'em-1' });

    const { processRefund } = await import('./refund.service.js');
    await processRefund({ bookingId: BOOKING_ID, reason: 'x', refundType: 'full' });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(notifyRefundProcessedMock.mock.calls[0]![0]).toMatchObject({
      emailAlreadySent: true,
    });
  });

  // The trap this whole finding is made of. sendEmail returns
  // {ok:false, skipped:true} when RESEND_API_KEY is unset — the CURRENT
  // production state (NOTIF-03, owner-gated). Reporting "we emailed them"
  // because we called sendEmail would suppress the notifier's fallback email
  // AND book a delivery that never happened.
  it('does NOT claim the email was sent when Resend is unconfigured', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...phoneOnlyBooking(),
      user: { email: 'anita@example.com', fullName: 'Anita Sharma' },
    } as never);
    sendEmailMock.mockResolvedValue({ ok: false, skipped: true });

    const { processRefund } = await import('./refund.service.js');
    await processRefund({ bookingId: BOOKING_ID, reason: 'x', refundType: 'full' });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(notifyRefundProcessedMock.mock.calls[0]![0]).toMatchObject({
      emailAlreadySent: false,
    });
  });

  it('does NOT claim the email was sent when the transport threw', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...phoneOnlyBooking(),
      user: { email: 'anita@example.com', fullName: 'Anita Sharma' },
    } as never);
    sendEmailMock.mockRejectedValue(new Error('resend 500'));

    const { processRefund } = await import('./refund.service.js');
    await processRefund({ bookingId: BOOKING_ID, reason: 'x', refundType: 'full' });

    expect(notifyRefundProcessedMock.mock.calls[0]![0]).toMatchObject({
      emailAlreadySent: false,
    });
  });

  it('announces a PARTIAL refund too — the ladder makes partial the normal case', async () => {
    const { processRefund } = await import('./refund.service.js');
    await processRefund({
      bookingId: BOOKING_ID,
      reason: 'x',
      refundType: 'partial',
      amountInr: 550,
    });
    expect(notifyRefundProcessedMock).toHaveBeenCalledTimes(1);
  });

  it('does NOT announce when Razorpay refused — never claim money moved that did not', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ error: { description: 'refund not permitted' } }),
      })),
    );
    const { processRefund } = await import('./refund.service.js');
    const r = await processRefund({ bookingId: BOOKING_ID, reason: 'x', refundType: 'full' });

    expect(r.ok).toBe(false);
    expect(notifyRefundProcessedMock).not.toHaveBeenCalled();
  });

  it('a notifier failure never rolls back a refund Razorpay has already made', async () => {
    notifyRefundProcessedMock.mockRejectedValue(new Error('whatsapp exploded'));
    const { processRefund } = await import('./refund.service.js');
    await expect(
      processRefund({ bookingId: BOOKING_ID, reason: 'x', refundType: 'full' }),
    ).resolves.toMatchObject({ ok: true });
  });
});

// ── Rail 2: payment.service.processRefund (admin rail) ───────────────────────

describe('NOTIF-04 — payment.service.processRefund (admin rail) announces the refund', () => {
  const SLOT_DATE = new Date('2026-09-01');

  function makeBooking(over: Record<string, unknown> = {}) {
    return {
      id: 'bk-1',
      bookingNumber: 'BS-20260901-AAAAA',
      scheduledDate: SLOT_DATE,
      scheduledTimeSlot: '18:00',
      priceAmount: new Prisma.Decimal('1100.00'),
      status: 'cancelled',
      cancelledAt: new Date('2026-08-25T00:00:00Z'), // >7 days out -> 100% tier
      cancellationReason: '[refund-requested] admin refund',
      payments: [
        {
          id: 'pmt-1',
          amount: new Prisma.Decimal('1100.00'),
          refundAmount: null,
          status: 'captured',
          gatewayPaymentId: 'pay_abc123',
          metadata: { orderId: 'order_abc' },
        },
      ],
      ...over,
    };
  }

  async function loadLiveService() {
    process.env.RAZORPAY_KEY_ID = 'rzp_live_unit_test';
    process.env.RAZORPAY_KEY_SECRET = 'secret_unit_test';
    vi.resetModules();
    const mod = await import('./payment.service.js');
    return new mod.PaymentService();
  }

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.pujaBooking.findUnique.mockReset();
    prismaMock.pujaBooking.findUnique
      .mockResolvedValueOnce(makeBooking() as never)
      .mockResolvedValueOnce({ cancelPolicyJson: null } as never);
    prismaMock.payment.update.mockResolvedValue({} as never);
    prismaMock.pujaBooking.update.mockResolvedValue({} as never);
    prismaMock.commission.updateMany.mockResolvedValue({ count: 0 } as never);
    prismaMock.commission.count.mockResolvedValue(0 as never);
    prismaMock.templePayout.updateMany.mockResolvedValue({ count: 0 } as never);
    // DI-02: the partial rail scales the claimable ledger rows; nothing to
    // scale here, but the reads must answer with a list.
    prismaMock.commission.findMany.mockResolvedValue([] as never);
    prismaMock.templePayout.findMany.mockResolvedValue([] as never);
    prismaMock.$transaction.mockImplementation(async (fn: any) => fn(prismaMock));
    razorpayRefundMock.mockReset();
    razorpayRefundMock.mockResolvedValue({ id: 'rfnd_admin_1' });
  });

  it('announces the refund — this rail sends no email at all, so it was 100% silent', async () => {
    const service = await loadLiveService();
    const out = await service.processRefund('bk-1', 'admin-1');

    expect(out.status).toBe('refunded');
    expect(notifyRefundProcessedMock).toHaveBeenCalledTimes(1);
    expect(notifyRefundProcessedMock.mock.calls[0]![0]).toMatchObject({ bookingId: 'bk-1' });
  });

  it('passes the Decimal as a STRING — the devotee is shown the stored paisa figure', async () => {
    const service = await loadLiveService();
    await service.processRefund('bk-1', 'admin-1');

    const arg = notifyRefundProcessedMock.mock.calls[0]![0] as { amountInr?: unknown };
    expect(typeof arg.amountInr).toBe('string');
    expect(arg.amountInr).toBe('1100.00');
  });

  it('asks the notifier to send the email — this rail has no email of its own', async () => {
    const service = await loadLiveService();
    await service.processRefund('bk-1', 'admin-1');

    const arg = notifyRefundProcessedMock.mock.calls[0]![0] as { emailAlreadySent?: boolean };
    expect(arg.emailAlreadySent).not.toBe(true);
  });

  it('a notifier failure never fails an admin refund Razorpay already made', async () => {
    notifyRefundProcessedMock.mockRejectedValue(new Error('bsp down'));
    const service = await loadLiveService();
    await expect(service.processRefund('bk-1', 'admin-1')).resolves.toMatchObject({
      status: 'refunded',
    });
  });
});
