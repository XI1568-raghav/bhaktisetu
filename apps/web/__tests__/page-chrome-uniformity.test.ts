/**
 * DU-03 / DU-04 / DU-05 / DU-06 / DU-07 / DU-08 / DU-09 / DU-10 / RESP-05 /
 * RESP-09 / RESP-11 / A11Y-10 / A11Y-15 — the call-site half.
 *
 * Every one of these findings was closed at the token layer in an earlier wave
 * and left open at the call sites, because the page files belonged to another
 * agent's lane. This file guards the call-site sweep.
 *
 * What the prod sweep measured, 2026-08-12:
 *   DU-03  11 pixel heights, 11 paddings, 4 radii, 5 type styles for the
 *          primary CTA across ten screens; 15 distinct full recipes in one
 *          8-page capture; the header "Sign In" was the only gradient button
 *          on the site and appeared on all ten
 *   DU-04  69 literal `bg-saffron-500` fills (#b87333) still painting as the
 *          resting primary beside `--color-primary` (#9e6229)
 *   DU-05  7 h1 treatments, 18px -> 70.4px, two typefaces, 349 h1 tags in 45
 *          size+weight recipes
 *   DU-07  an h3 at 36px on /pujas while the h2 above it was the same size;
 *          /admin h1 at 18px and its h2s at 13.4px, under the body text
 *   DU-08  /temples 1,3x21 and /store 1,3x24 — h1 straight to h3
 *   DU-09  #E16318 and #9E3F0A on the homepage, matching no declared token
 *   DU-10  676 arbitrary text-[9/10/11px] the token layer cannot reach
 *   A11Y-10 bg-saffron-500 = 3.79:1 with white; saffron-600 = 4.96:1
 *
 * Assertions are anchored to specific files and specific strings so a revert
 * fails them. Ratios are computed from app/globals.css, never hard-coded.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');
const css = read('app/globals.css');

/**
 * Comment-stripped source. This file quotes class strings in its own prose, and
 * so do the pages it scans; matching raw source lets a comment satisfy or trip
 * an assertion.
 */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

