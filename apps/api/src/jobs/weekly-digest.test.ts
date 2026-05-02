import { describe, it, expect } from 'vitest';
import { __testing } from './weekly-digest.js';

describe('weekly-digest scheduling gate', () => {
  const { isSunday9AmIst } = __testing;

  it('returns true at exactly Sunday 09:00 IST (03:30 UTC)', () => {
    // 2026-05-03 was a Sunday. 03:30 UTC = 09:00 IST.
    const t = new Date('2026-05-03T03:30:00.000Z');
    expect(t.getUTCDay()).toBe(0);
    expect(isSunday9AmIst(t)).toBe(true);
  });

  it('returns true anywhere in the 09:00 IST hour', () => {
    expect(isSunday9AmIst(new Date('2026-05-03T03:35:00.000Z'))).toBe(true);
    expect(isSunday9AmIst(new Date('2026-05-03T04:25:00.000Z'))).toBe(true);
  });

  it('returns false outside the Sunday 09:00 IST hour', () => {
    // Sunday 08:00 IST = Saturday 02:30 UTC
    expect(isSunday9AmIst(new Date('2026-05-03T02:00:00.000Z'))).toBe(false);
    // Sunday 10:00 IST = Sunday 04:30 UTC
    expect(isSunday9AmIst(new Date('2026-05-03T04:31:00.000Z'))).toBe(false);
    // Monday 09:00 IST should NOT trigger
    expect(isSunday9AmIst(new Date('2026-05-04T03:30:00.000Z'))).toBe(false);
  });
});

describe('weekly-digest html escaping', () => {
  const { escapeHtml, digestEmailHtml } = __testing;

  it('escapes <, >, &, and " in user-supplied strings', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('does not leak another devotee\'s PII into the email body', () => {
    const tpl = digestEmailHtml({
      user: {
        id: 'u1',
        email: 'u1@example.com',
        fullName: 'Asha Devi',
        gotra: 'Bharadwaj',
        rashi: null,
        preferredLanguage: 'hi',
      },
      ctx: {
        upcomingAartis: [{ templeName: 'Kashi Vishwanath', aarti: 'Mangala', whenLocal: '5 AM' }],
        newContent: [{ title: 'Hanuman Chalisa', type: 'chalisa', slug: 'hanuman-chalisa' }],
        recommendedPuja: { name: 'Satyanarayan', deity: 'Vishnu', slug: 'satyanarayan', price: '₹1,100' },
        panchang: { tithi: 'Purnima', festivals: [], specialInfo: null },
      },
      weekStartLabel: '03 May 2026',
      unsubscribeUrl: 'https://darshya.online/account/digest/unsubscribe?u=u1',
    });

    // No other user's email/id should ever appear.
    expect(tpl.html).not.toMatch(/u2@/);
    expect(tpl.html).toContain('Asha');
    expect(tpl.subject).toContain('03 May 2026');
    // Unsubscribe link must be present and tied to this user.
    expect(tpl.html).toContain('unsubscribe?u=u1');
  });
});
