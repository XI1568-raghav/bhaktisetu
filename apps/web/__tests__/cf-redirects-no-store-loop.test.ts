import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * QA 2026-10-22: "Ordering from store" ended in ERR_TOO_MANY_REDIRECTS. The old
 * static-host _redirects had `/store/:handle /store/view?handle=:handle 302`
 * plus `/store/cart /store/cart 200` pairs. Workers static assets cannot do 200
 * rewrites and answer redirects before the Worker, so /store/cart 302'd to
 * /store/view?handle=cart (and a self-targeting rule loops). Every store route is a
 * real Next route now; this pins the file so no such rule returns.
 */
const rules = readFileSync(join(__dirname, '../public/_redirects'), 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => l.split(/\s+/));

describe('public/_redirects', () => {
  it('has no 200 rewrites, no splats into /view pages, and no self-redirects', () => {
    for (const [from, to, status] of rules) {
      expect(status, `${from} must be a real redirect`).toMatch(/^30[1278]$/);
      expect(to, `${from} must not target a ?handle=/?id= view page`).not.toMatch(/\/view\b/);
      expect(from).not.toContain(':');
      expect(to.split('?')[0]).not.toBe(from);
    }
  });
  it('never touches /store, /yatra or /pujas routes', () => {
    expect(rules.filter(([from]) => /^\/(store|yatra|pujas)/.test(from!))).toEqual([]);
  });
});
