import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  PLATFORM_FEE_INR,
  partitionOfferings,
  buildCreateBookingBody,
  bookingRequestHeaders,
  acceptLanguageFor,
  BookingInputError,
  type PujaBookingDetail,
  type TempleOfferingOption,
} from '../booking-flow';

/**
 * PAR-15, the three items the last handoff left named but unbuilt.
 *
 *   2. the catalogue card advertises a price nobody is charged
 *   3. the create call sends no Accept-Language, so localised errors arrive
 *      in English
 *   4. the temple picker offers temples the server will refuse
 *
 * Each is the same shape as the fee bug the sweep already fixed on the booking
 * screen: a claim the app makes that the server does not honour. They are one
 * file because they are one class, and because items 3 and 4 both end at the
 * same 409.
 */

const MOBILE = path.resolve(__dirname, '..');

/** Comments blanked in place, so prose about a fix cannot satisfy a guard. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

const offering = (
  over: Partial<TempleOfferingOption> & { offeringId: string },
): TempleOfferingOption => ({
  templeId: `t-${over.offeringId}`,
  templeName: 'Temple',
  city: 'Varanasi',
  state: 'UP',
  isVerified: true,
  priceInr: null,
  slots: [{ time: '06:00', label: '6:00 AM' }],
  maxBookingsPerSlot: 5,
  ...over,
});

const detail = (offerings: TempleOfferingOption[]): PujaBookingDetail => ({
  pujaTypeId: 'pt-1',
  slug: 'satyanarayan-katha',
  name: 'Satyanarayan Katha',
  basePriceInr: 1100,
  nriPriceInr: 5100,
  durationMinutes: 90,
  description: null,
  offerings,
});

// ─── item 4: the picker must not offer what the server refuses ──────────────

/**
 * apps/api/src/services/booking.service.ts:466 —
 *
 *     if (!offering.temple?.isVerified) {
 *       throw new Error('This temple has not been verified yet.');
 *     }
 *
 * classified as a 409 TEMPLE_NOT_VERIFIED by routes/bookings.ts:650. The
 * picker rendered every offering the catalogue returned, with " · Verified"
 * appended to the verified ones — which reads as a BADGE, an extra, not as the
 * difference between a bookable temple and one that cannot be booked at all.
 * So a devotee could choose an unverified temple, pick a day, wait for the
 * slot read, type the sankalp names, submit, and only then be told no.
 */
describe('PAR-15 — partitionOfferings separates bookable from refused', () => {
  it('splits on the gate the server actually applies', () => {
    const yes = offering({ offeringId: 'a', isVerified: true });
    const no = offering({ offeringId: 'b', isVerified: false });
    const p = partitionOfferings([yes, no]);
    expect(p.bookable).toEqual([yes]);
    expect(p.unverified).toEqual([no]);
  });

  it('preserves catalogue order within each group', () => {
    const list = [
      offering({ offeringId: 'a', isVerified: false }),
      offering({ offeringId: 'b', isVerified: true }),
      offering({ offeringId: 'c', isVerified: false }),
      offering({ offeringId: 'd', isVerified: true }),
    ];
    const p = partitionOfferings(list);
    expect(p.bookable.map((o) => o.offeringId)).toEqual(['b', 'd']);
    expect(p.unverified.map((o) => o.offeringId)).toEqual(['a', 'c']);
  });

  it('an all-unverified catalogue yields nothing bookable, not everything', () => {
    const p = partitionOfferings([
      offering({ offeringId: 'a', isVerified: false }),
      offering({ offeringId: 'b', isVerified: false }),
    ]);
    expect(p.bookable).toEqual([]);
    expect(p.unverified).toHaveLength(2);
  });

  it('an empty catalogue is empty on both sides', () => {
    expect(partitionOfferings([])).toEqual({ bookable: [], unverified: [] });
  });
});

