/**
 * [DU-05 / F195] The h1 RULE, not today's snapshot.
 *
 * The sibling guard __tests__/h1-recipe-ratchet.du05.test.ts is a RATCHET: it
 * asserts `HAND_ROLLED.length <= BASELINE` for a numeric BASELINE that has been
 * walked 314 -> 212 -> 13 -> 6 -> 3 -> 2 over five sweeps. A ratchet is the
 * right instrument while a backlog is draining and the wrong one once it has
 * drained, for two reasons:
 *
 *   1. A CEILING OF 2 IS NOT A LIST OF 2. Any two hand-rolled h1s satisfy it.
 *      Delete the exemption on app/global-error.tsx, invent a bespoke recipe on
 *      /checkout, and the count is still 2 and CI is still green. The number
 *      that survived five sweeps carries no information about WHICH two.
 *   2. NOBODY PRUNES A NUMBER. When an exemption stops being needed the ceiling
 *      does not notice; it just becomes slack. That is the mechanism by which
 *      45 recipes accumulated while a guard existed.
 *
 * So this file states the rule as a rule: every non-test h1 in apps/web goes
 * through a named archetype in components/ui/heading-recipe.ts, EXCEPT the
 * files named in EXEMPT below, each of which carries a justification and a
 * PREDICATE that re-derives whether the justification still holds. An exemption
 * whose predicate stops being true is a failure, and so is an exemption whose
 * file no longer needs one — the allowlist prunes itself instead of waiting for
 * somebody to remember.
 *
 * It also states the half of the finding the ratchet never covered. F195's
 * title is "7 treatments … and two of the ten screens have no h1 at all", and
 * the counting guard is blind to a screen with zero h1s and blind to a screen
 * with two. Both are asserted here.
 *
 * COMMENTS ARE STRIPPED FIRST, and that is load-bearing rather than tidy: this
 * repo documents its h1 decisions in prose AT the call site, so `<h1>` appears
 * inside JSX comments in app/pitch/page.tsx, inside a `//` line in
 * app/blog/[slug]/page.tsx and inside a `/** *` block in
 * components/home/TempleClock.tsx. A scan that does not strip comments reports
 * all three as hand-rolled h1s, which is exactly the false backlog that made
 * the residual look like 38 when it was 2.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');

/* ────────────────────────────── the detectors ─────────────────────────────
 * Pure functions over a file list, so the SAME code that guards the repo can
 * be pointed at a corpus with the defects deliberately injected. The final
 * describe block does exactly that: a guard that has never been observed to
 * fail is a guard nobody has any reason to believe.
 */

function stripComments(src: string): string {
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e === 'node_modules' || e === '.next' || e === '__tests__') continue;
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(p) && !/\.(test|spec)\./.test(p)) out.push(p);
  }
  return out;
}

function collect(root: string): string[] {
  return ['app', 'components', 'lib'].flatMap((d) => walk(path.join(root, d)));
}

const posix = (root: string, f: string) => path.relative(root, f).split(path.sep).join('/');

interface Opening {
  file: string;
  line: number;
  attrs: string;
}

function openings(root: string, files: string[]): Opening[] {
  const out: Opening[] = [];
  for (const f of files) {
    const src = stripComments(readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/<h1(\s[^>]*?)?>/gs)) {
      out.push({
        file: posix(root, f),
        line: src.slice(0, m.index).split('\n').length,
        attrs: m[1] ?? '',
      });
    }
  }
  return out;
}

/**
 * The two spellings of adoption, built from the archetype names rather than
 * hard-coded: `H1.<key>` is the direct read, `h1Class('<key>', hue)` is the
 * same archetype with its colour token replaced. The trailing `\b` is what
 * stops `H1.portalish` — a name the recipe never exported — reading as
 * adoption, and it is asserted below.
 */
const recipeDetector = (keys: string[]) =>
  new RegExp(`\\bH1\\s*\\.\\s*(?:${keys.join('|')})\\b|\\bh1Class\\(\\s*'(?:${keys.join('|')})'`);

