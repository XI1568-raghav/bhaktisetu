/**
 * DU-03 / DU-05 — repo-wide sweep A: the primary CTA and the h1.
 *
 * The token layer and the two recipe modules (components/ui/button-recipe.ts,
 * components/ui/heading-recipe.ts) already existed and are NOT this file's
 * work. __tests__/page-chrome-uniformity.test.ts already guards the ten
 * screens the 2026-08-12 prod sweep actually measured.
 *
 * What was still open, measured across app/ + components/ before this sweep:
 *   DU-03  594 primary-CTA call sites in 248 files, 105 distinct recipes,
 *          12 pixel heights and 7 radii
 *   DU-05  412 h1 tags, only 15 on a recipe — 397 hand-rolled in 74 distinct
 *          size+weight combinations
 *
 * This file ratchets the two clusters that could be migrated mechanically and
 * verified: every h1 under a portal / app-chrome route, and the primary CTA on
 * the files listed below.
 *
 * NOTE FOR FUTURE GUARDS: every scan here strips comments first. Four guards in
 * an earlier wave matched their own documentation and reported phantom
 * offenders. `stripComments` is not optional.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const WEB = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(WEB, rel), 'utf8');

/** Block and line comments, so a guard never trips on the prose explaining it. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === 'node_modules' || name === '.next') continue;
      walk(full, out);
    } else if (/\.tsx$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

const rel = (f: string) => path.relative(WEB, f).replace(/\\/g, '/');
const APP = walk(path.join(WEB, 'app'));

/** Portal / app chrome — the archetype whose h1 is H1.portal. */
const PORTAL =
  /^app\/(admin|priest|astrologer-portal|gaushala-portal|store-admin|temple-portal|wellness-portal|gurukul-portal|dashboard|account|profile|bookings|messages)\//;

/* ══ DU-05 — every portal h1 is the same h1 ══════════════════════════════ */

describe('DU-05 — one h1 recipe for the whole portal surface', () => {
  const portalFiles = APP.filter((f) => PORTAL.test(rel(f)));

  it('the portal surface is actually large (the finding is live)', () => {
    expect(portalFiles.length).toBeGreaterThan(60);
  });

  it('no portal page hand-rolls its own h1 size/weight', () => {
    const offenders: string[] = [];
    for (const f of portalFiles) {
      const src = stripComments(readFileSync(f, 'utf8'));
      for (const m of src.matchAll(/<h1\b([^>]*)>/g)) {
        const attrs = m[1]!;
        if (/H1\.portal/.test(attrs)) continue;
        // A bespoke recipe is a literal type size or weight on the h1 itself.
        if (/\b(?:sm:|md:|lg:)?(?:text-(?:xs|sm|base|lg|xl|\dxl)|font-(?:bold|semibold|serif|medium))\b/.test(attrs)) {
          offenders.push(`${rel(f)} :: ${attrs.trim().slice(0, 90)}`);
        }
      }
    }
    expect(
      offenders,
      `${offenders.length} portal h1s still carry a bespoke size/weight`,
    ).toEqual([]);
  });

  it('the portal drawer chrome does not render a second h1 on any portal', () => {
    // /priest was fixed in an earlier wave; the other six drawers shipped the
    // same duplicate level-1 heading below the lg breakpoint.
    const LAYOUTS = [
      'app/priest/layout.tsx',
      'app/astrologer-portal/layout.tsx',
      'app/gaushala-portal/layout.tsx',
      'app/store-admin/layout.tsx',
      'app/temple-portal/layout.tsx',
      'app/wellness-portal/layout.tsx',
    ];
    for (const f of LAYOUTS) {
      const src = stripComments(read(f));
      expect(src, `${f} still renders chrome as an h1`).not.toMatch(/<h1\b/);
      expect(src, `${f} must keep the label for assistive tech`).toMatch(
        /role="doc-subtitle"[\s\S]{0,120}aria-label="/,
      );
    }
  });

  it('H1.portal is still the single portal token (not forked per route)', () => {
    const recipe = read('components/ui/heading-recipe.ts');
    const portal = /portal:\s*'([^']+)'/.exec(recipe)?.[1];
    expect(portal, 'H1.portal disappeared from the recipe').toBeTruthy();
    expect(portal!).toContain('text-xl');
    expect(portal!).toContain('font-semibold');
    expect(portal!, 'the dashboard face stays the UI face, not the display face').not.toContain(
      'heading-display',
    );
  });
});

/* ══ DU-03 — the primary CTA on the migrated call sites ══════════════════ */

describe('DU-03 — migrated call sites share the one Button recipe', () => {
  /** Files whose primary CTA was migrated to buttonClass in this sweep. */
  const MIGRATED = [
    'app/pujas/book/page.tsx',
    'app/onboarding/view/page.tsx',
    'app/auth/signup/page.tsx',
    'app/today/page.tsx',
    'app/matchmaking/page.tsx',
    'app/profile/page.tsx',
    'components/LiveChatWidget.tsx',
    'app/astrology/astrologers/live/LiveAstrologersClient.tsx',
  ];

  for (const f of MIGRATED) {
    it(`${f} builds its primary CTA from buttonClass`, () => {
      expect(stripComments(read(f))).toMatch(/buttonClass\(/);
    });
  }

  /**
   * A bespoke primary CTA, precisely. Deliberately NOT "anything with a saffron
   * fill" — that first draft flagged the LiveChatWidget typing-indicator dots
   * (<span>), a /15 tint tile on signup (<div>), the profile avatar-edit icon
   * button (28px, overlaid on the avatar corner) and a toggle switch track.
   * None of those are a call to action and forcing them to h-11 px-5 would
   * break the layouts they sit in. A primary CTA here is: an interactive
   * element, a SOLID saffron fill (not a `/nn` tint), and horizontal padding
   * around a text label — which is exactly what an icon chip does not have.
   */
  function bespokeCtas(file: string): string[] {
    const src = stripComments(read(file));
    const found: string[] = [];
    for (const m of src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const cls = m[1] ?? m[2] ?? '';
      if (!/\bbg-saffron-600(?![\w\-/])/.test(cls)) continue; // solid fill only
      if (!/\bpx-\d/.test(cls)) continue; // a labelled control, not an icon chip
      // A segmented filter chip paints its SELECTED state with the brand fill.
      // That is state, not a resting CTA style, and the recipe has no chip
      // variant — forcing /astrology/.../live's specialization filter into a
      // fixed-height button would turn a filter row into a button row.
      if (/\b(active|selected|current)\w*\s*===?/i.test(cls)) continue;
      const before = src.slice(Math.max(0, m.index! - 220), m.index!);
      const tag = [...before.matchAll(/<(button|a|Link)\b/g)].pop();
      if (!tag) continue; // not an interactive element
      found.push(`${file} :: ${cls.replace(/\s+/g, ' ').slice(0, 80)}`);
    }
    return found;
  }

  it('no migrated file still hand-rolls a primary CTA beside the recipe', () => {
    const offenders = MIGRATED.flatMap(bespokeCtas);
    expect(
      offenders,
      `${offenders.length} labelled saffron controls still carry their own padding`,
    ).toEqual([]);
  });

  it('buttonClass still resolves one height per size (no per-call-site drift)', () => {
    const recipe = read('components/ui/button-recipe.ts');
    const heights = [...recipe.matchAll(/'(h-\d+)\s/g)].map((m) => m[1]);
    expect(new Set(heights).size, 'each size must own exactly one height').toBe(heights.length);
    expect(heights.length).toBe(3);
  });
});
