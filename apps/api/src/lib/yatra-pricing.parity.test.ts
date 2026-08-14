import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { YATRA_TIER_PRICE_INR, computeYatraTotalInr } from './yatra-pricing.js';

// COM-05 drift guard. The web catalogue quotes the price; the API charges it.
// The dominant defect class in this codebase is one side of a contract moving
// and the other staying put, so this test reads the consumer catalogue source
// and fails the moment the two disagree. If a package price genuinely changes,
// change it in BOTH places — this test tells you which one you forgot.

const WEB_DATA = resolve(__dirname, '../../../web/lib/yatra-data.ts');

function parseWebCatalogue(): Record<string, Record<string, number>> {
  const src = readFileSync(WEB_DATA, 'utf8');
  const out: Record<string, Record<string, number>> = {};
  let current = '';
  for (const line of src.split(/\r?\n/)) {
    const slug = line.match(/^\s*slug:\s*'([^']+)',\s*$/);
    if (slug?.[1]) {
      current = slug[1];
      out[current] = {};
      continue;
    }
    const tier = line.match(/tier:\s*'([^']+)'/);
    const price = line.match(/price:\s*(\d+)/);
    const bucket = current ? out[current] : undefined;
    if (tier?.[1] && price?.[1] && bucket) bucket[tier[1]] = Number(price[1]);
  }
  return out;
}

describe('yatra pricing — API charge table matches the web catalogue', () => {
  it('finds the web catalogue file', () => {
    expect(existsSync(WEB_DATA)).toBe(true);
  });

  it('parses at least the 9 shipped packages', () => {
    const web = parseWebCatalogue();
    const withTiers = Object.entries(web).filter(([, t]) => Object.keys(t).length === 3);
    expect(withTiers.length).toBeGreaterThanOrEqual(9);
  });

  it('quotes exactly what it charges, per slug and tier', () => {
    const web = parseWebCatalogue();
    for (const [slug, tiers] of Object.entries(web)) {
      if (Object.keys(tiers).length !== 3) continue;
      const apiTiers = YATRA_TIER_PRICE_INR[slug];
      expect(apiTiers, `API price table is missing '${slug}'`).toBeDefined();
      for (const [tier, price] of Object.entries(tiers)) {
        expect(
          apiTiers?.[tier as 'economy' | 'standard' | 'premium'],
          `${slug}/${tier}: web quotes ₹${price}`,
        ).toBe(price);
      }
    }
  });

  it('has no API-only package the catalogue does not sell', () => {
    const web = parseWebCatalogue();
    for (const slug of Object.keys(YATRA_TIER_PRICE_INR)) {
      expect(web[slug], `API prices '${slug}' but the catalogue has no such yatra`).toBeDefined();
    }
  });
});

describe('computeYatraTotalInr', () => {
  it('multiplies per-person price by head count', () => {
    const r = computeYatraTotalInr('vaishno-devi', 'economy', 4);
    expect(r).toEqual({ ok: true, perPersonInr: 8500, travelersCount: 4, totalInr: 34000 });
  });

  it('refuses an unknown slug', () => {
    expect(computeYatraTotalInr('nope', 'economy', 1)).toEqual({
      ok: false,
      reason: 'unknown_package',
    });
  });

  it('refuses a zero/negative head count', () => {
    expect(computeYatraTotalInr('char-dham', 'premium', 0).ok).toBe(false);
    expect(computeYatraTotalInr('char-dham', 'premium', -2).ok).toBe(false);
  });
});
