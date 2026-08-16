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
 * NOTIF-14 × NOTIF-03 — A SWITCHED-OFF TRANSPORT IS NOT A FAILED SEND.
 *
 * The record-of-attempt is the valuable half of NOTIF-14, and it is only worth
 * having if it records the right OUTCOME. `notification-log.ts` states the rule
 * in its own header: "`sent` means the transport accepted the message.
 * `skipped` means the channel is unconfigured. Those must stay distinct here
 * too — folding them together is precisely what made a comms layer with zero
 * configured channels read green." `booking-notify.service.ts` honours it with a
 * four-value `ChannelOutcome` ('sent' | 'skipped' | 'failed' | 'no-target') and
 * maps `SendResult.skipped` through `outcomeOfSend`.
 *
 * `notifyUser` — the generic fan-out behind conversations, payouts, priest
 * accept/reject and the panchang blast — did not. It classified purely on
 * `results.filter(r => r.ok)`, so `{ok:false, skipped:true}` fell into the same
 * bucket as a transport that was configured and errored.
 *
 * That is not a cosmetic mislabel, because of WHEN it happens. Web push is
 * unconfigured in production right now (NOTIF-03, owner-gated on VAPID keys), so
 * `sendPush` returns `{ok:false, skipped:true}` for every one of these sends and
 * EVERY row the fan-out writes reads `push: 'failed'`. The first person to open
 * the notification log sees a wall of failures and goes looking for a broken
 * transport, when the true and immediately actionable answer is "no VAPID keys
 * are set". The log built to make the silence provable was instead misreporting
 * its cause.
 *
 * The two must also stay distinct in the other direction: a real rejection from
 * a configured transport must keep reading 'failed', or this fix would just
 * launder genuine failures into "we meant not to send that".
 */

const PAYLOAD = { title: 'Payout paid', body: '₹770 has been transferred.', url: '/payouts' };

beforeEach(() => {
  vi.clearAllMocks();
  recordNotification.mockResolvedValue(true);
  prismaMock.pushSubscription.findMany.mockResolvedValue([
    { endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a', createdAt: new Date() },
  ] as never);
  prismaMock.pushSubscription.deleteMany.mockResolvedValue({ count: 0 } as never);
});

describe('NOTIF-14 — the log distinguishes an unconfigured channel from a failure', () => {
  it("records an unconfigured transport as 'skipped', not 'failed'", async () => {
    // Exactly what lib/web-push.sendPush returns with VAPID unset:
    //   if (!enabled) return { ok: false, skipped: true };
    sendPushMock.mockResolvedValue({ ok: false, skipped: true });

    const delivered = await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    expect(delivered).toBe(0);
    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(
      rec.push,
      'production has no VAPID keys, so every fan-out row reads as a failed transport',
    ).toBe('skipped');
    expect(rec.delivered).toBe(false);
  });

  it("still records a configured transport's rejection as 'failed'", async () => {
    sendPushMock.mockResolvedValue({ ok: false, error: 'push service 500' });

    await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(rec.push, 'a real failure must not be laundered into a deliberate skip').toBe('failed');
    expect(rec.delivered).toBe(false);
  });

  it("records 'sent' when any device accepted, even if another was skipped", async () => {
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      { endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a', createdAt: new Date() },
      { endpoint: 'https://push.example/2', p256dh: 'k', auth: 'a', createdAt: new Date() },
    ] as never);
    sendPushMock
      .mockResolvedValueOnce({ ok: false, skipped: true })
      .mockResolvedValueOnce({ ok: true });

    const delivered = await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    expect(delivered).toBe(1);
    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(rec.push).toBe('sent');
    expect(rec.delivered).toBe(true);
  });

  it("keeps 'no-target' for a devotee with no subscription at all", async () => {
    // Distinct from 'skipped': the channel may be perfectly configured and we
    // simply have no address. Widening the vocabulary must not swallow this.
    prismaMock.pushSubscription.findMany.mockResolvedValue([] as never);

    await notifyUser('user-1', PAYLOAD, { event: 'payout_paid' });

    const rec = recordNotification.mock.calls[0]![0] as Record<string, unknown>;
    expect(rec.push).toBe('no-target');
  });
});
