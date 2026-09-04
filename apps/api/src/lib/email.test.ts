import { describe, it, expect } from 'vitest';
import { bookingConfirmationEmail } from './email.js';

// ── RV-18 regression lock ────────────────────────────────────────────────────
// bookingConfirmationEmail was dead code: the only email a paying devotee ever
// received was the payment receipt, whose puja_booking PDF variant renders createdAt
// as the INVOICE date and carries no scheduled-date/slot field at all. So the
// devotee was never told in writing WHEN their puja would be performed.
//
// These tests lock the four facts that made the template worth reviving —
// date, time, temple, pandit — plus the booking number and the amount, in BOTH
// the html and the text part (plenty of Indian mail clients render text only).

const BASE = {
  devoteeName: 'Anita Sharma',
  pujaName: 'Rudrabhishek',
  templeName: 'Kashi Vishwanath',
  scheduledDate: 'Saturday, 15 August 2026',
  scheduledTimeSlot: '6:00 PM IST',
  bookingNumber: 'BS-20260810-ABCDE',
  amount: '₹1,100',
  priestName: 'Pandit Ramesh Shastri',
};

describe('bookingConfirmationEmail — RV-18', () => {
  it('carries the schedule the payment receipt never had', () => {
    const { html, text, subject } = bookingConfirmationEmail(BASE);
    for (const body of [html, text]) {
      expect(body).toContain('Saturday, 15 August 2026');
      expect(body).toContain('6:00 PM IST');
      expect(body).toContain('Kashi Vishwanath');
      expect(body).toContain('Pandit Ramesh Shastri');
      expect(body).toContain('BS-20260810-ABCDE');
      expect(body).toContain('₹1,100');
    }
    expect(subject).toContain('Rudrabhishek');
    expect(subject).toContain('Kashi Vishwanath');
  });

  it('links to the booking page by booking number', () => {
    const { html, text } = bookingConfirmationEmail(BASE);
    expect(html).toContain('https://darshya.online/bookings/BS-20260810-ABCDE');
    expect(text).toContain('https://darshya.online/bookings/BS-20260810-ABCDE');
  });

  it('promises the video proof (the mandatory deliverable for a puja booking)', () => {
    const { html } = bookingConfirmationEmail(BASE);
    expect(html.toLowerCase()).toContain('video proof');
  });

  it('degrades gracefully when no pandit is assigned yet', () => {
    const { html, text } = bookingConfirmationEmail({ ...BASE, priestName: null });
    // Must not print an empty "Pandit:" line or the literal null.
    expect(html).not.toContain('null');
    expect(text).not.toContain('null');
    expect(html).toContain('Being assigned');
    expect(text).toContain('being assigned');
  });

  it('escapes untrusted names instead of interpolating raw HTML', () => {
    const { html } = bookingConfirmationEmail({
      ...BASE,
      devoteeName: '<script>alert(1)</script>',
      templeName: 'Ram & Sita "Mandir"',
    });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Ram &amp; Sita');
  });
});
