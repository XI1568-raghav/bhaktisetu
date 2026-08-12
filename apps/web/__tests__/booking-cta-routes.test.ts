import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * PF-01 (2026-08-12, P0) — and the second time this exact bug has shipped.
 *
 * Detail pages link to path-style booking URLs like `/pujas/{slug}/book`, but
 * the wizards live at query-style URLs and read the slug from search params. A
 * thin redirect shim bridges the two. When the shim is missing, EVERY booking
 * CTA on that funnel 404s — silently, because the detail page itself is 200 and
 * nothing fails until a customer clicks.
 *
 *   - It happened first on the temple funnel; the surviving shim at
 *     app/pujas/[slug]/book/page.tsx still carries the note
 *     "Without this route those CTAs 404'd".
 *   - It happened again on the at-home funnel: all 8 ceremonies × 4 CTAs
 *     ("Book Now", "Choose basic/standard/premium") pointed at
 *     /pujas/home-puja/{slug}/book, which did not exist. That segment is the
 *     first hero card on /pujas and carries both launch SKUs, so the entire
 *     at-home business was unbookable.
 *
 * A unit test cannot click a CTA, but it CAN assert the shim files exist and
 * still forward the params the CTAs depend on. That is enough to catch a third
 * occurrence at commit time rather than in production.
 */

const WEB = join(process.cwd(), 'app');

const SHIMS = [
  {
    label: 'temple puja funnel',
    shim: join(WEB, 'pujas', '[slug]', 'book', 'page.tsx'),
    wizard: join(WEB, 'pujas', 'book', 'page.tsx'),
    forwards: ['slug', 'temple'],
  },
  {
    label: 'at-home pandit funnel',
    shim: join(WEB, 'pujas', 'home-puja', '[slug]', 'book', 'page.tsx'),
    wizard: join(WEB, 'pujas', 'home-puja', 'book', 'page.tsx'),
    forwards: ['slug', 'tier'],
  },
];

describe('booking CTA redirect shims', () => {
  for (const { label, shim, wizard, forwards } of SHIMS) {
    describe(label, () => {
      it('the shim route exists — without it every booking CTA on this funnel 404s', () => {
        expect(existsSync(shim), `missing redirect shim: ${shim}`).toBe(true);
      });

      it('the wizard it redirects to exists', () => {
        expect(existsSync(wizard), `missing wizard: ${wizard}`).toBe(true);
      });

      it('redirects rather than rendering, so the URL is bookmarkable', () => {
        const src = readFileSync(shim, 'utf8');
        expect(src).toMatch(/redirect\(/);
      });

      it(`forwards ${forwards.join(' + ')} so the customer's choice is not dropped`, () => {
        const src = readFileSync(shim, 'utf8');
        for (const param of forwards) {
          // Each param must be both READ from the incoming URL and written into
          // the target — forwarding only the slug silently discards the tier the
          // customer picked and lands them on the default package.
          expect(src, `${label}: shim never reads "${param}"`).toContain(param);
        }
      });
    });
  }
});