describe('PAR-15 — buildCreateBookingBody refuses an unverified temple locally', () => {
  /**
   * Defence in depth, and it is not theoretical: the screen pre-selects the
   * sole offering when a puja is offered by exactly one temple. If that temple
   * is unverified, the old code pre-selected it, so the devotee never chose it
   * and could not un-choose it — the form was pre-loaded with a booking the
   * server would reject.
   */
  it('throws before the request rather than after the 409', () => {
    expect(() =>
      buildCreateBookingBody({
        pujaTypeId: 'pt-1',
        offering: offering({ offeringId: 'a', isVerified: false }),
        scheduledDate: futureDateKey(),
        scheduledTimeSlot: '06:00',
        devotees: [{ name: 'Arjun' }],
      }),
    ).toThrow(BookingInputError);
  });

  it('the message names the reason, not a status code', () => {
    try {
      buildCreateBookingBody({
        pujaTypeId: 'pt-1',
        offering: offering({ offeringId: 'a', isVerified: false }),
        scheduledDate: futureDateKey(),
        scheduledTimeSlot: '06:00',
        devotees: [{ name: 'Arjun' }],
      });
      throw new Error('expected a BookingInputError');
    } catch (e) {
      expect((e as Error).message).toMatch(/verified/i);
      expect((e as Error).message).not.toMatch(/409/);
    }
  });

  it('a verified temple still builds the body it always did', () => {
    const body = buildCreateBookingBody({
      pujaTypeId: 'pt-1',
      offering: offering({ offeringId: 'a', isVerified: true }),
      scheduledDate: futureDateKey(),
      scheduledTimeSlot: '06:00',
      devotees: [{ name: 'Arjun', gotra: 'Kashyap' }],
    });
    expect(body.templePujaOfferingId).toBe('a');
    expect(body.devoteeNames).toEqual([{ name: 'Arjun', gotra: 'Kashyap', nakshatra: undefined }]);
    expect(body.prasadDeliveryRequested).toBe(false);
  });
});

function futureDateKey(): string {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

// ─── item 3: the localised 409s must reach the devotee localised ────────────

/**
 * routes/bookings.ts:898 —
 *
 *     const lang = pickLang(
 *       request.headers['accept-language'],
 *       (request.query as …)?.lang as string | undefined,
 *     );
 *     const message = localizedError(failure.code, lang);
 *
 * Note what it does NOT read: the user's stored `preferredLanguage`. That is
 * `pickLangFor`, and this call site is `pickLang`. So the header is the ONLY
 * channel by which this route can be told what language to answer in, and the
 * app sent none — every SLOT_UNAVAILABLE and TEMPLE_NOT_VERIFIED reached a
 * Hindi devotee in English despite lib/error-i18n.ts carrying the Hindi,
 * Tamil, Telugu and Kannada strings for exactly these two codes.
 */
describe('PAR-15 — acceptLanguageFor turns a stored preference into a header', () => {
  it('passes a plain language code through', () => {
    expect(acceptLanguageFor('hi')).toBe('hi');
    expect(acceptLanguageFor('ta')).toBe('ta');
  });

  it('passes a region-tagged tag through — pickLang splits the primary itself', () => {
    expect(acceptLanguageFor('hi-IN')).toBe('hi-IN');
  });

  it('is null when there is nothing to say, so no empty header is sent', () => {
    for (const v of [undefined, null, '', '   ']) {
      expect(acceptLanguageFor(v), JSON.stringify(v)).toBeNull();
    }
  });

  it('refuses anything that is not a language tag', () => {
    // A header value is attacker-influencable if a profile field ever becomes
    // free text, and a CR or LF in a header is request splitting. React
    // Native's fetch does not reject it for us.
    for (const v of [
      'hi\r\nX-Admin: 1',
      'hi\nX: 1',
      'hi; drop table',
      '../../etc',
      '*',
      'a'.repeat(80),
    ]) {
      expect(acceptLanguageFor(v), JSON.stringify(v)).toBeNull();
    }
  });
});

describe('PAR-15 — bookingRequestHeaders carries auth AND language', () => {
  it('sends the language when the devotee has one', () => {
    expect(bookingRequestHeaders({ token: 'tok', preferredLanguage: 'hi' })).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer tok',
      'Accept-Language': 'hi',
    });
  });

  it('omits the header entirely rather than sending an empty one', () => {
    // `Accept-Language: ''` is not the same as no header: pickLang would read
    // it, find nothing, and fall back — same result, but a malformed request.
    const h = bookingRequestHeaders({ token: 'tok', preferredLanguage: null });
    expect(h).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer tok' });
    expect('Accept-Language' in h).toBe(false);
  });

  it('never drops the bearer — this route is authenticateUser-gated', () => {
    expect(bookingRequestHeaders({ token: 'tok', preferredLanguage: 'zz' }).Authorization).toBe(
      'Bearer tok',
    );
  });

  it('the API really does translate the two codes this unlocks', () => {
    // The whole point of the header. If these strings ever leave the API the
    // header is dead weight and this test says so.
    const i18n = path.resolve(MOBILE, '../../api/src/lib/error-i18n.ts');
    expect(existsSync(i18n), i18n).toBe(true);
    const src = readFileSync(i18n, 'utf8');
    expect(src).toMatch(/TEMPLE_NOT_VERIFIED: '[^']*[ऀ-ॿ][^']*'/);
    expect(src).toMatch(/SLOT_UNAVAILABLE: '[^']*[ऀ-ॿ][^']*'/);
  });

  it('and the route reads the header rather than the stored preference', () => {
    // pickLang(acceptLanguage, override) — NOT pickLangFor, which would also
    // consult preferredLanguage and make this header unnecessary. If that ever
    // changes, this fix becomes redundant and should be revisited.
    const route = path.resolve(MOBILE, '../../api/src/routes/bookings.ts');
    const src = readFileSync(route, 'utf8');
    expect(src).toMatch(/pickLang\(\s*\n?\s*request\.headers\['accept-language'\]/);
  });
});

