import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

// vi.mock factories are hoisted above the module body, so every stub they close
// over has to be created inside vi.hoisted().
const { sendEmailMock, sendWhatsappTemplateMock, sendWhatsappTextMock, notifyUserMock } =
  vi.hoisted(() => ({
    sendEmailMock: vi.fn(),
    sendWhatsappTemplateMock: vi.fn(),
    sendWhatsappTextMock: vi.fn(),
    notifyUserMock: vi.fn(),
  }));

vi.mock('../lib/email.js', async () => {
  // Keep the REAL template so these tests exercise the same HTML/text the
  // devotee receives; only the transport is stubbed.
  const actual = await vi.importActual<typeof import('../lib/email.js')>('../lib/email.js');
  return { ...actual, sendEmail: sendEmailMock };
});

vi.mock('../lib/whatsapp.js', () => ({
  sendWhatsappTemplate: sendWhatsappTemplateMock,
  sendWhatsappText: sendWhatsappTextMock,
}));

vi.mock('../routes/notifications.js', () => ({ notifyUser: notifyUserMock }));

import {
  notifyDevotee,
  notifyRefundProcessed,
  notifyVideoReady,
  sendBookingConfirmationEmail,
} from './booking-notify.service.js';

// ── RV-18 / RV-19 regression locks ───────────────────────────────────────────
//
// RV-18: bookingConfirmationEmail had exactly one reference in the repo — its
// own definition. The only email a paying devotee received was the payment receipt,
// whose puja_booking PDF variant renders createdAt as the INVOICE date and has
// no scheduledDate/scheduledTimeSlot field at all, so the devotee was never
// told in writing WHEN the puja would be performed.
//
// RV-19: the 'refund' event was declared, mapped to a template and given push
// copy — and fired from nowhere. The only refund notice was refund.service's
// sendEmail, gated twice (nullable User.email, then RESEND_API_KEY), so a
// phone-OTP devotee learned nothing on any channel when their money went back.

const EMAILED_BOOKING = {
  id: 'bk-1',
  bookingNumber: 'BS-20260810-ABCDE',
  // scheduledDate is a DATE column: UTC midnight. Formatting it in any
  // negative-offset zone would print the PREVIOUS calendar day.
  scheduledDate: new Date('2026-08-15T00:00:00.000Z'),
  scheduledTimeSlot: '18:00',
  priceAmount: '1100.50',
  user: { id: 'u-1', fullName: 'Anita Sharma', email: 'anita@example.com', phone: '+919000000001' },
  temple: { name: 'Kashi Vishwanath' },
  pujaType: { name: 'Rudrabhishek' },
  priest: { displayName: 'Pandit Ramesh Shastri' },
};

const PHONE_ONLY_BOOKING = {
  ...EMAILED_BOOKING,
  user: { id: 'u-2', fullName: 'Ravi Kumar', email: null, phone: '+919000000002' },
};

beforeEach(() => {
  vi.clearAllMocks();
  sendEmailMock.mockResolvedValue({ ok: true, id: 'email-1' });
  sendWhatsappTemplateMock.mockResolvedValue({ ok: true });
  sendWhatsappTextMock.mockResolvedValue({ ok: true });
  notifyUserMock.mockResolvedValue(undefined);
});

describe('sendBookingConfirmationEmail — RV-18', () => {
  it('sends the schedule the payment receipt never carried', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);

    const res = await sendBookingConfirmationEmail('bk-1');

    expect(res).toEqual({ sent: true, reason: undefined });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0]![0] as unknown as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(arg.to).toBe('anita@example.com');
    for (const body of [arg.html, arg.text]) {
      expect(body).toContain('15 August 2026');
      expect(body).toContain('6:00 PM IST');
      expect(body).toContain('Kashi Vishwanath');
      expect(body).toContain('Pandit Ramesh Shastri');
      expect(body).toContain('BS-20260810-ABCDE');
    }
  });

  it('formats the DATE column in UTC — never the previous calendar day', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    await sendBookingConfirmationEmail('bk-1');
    const { html } = sendEmailMock.mock.calls[0]![0] as unknown as { html: string };
    expect(html).not.toContain('14 August 2026');
  });

  it('renders the stored Decimal exactly — paisa as two digits, never a float', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    await sendBookingConfirmationEmail('bk-1');
    const { html } = sendEmailMock.mock.calls[0]![0] as unknown as { html: string };
    expect(html).toContain('₹1,100.50');
    expect(html).not.toContain('₹1,100.5<');
  });

  it('is a clean no-op for a phone-only devotee (no throw, no send)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(PHONE_ONLY_BOOKING as never);
    const res = await sendBookingConfirmationEmail('bk-1');
    expect(res).toEqual({ sent: false, reason: 'no-email' });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it('never throws when the DB or the transport fails — a captured payment must not roll back', async () => {
    prismaMock.pujaBooking.findUnique.mockRejectedValue(new Error('db down'));
    await expect(sendBookingConfirmationEmail('bk-1')).resolves.toEqual({
      sent: false,
      reason: 'error',
    });

    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    sendEmailMock.mockResolvedValue({ ok: false, skipped: true } as never);
    await expect(sendBookingConfirmationEmail('bk-1')).resolves.toEqual({
      sent: false,
      reason: 'email-disabled',
    });
  });
});

