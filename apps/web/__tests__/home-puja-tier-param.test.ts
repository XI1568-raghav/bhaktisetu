import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// PF-01 (second half). The four CTAs on every /pujas/home-puja/[slug] page are
// "Book Now", "Choose basic", "Choose standard" and "Choose premium". The first
// half of this finding was that /pujas/home-puja/[slug]/book did not exist at
// all, so all 32 CTAs 404'd. That shim now exists and forwards ?tier=.
//
// The half that survived: the wizard hardcoded useState('standard'), so the
// forwarded tier was discarded. A devotee clicking "Choose premium" on Griha
// Pravesh landed on the standard package and was quoted the standard price —
// a different number from the one they clicked. Both launch SKUs affected.
//
// These are source-level assertions because the wizard is a 660-line client
// component whose render path needs the full Next router; the contract worth
// protecting is narrow and mechanical — the shim must forward the tier, and the
// wizard must seed its state from it rather than from a literal.

const WEB = path.resolve(__dirname, '..');
const read = (p: string) => fs.readFileSync(path.join(WEB, p), 'utf8');

const SHIM = 'app/pujas/home-puja/[slug]/book/page.tsx';
// PF-10 split the route: page.tsx is now the server guard that 404s an unknown
// slug, and the wizard this suite inspects moved beside it. Same component,
// same assertions — only the filename changed.
const WIZARD = 'app/pujas/home-puja/book/BookHomePujaClient.tsx';

describe('PF-01 — the at-home funnel carries the chosen tier end to end', () => {
  it('the slug route exists so the CTAs do not 404', () => {
    expect(fs.existsSync(path.join(WEB, SHIM))).toBe(true);
  });

  it('the shim forwards tier as well as slug', () => {
    const src = read(SHIM);
    expect(src).toContain('tier');
    expect(src).toMatch(/tier=\$\{encodeURIComponent\(tier\)\}/);
  });

  it('the wizard seeds its tier from the query string, not a literal', () => {
    const src = read(WIZARD);
    // The defect: useState<...>('standard') with no reference to the param.
    expect(src).not.toMatch(/useState<'basic' \| 'standard' \| 'premium'>\('standard'\)/);
    expect(src).toMatch(/useState<PujaTier>\(\(\) => readTier\(searchParams\.get\('tier'\)\)\)/);
  });

  it('readTier accepts the three real tiers and falls back safely', () => {
    // Mirror of the wizard's guard — an unknown or absent tier must not crash
    // or select a package the devotee never chose.
    const TIERS = ['basic', 'standard', 'premium'] as const;
    const readTier = (raw: string | null) =>
      (TIERS as readonly string[]).includes(raw ?? '') ? raw : 'standard';

    expect(readTier('basic')).toBe('basic');
    expect(readTier('standard')).toBe('standard');
    expect(readTier('premium')).toBe('premium');
    expect(readTier(null)).toBe('standard');
    expect(readTier('')).toBe('standard');
    expect(readTier('enterprise')).toBe('standard');
    expect(readTier('PREMIUM')).toBe('standard'); // case-sensitive by design
  });

  it('the wizard prices from the selected tier', () => {
    expect(read(WIZARD)).toContain('category.pricing[tier]');
  });
});
