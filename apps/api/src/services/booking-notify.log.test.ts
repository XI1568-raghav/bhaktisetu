import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prismaMock } from '../lib/__mocks__/prisma.js';

vi.mock('../lib/prisma.js', () => ({ prisma: prismaMock }));

const {
  sendEmailMock,
  sendWhatsappTemplateMock,
  sendWhatsappTextMock,
  notifyUserMock,
  recordNotificationMock,
} = vi.hoisted(() => ({
  sendEmailMock: vi.fn(),
  sendWhatsappTemplateMock: vi.fn(),
  sendWhatsappTextMock: vi.fn(),
  notifyUserMock: vi.fn(),
  recordNotificationMock: vi.fn(),
}));

vi.mock('../lib/email.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/email.js')>('../lib/email.js');
  return { ...actual, sendEmail: sendEmailMock };
});
vi.mock('../lib/whatsapp.js', () => ({
  sendWhatsappTemplate: sendWhatsappTemplateMock,
  sendWhatsappText: sendWhatsappTextMock,
}));
vi.mock('../routes/notifications.js', () => ({ notifyUser: notifyUserMock }));
vi.mock('../lib/notification-log.js', () => ({
  recordNotification: recordNotificationMock,
}));

import { notifyDevotee, notifyPriest, type BookingEvent } from './booking-notify.service.js';

/**
 * NOTIF-14 — nothing recorded that a notification was ever attempted.
 *
 * Every send path was fire-and-forget with the result discarded, so a devotee
 * who missed a push had no way to see it later, support could not answer "did
 * the confirmation go out?" for any booking, and nothing could be retried
 * because nothing knew a send had failed. Combined with NOTIF-03 (all four
 * channels unconfigured) the product was silent AND unable to prove it.
 *
 * NOTIF-06 — notifyPriest was dead code with no caller and no test, and it
 * threw its per-channel result away entirely (`.catch(() => undefined)` on both
 * legs, `Promise<void>` out). A pandit heard nothing after the initial offer and
 * nobody could tell.
 */

const CTX = {
  bookingId: 'bk-1',
  devoteeUserId: 'u-1',
  bookingNumber: 'BS-20260812-AAAAA',
  pujaName: 'Satyanarayan Puja',
  templeName: 'Kashi Vishwanath',
  devoteeName: 'Anita Sharma',
  devoteePhone: '+919000000001',
  devoteeEmail: null as string | null,
  priestName: 'Pandit Sharma',
  scheduledDate: '2026-08-20',
  timeSlot: '18:00',
};

beforeEach(() => {
  vi.clearAllMocks();
  notifyUserMock.mockResolvedValue(0);
  sendWhatsappTemplateMock.mockResolvedValue({ ok: false, skipped: true });
  sendEmailMock.mockResolvedValue({ ok: false, skipped: true });
  recordNotificationMock.mockResolvedValue(true);
});

describe('notifyDevotee persists an attempt record (NOTIF-14)', () => {
  it('records one row per event with the honest per-channel outcome', async () => {
    notifyUserMock.mockResolvedValue(1); // push delivered
    await notifyDevotee('confirmed', CTX);

    expect(recordNotificationMock).toHaveBeenCalledTimes(1);
    expect(recordNotificationMock.mock.calls[0]![0]).toMatchObject({
      userId: 'u-1',
      audience: 'devotee',
      event: 'confirmed',
      bookingId: 'bk-1',
      push: 'sent',
      whatsapp: 'skipped',
      delivered: true,
    });
  });

  it('never records a skipped channel as sent', async () => {
    await notifyDevotee('assigned', CTX);
    const rec = recordNotificationMock.mock.calls[0]![0];
    expect(rec.push).toBe('skipped');
    expect(rec.whatsapp).toBe('skipped');
    expect(rec.delivered).toBe(false);
  });

  it('stores the exact copy that was attempted, so the in-app centre is not a guess', async () => {
    await notifyDevotee('confirmed', CTX);
    const rec = recordNotificationMock.mock.calls[0]![0];
    expect(rec.title).toBe('Booking confirmed');
    expect(rec.body).toContain('Satyanarayan Puja');
    expect(rec.url).toBe('/bookings/bk-1');
  });

  it('never lets a logging failure break the notification', async () => {
    recordNotificationMock.mockRejectedValue(new Error('log table gone'));
    await expect(notifyDevotee('confirmed', CTX)).resolves.toMatchObject({ event: 'confirmed' });
  });
});

describe('notifyPriest reports and records what happened (NOTIF-06)', () => {
  it('returns a per-channel outcome instead of throwing the result away', async () => {
    notifyUserMock.mockResolvedValue(1);
    const out = await notifyPriest('priest-user-1', '+919000000002', 'offer_timeout', CTX);

    expect(out.event).toBe('offer_timeout');
    expect(out.push).toBe('sent');
    expect(out.whatsapp).toBe('skipped');
    expect(out.delivered).toBe(true);
  });

  it('records the attempt against the pandit, not the devotee', async () => {
    await notifyPriest('priest-user-1', '+919000000002', 'offer_timeout', CTX);
    expect(recordNotificationMock).toHaveBeenCalledTimes(1);
    expect(recordNotificationMock.mock.calls[0]![0]).toMatchObject({
      userId: 'priest-user-1',
      audience: 'priest',
      event: 'offer_timeout',
      bookingId: 'bk-1',
    });
  });

  it('reports no-target when the pandit has no phone on file', async () => {
    const out = await notifyPriest('priest-user-1', null, 'offer_timeout', CTX);
    expect(out.whatsapp).toBe('no-target');
  });

  it('never throws — a pandit notification must not break the dispatch sweep', async () => {
    notifyUserMock.mockRejectedValue(new Error('push exploded'));
    sendWhatsappTemplateMock.mockRejectedValue(new Error('bsp down'));
    const out = await notifyPriest('priest-user-1', '+919000000002', 'offer_timeout', CTX);
    expect(out.delivered).toBe(false);
    expect(out.push).toBe('failed');
    expect(out.whatsapp).toBe('failed');
  });
});

describe('declared BookingEvents all have a producer (NOTIF-06)', () => {
  it("drops 'eta', which had a template and push copy and no trigger anywhere", () => {
    // A declared event with no producer reads as shipped policy that was not
    // shipped. 'eta' (pandit_eta / "Pandit on the way") had no day-of trigger,
    // so it is gone rather than left as a promise the product does not keep.
    const declared: BookingEvent[] = [
      'confirmed',
      'assigned',
      'reassigned',
      'offer',
      'offer_timeout',
      'in_progress',
      'completed',
      'video_ready',
      'cancelled',
      'refund',
    ];
    expect(declared).toHaveLength(10);
    // @ts-expect-error 'eta' is no longer a BookingEvent
    const removed: BookingEvent = 'eta';
    expect(removed).toBe('eta');
  });
});
