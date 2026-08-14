import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// PJ-02 (P0, trust). The supply-acquisition pages recruit providers, so a claim
// here is the most expensive kind to get wrong: the GTM plan prices pandit
// acquisition at Rs 2,500-4,500 and warns that one wronged pandit poisons an
// entire temple network.
//
// /become-priest carried three claims the product could not honour:
//   "Money in your bank account every Monday"  — no transfer rail exists
//   "Earn 60-80% of every booking"             — the shipped share is a flat 80%
//   "Join 200+ verified pandits"               — the database holds 3
//
// This locks the corrections and generalises: no supply page may invent a
// provider headcount, and none may promise automatic bank credit until the
// RazorpayX/Cashfree rail is actually live.

const WEB = path.resolve(__dirname, '..');

const SUPPLY_PAGES = [
  'app/become-priest/page.tsx',
  'app/become-astrologer/page.tsx',
  'app/become-wellness/page.tsx',
  'app/become-gurukul/page.tsx',
  'app/list-temple/page.tsx',
  'app/list-gaushala/page.tsx',
].filter((p) => fs.existsSync(path.join(WEB, p)));

/** Strip comments so a file documenting a banned claim doesn't trip its own guard. */
function code(file: string): string {
  return fs
    .readFileSync(path.join(WEB, file), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('PJ-02 — /become-priest states only what the product can honour', () => {
  const src = () => code('app/become-priest/page.tsx');

  it('does not promise money in the bank every Monday', () => {
    expect(src()).not.toMatch(/every Monday/i);
    expect(src()).not.toMatch(/bank account every/i);
  });

  it('does not quote a 60-80% range — the share is a flat 80%', () => {
    expect(src()).not.toMatch(/60\s*[-–]\s*80\s*%/);
  });

  it('states the real 80% provider share', () => {
    expect(src()).toMatch(/80%/);
  });

  it('does not claim a pandit headcount the database cannot support', () => {
    // 3 priests exist, all seed rows. Any "N+ pandits" claim is fabricated.
    expect(src()).not.toMatch(/\d{2,}\+\s*(verified\s+)?pandits/i);
  });

  it('describes payout as requested and manually transferred, not automatic', () => {
    expect(src()).toMatch(/request a payout/i);
  });
});

describe('PJ-02 — no supply page invents supply or promises an absent rail', () => {
  it.each(SUPPLY_PAGES)('%s makes no fabricated headcount claim', (file) => {
    // Catches "200+ verified pandits", "500+ temples", "1000+ astrologers".
    expect(code(file)).not.toMatch(
      /\b\d{2,}\+\s*(verified\s+)?(pandits|priests|temples|astrologers|instructors|gaushalas|gurukuls)\b/i,
    );
  });

  it.each(SUPPLY_PAGES)('%s promises no automatic weekly bank credit', (file) => {
    const s = code(file);
    expect(s).not.toMatch(/every Monday/i);
    // "weekly payouts" implies a guaranteed schedule the rail cannot deliver.
    expect(s).not.toMatch(/(earn|get paid|paid)\s+weekly/i);
  });
});
