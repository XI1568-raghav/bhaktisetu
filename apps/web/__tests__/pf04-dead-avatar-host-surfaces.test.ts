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
 *
 * 2026-08-28: it shrank to nothing. All five are now routed through
 * `components/AvatarWithFallback.tsx`, which carries the same one-way failed
 * state `app/pujas/PanditAvatar.tsx` uses and takes the per-surface fallback as
 * a prop, so the two pages that fell back to a `UserCircle`/`User` icon rather
 * than to initials keep their own presentation. The empty set now means the
 * subset check below is an absolute one: NO surface anywhere may paint an
 * avatar URL without an error path.
 */
const KNOWN_UNGUARDED = new Set<string>([]);

/**
 * The five surfaces the coverage gap named, plus the two the original finding
 * named. Each must READ its avatar through a guarded component rather than
 * merely contain no `<img>` — deleting the avatar entirely would satisfy the
 * negative check while removing the feature.
 */
const MUST_BE_GUARDED: { rel: string; via: string }[] = [
  { rel: 'app/pandits/page.tsx', via: 'AvatarWithFallback' },
  { rel: 'app/pandits/[id]/page.tsx', via: 'AvatarWithFallback' },
  { rel: 'app/priest/profile/page.tsx', via: 'AvatarWithFallback' },
  { rel: 'app/profile/page.tsx', via: 'AvatarWithFallback' },
  { rel: 'components/NavAuthButton.tsx', via: 'AvatarWithFallback' },
  { rel: 'app/pujas/marriage/page.tsx', via: 'PanditAvatar' },
  { rel: 'app/pujas/home-puja/[slug]/page.tsx', via: 'PanditAvatar' },
];

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

  /**
   * REPLACES 'still sees the surfaces it is meant to be watching', which
   * asserted `scan().length > 0` so that an empty allowlist could not make the
   * subset check vacuous. Now that the count is legitimately 0, that guard
   * would fail on the fixed tree — its own comment said to delete it "only when
   * the count is genuinely 0 because the defect is genuinely gone".
   *
   * The anti-vacuity job moves here and gets stronger: instead of requiring
   * that offenders still exist, it requires that each named surface still READS
   * an avatar and reads it through a guarded component. Deleting the avatar
   * would have satisfied the old negative check; it fails this one.
   */
  it.each(MUST_BE_GUARDED)('$rel routes its avatar through $via', ({ rel, via }) => {
    const raw = readFileSync(path.join(WEB_ROOT, rel), 'utf8');
    const src = stripComments(raw);
    expect(unguardedAvatarImgs(raw), `${rel} regressed to a bare <img>`).toBe(0);
    expect(src, `${rel} no longer uses ${via}`).toContain(via);
    // The avatar must still be rendered, not quietly dropped.
    expect(src, `${rel} no longer reads an avatar at all`).toMatch(/avatarUrl/);
  });

  it('no surface anywhere renders an avatar without an error path', () => {
    const fresh = scan().filter((o) => !KNOWN_UNGUARDED.has(o.file));
    expect(
      fresh,
      'this <img> reads an avatar URL behind a falsy-only guard, so a ' +
        'present-but-dead URL renders as a broken-image icon rather than ' +
        'falling back. Route it through components/AvatarWithFallback.tsx, ' +
        'which swaps to the fallback on error and removes the <img> so there ' +
        'is no request loop.\n' +
        fresh.map((o) => `${o.file}: ${o.count}`).join('\n'),
    ).toEqual([]);
  });

  it('the shared fallback really does remove the <img> rather than re-point it', () => {
    // An onError that reassigns src to another remote URL which itself fails is
    // an infinite request loop. Both wrappers must use one-way state.
    for (const rel of ['components/AvatarWithFallback.tsx', 'app/pujas/PanditAvatar.tsx']) {
      const src = stripComments(readFileSync(path.join(WEB_ROOT, rel), 'utf8'));
      expect(src, `${rel} has no failure state`).toMatch(/useState/);
      expect(src, `${rel} reassigns src on error`).not.toMatch(/onError=\{[^}]*\.src\s*=/);
    }
  });
});

/**
 * The seed is what puts the dead host into the database in the first place.
 * With the fallback in place a broken URL degrades gracefully, but a fresh
 * environment should not reproduce the defect at all.
 */
describe('PF-04 — the seed no longer writes the dead host', () => {
  it('apps/api/prisma/seed.ts references images.darshya.online nowhere', () => {
    const seed = readFileSync(
      path.resolve(WEB_ROOT, '../api/prisma/seed.ts'),
      'utf8',
    );
    const live = seed
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    expect(live).not.toMatch(/images\.darshya\.online/);
  });
});
