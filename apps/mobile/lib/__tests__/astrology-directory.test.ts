import { describe, it, expect } from 'vitest';
import {
  selectAstrologer,
  selectAstrologers,
  selectAstrologerDetail,
  specializationsOf,
  onlineCountOf,
  astrologerInitials,
  formatRate,
  ratePerMinuteLabel,
  consultationBookingUrl,
  rashiById,
  selectRashiHoroscope,
  hasReading,
  RASHI_SIGNS,
  MINUTE_PRESETS,
  MIN_CONSULTATION_INR,
} from '../astrology-directory';

/**
 * The astrology vertical's payload readers.
 *
 * apps/mobile's vitest runner is node-only with no react-native transform, so
 * these functions live outside the screens precisely so they can be checked.
 * What is being defended here is not formatting — it is the AW-02 rule that a
 * field the API does not send must not appear on the screen with a
 * plausible-looking value, because this vertical is the one that shipped
 * fifteen invented astrologers with invented ratings and rates.
 */

const REAL_ROW = {
  id: '9f4a0e11-2b3c-4d5e-8f90-1a2b3c4d5e6f',
  userId: 'u1',
  name: 'Pt. Raghunath Sharma',
  specializations: ['Vedic Astrology', 'KP Astrology'],
  languages: ['Hindi', 'English'],
  experienceYears: 12,
  rating: 4.6,
  consultationCount: 240,
  perMinuteRate: 25,
  isOnline: true,
  mode: { chat: true, call: false },
  bio: 'Third-generation jyotishi.',
  verified: true,
};

describe('selectAstrologer — nothing is substituted for a missing field', () => {
  it('reads a complete row through unchanged', () => {
    expect(selectAstrologer(REAL_ROW)).toEqual({
      id: REAL_ROW.id,
      name: 'Pt. Raghunath Sharma',
      specializations: ['Vedic Astrology', 'KP Astrology'],
      languages: ['Hindi', 'English'],
      experienceYears: 12,
      rating: 4.6,
      consultationCount: 240,
      perMinuteRate: 25,
      isOnline: true,
      chat: true,
      call: false,
      bio: 'Third-generation jyotishi.',
      verified: true,
    });
  });

  it('drops a row with no id or no name rather than labelling it "Astrologer"', () => {
    expect(selectAstrologer({ ...REAL_ROW, id: undefined })).toBeNull();
    expect(selectAstrologer({ ...REAL_ROW, name: '   ' })).toBeNull();
    expect(selectAstrologer(null)).toBeNull();
    expect(selectAstrologer('astro_001')).toBeNull();
  });

  it('reports an unrated astrologer as unrated, never as a plausible 4.x', () => {
    expect(selectAstrologer({ ...REAL_ROW, rating: 0 })?.rating).toBeNull();
    expect(selectAstrologer({ ...REAL_ROW, rating: undefined })?.rating).toBeNull();
    expect(selectAstrologer({ ...REAL_ROW, rating: 'nonsense' })?.rating).toBeNull();
  });

  it('reports an unpublished rate as absent, never as free and never as the DB default', () => {
    // `pricePerMinute` is Decimal(10,2) with a schema default of 10. A zero or
    // unreadable value means "not published", and a screen that printed ₹0 or
    // silently borrowed the default would be quoting a price nobody agreed to.
    expect(selectAstrologer({ ...REAL_ROW, perMinuteRate: 0 })?.perMinuteRate).toBeNull();
    expect(selectAstrologer({ ...REAL_ROW, perMinuteRate: null })?.perMinuteRate).toBeNull();
  });

  it('treats absent experience as absent, not as zero years', () => {
    expect(selectAstrologer({ ...REAL_ROW, experienceYears: 0 })?.experienceYears).toBeNull();
  });

  it('reads a Decimal-over-JSON rate that arrived as a string', () => {
    expect(selectAstrologer({ ...REAL_ROW, perMinuteRate: '12.50' })?.perMinuteRate).toBe(12.5);
  });

  it('defaults presence and verification to false rather than to true', () => {
    const bare = selectAstrologer({ id: REAL_ROW.id, name: 'A' });
    expect(bare).not.toBeNull();
    expect(bare!.isOnline).toBe(false);
    expect(bare!.verified).toBe(false);
    expect(bare!.chat).toBe(false);
    expect(bare!.call).toBe(false);
    expect(bare!.consultationCount).toBe(0);
    expect(bare!.specializations).toEqual([]);
  });
});

