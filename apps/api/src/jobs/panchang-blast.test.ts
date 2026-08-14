import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * NOTIF-12 — the daily panchang push had no per-day idempotency.
 *
 * tickPanchangBlast's only gate was `isFiveAmIstWindow(now)`, which is true for
 * the entire 05:00–05:59 IST hour. The ops scheduler ticks every 30 minutes, so
 * that hour contains two ticks and every subscriber received the identical
 * "Today's Panchang" push TWICE each morning (six times at a 10-minute tick).
 * Duplicate 5am notifications are the most reliable way to get a devotional
 * app's notifications switched off permanently — which also kills the
 * booking-confirmed and video-ready pushes that carry the paid product.
 *
 * The weekly digest already solved this with a persisted run row; the panchang
 * blast now claims `panchang-blast:<IST date>` the same way.
 */

(prismaMock as any).pushSubscription = {
  findMany: vi.fn(),
  delete: vi.fn(),
  deleteMany: vi.fn(),
};

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendPush = vi.fn();
vi.mock('../lib/web-push.js', () => ({
  sendPush: (...a: unknown[]) => sendPush(...a),
  webPushConfig: { enabled: true, publicKey: 'test' },
}));

const getToday = vi.fn();
vi.mock('../services/panchang.service.js', () => ({
  panchangService: { getToday: (...a: unknown[]) => getToday(...a) },
}));

const claimRun = vi.fn();
const releaseRun = vi.fn();
vi.mock('../lib/notification-run-log.js', () => ({
  claimRun: (...a: unknown[]) => claimRun(...a),
  releaseRun: (...a: unknown[]) => releaseRun(...a),
}));

import { tickPanchangBlast } from './master-cron.js';

// 05:30 IST = 00:00 UTC. Both instants below sit inside the 05:00 IST hour.
const FIRST_TICK = new Date('2026-08-12T00:00:00.000Z');
const SECOND_TICK = new Date('2026-08-12T00:29:00.000Z');
const OUTSIDE_WINDOW = new Date('2026-08-12T04:00:00.000Z'); // 09:30 IST

beforeEach(() => {
  vi.clearAllMocks();
  getToday.mockResolvedValue({ tithi: 'Purnima', nakshatra: 'Rohini', festivals: [] });
  (prismaMock as any).pushSubscription.findMany.mockResolvedValue([
    { id: 'sub-1', endpoint: 'https://push/1', p256dh: 'p', auth: 'a' },
  ]);
  sendPush.mockResolvedValue({ ok: true });
  claimRun.mockResolvedValue(true);
});

describe('tickPanchangBlast per-day idempotency (NOTIF-12)', () => {
  it('sends on the first tick inside the 5am IST hour', async () => {
    const r = await tickPanchangBlast(false, FIRST_TICK);
    expect(r.sent).toBe(1);
    expect(sendPush).toHaveBeenCalledTimes(1);
    expect(claimRun).toHaveBeenCalledWith('panchang-blast:2026-08-12');
  });

  it('does NOT send again on the second tick of the same morning', async () => {
    claimRun.mockResolvedValue(false); // the day is already claimed
    const r = await tickPanchangBlast(false, SECOND_TICK);
    expect(sendPush).not.toHaveBeenCalled();
    expect(r.sent).toBe(0);
    expect(r.skipped).toBe(true);
    expect(r.reason).toMatch(/already/i);
  });

  it('claims by IST date, not UTC date, so one calendar morning is one blast', async () => {
    // 23:45 UTC on the 12th is 05:15 IST on the 13th.
    await tickPanchangBlast(false, new Date('2026-08-12T23:45:00.000Z'));
    expect(claimRun).toHaveBeenCalledWith('panchang-blast:2026-08-13');
  });

  it('stays gated outside the 5am IST window without burning the claim', async () => {
    const r = await tickPanchangBlast(false, OUTSIDE_WINDOW);
    expect(r.skipped).toBe(true);
    expect(claimRun).not.toHaveBeenCalled();
    expect(sendPush).not.toHaveBeenCalled();
  });

  it('releases the claim when there is no panchang to send, so the next tick retries', async () => {
    getToday.mockResolvedValue(null);
    const r = await tickPanchangBlast(false, FIRST_TICK);
    expect(r.sent).toBe(0);
    expect(releaseRun).toHaveBeenCalledWith('panchang-blast:2026-08-12');
  });

  it('an admin force still respects the claim it takes for that day', async () => {
    await tickPanchangBlast(true, OUTSIDE_WINDOW);
    expect(claimRun).toHaveBeenCalled();
  });
});
