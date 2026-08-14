import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.fn();
vi.mock('../lib/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

vi.mock('../services/panchang.service.js', () => ({
  panchangService: { getToday: async () => ({ tithi: 'Purnima', festivals: [], specialInfo: null }) },
}));

import { runWeeklyDigest } from './weekly-digest.js';
import { __resetRunLogForTests } from '../lib/notification-run-log.js';

/**
 * SCAL-11 × NOTIF-13 — the digest is BULK, and a deferred edition is unfinished.
 *
 * Two halves meet here. `sendEmail` now refuses bulk mail once the day's
 * transactional reserve is all that remains, so the receipt a devotee is
 * waiting on survives a Sunday fan-out. That refusal is not a delivery and it
 * is not a permanent failure — it is "come back tomorrow".
 *
 * If the digest treats it as an ordinary `skipped` (the word this codebase uses
 * for an unconfigured channel and an opted-out user), then `failed` stays 0,
 * `WeeklyDigestRun` is stamped, and the edition is marked complete for everyone
 * the reserve locked out. That is the original NOTIF-13 defect restored through
 * a new door: the 99% written off for a week, silently, with no dead-letter.
 */

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

const USERS = [userRow(1), userRow(2), userRow(3)];

beforeEach(() => {
  vi.clearAllMocks();
  __resetRunLogForTests();

  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  prismaMock.$queryRawUnsafe.mockResolvedValue([]);
  prismaMock.$queryRaw.mockResolvedValue([]);

  let served = false;
  prismaMock.user.findMany.mockImplementation(async () => {
    if (served) return [];
    served = true;
    return USERS as never;
  });
  prismaMock.contentItem.findMany.mockResolvedValue([] as never);
  prismaMock.pujaType.findFirst.mockResolvedValue(null as never);

  process.env.RESEND_API_KEY = 'test-key';
});

/** Did the run write its completion stamp? */
function stamped(): boolean {
  return prismaMock.$executeRawUnsafe.mock.calls.some(
    (c) => typeof c[0] === 'string' && (c[0] as string).includes('WeeklyDigestRun'),
  );
}

describe('SCAL-11 — the weekly digest spends the bulk allowance, not the receipt allowance', () => {
  it('labels every digest mail as bulk', async () => {
    sendEmail.mockResolvedValue({ ok: true });

    await runWeeklyDigest();

    expect(sendEmail).toHaveBeenCalledTimes(3);
    for (const call of sendEmail.mock.calls) {
      expect(
        (call[0] as { kind?: string }).kind,
        'an unlabelled digest mail outranks a booking receipt for the last slot of the day',
      ).toBe('bulk');
    }
  });

  it('does not stamp the edition complete when the budget deferred recipients', async () => {
    sendEmail.mockImplementation(async (msg: { to: string }) =>
      msg.to === 'd1@example.com'
        ? { ok: true }
        : { ok: false, skipped: true, deferred: true, error: 'bulk send deferred' },
    );

    const r = await runWeeklyDigest();

    expect(r.sent).toBe(1);
    expect(r.deferred, 'a deferred recipient is its own fact, not a skip').toBe(2);
    expect(
      stamped(),
      'the edition was marked complete while two devotees were never mailed',
    ).toBe(false);
  });

  it('still stamps a run where the only non-sends are genuine skips', async () => {
    // Channel unconfigured for one recipient: nothing is owed to them by this
    // job, so the edition IS complete and the cooldown must engage.
    sendEmail.mockImplementation(async (msg: { to: string }) =>
      msg.to === 'd3@example.com' ? { ok: false, skipped: true } : { ok: true },
    );

    const r = await runWeeklyDigest();

    expect(r.deferred).toBe(0);
    expect(r.skipped).toBe(1);
    expect(stamped()).toBe(true);
  });
});
