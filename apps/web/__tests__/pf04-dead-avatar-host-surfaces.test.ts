import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * PF-04 — the surfaces that still paint a dead avatar URL as a broken image.
 *
 * `images.darshya.online` has no DNS record. `apps/api/prisma/seed.ts:920-921`
 * writes exactly two URLs on that host into `priests.avatar_url`:
 *
 *   https://images.darshya.online/priests/pandit-ramesh-shastri.jpg
 *   https://images.darshya.online/priests/pandit-suresh-trivedi.jpg
 *
 * and they are the ONLY two references to that host in the whole seed (verified
 * by regex over seed.ts, 2026-08-19: 2 matches, 2 distinct URLs). Registering
 * the DNS record is owner-gated — and, on its own, would not even fix the
 * image, because no origin serves `/priests/*.jpg`. The code-level obligation is
 * therefore the fallback, not the hostname.
 *
 * `app/pujas/PanditAvatar.tsx` is that fallback: it swaps to an initials tile on
 * `onError` and removes the `<img>` so there is no request loop.
 * `__tests__/pf04-pandit-avatar-fallback.test.tsx` proves it works and pins the
 * two pages the finding named (`/pujas/marriage`, `/pujas/home-puja/[slug]`).
 *
 * COVERAGE IS NOT COMPLETE. Five other surfaces render an avatar behind a
 * FALSY-only guard — `{x.avatarUrl ? <img src={x.avatarUrl}/> : <initials/>}` —
 * which a present-but-dead URL walks straight past, exactly the defect PF-04
 * described. Three of them read `Priest.avatarUrl`, the column that actually
 * holds the dead host, and two of those three are the public pandit directory:
 *
 *   app/pandits/page.tsx:35-45          priest.avatarUrl  ← dead host reaches this
 *   app/pandits/[id]/page.tsx:121-129   priest.avatarUrl  ← dead host reaches this
 *   app/priest/profile/page.tsx:306-311 profile.avatarUrl ← dead host reaches this
 *   app/profile/page.tsx:310-311        user.avatarUrl    (User rows, host not seeded there)
 *   components/NavAuthButton.tsx:67-68  user.avatarUrl    (User rows, host not seeded there)
 *
 * Those files are outside this pass's lane, so this test does not pretend they
 * are fixed. It freezes the list instead: a SIXTH unguarded avatar `<img>`
 * fails the build, and removing one of these five keeps passing. The
 * allowlist is a subset check, never an equality check, so whichever agent
 * routes `/pandits` through `PanditAvatar` does not have to come back and edit
 * this file.
 */

const WEB_ROOT = path.resolve(__dirname, '..');

/** Comments stripped, so the paragraph above cannot become an offender. */
function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === '__tests__') continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) tsxFiles(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/**
 * `<img>` tags whose `src` expression mentions an avatar field and which carry
 * no `onError`. A forwarding wrapper (`src={src}` inside PanditAvatar) does not
 * match, because its src expression names no avatar field — the guard has to
 * live where the dead URL is read, not where it is passed along.
 */
export function unguardedAvatarImgs(src: string): number {
  let n = 0;
  for (const m of stripComments(src).matchAll(/<img\s([\s\S]{0,900}?)\/>/g)) {
    const body = m[1]!;
    const srcExpr = /\bsrc=\{([\s\S]*?)\}/.exec(body)?.[1] ?? '';
    if (!/avatarUrl|avatar_url|photoUrl/i.test(srcExpr)) continue;
    if (/onError/.test(body)) continue;
    n += 1;
  }
  return n;
}

/**
 * The five surfaces measured on 2026-08-19 at 47064e6d. Repo-relative, posix.
 * This list may only shrink.
 */
const KNOWN_UNGUARDED = new Set<string>([
  'app/pandits/page.tsx',
  'app/pandits/[id]/page.tsx',
  'app/priest/profile/page.tsx',
  'app/profile/page.tsx',
  'components/NavAuthButton.tsx',
]);

function scan(): { file: string; count: number }[] {
  const files = [
    ...tsxFiles(path.join(WEB_ROOT, 'app')),
    ...tsxFiles(path.join(WEB_ROOT, 'components')),
  ];
  const out: { file: string; count: number }[] = [];
  for (const f of files) {
    const count = unguardedAvatarImgs(readFileSync(f, 'utf8'));
    if (count > 0) out.push({ file: path.relative(WEB_ROOT, f).split(path.sep).join('/'), count });
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

describe('PF-04 — no NEW surface paints an unguarded avatar', () => {
  it('the detector is not vacuous', () => {
    // Without this, "0 new offenders" would pass just as happily on a broken
    // regex as on a clean tree.
    expect(unguardedAvatarImgs('<img src={p.avatarUrl} alt="" />')).toBe(1);
    expect(unguardedAvatarImgs('<img src={p.avatarUrl} onError={f} alt="" />')).toBe(0);
    expect(unguardedAvatarImgs('<img src={src} alt="" />')).toBe(0);
    // A comment quoting the offending pattern is not an offender.
    expect(unguardedAvatarImgs('{/* <img src={p.avatarUrl} /> */}')).toBe(0);
    expect(unguardedAvatarImgs('// <img src={p.avatarUrl} />\n')).toBe(0);
  });

  it('still sees the surfaces it is meant to be watching', () => {
    // If a refactor moved every avatar behind a wrapper this drops to 0 and the
    // subset check below becomes vacuous — so say so out loud rather than
    // silently guarding nothing. Update KNOWN_UNGUARDED and delete this line
    // only when the count is genuinely 0 because the defect is genuinely gone.
    expect(scan().length).toBeGreaterThan(0);
  });

  it('no surface outside the recorded five renders an avatar without onError', () => {
    const fresh = scan().filter((o) => !KNOWN_UNGUARDED.has(o.file));
    expect(
      fresh,
      'this <img> reads an avatar URL behind a falsy-only guard, so a ' +
        'present-but-dead URL renders as a broken-image icon rather than ' +
        'falling back. Route it through app/pujas/PanditAvatar.tsx, which swaps ' +
        'to an initials tile on error and removes the <img> so there is no ' +
        'request loop.\n' +
        fresh.map((o) => `${o.file}: ${o.count}`).join('\n'),
    ).toEqual([]);
  });

  it('the two pages PF-04 named stay routed through PanditAvatar', () => {
    for (const rel of ['app/pujas/marriage/page.tsx', 'app/pujas/home-puja/[slug]/page.tsx']) {
      const src = readFileSync(path.join(WEB_ROOT, rel), 'utf8');
      expect(unguardedAvatarImgs(src), `${rel} regressed`).toBe(0);
      expect(stripComments(src), `${rel} no longer uses PanditAvatar`).toContain('PanditAvatar');
    }
  });
});
