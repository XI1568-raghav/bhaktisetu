import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
const refundMock = vi.hoisted(() => vi.fn());
vi.mock('./refund.service.js', () => ({ callRazorpayRefund: refundMock }));
const auditSpy = vi.hoisted(() => vi.fn(async (_i: unknown) => ({ ok: true, wrote: true })));
vi.mock('../lib/audit-money.js', async (orig) => ({ ...(await orig<typeof import('../lib/audit-money.js')>()), recordMoneyEvent: auditSpy }));

import { refundConsultation, isRefundRetryable } from './consultation-refund.service.js';

const row = (o: Record<string, unknown> = {}) => ({
  id: 'c1', reference: 'AC-1', amount_inr: '500', currency: 'INR',
  razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', paid_at: new Date(), refund_status: null, ...o,
});
const actor = { type: 'devotee' as const, id: 'u1' };
const events = () => auditSpy.mock.calls.map((c) => (c[0] as { eventType: string }).eventType);

beforeEach(() => { vi.clearAllMocks(); refundMock.mockReset(); prismaMock.$executeRawUnsafe.mockResolvedValue(1); });

describe('refundConsultation', () => {
  it('happy: full amount sent once, marked refunded, REFUND_COMPLETED audited', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_1' });
    expect(await refundConsultation(row(), actor, 'n')).toEqual({ execution: 'gateway', refundId: 'rfnd_1' });
    expect(refundMock).toHaveBeenCalledWith('pay_1', 50000, expect.any(Object));
    expect(events()).toEqual(['refund.completed']);
  });
  it('double refund: lost reservation or already refunded never hits the gateway', async () => {
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
    expect((await refundConsultation(row(), actor, 'n')).execution).toBe('gateway');
    expect((await refundConsultation(row({ refund_status: 'refunded' }), actor, 'n')).execution).toBe('gateway');
    expect(refundMock).not.toHaveBeenCalled();
  });
  it('gateway 500: marked failed (retryable), audited, no completed row', async () => {
    refundMock.mockResolvedValue({ error: { description: 'down' } });
    expect((await refundConsultation(row(), actor, 'n')).execution).toBe('retry');
    expect(prismaMock.$executeRawUnsafe.mock.calls.some((c) => String(c[0]).includes("'failed'"))).toBe(true);
    expect(events()).toEqual(['refund.failed']);
    refundMock.mockResolvedValue({ id: 'rfnd_2' });
    expect((await refundConsultation(row({ refund_status: 'failed' }), actor, 'n')).execution).toBe('gateway');
  });
  it('unpaid or no payment id: nothing sent', async () => {
    expect((await refundConsultation(row({ paid_at: null }), actor, 'n')).execution).toBe('none');
    expect((await refundConsultation(row({ razorpay_payment_id: null }), actor, 'n')).execution).toBe('manual');
    expect(refundMock).not.toHaveBeenCalled();
  });
  it('columns missing: degrades to manual', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('column "refund_status" does not exist'));
    expect((await refundConsultation(row(), actor, 'n')).execution).toBe('manual');
    expect(refundMock).not.toHaveBeenCalled();
  });
});

describe('stuck "sending" reservations', () => {
  const old = new Date(Date.now() - 60 * 60_000);
  it('isRefundRetryable: stale sending without refund id yes; fresh or with refund id no; failed yes', () => {
    expect(isRefundRetryable({ refund_status: 'sending', refund_id: null, refund_started_at: old })).toBe(true);
    expect(isRefundRetryable({ refund_status: 'sending', refund_id: null, refund_started_at: null })).toBe(true);
    expect(isRefundRetryable({ refund_status: 'sending', refund_id: null, refund_started_at: new Date() })).toBe(false);
    expect(isRefundRetryable({ refund_status: 'sending', refund_id: 'rfnd_x', refund_started_at: old })).toBe(false);
    expect(isRefundRetryable({ refund_status: 'failed' })).toBe(true);
    expect(isRefundRetryable({ refund_status: 'refunded' })).toBe(false);
  });
  it('reservation SQL takes over only a stale sending row and never one with a refund id', async () => {
    refundMock.mockResolvedValue({ id: 'rfnd_7' });
    expect((await refundConsultation(row({ refund_status: 'sending', refund_started_at: old }), actor, 'n')).refundId).toBe('rfnd_7');
    const sql = String(prismaMock.$executeRawUnsafe.mock.calls[0]![0]);
    expect(sql).toContain('refund_id IS NULL');
    expect(sql).toMatch(/refund_status = 'sending' AND \(refund_started_at IS NULL OR refund_started_at </);
  });
});
