import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  astrologerRateRows,
  RATE_MODE_NOTE,
  RATE_UNAVAILABLE,
} from '../astrologer-rate-card';

/**
 * PM-10 (F062) — the astrologer's own rate card must be the rate the platform
 * charges.
 *
 * The finding is filed as a PRICING question ("senior astrologers are priced
 * 2-4x below the market ceiling"), and the price LEVEL is the owner's call:
 * nothing in the code caps it. `routes/astrologer-portal.ts` accepts ₹1 to
 * ₹100,000/min, `routes/onboarding.ts` ₹1 to ₹10,000/min, and the only literals
 * in the tree are seeded defaults. An astrologer may charge four times more
 * today.
 *
 * What IS a defect, and what this file pins, is the band the product published
 * to its own supply and then did not honour. `apps/mobile/app/(astrologer)/
 * profile.tsx` showed every astrologer three per-minute prices —
 * chat = round(rate × 0.8), voice = rate, video = round(rate × 1.6) — plus a
 * hardcoded ₹40 / ₹60 / ₹100 table for anyone the screen could not match to a
 * directory row.
 *
 * MEASURED, against production on 2026-09-01:
 *   GET https://api.darshya.online/api/v1/astrology/astrologers/live -> 200,
 *   3 astrologers, perMinuteRate 25 / 20 / 18, `source: "live"`.
 * So the ₹40/₹60/₹100 fallback matched no astrologer on the platform, and the
 * multipliers described a mode dimension that does not exist: the booking
 * schema in apps/api/src/routes/consultation.ts is
 * `{ astrologerId, minutes, scheduledAt? }` with no mode, and the charge is
 * `Math.round(perMinuteRate * minutes)`.
 *
 * The last two tests read the API source, because that cross-app contract is
 * the whole reason the mobile screen may show only one number.
 */

const API_CONSULTATION = path.resolve(
  __dirname,
  '..',
  '..',
  '..',
  'api',
  'src',
  'routes',
  'consultation.ts',
);

describe('PM-10 — the astrologer rate card states one rate', () => {
  it('renders exactly one row, at the stored rate', () => {
    const rows = astrologerRateRows(25);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe('₹25 / min');
  });

  it('never derives a second or third price from the first', () => {
    // The three numbers the screen used to print for a ₹25/min astrologer.
    const rendered = astrologerRateRows(25)
      .map((r) => r.value)
      .join(' ');
    expect(rendered).not.toContain('20'); // round(25 * 0.8) — the invented "chat" rate
    expect(rendered).not.toContain('40'); // round(25 * 1.6) — the invented "video" rate
  });

  it('says the rate is unavailable rather than inventing the old ₹40/₹60/₹100 table', () => {
    for (const missing of [undefined, null, 0, Number.NaN, '25']) {
      const rows = astrologerRateRows(missing as never);
      expect(rows).toHaveLength(1);
      expect(rows[0]!.value).toBe(RATE_UNAVAILABLE);
      // The fabricated fallback, gone in every direction.
      expect(rows[0]!.value).not.toMatch(/₹\s*(40|60|100)/);
    }
  });

  it('carries the live production rates through unchanged', () => {
    // The three real astrologers, measured 2026-09-01.
    expect(astrologerRateRows(25)[0]!.value).toBe('₹25 / min');
    expect(astrologerRateRows(20)[0]!.value).toBe('₹20 / min');
    expect(astrologerRateRows(18)[0]!.value).toBe('₹18 / min');
  });

  it('states that every mode bills the same', () => {
    expect(RATE_MODE_NOTE).toMatch(/chat, voice and video are billed the same/i);
  });
});

describe('PM-10 — the API contract that makes one rate the only honest answer', () => {
  const src = readFileSync(API_CONSULTATION, 'utf8');

  it('the consultation booking request carries no mode field', () => {
    // The zod schema for POST /consultation/book. If a `mode` is ever added,
    // this fails and the rate card has to grow with it — deliberately, rather
    // than by a multiplier someone guessed.
    const schema = src.slice(
      src.indexOf('const bookSchema'),
      src.indexOf('const bookSchema') + 400,
    );
    expect(schema).toContain('astrologerId');
    expect(schema).toContain('minutes');
    expect(schema).not.toMatch(/\bmode\b/);
    expect(schema).not.toMatch(/\bchannel\b/);
  });

  it('the charge is the flat per-minute rate times the minutes', () => {
    expect(src).toContain('Math.round(perMinuteRate * minutes)');
    // No multiplier applied to the stored rate anywhere on the money path.
    expect(src).not.toMatch(/perMinuteRate\s*\*\s*(0\.8|1\.6)/);
  });
});
