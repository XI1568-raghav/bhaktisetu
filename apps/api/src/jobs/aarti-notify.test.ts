import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

/**
 * Aarti reminder job — NOTIF-07, NOTIF-08, NOTIF-09.
 *
 * NOTIF-09 the job appended EVERY token with `aartiOptIn: true` to the audience
 *          of EVERY temple, so one opt-in produced a push for all 20 seeded
 *          aarti slots a day — starting 02:45 IST — about temples the devotee
 *          never chose. `temple_follows` holds 0 rows on the current seed, so
 *          100% of the fan-out came from that branch.
 * NOTIF-08 the match window was hardcoded to 14–16 minutes while the ops tick
 *          is 30 minutes (jobs/scheduler.ts DEFAULT_INTERVAL_MS), so 27 of
 *          every 30 minutes of aarti approach were invisible: a ≈10% hit rate.
 * NOTIF-07 a token FCM refuses as INVALID_ARGUMENT was classified `expired` and
 *          DELETED, so the devotee's registration vanished on the first send.
 */

const fcmTokenMock = {
  findMany: vi.fn(),
  deleteMany: vi.fn(),
};
const templeFollowMock = {
  findMany: vi.fn(),
};
(prismaMock as any).fcmDeviceToken = fcmTokenMock;
(prismaMock as any).templeFollow = templeFollowMock;

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendFcm = vi.fn();
vi.mock('../lib/fcm.js', () => ({
  sendFcm: (...a: unknown[]) => sendFcm(...a),
  fcmConfig: { enabled: true, projectId: 'darshya-test' },
}));

const claimRun = vi.fn();
vi.mock('../lib/notification-run-log.js', () => ({
  claimRun: (...a: unknown[]) => claimRun(...a),
  releaseRun: vi.fn(),
}));

import { runAartiNotify } from './aarti-notify.js';

// Kashi Vishwanath's real seeded timingInfo shape.
const TEMPLE = {
  id: 'temple-1',
  name: 'Kashi Vishwanath Temple',
  slug: 'kashi-vishwanath',
  timingInfo: {
    regularHours: {
      eveningAarti: '19:00 - 20:30',
      mangalaAarti: '03:00 - 04:00',
      generalDarshan: '04:00 - 11:00',
    },
  },
};

/** A UTC instant that is `minutesBefore` minutes ahead of 19:00 IST. */
function utcBeforeEveningAarti(minutesBefore: number): Date {
  // 19:00 IST = 13:30 UTC.
  const base = Date.UTC(2026, 7, 12, 13, 30, 0);
  return new Date(base - minutesBefore * 60 * 1000);
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.OPS_TICK_INTERVAL_MS = String(30 * 60_000);
  prismaMock.temple.findMany.mockResolvedValue([TEMPLE] as never);
  templeFollowMock.findMany.mockResolvedValue([]);
  fcmTokenMock.findMany.mockResolvedValue([]);
  fcmTokenMock.deleteMany.mockResolvedValue({ count: 0 });
  sendFcm.mockResolvedValue({ ok: true });
  claimRun.mockResolvedValue(true);
});

// ── NOTIF-09 ────────────────────────────────────────────────────────────────

describe('aarti-notify audience (NOTIF-09)', () => {
  it('does NOT push to a global opt-in who does not follow the temple', async () => {
    templeFollowMock.findMany.mockResolvedValue([]); // nobody follows temple-1
    fcmTokenMock.findMany.mockResolvedValue([
      { userId: 'stranger', deviceToken: 'a'.repeat(140), aartiOptIn: true },
    ]);

    const r = await runAartiNotify(utcBeforeEveningAarti(15));

    expect(r.aartisMatched).toBe(1);
    expect(sendFcm).not.toHaveBeenCalled();
    expect(r.pushesSent).toBe(0);
  });

  it('pushes to a follower of that temple', async () => {
    templeFollowMock.findMany.mockResolvedValue([{ userId: 'follower' }]);
    fcmTokenMock.findMany.mockResolvedValue([
      { userId: 'follower', deviceToken: 'b'.repeat(140), aartiOptIn: true },
    ]);

    const r = await runAartiNotify(utcBeforeEveningAarti(15));

    expect(sendFcm).toHaveBeenCalledTimes(1);
    expect(r.pushesSent).toBe(1);
  });

  it('respects a follower who turned aarti reminders off', async () => {
    templeFollowMock.findMany.mockResolvedValue([{ userId: 'follower' }]);
    fcmTokenMock.findMany.mockResolvedValue([
      { userId: 'follower', deviceToken: 'c'.repeat(140), aartiOptIn: false },
    ]);

    await runAartiNotify(utcBeforeEveningAarti(15));

    expect(sendFcm).not.toHaveBeenCalled();
  });
});

