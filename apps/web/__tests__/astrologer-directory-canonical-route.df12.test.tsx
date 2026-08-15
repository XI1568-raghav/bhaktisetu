import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * DF-12, the routing half.
 *
 * The sweep (docs/audit/prod-sweep-raw-2026-08-12.md:133) recorded two symptoms
 * under one finding. The detail-page half is closed: app/astrology/view/page.tsx
 * is now a loading | ready | missing state machine and an unknown id renders
 * "This astrologer profile is not available" instead of an eternal spinner.
 *
 * This is the other half, quoted verbatim from the sweep:
 *
 *   "/astrology/astrologers 307-redirects to /astrology/view?id=astrologers,
 *    treating the path segment 'astrologers' as an astrologer id ... the
 *    astrologer directory has no reachable canonical URL, so the 'Talk to an
 *    Astrologer' journey has a broken entry point."
 *
 * The cause is route precedence, not a redirect rule: there is no
 * app/astrology/astrologers/page.tsx, so `/astrology/astrologers` falls through
 * to the catch-all app/astrology/[id]/page.tsx with id="astrologers", which
 * redirects into the id-based profile view. Adding the static segment claims the
 * URL back, because a static app-router segment always outranks a sibling
 * dynamic one.
 *
 * It renders the directory (the sweep's own words: "so it renders the directory
 * rather than redirecting into the id-based view") from the SAME client
 * component /astrology/astrologers/live uses, so the two routes can never drift
 * into showing different astrologers, and declares /live as the canonical so the
 * pair is one indexable URL rather than the duplicate-content defect DF-04 filed
 * against the temple list.
 */

const APP = join(process.cwd(), 'app', 'astrology');
const DIRECTORY_PAGE = join(APP, 'astrologers', 'page.tsx');
const LIVE_PAGE = join(APP, 'astrologers', 'live', 'page.tsx');
const LIVE_CLIENT = join(APP, 'astrologers', 'live', 'LiveAstrologersClient.tsx');

function read(p: string): string {
  return readFileSync(p, 'utf8');
}

/** Comments are documentation, not behaviour — never let a guard match its own prose. */
function code(p: string): string {
  return read(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

describe('DF-12 — /astrology/astrologers is a reachable directory entry point', () => {
  it('the app-router segment exists, so the URL no longer falls through to [id]', () => {
    expect(
      existsSync(DIRECTORY_PAGE),
      `missing route: ${DIRECTORY_PAGE} — without it /astrology/astrologers is matched by app/astrology/[id]/page.tsx as id="astrologers"`,
    ).toBe(true);
  });

  it('serves the real directory, never the id-based profile view', () => {
    const src = code(DIRECTORY_PAGE);
    expect(src, 'must render the live-directory client').toContain('LiveAstrologersClient');
    expect(src, 'must not route into the id-based view').not.toContain('/astrology/view?id=');
  });

  it('is an alias, not a second indexed directory', () => {
    const src = code(DIRECTORY_PAGE);
    // /astrology/astrologers/live stays the one indexed URL for this list.
    expect(src, 'the alias must be noindex').toMatch(/\bindex\s*:\s*false/);
    expect(src, 'its astrologer links must still be crawlable').toMatch(/\bfollow\s*:\s*true/);
  });

  it('reuses the one directory component instead of a second copy of the list', () => {
    const src = code(DIRECTORY_PAGE);
    expect(existsSync(LIVE_CLIENT), `missing component: ${LIVE_CLIENT}`).toBe(true);
    expect(src).toMatch(/from\s+'\.\/live\/LiveAstrologersClient'/);
    expect(existsSync(LIVE_PAGE), `missing route: ${LIVE_PAGE}`).toBe(true);
  });

  it('invents no astrologer of its own', () => {
    const src = code(DIRECTORY_PAGE);
    for (const invented of ['Raghunath', 'Bhaskar Rao', 'Meera Devi', 'Vikram Joshi']) {
      expect(src, `must not hardcode "${invented}"`).not.toContain(invented);
    }
    expect(src).not.toMatch(/astro_0\d\d/);
  });
});
