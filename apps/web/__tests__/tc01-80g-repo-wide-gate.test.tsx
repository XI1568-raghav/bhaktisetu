import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TC-01 (P0, trust) — the repo-wide 80G gate.
 *
 * The previous waves wired `COMPANY.donationLegal.HAS_80G_VERIFIED` into the
 * donation pages, /nri, /faqs and lib/jsonld.ts. Measured on the tree as it
 * stood before this change, 28 non-test files under apps/web still asserted a
 * Section 80G deduction with no gate on them at all:
 *
 *   app/auth/signup/layout.tsx        app/bn/page.tsx
 *   app/checkout/success/page.tsx     app/csr-match/CsrMatchClient.tsx
 *   app/deity/[slug]/page.tsx         app/demo/[role]/page.tsx
 *   app/discover/page.tsx             app/for-temple-chains/RoiCalculator.tsx
 *   app/for-temple-chains/page.tsx    app/hi/page.tsx
 *   app/list-gaushala/page.tsx        app/mr/page.tsx
 *   app/pitch/page.tsx                app/press/page.tsx
 *   app/privacy/v2/page.tsx           app/support/faq/layout.tsx
 *   app/ta/chennai/page.tsx           app/ta/page.tsx
 *   app/te/hyderabad/page.tsx         app/te/page.tsx
 *   app/temples/[slug]/pujas/page.tsx app/terms/page.tsx
 *   app/uk/page.tsx                   app/upgrade/page.tsx
 *   lib/category-tree.ts              lib/help-articles.ts
 *   lib/i18n/en.json                  lib/products.ts
 *
 * Why the claim is false, in code rather than in policy: the flag is `false`,
 * `donationLegal.pan` and `donationLegal.eightyGNumber` are both `null`, and
 * `apps/api/src/lib/pdf-receipt.ts` `is80GEligible()` requires BOTH a donee
 * 80G number and a donee PAN. Those two values are SELECTed from
 * `gaushala_profiles.regn_80g` / `.pan` in exactly one place
 * (apps/api/src/routes/donations.ts) and are written by no route in the
 * repository — so `is80GEligible()` is false for every donation that has ever
 * been made, and stays false however many donees fill the form in
 * /list-gaushala.
 *
 * These tests are written to fail against the tree as it was:
 *   - `theUngatedFiles()` returned 28 entries; it must now return only the
 *     four justified ones enumerated in ALLOWED_UNGATED.
 *   - every rendered assertion below ran against copy that shipped the phrase.
 * The last block flips the owner flag and proves the copy comes back, so this
 * is a gate rather than a deletion.
 */

const WEB_ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  'coverage',
  'playwright-report',
  'test-results',
  '__tests__',
  'e2e',
]);
const EXTS = ['.ts', '.tsx', '.json'];

/**
 * Files allowed to name 80G with no import of the gate, each for a reason that
 * is not "we promise a deduction". Anything else appearing here is a
 * regression: a new surface has published the claim ungated.
 */
const ALLOWED_UNGATED: Record<string, string> = {
  'app/csr-match/CsrMatchClient.tsx':
    'single occurrence, inside a source comment quoting the deploy condition',
  'app/for-temple-chains/RoiCalculator.tsx':
    'single occurrence, inside a source comment describing the ₹15 cost input',
  'lib/help-articles.ts':
    'the help answer that DENIES 80G eligibility — it must name 80G to deny it',
  'lib/i18n/en.json':
    'string table; the three remaining keys render only behind the gate (tax80G, donate80G) or are unused (receive80G)',
  'lib/products.ts': 'a product weight — the literal "80g" is 80 grams of prasad',
};

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), out);
    } else if (EXTS.some((e) => entry.name.endsWith(e))) {
      if (entry.name.includes('.test.')) continue;
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

/** Files that name 80G but import neither the flag nor lib/eighty-g. */
function theUngatedFiles(): string[] {
  const ungated: string[] = [];
  for (const abs of walk(WEB_ROOT)) {
    const src = fs.readFileSync(abs, 'utf8');
    if (!/80\s?G|80g/.test(src)) continue;
    const gated =
      src.includes('HAS_80G_VERIFIED') ||
      /from ['"][^'"]*eighty-g['"]/.test(src);
    if (!gated) ungated.push(path.relative(WEB_ROOT, abs).split(path.sep).join('/'));
  }
  return ungated.sort();
}

afterEach(() => {
  cleanup();
  vi.resetModules();
  vi.doUnmock('../lib/company');
});

async function renderPage(mod: string): Promise<string> {
  const { default: Page } = await import(mod);
  const { container } = render(<Page />);
  container.querySelectorAll('script').forEach((s) => s.remove());
  const text = container.textContent ?? '';
  // A page that rendered to nothing would make every negative assertion vacuous.
  expect(text.length).toBeGreaterThan(400);
  return text;
}

describe('TC-01 — the premise still holds', () => {
  it('the owner flag is false and both donee fields are null', async () => {
    const { COMPANY } = await import('../lib/company');
    expect(COMPANY.donationLegal.HAS_80G_VERIFIED).toBe(false);
    expect(COMPANY.donationLegal.eightyGNumber).toBeNull();
    expect(COMPANY.donationLegal.pan).toBeNull();
  });

  it('no route in apps/api writes gaushala_profiles.regn_80g, so no donee can qualify', () => {
    const apiSrc = path.resolve(__dirname, '../../api/src');
    const files: string[] = [];
    (function collect(dir: string) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) collect(path.join(dir, e.name));
        else if (e.name.endsWith('.ts') && !e.name.includes('.test.'))
          files.push(path.join(dir, e.name));
      }
    })(apiSrc);
    expect(files.length).toBeGreaterThan(50);

    const writers = files.filter((f) => {
      const s = fs.readFileSync(f, 'utf8');
      // An UPDATE/INSERT that assigns regn_80g, as opposed to the ALTER TABLE
      // that creates the column or the SELECT that reads it.
      return /(set|,)\s*regn_80g\s*=/i.test(s) || /insert[\s\S]{0,400}regn_80g/i.test(s);
    });
    expect(writers).toEqual([]);
  });
});

