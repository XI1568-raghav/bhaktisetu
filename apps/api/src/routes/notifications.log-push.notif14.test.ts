import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const recordNotification = vi.fn();
vi.mock('../lib/notification-log.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, recordNotification: (...a: unknown[]) => recordNotification(...a) };
});

const sendPushMock = vi.fn();
vi.mock('../lib/web-push.js', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return { ...actual, sendPush: (...a: unknown[]) => sendPushMock(...a) };
});

import { notifyUser } from './notifications.js';

/**
 * NOTIF-14, remaining half — THE OTHER FOURTEEN SENDERS.
 *
 * The first pass built the record and the reader: a `notification_log` row per
 * event and GET /api/v1/notifications to render it. Only ONE producer writes to
 * it — `booking-notify.service`, which covers the booking lifecycle.
 *
 * `notifyUser` is the generic push fan-out and it has fifteen call sites:
 * conversations (a new message, an incoming call), payouts (a payout approved,
 * a payout paid), priest accept/reject, astrologer session reminders, the
 * panchang blast. Every one of them was, and outside the booking lifecycle
 * still is, exactly what the finding measured: fire-and-forget with the result
 * discarded and no row anywhere. A devotee who missed the "your payout was
 * paid" push has no bell to check, and support cannot answer "did it go out?"
 * for any of them.
 *
 * The contract has two sides. `notifyUser` records by default, so a new caller
 * is logged without having to remember; `booking-notify` opts OUT, because it
 * writes the richer multi-channel row itself and a second row would double-count
 * the same event in the devotee's own notification centre.
 */

const PAYLOAD = { title: 'Payout paid', body: '₹770 has been transferred.', url: '/payouts' };

beforeEach(() => {
  vi.clearAllMocks();
  recordNotification.mockResolvedValue(true);
  sendPushMock.mockResolvedValue({ ok: true });
  prismaMock.pushSubscription.findMany.mockResolvedValue([
    { endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a', createdAt: new Date() },
  ] as never);
  prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 0 } as never);
});

describe('NOTIF-14 — every push leaves a record', () => {
  it('records a push sent through the generic fan-out', async () => {
    const delivered = await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    expect(delivered).toBe(1);
    expect(recordNotification, 'the push happened and nothing knows it did').toHaveBeenCalledTimes(1);
    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(rec.userId).toBe('user-1');
    expect(rec.event).toBe('payout_paid');
    expect(rec.title).toBe('Payout paid');
    expect(rec.push).toBe('sent');
    expect(rec.delivered).toBe(true);
  });

  it('records a push that reached no device as no-target, never as sent', async () => {
    // The devotee has no subscription. That is the case support most needs to
    // see: "we tried, there was nowhere to send it" is a different answer from
    // "we sent it", and folding them together is how a silent comms layer reads
    // green (NOTIF-03).
    prismaMock.pushSubscription.findMany.mockResolvedValue([] as never);

    const delivered = await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    expect(delivered).toBe(0);
    expect(recordNotification).toHaveBeenCalledTimes(1);
    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(rec.push).toBe('no-target');
    expect(rec.delivered).toBe(false);
  });

  it('records a failed push as failed', async () => {
    sendPushMock.mockResolvedValue({ ok: false, error: 'gone' });

    await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(rec.push).toBe('failed');
    expect(rec.delivered).toBe(false);
  });

  it('lets the booking fan-out opt out so one event is not logged twice', async () => {
    await notifyUser('user-1', PAYLOAD, { record: false });

    expect(recordNotification).not.toHaveBeenCalled();
  });

  it('still delivers when the log is unavailable', async () => {
    recordNotification.mockRejectedValue(new Error('table gone'));

    const delivered = await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    expect(delivered).toBe(1);
  });
});