describe("notifyDevotee('confirmed') — RV-18 wiring", () => {
  it('fires the confirmation email off the event payment.service already sends', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);

    await notifyDevotee('confirmed', {
      bookingId: 'bk-1',
      devoteeUserId: 'u-1',
      devoteePhone: '+919000000001',
      pujaName: 'Rudrabhishek',
    });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    // The other two legs still fire — email is additive, not a replacement.
    expect(notifyUserMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsappTemplateMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsappTemplateMock.mock.calls[0]![0]).toMatchObject({
      template: 'booking_confirmed',
    });
  });

  it('does NOT email on any other event (the invoice/confirmation pair stays single-send)', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    for (const event of ['assigned', 'reassigned', 'cancelled', 'refund'] as const) {
      await notifyDevotee(event, { bookingId: 'bk-1', devoteeUserId: 'u-1' });
    }
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('notifyRefundProcessed — RV-19', () => {
  it('reaches a phone-only devotee on push + WhatsApp and names the amount', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(PHONE_ONLY_BOOKING as never);

    await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '1100.50' });

    expect(notifyUserMock).toHaveBeenCalledTimes(1);
    const push = notifyUserMock.mock.calls[0]![1] as unknown as { title: string; body: string };
    expect(push.title).toBe('Refund processed');
    expect(push.body).toContain('₹1,100.50');
    expect(push.body).toContain('5-7 business days');

    expect(sendWhatsappTemplateMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsappTemplateMock.mock.calls[0]![0]).toMatchObject({
      to: '+919000000002',
      template: 'booking_refund',
    });
  });

  // NOTIF-04 (2026-08-12) CHANGED THIS CONTRACT. It used to be "never email",
  // which was safe when the only caller-to-be was refund.service (it has its own
  // refundSuccessEmail). But the OTHER rail — payment.service.processRefund, the
  // admin panel's — sends no email at all, so a blanket no-email rule left every
  // admin refund with zero written notice. The email is now conditional on the
  // caller reporting whether it already sent one. What must still hold is the
  // thing this test was really protecting: exactly one email per refund.
  it('emails at most once per refund, whichever rail issued it', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);

    // refund.service's rail: it already emailed.
    await notifyRefundProcessed({
      bookingId: 'bk-1',
      amountInr: '1100.50',
      emailAlreadySent: true,
    });
    expect(sendEmailMock).not.toHaveBeenCalled();

    // The admin rail: nobody emailed, so the notifier does — exactly once.
    await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '1100.50' });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it('still announces the refund when the amount is unknown', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(PHONE_ONLY_BOOKING as never);
    await notifyRefundProcessed({ bookingId: 'bk-1' });
    const push = notifyUserMock.mock.calls[0]![1] as unknown as { body: string };
    expect(push.body).toContain('on its way');
    expect(push.body).not.toContain('undefined');
    expect(push.body).not.toContain('NaN');
  });

  it('never throws — it is called after the refund transaction has committed', async () => {
    prismaMock.pujaBooking.findUnique.mockRejectedValue(new Error('db down'));
    await expect(
      notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '100' }),
    ).resolves.toMatchObject({ delivered: false });

    prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
    await expect(
      notifyRefundProcessed({ bookingId: 'nope', amountInr: '100' }),
    ).resolves.toMatchObject({ delivered: false });
    expect(notifyUserMock).not.toHaveBeenCalled();
  });

  // NOTIF-04 (2026-08-12): the admin rail (payment.service.processRefund) sends
  // NO email of its own, so for a refund issued there the notifier owns the
  // written notice too. refund.service's own rail passes emailAlreadySent so it
  // still cannot produce a duplicate.
  it('sends the refund email when the caller has NOT already sent one', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '1100.50' });

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0]![0] as unknown as { to: string; html: string };
    expect(arg.to).toBe('anita@example.com');
    expect(arg.html).toContain('₹1,100.50');
  });

  it('suppresses the email when the caller already sent one', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    await notifyRefundProcessed({
      bookingId: 'bk-1',
      amountInr: '1100.50',
      emailAlreadySent: true,
    });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

// ── NOTIF-05: the video-proof notification ───────────────────────────────────

describe('notifyVideoReady — NOTIF-05', () => {
  it('sends the email the confirmation email promises in writing', async () => {
    // lib/email.ts:146 tells every paying devotee: "You'll receive an email
    // when the recording is ready." No such template existed.
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...EMAILED_BOOKING,
      videoProofUrl: 'https://r2.example.com/proof.mp4',
    } as never);

    const out = await notifyVideoReady('bk-1');

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const arg = sendEmailMock.mock.calls[0]![0] as unknown as {
      to: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(arg.to).toBe('anita@example.com');
    for (const body of [arg.html, arg.text]) {
      expect(body).toContain('Rudrabhishek');
      expect(body).toContain('BS-20260810-ABCDE');
    }
    expect(out.email).toBe('sent');
  });

  it('fires the puja_video_ready WhatsApp template — the NRI promise is WhatsApp', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...EMAILED_BOOKING,
      videoProofUrl: 'https://r2.example.com/proof.mp4',
    } as never);

    await notifyVideoReady('bk-1');

    expect(sendWhatsappTemplateMock).toHaveBeenCalledTimes(1);
    expect(sendWhatsappTemplateMock.mock.calls[0]![0]).toMatchObject({
      to: '+919000000001',
      template: 'puja_video_ready',
    });
  });

  it('reaches a phone-only devotee — no email address is not a dead end', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...PHONE_ONLY_BOOKING,
      videoProofUrl: 'https://r2.example.com/proof.mp4',
    } as never);

    const out = await notifyVideoReady('bk-1');

    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(out.email).toBe('no-target');
    expect(sendWhatsappTemplateMock).toHaveBeenCalledTimes(1);
    expect(notifyUserMock).toHaveBeenCalledTimes(1);
  });

  it('never throws — it is called fire-and-forget after the proof is stored', async () => {
    prismaMock.pujaBooking.findUnique.mockRejectedValue(new Error('db down'));
    await expect(notifyVideoReady('bk-1')).resolves.toMatchObject({ delivered: false });

    prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
    await expect(notifyVideoReady('nope')).resolves.toMatchObject({ delivered: false });
  });
});

