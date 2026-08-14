/**
 * SCAL-11, remaining half — SPLIT THE TRAFFIC.
 *
 * The first pass shipped the finding's step one ("instrument first"): a daily
 * counter, a 70/day warning, and a named `rateLimited` result. That makes the
 * wall visible. It does nothing about who hits it.
 *
 * The finding's step two is "transactional receipts and password resets stay on
 * Resend, and move the digest/drip/marketing sends to a separate provider".
 * Buying a second provider is a business decision. Deciding that a digest may
 * not spend the receipt budget is not — it is one number, and without it the
 * ordering is pure luck: the weekly digest fans out to every devotee from one
 * cron tick, so on any Sunday with >100 users it consumes the ENTIRE day's
 * allowance before lunch. Devotee number 34 then books a puja and never
 * receives the receipt that is her only proof of purchase, and an 80G donation
 * receipt — a tax document — is refused with a 429 nobody reads.
 *
 * So: bulk mail yields. It gets everything up to the reserve line and not one
 * send past it, and the refusal is reported as its own fact (`deferred`) so the
 * digest releases the recipient's claim and drains tomorrow (NOTIF-13) instead
 * of recording a delivery that never happened.
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
  process.env.RESEND_DAILY_CAP = '10';
  process.env.RESEND_BULK_RESERVE = '4'; // bulk may use 6 of 10
});

afterEach(() => {
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_DAILY_CAP;
  delete process.env.RESEND_BULK_RESERVE;
});

const MAIL = { to: 'a@example.com', subject: 's', html: '<p>h</p>' };

describe('SCAL-11: bulk mail may not spend the transactional reserve', () => {
  it('refuses a bulk send once the reserve line is reached', async () => {
    const { sendEmail } = await loadEmail();

    // Six bulk sends fit under the line (cap 10 − reserve 4).
    for (let i = 0; i < 6; i++) {
      const r = await sendEmail({ ...MAIL, kind: 'bulk' });
      expect(r.ok, `bulk send ${i + 1} of 6 should still fit`).toBe(true);
    }
    expect(send).toHaveBeenCalledTimes(6);

    const seventh = await sendEmail({ ...MAIL, kind: 'bulk' });
    expect(seventh.ok).toBe(false);
    expect(seventh.deferred, 'the refusal must be named, not an anonymous error').toBe(true);
    expect(
      send,
      'the seventh bulk mail was still handed to Resend — the reserve is decorative',
    ).toHaveBeenCalledTimes(6);
  });

  it('still delivers a booking receipt after bulk has been cut off', async () => {
    const { sendEmail } = await loadEmail();

    for (let i = 0; i < 8; i++) await sendEmail({ ...MAIL, kind: 'bulk' });

    // This is the whole point: the receipt is the devotee's proof of purchase.
    const receipt = await sendEmail(MAIL);
    expect(receipt.ok, 'a transactional mail was refused to make room for a digest').toBe(true);
  });

  it('defaults to transactional — an unlabelled send is never yielded', async () => {
    const { sendEmail } = await loadEmail();

    for (let i = 0; i < 9; i++) await sendEmail(MAIL);
    const tenth = await sendEmail(MAIL);

    expect(tenth.ok).toBe(true);
    expect(tenth.deferred).toBeUndefined();
  });

  it('reports a deferred bulk send as skipped, never as sent', async () => {
    const { sendEmail, getEmailQuotaSnapshot } = await loadEmail();

    for (let i = 0; i < 6; i++) await sendEmail({ ...MAIL, kind: 'bulk' });
    const refused = await sendEmail({ ...MAIL, kind: 'bulk' });

    // `skipped` is this codebase's word for "nothing was attempted" — the same
    // contract the unconfigured-channel path uses, and what makes the digest
    // release the recipient's delivery claim rather than mark them handled.
    expect(refused.skipped).toBe(true);
    const snap = getEmailQuotaSnapshot();
    expect(snap.sent, 'a deferred mail must not be counted as delivered').toBe(6);
    expect(snap.attempted, 'nor charged to the day it never reached').toBe(6);
  });
});
