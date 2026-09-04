/**
 * [DU-05] The h1 recipe is adopted repo-wide, and the backlog only shrinks.
 *
 * heading-recipe.ts is the right root-cause fix and the PORTAL archetype is
 * 100% adopted — but the only guard walked the 13 portal route prefixes
 * (__tests__/design-uniformity-sweep.test.ts) plus 10 files pinned by name.
 * Every other h1 in the tree was invisible to CI, so the finding's headline
 * claim — "the h1 is a different thing on every screen" — stayed literally true
 * off the sampled screens: 315 hand-rolled h1s across 279 files in 86 distinct
 * size/weight recipes, two real typefaces, plus 29 inline `style={{fontFamily}}`
 * overrides that bypass the token layer entirely.
 *
 * This file is the missing repo-wide count. It does not demand zero — the tail
 * needs per-directory judgement — it demands the number never grows.
 *
 * COMMENTS STRIPPED FIRST: this file and the pages quote class strings in
 * prose, and the sweep has repeatedly shipped guards that matched their own
 * documentation.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const relOf = (f: string) => path.relative(WEB, f).split(path.sep).join('/');

function code(file: string): string {
  return readFileSync(file, 'utf8')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e === '.next' || e === '__tests__') continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.(test|spec)\./.test(p)) out.push(p);
  }
  return out;
}

const FILES = [
  ...walk(path.join(WEB, 'app')),
  ...walk(path.join(WEB, 'components')),
  ...walk(path.join(WEB, 'lib')),
];

/*
 * This alternation must list EVERY key heading-recipe.ts exports, and must keep
 * its trailing `\b`.
 *
 * Alternation ORDER is not one of the hazards, and the first draft of this
 * comment said it was: the reasoning was that `portal` matches the prefix of
 * `portalInverse` and then `\b` fails between `l` and `I`. It does — and the
 * engine then backtracks into the next alternative and matches, so
 * `portal|portalInverse` and `portalInverse|portal` behave identically. Checked
 * against the engine rather than reasoned about, which is what the test below
 * now does in CI.
 *
 * The two things that genuinely break it:
 *   - a key added to the recipe and NOT added here. Every adopter of it then
 *     reads as a hand-rolled h1, so this ratchet's number RISES as the backlog
 *     falls, and the natural response is to raise the ceiling.
 *   - dropping the `\b`. `portal` then matches the prefix of anything starting
 *     with it, so `H1.portalish` — a name the recipe never exported — would
 *     count as adopted.
 * Both are asserted below. Listed in the recipe's own declaration order.
 */
const ARCHETYPES = 'marketing|catalogue|detail|portal|portalInverse';

/*
 * Two spellings, one recipe. `H1.<key>` is the direct read; `h1Class('<key>')`
 * is the same archetype with its colour token REPLACED (not layered) for the
 * one role that needs a per-instance hue — see h1Class's own comment in
 * heading-recipe.ts. Both are adoption; anything else is hand-rolled.
 */
const RECIPE = new RegExp(`H1\\.(?:${ARCHETYPES})\\b|h1Class\\(\\s*'(?:${ARCHETYPES})'`);

const openings: Array<{ file: string; attrs: string }> = [];
for (const f of FILES) {
  for (const m of code(f).matchAll(/<h1(\s[^>]*?)?>/gs)) {
    openings.push({ file: relOf(f), attrs: m[1] ?? '' });
  }
}

const HAND_ROLLED = openings.filter((o) => !RECIPE.test(o.attrs));

