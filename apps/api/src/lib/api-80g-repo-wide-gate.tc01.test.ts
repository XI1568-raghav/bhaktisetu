import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * TC-01 (P0, trust) — the 80G gate, applied to `apps/api`.
 *
 * Four previous waves measured this finding against `apps/web`. The web-side
 * guard that closed it, `apps/web/__tests__/tc01-80g-repo-wide-gate.test.tsx`,
 * walks `WEB_ROOT` only and collects only `.ts`, `.tsx` and `.json`. Its
 * denominator therefore could not see two whole classes of live copy:
 *
 *   1. `apps/api` — which does not render a page a reader can re-read. It
 *      serves JSON to clients and hands text to Resend and to the WhatsApp
 *      Graph API. A sent email cannot be edited.
 *   2. `.html` and `.txt` — the outreach templates are exactly these two
 *      extensions, so even an `apps/api` walk with the web test's EXTS would
 *      have missed them.
 *
 * What was actually still live when this file was written, measured rather
 * than inferred:
 *
 *   $ curl -s https://api.darshya.online/api/v1/gaushala/plans \
 *       | grep -o '80G tax receipt'
 *   80G tax receipt
 *   80G tax receipt                       # HTTP 200, production, 2026-09-01
 *
 *   src/templates/outreach/gaushala_first_touch.en.html
 *     "devotees donate seva to gaushalas with automatic 80G receipts"
 *   src/templates/outreach/gaushala_first_touch.hi.html   (same, Hindi)
 *   src/templates/outreach/gaushala_first_touch.txt       (the WhatsApp copy)
 *   src/templates/outreach/gaushala_followup_3day.html
 *   scripts/ops/cs005-resend-stale-leads.ts
 *     "- Bhaktisetu Foundation: active 80G + CSR-1 in India"
 *     "...monthly disbursement milta hai with 80G receipt for donor."
 *
 * The subject line of that first-touch email and the WhatsApp warm-intro text
 * had already been corrected by an earlier wave (see
 * `outbound-80g-honesty.tc01.test.ts`) — the BODIES the subject introduced
 * were not, so the mail went out promising in paragraph two what the subject
 * line had stopped promising.
 *
 * Why every one of those is false, in code rather than in policy:
 *   - `apps/web/lib/company.ts` `donationLegal.HAS_80G_VERIFIED` is `false`,
 *     `HAS_CSR1_VERIFIED` is `false`, and `pan` / `eightyGNumber` / `csr1Number`
 *     are all `null`.
 *   - `lib/pdf-receipt.ts` `is80GEligible()` needs a donee 80G number AND a
 *     donee PAN; without both the PDF prints "Proof of donation — not a tax
 *     exemption certificate".
 *   - Those come from `gaushala_profiles.regn_80g` / `.pan`, SELECTed in one
 *     place and written by no route in this repository.
 *
 * Every case below fails against the tree as it stood before this change.
 */

const HERE = path.dirname(fileURLToPath(import.meta.url));
const API_ROOT = path.resolve(HERE, '../..'); // apps/api
const API_SRC = path.join(API_ROOT, 'src');
const REPO_ROOT = path.resolve(API_ROOT, '../..');

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.turbo',
  'prisma',
  '__tests__',
]);

/** Every extension that can carry a sentence a human will read. */
const EXTS = ['.ts', '.tsx', '.js', '.mjs', '.json', '.html', '.txt', '.md'];

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

/**
 * Comments explaining WHY a claim was removed must not read as the claim.
 * Stripping them is what lets the allow-list stay short enough to audit.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

/**
 * Case-sensitive on the G: `store.service.ts` sells 80 grams of prasad
 * (`weight: '80g'`) and that is not a tax claim.
 */
const EIGHTY_G = /80\s?G/;

/**
 * Phrasings that assert someone will get a deduction. Deliberately narrower
 * than a bare /80G/ search: several strings must name 80G in order to DENY it,
 * and a denial must not be indistinguishable from a promise.
 */
