import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';

/**
 * AW-02 (P0), the last unsold half — the funnel still advertised a price it
 * could not charge.
 *
 * Everything about the FIFTEEN INVENTED PEOPLE is closed and is deliberately
 * not re-litigated here (see astrology-directory-real-supply.aw02.test.ts,
 * astrology-fixture-profile-unreachable.aw02.test.ts,
 * astrology-specializations-real-supply.aw02.test.ts,
 * astrology-consult-start-real-astrologer.aw02.test.ts and
 * astrology-start-consultation-no-fixture.aw02.test.ts on the API side, and
 * __tests__/astrology-funnel-real-supply.test.tsx + astrology-profile-no-
 * fixtures.test.tsx on this side). The in-memory fixture is still LOAD-BEARING
 * for the service module and is not touched.
 *
 * What was left is the other invented thing this funnel sells: the OFFER.
 *
 *   app/astrology/AstrologyClient.tsx:298  hero badge  "First 5 Minutes FREE"
 *   app/astrology/AstrologyClient.tsx:805  step 2      "First 5 minutes are
 *                                                       free for new users."
 *   app/astrology/view/AstrologerProfileClient.tsx:351  a badge sitting
 *                                                       DIRECTLY above the
 *                                                       "Book Paid
 *                                                       Consultation" button.
 *
 * There is no free minute anywhere in the call path that takes the money:
 *
 *   /astrology  ->  /astrology/<AstrologerProfile.id>
 *               ->  /astrology/view?id=…            ("Book Paid Consultation")
 *               ->  /astrology/<id>/book            (MINUTE_PRESETS starts at 5)
 *               ->  POST /api/v1/consultation/book  (amountInr =
 *                                                    round(pricePerMinute ×
 *                                                    minutes), min 5, min ₹50)
 *               ->  Razorpay checkout
 *               ->  POST /api/v1/consultation/verify-payment  (captures, mints
 *                                                    the room, writes the
 *                                                    Commission row)
 *
 * `bookSchema` (apps/api/src/routes/consultation.ts) accepts `minutes` from 5,
 * and the amount is the full product of rate × minutes with nothing deducted.
 * So a devotee reads "First 5 min FREE" above the button, picks the 5-minute
 * preset, and is charged for all five — ₹125 at Acharya Vinod Sharma's ₹25/min.
 *
 * The promise is not merely unimplemented, it advertises a capability that was
 * REMOVED on purpose: P0 #AP-01/AP-02 (2026-07-09) deleted free-trial rooms
 * outright, which is why app/consultation/[id]/page.tsx:121 tells a visitor
 * "Free-trial rooms are no longer" resolvable. The only surviving trace is
 * `freeMinutes: 5` on the session object returned by
 * astrologyService.startConsultation — an UNPAID in-memory session on
 * POST /astrology/consult/start, read by no client in any app, and not the path
 * that charges. It is left alone: that path really is free, so it is not lying.
 *
 * The rule this finding already established twice — "never state a number the
 * platform cannot honour" (the fabricated "From Rs. 10/min" floor, and the
 * fabricated "N astrologers online") — is applied to the last number on the
 * funnel.
 */

// ─── Comment stripping ───────────────────────────────────────────────────────
//
// MANDATORY here, not hygiene. The fix documents the deleted promise in a
// source comment that necessarily quotes it, so a raw substring scan would
// match the comment describing the removal and pass forever while the badge
// came back. That exact failure has now been shipped six times in this repo (a
// localStorage ban tripping on the comment documenting the ban; a 5xx scan
// flagging six valid 4xx echoes; a CTA test matching a comment naming the CTA;
// the SCAL-04 ratchet held over baseline by a comment about a deleted query;
// an agent catching its own draft; and SCAL-04 again on a nested `take`).
function stripComments(src: string): string {
  return (
    src
      // Block comments — also covers JSX {/* … */}, whose body is a block comment.
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      // Line comments, but never the "//" inside a URL such as https://…
      .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1')
  );
}

/**
 * Any spelling of the promise: "First 5 Minutes FREE", "First 5 min FREE",
 * "First 5 minutes are free for new users", "first five minutes free".
 */
const FREE_MINUTES_CLAIM =
  /first\s*(?:\d+|five|ten|two|three)?\s*min(?:ute)?s?\b[^.<>{}]{0,24}?free/i;

const WEB = process.cwd();
const GRID = join(WEB, 'app', 'astrology', 'AstrologyClient.tsx');
const PROFILE = join(WEB, 'app', 'astrology', 'view', 'AstrologerProfileClient.tsx');
const BOOK = join(WEB, 'app', 'astrology', '[id]', 'book', 'page.tsx');

// ─── Test doubles ────────────────────────────────────────────────────────────

const searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  usePathname: () => '/astrology',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({}),
}));

const REAL_UUID = '71e54617-6963-418e-845f-920f4350505b';

/** Exactly what GET /astrology/astrologers/live returns for real supply. */
const LIVE_PAYLOAD = {
  astrologers: [
    {
      id: REAL_UUID,
      userId: 'ba87a424-e9d2-44f1-92a9-996441b31131',
      name: 'Acharya Vinod Sharma',
      specializations: ['Vedic Astrology'],
      languages: ['Hindi', 'English'],
      experienceYears: 22,
      rating: 0,
      consultationCount: 0,
      perMinuteRate: 25,
      isOnline: true,
      mode: { chat: true, call: true },
      bio: 'Vedic astrologer with 22 years of experience.',
      verified: true,
    },
  ],
  total: 1,
  source: 'live',
};