describe('TC-01 — every 80G surface under apps/web imports the gate', () => {
  it('leaves only the justified exceptions ungated', () => {
    expect(theUngatedFiles()).toEqual(Object.keys(ALLOWED_UNGATED).sort());
  });

  it('the exception list is itself justified, not a dumping ground', () => {
    expect(Object.keys(ALLOWED_UNGATED).length).toBeLessThanOrEqual(6);
    for (const [file, why] of Object.entries(ALLOWED_UNGATED)) {
      expect(fs.existsSync(path.join(WEB_ROOT, file))).toBe(true);
      expect(why.length).toBeGreaterThan(20);
    }
  });
});

/**
 * Phrasings that assert a devotee will get a deduction. Kept separate from a
 * bare /80G/ search because three surfaces legitimately name 80G in order to
 * DENY it — a denial must not be indistinguishable from a promise.
 */
function expectNoDeductionPromise(text: string): void {
  expect(text).not.toMatch(/\b80G receipts?\b(?!\s*\()/i);
  expect(text).not.toMatch(/80G (automation|reconciliation|auto\b)/i);
  expect(text).not.toMatch(/80G[-\s]eligible/i);
  expect(text).not.toMatch(/tax[-\s]deductible/i);
  expect(text).not.toMatch(/India[-\s]tax[-\s]deductible/i);
  expect(text).not.toMatch(/valid 80G/i);
  expect(text).not.toMatch(/instant tax receipt/i);
}

describe('TC-01 — rendered copy promises no deduction', () => {
  /** Surfaces where the word 80G has no business appearing at all. */
  const STRICT: Array<[string, string]> = [
    ['Bengali', '../app/bn/page'],
    ['Hindi', '../app/hi/page'],
    ['Marathi', '../app/mr/page'],
    ['Tamil', '../app/ta/page'],
    ['Telugu', '../app/te/page'],
    ['Tamil / Chennai', '../app/ta/chennai/page'],
    ['Telugu / Hyderabad', '../app/te/hyderabad/page'],
    ['/discover', '../app/discover/page'],
    ['/press', '../app/press/page'],
  ];

  for (const [label, mod] of STRICT) {
    it(`${label} renders no 80G promise`, async () => {
      const text = await renderPage(mod);
      expect(text).not.toMatch(/80\s?G/i);
      expectNoDeductionPromise(text);
    });
  }

  it('/for-temple-chains sells receipt automation and denies the 80G part of it', async () => {
    const text = await renderPage('../app/for-temple-chains/page');
    expectNoDeductionPromise(text);
    // The denial has to be present, or the negatives above are satisfied by a
    // page that simply removed the subject.
    expect(text).toMatch(/not an 80G document/i);
    expect(text).toMatch(/donation receipt automation/i);
    expect(text).not.toMatch(/80G receipt automation/i);
    expect(text).not.toMatch(/80G PDF generator/i);
  });

  it('/list-gaushala still collects the 80G fields but says they do not print today', async () => {
    const text = await renderPage('../app/list-gaushala/page');
    expectNoDeductionPromise(text);
    expect(text).toMatch(/80G registration number/i); // the input is still there
    expect(text).toMatch(/do not print on donor receipts today/i);
    expect(text).toMatch(/not a tax-exemption certificate/i);
    expect(text).not.toMatch(/80G PDF receipts auto-emailed/i);
    expect(text).not.toMatch(/Trust PAN \(for 80G receipts\)/i);
  });

  it('/pitch describes a numbered receipt and names what it is not', async () => {
    const text = await renderPage('../app/pitch/page');
    expectNoDeductionPromise(text);
    expect(text).toMatch(/not yet an 80G certificate/i);
    expect(text).not.toMatch(/Auto-generated 80G receipts/i);
    expect(text).not.toMatch(/Gaushala adoption \+ 80G receipt/i);
  });

  /**
   * /uk is an async server component that fetches the puja catalogue, so it is
   * rendered by awaiting the component and stubbing only the network call.
   * Its metadata is covered separately below; this is the visible body, which
   * carried the strongest version of the claim on the site ("every donation
   * comes with a valid 80G receipt from the donee temple").
   */
  it('/uk renders a receipt disclosure instead of the deduction promise', async () => {
    const pricing = await vi.importActual<typeof import('../lib/pricing')>('../lib/pricing');
    vi.doMock('../lib/pricing', () => ({ ...pricing, fetchPujaCatalog: async () => [] }));
    vi.resetModules();
    const { default: Page } = await import('../app/uk/page');
    const { container } = render(await Page());
    container.querySelectorAll('script').forEach((s) => s.remove());
    const text = container.textContent ?? '';
    expect(text.length).toBeGreaterThan(1000);
    expectNoDeductionPromise(text);
    expect(text).not.toMatch(/Pujas, darshan & 80G receipts/i);
    expect(text).toMatch(/not a tax-exemption certificate/i);
    vi.doUnmock('../lib/pricing');
  });

  it('/terms says the receipt is not an 80G certificate rather than that it is one', async () => {
    const text = await renderPage('../app/terms/page');
    expect(text).toMatch(/not a Section 80G tax-exemption certificate/i);
    expect(text).not.toMatch(/the 80G receipt is issued free of charge/i);
  });
});

describe('TC-01 — metadata promises no deduction', () => {
  const METADATA: Array<[string, string]> = [
    ['/auth/signup', '../app/auth/signup/layout'],
    ['/support/faq', '../app/support/faq/layout'],
    ['/uk', '../app/uk/page'],
    ['/for-temple-chains', '../app/for-temple-chains/page'],
    ['/list-gaushala', '../app/list-gaushala/page'],
    ['/ta/chennai', '../app/ta/chennai/page'],
    ['/te/hyderabad', '../app/te/hyderabad/page'],
  ];

  for (const [label, mod] of METADATA) {
    it(`${label} metadata sells no 80G receipt`, async () => {
      const { metadata } = await import(mod);
      const blob = JSON.stringify(metadata);
      expect(blob.length).toBeGreaterThan(40);
      expect(blob).not.toMatch(/80\s?G/i);
    });
  }
});

describe('TC-01 — the shared string tables', () => {
  it('the donations subtitle no longer calls donations tax-deductible', () => {
    const en = JSON.parse(
      fs.readFileSync(path.join(WEB_ROOT, 'lib/i18n/en.json'), 'utf8'),
    ) as Record<string, Record<string, string>>;
    expect(en.donations.pageSubtitle).not.toMatch(/80\s?G/i);
    expect(en.donations.pageSubtitle).not.toMatch(/tax[-\s]deductible/i);
    expect(en.donations.pageSubtitle).toMatch(/receipt/i);
  });

  it('the global category tree offers "Donate", not "Donate (80G)"', async () => {
    const { CATEGORY_TREE } = await import('../lib/category-tree');
    const blob = JSON.stringify(CATEGORY_TREE);
    expect(blob.length).toBeGreaterThan(1000);
    expect(blob).not.toMatch(/80\s?G/i);
    expect(blob).toMatch(/"label":"Donate"/);
  });
});

describe('TC-01 — it is a gate, not a deletion', () => {
  function mockVerified() {
    return async () => {
      const actual = await vi.importActual<typeof import('../lib/company')>('../lib/company');
      vi.doMock('../lib/company', () => ({
        ...actual,
        COMPANY: {
          ...actual.COMPANY,
          donationLegal: {
            ...actual.COMPANY.donationLegal,
            HAS_80G_VERIFIED: true,
            eightyGNumber: 'AAATS1234QF20214',
            pan: 'AAATS1234Q',
          },
        },
      }));
      vi.resetModules();
    };
  }

  it('the shared nouns flip with the owner flag', async () => {
    await mockVerified()();
    const gate = await import('../lib/eighty-g');
    expect(gate.HAS_80G).toBe(true);
    expect(gate.RECEIPT_NOUN).toBe('80G receipt');
    expect(gate.RECEIPT_NOUN_PLURAL).toBe('80G receipts');
    expect(gate.withEightyG('80G receipts, ')).toBe('80G receipts, ');
  });

  it('the category tree gets its 80G label back', async () => {
    await mockVerified()();
    const { CATEGORY_TREE } = await import('../lib/category-tree');
    expect(JSON.stringify(CATEGORY_TREE)).toMatch(/Donate \(80G\)/);
  });

  it('the Hindi landing page gets its 80G receipt line back', async () => {
    await mockVerified()();
    const text = await renderPage('../app/hi/page');
    expect(text).toMatch(/80G/);
  });

  it('/for-temple-chains gets its 80G automation copy back', async () => {
    await mockVerified()();
    const text = await renderPage('../app/for-temple-chains/page');
    expect(text).toMatch(/80G/);
  });
});
