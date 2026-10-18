import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../routes/notifications.js', () => ({ notifyUser: vi.fn().mockResolvedValue(0) }));
vi.mock('../lib/whatsapp.js', () => ({
  sendWhatsappTemplate: vi.fn().mockResolvedValue({ ok: false, skipped: true }),
  sendWhatsappText: vi.fn().mockResolvedValue({ ok: false, skipped: true }),
}));
vi.mock('../lib/notification-log.js', () => ({ recordNotification: vi.fn().mockResolvedValue(undefined) }));
const sendEmailMock = vi.hoisted(() => vi.fn());
vi.mock('../lib/email.js', async (orig) => ({ ...(await orig<typeof import('../lib/email.js')>()), sendEmail: sendEmailMock }));

import { notifyDevotee, buildBookingCtx } from './booking-notify.service.js';
import { bookingCancelledEmail, panditAssignedEmail, orderCancelledEmail, consultationCancelledEmail } from '../lib/email.js';

const ctx = () => buildBookingCtx({
  id: 'b-uuid-1', bookingNumber: 'BS-20261014-AAAAA', scheduledDate: new Date('2026-11-01T00:00:00Z'), scheduledTimeSlot: '06:00',
  user: { id: 'u1', fullName: 'Devi <b>X</b>', phone: null },
  temple: { name: 'Kashi' }, pujaType: { name: 'Abhishek' }, priest: { displayName: 'Pt. Rao' },
} as never);

beforeEach(() => {
  vi.clearAllMocks();
  sendEmailMock.mockResolvedValue({ ok: true });
  prismaMock.pujaBooking.findUnique.mockResolvedValue({ user: { email: 'd@example.com', fullName: 'Devi' } } as never);
});

describe('devotee cancellation / pandit-assigned emails', () => {
  it.each(['cancelled', 'assigned'] as const)('%s: emails the devotee even when the caller select had no email', async (ev) => {
    const out = await notifyDevotee(ev, ctx());
    expect(out.email).toBe('sent');
    const mail = sendEmailMock.mock.calls[0]![0] as { to: string; subject: string; html: string; text: string };
    expect(mail.to).toBe('d@example.com');
    expect(mail.html).toContain('BS-20261014-AAAAA');
    expect(mail.html + mail.text).not.toContain('b-uuid-1');
  });
  it('no email on file: no-target, nothing sent', async () => {
    prismaMock.pujaBooking.findUnique.mockResolvedValue({ user: { email: null } } as never);
    expect((await notifyDevotee('cancelled', ctx())).email).toBe('no-target');
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('templates escape html', () => {
  it('escapes every user-supplied value', () => {
    const evil = '<script>alert(1)</script>';
    const all = [
      bookingCancelledEmail({ devoteeName: evil, pujaName: evil, templeName: evil, bookingNumber: evil }),
      panditAssignedEmail({ devoteeName: evil, pujaName: evil, templeName: evil, bookingNumber: evil, priestName: evil, scheduledDate: evil }),
      orderCancelledEmail({ customerName: evil, orderNumber: evil, refundOwedInr: 5 }),
      consultationCancelledEmail({ devoteeName: evil, reference: evil, astrologerName: evil, refundEligible: true }),
    ];
    for (const m of all) expect(m.html).not.toContain('<script>');
  });
});