describe('selectAstrologers — an unreadable body is not an empty directory', () => {
  it('returns the rows for a well-formed payload', () => {
    const out = selectAstrologers({ astrologers: [REAL_ROW], total: 1, source: 'live' });
    expect(out).toHaveLength(1);
    expect(out![0]!.name).toBe('Pt. Raghunath Sharma');
  });

  it('returns null — not [] — when the payload carries no astrologers array', () => {
    // The distinction is the whole point: "[]" renders "no astrologers are
    // listed", which is a claim about supply. A body nobody can parse supports
    // no such claim.
    expect(selectAstrologers({ error: 'boom' })).toBeNull();
    expect(selectAstrologers(null)).toBeNull();
    expect(selectAstrologers('[]')).toBeNull();
    expect(selectAstrologers({ astrologers: [] })).toEqual([]);
  });

  it('skips unusable rows without discarding the usable ones', () => {
    const out = selectAstrologers({ astrologers: [REAL_ROW, { name: 'no id' }, null] });
    expect(out).toHaveLength(1);
  });
});

describe('selectAstrologerDetail', () => {
  it('unwraps { astrologer }', () => {
    expect(selectAstrologerDetail({ astrologer: REAL_ROW })?.id).toBe(REAL_ROW.id);
  });

  it('yields null for the 404 body, so the screen shows not-found', () => {
    expect(selectAstrologerDetail({ error: 'Astrologer not found.' })).toBeNull();
  });
});

describe('facets are derived from the rows that arrived', () => {
  const rows = selectAstrologers({
    astrologers: [
      REAL_ROW,
      { ...REAL_ROW, id: 'b1', name: 'B', specializations: ['Tarot Reading'], isOnline: false },
    ],
  })!;

  it('lists every specialization present, sorted, with no invented taxonomy', () => {
    expect(specializationsOf(rows)).toEqual(['KP Astrology', 'Tarot Reading', 'Vedic Astrology']);
  });

  it('counts only the astrologers actually online', () => {
    expect(onlineCountOf(rows)).toBe(1);
  });
});

describe('astrologerInitials', () => {
  it('strips honorifics so a title is not mistaken for a name', () => {
    expect(astrologerInitials('Pt. Raghunath Sharma')).toBe('RS');
    expect(astrologerInitials('Acharya Vinay Joshi')).toBe('VJ');
  });

  it('handles a single name and never returns an empty tile', () => {
    expect(astrologerInitials('Ravi')).toBe('R');
    expect(astrologerInitials('   ')).toBe('A');
  });
});

describe('money is read, never rounded away', () => {
  it('groups whole rupees the Indian way', () => {
    expect(formatRate(25)).toBe('₹25');
    expect(formatRate(1500)).toBe('₹1,500');
  });

  it('keeps the paise on a Decimal(10,2) rate instead of rounding it', () => {
    // PM-10: an astrologer on ₹12.50/min advertised at ₹13/min loses money on
    // every minute of every consultation.
    expect(formatRate(12.5)).toBe('₹12.50');
    expect(ratePerMinuteLabel(12.5)).toBe('₹12.50 / min');
  });

  it('says nothing at all when there is no rate to state', () => {
    expect(ratePerMinuteLabel(null)).toBeNull();
  });

  it('mirrors the API floor rather than inventing one', () => {
    expect(MIN_CONSULTATION_INR).toBe(50);
  });
});

