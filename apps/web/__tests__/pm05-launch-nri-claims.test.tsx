import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

/**
 * PM-05 — /launch, the one NRI Premium shopfront that was never gated.
 *
 * TC-03/TC-04 withdrew `nri_premium_yearly` properly: all six benefits carry
 * `enforcedBy: null` in apps/api/src/services/subscription-entitlements.ts, so
 * `nriPremiumIsSellable()` is false, `getPlans()` drops the plan, both
 * activation rails answer 400, /nri is gated on `NRI_PREMIUM_IS_SELLABLE` in
 * twelve places and /upgrade omits the card entirely.
 *
 * /launch had ZERO references to that gate and four separate defects, MEASURED
 * BEFORE (this branch, 2026-08-28):
 *
 *  1. A PRICE THAT EXISTS NOWHERE. The section heading read
 *     "$399/yr Premium. Made for the diaspora." The plan is Rs 5,000/year,
 *     `priceUsd: 60` (subscription.service.ts). $399 is 6.6x the only USD
 *     figure in the codebase and appears in no plan definition, no test and no
 *     other page. A prospect reading /launch and then /nri saw two prices for
 *     the same SKU differing by a factor of six.
 *
 *  2. FIVE UNENFORCED BENEFITS SOLD AS PRESENT TENSE — `NRI_BULLETS`:
 *     "No NRI surcharge on bookings (Premium tier)", "Priority booking 7 days
 *     early", "Free 80G receipt PDF", "Weekly 1:1 priest call (Jitsi)",
 *     "Unlimited AI astro chat" — for a plan withdrawn from sale, with a
 *     "See NRI plan" call to action beneath them.
 *
 *  3. AN 80G PROMISE WITH A DEADLINE. A feature card read "Gaushala seva + 80G
 *     receipts … 80G tax receipt within 24h" while
 *     lib/company.ts donationLegal.HAS_80G_VERIFIED is false, `pan` is null and
 *     `eightyGNumber` is null. /gaushala, /donations, /csr-match, /faqs and
 *     /list-temple all branch on that constant; /launch did not. A donor cannot
 *     claim a deduction against a receipt from an unregistered donee, so this
 *     is the legally-loaded one.
 *
 *  4. The body copy and the closing CTA repeated both: "get 80G receipts, talk
 *     to a priest weekly" and "Premium when you want puja with proof + ad-free
 *     + priority calls".
 *
 * Every assertion below was confirmed RED against HEAD before the fix.
 */

vi.mock('../components/EmailCapture', () => ({
  default: () => <div data-testid="email-capture" />,
}));

afterEach(() => {
  cleanup();
  vi.resetModules();
});

async function renderLaunch(): Promise<string> {
  const { default: Page } = await import('../app/launch/page');
  const { container } = render(<Page />);
  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  // A silently empty tree would make every negative assertion below vacuous.
  expect(text.length).toBeGreaterThan(1000);
  return text;
}

describe('PM-05 — the two facts that make the /launch copy a defect', () => {
  it('NRI Premium is not sellable', async () => {
    const { NRI_PREMIUM_IS_SELLABLE } = await import('../app/nri/plan-availability');
    expect(NRI_PREMIUM_IS_SELLABLE).toBe(false);
  });

  it('Darshya holds no 80G registration', async () => {
    const { COMPANY } = await import('../lib/company');
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.eightyGNumber).toBeNull();
    expect(COMPANY.donationLegal.pan).toBeNull();
  });
});

describe('PM-05 — /launch quotes no price for the withdrawn tier', () => {
  it('does not print $399, a figure that exists in no plan definition', async () => {
    expect(await renderLaunch()).not.toMatch(/\$\s?399/);
  });

  it('does not price the tier at all while it cannot be bought', async () => {
    const text = await renderLaunch();
    expect(text).not.toMatch(/\$\s?\d[\d,]*\s*\/\s*yr/i);
    expect(text).not.toMatch(/₹\s?5[,.]?000/);
    expect(text).not.toMatch(/\bper year\b/i);
  });
});

describe('PM-05 — /launch sells none of the six unenforced NRI benefits', () => {
  const UNENFORCED: [RegExp, string][] = [
    [/no ads\b/i, '"No ads anywhere on Darshya"'],
    [/surcharge/i, '"No NRI surcharge on bookings"'],
    [/priority booking/i, '"Priority booking 7 days early"'],
    [/weekly 1:1|priest call|priority calls/i, '"Weekly 1:1 call with priest (Jitsi)"'],
    [/80G/i, '"Free 80G receipt PDF"'],
    [/unlimited ai/i, '"Unlimited AI astro chat"'],
  ];

  it.each(UNENFORCED)('does not advertise %s — %s', async (pattern) => {
    expect(await renderLaunch()).not.toMatch(pattern);
  });

  it('says plainly that the tier is on hold, rather than going silent', async () => {
    const text = await renderLaunch();
    expect(text).toMatch(/not (currently )?(on sale|sold)|on hold/i);
  });
});