const EIGHTY_G_PROMISE =
  /automatic 80G|80G receipts?\b|80G tax receipt|active 80G|80G[-\s]eligible|tax[-\s]deductible/i;

/**
 * Files that name 80G in live code with no import of the gate, each for a
 * reason that is not "we promise a deduction". Anything appearing outside this
 * map is a regression: a new API surface has published the claim ungated.
 */
const ALLOWED_UNGATED: Record<string, string> = {
  'src/lib/eighty-g.ts': 'the gate itself — it has to name the thing it gates',
  'src/routes/donations.ts':
    'the receipt path: it imports is80GEligible() and passes the result to the PDF and the mail',
  'src/lib/email.ts':
    'the donation mail branches on an is80G argument the caller derives from is80GEligible()',
  'src/routes/leads-self-onboard.ts':
    'a has80G input field — it collects the DONEE trust\'s own registration, it does not promise ours',
  'src/services/subscription-entitlements.ts':
    'the not-delivered registry: it names the benefit in order to record that nothing enforces it',
  'src/services/subscription.service.ts':
    'a raw plan feature that advertisedFeaturesFor() strips before any buyer sees it (TC-04)',
};

/** Files under apps/api that name 80G in live code but import no gate. */
function theUngatedFiles(): string[] {
  const ungated: string[] = [];
  for (const abs of walk(API_ROOT)) {
    const raw = fs.readFileSync(abs, 'utf8');
    if (!EIGHTY_G.test(stripComments(raw))) continue;
    const gated = /from ['"][^'"]*eighty-g(\.js)?['"]/.test(raw);
    if (!gated) ungated.push(path.relative(API_ROOT, abs).split(path.sep).join('/'));
  }
  return ungated.sort();
}

describe('TC-01 — the premise still holds on the API side', () => {
  it('the API gate mirrors apps/web/lib/company.ts, so the copies cannot drift', async () => {
    const gate = await import('./eighty-g.js');
    const companySrc = fs.readFileSync(
      path.join(REPO_ROOT, 'apps/web/lib/company.ts'),
      'utf8',
    );
    // The web file is the owner-facing source of truth; read it, do not assume.
    const web80G = /HAS_80G_VERIFIED:\s*(true|false)/.exec(companySrc)?.[1];
    const webCsr1 = /HAS_CSR1_VERIFIED:\s*(true|false)/.exec(companySrc)?.[1];
    expect(web80G, 'HAS_80G_VERIFIED not found in apps/web/lib/company.ts').toBeDefined();
    expect(webCsr1, 'HAS_CSR1_VERIFIED not found in apps/web/lib/company.ts').toBeDefined();
    expect(gate.HAS_80G).toBe(web80G === 'true');
    expect(gate.HAS_CSR1).toBe(webCsr1 === 'true');
    expect(companySrc).toMatch(/eightyGNumber:\s*null/);
  });

  it('no route in apps/api writes gaushala_profiles.regn_80g, so no donee can qualify', () => {
    const files = walk(API_SRC).filter((f) => f.endsWith('.ts'));
    // Guards the denominator: an empty walk would make the negative vacuous.
    expect(files.length).toBeGreaterThan(50);
    const writers = files.filter((f) => {
      const s = fs.readFileSync(f, 'utf8');
      return /(set|,)\s*regn_80g\s*=/i.test(s) || /insert[\s\S]{0,400}regn_80g/i.test(s);
    });
    expect(writers).toEqual([]);
  });
});

