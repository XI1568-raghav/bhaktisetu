import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Portal pages are served as static files (no RSC payload). A router.replace/push inside a
 * useEffect asks the server for one, Next treats the HTML answer as "do a full page load",
 * and the effect runs again after the reload: an endless reload loop (seen on Next 16,
 * /priest/bookings, 2026-10-27). Query-string state on these pages must use the History API.
 */
describe('static-shell pages never navigate the router from an effect', () => {
  it('/priest/bookings syncs its tab with history.replaceState', () => {
    const src = readFileSync(join(process.cwd(), 'app/priest/bookings/page.tsx'), 'utf8');
    expect(src).toMatch(/window\.history\.replaceState/);
    expect(src).not.toMatch(/router\.(replace|push)\(/);
  });
});
