import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Every route file in a Tabs group must be DECLARED in that group's _layout.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * expo-router builds the tab list from the FILE SYSTEM, not from the
 * `<Tabs.Screen>` elements. A `<Tabs.Screen>` only attaches options to a route
 * that the directory listing already created. So dropping a new `.tsx` into a
 * Tabs group and NOT declaring it does not make the screen unreachable — it
 * makes it a visible, permanent extra tab, labelled with its raw file name.
 * That is why app/(devotee)/_layout.tsx carries twenty-odd `href: null`
 * declarations under a comment reading "Secondary screens — accessible via
 * navigation, hidden from tab bar": each one exists solely to take a screen
 * back OFF the bar.
 *
 * PAR-15 added app/(devotee)/puja-book.tsx and routed the Book control to it,
 * but never declared it. The regression is not the booking flow — that part
 * works — it is a sixth tab reading "puja-book" wedged into a bar designed for
 * five, on every devotee's screen, forever. PAR-22 got this right for its own
 * four screens (provider-earnings.par22.test.ts pins them as tabs); PAR-15
 * missed it, and nothing was watching the general rule.
 *
 * app/(devotee)/consultations.tsx has the same defect and is OLDER than PAR-15
 * (added in 40ed878b, long before this sweep) — so it is a pre-existing bug of
 * the same class, not a regression, and it is fixed here because the guard
 * below cannot be honest and skip it.
 *
 * Stack groups ((auth), (onboard)) are exempt: a Stack renders one screen at a
 * time and an undeclared route costs nothing visible.
 */

const APP = path.resolve(__dirname, '../../app');

/** Source with block and line comments removed — a guard must match code. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/**
 * The `name` of every `<Tabs.Screen>` in a layout.
 *
 * Deliberately NOT a bare /name="x"/ search over the file: `tabBarIcon` renders
 * `<TabIcon name="grid" …>`, so an icon called `settings` would certify a route
 * called `settings` that nobody declared. Each chunk's FIRST `name=` is the
 * screen's, because `name` is the leading attribute on every declaration and
 * the icon lives inside `options` after it.
 */
function declaredScreens(layoutSrc: string): string[] {
  return stripComments(layoutSrc)
    .split('<Tabs.Screen')
    .slice(1)
    .map((chunk) => /name=["']([^"']+)["']/.exec(chunk)?.[1])
    .filter((n): n is string => typeof n === 'string');
}

/** Route files in a group: `.tsx`, not `_`-prefixed, not the layout itself. */
function routeFiles(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.tsx') && !f.startsWith('_') && !f.startsWith('+'))
    .map((f) => f.replace(/\.tsx$/, ''));
}

const tabGroups = readdirSync(APP)
  .filter((d) => d.startsWith('(') && statSync(path.join(APP, d)).isDirectory())
  .filter((d) => {
    const layout = path.join(APP, d, '_layout.tsx');
    try {
      return stripComments(readFileSync(layout, 'utf8')).includes('<Tabs');
    } catch {
      return false;
    }
  });

describe('expo-router — no undeclared route becomes a stray tab', () => {
  it('found the tab groups to check', () => {
    // A silently-empty group list would make every assertion below vacuous.
    expect(tabGroups.length).toBeGreaterThanOrEqual(8);
    expect(tabGroups).toContain('(devotee)');
  });

  for (const group of tabGroups) {
    it(`${group} declares every one of its route files`, () => {
      const layout = readFileSync(path.join(APP, group, '_layout.tsx'), 'utf8');
      const declared = new Set(declaredScreens(layout));
      const undeclared = routeFiles(path.join(APP, group)).filter((r) => !declared.has(r));
      expect(undeclared, `${group} routes with no <Tabs.Screen>`).toEqual([]);
    });
  }

  it('(devotee)/puja-book is hidden from the bar, not merely declared', () => {
    // PAR-15's booking screen is pushed from the Pujas card. Declaring it
    // WITHOUT href:null would swap one wrong tab for another.
    const layout = stripComments(readFileSync(path.join(APP, '(devotee)/_layout.tsx'), 'utf8'));
    const decl = layout.split('<Tabs.Screen').find((c) => /name=["']puja-book["']/.test(c));
    expect(decl, 'no <Tabs.Screen name="puja-book">').toBeDefined();
    expect(decl!).toMatch(/href:\s*null/);
  });

  it('(devotee) keeps exactly the five primary tabs it was designed for', () => {
    // The bar is sized for five (lib theme fixes its height). Anything that
    // lands on it by accident shows up here as a sixth entry.
    const layout = stripComments(readFileSync(path.join(APP, '(devotee)/_layout.tsx'), 'utf8'));
    const visible = layout
      .split('<Tabs.Screen')
      .slice(1)
      .filter((chunk) => !/href:\s*null/.test(chunk))
      .map((chunk) => /name=["']([^"']+)["']/.exec(chunk)?.[1]);
    expect(visible).toEqual(['index', 'pujas', 'darshan', 'store', 'profile']);
  });
});
