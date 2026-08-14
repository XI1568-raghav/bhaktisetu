import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.fn();
vi.mock('../lib/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

vi.mock('../services/panchang.service.js', () => ({
  panchangService: { getToday: async () => ({ tithi: 'Purnima', festivals: [], specialInfo: null }) },
}));

import { maybeRunWeeklyDigest } from './weekly-digest.js';
import { __resetRunLogForTests } from '../lib/notification-run-log.js';

/**
 * NOTIF-13 (P1) — the LAST remaining half: an unfinished edition must be able
 * to drain.
 *
 * Two earlier passes fixed the fan-out (one join for the batch, the
 * recommendation hoisted out of the loop, real per-temple aarti windows),
 * stopped `WeeklyDigestRun` being stamped after a partial run, and made a
 * retry RESUME rather than restart (per-(edition, recipient) claims).
 *
 * All of that is still trapped inside one hour a week. `maybeRunWeeklyDigest`
 * gates on `isSunday9AmIst(now)` BEFORE it looks at whether the edition
 * completed, so an incomplete run can only be retried on another tick inside
 * the Sunday 09:00–09:59 IST window. At the documented 30-minute cron cadence
 * (jobs/master-cron.ts) that is two ticks, both on the same UTC day — and the
 * thing that made the run incomplete in the first place is the Resend 100/day
 * cap (docs/free-tier-budgets.md), which does not reset until the next UTC day.
 * So recipient 101 is still never reached: the finding's "silently written off
 * for a week with no dead-letter" survived every fix applied to the loop.
 *
 * The gate has to key on the EDITION, not on the clock. An edition is the IST
 * week (Sunday-anchored, the same anchor the send window uses), so a drain on
 * Monday carries the same edition key, the same delivery claims, and cannot
 * re-send to anyone already reached.
 */

const SUNDAY_9AM_IST = new Date('2026-05-03T03:35:00.000Z'); // Sun 09:05 IST
const MONDAY_NOON_IST = new Date('2026-05-04T06:30:00.000Z'); // Mon 12:00 IST
const editionStartUtc = new Date('2026-05-03T03:30:00.000Z'); // Sun 09:00 IST

function userRow(i: number) {
  return {
    id: `u${i}`,
    email: `d${i}@example.com`,
    fullName: `Devotee ${i}`,
    gotra: null,
    rashi: null,
    preferredLanguage: 'en',
  };
}

const USERS = [userRow(1), userRow(2)];

/** Re-arm the single-page user scan for another run. */
function serveUsersOnce() {
  let served = false;
  prismaMock.user.findMany.mockImplementation(async () => {
    if (served) return [];
    served = true;
    return USERS as never;
  });
}

/** What `SELECT last_run_at FROM "WeeklyDigestRun"` answers on this tick. */
function lastRunAt(value: Date | null) {
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
    if (typeof sql === 'string' && sql.includes('WeeklyDigestRun')) {
      return (value === null ? [] : [{ last_run_at: value }]) as never;
    }
    return [] as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetRunLogForTests();

  prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('no table in test'));
  prismaMock.$queryRaw.mockResolvedValue([]);
  lastRunAt(null);
  serveUsersOnce();
  prismaMock.contentItem.findMany.mockResolvedValue([] as never);
  prismaMock.pujaType.findFirst.mockResolvedValue(null as never);

  process.env.RESEND_API_KEY = 'test-key';
  sendEmail.mockResolvedValue({ ok: true });
});

describe('NOTIF-13 — an unfinished edition drains outside the Sunday window', () => {
  it('runs on a later tick when this edition was never completed', async () => {
    // The Sunday tick never happened (cron down / API asleep), so nothing has
    // been stamped for this edition. Monday noon must still deliver it.
    lastRunAt(null);

    const r = await maybeRunWeeklyDigest({ now: MONDAY_NOON_IST });

    expect(r.gated, `gated on Monday with reason "${r.reason}" — the week is lost`).toBeFalsy();
    expect(r.sent).toBe(2);
  });

  it('drains the recipients a capped Sunday run could not reach, and only those', async () => {
    // Sunday: d1 goes out, d2 is refused by the daily cap → run not stamped.
    sendEmail.mockImplementation(async (msg: { to: string }) =>
      msg.to === 'd2@example.com' ? { ok: false, error: 'daily quota exceeded' } : { ok: true },
    );
    const sunday = await maybeRunWeeklyDigest({ now: SUNDAY_9AM_IST });
    expect(sunday.sent).toBe(1);
    expect(sunday.failed).toBe(1);

    // Monday: the Resend day has rolled over. Same edition, so the delivery
    // claim for d1 still stands and only d2 is owed a mail.
    sendEmail.mockClear();
    sendEmail.mockResolvedValue({ ok: true });
    serveUsersOnce();

    const monday = await maybeRunWeeklyDigest({ now: MONDAY_NOON_IST });
    expect(monday.gated).toBeFalsy();
    expect(
      sendEmail.mock.calls.map((c) => (c[0] as { to: string }).to),
      'the drain must reach exactly the devotee the cap locked out',
    ).toEqual(['d2@example.com']);
    expect(monday.alreadyDelivered).toBe(1);
  });

  it('stays gated once this edition has been completed', async () => {
    // Stamped AFTER this edition started → nothing is owed. Two days later is
    // still inside the same IST week, and must not produce a second digest.
    lastRunAt(new Date(editionStartUtc.getTime() + 5 * 60 * 1000));

    const r = await maybeRunWeeklyDigest({ now: MONDAY_NOON_IST });

    expect(r.gated).toBe(true);
    expect(r.sent).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not fire early — a Saturday tick belongs to next week, not this one', async () => {
    // Last stamp is the PREVIOUS edition's, i.e. this week's Sunday has not
    // arrived yet. A naive "is it more than 6 days since the last run" check
    // reads that as owed and mails the digest a day early, every week.
    const saturdayBefore = new Date('2026-05-02T06:30:00.000Z'); // Sat 12:00 IST
    lastRunAt(new Date('2026-04-26T03:31:00.000Z')); // previous Sunday 09:01 IST

    const r = await maybeRunWeeklyDigest({ now: saturdayBefore });

    expect(r.gated).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
