import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Razorpay has told us (account dashboard, 2026-10) that this business type is
 * not supported for international card payments; PayPal is activated but takes
 * foreign-currency orders only, and the site creates INR orders. So no page may
 * say that foreign / international cards are accepted. They may say they are
 * "coming soon". Refund-timing notes ("international cards can take longer")
 * do not claim acceptance and are allowed.
 */
const ROOTS = ['app', 'lib', 'components'].map((d) => join(__dirname, '..', d));
const MOBILE = join(__dirname, '..', '..', 'mobile', 'app');

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (n === 'node_modules' || n === '__tests__') continue;
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|md)$/.test(n) && !/\.test\./.test(n)) out.push(p);
  }
  return out;
}

const BANNED = [
  /international cards? (are |is )?accepted/i,
  /international cards? work/i,
  /accepts? international cards?/i,
  /cards? (are )?accepted (and|through|via)/i,
  /(canadian|uk|us|foreign) cards? (are )?accepted/i,
  /card issuer allows international/i,
  /international .{0,25}cards? (are )?accepted too/i,
  /bank (applies|converts)[^.]{0,40}(rate|conversion)/i,
];

describe('no page claims foreign cards are accepted', () => {
  const files = [...ROOTS.flatMap((r) => walk(r)), ...(readdirSync(MOBILE) ? walk(MOBILE) : [])];
  it('scans a meaningful number of files', () => expect(files.length).toBeGreaterThan(300));
  it('contains none of the banned claims', () => {
    const hits: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      for (const re of BANNED) {
        const m = src.match(re);
        if (m) hits.push(`${f.split('bhaktisetu/')[1]}: ${m[0]}`);
      }
    }
    expect(hits).toEqual([]);
  });
});
