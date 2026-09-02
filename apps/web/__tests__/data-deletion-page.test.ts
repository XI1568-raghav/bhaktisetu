/**
 * LC-DEL — /data-deletion is the URL that goes in the Play Console Data safety
 * form, and it only works if a SIGNED-OUT reviewer can read the whole thing.
 *
 * These are source assertions in the style of legal-content-p1/p2.test.ts, and
 * for the same reason: the failure mode on a compliance page is a published
 * sentence that contradicts the code, or a gate that quietly appears above the
 * route. A render test passes happily on a page that renders the wrong
 * sentence perfectly, and it cannot see middleware at all.
 *
 * The four things a Play reviewer checks are pinned individually below: what
 * is deleted, what is retained and why, how long it takes, and how to ask.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');
const exists = (rel: string) => existsSync(path.join(WEB, rel));

/**
 * Comment-stripped source. This page carries a long docblock that quotes the
 * very strings asserted on below (the middleware prefixes, "AuthGuard",
 * "use client"), so matching raw source would let the documentation satisfy —
 * or trip — every assertion in this file.
 */
const codeOnly = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

const PAGE_REL = 'app/data-deletion/page.tsx';
const raw = read(PAGE_REL);
const page = codeOnly(raw);
const middleware = codeOnly(read('middleware.ts'));