/**
 * Two h1s in one file are FINE when they are alternative renders of the same
 * slot — a loading title and an error title, three states of an unsubscribe
 * confirmation. They are a defect only when both land in the DOM at once.
 *
 * So the file is not the unit; the RENDER PATH is. For each `<h1>` this walks
 * the enclosing `{ … }` JSX containers and keeps the ones that are conditional
 * (`&&` or a ternary), recording which side of a ternary the h1 falls on. Two
 * h1s in the same `return` whose guard paths never diverge are two h1s that
 * render together.
 *
 * Measured against the tree this was written for: a naive same-return count
 * reports 2 defects, both false — app/account/digest/unsubscribe (three
 * mutually exclusive `{state === … && …}` blocks) and app/auth/callback (the
 * two sides of one ternary). Guard-path divergence reports 0, correctly.
 */
function coRendering(src: string): Array<{ a: number; b: number }> {
  const h1s: Array<{ at: number; sig: string[] }> = [];
  const stack: Array<{ pos: number; cond: 'ternary' | 'and' | null; colon: number | null }> = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '{') stack.push({ pos: i, cond: null, colon: null });
    else if (c === '}') stack.pop();
    else if (stack.length) {
      const top = stack[stack.length - 1]!;
      if (c === '?' && top.cond === null) top.cond = 'ternary';
      else if (c === '&' && src[i + 1] === '&' && top.cond === null) top.cond = 'and';
      else if (c === ':' && top.cond === 'ternary' && top.colon === null) top.colon = i;
    }
    if (src.startsWith('<h1', i) && /[\s>]/.test(src[i + 3] ?? '')) {
      h1s.push({
        at: i,
        sig: stack
          .filter((s) => s.cond)
          .map((s) =>
            s.cond === 'ternary'
              ? `${s.pos}:${s.colon !== null && i > s.colon ? 'else' : 'then'}`
              : `${s.pos}:and`,
          ),
      });
    }
  }
  if (h1s.length < 2) return [];

  const returns = [...src.matchAll(/\breturn\b/g)].map((m) => m.index);
  const returnOf = (at: number) => {
    let r = -1;
    for (const p of returns) {
      if (p < at) r = p;
      else break;
    }
    return r;
  };
  const lineOf = (at: number) => src.slice(0, at).split('\n').length;

  const bad: Array<{ a: number; b: number }> = [];
  for (let i = 0; i < h1s.length; i++) {
    for (let j = i + 1; j < h1s.length; j++) {
      const A = h1s[i]!;
      const B = h1s[j]!;
      if (returnOf(A.at) !== returnOf(B.at)) continue;
      const depth = Math.min(A.sig.length, B.sig.length);
      let diverged = false;
      for (let k = 0; k < depth; k++) {
        if (A.sig[k] !== B.sig[k]) {
          diverged = true;
          break;
        }
      }
      if (!diverged) bad.push({ a: lineOf(A.at), b: lineOf(B.at) });
    }
  }
  return bad;
}

/**
 * Does this route entry reach an h1 at all, through its own source or through
 * a locally-imported module? `/auth/signup` is why this exists: 1,198 lines of
 * real screen whose title was a `<span className="text-xl font-semibold
 * text-surface-800 tracking-tight">` on a plain div — H1.portal's four
 * utilities spelled out by hand on something that was not a heading — so the
 * page shipped with no h1 in the document at all and every counting guard in
 * the repo was happy with it.
 */
function reaches(
  file: string,
  pattern: RegExp,
  srcOf: Map<string, string>,
  root: string,
  seen = new Set<string>(),
): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  const src = srcOf.get(file);
  if (src === undefined) return false;
  if (pattern.test(src)) return true;
  for (const m of src.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
    const spec = m[1]!;
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue;
    const base = spec.startsWith('@/')
      ? path.join(root, spec.slice(2))
      : path.resolve(path.dirname(file), spec);
    for (const cand of [base + '.tsx', base + '.ts', path.join(base, 'index.tsx'), path.join(base, 'index.ts')]) {
      if (srcOf.has(cand) && reaches(cand, pattern, srcOf, root, seen)) return true;
    }
  }
  return false;
}

const H1_TAG = /<h1[\s>]/;
const ANY_HEADING = /<h[1-6][\s>]/;

