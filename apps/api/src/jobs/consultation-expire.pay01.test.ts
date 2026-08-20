import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

import { tickConsultationExpire } from './consultation-expire.js';

/**
 * PAY-01 (2026-08-20, P0) — the destroying half.
 *
 * This cron used to run ONE unconditional statement:
 *
 *   UPDATE astrologer_consultations SET status = 'cancelled'
 *    WHERE status = 'pending_payment' AND created_at < <30 min ago>
 *
 * It never asked whether money had been captured against the row. Combined
 * with the webhook's inability to see a consultation at all, that is the whole
 * finding: a devotee pays, closes the tab, and 30 minutes later the record says
 * the consultation was never ordered. No refund, no notice, and nothing left to
 * reconcile the Razorpay capture against.
 *
 * A row carrying a REAL Razorpay order id may hold a capture — only Razorpay
 * knows — so it must never be destroyed on a timer. It goes to an admin queue
 * (`payment_review`) that jobs/reconcile-payments.ts then resolves against
 * Razorpay. Only rows that provably cannot hold money (no order was ever
 * created, or a demo order) may be cancelled.
 */

function sqlOf(call: unknown[]): string {
  return String(call[0]);
}

describe('PAY-01 — consultation expiry never destroys a row that may hold a capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$executeRawUnsafe.mockResolvedValue(0);
  });

  it('the cancel statement can only reach rows with no real Razorpay order', async () => {
    await tickConsultationExpire();
    const cancelStatements = prismaMock.$executeRawUnsafe.mock.calls.filter((c: unknown[]) =>
      /status\s*=\s*'cancelled'/i.test(sqlOf(c)),
    );
    expect(cancelStatements.length).toBe(1);
    const sql = sqlOf(cancelStatements[0]!);
    expect(sql).toMatch(/razorpay_order_id\s+IS\s+NULL/i);
    expect(sql).toMatch(/order.{0,2}demo/i);
    // And it must NOT be the old unconditional sweep.
    expect(/razorpay_order_id/i.test(sql)).toBe(true);
  });

  it('a row with a real Razorpay order is routed to the admin review queue', async () => {
    await tickConsultationExpire();
    const reviewStatements = prismaMock.$executeRawUnsafe.mock.calls.filter((c: unknown[]) =>
      /status\s*=\s*'payment_review'/i.test(sqlOf(c)),
    );
    expect(reviewStatements.length).toBe(1);
    const sql = sqlOf(reviewStatements[0]!);
    expect(sql).toMatch(/razorpay_order_id\s+IS\s+NOT\s+NULL/i);
    expect(sql).toMatch(/status\s*=\s*'pending_payment'/i);
  });

  it('reports both counts so the daily-ops result shows the review backlog', async () => {
    prismaMock.$executeRawUnsafe.mockImplementation(async (sql: string) =>
      /payment_review/.test(String(sql)) ? 3 : 7,
    );
    const res = await tickConsultationExpire();
    expect(res.expired).toBe(7);
    expect(res.queuedForReview).toBe(3);
  });

  it('still degrades to skipped when the table does not exist', async () => {
    prismaMock.$executeRawUnsafe.mockRejectedValue(
      new Error('relation "astrologer_consultations" does not exist'),
    );
    const res = await tickConsultationExpire();
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('table-missing');
    expect(res.expired).toBe(0);
  });
});