// ── NOTIF-08 ────────────────────────────────────────────────────────────────

describe('aarti-notify match window derives from the tick interval (NOTIF-08)', () => {
  beforeEach(() => {
    templeFollowMock.findMany.mockResolvedValue([{ userId: 'follower' }]);
    fcmTokenMock.findMany.mockResolvedValue([
      { userId: 'follower', deviceToken: 'd'.repeat(140), aartiOptIn: true },
    ]);
  });

  it('matches an aarti 40 minutes out when the tick is 30 minutes', async () => {
    // A 30-min tick can land anywhere; the previous tick was 30 min ago, so any
    // aarti between now+0 and now+(30+15) must be caught on THIS tick or never.
    const r = await runAartiNotify(utcBeforeEveningAarti(40));
    expect(r.aartisMatched).toBe(1);
    expect(r.pushesSent).toBe(1);
  });

  it('still matches the classic 15-minutes-out case', async () => {
    const r = await runAartiNotify(utcBeforeEveningAarti(15));
    expect(r.aartisMatched).toBe(1);
  });

  it('does not fire for an aarti already started', async () => {
    const r = await runAartiNotify(utcBeforeEveningAarti(-5));
    expect(r.aartisMatched).toBe(0);
  });

  it('does not fire for an aarti beyond the next tick plus lead time', async () => {
    const r = await runAartiNotify(utcBeforeEveningAarti(90));
    expect(r.aartisMatched).toBe(0);
  });

  it('claims each (temple, slot, IST day) durably so a restart cannot re-fire', async () => {
    claimRun.mockResolvedValue(false); // another tick/instance already sent it
    const r = await runAartiNotify(utcBeforeEveningAarti(20));
    expect(claimRun).toHaveBeenCalledWith(expect.stringContaining('temple-1'));
    expect(r.aartisMatched).toBe(0);
    expect(sendFcm).not.toHaveBeenCalled();
  });
});

// ── NOTIF-07 ────────────────────────────────────────────────────────────────

describe('aarti-notify token pruning (NOTIF-07)', () => {
  beforeEach(() => {
    templeFollowMock.findMany.mockResolvedValue([{ userId: 'follower' }]);
    fcmTokenMock.findMany.mockResolvedValue([
      {
        userId: 'follower',
        deviceToken: 'https://fcm.googleapis.com/fcm/send/eXaMpLe:APA91bF_fake',
        aartiOptIn: true,
      },
    ]);
  });

  it('never deletes a registration FCM refused as malformed', async () => {
    sendFcm.mockResolvedValue({ ok: false, invalidToken: true, error: 'not an FCM token' });

    const r = await runAartiNotify(utcBeforeEveningAarti(15));

    expect(fcmTokenMock.deleteMany).not.toHaveBeenCalled();
    expect(r.expiredTokens).toBe(0);
    expect(r.invalidTokens).toBe(1);
    expect(r.pushesSent).toBe(0);
  });

  it('still prunes a genuinely dead device', async () => {
    sendFcm.mockResolvedValue({ ok: false, expired: true });

    const r = await runAartiNotify(utcBeforeEveningAarti(15));

    expect(fcmTokenMock.deleteMany).toHaveBeenCalledTimes(1);
    expect(r.expiredTokens).toBe(1);
    expect(r.invalidTokens).toBe(0);
  });
});