/**
 * A route that FORWARDS renders no document, so it owns no title.
 *
 * The first draft of this predicate was `navigates()` alone, and it was wrong
 * in the one way that mattered: /auth/signup calls `window.location.href = …`
 * after a successful signup, so 1,198 lines of real screen read as a redirect
 * stub and the guard went green against the very tree it was written to fail
 * on. Observed, not reasoned about — see the proof note at the foot of this
 * file.
 *
 * So forwarding is not "it navigates"; it is "it navigates AND it renders no
 * heading of any level". A screen with an <h2> in it is a screen with a
 * heading ladder, and a ladder that starts at level 2 is the defect. Measured:
 * of 391 route entries, 13 reach no h1 and ALL THIRTEEN reach no heading at
 * all (legacy aliases, the dispatch-engine one-tap links, /live, /festivals);
 * zero render an h2 without an h1. No allowlist, and nothing to prune.
 */
const NAVIGATES = /\b(?:permanentRedirect|redirect)\(|router\.(?:replace|push)\(|window\.location/;

/* ───────────────────────────── the exemptions ─────────────────────────────
 *
 * Each entry answers two questions the ratchet's number could not: WHICH file,
 * and WHY THIS ONE. `stillExempt` returns true while the justification holds
 * and a string saying what changed once it does not — so the exemption expires
 * on its own evidence rather than on somebody's memory.
 */
interface Exemption {
  why: string;
  stillExempt: (read: (rel: string) => string) => true | string;
}

const EXEMPT: Record<string, Exemption> = {
  'app/global-error.tsx': {
    why:
      'Next renders global-error INSTEAD of the root layout when the root layout ' +
      'itself throws, so app/layout.tsx never runs and the `import "./globals.css"` ' +
      'in it never runs either. No Tailwind class can reach this document, which ' +
      'is why it paints inline — the same structural exception public/sw.js has. ' +
      'DU-13 records it as the standing one.',
    stillExempt: (read) => {
      const src = read('app/global-error.tsx');
      if (!/<html\b/.test(src)) {
        return 'it no longer renders its own <html>, so it is no longer the root-layout replacement and a stylesheet may well reach it';
      }
      if (/\bimport\s+['"][^'"]*\.css['"]/.test(src)) {
        return 'it now imports a stylesheet, so a class CAN reach it — give the h1 an H1 archetype and delete this entry';
      }
      if (/className\s*=/.test(src)) {
        return 'it now sets className somewhere, so it is being styled by classes after all — give the h1 an H1 archetype and delete this entry';
      }
      if (!/import\s+['"]\.\/globals\.css['"]/.test(read('app/layout.tsx'))) {
        return 'app/layout.tsx no longer imports globals.css, so the premise of this exemption (that the stylesheet arrives via the root layout) needs re-deriving';
      }
      return true;
    },
  },

  'app/pitch/page.tsx': {
    why:
      'The investor deck, not a product surface. app/pitch/pitch.css is a ' +
      'self-contained stylesheet with its own palette (`.pitch-root { --ink, ' +
      '--saffron, … }`) and its own type ramp, and `.pitch-h1` is ' +
      '`clamp(48px, 8vw, 120px)` at weight 700. H1.marketing is 30/36/48px at ' +
      'weight 600, so migrating this h1 would shrink the deck\'s hook slide by ' +
      'up to 72px and lighten it — a visible reflow of the one page a founder ' +
      'shows investors, in the name of uniformity with pages it deliberately ' +
      'does not share a design language with. Whether the deck should join the ' +
      'product design system is a decision for a person; silently reflowing it ' +
      'is not that decision.',
    stillExempt: (read) => {
      const src = read('app/pitch/page.tsx');
      if (!/className="pitch-h1"/.test(src)) {
        return 'the h1 no longer carries `pitch-h1`, so whatever it wears now must be an H1 archetype — delete this entry';
      }
      /* The deck's own stylesheet arrives through its route group's layout,
       * which is also what scopes `.pitch-root`'s palette to this subtree. */
      if (!/\bimport\s+['"]\.\/pitch\.css['"]/.test(read('app/pitch/layout.tsx'))) {
        return 'the deck no longer imports its own stylesheet, so it is on the product design system now — give the h1 an archetype and delete this entry';
      }
      let css: string;
      try {
        css = read('app/pitch/pitch.css');
      } catch {
        return 'app/pitch/pitch.css is gone, so `pitch-h1` resolves to nothing — the h1 needs an archetype and this entry needs deleting';
      }
      if (!/\.pitch-h1\s*\{/.test(css)) {
        return 'pitch.css no longer defines .pitch-h1 — the h1 is unstyled, so give it an archetype and delete this entry';
      }
      return true;
    },
  },
};

/* ──────────────────────────────── the guard ──────────────────────────────── */

const FILES = collect(WEB);
const OPENINGS = openings(WEB, FILES);
const ARCHETYPES = [
  ...stripComments(readFileSync(path.join(WEB, 'components/ui/heading-recipe.ts'), 'utf8')).matchAll(
    /^ {2}(\w+):/gm,
  ),
].map((m) => m[1]!);
const RECIPE = recipeDetector(ARCHETYPES);
const HAND_ROLLED = OPENINGS.filter((o) => !RECIPE.test(o.attrs));
const readWeb = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');

describe('[DU-05] every h1 goes through a named archetype', () => {
  it('the census is not vacuous', () => {
    expect(FILES.length, 'nothing scanned under apps/web').toBeGreaterThan(500);
    expect(OPENINGS.length, 'no <h1> found at all — the scan regex broke').toBeGreaterThan(300);
    expect(
      OPENINGS.length - HAND_ROLLED.length,
      'no h1 reads as adopted — the RECIPE detector broke, which would make ' +
        'the allowlist assertion below fail loudly rather than silently, but ' +
        'check the detector first',
    ).toBeGreaterThan(300);
  });

  it('the recipe still exports exactly the five archetypes, and no sixth', () => {
    /*
     * A sixth archetype is how 45 recipes happened. This is not a ban — the
     * fifth (`portalInverse`) was correct and needed — it is a checkpoint: a
     * sixth cannot arrive as a side effect of migrating one stubborn call
     * site, because it fails here until somebody writes down what archetype it
     * is and why the five could not take it.
     */
    expect(ARCHETYPES).toEqual(['marketing', 'catalogue', 'detail', 'portal', 'portalInverse']);
  });

  it('the detector recognises every exported archetype, and nothing else', () => {
    /*
     * If a key were added to the recipe and not to the detector, every adopter
     * of it would read as hand-rolled — the backlog would appear to GROW as it
     * shrank, and the natural response to that is to widen the allowlist.
     * Derived from the recipe file above, so that cannot happen quietly.
     */
    for (const k of ARCHETYPES) {
      expect(RECIPE.test(`{H1.${k}}`), `detector misses H1.${k}`).toBe(true);
      expect(RECIPE.test(`{h1Class('${k}', hue)}`), `detector misses h1Class('${k}')`).toBe(true);
    }
    expect(RECIPE.test('{H1.portalish}'), 'a name the recipe never exported read as adopted').toBe(
      false,
    );
    expect(RECIPE.test("{h1Class('hero')}"), 'h1Class of a non-archetype read as adopted').toBe(
      false,
    );
  });

  it('no h1 outside the allowlist is hand-rolled', () => {
    const offenders = HAND_ROLLED.filter((o) => !(o.file in EXEMPT)).map(
      (o) => `${o.file}:${o.line}  <h1${o.attrs.replace(/\s+/g, ' ').slice(0, 80)}>`,
    );
    expect(
      offenders,
      'Use H1.marketing / H1.catalogue / H1.detail / H1.portal / H1.portalInverse ' +
        'from components/ui/heading-recipe (or h1Class(archetype, hue) when the ' +
        'page owns its colour). If the call site genuinely cannot take one, add it ' +
        'to EXEMPT above WITH a stillExempt predicate — not to a ceiling.',
    ).toEqual([]);
  });

  it('the allowlist prunes itself', () => {
    /*
     * The self-cleaning half. An exemption that is no longer needed is not
     * harmless: it is a licence to hand-roll an h1 in that exact file, held
     * open by nobody's decision. This fails the moment the file stops needing
     * it, so pruning is forced rather than remembered.
     */
    const stale = Object.keys(EXEMPT).filter(
      (f) => !HAND_ROLLED.some((o) => o.file === f),
    );
    expect(
      stale,
      'these files no longer contain a hand-rolled h1 — delete their entries ' +
        'from EXEMPT so the exemption cannot be re-used by the next edit',
    ).toEqual([]);
  });

  it('each exemption re-derives its own justification', () => {
    /*
     * The other self-cleaning half, and the more interesting one. Membership
     * of a list is not a reason; these predicates re-check the FACT that made
     * each file exempt. Give global-error.tsx a stylesheet, or delete
     * pitch.css, and the exemption expires on evidence.
     */
    const broken = Object.entries(EXEMPT)
      .map(([file, e]) => [file, e.stillExempt(readWeb)] as const)
      .filter(([, r]) => r !== true)
      .map(([file, r]) => `${file}: ${r}`);
    expect(broken, 'an exemption whose justification no longer holds').toEqual([]);
  });

  it('the exempt h1s still render at an archetype RANK, they are just spelled differently', () => {
    /*
     * An exemption from the CLASSES is not an exemption from the design
     * system. app/global-error.tsx cannot wear `text-xl font-semibold`, but it
     * can — and does — paint 1.25rem/600, which is what those two utilities
     * compile to. That is the difference between "expressed inline" and "an
     * eighth treatment", and it is the whole reason this file is tolerable.
     *
     * app/pitch is deliberately NOT held to this: it is the refusal case, a
     * different design language on purpose, and pretending otherwise would be
     * asserting a uniformity that does not exist.
     */
    const ge = readWeb('app/global-error.tsx');
    const portal = /portal:\s*'([^']+)'/.exec(readWeb('components/ui/heading-recipe.ts'))?.[1];
    expect(portal, 'could not read H1.portal off the recipe').toBeTruthy();
    expect(portal!, 'H1.portal is no longer text-xl/semibold — re-derive the inline pair below').toContain(
      'text-xl',
    );
    expect(portal!).toContain('font-semibold');
    const h1 = /<h1[^>]*>/.exec(stripComments(ge))?.[0] ?? '';
    expect(h1, "global-error's h1 no longer matches text-xl (1.25rem)").toMatch(
      /fontSize:\s*'1\.25rem'/,
    );
    expect(h1, "global-error's h1 no longer matches font-semibold (600)").toMatch(
      /fontWeight:\s*600/,
    );
  });
});

describe('[DU-05] exactly one h1 per screen', () => {
  /*
   * The half of F195 the counting guard never saw. Its title is "7 treatments,
   * 18px to 70.4px, two typefaces — AND TWO OF THE TEN SCREENS HAVE NO H1 AT
   * ALL", and the live sweep that motivated this pass also recorded /priest
   * rendering TWO. A guard that only counts recipes is blind to both.
   */

  const srcOf = new Map(FILES.map((f) => [f, stripComments(readFileSync(f, 'utf8'))]));

  it('no layout declares an h1', () => {
    /*
     * THE /priest MECHANISM, stated as a rule instead of as one pinned file.
     * A layout and the page it wraps are both in the DOM at once, so a title
     * in the layout is a SECOND level-1 heading on every route beneath it —
     * which is how /priest measured h1_in_dom=2 below the lg breakpoint. The
     * page owns the title; the chrome does not.
     *
     * __tests__/page-chrome-uniformity.test.ts pins app/priest/layout.tsx by
     * name. That is the fix for one route. This is the rule for all 75.
     */
    const offenders = FILES.filter((f) => /[/\\]layout\.tsx$/.test(f))
      .filter((f) => /<h1[\s>]/.test(srcOf.get(f)!))
      .map((f) => posix(WEB, f));
    expect(
      offenders,
      'a layout renders an <h1>. Every page beneath it then ships two level-1 ' +
        'headings — the /priest defect. Demote it to the element it actually is ' +
        '(a wordmark is a <span>, a section title is an <h2>) and leave the h1 to ' +
        'the page.',
    ).toEqual([]);
  });

  it('no two h1s can render into the same tree', () => {
    const offenders: string[] = [];
    for (const f of FILES) {
      for (const { a, b } of coRendering(srcOf.get(f)!)) {
        offenders.push(`${posix(WEB, f)} lines ${a} and ${b}`);
      }
    }
    expect(
      offenders,
      'two <h1> on one render path. Alternative states (loading / error / empty) ' +
        'are fine and this detector allows them — these two are not alternatives, ' +
        'they are both in the DOM at once. One of them is an <h2>.',
    ).toEqual([]);
  });

  it('every route that renders a document reaches an h1', () => {
    /*
     * The "no h1 at all" half. A page.tsx satisfies this through its own
     * source OR through a component it imports — 56 route entries legitimately
     * delegate their title to a client component, and demanding the h1 be in
     * the page file would be a false rule that invites a second h1 rather than
     * preventing one.
     *
     * The only exemption is structural and self-evidencing rather than a list:
     * a route that forwards (see NAVIGATES) and renders no heading of any
     * level renders no document, so it owns no title. Delete the forward, or
     * give the route an <h2>, and it has to grow an h1.
     */
    const pages = FILES.filter((f) => /[/\\]page\.tsx$/.test(f));
    expect(pages.length, 'no route entries found').toBeGreaterThan(300);
    const titleless = pages
      .filter((f) => !reaches(f, H1_TAG, srcOf, WEB))
      .filter(
        (f) => !(NAVIGATES.test(srcOf.get(f)!) && !reaches(f, ANY_HEADING, srcOf, WEB)),
      )
      .map((f) => posix(WEB, f));
    expect(
      titleless,
      'a rendered screen with no <h1> anywhere in it. A page whose title is a ' +
        'styled <span> has a title that looks like a heading and is not one — ' +
        'see the /auth/signup call site, which was exactly this, four <h2>s ' +
        'deep and no h1. Promote it and give it an H1 archetype.',
    ).toEqual([]);
  });

  it('no screen starts its heading ladder at level 2', () => {
    /*
     * The same rule stated from the other end, and the one that actually
     * catches the /auth/signup shape: a route that renders an <h2> has a
     * document outline, and an outline whose first entry is level 2 is a
     * document with no title. Separate from the assertion above because it is
     * the assertion above WITHOUT the forwarding escape hatch — a page cannot
     * buy its way out of this one by calling router.push.
     */
    const ladderless = FILES.filter((f) => /[/\\]page\.tsx$/.test(f))
      .filter((f) => reaches(f, /<h[2-6][\s>]/, srcOf, WEB))
      .filter((f) => !reaches(f, H1_TAG, srcOf, WEB))
      .map((f) => posix(WEB, f));
    expect(
      ladderless,
      'this screen renders section headings but no <h1>, so its outline starts ' +
        'at level 2 and it has no title at all',
    ).toEqual([]);
  });

  it('/priest and /admin — the two screens the live sweep could not reach', () => {
    /*
     * Both routes answer 307 to auth, so the 2026-09-08 production measurement
     * could not see them, and /priest is precisely the screen that carried the
     * double-h1 defect. Their live state is UNVERIFIED and this test does not
     * claim otherwise — what it does is pin the SOURCE, so that if the live
     * state is wrong it is wrong for a deployment reason and not a code one,
     * and so that a regression on the two screens nobody can watch fails here.
     */
    for (const route of ['app/priest', 'app/admin']) {
      const page = stripComments(readWeb(`${route}/page.tsx`));
      const layout = stripComments(readWeb(`${route}/layout.tsx`));
      expect([...page.matchAll(/<h1[\s>]/g)].length, `${route}/page.tsx must own exactly one h1`).toBe(1);
      expect(page, `${route}/page.tsx must title itself with H1.portal`).toMatch(/<h1[^>]*H1\.portal\b/);
      expect(
        [...layout.matchAll(/<h1[\s>]/g)].length,
        `${route}/layout.tsx renders an h1, so every page under it ships two`,
      ).toBe(0);
    }
  });
});

describe('[DU-05] the guard is observed to fail', () => {
  /*
   * NON-VACUITY. Every assertion above is green on this tree, which is exactly
   * the state in which a broken detector is indistinguishable from a clean
   * repo — and this finding has been declared closed twice already on scans
   * that turned out to be blind (a line-scoped grep that missed 32 multi-line
   * call sites and read the residual as 38; a census that excluded apps/admin
   * entirely).
   *
   * So the same detector functions are pointed at a corpus with each defect
   * deliberately injected, and each one is required to report it. If a
   * detector is ever weakened into something that cannot see its defect, these
   * fail even though the repo is clean.
   */
  const root = mkdtempSync(path.join(tmpdir(), 'h1-rule-nonvacuity-'));
  const put = (rel: string, body: string) => {
    const p = path.join(root, rel);
    mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, body, 'utf8');
    return p;
  };

  const HAND = put(
    'app/bespoke/page.tsx',
    'export default function P() {\n  return <h1 className="text-[42px] font-black">Bespoke</h1>;\n}\n',
  );
  const LAYOUT = put(
    'app/portal/layout.tsx',
    'export default function L({ children }: any) {\n  return (\n    <div>\n      <h1 className={H1.portal}>Portal</h1>\n      {children}\n    </div>\n  );\n}\n',
  );
  const CORENDER = put(
    'app/double/page.tsx',
    'export default function P() {\n  return (\n    <div>\n      <h1 className={H1.catalogue}>One</h1>\n      <h1 className={H1.catalogue}>Two</h1>\n    </div>\n  );\n}\n',
  );
  const BRANCHED = put(
    'app/branched/page.tsx',
    'export default function P({ s }: any) {\n  return (\n    <div>\n      {s === "a" && <h1 className={H1.portal}>A</h1>}\n      {s === "b" ? <h1 className={H1.portal}>B</h1> : <h1 className={H1.portal}>C</h1>}\n    </div>\n  );\n}\n',
  );
  /*
   * The /auth/signup shape, verbatim: a real screen whose title is a styled
   * <span>, four section headings deep, and which ALSO navigates — the exact
   * combination that made the first draft of this guard go green against the
   * pre-fix tree.
   */
  const TITLELESS = put(
    'app/silent/page.tsx',
    'export default function P() {\n  const go = () => { window.location.href = "/next"; };\n  return (\n    <div>\n      <span className="text-xl font-semibold">Looks like a title</span>\n      <h2>Section</h2>\n      <button onClick={go}>Continue</button>\n    </div>\n  );\n}\n',
  );
  const COMMENTED = put(
    'app/commented/page.tsx',
    '// the header renders it as <h1> itself\nexport default function P() {\n  /* an <h1> in a block comment */\n  return (\n    <div>\n      {/* an <h1> in a JSX comment */}\n      <h1 className={H1.catalogue}>Real</h1>\n    </div>\n  );\n}\n',
  );
  put('app/redirect/page.tsx', 'import { redirect } from "next/navigation";\nexport default function P() {\n  redirect("/elsewhere");\n}\n');

  const files = collect(root);
  const srcOf = new Map(files.map((f) => [f, stripComments(readFileSync(f, 'utf8'))]));
  const found = openings(root, files);
  const hand = found.filter((o) => !RECIPE.test(o.attrs));

  it('the fixture corpus was actually built', () => {
    expect(files.length).toBe(7);
    expect(found.length, 'the fixture h1s were not found at all').toBeGreaterThan(5);
  });

  it('the hand-rolled detector reports the bespoke h1 — and ONLY it', () => {
    expect(hand.map((o) => o.file)).toEqual([posix(root, HAND)]);
  });

  it('comments never count as h1s (the false backlog that read 2 as 38)', () => {
    expect(found.filter((o) => o.file === posix(root, COMMENTED)).length).toBe(1);
  });

  it('the layout detector reports the layout h1', () => {
    const offenders = files
      .filter((f) => /[/\\]layout\.tsx$/.test(f))
      .filter((f) => /<h1[\s>]/.test(srcOf.get(f)!))
      .map((f) => posix(root, f));
    expect(offenders).toEqual([posix(root, LAYOUT)]);
  });

  it('the co-render detector reports the two siblings and NOT the branched three', () => {
    expect(coRendering(srcOf.get(CORENDER)!).length, 'two siblings in one tree went unreported').toBe(1);
    expect(
      coRendering(srcOf.get(BRANCHED)!),
      'mutually exclusive branches were reported as co-rendering — this is the ' +
        'false positive that would force a bogus allowlist',
    ).toEqual([]);
  });

  it('the reachability detector reports the titleless screen and spares the redirect', () => {
    const titleless = files
      .filter((f) => /[/\\]page\.tsx$/.test(f))
      .filter((f) => !reaches(f, H1_TAG, srcOf, root))
      .filter((f) => !(NAVIGATES.test(srcOf.get(f)!) && !reaches(f, ANY_HEADING, srcOf, root)))
      .map((f) => posix(root, f));
    expect(titleless).toEqual([posix(root, TITLELESS)]);
  });

  it('a screen is NOT excused from owning a title just because it navigates', () => {
    /*
     * The regression this exists for. /auth/signup sets window.location.href
     * in a submit handler; an earlier draft read that as "this route only
     * forwards" and excused 1,198 lines of screen. The fixture above navigates
     * AND renders an h2, so a detector that goes back to matching navigation
     * alone fails here.
     */
    expect(NAVIGATES.test(srcOf.get(TITLELESS)!), 'the fixture must navigate').toBe(true);
    expect(reaches(TITLELESS, ANY_HEADING, srcOf, root), 'the fixture must render a heading').toBe(
      true,
    );
    expect(reaches(TITLELESS, H1_TAG, srcOf, root), 'the fixture must have no h1').toBe(false);
  });

  it('a stale allowlist entry is reported', () => {
    /* The self-cleaning assertion, run against a file that needs no exemption. */
    const stale = [posix(root, CORENDER)].filter((f) => !hand.some((o) => o.file === f));
    expect(stale.length, 'a stale exemption went unreported').toBe(1);
  });

  it('a broken justification is reported', () => {
    /* global-error's predicate, fed a document that now imports a stylesheet. */
    const read = (rel: string) =>
      rel === 'app/global-error.tsx'
        ? 'import "./globals.css";\nexport default function E() { return <html><body><h1>x</h1></body></html>; }'
        : readWeb(rel);
    expect(EXEMPT['app/global-error.tsx']!.stillExempt(read)).toMatch(/imports a stylesheet/);
  });
});

/*
 * ─────────────────────── PROOF NOTE (2026-09-08) ───────────────────────────
 *
 * Every assertion above was observed RED before it was observed green, against
 * this repository rather than against a fixture, because a guard that has only
 * ever been green is a guard nobody has any evidence about.
 *
 *   'no h1 outside the allowlist is hand-rolled'          app/__h1proof__/page.tsx
 *   'no layout declares an h1'                            app/__h1proof__/layout.tsx
 *   'no two h1s can render into the same tree'            app/__h1proof__/two/page.tsx
 *   'every route that renders a document reaches an h1'   app/__h1proof__/silent/page.tsx
 *
 * Four throwaway routes carrying one defect each were written into apps/web,
 * the file was run (4 failed / 15 passed, each naming its own injected file),
 * and the routes were deleted.
 *
 *   'every route that renders a document reaches an h1'   app/auth/signup/page.tsx
 *   'no screen starts its heading ladder at level 2'      app/auth/signup/page.tsx
 *
 * These two were proven differently and it matters. /auth/signup was reverted
 * IN PLACE to its pre-fix bytes — the wordmark back to a styled <span> on a
 * plain div, the H1 import removed — the file was run, and the original was
 * restored and checked by sha256 (e10bf333…daab, identical). That round is the
 * reason the forwarding exemption reads the way it does: on the FIRST attempt
 * the guard went GREEN against the pre-fix tree, because signup sets
 * `window.location.href` in a submit handler and the exemption was matching
 * navigation alone. The rule was wrong, the proof caught it, and 'a screen is
 * NOT excused from owning a title just because it navigates' above is the
 * regression test for the wrong version.
 *
 *   'each exemption re-derives its own justification'     app/pitch/page.tsx
 *
 * Red on the first run, correctly: the predicate looked for the pitch
 * stylesheet import in page.tsx and it lives in app/pitch/layout.tsx, which is
 * also what scopes `.pitch-root` to the deck. The predicate was wrong about
 * the repo and the repo was right.
 */
