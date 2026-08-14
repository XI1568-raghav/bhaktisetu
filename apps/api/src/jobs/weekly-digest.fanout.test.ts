import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const sendEmail = vi.fn();
vi.mock('../lib/email.js', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));

vi.mock('../services/panchang.service.js', () => ({
  panchangService: { getToday: async () => ({ tithi: 'Purnima', festivals: [], specialInfo: null }) },
}));

import { runWeeklyDigest } from './weekly-digest.js';

/**
 * NOTIF-13 — the weekly digest was 1+2N queries with FABRICATED personalisation
 * and no retry past the Resend free-tier cap.
 *
 *  - `fetchUpcomingAartisForUser` hardcoded `aarti: 'Sandhya Aarti'` and
 *    `whenLocal: 'today 6:30 PM IST'` for every followed temple, ignoring the
 *    real per-temple windows in the DB (Govind Dev Ji has 6, Shirdi 4). Every
 *    recipient was told an aarti time that was not that temple's.
 *  - `fetchRecommendedPuja(user)` took the user and never read it: the gotra
 *    branch was an empty block, the query was the same `findFirst` for
 *    everybody, and the email still said "Based on your <gotra> gotra".
 *  - both ran INSIDE the per-user loop: 2N queries for one row of shared data.
 *  - `WeeklyDigestRun` was stamped unconditionally, so the 99% of recipients
 *    that fail past the 100/day Resend cap were written off for six days with
 *    no dead-letter and no retry.
 */

const USERS = [
  { id: 'u1', email: 'a@example.com', fullName: 'Asha Devi', gotra: 'Bharadwaj', rashi: null, preferredLanguage: 'hi' },
  { id: 'u2', email: 'b@example.com', fullName: 'Bhanu Rao', gotra: null, rashi: null, preferredLanguage: 'en' },
  { id: 'u3', email: 'c@example.com', fullName: 'Chandra M', gotra: 'Kashyap', rashi: null, preferredLanguage: 'en' },
];

/** Kashi's real seeded windows: a 03:00 mangala aarti and a 19:00 evening aarti. */
const FOLLOW_ROWS = [
  {
    user_id: 'u1',
    name: 'Kashi Vishwanath Temple',
    timing_info: {
      regularHours: {
        mangalaAarti: '03:00 - 04:00',
        eveningAarti: '19:00 - 20:30',
        generalDarshan: '04:00 - 11:00',
      },
    },
  },
];

let rawCalls: string[];

beforeEach(() => {
  vi.clearAllMocks();
  rawCalls = [];
  process.env.RESEND_API_KEY = 'test-key';

  prismaMock.user.findMany.mockResolvedValue(USERS as never);
  prismaMock.contentItem.findMany.mockResolvedValue([] as never);
  prismaMock.pujaType.findFirst.mockResolvedValue({
    name: 'Satyanarayan Puja',
    deity: 'Vishnu',
    slug: 'satyanarayan',
    basePrice: 1100,
  } as never);
  prismaMock.$queryRawUnsafe.mockImplementation(async (sql: string) => {
    rawCalls.push(sql);
    if (/WeeklyDigestOptOut/i.test(sql)) return [];
    if (/temple_follows/i.test(sql)) return FOLLOW_ROWS;
    return [];
  });
  prismaMock.$executeRawUnsafe.mockResolvedValue(1 as never);
  sendEmail.mockResolvedValue({ ok: true });
});

function followQueries() {
  return rawCalls.filter((s) => /temple_follows/i.test(s));
}

describe('weekly digest query shape (NOTIF-13)', () => {
  it('joins temple_follows ONCE for the whole batch, not once per user', async () => {
    await runWeeklyDigest();
    expect(prismaMock.user.findMany).toHaveBeenCalledTimes(1);
    expect(followQueries()).toHaveLength(1);
  });

  it('resolves the shared puja recommendation once, not once per user', async () => {
    await runWeeklyDigest();
    expect(prismaMock.pujaType.findFirst).toHaveBeenCalledTimes(1);
  });
});

describe('weekly digest content is real, not fabricated (NOTIF-13)', () => {
  it("renders that temple's actual aarti windows, not a hardcoded Sandhya 6:30 PM", async () => {
    await runWeeklyDigest();
    const toU1 = sendEmail.mock.calls.find((c) => c[0].to === 'a@example.com')![0];

    expect(toU1.text).toContain('Kashi Vishwanath Temple');
    expect(toU1.text).toMatch(/Mangala Aarti/i);
    expect(toU1.text).toMatch(/3:00 AM IST/);
    // The two fabricated constants must be gone.
    expect(toU1.text).not.toMatch(/Sandhya Aarti/);
    expect(toU1.text).not.toMatch(/today 6:30 PM IST/);
  });

  it('shows no aarti section at all for a devotee who follows nothing', async () => {
    const toU2 = await runWeeklyDigest().then(
      () => sendEmail.mock.calls.find((c) => c[0].to === 'b@example.com')![0],
    );
    expect(toU2.html).not.toContain('Upcoming aartis');
  });

  it('does not claim a gotra-based recommendation it did not make', async () => {
    await runWeeklyDigest();
    const toU1 = sendEmail.mock.calls.find((c) => c[0].to === 'a@example.com')![0];
    // u1 has a gotra, but the recommendation is the same global top puja every
    // recipient gets. Saying "Based on your Bharadwaj gotra" is a fabrication.
    expect(toU1.html).not.toMatch(/Based on your Bharadwaj gotra/i);
    expect(toU1.html).toContain('Satyanarayan Puja');
  });
});

describe('weekly digest run stamping (NOTIF-13)', () => {
  function runStamps() {
    return prismaMock.$executeRawUnsafe.mock.calls.filter((c: any) =>
      /WeeklyDigestRun/i.test(String(c[0])),
    );
  }

  it('stamps the run when every recipient was reached', async () => {
    const r = await runWeeklyDigest();
    expect(r.failed).toBe(0);
    expect(runStamps()).toHaveLength(1);
  });

  it('does NOT stamp the run when a send failed — six days of silence is not a retry', async () => {
    sendEmail.mockImplementation(async (m: any) =>
      m.to === 'c@example.com' ? { ok: false, error: 'rate limit exceeded' } : { ok: true },
    );

    const r = await runWeeklyDigest();

    expect(r.failed).toBe(1);
    expect(runStamps()).toHaveLength(0);
  });

  it('still stamps when the only non-sends are unconfigured-channel skips', async () => {
    sendEmail.mockResolvedValue({ ok: false, skipped: true });
    const r = await runWeeklyDigest();
    expect(r.failed).toBe(0);
    expect(r.skipped).toBe(3);
    expect(runStamps()).toHaveLength(1);
  });
});
