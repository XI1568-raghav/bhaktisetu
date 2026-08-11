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
  sendBookingConfirmationEmail,
} from './booking-notify.service.js';

// ── RV-18 / RV-19 regression locks ───────────────────────────────────────────
//
// RV-18: bookingConfirmationEmail had exactly one reference in the repo — its
// own definition. The only email a paying devotee received was the tax invoice,
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
  it('sends the schedule the tax invoice never carried', async () => {
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

  it('sends no email — refund.service already emails, so wiring this cannot duplicate one', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue(EMAILED_BOOKING as never);
    await notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '1100.50' });
    expect(sendEmailMock).not.toHaveBeenCalled();
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
    await expect(notifyRefundProcessed({ bookingId: 'bk-1', amountInr: '100' })).resolves.toBeUndefined();

    prismaMock.pujaBooking.findUnique.mockResolvedValue(null as never);
    await expect(notifyRefundProcessed({ bookingId: 'nope', amountInr: '100' })).resolves.toBeUndefined();
    expect(notifyUserMock).not.toHaveBeenCalled();
  });
});