describe('TC-01 — every 80G surface under apps/api is gated or justified', () => {
  it('walks html and txt too, not just ts', () => {
    const walked = walk(API_ROOT).map((f) => path.relative(API_ROOT, f).split(path.sep).join('/'));
    // The four outreach files the web-side walker structurally could not see.
    expect(walked).toContain('src/templates/outreach/gaushala_first_touch.en.html');
    expect(walked).toContain('src/templates/outreach/gaushala_first_touch.hi.html');
    expect(walked).toContain('src/templates/outreach/gaushala_first_touch.txt');
    expect(walked).toContain('src/templates/outreach/gaushala_followup_3day.html');
    expect(walked).toContain('scripts/ops/cs005-resend-stale-leads.ts');
  });

  it('leaves only the justified exceptions ungated', () => {
    // Computed rather than hardcoded so that another lane REMOVING an 80G
    // string from an allow-listed file does not fail this test. Adding a new
    // ungated one still does.
    const stillNames80G = Object.keys(ALLOWED_UNGATED).filter((rel) => {
      const abs = path.join(API_ROOT, rel);
      return fs.existsSync(abs) && EIGHTY_G.test(stripComments(fs.readFileSync(abs, 'utf8')));
    });
    expect(theUngatedFiles()).toEqual(stillNames80G.sort());
  });

  it('the exception list is itself justified, not a dumping ground', () => {
    expect(Object.keys(ALLOWED_UNGATED).length).toBeLessThanOrEqual(8);
    for (const [file, why] of Object.entries(ALLOWED_UNGATED)) {
      expect(fs.existsSync(path.join(API_ROOT, file)), `${file} missing`).toBe(true);
      expect(why.length).toBeGreaterThan(20);
    }
  });

  it('no outreach template carries a literal 80G promise any more', () => {
    const dir = path.join(API_SRC, 'templates/outreach');
    const templates = fs.readdirSync(dir);
    // 31 template files today; the guard is that we actually read some.
    expect(templates.length).toBeGreaterThan(20);
    for (const name of templates) {
      const body = fs.readFileSync(path.join(dir, name), 'utf8');
      expect(EIGHTY_G.test(stripComments(body)), `${name} names 80G literally`).toBe(false);
    }
  });
});

describe('TC-01 — the bytes that actually leave the building', () => {
  const LEAD = { id: 'lead_1', name: 'Ramesh', city: 'Mathura' };

  it('the gaushala first-touch email body (en) sells a receipt, not a deduction', async () => {
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('gaushala_first_touch.en.html', {
      leadId: LEAD.id,
      name: LEAD.name,
      city: LEAD.city,
      personalizedOpener: 'Saw your gaushala listed with the Animal Welfare Board.',
    });
    // A template that failed to render would make every negative vacuous.
    expect(html.length).toBeGreaterThan(800);
    expect(html).toContain(LEAD.city);
    expect(html).toContain('darshya.online/gaushala');
    expect(html).not.toMatch(EIGHTY_G_PROMISE);
    expect(html).toMatch(/not a tax-exemption certificate/i);
    // And no placeholder survived unrendered.
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });

  it('the gaushala first-touch email body (hi) sells a receipt, not a deduction', async () => {
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('gaushala_first_touch.hi.html', {
      leadId: LEAD.id,
      name: LEAD.name,
      city: LEAD.city,
      personalizedOpener: 'नमस्ते',
    });
    expect(html.length).toBeGreaterThan(800);
    expect(html).not.toMatch(EIGHTY_G_PROMISE);
    expect(html).toMatch(/tax-exemption certificate nahi/i);
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });

  it('the 3-day follow-up email body sells a receipt, not a deduction', async () => {
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('gaushala_followup_3day.html', {
      leadId: LEAD.id,
      name: LEAD.name,
      city: LEAD.city,
    });
    expect(html.length).toBeGreaterThan(600);
    expect(html).not.toMatch(EIGHTY_G_PROMISE);
    expect(html).toMatch(/tax-exemption certificate nahi/i);
    expect(html).not.toMatch(/\{\{\w+\}\}/);
  });

  it('the gaushala WhatsApp message sells a receipt, not a deduction', async () => {
    const { renderWhatsappMessage } = await import('../services/outreach.service.js');
    const text = renderWhatsappMessage('gaushala_first_touch', {
      leadId: LEAD.id,
      name: LEAD.name,
      city: LEAD.city,
    });
    expect(text).not.toBeNull();
    expect(text!.length).toBeGreaterThan(150);
    // WhatsApp truncates at 1000; the disclosure must survive the slice.
    expect(text!.length).toBeLessThanOrEqual(1000);
    expect(text).toContain('darshya.online/gaushala');
    expect(text).not.toMatch(EIGHTY_G_PROMISE);
    expect(text).toMatch(/proof of payment/i);
    expect(text).not.toMatch(/\{\{\w+\}\}/);
  });

  it('a caller cannot override the honesty gate through variables', async () => {
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('gaushala_first_touch.en.html', {
      leadId: LEAD.id,
      name: LEAD.name,
      city: LEAD.city,
      personalizedOpener: 'x',
      // A caller trying to put the promise back.
      receiptFeatureEn: 'automatic 80G receipt generation',
      receiptLineEn: 'Every donation gets an 80G tax receipt.',
    });
    expect(html).not.toMatch(EIGHTY_G_PROMISE);
    expect(html).toMatch(/not a tax-exemption certificate/i);
  });

  // The cs005 ops mailer lives outside tsconfig's rootDir (`src`), so its
  // cases are in scripts/ops/__tests__/cs005-outbound-honesty.tc01.test.ts.
});