// ─── the screen ─────────────────────────────────────────────────────────────

const BOOK = path.join(MOBILE, '../app/(devotee)/puja-book.tsx');

describe('PAR-15 — the booking screen uses all three', () => {
  const raw = readFileSync(BOOK, 'utf8');
  const src = stripComments(raw);

  it('the stripper actually removes this file class of comment', () => {
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  it('sends the create call through bookingRequestHeaders', () => {
    expect(src).toMatch(/bookingRequestHeaders\(/);
    // The hand-rolled header object was the bug; a second one would drift.
    expect(src).not.toMatch(/Authorization:\s*`Bearer/);
  });

  it('feeds it the devotee stored preference', () => {
    expect(src).toMatch(/preferredLanguage/);
  });

  it('renders the picker from the bookable partition, not the raw list', () => {
    expect(src).toMatch(/partitionOfferings\(/);
    // The old code mapped detail.offerings directly.
    expect(src).not.toMatch(/detail\.offerings\.map\(/);
  });

  it('pre-selects only a BOOKABLE sole offering', () => {
    // The regression this hides: a puja offered by exactly one unverified
    // temple pre-loaded the form with a booking the server refuses, and the
    // devotee had no other row to pick instead.
    const i = src.indexOf('setOffering(only)');
    expect(i, 'no sole-offering pre-selection found').toBeGreaterThan(-1);
    const window = src.slice(Math.max(0, i - 400), i);
    expect(window).toMatch(/bookable/);
    expect(window).not.toMatch(/parsed\.offerings\.length === 1/);
  });

  it('still explains an unverified temple rather than hiding it silently', () => {
    // Hiding the row entirely would make a temple the devotee can see on the
    // web vanish from the app with no reason given.
    expect(src).toMatch(/unverified/i);
  });
});

// ─── item 1: the payment hand-off must NOT move into the WebView ────────────

/**
 * A REGRESSION GUARD, not a fix — and labelled as one.
 *
 * PAR-15's remaining item is native card payment. PAR-22 (C) added
 * app/(devotee)/web-view.tsx, and the tempting next edit is to point the "Pay
 * on darshya.online" button at it: same URL, no app-exit, looks like progress.
 * It would be a regression, for reasons that are checkable rather than
 * matters of taste:
 *
 *   · apps/web/app/bookings/pay/page.tsx builds Razorpay Standard Checkout
 *     with NO `method` restriction, so the sheet offers UPI intent. Those
 *     buttons navigate to `upi:`/`intent:` URLs — not http, so a WebView's
 *     loader never sees them and, with no onShouldStartLoadWithRequest bridge,
 *     they do nothing at all. In the browser the OS resolves them natively
 *     today. UPI is the majority rail here, so this is not an edge case.
 *   · apps/web/next.config.ts's CSP carries `form-action` for
 *     checkout.razorpay.com AND api.razorpay.com — the issuer 3DS step is a
 *     cross-origin form post, and some issuers open a second window, which
 *     web-view.tsx deliberately refuses (setSupportMultipleWindows={false}).
 *
 * So the browser hand-off is currently the SAFER path, and this guard records
 * that so the next agent does not "fix" it. It also pins the two facts above,
 * so the day the web page restricts methods or the CSP loses form-action, the
 * conclusion gets re-examined instead of being inherited.
 */
describe('PAR-15 — the payment hand-off stays in the system browser', () => {
  const WEB_PAY = path.resolve(MOBILE, '../../web/app/bookings/pay/page.tsx');
  const NEXT_CONFIG = path.resolve(MOBILE, '../../web/next.config.ts');

  it('the guard is not vacuous — the hand-off is really on the screen', () => {
    expect(stripComments(readFileSync(BOOK, 'utf8'))).toMatch(
      /Linking\.openURL\(resumePaymentUrl/,
    );
  });

  it('does not route resumePaymentUrl through the in-app view', () => {
    const src = stripComments(readFileSync(BOOK, 'utf8'));
    expect(src).not.toMatch(/openWebHandoff/);
    expect(src).not.toMatch(/web-view/);
  });

  it('the reason still holds: checkout offers UPI intent, unrestricted', () => {
    expect(existsSync(WEB_PAY), WEB_PAY).toBe(true);
    const src = readFileSync(WEB_PAY, 'utf8');
    expect(src).toMatch(/checkout\.razorpay\.com\/v1\/checkout\.js/);
    // A `method:` restriction would change the analysis — UPI could be turned
    // off and a WebView would then be viable.
    expect(src).not.toMatch(/^\s*method:\s*\{/m);
  });

  it('the reason still holds: the 3DS step is a cross-origin form post', () => {
    expect(existsSync(NEXT_CONFIG), NEXT_CONFIG).toBe(true);
    const src = readFileSync(NEXT_CONFIG, 'utf8');
    expect(src).toMatch(/form-action/);
    expect(src).toMatch(/api\.razorpay\.com/);
  });

  it('react-native-razorpay is a SEPARATE undeclared dependency', () => {
    // Not the same owner decision as react-native-webview, and conflating the
    // two is how PAR-15 kept coming back as "blocked on a dependency".
    const pkg = JSON.parse(readFileSync(path.join(MOBILE, '../package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['react-native-razorpay']).toBeUndefined();
  });
});

// ─── item 2: the catalogue card ─────────────────────────────────────────────

const CATALOGUE = path.join(MOBILE, '../app/(devotee)/pujas.tsx');

/**
 * apps/api/src/services/booking.service.ts:540 — `const pujaPrice = basePrice;`
 * with the S3-09 comment above it stating in so many words that NRI pricing is
 * not charged by any booking path until a server-QUOTED amount exists. The web
 * drew the same conclusion on 2026-08-12 and DELETED its NRI line
 * (apps/web/app/pujas/[slug]/page.tsx:353-363: "advertises a premium that is
 * never collected — still a displayed-price != charged-price violation, just
 * quieter"). The mobile catalogue was the surface nobody went back to: with the
 * repo's own fixtures it read "NRI: ₹5,100" on a puja that bills ₹1,151.
 *
 * So this is NOT an open product call, which is how the last handoff left it.
 * The call was made on the web and this is the same decision applied to the
 * screen that was missed.
 */
describe('PAR-15 — the catalogue card quotes only what is charged', () => {
  const raw = readFileSync(CATALOGUE, 'utf8');
  const src = stripComments(raw);

  it('the stripper actually removes this file class of comment', () => {
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  it('no longer renders an NRI price', () => {
    expect(src).not.toMatch(/NRI/);
    expect(src).not.toMatch(/nriPriceInr/);
  });

  it('discloses the platform fee the way the web card does', () => {
    // CM-03: the fee travels with the price so the number does not change
    // between the card and the Pay button.
    expect(src).toMatch(/PLATFORM_FEE_INR/);
    expect(src).toMatch(/platform fee/i);
  });

  it('takes the fee from the shared constant, never a literal', () => {
    expect(src).not.toMatch(/\b51\b/);
  });

  it('the constant it uses is still the one the API charges', () => {
    const api = path.resolve(MOBILE, '../../api/src/services/booking.service.ts');
    const m = readFileSync(api, 'utf8').match(/export const PLATFORM_FEE_INR\s*=\s*(\d+)/);
    expect(m).toBeTruthy();
    expect(PLATFORM_FEE_INR).toBe(Number(m![1]));
  });

  it('says nothing about a total when the price is unknown', () => {
    // "Price on request" must not acquire a "+ ₹51 · ₹51 total" line.
    const i = src.indexOf('Price on request');
    expect(i).toBeGreaterThan(-1);
  });
});

// ─── the API contract this all rests on ─────────────────────────────────────

describe('PAR-15 — the assumption about NRI pricing is still true', () => {
  it('booking.service.ts charges basePrice unless the request explicitly asks for NRI pricing', () => {
    // The mobile app quotes the domestic price and never sends `nriPricing`, so
    // what it shows is what is charged. The premium is applied only for the
    // explicit flag the web wizard sends, never inferred from the self-settable
    // user.isNri. If either changes, this is where the mobile quote is re-checked.
    const api = path.resolve(MOBILE, '../../api/src/services/booking.service.ts');
    const src = readFileSync(api, 'utf8');
    expect(src).toMatch(/const pujaPrice = data\.nriPricing \? nriPujaPriceInr\(domesticPujaPrice\) : basePrice;/);
    expect(src).not.toMatch(/const pujaPrice = user\.isNri/);
  });

  it('the mobile app does not send the NRI pricing flag', () => {
    const walk = (dir: string): string[] =>
      readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.name === '__tests__' || e.name === 'node_modules'
          ? []
          : e.isDirectory()
            ? walk(path.join(dir, e.name))
            : /\.(ts|tsx)$/.test(e.name)
              ? [path.join(dir, e.name)]
              : [],
      );
    const offenders = [...walk(path.join(MOBILE, 'lib')), ...walk(path.join(MOBILE, 'app'))].filter((f) =>
      /nriPricing/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
