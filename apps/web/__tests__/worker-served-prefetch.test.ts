import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { linkPrefetch } from '../lib/worker-served-routes';

const WEB = join(__dirname, '..');
const cfg = JSON.parse(readFileSync(join(WEB, 'scripts/cf-static-pages.json'), 'utf8')) as {
  isrStaticRoutes: { routes: string[] };
};

describe('links to Worker-served routes are not prefetched (a prefetch is a Worker invocation)', () => {
  it.each(['/pujas', '/store', '/today', '/panchang', '/donations', '/astrology', '/panchang/delhi?x=1', '/store/some-handle#a'])(
    '%s turns prefetch off',
    (href) => {
      expect(linkPrefetch(href)).toBe(false);
    },
  );

  it.each(['/', '/temples', '/discover', '/festival', '/calendar/october', '/astrology/rahu-kalam', '/profile', '/dashboard', '/gift'])(
    '%s keeps the default prefetch',
    (href) => {
      expect(linkPrefetch(href)).toBeUndefined();
    },
  );

  it('never lists a route the build copies to assets', () => {
    for (const route of cfg.isrStaticRoutes.routes) {
      expect(linkPrefetch(route), route).toBeUndefined();
    }
  });

  it('the persistent mobile navigation uses it', () => {
    expect(readFileSync(join(WEB, 'components/MobileBottomTabs.tsx'), 'utf8')).toMatch(/prefetch=\{linkPrefetch\(tab\.href\)\}/);
    expect(readFileSync(join(WEB, 'components/MobileNavV2.tsx'), 'utf8')).toMatch(/prefetch=\{linkPrefetch\(item\.href\)\}/);
  });
});
