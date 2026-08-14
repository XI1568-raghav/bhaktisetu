import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * SCAL-06 — the aarti job's audience read must be bounded.
 *
 * The original defect (a loop-invariant `tokenModel.findMany({ where: {
 * aartiOptIn: true } })` re-reading the whole global token table inside the
 * temple×slot loop) was removed by NOTIF-09, which narrowed the audience to
 * followers. What remained was still unbounded: one `findMany` for every
 * follower of the temple, whose entire result then went back to Postgres as an
 * `IN (...)` list for the token lookup. Both live in a 512 MB container at the
 * moment 06:00 aartis fire together.
 */

const { prismaMock, sendFcm, claimRun } = vi.hoisted(() => ({
  prismaMock: {
    temple: { findMany: vi.fn() },
    templeFollow: { findMany: vi.fn() },
    fcmDeviceToken: { findMany: vi.fn(), deleteMany: vi.fn() },
  } as Record<string, any>,
  sendFcm: vi.fn(),
  claimRun: vi.fn(),
}));

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../lib/fcm.js', () => ({ sendFcm, fcmConfig: { enabled: true } }));
vi.mock('../lib/notification-run-log.js', () => ({ claimRun }));

import { runAartiNotify } from './aarti-notify.js';

const PAGE = 500;

/** N followers of one temple, paged exactly as a keyset query would. */
function seedFollowers(count: number) {
  const rows = Array.from({ length: count }, (_, i) => ({
    userId: `u-${String(i).padStart(6, '0')}`,
  }));
  prismaMock.templeFollow.findMany.mockImplementation(async (args: any) => {
    const after = args?.where?.userId?.gt;
    const start = after ? rows.findIndex((r) => r.userId === after) + 1 : 0;
    return rows.slice(start, start + (args?.take ?? rows.length));
  });
  return rows;
}

beforeEach(() => {
  vi.clearAllMocks();
  claimRun.mockResolvedValue(true);
  sendFcm.mockResolvedValue({ ok: true });
  prismaMock.fcmDeviceToken.deleteMany.mockResolvedValue({ count: 0 });
  prismaMock.temple.findMany.mockResolvedValue([
    {
      id: 't-1',
      name: 'Kashi Vishwanath',
      slug: 'kashi-vishwanath',
      // parseSchedule reads regularHours as { slotKey: "HH:MM-HH:MM" } and
      // treats a key containing "aarti" as an aarti slot.
      timingInfo: { regularHours: { mangalaAarti: '00:05-00:35' } },
    },
  ]);
  // Every follower has exactly one opted-in device.
  prismaMock.fcmDeviceToken.findMany.mockImplementation(async (args: any) => {
    const ids: string[] = args?.where?.userId?.in ?? [];
    return ids.map((id) => ({ userId: id, deviceToken: `tok-${id}`, aartiOptIn: true }));
  });
});

describe('SCAL-06 — follower fan-out', () => {
  it('pages the follower scan and never builds one giant IN list', async () => {
    seedFollowers(1250); // 500 + 500 + 250

    const out = await runAartiNotify(new Date('2026-08-13T18:34:00.000Z')); // 00:04 IST

    expect(out.aartisMatched).toBe(1);
    expect(prismaMock.templeFollow.findMany).toHaveBeenCalledTimes(3);
    for (const c of prismaMock.templeFollow.findMany.mock.calls) {
      expect(c[0].take).toBe(PAGE);
      expect(c[0].orderBy).toEqual({ userId: 'asc' });
    }
    // Each token lookup is capped by the page it belongs to.
    for (const c of prismaMock.fcmDeviceToken.findMany.mock.calls) {
      expect(c[0].where.userId.in.length).toBeLessThanOrEqual(PAGE);
      // NOTIF-09's narrowing must survive: never a global opt-in scan.
      expect(c[0].where.userId).toBeDefined();
    }
    // Bounding memory must not cost anyone their reminder.
    expect(out.pushesSent).toBe(1250);
  });

  it('walks forward past the last id of the previous page', async () => {
    seedFollowers(1250);

    await runAartiNotify(new Date('2026-08-13T18:34:00.000Z'));

    const calls = prismaMock.templeFollow.findMany.mock.calls;
    expect(calls[0]![0].where.userId).toBeUndefined();
    expect(calls[1]![0].where.userId).toEqual({ gt: 'u-000499' });
    expect(calls[2]![0].where.userId).toEqual({ gt: 'u-000999' });
  });

  it('stops after one page when the temple has fewer followers than a page', async () => {
    seedFollowers(3);

    const out = await runAartiNotify(new Date('2026-08-13T18:34:00.000Z'));

    expect(prismaMock.templeFollow.findMany).toHaveBeenCalledTimes(1);
    expect(out.pushesSent).toBe(3);
  });

  it('sends nothing — and asks for no tokens — when nobody follows the temple', async () => {
    seedFollowers(0);

    const out = await runAartiNotify(new Date('2026-08-13T18:34:00.000Z'));

    expect(prismaMock.fcmDeviceToken.findMany).not.toHaveBeenCalled();
    expect(out.pushesSent).toBe(0);
  });
});