// ── NOTIF-03 honesty: channels are UNCONFIGURED in this environment ──────────
//
// Resend, the WhatsApp BSP and VAPID all lack credentials (owner-gated). Every
// integration here is env-or-noop by convention, so a send becomes a silent
// {skipped:true}. The failure mode that produced NOTIF-04 is not "the channel
// was down" — it is that nothing anywhere could tell you the devotee heard
// nothing. These lock the honesty contract: report per channel, never count a
// skip as a send, and make a total miss visible in the log.

describe('delivery reporting — never claim delivery on an unconfigured channel', () => {
  const VIDEO_BOOKING = {
    ...EMAILED_BOOKING,
    videoProofUrl: 'https://r2.example.com/proof.mp4',
  };

  it('reports a skip as a skip, not a send, when every channel is unconfigured', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(VIDEO_BOOKING as never);
    // Exactly what the libs return with no credentials set.
    notifyUserMock.mockResolvedValue(0);
    sendWhatsappTemplateMock.mockResolvedValue({ ok: false, skipped: true });
    sendEmailMock.mockResolvedValue({ ok: false, skipped: true });

    const out = await notifyVideoReady('bk-1');

    expect(out).toMatchObject({
      push: 'skipped',
      whatsapp: 'skipped',
      email: 'skipped',
      delivered: false,
    });
  });

  it('logs an UNDELIVERED marker so a devotee who heard nothing is visible in the log', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(PHONE_ONLY_BOOKING as never);
    notifyUserMock.mockResolvedValue(0);
    sendWhatsappTemplateMock.mockResolvedValue({ ok: false, skipped: true });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '1100.50' });

    const logged = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toContain('[booking-notify][UNDELIVERED]');
    expect(logged).toContain('bk-1');
    expect(logged).toContain('refund');
    warn.mockRestore();
  });

  it('stays quiet when a channel really did deliver', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(PHONE_ONLY_BOOKING as never);
    notifyUserMock.mockResolvedValue(0);
    sendWhatsappTemplateMock.mockResolvedValue({ ok: true, messageId: 'wamid.1' });
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const out = await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '1100.50' });

    expect(out).toMatchObject({ whatsapp: 'sent', delivered: true });
    const logged = warn.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).not.toContain('[booking-notify][UNDELIVERED]');
    warn.mockRestore();
  });

  it('distinguishes a transport failure from an unconfigured channel', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(PHONE_ONLY_BOOKING as never);
    notifyUserMock.mockRejectedValue(new Error('vapid blew up'));
    sendWhatsappTemplateMock.mockResolvedValue({ ok: false, error: 'HTTP 500' });

    const out = await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '100' });

    expect(out).toMatchObject({ push: 'failed', whatsapp: 'failed', delivered: false });
  });

  it('reports no-target rather than a skip when there is nothing to send to', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({
      ...EMAILED_BOOKING,
      user: { id: null, fullName: 'Nobody', email: null, phone: null },
    } as never);

    const out = await notifyVideoReady('bk-1');

    expect(out).toMatchObject({
      push: 'no-target',
      whatsapp: 'no-target',
      email: 'no-target',
      delivered: false,
    });
  });
});