describe('[DU-05] one h1 recipe per archetype, everywhere', () => {
  it('the scan finds the h1s (a regex regression cannot zero this out)', () => {
    expect(openings.length, 'no <h1> found at all').toBeGreaterThan(300);
    expect(
      openings.length - HAND_ROLLED.length,
      'no h1 uses the recipe — the RECIPE regex broke',
    ).toBeGreaterThan(100);
  });

  it('the detector recognises every archetype the recipe exports, and nothing else', () => {
    /* Derived from the recipe file, so a key added there and forgotten here is
     * a red test rather than a silently inflated backlog. Comment-free source:
     * heading-recipe.ts documents each archetype in prose that names the
     * others. */
    const recipeSrc = code(path.join(WEB, 'components/ui/heading-recipe.ts'));
    const keys = [...recipeSrc.matchAll(/^ {2}(\w+):/gm)].map((m) => m[1]!);
    expect(keys.length, 'no archetype parsed off the recipe').toBeGreaterThan(3);
    for (const k of keys) {
      expect(RECIPE.test(`{H1.${k}}`), `RECIPE does not recognise H1.${k}`).toBe(true);
    }
    /* The `\b` half: a prefix of a real key is not a key. */
    expect(RECIPE.test('{H1.portalish}'), 'RECIPE matches a name the recipe never exported').toBe(
      false,
    );
    /* And the claim the comment above corrects: order is irrelevant because the
     * engine backtracks. Asserted so nobody re-derives the wrong conclusion. */
    const shortestFirst = /H1\.(marketing|catalogue|detail|portal|portalInverse)\b/;
    const longestFirst = /H1\.(marketing|catalogue|detail|portalInverse|portal)\b/;
    for (const r of [shortestFirst, longestFirst]) {
      expect(r.test('{H1.portalInverse}')).toBe(true);
      expect(r.test('{H1.portal}')).toBe(true);
      expect(r.test('{H1.portalish}')).toBe(false);
    }
    /* The second spelling, and its own negative: h1Class of something the
     * recipe never exported is not adoption either. */
    for (const k of keys) {
      expect(RECIPE.test(`{h1Class('${k}', x)}`), `RECIPE does not recognise h1Class('${k}')`).toBe(
        true,
      );
    }
    expect(RECIPE.test("{h1Class('hero', x)}")).toBe(false);
  });

  /*
   * h1Class is the one door through which a caller can change what an
   * archetype renders. If it ever accepted a SIZE, a WEIGHT or a FACE it would
   * re-open the 45-recipe sprawl from inside the abstraction, so its contract
   * is asserted here rather than trusted.
   */
  describe('h1Class replaces the colour and only the colour', () => {
    it('returns the archetype byte-for-byte when no colour is passed', async () => {
      const { H1: H, h1Class } = await import('../components/ui/heading-recipe');
      for (const k of Object.keys(H) as Array<keyof typeof H>) {
        expect(h1Class(k)).toBe(H[k]);
      }
    });

    it('leaves exactly ONE colour utility in the result', async () => {
      const { h1Class } = await import('../components/ui/heading-recipe');
      /* The bug this forbids: `${H1.marketing} text-violet-900`, where two
       * colour utilities of equal specificity race and the generated
       * stylesheet — not the call site — decides which wins. */
      for (const [arch, hue] of [
        ['marketing', 'text-violet-900'],
        ['catalogue', 'text-red-900'],
        ['detail', 'text-sky-900'],
        ['portal', 'text-emerald-900'],
        ['portalInverse', 'text-yellow-900'],
      ] as const) {
        const out = h1Class(arch, hue);
        const colours = out
          .split(/\s+/)
          .filter((c) => /^text-(?:surface|white|red|orange|yellow|emerald|sky|indigo|violet)/.test(c));
        expect(colours, `h1Class('${arch}', '${hue}') = "${out}"`).toEqual([hue]);
      }
    });

    it('keeps the size, weight, tracking and face of the archetype it was given', async () => {
      const { H1: H, h1Class } = await import('../components/ui/heading-recipe');
      for (const k of Object.keys(H) as Array<keyof typeof H>) {
        const out = h1Class(k, 'text-violet-900').split(/\s+/);
        const kept = H[k]
          .split(/\s+/)
          .filter((c) => !/^(?:[a-z0-9]+:)?text-(?:surface-800|white)$/.test(c));
        expect(kept.length, `nothing but a colour to keep in H1.${k}`).toBeGreaterThan(2);
        for (const c of kept) expect(out, `h1Class dropped ${c} from H1.${k}`).toContain(c);
      }
    });
  });

  it('no NEW hand-rolled h1 is added', () => {
    /*
     * Measured 2026-08-19: 314 hand-rolled of 408. This pass migrated the
     * seven byte-identical clusters (the astrology tool pages, the
     * aditya/ashta-lakshmi/calendar family, and the surface-900 marketing and
     * catalogue recipes) — 102 files — leaving 212 in a long tail of one- and
     * two-off recipes that need per-directory judgement.
     *
     * RATCHET. Lower it after every sweep. Left above the true count it is
     * slack a new bespoke h1 can be authored into without failing anything,
     * which is exactly how 279 files diverged while CI stayed green.
     *
     * 2026-08-23 sweep: 199 of the 212 took an archetype, chosen from the h1's
     * own declaration rather than from the route name — light copy over a photo
     * or a dark bar is `detail`; a title whose largest step is 2xl or smaller,
     * and every title on a portal route, is `portal`; 5xl-and-up is the
     * `marketing` ramp and the rest is `catalogue`.
     *
     * 2026-08-28: 13 -> 6. Two groups closed, both of them the kind the
     * previous pass could only describe.
     *
     *   The 5 SMALL WHITE h1s (app/darshan/[id] x2, app/demo/[role] x2,
     *     app/mobile/darshan) — 16-24px light copy on a dark bar — needed a
     *     fifth archetype, because `detail` is a 30/36px display-face hero and
     *     `portal` is text-surface-800, dark ink on a dark surface.
     *     `H1.portalInverse` is that archetype: portal's size and weight,
     *     portal's colour inverted. It landed with the archetype-list pins in
     *     __tests__/design-tokens.test.ts (TWO of them) and
     *     __tests__/page-chrome-uniformity.test.ts (a THIRD the handoff did not
     *     know about) and with the RECIPE alternation in this file, all in one
     *     change — taking fewer than all of them is a red suite either way.
     *   The 2 RAW-HTML h1s (lib/markdown.ts, and the near-identical renderer
     *     inlined in app/help/articles/[lang]/[slug]) were not a class problem
     *     at all. Every consumer of both renderers already renders the page
     *     title as an H1.catalogue, so a `# ` in a body was emitting a SECOND
     *     level-1 heading. The body ladder shifted down one level (# -> h2,
     *     ## -> h3, ### -> h4) with every rendered size unchanged, so they left
     *     the h1 census by being the right tag rather than by wearing a recipe.
     *
     * 2026-09-01: 6 -> 3. Three of the six were closable; the other three are
     * not code problems.
     *
     *   app/auth/login/page.tsx — CLOSED, and it was never really bespoke: the
     *     inner wordmark span spelled out H1.portal's own four utilities
     *     (`text-surface-800 text-xl font-semibold tracking-tight`) on a CHILD
     *     of the h1, so the heading declared no size and the scan below could
     *     not see an archetype. Archetype moved onto the h1, duplicate deleted
     *     from the span; identical render (see the call site's comment).
     *   app/chakras/[slug]/page.tsx — CLOSED via `h1Class`. The blocker named
     *     here before ("a per-chakra colour that collides with the
     *     archetype's") was real and neither existing escape hatch took it: the
     *     extras slot layers a SECOND colour utility of equal specificity, so
     *     which one wins is decided by the generated stylesheet and not by the
     *     call site, and a sixth archetype would have had to be seven, one per
     *     hue. h1Class makes the colour a parameter — the archetype's own
     *     colour token is removed and the caller's put in its place, so exactly
     *     one colour utility survives. Its contract is asserted above.
     *   app/about/page.tsx — CLOSED. This was the 70.4px end of the finding's
     *     own "18px to 70.4px" range: `text-[2.5rem] sm:text-[4.5rem]` with
     *     `leading-[1.05]`, i.e. three arbitrary bracket values off the scale,
     *     plus a seventh colour token. Now H1.marketing. It IS a visual change
     *     (72px -> 48px at lg, surface-900 -> surface-800) and the call site
     *     lists every delta so it can be argued with; the decorative underline
     *     was rescaled to hold its ratio. Reverting is one line if the owner
     *     wants the oversized hero back — but leaving it was leaving the exact
     *     outlier the finding is named after.
     *
     * 2026-09-02: 3 -> 2. The previous pass separated two defects inside
     * app/pitch and only one of them needed a person.
     *
     *   app/pitch/page.tsx — the SECOND h1 is gone, and not by codemod. The
     *     deck is one scrolling page, so all twelve slides are in the DOM at
     *     once and slide 12's title was a second level-1 heading on the same
     *     document — the same defect the finding records on /priest. Slides
     *     02-11 are all `<h2 className="pitch-h2">`, so slide 12 is their peer.
     *     It is an h2 now and KEEPS `pitch-h1`, so the closing slide keeps the
     *     emphasis it was designed with and the render is byte-identical. The
     *     recipe question was left exactly where it was.
     *
     * The 2 that remain each need a person, and neither is a codemod:
     *
     *   app/pitch/page.tsx x1 — `pitch-h1`, a bespoke class in app/pitch/
     *     pitch.css that sets a THIRD typeface ('Cabinet Grotesk') and
     *     `clamp(48px, 8vw, 120px)`. Whether the investor deck is part of the
     *     product design system at all is a call nobody has made.
     *   app/global-error.tsx — paints inline because no stylesheet is loaded
     *     under it; DU-13 documents it as the standing exception.
     *
     * RATCHET, at the TRUE count. Lower it after every sweep. Left above the
     * true count it is slack a new bespoke h1 can be authored into without
     * failing anything, which is exactly how 279 files diverged while CI
     * stayed green.
     */
    const BASELINE = 2;
    const byRecipe = new Map<string, string[]>();
    for (const o of HAND_ROLLED) {
      const cls =
        /className="([^"]*)"/.exec(o.attrs)?.[1] ??
        /className=\{`([^`]*)`\}/.exec(o.attrs)?.[1] ??
        '(dynamic)';
      byRecipe.set(cls, [...(byRecipe.get(cls) ?? []), o.file]);
    }
    const worst = [...byRecipe.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .map(([cls, fs_]) => `${fs_.length}x  ${cls.slice(0, 70)}  (${fs_[0]})`);
    expect(
      HAND_ROLLED.length,
      `${HAND_ROLLED.length} hand-rolled <h1> (ceiling ${BASELINE}) in ` +
        `${byRecipe.size} distinct recipes. Use H1.marketing / H1.catalogue / ` +
        'H1.detail / H1.portal from components/ui/heading-recipe; extras are ' +
        'layout-only.\nLargest remaining clusters:\n' + worst.join('\n'),
    ).toBeLessThanOrEqual(BASELINE);
  });

  it('the h1s in the OTHER packages are enumerated, not hidden', () => {
    /*
     * DENOMINATOR, third and last part (added 2026-09-02). The two tests
     * around this one cover apps/web's TypeScript tree and apps/web/public.
     * The test above them covers apps/admin. That leaves three packages that
     * also emit <h1> and that no DU-05 census has ever named, and the point of
     * writing them down is that "we swept it" has now been wrong twice for
     * exactly this reason.
     *
     * None of these is a web page, and none of them CAN take a Tailwind class
     * or a CSS variable:
     *
     *   apps/api x7 — six transactional EMAIL bodies (sign-in link, booking
     *     confirmation, panchang cron, weekly digest, ops alert, lead and
     *     waitlist welcomes) plus one bare `text/html` response, the invalid
     *     unsubscribe-link page in outreach-webhook.ts. Mail clients strip
     *     <style> and do not resolve custom properties, and that one response
     *     links no stylesheet, so an inline style attribute is the only thing
     *     that works in either. Same structural exemption as public/sw.js.
     *   apps/remotion-pitch x2 — Remotion compositions. These render to video
     *     FRAMES, not to a document a user navigates; there is no stylesheet
     *     and no viewport.
     *
     * The count matters as much as the list: a first pass at this test asserted
     * THREE api files because the grep behind it had been truncated by a
     * `head -5`, and the honest number is seven. If a tenth appears — or if one
     * of these ever becomes a real page — this fails and it has to be
     * classified rather than absorbed.
     */
    const REPO = path.resolve(WEB, '../..');
    const others = ['apps/api/src', 'apps/remotion-pitch/src', 'apps/mobile'];
    const found: string[] = [];
    let scanned = 0;
    for (const rel of others) {
      const dir = path.join(REPO, rel);
      let files: string[];
      try {
        files = walk(dir);
      } catch {
        continue; // package not present in this checkout
      }
      scanned += files.length;
      for (const f of files) {
        if (/<h1[\s>]/.test(code(f))) {
          found.push(path.relative(REPO, f).split(path.sep).join('/'));
        }
      }
    }
    expect(scanned, 'nothing scanned outside apps/web — this would pass vacuously').toBeGreaterThan(
      50,
    );
    expect(
      found.sort(),
      'an <h1> in a package no DU-05 census names. If it renders in a browser, ' +
        'give it an archetype; if it is another medium with no stylesheet (email, ' +
        'video), say so in the comment above and add it here.',
    ).toEqual(
      [
        'apps/api/src/jobs/daily-panchang-cron.ts',
        'apps/api/src/jobs/weekly-digest.ts',
        'apps/api/src/lib/alert.ts',
        'apps/api/src/lib/email.ts',
        'apps/api/src/routes/leads-self-onboard.ts',
        'apps/api/src/routes/outreach-webhook.ts',
        'apps/api/src/routes/waitlist.ts',
        'apps/remotion-pitch/src/components/HookAct.tsx',
        'apps/remotion-pitch/src/components/IntroCard.tsx',
      ].sort(),
    );
  });

  it('the h1s OUTSIDE the TypeScript walk are enumerated, not hidden', () => {
    /*
     * DENOMINATOR (added 2026-09-01). `walk()` above collects .ts/.tsx under
     * app/, components/ and lib/. That is the right scope for the ratchet — but
     * it is not the whole tree, and a census that quietly excludes a live copy
     * of the thing it counts is how a "closed" finding survives four waves and
     * turns up in a fifth. `public/` ships hand-written JavaScript that builds
     * HTML strings, and it holds exactly one <h1>:
     *
     *   public/sw.js — the service worker's last-resort 503 body, returned only
     *     when both the network and the cache miss. It is a complete standalone
     *     document built in the worker with an inline `style` on <body> and NO
     *     stylesheet link, so no Tailwind class and no token can reach it. That
     *     is structurally the same exception as app/global-error.tsx (DU-13),
     *     and it is asserted here rather than left off the count.
     *
     * If a second one appears, this fails and it has to be classified.
     */
    const PUBLIC = path.join(WEB, 'public');
    const jsFiles: string[] = [];
    const walkPublic = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const p = path.join(dir, e);
        if (statSync(p).isDirectory()) walkPublic(p);
        else if (/\.(js|mjs|html)$/.test(p)) jsFiles.push(p);
      }
    };
    walkPublic(PUBLIC);
    expect(jsFiles.length, 'nothing scanned in public/ — this would pass vacuously').toBeGreaterThan(
      0,
    );

    const found: Array<{ file: string; line: number }> = [];
    for (const f of jsFiles) {
      const src = readFileSync(f, 'utf8');
      src.split('\n').forEach((l, i) => {
        if (/<h1[\s>]/.test(l)) found.push({ file: relOf(f), line: i + 1 });
      });
    }
    expect(
      found.map((f) => f.file),
      'a hand-written <h1> outside the TypeScript tree. Either it belongs to a ' +
        'document a stylesheet can reach — in which case give it an H1 archetype ' +
        'and delete it from this list — or it is another no-stylesheet fallback, ' +
        'in which case say so here.',
    ).toEqual(['public/sw.js']);

    /* And the reason it is exempt, asserted rather than asserted-by-comment:
     * the document it lives in links no stylesheet. */
    const sw = readFileSync(path.join(PUBLIC, 'sw.js'), 'utf8');
    const doc = /'(<!doctype html>[^']*)'/i.exec(sw)?.[1];
    expect(doc, 'could not isolate the offline document').toBeTruthy();
    expect(doc!).toContain('<h1>');
    expect(doc!, 'the offline document links a stylesheet, so it is NOT exempt').not.toMatch(
      /<link[^>]+stylesheet/i,
    );
  });

  it('no h1 overrides the type token with an inline font-family', () => {
    /*
     * 47 h1s set font-family inline. An inline
     * style beats every class, so those headings are un-tokenizable: DU-06's
     * display face lands on them by accident today and cannot be changed from
     * the token layer tomorrow. 46 of the 47 asked for var(--font-display) and
     * were converted to the .heading-display class, which renders identically
     * and IS overridable; where the h1 already used an H1 archetype the inline
     * style was simply deleted, because the archetype decides the face on
     * purpose (portal chrome is not on the display face). The 1 survivor sets
     * var(--font-noto-devanagari), a genuine per-script choice. RATCHET.
     */
    const INLINE_FONT_BASELINE = 1;
    const offenders = openings
      .filter((o) => /style=\{\{[^}]*fontFamily/.test(o.attrs))
      .map((o) => o.file);
    expect(
      offenders.length,
      `${offenders.length} h1s set font-family inline, which no token can override ` +
        `(ceiling ${INLINE_FONT_BASELINE}). Delete the style object — .heading-display ` +
        'already supplies the family.\n' + [...new Set(offenders)].slice(0, 20).join('\n'),
    ).toBeLessThanOrEqual(INLINE_FONT_BASELINE);
  });

  /*
   * THE OTHER DENOMINATOR (added 2026-09-02). `walk()` at the top of this file
   * is rooted at apps/web. apps/admin is a SECOND Next app in this repo with
   * its own page titles, and until today every one of them was outside the
   * census that declared DU-05 closed — the same failure mode the public/ test
   * above was written for, one directory further out.
   *
   * Measured before the fix: 13 of 13 hand-rolled, in three treatments, six of
   * which painted `#E16318` as an inline style over a class that said
   * text-stone-900 (the inline hex wins, so the class was decorative). Two
   * rendered colours for one role.
   *
   * apps/admin cannot import apps/web's recipe: its `@theme` block declares
   * saffron and nothing else, so `text-surface-800` would resolve to no colour
   * there. It has its own one-archetype recipe instead, and this test is what
   * stops the two drifting into a fourth and fifth treatment — it asserts the
   * console is fully adopted, that it declares exactly ONE archetype, and that
   * the archetype is COMPLETE in the same sense the web ones are: a size, a
   * weight, a tracking and a colour all stated, nothing left to inherit.
   */
  describe('apps/admin is inside the census too', () => {
    const ADMIN = path.resolve(WEB, '../admin');
    const adminRel = (f: string) => path.relative(ADMIN, f).split(path.sep).join('/');
    const adminFiles = ['app', 'components', 'lib']
      .map((r) => path.join(ADMIN, r))
      .flatMap((d) => walk(d));
    const adminOpenings: Array<{ file: string; attrs: string }> = [];
    for (const f of adminFiles) {
      for (const m of code(f).matchAll(/<h1(\s[^>]*?)?>/gs)) {
        adminOpenings.push({ file: adminRel(f), attrs: m[1] ?? '' });
      }
    }

    it('the admin scan is not vacuous', () => {
      expect(adminFiles.length, 'nothing scanned under apps/admin').toBeGreaterThan(10);
      expect(adminOpenings.length, 'no <h1> found in apps/admin').toBeGreaterThan(10);
    });

    it('declares exactly one archetype, and it is complete', () => {
      const src = code(path.join(ADMIN, 'components/ui/heading-recipe.ts'));
      /* Single-line entries: `  portal: '…',`. apps/web's recipe wraps its
       * values onto their own line and this one does not, so key and value are
       * parsed together rather than by position. */
      const decl = [...src.matchAll(/^ {2}(\w+):\s*'([^']+)',$/gm)];
      const entries = decl.map((m) => m[1]!);
      const values = decl.map((m) => m[2]!);
      expect(entries, 'the admin console has one page archetype').toEqual(['portal']);
      expect(values.length).toBe(1);
      const cls = values[0]!.split(/\s+/);
      /* complete: every axis stated, none inherited */
      expect(cls.filter((c) => /^text-(?:xs|sm|base|lg|xl|\dxl)$/.test(c)).length, 'a base size').toBe(1);
      expect(cls.filter((c) => /^font-\w+$/.test(c)).length, 'a weight').toBe(1);
      expect(cls.filter((c) => /^tracking-\w+$/.test(c)).length, 'a tracking').toBe(1);
      expect(
        cls.filter((c) => /^text-(?:stone|surface|saffron)-\d{3}$/.test(c)).length,
        'a colour token, so it cannot inherit an eighth colour from an ancestor',
      ).toBe(1);
    });

    it('every admin page title is on that archetype', () => {
      const hand = adminOpenings.filter((o) => !/H1\.portal\b/.test(o.attrs));
      expect(
        hand.map((h) => `${h.file} :: ${h.attrs.replace(/\s+/g, ' ').slice(0, 80)}`),
        'hand-rolled <h1> in apps/admin — use H1.portal from ' +
          'apps/admin/components/ui/heading-recipe',
      ).toEqual([]);
    });

    it('no admin h1 paints a raw colour past its token', () => {
      const inline = adminOpenings
        .filter((o) => /style=\{\{[^}]*(?:color|fontFamily|fontSize|fontWeight)/.test(o.attrs))
        .map((o) => `${o.file} :: ${o.attrs.replace(/\s+/g, ' ').slice(0, 80)}`);
      expect(
        inline,
        'an inline style beats every class, so these headings are un-tokenizable',
      ).toEqual([]);
    });
  });

  it('every recipe call site passes layout-only extras', () => {
    // The recipe's value is that the interpolation slot cannot re-open the
    // sprawl. A text-*/font-* leaking through voids it.
    const bad: string[] = [];
    for (const o of openings) {
      if (!RECIPE.test(o.attrs)) continue;
      const tpl = /className=\{`([^`]*)`\}/.exec(o.attrs)?.[1];
      if (!tpl) continue;
      const extras = tpl.replace(/\$\{[^}]*\}/g, ' ');
      if (/\b(text-(?:xs|sm|base|lg|xl|\dxl)|font-(?:serif|display|bold|semibold|medium)|leading-)/.test(extras)) {
        bad.push(`${o.file} :: ${tpl.slice(0, 80)}`);
      }
    }
    expect(bad, 'these override the archetype from the extras slot').toEqual([]);
  });
});