describe('TC-01 — the API stopped serving the promise', () => {
  it('GET /gaushala/plans advertises a receipt, not a tax deduction', async () => {
    const { gaushalaService } = await import('../services/gaushala.service.js');
    const plans = gaushalaService.getAdoptionPlans();
    // Four tiers today; the guard is that we did not assert over an empty list.
    expect(plans.length).toBeGreaterThanOrEqual(4);
    const blob = JSON.stringify(plans);
    expect(blob.length).toBeGreaterThan(500);
    expect(blob).not.toMatch(EIGHTY_G);
    // The receipt itself is still promised — this is a correction, not a cut.
    const annual = plans.find((p) => p.id === 'plan_annual');
    const lifetime = plans.find((p) => p.id === 'plan_lifetime');
    expect(annual?.features.join(' ')).toMatch(/not a tax-exemption certificate/i);
    expect(lifetime?.features.join(' ')).toMatch(/not a tax-exemption certificate/i);
  });
});

describe('TC-01 — it is a gate, not a deletion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.doUnmock('../lib/eighty-g.js');
    vi.doUnmock('./eighty-g.js');
    vi.resetModules();
  });

  async function withVerifiedRegistration(): Promise<void> {
    const actual = await vi.importActual<typeof import('./eighty-g.js')>('./eighty-g.js');
    const patched = {
      ...actual,
      HAS_80G: true,
      HAS_CSR1: true,
      RECEIPT_NOUN: '80G tax receipt',
      COMPLIANCE_LINE: 'Bhaktisetu Foundation: active 80G + CSR-1 in India',
    };
    vi.doMock('./eighty-g.js', () => patched);
    vi.doMock('../lib/eighty-g.js', () => patched);
    vi.doMock('../../src/lib/eighty-g.js', () => patched);
    vi.resetModules();
  }

  it('the adoption plans get their 80G feature back', async () => {
    await withVerifiedRegistration();
    const { gaushalaService } = await import('../services/gaushala.service.js');
    const blob = JSON.stringify(gaushalaService.getAdoptionPlans());
    expect(blob).toMatch(/80G tax receipt/);
    expect(blob).not.toMatch(/not a tax-exemption certificate/i);
  });

  it('the outreach email body gets its 80G sentence back', async () => {
    await withVerifiedRegistration();
    const { renderEmailTemplate } = await import('../services/outreach.service.js');
    const html = renderEmailTemplate('gaushala_first_touch.en.html', {
      leadId: 'lead_3',
      name: 'Ramesh',
      city: 'Mathura',
      personalizedOpener: 'x',
    });
    expect(html).toMatch(/automatic 80G receipt generation/);
    expect(html).not.toMatch(/not a tax-exemption certificate/i);
  });

});
