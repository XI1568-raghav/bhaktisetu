import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/email.js', () => ({ sendEmail: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(1) }));

const refundMock = vi.hoisted(() => vi.fn());
vi.mock('./refund.service.js', async () => ({
  callRazorpayRefund: refundMock,
  appendRefundId: (m: any, id: string) => [...(m?.refundIds ?? []), id],
}));

import {
  cancelWellnessEnrollment,
  cancelWellnessSessionEnrollments,
  wellnessRefundTier,
} from './wellness-cancellation.service.js';

// QA 2026-10-13 (slice G): enrolment cancel + session-cancel refunds.

const NOW = new Date('2026-10-13T12:00:00Z');
const hoursFromNow = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const ENR = 'e1111111-1111-4111-8111-111111111111';

function row(over: Record<string, unknown> = {}, sessionOver: Record<string, unknown> = {}) {
  return {
    id: ENR, userId: 'u1', status: 'PAID', razorpayOrderId: 'order_1',
    session: { id: 's1', title: 'Yoga', scheduledAt: hoursFromNow(72), priceInr: '100', status: 'SCHEDULED', instructorId: 'i1', ...sessionOver },
    user: { fullName: 'Devi', email: 'd@example.com' },
    ...over,
  };
}
const auditEvents = () =>
  prismaMock.$executeRawUnsafe.mock.calls.map((c: any[]) => String(c.find((x) => typeof x === 'string' && /^(refund|commission)\./.test(x)) ?? '')).filter(Boolean);

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.wellnessEnrollment.updateMany.mockResolvedValue({ count: 1 } as any);
  prismaMock.commission.findMany.mockResolvedValue([{ id: 'c1', amount: '80', status: 'PENDING', payoutRequestId: null }] as any);
  prismaMock.commission.update.mockResolvedValue({} as any);
  prismaMock.$executeRawUnsafe.mockResolvedValue(1);
});

describe('wellnessRefundTier', () => {
  it.each([
    [100, 1], [48, 1], [47.9, 0.75], [24, 0.75], [23.9, 0.5], [4, 0.5], [3.9, 0.25], [0, 0.25],
  ])('%sh before => %s', (h, f) => expect(wellnessRefundTier(h).fraction).toBe(f));
});

describe('cancelWellnessEnrollment', () => {
  it('paid, 72h out: full refund owed, commission REVERSED, audited', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row() as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'cancelled', refundOwedInr: 100, refundFraction: 1, commissionReversed: 1, status: 'CANCELLED' });
    expect(prismaMock.wellnessEnrollment.updateMany).toHaveBeenCalledWith({ where: { id: ENR, status: 'PAID' }, data: { status: 'CANCELLED' } });
    expect(prismaMock.commission.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { status: 'REVERSED' } });
    expect(auditEvents()).toEqual(expect.arrayContaining(['refund.initiated', 'commission.reversed']));
  });

  it('paid, 30h out: 75% refund; instructor keeps 25% of the earning (scaled, not reversed)', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({}, { scheduledAt: hoursFromNow(30) }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ refundOwedInr: 75, refundFraction: 0.75, commissionReversed: 0, commissionReduced: 1 });
    expect(prismaMock.commission.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: { amount: 20 } });
  });

  it('paid, inside 24h: blocked (business rule 5), nothing changes', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({}, { scheduledAt: hoursFromNow(10) }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'blocked', blockedCode: 'cancellation_window_closed' });
    expect(prismaMock.wellnessEnrollment.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('the instructor-fault path ignores the 24h cutoff and refunds in full', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({}, { scheduledAt: hoursFromNow(1) }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'provider', actorId: 'i1', instructorFault: true, now: NOW });
    expect(r).toMatchObject({ outcome: 'cancelled', refundOwedInr: 100, refundFraction: 1, commissionReversed: 1 });
  });

  it('unpaid (PENDING_PAYMENT): released free of charge even inside 24h, no audit rows', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ status: 'PENDING_PAYMENT' }, { scheduledAt: hoursFromNow(2) }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'cancelled', refundOwedInr: 0 });
    expect(prismaMock.commission.findMany).not.toHaveBeenCalled();
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('free session enrolment (price 0): cancels, owes nothing, no audit', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({}, { priceInr: '0' }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'cancelled', refundOwedInr: 0 });
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'REFUNDED'])('is idempotent for a %s enrolment (no writes at all)', async (status) => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ status }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r?.outcome).toBe('already');
    expect(prismaMock.wellnessEnrollment.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('an ATTENDED enrolment cannot be cancelled', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ status: 'ATTENDED' }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'blocked', blockedCode: 'already_attended' });
  });

  it('two racing cancels: the loser sees count 0 and does not refund or audit twice', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row() as any);
    prismaMock.wellnessEnrollment.updateMany.mockResolvedValue({ count: 0 } as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r?.outcome).toBe('already');
    expect(prismaMock.commission.update).not.toHaveBeenCalled();
    expect(prismaMock.$executeRawUnsafe).not.toHaveBeenCalled();
  });

  it('a commission already in a payout request or PAID is flagged for manual review, never reversed', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row() as any);
    prismaMock.commission.findMany.mockResolvedValue([
      { id: 'c1', amount: '80', status: 'PENDING', payoutRequestId: 'pr1' },
      { id: 'c2', amount: '80', status: 'PAID', payoutRequestId: null },
    ] as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ commissionReversed: 0, ledgerManualReview: 2, refundOwedInr: 100 });
    expect(prismaMock.commission.update).not.toHaveBeenCalled();
    expect(auditEvents()).toContain('commission.reversed');
  });

  it('the audit idempotency key carries the gateway order, so a re-enrol + cancel is a new trail entry', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row() as any);
    await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    const all = prismaMock.$executeRawUnsafe.mock.calls.flat().map(String).join('|');
    expect(all).toContain(`${ENR}:order_1`);
  });

  it('returns null for an unknown enrolment', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(null);
    expect(await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1' })).toBeNull();
  });
});