/* ── every source file under app/ and components/ ────────────────────────── */

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(full, out);
    } else if (/\.tsx?$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const SOURCES = [...walk(path.join(WEB, 'app')), ...walk(path.join(WEB, 'components'))];
const rel = (f: string) => path.relative(WEB, f).replace(/\\/g, '/');

/* ── WCAG contrast, derived from the shipped tokens ──────────────────────── */

function luminance(hex: string): number {
  const h = hex.replace('#', '');
  const f = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const s = parseInt(f.slice(i, i + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi! + 0.05) / (lo! + 0.05)) * 100) / 100;
};
const token = (name: string) =>
  new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{3,8})`).exec(css)?.[1]?.toLowerCase();

/* ══ DU-04 / A11Y-10 ═════════════════════════════════════════════════════ */

describe('DU-04 / A11Y-10 — one resting primary fill, and it carries white text', () => {
  it('the two weights really are 3.79:1 and 4.96:1 (the finding is live)', () => {
    expect(contrast(token('saffron-500')!, '#ffffff')).toBe(3.79);
    expect(contrast(token('saffron-600')!, '#ffffff')).toBe(4.96);
  });

  it('no source file paints a solid bg-saffron-500 anywhere', () => {
    // `bg-saffron-500/10` and friends are a tint, a different role, and stay.
    const offenders: string[] = [];
    for (const f of SOURCES) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/\bbg-saffron-500(?![\w\-/])/g)) {
        offenders.push(`${rel(f)}: ${src.slice(Math.max(0, m.index - 40), m.index + 30)}`);
      }
    }
    expect(offenders, '69 solid #b87333 fills were the DU-04 call-site half').toEqual([]);
  });

  it('the tint role is still available, so the sweep did not flatten everything', () => {
    const tints = SOURCES.filter((f) => /bg-saffron-500\//.test(readFileSync(f, 'utf8')));
    expect(tints.length).toBeGreaterThan(0);
  });

  it('the header Sign In is no longer the only gradient button on the site', () => {
    const nav = read('components/NavAuthButton.tsx');
    expect(nav).not.toMatch(/gradient-saffron/);
    expect(nav).toMatch(/buttonClass\(/);
  });
});

/* ══ DU-03 ═══════════════════════════════════════════════════════════════ */

describe('DU-03 — the measured screens adopted the Button recipe', () => {
  const ADOPTERS: Array<[string, string]> = [
    ['components/HomeHeroCta.tsx', 'the single hero conversion control'],
    ['components/NavAuthButton.tsx', 'header Sign In, present on all ten screens'],
    // 2026-08-23 revamp: app/page.tsx is deliberately NOT on this list any
    // more. It used to carry six hand-placed section CTAs (AI Pandit, store,
    // final CTA, …); all six sections were deleted and the only conversion
    // control the page still owns is <HomeHeroCta />, which is on this list in
    // its own right. Asserting `buttonClass(` appears in page.tsx would now be
    // asserting that a CTA exists there, which is the opposite of the intent.
    // The bespoke-CTA sweep below still runs against it — see HOME_NO_CTA.
    ['app/pujas/page.tsx', 'catalogue Apply / Load more / empty-state CTA'],
    ['app/pricing/page.tsx', 'Get Started Free / Start Free / Subscribe'],
    ['app/auth/login/page.tsx', 'the three submit buttons'],
    ['components/home/ThisWeek.tsx', 'the dated booking CTA and its browse fallback'],
    ['components/home/NextFestivalStrip.tsx', 'the seasonal booking CTA'],
    ['components/home/ShopStrip.tsx', 'Visit store'],
  ];

  /**
   * A className painted with the SOLID brand fill and carrying its own padding
   * on an interactive element — the sweep's own definition of a bespoke CTA,
   * minus the conditional fills that are segmented-filter state rather than a
   * resting style.
   */
  function bespokeCtaClasses(file: string): string[] {
    const src = readCode(file);
    const out: string[] = [];
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2] ?? '';
      if (!/\bbg-saffron-600(?![\w\-/])/.test(cls)) continue;
      if (!/\bpx-\d/.test(cls)) continue;
      if (/\b(active|selected|current)\w*\s*===?/i.test(cls)) continue;
      const at = cls.search(/\bbg-saffron-600(?![\w\-/])/);
      let conditional = false;
      for (const i of cls.matchAll(/\$\{[\s\S]*?\}/g)) {
        if (at > i.index! && at < i.index! + i[0].length) conditional = true;
      }
      if (conditional) continue;
      const before = src.slice(Math.max(0, m.index! - 220), m.index!);
      if (![...before.matchAll(/<(button|a|Link)\b/g)].pop()) continue;
      out.push(cls.replace(/\s+/g, ' ').slice(0, 90));
    }
    return out;
  }

  for (const [file, why] of ADOPTERS) {
    it(`${file} calls buttonClass (${why})`, () => {
      expect(readCode(file)).toMatch(/buttonClass\(/);
    });

    /*
     * The assertion above is a whole-file substring match, which one recipe
     * call satisfies no matter how many hand-rolled CTAs sit beside it —
     * app/pujas/page.tsx passed it while carrying 8. "Adopted" has to mean
     * nothing bespoke is left, or the guard reports adoption that is not there.
     */
    it(`${file} has no bespoke CTA left beside the recipe`, () => {
      const left = bespokeCtaClasses(file);
      expect(
        left,
        `${file} is asserted "adopted" but still hand-rolls ${left.length} primary CTA(s):\n` +
          left.join('\n'),
      ).toEqual([]);
    });
  }

  /*
   * app/page.tsx keeps the bespoke-CTA half of the guard without the
   * "must call buttonClass" half. The homepage composes components; if a
   * hand-rolled saffron button is ever authored back into the page itself,
   * this fails even though the page legitimately calls no recipe.
   */
  it('app/page.tsx hand-rolls no CTA of its own (HOME_NO_CTA)', () => {
    const left = bespokeCtaClasses('app/page.tsx');
    expect(
      left,
      'app/page.tsx hand-rolls a primary CTA. The homepage owns exactly one ' +
        'conversion control, <HomeHeroCta />, and it uses the recipe:\n' + left.join('\n'),
    ).toEqual([]);
  });

  it('the recipe is importable from a module a Server Component can call', () => {
    const recipe = read('components/ui/button-recipe.ts');
    expect(recipe, "'use client' would hand a Server Component a client reference").not.toMatch(
      /^['"]use client['"]/m,
    );
    expect(recipe).toMatch(/export function buttonClass/);
  });

  it('Button.tsx is a thin wrapper over that module, so there is one source of truth', () => {
    const btn = read('components/ui/Button.tsx');
    expect(btn).toMatch(/from '\.\/button-recipe'/);
    expect(btn, 'the recipe must not be duplicated in the client wrapper').not.toMatch(
      /const BUTTON_SIZES\s*=/,
    );
  });

  it('the /pricing CTAs stopped painting their fill with an inline style', () => {
    const src = read('app/pricing/page.tsx');
    const inlineFills = [...src.matchAll(/style=\{\{[^}]*background:\s*"var\(--color-primary\)"/g)];
    // The blurred hero glow keeps its inline background; the CTAs must not.
    for (const m of inlineFills) {
      const around = src.slice(Math.max(0, m.index - 300), m.index);
      expect(around, `an inline fill survived near: ${around.slice(-90)}`).not.toMatch(
        /<a\s|<Link\s|<button\s/,
      );
    }
  });
});

/* ══ DU-05 / DU-06 ═══════════════════════════════════════════════════════ */

describe('DU-05 / DU-06 — one h1 recipe per archetype, on the display face', () => {
  /*
   * COMMENT-FREE, as everything else in this file that scans source text is.
   * This block used the raw `read`, and heading-recipe.ts documents each
   * archetype in prose that names the other archetypes — so a key scan and a
   * `heading-display` lookup were both satisfiable by documentation. Nothing
   * was wrong at HEAD, but the fifth archetype added below arrives with a long
   * note, and this is the file's own stated rule.
   */
  const recipe = readCode('components/ui/heading-recipe.ts');

  it('defines exactly the five archetypes the app ships', () => {
    /*
     * Four were what DU-05 asked for. `portalInverse` is the fifth, added
     * 2026-08-28: portal chrome on a DARK surface, which the finding's four
     * names did not cover and which five h1s needed (app/darshan/[id] x2,
     * app/demo/[role] x2, app/mobile/darshan — small light copy on a dark bar,
     * where `detail` is a 30/36px display-face hero and `portal` is dark ink).
     */
    const keys = [...recipe.matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
    expect(keys.sort()).toEqual([
      'catalogue',
      'detail',
      'marketing',
      'portal',
      'portalInverse',
    ]);
  });

  it('marketing, catalogue and detail carry the display face; the portal pair does not', () => {
    const entry = (k: string) =>
      new RegExp(`\\b${k}:\\s*\\n?\\s*'([^']+)'`).exec(recipe)?.[1] ?? '';
    for (const k of ['marketing', 'catalogue', 'detail']) {
      expect(entry(k), k).toContain('heading-display');
    }
    for (const k of ['portal', 'portalInverse']) {
      expect(entry(k), 'a provider lives in the dashboard all day').not.toContain(
        'heading-display',
      );
    }
    expect(entry('portal'), 'the portal entry stopped parsing').toMatch(/text-\w+/);
    expect(entry('portalInverse'), 'the portalInverse entry stopped parsing').toMatch(/text-\w+/);
  });

  it('.heading-display resolves to the display token, not a literal family', () => {
    const rule = /\.heading-display\s*\{([^}]*)\}/.exec(css);
    expect(rule, '.heading-display missing from globals.css').not.toBeNull();
    expect(rule![1]).toMatch(/font-family:\s*var\(--font-display\)/);
  });

  const APPLIED: Array<[string, string]> = [
    ['app/pujas/page.tsx', 'catalogue'],
    ['app/store/page.tsx', 'catalogue'],
    ['app/temples/page.tsx', 'catalogue'],
    ['components/temples/TemplesBrowser.tsx', 'catalogue'],
    ['app/temples/[slug]/page.tsx', 'detail'],
    ['app/pujas/[slug]/page.tsx', 'detail'],
    ['app/admin/page.tsx', 'portal'],
    ['app/priest/page.tsx', 'portal'],
    ['app/pricing/page.tsx', 'marketing'],
    ['components/home/HeroCopyVariant.tsx', 'marketing'],
  ];

  for (const [file, archetype] of APPLIED) {
    it(`${file} uses H1.${archetype}`, () => {
      const src = read(file);
      expect(src).toMatch(new RegExp(`H1\\.${archetype}`));
      expect(src, 'the h1 must be the thing wearing the recipe').toMatch(
        new RegExp(`<h1[^>]*H1\\.${archetype}`),
      );
    });
  }

  it('no page still hard-codes the old catalogue h1 recipe', () => {
    for (const f of SOURCES) {
      expect(readFileSync(f, 'utf8'), rel(f)).not.toMatch(
        /<h1 className="(?:mb-3 )?text-3xl (?:md:text-4xl )?font-bold text-surface-800/,
      );
    }
  });

  it('the priest portal chrome no longer renders a second h1', () => {
    const layout = read('app/priest/layout.tsx');
    expect(layout, '/priest measured h1_in_dom=2 below the lg breakpoint').not.toMatch(/<h1\b/);
    expect(layout, 'the information must survive for AT').toMatch(/aria-label="Priest Portal"/);
  });
});