/** Exactly what GET /astrology/astrologers/:id returns for that same profile. */
const PROFILE_PAYLOAD = {
  astrologer: {
    ...LIVE_PAYLOAD.astrologers[0],
    isBusy: false,
    source: 'live',
  },
};

const realFetch = globalThis.fetch;

afterEach(() => {
  // Both render tests query the same astrologer name. Without an explicit
  // unmount the second `getByText` sees two matches, throws on every retry and
  // the test dies of timeout instead of reporting its assertion.
  cleanup();
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

beforeEach(() => {
  searchParams.forEach((_v, k) => searchParams.delete(k));
});

// ─── Layer 1: the source, comments removed ───────────────────────────────────

describe('AW-02 — the astrology funnel states no free minutes it cannot honour', () => {
  it.each([
    ['the /astrology grid', GRID],
    ['the astrologer profile', PROFILE],
    ['the booking + payment screen', BOOK],
  ])('%s promises no free consultation minutes', (_label, file) => {
    const rendered = stripComments(readFileSync(file, 'utf8'));
    const hit = rendered.match(FREE_MINUTES_CLAIM);
    expect(
      hit?.[0] ?? null,
      `${file} advertises free consultation minutes, but POST /consultation/book charges round(pricePerMinute × minutes) with nothing deducted`,
    ).toBeNull();
  });

  /**
   * AW-02's title also says "nobody can deliver", and one instance of that
   * survived on the same card: the green "Chat Now" button — enabled exactly
   * when the astrologer is ONLINE, i.e. the moment a human is reachable — sent
   * the devotee to `/astrology/chat?astrologer=<name>`. That page is the AI
   * bot ("AI Vedic Astrologer"); it reads no `astrologer` query param at all
   * (grep: zero occurrences of searchParams in app/astrology/chat/page.tsx),
   * so the name is dropped on the floor. The devotee picked a person and was
   * handed a chatbot, silently, and the astrologer was never notified.
   *
   * There is no astrologer-chat implementation to route to: the only surface
   * that reaches that human is the paid consultation room, which is exactly
   * where the sibling "Call" button on this same card already goes (P0
   * #AP-01/AP-02 rerouted it for this reason). Both online CTAs now agree.
   */
  it('the profile never routes a chosen astrologer to the AI chat surface', () => {
    const rendered = stripComments(readFileSync(PROFILE, 'utf8'));
    expect(
      rendered,
      'the astrologer profile hands a devotee who picked a named human to the AI bot',
    ).not.toMatch(/\/astrology\/chat/);
    expect(
      rendered,
      'the online CTAs must lead to the booking flow, the only path that reaches the astrologer',
    ).toMatch(/\/astrology\/\$\{encodeURIComponent\(astrologer\.id\)\}\/book/);
  });

  it('the stripper removes comments without eating the URLs around them', () => {
    // Guards the guard: if stripComments over-matched, every assertion above
    // would pass vacuously on an empty string.
    const sample = `const u = 'https://a.test/x'; // trailing\n/* block */ const v = 'First 5 min FREE';`;
    const out = stripComments(sample);
    expect(out).toContain('https://a.test/x');
    expect(out).not.toContain('trailing');
    expect(out).not.toContain('block');
    expect(out, 'real code must survive stripping').toMatch(FREE_MINUTES_CLAIM);
  });
});

// ─── Layer 2: what the devotee actually reads ────────────────────────────────

describe('AW-02 — the rendered funnel makes no free-minutes promise', () => {
  it('/astrology renders real supply and no free-minutes badge', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => LIVE_PAYLOAD,
    })) as unknown as typeof fetch;

    const AstrologyPage = (await import('../AstrologyClient')).default;
    render(<AstrologyPage />);

    // Control: the page really did render its selling surface, so a "no free
    // minutes" pass cannot come from an empty render.
    await waitFor(() => expect(screen.getByText('Acharya Vinod Sharma')).toBeTruthy());

    expect(document.body.textContent ?? '').not.toMatch(FREE_MINUTES_CLAIM);
    // 20s, not the 5s default: mounting AstrologyClient is genuinely slow in
    // jsdom (860 lines, 12 horoscope cards, ~20 lucide icons, two 12-option
    // selects) and crosses 5s whenever another suite shares the CPU. The
    // sibling suites that mount the same component flake for this reason. A
    // deadline that fires on machine load, not on the behaviour under test,
    // is noise — the assertions above are unchanged.
  }, 20_000);

  it('the profile still sells — rate and paid CTA intact — but promises nothing free', async () => {
    searchParams.set('id', REAL_UUID);
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => PROFILE_PAYLOAD,
    })) as unknown as typeof fetch;

    const Profile = (await import('../view/AstrologerProfileClient')).default;
    render(<Profile />);

    await waitFor(() => expect(screen.getByText('Acharya Vinod Sharma')).toBeTruthy());

    const text = document.body.textContent ?? '';
    // The fix must remove the false promise, NOT the ability to buy: the other
    // half of AW-02 is that real astrologers have to stay genuinely bookable.
    expect(text, 'the paid CTA must survive').toMatch(/Book Paid Consultation/i);
    expect(text, 'the real per-minute rate must survive').toMatch(/25/);
    expect(text).not.toMatch(FREE_MINUTES_CLAIM);
  }, 20_000);
});