describe('cancelWellnessSessionEnrollments', () => {
  it('refunds every paid enrolment in full, releases unpaid ones, and totals the refunds', async () => {
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([
      { id: 'a', status: 'PAID' }, { id: 'b', status: 'PENDING_PAYMENT' }, { id: 'c', status: 'PAID' },
    ] as any);
    prismaMock.wellnessEnrollment.findUnique.mockImplementation(async (args: any) =>
      row({ id: args.where.id, status: args.where.id === 'b' ? 'PENDING_PAYMENT' : 'PAID' }, { scheduledAt: hoursFromNow(2) }) as any,
    );
    const r = await cancelWellnessSessionEnrollments({ sessionId: 's1', actorType: 'provider', actorId: 'i1' });
    expect(r).toEqual({ released: 1, refunded: 2, refundOwedInr: 200, ledgerManualReview: 0 });
    expect(prismaMock.wellnessEnrollment.findMany.mock.calls[0]![0]).toMatchObject({ where: { sessionId: 's1', status: { in: ['PENDING_PAYMENT', 'PAID'] } } });
  });

  it('one failing enrolment does not stop the sweep', async () => {
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([{ id: 'a', status: 'PAID' }, { id: 'c', status: 'PAID' }] as any);
    prismaMock.wellnessEnrollment.findUnique
      .mockRejectedValueOnce(new Error('db blip'))
      .mockResolvedValueOnce(row({ id: 'c' }) as any);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const r = await cancelWellnessSessionEnrollments({ sessionId: 's1', actorType: 'provider', actorId: 'i1' });
    spy.mockRestore();
    expect(r.refunded).toBe(1);
  });

  it('an empty session is a clean no-op', async () => {
    prismaMock.wellnessEnrollment.findMany.mockResolvedValue([] as any);
    expect(await cancelWellnessSessionEnrollments({ sessionId: 's1', actorType: 'admin', actorId: 'x' })).toEqual({ released: 0, refunded: 0, refundOwedInr: 0, ledgerManualReview: 0 });
  });
});

