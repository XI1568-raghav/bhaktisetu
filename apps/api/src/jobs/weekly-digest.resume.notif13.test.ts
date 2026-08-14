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
 * NOTIF-13 (P1) — the remaining half: THE RETRY THAT RESTARTS FROM THE TOP.
 *
 * The first pass fixed the fan-out (one join for the batch, the recommendation
 * hoisted, real per-temple aarti windows) and stopped `WeeklyDigestRun` being
 * stamped after a partial run. That last change is necessary and, on its own,
 * makes things worse.
 *
 * Not stamping means `maybeRunWeeklyDigest`'s 6-day cooldown never engages, so
 * the next tick inside the Sunday 09:00 IST window runs the WHOLE job again —
 * from user #1. With the Resend free-tier cap at 100/day
 * (docs/free-tier-budgets.md) that produces exactly the wrong two outcomes at
 * once:
 *   - recipients 1..100 are emailed the identical digest a second time (and a
 *     third next week, and so on), which is how a devotional app's mail gets
 *     marked spam; and
 *   - recipients 101+ are never reached at all, because every retry burns the
 *     day's quota on the people who already received it.
 *
 * "Persisting failures to a retry queue" is the half that was missing. A run
 * has to RESUME. The delivery claim is per (edition, recipient) and durable —
 * the same `notification_run_log` primitive aarti-notify uses so exactly one
 * tick on exactly one instance sends — and a send that fails RELEASES its
 * claim, so the failed recipient is retried and the delivered one is not.
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

  // The run-log table is created with raw DDL; in this suite it is unavailable,
  // so claimRun falls back to its documented in-process dedupe — which is the
  // behaviour under test either way.
  prismaMock.$executeRawUnsafe.mockRejectedValue(new Error('no table in test'));
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

/** Recipient addresses in call order. */
function recipients(): string[] {
  return sendEmail.mock.calls.map((c) => (c[0] as { to: string }).to);
}

describe('NOTIF-13 — a retried digest resumes instead of restarting', () => {
  it('does not re-send to a devotee who already received this edition', async () => {
    sendEmail.mockResolvedValue({ ok: true });

    const first = await runWeeklyDigest();
    expect(first.sent).toBe(3);
    expect(recipients()).toEqual(['d1@example.com', 'd2@example.com', 'd3@example.com']);

    // Second tick of the same Sunday window — the cooldown row was never
    // written because the run reported failures on a real cap-limited run, so
    // the job legitimately runs again.
    sendEmail.mockClear();
    let served = false;
    prismaMock.user.findMany.mockImplementation(async () => {
      if (served) return [];
      served = true;
      return USERS as never;
    });

    const second = await runWeeklyDigest();
    expect(recipients(), 'the same devotees were emailed the digest twice').toEqual([]);
    expect(second.sent).toBe(0);
  });

  it('retries only the recipients whose send actually failed', async () => {
    // d2 hits the Resend daily cap; d1 and d3 go out.
    sendEmail.mockImplementation(async (msg: { to: string }) =>
      msg.to === 'd2@example.com' ? { ok: false, error: 'daily quota exceeded' } : { ok: true },
    );

    const first = await runWeeklyDigest();
    expect(first.sent).toBe(2);
    expect(first.failed).toBe(1);

    sendEmail.mockClear();
    sendEmail.mockResolvedValue({ ok: true });
    let served = false;
    prismaMock.user.findMany.mockImplementation(async () => {
      if (served) return [];
      served = true;
      return USERS as never;
    });

    const second = await runWeeklyDigest();
    expect(
      recipients(),
      'the retry must reach the devotee who was capped out, and nobody else',
    ).toEqual(['d2@example.com']);
    expect(second.sent).toBe(1);
  });

  it('reports resumed recipients honestly — they are not counted as sent', async () => {
    sendEmail.mockResolvedValue({ ok: true });
    await runWeeklyDigest();

    let served = false;
    prismaMock.user.findMany.mockImplementation(async () => {
      if (served) return [];
      served = true;
      return USERS as never;
    });
    const second = await runWeeklyDigest();

    // "already delivered on an earlier tick" is its own fact. Folding it into
    // `sent` would report three fresh deliveries that never happened, which is
    // the same conflation NOTIF-03 measured on the diagnostic endpoint.
    expect(second.sent).toBe(0);
    expect(second.alreadyDelivered).toBe(3);
  });
});