/* ══ DU-07 ═══════════════════════════════════════════════════════════════ */

describe('DU-07 — rendered size tracks heading level', () => {
  /** Tailwind text-* step -> rank. Bigger rank = bigger type. */
  const RANK: Record<string, number> = {
    'text-xs': 1, 'text-sm': 2, 'text-base': 3, 'text-lg': 4, 'text-xl': 5,
    'text-2xl': 6, 'text-3xl': 7, 'text-4xl': 8, 'text-5xl': 9,
  };
  const sizeOf = (cls: string) =>
    Object.entries(RANK).find(([k]) => new RegExp(`(?:^|\\s|\`)${k}(?![\\w-])`).test(cls))?.[1];

  it('/pujas: the section h3s no longer match the h2 above them', () => {
    const src = read('app/pujas/page.tsx');
    const h2 = /<h2 className="(text-2xl[^"]*)"/.exec(src)?.[1];
    expect(h2, 'the "Pandits at your home" h2 moved').toBeTruthy();
    const h3s = [...src.matchAll(/<h3 className="(text-\w+[^"]*)"/g)].map((m) => m[1]!);
    const named = h3s.filter((c) => /text-(xl|2xl|3xl|4xl)/.test(c));
    for (const c of named) {
      expect(sizeOf(c)!, `h3 "${c}" must be smaller than the h2 "${h2}"`).toBeLessThan(
        sizeOf(h2!)!,
      );
    }
  });

  it('/admin: the page title outranks its own sections and the body text', () => {
    const src = read('app/admin/page.tsx');
    // h1 comes from H1.portal; its sections must be no larger.
    const h1 = /portal:\s*'([^']+)'/.exec(read('components/ui/heading-recipe.ts'))?.[1]!;
    const h2s = [...src.matchAll(/<h2 className="(text-\w+[^"]*)"/g)].map((m) => m[1]!);
    expect(h2s.length, 'the /admin h2s moved').toBeGreaterThan(0);
    for (const c of h2s) {
      expect(sizeOf(c)!, `h2 "${c}" vs h1 "${h1}"`).toBeLessThan(sizeOf(h1)!);
      expect(sizeOf(c)!, 'a section heading below body size was the finding').toBeGreaterThanOrEqual(
        RANK['text-base']!,
      );
    }
  });

  it('/priest: the section h2 is no longer pixel-identical to the h3s under it', () => {
    const src = read('app/priest/page.tsx');
    const h2 = /<h2 className="(text-\w+[^"]*)">Upcoming Bookings/.exec(src)?.[1];
    expect(h2, 'the "Upcoming Bookings" h2 moved').toBeTruthy();
    for (const label of ['Accept Bookings', 'Upload Video']) {
      const h3 = new RegExp(`<h3 className="(text-\\w+[^"]*)">${label}`).exec(src)?.[1];
      expect(h3, `${label} h3 moved`).toBeTruthy();
      expect(sizeOf(h3!)!, `${label}`).toBeLessThan(sizeOf(h2!)!);
    }
  });
});

