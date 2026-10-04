import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * TC-01 / TC-08 guard — a surface may not hardcode a tax-deduction promise or
 * a pandit-vetting claim outside the honesty gates.
 *
 * TC-01: `COMPANY.donationLegal.HAS_80G_VERIFIED` is false (no donee 80G number
 * and no PAN on file). Any sentence that promises deductibility must sit behind
 * the gate (`HAS_80G`, `withEightyG`, `HAS_80G_VERIFIED`, `RECEIPT_NOUN*`) or be
 * an explicit denial. The older repo-wide test only checked that a FILE imports
 * the gate, which let /nri/ca and /for-temple-chains keep an ungated "tax-aware
 * receipts" and "tax-deductibility roadmap" next to a gated sibling.
 *
 * TC-08: nothing in the repository verifies a pandit (no credential check, no
 * two temple references, no probation, no per-pandit trust score; the only
 * step that runs is the Aadhaar KYC payout gate). The adjective "verified" /
 * "vetted" / "Aadhaar-verified" on a pandit or priest is a vetting claim.
 *
 * Comments are stripped before every scan so the notes that quote a removed
 * phrase neither trip nor satisfy the guard.
 */
const WEB = path.resolve(__dirname, '..');
// `.vercel` is build output from a retired deploy target; it is git-ignored, so CI never has it, but a
// developer machine can, and the scan then "finds" claims in generated prerender JSON.
const SKIP = new Set(['node_modules', '.next', '.turbo', '.vercel', 'coverage', 'playwright-report', 'test-results', '__tests__', 'e2e']);

function files(): string[] {
  const out: string[] = [];
  (function walk(dir: string) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP.has(e.name)) walk(path.join(dir, e.name));
      } else if (/\.(tsx?|json)$/.test(e.name) && !e.name.includes('.test.')) {
        out.push(path.join(dir, e.name));
      }
    }
  })(WEB);
  return out;
}

const stripComments = (s: string) =>
  s
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

function code(abs: string): string {
  return stripComments(fs.readFileSync(abs, 'utf8'));
}

const rel = (abs: string) => path.relative(WEB, abs).split(path.sep).join('/');

const TAX_PROMISE =
  /tax[-\s](deduct|aware|receipt|exempt|benefit|saving|relief)|deductib(le|ility)|save on income tax|80G[-\s]?(receipt|eligible|valid|tax|pdf|donation)/i;
const GATE = /HAS_80G|HAS_VERIFIED_80G|withEightyG|RECEIPT_NOUN|has80G|eighty-g/;
const DENIAL = /\b(not|cannot|can't|no|nor|neither|denies|proof of payment|not yet|Not today)\b/i;

/** Files whose 80G wording is a string table or a denial by design. */
const TAX_ALLOWED = new Set([
  'lib/i18n/en.json', // keys render only behind the gate
  'lib/help-articles.ts', // the article that DENIES eligibility
  'lib/products.ts', // "80g" is 80 grams
  'lib/eighty-g.ts',
  'lib/company.ts',
]);

describe('TC-01 — no tax-deduction promise outside the gate', () => {
  it('scans a real file set', () => {
    expect(files().length).toBeGreaterThan(300);
  });

  it('every promise line is gated within a few lines or is a denial', () => {
    const offenders: string[] = [];
    for (const abs of files()) {
      const r = rel(abs);
      if (TAX_ALLOWED.has(r)) continue;
      const lines = code(abs).split('\n');
      lines.forEach((line, i) => {
        if (!TAX_PROMISE.test(line)) return;
        const window = lines.slice(Math.max(0, i - 8), i + 3).join('\n');
        if (GATE.test(window) || DENIAL.test(line) || /slug:/.test(line)) return;
        offenders.push(`${r}:${i + 1}: ${line.trim().slice(0, 120)}`);
      });
    }
    expect(offenders).toEqual([]);
  });
});

/** Adjectives that assert a pandit was checked. */
const VETTING_ADJ =
  /\b(verified|vetted|aadhaar[-\s]verified|aadhaar[-\s]authenticated|hand-picked)\s+(vedic\s+)?(pandit|priest)/i;
const VETTING_STEPS =
  /vetted\s+(vedic\s+)?(pandit|priest)|aadhaar[-\s]verified\s+(providers?|pandits?|priests?)|pandits? (are|is) (verified|vetted|reviewed)|each pandit is reviewed/i;

describe('TC-08 — no unbacked pandit-vetting claim in apps/web', () => {
  it('prints no "verified/vetted pandit|priest" adjective', () => {
    const offenders: string[] = [];
    for (const abs of files()) {
      const r = rel(abs);
      code(abs)
        .split('\n')
        .forEach((line, i) => {
          if (VETTING_ADJ.test(line) || VETTING_STEPS.test(line))
            offenders.push(`${r}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
    }
    expect(offenders).toEqual([]);
  });

  it('prints no localised "verified pandit" in the regional pages', () => {
    const LOCAL: Array<[string, RegExp]> = [
      ['app/hi/page.tsx', /सत्यापित पंडित/],
      ['app/mr/page.tsx', /पडताळलेले पंडित/],
      ['app/mr/pune/page.tsx', /पडताळलेले पंडित/],
      ['app/bn/page.tsx', /যাচাইকৃত পণ্ডিত/],
      ['app/te/page.tsx', /ధృవీకరించబడిన పండిత్/],
      ['app/te/hyderabad/page.tsx', /ధృవీకరించబడిన పండితులు/],
      ['app/ta/page.tsx', /சரிபார்க்கப்பட்ட பண்டிதர்/],
      ['app/ta/chennai/page.tsx', /சரிபார்க்கப்பட்ட பண்டிதர்கள்/],
    ];
    for (const [f, re] of LOCAL) expect(code(path.join(WEB, f))).not.toMatch(re);
  });

  it('the comment stripper removes comments only', () => {
    expect(VETTING_ADJ.test('<p>Book verified pandits</p>')).toBe(true);
    expect(VETTING_ADJ.test(stripComments('{/* verified pandits */}\n// verified pandits'))).toBe(false);
  });
});
