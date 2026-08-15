import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Prisma } from '@prisma/client';

/**
 * NOTIF-16 — providers learned their money moved from a channel they do not have.
 *
 * Both payout notifications were a bare `notifyUser` (web push): "Payout
 * requested" and "Payout sent". No mail, no WhatsApp. `push_subscriptions` held
 * exactly one row in the whole database — created by the sweep's own probe —
 * while all 23 seeded users have BOTH an email and a phone on file. Pandits are
 * mobile-first and are the cohort least likely to have granted desktop web-push
 * permission, so in practice a completed settlement was invisible until they
 * happened to open /payouts.
 *
 * Silence about money is what drives the support call and the trust loss a
 * thin-supply marketplace cannot afford.
 *
 * NOTE ON THE CHANNELS BEING DARK: RESEND_API_KEY / WhatsApp credentials are
 * unset in this environment and in production today (NOTIF-03). These tests
 * assert that the payout path REACHES the mail and WhatsApp clients — not that
 * anything was delivered. A skipped send must never be reported as sent.
 */

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    commission: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
    payoutRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    userRoleAssignment: { findMany: vi.fn() },
    user: { findMany: vi.fn(), findUnique: vi.fn() },
    $queryRawUnsafe: vi.fn(),
    $transaction: vi.fn(),
  } as Record<string, any>,
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));

// Only the transport is stubbed — the real templates render, so the assertions
// below are about the mail this code actually composes.
const sendEmail = vi.fn().mockResolvedValue({ ok: false, skipped: true });
vi.mock('../lib/email.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, sendEmail: (...a: unknown[]) => sendEmail(...a) };
});

const sendWhatsappTemplate = vi.fn().mockResolvedValue({ ok: false, skipped: true });
vi.mock('../lib/whatsapp.js', () => ({
  sendWhatsappTemplate: (...a: unknown[]) => sendWhatsappTemplate(...a),
  sendWhatsappText: vi.fn(),
  whatsapp: { enabled: false, phoneNumberId: '', apiVersion: 'v20.0' },
}));

const recordNotification = vi.fn().mockResolvedValue(true);
vi.mock('../lib/notification-log.js', () => ({
  recordNotification: (...a: unknown[]) => recordNotification(...a),
}));

import { processPayout } from './payout.service.js';

const payoutRequest = prismaMock.payoutRequest;
const commission = prismaMock.commission;
const $transaction = prismaMock.$transaction as ReturnType<typeof vi.fn>;

const LINKED = [
  { amount: new Prisma.Decimal('200.00'), status: 'PENDING' },
  { amount: new Prisma.Decimal('150.00'), status: 'PENDING' },
];

/** Wait for the post-commit fan-out, which is deliberately not awaited. */
const drain = () => new Promise((r) => setTimeout(r, 60));

beforeEach(() => {
  vi.clearAllMocks();
  sendEmail.mockResolvedValue({ ok: false, skipped: true });
  sendWhatsappTemplate.mockResolvedValue({ ok: false, skipped: true });
  recordNotification.mockResolvedValue(true);

  payoutRequest.findUnique.mockResolvedValue({
    id: 'pr-1',
    status: 'pending',
    amount: new Prisma.Decimal('350.00'),
    providerId: 'prov-1',
  });
  payoutRequest.update.mockResolvedValue({
    id: 'pr-1',
    status: 'completed',
    amount: new Prisma.Decimal('350.00'),
    providerId: 'prov-1',
    reference: 'UTR123',
  });
  commission.findMany.mockResolvedValue(LINKED);
  commission.updateMany.mockResolvedValue({ count: 2 });
  prismaMock.user.findUnique.mockResolvedValue({
    id: 'prov-1',
    email: 'pandit@demo.com',
    phone: '+919999900001',
    fullName: 'Demo Pandit',
  });
  $transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
    fn({ payoutRequest, commission }),
  );
});

describe('NOTIF-16 — a completed payout reaches email and WhatsApp, not push alone', () => {
  it('sends the provider an email carrying the amount and the transfer reference', async () => {
    await processPayout('pr-1', 'complete', 'admin-1', 'UTR123');
    await drain();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = sendEmail.mock.calls[0]![0] as {
      to: string;
      subject: string;
      html: string;
      text?: string;
    };
    expect(arg.to).toBe('pandit@demo.com');
    // The reference is the whole point: it is what the provider matches against
    // their bank statement when the money has not visibly landed yet.
    expect(`${arg.html} ${arg.text ?? ''}`).toContain('UTR123');
    expect(`${arg.html} ${arg.text ?? ''}`).toContain('350');
  });

  it('sends the provider a WhatsApp message on the phone already on their User row', async () => {
    await processPayout('pr-1', 'complete', 'admin-1', 'UTR123');
    await drain();

    expect(sendWhatsappTemplate).toHaveBeenCalledTimes(1);
    const arg = sendWhatsappTemplate.mock.calls[0]![0] as { to: string; variables?: string[] };
    expect(arg.to).toBe('+919999900001');
  });

  it('records the attempt with skipped legs marked skipped, never sent', async () => {
    await processPayout('pr-1', 'complete', 'admin-1', 'UTR123');
    await drain();

    expect(recordNotification).toHaveBeenCalled();
    const rec = recordNotification.mock.calls.at(-1)![0] as Record<string, unknown>;
    expect(rec.event).toBe('payout_completed');
    // Both transports are unconfigured in this run. Neither may read as sent.
    expect(rec.email).not.toBe('sent');
    expect(rec.whatsapp).not.toBe('sent');
    expect(rec.delivered).toBe(false);
  });

  it('does not fan out on the already-completed no-op', async () => {
    payoutRequest.findUnique.mockResolvedValue({
      id: 'pr-1',
      status: 'completed',
      amount: new Prisma.Decimal('350.00'),
      providerId: 'prov-1',
      reference: 'UTR123',
    });

    await processPayout('pr-1', 'complete', 'admin-1', 'UTR123');
    await drain();

    expect(sendEmail).not.toHaveBeenCalled();
    expect(sendWhatsappTemplate).not.toHaveBeenCalled();
  });

  it('a failed payout still reaches the provider off-push', async () => {
    payoutRequest.update.mockResolvedValue({
      id: 'pr-1',
      status: 'failed',
      amount: new Prisma.Decimal('350.00'),
      providerId: 'prov-1',
    });

    await processPayout('pr-1', 'fail', 'admin-1', undefined, 'bank rejected');
    await drain();

    expect(sendEmail).toHaveBeenCalledTimes(1);
    const arg = sendEmail.mock.calls[0]![0] as { subject: string; html: string; text?: string };
    expect(`${arg.subject} ${arg.html} ${arg.text ?? ''}`).toMatch(/bank rejected/);
  });
});
