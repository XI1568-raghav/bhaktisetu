/**
 * SCAL-11 — Resend's 100 emails/day is the first hard business cap the
 * platform hits (~33 signups/day at ~3 mails each), and today it is reached
 * SILENTLY: Resend answers 429, `sendEmail` swallows it into
 * `{ ok:false, error }`, and nothing counts, logs a threshold, or tells an
 * operator. Devotee number 34 on a launch day never gets the receipt that IS
 * their proof of purchase, and the first anyone hears of it is a support
 * ticket.
 *
 * This locks the instrumentation half of the fix (the finding's own first
 * step: "log every send with a daily counter and alert at 70/day so you find
 * out before customers do"). Buying a paid tier / splitting drip traffic to a
 * second provider is a business decision, not code.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const send = vi.fn();

vi.mock('resend', () => ({
  Resend: class {
    emails = { send };
  },
}));

async function loadEmail() {
  vi.resetModules();
  process.env.RESEND_API_KEY = 'test-key';
  return import('./email.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  send.mockResolvedValue({ data: { id: 'msg-1' }, error: null });
});

afterEach(() => {
  vi.useRealTimers();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_DAILY_WARN_AT;
  delete process.env.RESEND_DAILY_CAP;
});

const MAIL = { to: 'a@example.com', subject: 's', html: '<p>h</p>' };

describe('SCAL-11: the daily Resend budget is counted and announced', () => {
  it('counts every accepted send against the day', async () => {
    const { sendEmail, getEmailQuotaSnapshot } = await loadEmail();

    await sendEmail(MAIL);
    await sendEmail(MAIL);

    const snap = getEmailQuotaSnapshot();
    expect(snap.sent).toBe(2);
    expect(snap.attempted).toBe(2);
    expect(snap.cap).toBe(100);
  });

  it('warns once when the day crosses the warn threshold, before the cap bites', async () => {
    process.env.RESEND_DAILY_WARN_AT = '3';
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { sendEmail } = await loadEmail();

    await sendEmail(MAIL);
    await sendEmail(MAIL);
    expect(warn).not.toHaveBeenCalled();

    await sendEmail(MAIL);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0]![0])).toContain('SCAL-11');

    // Still one warning, not one per send — an alert that fires 30 times is
    // an alert an operator mutes.
    await sendEmail(MAIL);
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it('reports a 429 as rate-limited instead of an anonymous failure', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'Too many requests', statusCode: 429 } });
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { sendEmail, getEmailQuotaSnapshot } = await loadEmail();

    const res = await sendEmail(MAIL);

    expect(res.ok).toBe(false);
    expect(res.rateLimited).toBe(true);
    expect(getEmailQuotaSnapshot().rateLimited).toBe(1);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it('rolls the counter over at the UTC day boundary Resend resets on', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-12T23:59:00.000Z'));
    const { sendEmail, getEmailQuotaSnapshot } = await loadEmail();

    await sendEmail(MAIL);
    expect(getEmailQuotaSnapshot().sent).toBe(1);

    vi.setSystemTime(new Date('2026-08-13T00:01:00.000Z'));
    await sendEmail(MAIL);

    const snap = getEmailQuotaSnapshot();
    expect(snap.day).toBe('2026-08-13');
    expect(snap.sent).toBe(1);
  });

  it('does not count a send that never happened because no key is configured', async () => {
    vi.resetModules();
    delete process.env.RESEND_API_KEY;
    const { sendEmail, getEmailQuotaSnapshot } = await import('./email.js');

    const res = await sendEmail(MAIL);

    expect(res.skipped).toBe(true);
    expect(getEmailQuotaSnapshot().attempted).toBe(0);
  });
});