describe('LC-DEL — the page exists at the public URL', () => {
  it('app/data-deletion/page.tsx is present', () => {
    expect(exists(PAGE_REL), `${PAGE_REL} is the URL submitted to Play`).toBe(true);
  });

  it('has a default export, so the route renders rather than 404s', () => {
    expect(page).toMatch(/export default function \w+\s*\(/);
  });
});

describe('LC-DEL — a logged-out visitor reaches it', () => {
  /**
   * The whole point of the page. /account/privacy already offers erasure and
   * is useless for Play because it sits behind AuthGuard under a layout that
   * declares itself noindex — so every gate that could reappear above this
   * route is asserted absent.
   */
  it('middleware does not gate /data-deletion', () => {
    // PORTAL_PREFIXES is the SOLE definition of what middleware redirects
    // (config.matcher is broad by design, for the locale cookie).
    const block = middleware.match(/const PORTAL_PREFIXES = \[([\s\S]*?)\]/);
    expect(block, 'PORTAL_PREFIXES not found — middleware was restructured').toBeTruthy();
    expect(block![1]).not.toContain('data-deletion');

    // And nothing else in middleware singles the route out.
    expect(middleware).not.toContain('/data-deletion');
  });

  it('is a Server Component with no auth read and no client fetch', () => {
    expect(page).not.toContain("'use client'");
    expect(page).not.toContain('"use client"');
    expect(page).not.toMatch(/\bAuthGuard\b/);
    expect(page).not.toMatch(/\buseAuth\b/);
    expect(page).not.toMatch(/\bredirect\s*\(/);
    expect(page).not.toMatch(/\bfetch\s*\(/);
  });

  it('has no route-level layout that could impose a gate or a noindex', () => {
    // A layout here is allowed to exist, but if one is ever added it must not
    // repeat what app/account/privacy/layout.tsx does.
    const layout = 'app/data-deletion/layout.tsx';
    if (exists(layout)) {
      const l = codeOnly(read(layout));
      expect(l).not.toMatch(/index:\s*false/);
      expect(l).not.toMatch(/\bAuthGuard\b/);
    }
  });

  it('no ancestor layout between the root and this route', () => {
    // app/layout.tsx is chrome; anything between it and the page would be a
    // new gate nobody reviewed.
    const between = readdirSync(path.join(WEB, 'app', 'data-deletion'));
    expect(between.filter((f) => /^(template|error)\.tsx$/.test(f))).toEqual([]);
  });
});

describe('LC-DEL — indexable and discoverable', () => {
  it('exports metadata with a canonical on the public URL', () => {
    expect(page).toMatch(/export const metadata: Metadata/);
    expect(page).toContain('https://darshya.online/data-deletion');
    expect(page).toMatch(/alternates:\s*\{\s*canonical:/);
  });

  it('is explicitly indexable — a noindex here fails the Play submission', () => {
    expect(page).toMatch(/robots:\s*\{\s*index:\s*true/);
    expect(page).not.toMatch(/index:\s*false/);
  });

  it('matches the sibling legal pages: openGraph block with a title and url', () => {
    expect(page).toMatch(/openGraph:\s*\{/);
    // The same OG asset /privacy and /terms use, so no new file is required.
    expect(page).toContain('/images/golden-temple-og.jpg');
  });
});

describe('LC-DEL — the content Play actually looks for', () => {
  it('names what is deleted, in specifics rather than "your data"', () => {
    for (const item of [
      'name',
      'email',
      'phone',
      'Birth details',
      'addresses',
      'Message bodies',
      'push-notification tokens',
      'Login identities',
    ]) {
      expect(page, `the deleted-data list does not mention ${item}`).toContain(item);
    }
  });

  it('names what is retained and gives the reason', () => {
    for (const item of [
      'Bookings',
      'payments',
      'commissions',
      'payout',
      'donation receipts',
    ]) {
      expect(page, `the retained-data list does not mention ${item}`).toContain(item);
    }
    // The reason, not just the fact.
    expect(page).toMatch(/anonymised/i);
    expect(page).toMatch(/income-tax|tax and accounting/i);
  });

  it('states the 30-day grace period and that it is reversible inside it', () => {
    expect(page).toMatch(/GRACE_PERIOD_DAYS = 30/);
    expect(page).toMatch(/grace period/i);
    expect(page).toMatch(/reversible|cancel the deletion/i);
  });

  it('gives an in-app route and a route for someone who cannot use the app', () => {
    expect(page).toMatch(/Settings &rarr; Delete account|Settings → Delete account/);
    expect(page).toContain('/account/privacy');
    expect(page).toContain('rightsContactEmail()');
    expect(page).toContain('/support');
    expect(page).toContain('/contact');
  });

  it('publishes a real contact address from lib/company, not a literal', () => {
    // A hardcoded mailbox drifts from company.ts and can publish an alias that
    // does not deliver — the exact failure LEG-16 closed.
    expect(page).not.toMatch(/privacy@darshya\.online|legal@darshya\.online/);
    expect(page).toMatch(/from ['"]\.\.\/\.\.\/lib\/company['"]/);
  });
});

describe('LC-DEL — the page is not itself an account-takeover vector', () => {
  /**
   * A public form that deletes an account on an email address alone would be a
   * destroy button for anyone who can guess one. Darshya has no password
   * column — every credential is an OTP or a magic link — so there is nothing
   * on an anonymous request to verify against.
   */
  it('renders no form, input or submit control', () => {
    expect(page).not.toMatch(/<form\b/);
    expect(page).not.toMatch(/<input\b/);
    expect(page).not.toMatch(/<textarea\b/);
    expect(page).not.toMatch(/onSubmit/);
  });

  it('says why verification is required', () => {
    expect(page).toMatch(/We do not delete an account on an email alone/);
  });
});

describe('LC-DEL — design system and responsive rules', () => {
  it('uses the h1 recipe rather than a hand-rolled heading', () => {
    expect(page).toMatch(/H1\.catalogue/);
  });

  it('uses the same container measure as the sibling legal pages', () => {
    const privacy = codeOnly(read('app/privacy/page.tsx'));
    const container = 'max-w-3xl mx-auto px-6 sm:px-8';
    expect(privacy).toContain(container);
    expect(page).toContain(container);
  });

  it('no fixed pixel width that would break at 320px', () => {
    expect(page).not.toMatch(/\bw-\[\d+px\]/);
  });

  it('the retention table is wrapped in a horizontal scroll container', () => {
    const tableAt = raw.indexOf('<table');
    expect(tableAt, 'no table on the page — update this test').toBeGreaterThan(-1);
    const before = raw.slice(Math.max(0, tableAt - 400), tableAt);
    expect(before, 'the table is not inside an overflow-x-auto wrapper').toContain(
      'overflow-x-auto',
    );
  });
});

describe('LC-DEL — the facts track the implementation', () => {
  /**
   * The page states numbers that live in
   * apps/api/src/services/account-deletion.service.ts. Re-read the service and
   * fail if the two drift — the same anti-drift arrangement
   * __tests__/refund-page-unbacked-promises.test.ts uses for the refund ladder.
   */
  const SERVICE = path.resolve(WEB, '..', 'api', 'src', 'services', 'account-deletion.service.ts');

  it('the grace period on the page is the service default', () => {
    if (!existsSync(SERVICE)) return; // API lane may not be checked out
    const src = readFileSync(SERVICE, 'utf8');
    const m = src.match(/GRACE_PERIOD_DAYS = Number\(process\.env\.\w+ \?\? (\d+)\)/);
    expect(m, 'GRACE_PERIOD_DAYS not found in the service').toBeTruthy();
    expect(page).toContain(`GRACE_PERIOD_DAYS = ${m![1]}`);
  });

  it('the page does not promise a response time the service does not implement', () => {
    // Only the 30-day statutory DSAR window is asserted, and the service files
    // exactly that deadline. Nothing about hours, business days or "we aim to".
    expect(page).not.toMatch(/within \d+ hours/i);
    expect(page).not.toMatch(/business days/i);
  });

  it('the donor-PAN sentence is gated on the 80G flag rather than asserted', () => {
    expect(page).toContain('COMPANY.donationLegal.HAS_80G_VERIFIED');
  });
});
