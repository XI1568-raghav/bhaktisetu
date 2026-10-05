import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * apps/mobile has no USD / NRI pricing: every amount is INR. An international
 * devotee must not be left to assume that is the price they would pay, so the
 * booking quote screen says, in one line, that darshya.online shows USD pricing.
 *
 * The note is only honest while mobile really has no USD support. If someone
 * adds nri-pricing to the app, this test fails and the note must be revisited.
 */
const ROOT = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    if (f === 'node_modules' || f === '__tests__' || f.startsWith('.')) continue;
    const p = path.join(dir, f);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

describe('mobile booking quote: INR-only disclosure', () => {
  it('mobile has no nri-pricing module (so the INR-only note is truthful)', () => {
    const files = [...walk(path.join(ROOT, 'app')), ...walk(path.join(ROOT, 'lib'))];
    const withNriPricing = files.filter((f) => /nri-pricing/.test(readFileSync(f, 'utf8')));
    expect(withNriPricing).toEqual([]);
  });

  it('the puja booking screen tells international devotees USD pricing is on the website', () => {
    const src = readFileSync(path.join(ROOT, 'app/(devotee)/puja-book.tsx'), 'utf8');
    expect(src).toContain('inr-only-note');
    expect(src).toContain('Prices here are in INR.');
    expect(src).toContain('International devotees can book on');
    expect(src).toContain('to see USD pricing');
  });
});