/* ══ DU-08 / A11Y-15 ═════════════════════════════════════════════════════ */

describe('DU-08 — no page jumps from h1 straight to h3', () => {
  it('/store groups its 24 product-title h3s under a real h2', () => {
    const src = read('app/store/page.tsx');
    expect(src).toMatch(/<section aria-labelledby="store-all-products">/);
    expect(src).toMatch(/<h2 id="store-all-products" className="sr-only">/);
    expect(src.indexOf('store-all-products')).toBeLessThan(src.indexOf('<h3'));
  });

  it('/temples groups its 21 temple-card h3s under a real h2', () => {
    const src = read('components/temples/TemplesBrowser.tsx');
    expect(src).toMatch(/<section aria-labelledby="temples-all">/);
    expect(src).toMatch(/<h2 id="temples-all" className="sr-only">/);
  });

  it('/priest: the onboarding banner is an h2, not an h3 above the first h2', () => {
    const card = read('components/MyProviderProfileCard.tsx');
    expect(card).toMatch(/<h2 className="font-semibold text-amber-900 mb-1">/);
  });
});

/* ══ DU-09 ═══════════════════════════════════════════════════════════════ */

describe('DU-09 — the two undeclared Tailwind oranges are gone', () => {
  it('no source file ships #E16318 or #9E3F0A', () => {
    const offenders: string[] = [];
    for (const f of SOURCES) {
      if (/#(E16318|9E3F0A)/i.test(readFileSync(f, 'utf8'))) offenders.push(rel(f));
    }
    expect(
      offenders,
      'orange-600/orange-700 painted 30 elements on / beside the brand copper',
    ).toEqual([]);
  });

  it('their tint pair went with them', () => {
    const offenders = SOURCES.filter((f) => /#(FFF4EC|FBD0A8)/i.test(readFileSync(f, 'utf8')));
    expect(offenders.map(rel)).toEqual([]);
  });

  it('every hex the homepage still paints is declared in globals.css', () => {
    /*
     * This used to anchor on the category colour strip's `label: 'Worship'`
     * row and check only that row's hexes. The strip was deleted in the
     * 2026-08-23 revamp — the header already carries the same five mega-menus —
     * which left the assertion with nothing to find and no way to fail.
     *
     * Replaced with the general form the narrow check was standing in for,
     * which is strictly stronger: no literal hex may appear on the homepage
     * unless globals.css declares it. That survives any section being added or
     * removed, which is exactly what went wrong here.
     */
    const home = read('app/page.tsx');
    const undeclared = [...new Set(home.match(/#[0-9a-fA-F]{6}/g) ?? [])].filter(
      (hex) => !new RegExp(`:\\s*${hex}\\s*;`, 'i').test(css),
    );
    expect(
      undeclared,
      'app/page.tsx paints a colour globals.css does not declare. Add it to the ' +
        '@theme block or use an existing token — 16 undeclared warm hexes across ' +
        '10 screens is how the "stitched together by different people" signal ' +
        'got onto the conversion path in the first place.',
    ).toEqual([]);
  });

  it('the app manifest theme colour is the brand primary, not stock orange', () => {
    const layout = read('app/layout.tsx');
    const theme = /themeColor:\s*"(#[0-9a-fA-F]{6})"/.exec(layout)?.[1]?.toLowerCase();
    expect(theme).toBe(token('primary') ?? token('saffron-600'));
  });
});

/* ══ DU-10 / RESP-05 ═════════════════════════════════════════════════════ */

describe('DU-10 / RESP-05 — nothing under the 12px legibility floor', () => {
  it('the scale floor really is 12px (the token half is live)', () => {
    const xs = /--text-xs:\s*clamp\(([^,]+),/.exec(css)?.[1]?.trim();
    expect(xs).toBe('0.75rem');
  });

  it('no source file ships an arbitrary size below 12px', () => {
    const offenders: string[] = [];
    for (const f of SOURCES) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/text-\[(\d+(?:\.\d+)?)px\]/g)) {
        if (Number(m[1]) < 12) offenders.push(`${rel(f)} text-[${m[1]}px]`);
      }
    }
    // Device-frame mockups render a miniature phone UI at 1/3 scale; they are
    // pictures of an interface, not an interface, and are exempt by name.
    const EXEMPT = /^app\/demo\/\[role\]\/role-demo-client\.tsx|^app\/mobile\//;
    expect(offenders.filter((o) => !EXEMPT.test(o))).toEqual([]);
  });

  it('the sweep landed on the scale, not on another arbitrary value', () => {
    const catalogue = read('app/store/page.tsx') + read('app/pujas/page.tsx');
    expect(catalogue).not.toMatch(/text-\[1[01]px\]/);
  });
});

/* ══ RESP-09 / RESP-11 ═══════════════════════════════════════════════════ */

describe('RESP-09 / RESP-11 — the targets the CSS floor cannot reach', () => {
  it('the homepage section CTAs opt into tap-safe', () => {
    const home = read('app/page.tsx');
    /*
     * Floor lowered 5 -> 3 by the 2026-08-23 revamp. The bare inline anchors
     * that needed the opt-in went out with the sections that held them — the
     * library teaser's "Browse all", the yatra teaser's "See circuits", the
     * store showcase's "Shop essentials". The three that remain are the
     * "see all" links on Live Darshan, Puja and Astrology.
     *
     * Deliberately still a floor and not an exact count: the failure this
     * guards is a bare <a> shipped WITHOUT the opt-in, because the global
     * 44px floor in globals.css reaches button/[role=button]/nav li>a and
     * footer li>a — not a naked inline anchor. Adding a legitimate link
     * should not be a red test.
     */
    expect((home.match(/className="tap-safe /g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('the footer language switcher does too (six 18px links on one row)', () => {
    const layout = read('app/layout.tsx');
    // Scoped to the switcher: the <head> also emits six alternate <link>s.
    const langs = [...layout.matchAll(/<Link[^>]*hrefLang="(en|hi|ta|te|bn|mr)"/g)];
    expect(langs.length).toBe(6);
    for (const m of langs) {
      expect(m[0], `hrefLang=${m[1]} link is not tap-safe`).toMatch(/tap-safe/);
    }
  });

  it('the footer social icons and phone link clear 44px', () => {
    const layout = read('app/layout.tsx');
    for (const label of ['Facebook', 'Instagram', 'YouTube']) {
      const at = layout.indexOf(`aria-label="${label}"`);
      expect(at, label).toBeGreaterThan(-1);
      expect(layout.slice(at, at + 260)).toMatch(/min-h-\[44px\] min-w-\[44px\]/);
    }
    expect(layout).toMatch(/href="tel:[^"]*" className="tap-safe/);
  });

  it('the portal sidebar links clear 44px (they are <a> with no <li> to floor)', () => {
    const PORTALS = [
      'app/admin/layout.tsx',
      'app/priest/layout.tsx',
      'app/astrologer-portal/layout.tsx',
      'app/gaushala-portal/layout.tsx',
      'app/store-admin/layout.tsx',
      'app/temple-portal/layout.tsx',
      'app/wellness-portal/layout.tsx',
    ];
    for (const f of PORTALS) {
      const src = read(f);
      expect(src, `${f} sidebar link still at py-2.5 (40-42px)`).toMatch(
        /flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium/,
      );
      // Back to Site / Sign Out at the foot of the drawer measured 232x40 too.
      expect(
        src.match(/gap-3 px-3 py-2\.5 rounded-lg text-sm font-medium/g),
        `${f} still has a py-2.5 sidebar row`,
      ).toBeNull();
    }
  });

  it('the on-duty switch grew, and its hit area is bigger than its track', () => {
    const src = read('app/priest/page.tsx');
    const at = src.indexOf('aria-label="Toggle on-duty"');
    expect(at, 'the on-duty toggle moved').toBeGreaterThan(-1);
    const block = src.slice(Math.max(0, at - 500), at + 500);
    expect(block, 'measured 48x28 — the control that gates dispatched work').toMatch(
      /h-8 w-14/,
    );
    expect(block, 'the padding is what clears 44px').toMatch(/\bp-2\b/);
    expect(block, 'the negative margin keeps the row from shifting').toMatch(/-m-2/);
    expect(block, 'padding on the button would paint the whole box green').toMatch(
      /rounded-full transition-colors/,
    );
  });

  it('/admin/users pagination buttons are 44x44, not 32x32', () => {
    expect(read('app/admin/users/page.tsx')).toMatch(
      /className=\{`h-11 w-11 text-xs font-medium rounded-md/,
    );
  });
});

/* == DU-12 ================================================================= */

describe('DU-12 - the elevation ramp is one temperature', () => {
  it('shadow-xl / shadow-2xl are really used in source (the finding is live)', () => {
    const hits = SOURCES.filter((f) =>
      /shadow-(?:xl|2xl)(?![\w-])/.test(readFileSync(f, 'utf8')),
    );
    expect(hits.length, '25 uses fell through to Tailwind stock black').toBeGreaterThan(0);
  });

  const decl = (u: string) => new RegExp(`--${u}:\s*([^;]+);`).exec(css)?.[1];

  // Tailwind v4 generates shadow utilities ONLY from @theme. A --shadow-*
  // declaration that sits in :root compiles to nothing and the utility silently
  // falls back to Tailwind's stock cool black. `decl()` above regex-scans the
  // SOURCE TEXT and cannot tell an effective @theme declaration from a dead
  // :root one, so every value assertion below is meaningless without this
  // position check. Index of the brace that closes the single @theme block.
  const themeStart = css.indexOf('@theme');
  const themeEnd = (() => {
    let depth = 0;
    for (let i = themeStart; i < css.length; i++) {
      if (css[i] === '{') depth++;
      else if (css[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return -1;
  })();

  it('the @theme block is found (the position check below is measuring something)', () => {
    expect(themeStart).toBeGreaterThanOrEqual(0);
    expect(themeEnd).toBeGreaterThan(themeStart);
  });

  for (const util of ['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-float', 'shadow-xl', 'shadow-2xl']) {
    it(`--${util} is declared INSIDE @theme, so the utility is actually generated`, () => {
      const at = css.indexOf(`--${util}:`);
      expect(at, `--${util} is not declared anywhere`).toBeGreaterThanOrEqual(0);
      expect(
        at > themeStart && at < themeEnd,
        `--${util} is declared outside @theme (index ${at}, @theme ends ${themeEnd}) — ` +
          'Tailwind v4 emits shadow utilities only from @theme, so this token is dead ' +
          "and .{util} inlines Tailwind's stock cool #0000001a",
      ).toBe(true);
    });
  }

  for (const util of ['shadow-sm', 'shadow-md', 'shadow-lg', 'shadow-float', 'shadow-xl', 'shadow-2xl']) {
    it(`--${util} is declared, so it stops resolving to the cool stock value`, () => {
      const v = decl(util);
      expect(v, `--${util} missing from @theme`).toBeTruthy();
      // The rest of the ramp is oklch(L C 60) - a warm hue. Stock Tailwind
      // ships rgb(0 0 0 / a), which reads cool on a cream surface.
      expect(v!, `--${util} is not on the warm ramp`).toMatch(/oklch\([^)]*\s60\s/);
      expect(v!).not.toMatch(/rgb\(0/);
    });
  }

  it('the ramp still grows outward, sm -> md -> lg -> xl -> 2xl', () => {
    // Take the largest blur radius in the value: sm/md/lg are single layers,
    // shadow-xl/2xl are two (a tight contact shadow plus a wide ambient one).
    const maxBlur = (u: string) =>
      Math.max(...[...decl(u)!.matchAll(/(\d+)px\s+oklch/g)].map((m) => Number(m[1])));
    expect(maxBlur('shadow-md')).toBeGreaterThan(maxBlur('shadow-sm'));
    expect(maxBlur('shadow-lg')).toBeGreaterThan(maxBlur('shadow-md'));
    expect(maxBlur('shadow-xl')).toBeGreaterThan(maxBlur('shadow-lg'));
    expect(maxBlur('shadow-2xl')).toBeGreaterThan(maxBlur('shadow-xl'));
  });
});
