/**
 * TC-02 (P0, trust) — /become-astrologer states only what the product can honour.
 *
 * PJ-02 stripped three unbackable promises from /become-priest and left the
 * identical claim class standing one file away. At HEAD, app/become-astrologer
 * /page.tsx shipped:
 *
 *   "Daily payouts at scale — Once you cross Rs 5,000 lifetime, payouts move
 *    from weekly to daily. Earn while you sleep."
 *   "get paid daily"                                        (page subtitle)
 *   "Aadhaar + qualification verified badge."               (benefit card)
 *
 * Read off the server, none of that exists:
 *
 *  1. There is no daily payout, and no lifetime-earnings tier that changes a
 *     payout cadence. apps/api/src/services/payout.service.ts is the ONLY
 *     payout engine: a provider raises a PayoutRequest, an admin processes it,
 *     and admin-bookings.ts records "The actual bank transfer stays owner-gated
 *     on RazorpayX/Cashfree." Neither rail is enabled. The one cadence in the
 *     file is WEEKLY_SETTLE_MIN_INR, a floor on a weekly BATCH — the opposite
 *     of a faster tier. A grep for a 5000-rupee lifetime threshold returns
 *     nothing.
 *  2. AstrologerProfile (apps/api/prisma/schema.prisma) has no aadhaarVerified
 *     column and no verified/isVerified column at all — only `approved`. The
 *     Aadhaar flag exists on Priest and PanditProfile. An astrologer cannot be
 *     Aadhaar-verified because there is nowhere to record it, so there is no
 *     badge to earn and no 2-3x price premium attached to one.
 *
 * These assertions scan the page source with comments stripped, so the comment
 * documenting a removed claim cannot satisfy or trip its own guard.
 */

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');

/** Strip block, JSX and line comments — only rendered copy counts. */
function code(rel: string): string {
  return fs
    .readFileSync(path.join(WEB, rel), 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

const ASTRO = 'app/become-astrologer/page.tsx';

describe('TC-02 — /become-astrologer promises no payout cadence the rail cannot hold', () => {
  it('does not promise daily payouts', () => {
    const src = code(ASTRO);
    expect(src).not.toMatch(/daily payouts?/i);
    expect(src).not.toMatch(/\bpaid daily\b/i);
    expect(src).not.toMatch(/payouts? (move|switch|upgrade)/i);
  });

  it('does not invent a lifetime-earnings tier that speeds up settlement', () => {
    // No constant, column or branch anywhere keys a payout cadence off
    // cumulative provider earnings.
    expect(code(ASTRO)).not.toMatch(/lifetime/i);
  });

  it('does not promise automatic weekly bank credit either', () => {
    const src = code(ASTRO);
    expect(src).not.toMatch(/every Monday/i);
    expect(src).not.toMatch(/(earn|get paid|paid)\s+weekly/i);
  });

  it('describes payout the way /become-priest does — requested, then transferred by hand', () => {
    expect(code(ASTRO)).toMatch(/request a payout/i);
  });
});

describe('TC-02 — /become-astrologer claims no Aadhaar badge the schema cannot store', () => {
  it('does not offer an Aadhaar-verified astrologer badge', () => {
    // AstrologerProfile has no aadhaar_verified column — see the API assertion
    // below, which fails if one is ever added and this copy should be revisited.
    expect(code(ASTRO)).not.toMatch(/aadhaar/i);
  });

  it('does not claim verified astrologers are paid a 2-3x premium', () => {
    expect(code(ASTRO)).not.toMatch(/2-3\s*[x×]/i);
    expect(code(ASTRO)).not.toMatch(/pay\s+\d\s*[-–]\s*\d\s*[x×]/i);
  });

  it('AstrologerProfile really has no Aadhaar or verified column', () => {
    const schema = fs.readFileSync(
      path.resolve(WEB, '../api/prisma/schema.prisma'),
      'utf8',
    );
    const model = schema.slice(schema.indexOf('model AstrologerProfile'));
    const body = model.slice(0, model.indexOf('\n}'));
    expect(body).not.toMatch(/aadhaar/i);
    expect(body).not.toMatch(/^\s*(is)?[Vv]erified\s/m);
    // The flag the astrologer directory actually reads.
    expect(body).toMatch(/^\s*approved\s+Boolean/m);
  });
});