describe('PM-05 — /launch makes no 80G claim, with or without a deadline', () => {
  it('promises no 80G receipt and no turnaround for one', async () => {
    const text = await renderLaunch();
    expect(text).not.toMatch(/80G/i);
    expect(text).not.toMatch(/tax receipt/i);
    expect(text).not.toMatch(/within 24h/i);
  });

  it('still tells a donor what they DO get, so the section is not just deleted', async () => {
    // Every other 80G-branching page (/gaushala, /donations, /list-temple)
    // replaces the claim with the receipt that genuinely is issued rather than
    // dropping the row. /launch does the same.
    expect(await renderLaunch()).toMatch(/receipt/i);
  });
});

/**
 * Strip comments so the source scans below read CODE only.
 *
 * Load-bearing, and it caught its own violation: the fix's comments in
 * app/launch/page.tsx quote the forbidden strings verbatim ("launch credit",
 * "calendar (PDF)", "$399/yr", "80G tax receipt within 24h") to record what the
 * page used to say. Scanning the raw file flagged the CORRECTION as the defect
 * — the same mistake made eight times elsewhere in this engagement. String and
 * template state is tracked so a `//` inside a URL does not start a comment.
 */
export function stripComments(src: string): string {
  let out = '';
  let i = 0;
  let quote: string | null = null;
  let escaped = false;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (quote) {
      out += c;
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c;
      out += c;
      i += 1;
      continue;
    }
    if (c === '/' && next === '/') {
      while (i < src.length && src[i] !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) i += 1;
      i += 2;
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

describe('PM-05 — the comment stripper the source scans depend on', () => {
  it('drops a comment quoting a forbidden string', () => {
    expect(stripComments('// used to say "$10 launch credit"\nconst a = 1;')).not.toMatch(
      /launch credit/i,
    );
    expect(stripComments('/* was "calendar (PDF)" */const a = 1;')).not.toMatch(/calendar/i);
  });

  it('keeps the string when it is real code', () => {
    expect(stripComments('const s = "$10 launch credit";')).toMatch(/launch credit/i);
  });

  it('does not eat a // inside a string', () => {
    expect(stripComments('const u = "https://darshya.online";')).toContain('https://darshya.online');
  });
});

async function launchSource(): Promise<string> {
  const { readFileSync } = await import('node:fs');
  const path = await import('node:path');
  return stripComments(
    readFileSync(path.resolve(__dirname, '..', 'app/launch/page.tsx'), 'utf8'),
  );
}

describe('PM-05 — the gate is wired, not the strings hand-edited', () => {
  it('/launch reads the same two constants every other honest surface reads', async () => {
    const src = await launchSource();
    expect(src).toMatch(/NRI_PREMIUM_IS_SELLABLE/);
    expect(src).toMatch(/HAS_80G_VERIFIED/);
  });
});

/**
 * Same class, found while fixing the section: the page's own `<EmailCapture>`
 * subtitle promised "2026 calendar (PDF) + $10 launch credit when we activate
 * your country" (page.tsx:172 at HEAD).
 *
 * TC-03 already established there is no path that issues a launch credit:
 * POST /waitlist creates a Waitlist row, generates a referral code and sends a
 * confirmation email; it never touches the wallet, and of the five
 * `CreditLedgerReason` values only `referral_reward` is live. TC-03 corrected
 * `EmailCapture`'s DEFAULT subtitle for exactly this — and /launch overrode the
 * default with its own copy, so the fix did not reach it. No job mails a
 * calendar PDF either.
 *
 * The component is mocked in the render tests above, so this is asserted on the
 * source, which is where the prop is written.
 */
describe('PM-05 — /launch offers nothing the waitlist cannot deliver', () => {
  it('promises no launch credit', async () => {
    expect(await launchSource()).not.toMatch(/launch credit/i);
  });

  it('promises no calendar PDF, which nothing sends', async () => {
    expect(await launchSource()).not.toMatch(/calendar \(PDF\)|Send me the PDF/i);
  });

  it('still gives a reason to leave an email — the digest the API does send', async () => {
    const src = await launchSource();
    const subtitle = /subtitle="([^"]*)"/.exec(src)?.[1] ?? '';
    expect(subtitle.length).toBeGreaterThan(20);
    expect(subtitle).toMatch(/panchang|festival|reminder/i);
    expect(subtitle).not.toMatch(/credit/i);
  });
});