describe('gateway refund (slice L)', () => {
  const PAY = { id: 'p1', amount: '100', refundAmount: null, status: 'captured', gatewayPaymentId: 'pay_1', metadata: {} };
  beforeEach(() => {
    refundMock.mockReset();
    prismaMock.payment.findUnique.mockResolvedValue(PAY as any);
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 } as any);
    prismaMock.payment.update.mockResolvedValue({} as any);
  });

  it('happy path: full refund goes to the gateway once, payment marked refunded, audited', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_1' });
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ refundExecution: 'gateway', refundId: 'rfnd_1', refundOwedInr: 100 });
    expect(refundMock).toHaveBeenCalledTimes(1);
    expect(refundMock.mock.calls[0]![0]).toBe('pay_1');
    expect(refundMock.mock.calls[0]![1]).toBe(10000);
    expect(prismaMock.payment.update.mock.calls[0]![0].data).toMatchObject({ status: 'refunded', refundAmount: 100 });
    expect(auditEvents()).toEqual(expect.arrayContaining(['refund.initiated', 'refund.completed']));
  });

  it('partial tier: 75% is sent as 7500 paise and the payment stays partially_refunded', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_2' });
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }, { scheduledAt: hoursFromNow(30) }) as any);
    await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(refundMock.mock.calls[0]![1]).toBe(7500);
    expect(prismaMock.payment.update.mock.calls[0]![0].data).toMatchObject({ status: 'partially_refunded', refundAmount: 75 });
  });

  it('double refund: a second cancel / lost reservation never reaches the gateway', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1', status: 'CANCELLED' }) as any);
    prismaMock.payment.findUnique.mockResolvedValue({ ...PAY, refundAmount: '100', status: 'refunded', metadata: {} } as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r?.outcome).toBe('already');
    expect(refundMock).not.toHaveBeenCalled();
    // racing caller: compare-and-set reservation lost
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }) as any);
    prismaMock.payment.findUnique.mockResolvedValue(PAY as any);
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 } as any);
    await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(refundMock).not.toHaveBeenCalled();
  });

  it('gateway 500: reservation released, failure audited, then the same cancel retries and sends once', async () => {
    refundMock.mockResolvedValueOnce({ error: { description: 'down' } });
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'cancelled', refundExecution: 'retry' });
    const release = prismaMock.payment.updateMany.mock.calls[1]![0];
    expect(release.data.refundAmount).toBeNull();
    expect(release.data.metadata.wellnessRefundOwedInr).toBe(100);
    expect(auditEvents()).toContain('refund.failed');
    // retry: row now CANCELLED, payment carries the owed marker
    refundMock.mockResolvedValueOnce({ id: 'rfnd_3' });
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1', status: 'CANCELLED' }) as any);
    prismaMock.payment.findUnique.mockResolvedValue({ ...PAY, metadata: { wellnessRefundOwedInr: 100 } } as any);
    prismaMock.payment.updateMany.mockResolvedValue({ count: 1 } as any);
    const r2 = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'admin', actorId: 'a1', now: NOW });
    expect(r2).toMatchObject({ outcome: 'already', refundExecution: 'gateway', refundId: 'rfnd_3' });
    expect(refundMock).toHaveBeenCalledTimes(2);
  });

  it('crash after reserve: a stale in-flight marker is re-sent exactly once; a fresh one is not', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_9' });
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1', status: 'CANCELLED' }) as any);
    const mk = (ageMin: number) => ({
      ...PAY, refundAmount: '100',
      metadata: { wellnessRefundInflight: { amount: 100, at: new Date(Date.now() - ageMin * 60_000).toISOString() } },
    });
    prismaMock.payment.findUnique.mockResolvedValue(mk(1) as any); // fresh: another caller is mid-call
    await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(refundMock).not.toHaveBeenCalled();
    prismaMock.payment.findUnique.mockResolvedValue(mk(30) as any); // stale: process died
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ outcome: 'already', refundExecution: 'gateway', refundId: 'rfnd_9' });
    expect(refundMock).toHaveBeenCalledTimes(1);
    expect(refundMock.mock.calls[0]![1]).toBe(10000);
    expect(prismaMock.payment.update.mock.calls[0]![0].data.metadata.wellnessRefundInflight).toBeNull();
    // double click while the takeover CAS is lost
    refundMock.mockClear();
    prismaMock.payment.updateMany.mockResolvedValue({ count: 0 } as any);
    await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(refundMock).not.toHaveBeenCalled();
  });

  it('refund sent but payment row update fails: stamps the refund id so a retry never re-sends', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_7' });
    prismaMock.payment.update.mockRejectedValue(new Error('db down'));
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ refundId: 'rfnd_7' });
    const stamp = prismaMock.payment.updateMany.mock.calls.at(-1)![0];
    expect(stamp.data.metadata.wellnessRefundInflight).toMatchObject({ refundId: 'rfnd_7' });
  });

  it('reservation writes the in-flight marker in the same compare-and-set', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_4' });
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }) as any);
    await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    const reserve = prismaMock.payment.updateMany.mock.calls[0]![0];
    expect(reserve.where).toMatchObject({ refundAmount: null });
    expect(reserve.data.metadata.wellnessRefundInflight).toMatchObject({ amount: 100 });
  });

  it('an audit-write failure does not strand or fail a refund that was sent', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_5' });
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('audit down'));
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row({ paymentId: 'p1' }) as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ refundExecution: 'gateway', refundId: 'rfnd_5' });
    expect(refundMock).toHaveBeenCalledTimes(1);
  });

  it('old enrolment with no payment id: manual fallback, no gateway call, intent audited', async () => {
    prismaMock.wellnessEnrollment.findUnique.mockResolvedValue(row() as any);
    const r = await cancelWellnessEnrollment({ enrollmentId: ENR, actorType: 'devotee', actorId: 'u1', now: NOW });
    expect(r).toMatchObject({ refundExecution: 'manual', refundOwedInr: 100 });
    expect(refundMock).not.toHaveBeenCalled();
    expect(auditEvents()).toContain('refund.initiated');
  });
});