describe('consultationBookingUrl — the hand-off to the page that owns checkout', () => {
  const ORIGIN = 'https://staging.example.test';
  const url = consultationBookingUrl('abc-123', ORIGIN);

  it('goes to THIS build origin, never a hardcoded production host', () => {
    expect(url.startsWith(`${ORIGIN}/auth/login?redirect=`)).toBe(true);
    expect(url).not.toContain('darshya.online');
  });

  it('tolerates a trailing slash on the origin', () => {
    expect(consultationBookingUrl('abc-123', `${ORIGIN}/`)).toBe(url);
  });

  it('addresses the login page carrying the booking path, which AuthGuard drops', () => {
    const redirect = decodeURIComponent(url.split('redirect=')[1]!);
    expect(redirect.startsWith('/astrology/abc-123/book?')).toBe(true);
    expect(redirect).toContain('utm_source=mobile-app');
  });

  it('sends no minutes, because the page it opens does not read one', () => {
    // apps/web/app/astrology/[id]/book/page.tsx reads only params.id and
    // initialises `minutes` itself. A duration in the query string would be
    // silently dropped, so the app must not offer a picker that implies it
    // carries over.
    expect(url).not.toContain('minutes=');
  });

  it('escapes an id rather than splicing it into the path raw', () => {
    // Encoded twice on purpose, and that is the correct shape: the id is
    // escaped into the booking path, and the whole path is then escaped into
    // the login page's `redirect` parameter. One decode gets back a path whose
    // id is still escaped, which is what the browser will navigate to.
    const redirect = decodeURIComponent(
      consultationBookingUrl('a/b?c', ORIGIN).split('redirect=')[1]!,
    );
    expect(redirect).toBe(
      '/astrology/a%2Fb%3Fc/book?utm_source=mobile-app&utm_medium=astrologer-booking',
    );
  });

  it('offers exactly the durations the web page offers', () => {
    expect([...MINUTE_PRESETS]).toEqual([5, 10, 15, 20, 30, 45, 60]);
  });
});

describe('rashi routing keys', () => {
  it('carries all twelve, and each id is what the API matches on', () => {
    expect(RASHI_SIGNS).toHaveLength(12);
    expect(RASHI_SIGNS.map((r) => r.id)).toContain('aries');
    expect(RASHI_SIGNS.map((r) => r.id)).toContain('pisces');
  });

  it('resolves by id or English name, case-insensitively', () => {
    expect(rashiById('LEO')?.hindi).toBe('Simha');
    expect(rashiById(' scorpio ')?.english).toBe('Scorpio');
  });

  it('returns null for anything else rather than guessing a sign', () => {
    expect(rashiById('mesh-rashi')).toBeNull();
    expect(rashiById(undefined)).toBeNull();
  });
});

describe('selectRashiHoroscope — the shape the screen actually renders', () => {
  const FULL = {
    horoscope: {
      rashi: 'aries',
      rashiHindi: 'मेष',
      rashiEnglish: 'Aries',
      symbol: '♈',
      date: '2026-09-02',
      prediction: 'A day of new beginnings.',
      career: 'Excellent day.',
      love: 'Plan an evening.',
      health: 'Good energy.',
      luckyNumber: 9,
      luckyColor: 'Red',
      luckyDirection: 'East',
      mantra: 'Om Kraam Kreem',
      mantraHindi: 'ओम क्रां क्रीं',
      rulingPlanet: 'Mars (Mangal)',
      element: 'Fire (Agni)',
      overallRating: 4,
    },
  };

  it('reads every field the route sends', () => {
    const h = selectRashiHoroscope(FULL)!;
    expect(h.prediction).toBe('A day of new beginnings.');
    expect(h.luckyNumber).toBe(9);
    expect(h.mantraHindi).toBe('ओम क्रां क्रीं');
    expect(h.overallRating).toBe(4);
    expect(hasReading(h)).toBe(true);
  });

  it('rejects the /horoscope/daily payload rather than rendering an empty card', () => {
    // The bug this reader exists to make impossible: horoscope.tsx called
    // GET /horoscope/daily (which carries `reading`) and printed
    // `prediction ?? general`, so a healthy 200 drew a heading with nothing
    // under it and looked exactly like a genuine miss.
    const daily = {
      horoscope: {
        sign: 'aries',
        signHindi: 'मेष',
        date: '2026-09-02',
        scope: 'today',
        lang: 'en',
        reading: 'Today brings movement.',
        rulingPlanet: 'Mars',
        element: 'Fire',
        source: 'cache',
      },
    };
    const h = selectRashiHoroscope(daily)!;
    expect(h.prediction).toBeNull();
    expect(hasReading(h)).toBe(false);
  });

  it('drops a rating outside 1-5 instead of rendering an impossible star row', () => {
    expect(selectRashiHoroscope({ horoscope: { overallRating: 0 } })?.overallRating).toBeNull();
    expect(selectRashiHoroscope({ horoscope: { overallRating: 9 } })?.overallRating).toBeNull();
  });

  it('yields null for a 404 body', () => {
    expect(selectRashiHoroscope({ error: 'Rashi not found.' })).toBeNull();
    expect(hasReading(null)).toBe(false);
  });
});
