import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * PAR-22 — the last two bounce-outs, and what is actually blocking them.
 *
 * WHERE THIS FINDING WAS LEFT
 * ---------------------------
 * "The last 2 bounce-outs at app/(devotee)/astrology.tsx:205 and :240 need an
 * in-app WebView so the session and back-stack survive. react-native-webview is
 * not in apps/mobile/package.json, and adding it is a native-module change to
 * the EAS build — same class of owner decision as PAR-15's Razorpay SDK."
 *
 * THE DEPENDENCY HALF OF THAT IS RIGHT, AND INCOMPLETE
 * ---------------------------------------------------
 * `react-native-webview` really is absent — it is not in
 * apps/mobile/package.json, not in node_modules, and appears in pnpm-lock.yaml
 * only as an OPTIONAL PEER of `expo`. But the app does not merely lack it: it
 * already depends on it. app/(devotee)/darshan-player.tsx `require()`s the
 * module inside a try/catch and renders a "In-app player unavailable" fallback
 * when the require throws — which, in this tree, it always does. The in-app
 * darshan player therefore cannot render in ANY build produced from this
 * repository, and no one had noticed because the degrade is silent by design.
 *
 * So the owner decision is bigger and cheaper than "add a dependency for two
 * astrology links": installing the package the app already assumes revives a
 * shipped feature and unblocks these two links at the same time. It stays an
 * owner decision — it is a native module, so it needs a new EAS build and it
 * touches package.json plus the root lockfile.
 *
 * WHAT IS SHIPPED HERE INSTEAD
 * ----------------------------
 * The half that does not need the module: these two controls must stop being
 * silent about leaving the app, and must stop hardcoding the production
 * website. Every other bounce-out in the app already does both —
 * app/(devotee)/search.tsx:78-85 and app/(devotee)/support.tsx:107-113 are the
 * pattern. These two were missed.
 */

const MOBILE = path.resolve(__dirname, '../..');

/** Comments blanked in place, so prose about a fix cannot satisfy a guard. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/.*$/gm, (m, p1: string) => p1 + ' '.repeat(m.length - p1.length));
}

const SCREEN = path.join(MOBILE, 'app/(devotee)/astrology.tsx');
const raw = readFileSync(SCREEN, 'utf8');
const src = stripComments(raw);

describe('PAR-22 — the astrology bounce-outs say they leave the app', () => {
  it('the stripper actually removes this file class of comment', () => {
    expect(raw.length).toBe(src.length);
    expect(raw).not.toBe(src);
  });

  /**
   * REWRITTEN, DELIBERATELY — the original contract is superseded, not weakened.
   *
   * These two assertions used to count `Linking.openURL(` on the screen and
   * require a matching number of `accessibilityRole="link"` spellings and a
   * literal "in your browser" hint. That was exactly right while every
   * hand-off was UNCONDITIONALLY a browser hand-off.
   *
   * PAR-22 (C) made the destination a runtime fact. `openWebHandoff` pushes
   * app/(devotee)/web-view.tsx when the optional react-native-webview module
   * resolves and falls back to `Linking.openURL` when it does not. Against that
   * code the old assertions are not merely unenforceable — they are actively
   * wrong: they would REQUIRE the screen to hardcode "in your browser" on a
   * control that, in a build with the module installed, does not go there. A
   * literal claim about a runtime destination is the very defect this file was
   * written to stop, one level up.
   *
   * The replacement is strictly stronger. It does not check that the copy
   * happens to say the right thing; it checks that the copy CANNOT say the
   * wrong thing, because role, hint and glyph all come out of
   * `describeWebHandoff` — the same function that decides the route. Unit
   * coverage that the two agree on every combination lives in
   * lib/__tests__/in-app-web.par22.test.ts.
   */
  it('every hand-off is routed and described by the same decision', () => {
    // Derived counts, so a third bounce-out added later cannot slip past.
    const handoffs = (src.match(/openWebHandoff\(/g) ?? []).length;
    expect(handoffs).toBeGreaterThan(0);
    const described = (src.match(/describeWebHandoff\(/g) ?? []).length;
    expect(described).toBe(handoffs);
  });

  it('no control hardcodes where the tap goes', () => {
    // The old failure this file caught — a silent bounce-out — plus the new
    // one it must catch: a control that announces a destination it no longer
    // controls. `Linking.openURL` survives only as the injected fallback.
    expect(src).not.toMatch(/accessibilityRole=["']link["']/);
    expect(src).not.toMatch(/in your browser['"`]/);
    expect(src).not.toMatch(/Linking\.openURL\(/);
    expect(src).toMatch(/openExternal:\s*Linking\.openURL/);
  });

  it('every hand-off control still carries a hint at all', () => {
    // The original intent, preserved: a control that ejects the devotee and
    // reports itself to VoiceOver as nothing is the defect.
    const hints = (src.match(/accessibilityHint=/g) ?? []).length;
    const handoffs = (src.match(/openWebHandoff\(/g) ?? []).length;
    expect(hints).toBeGreaterThanOrEqual(handoffs);
  });

  it('the AI CTA no longer promises an in-app chat it does not open', () => {
    // "Ask AI Jyotish" on a button that leaves the app reads as an in-app
    // assistant. Same class as the "Book Puja" label PAR-15 removed.
    const i = src.indexOf('aiButtonText');
    expect(i).toBeGreaterThan(-1);
    expect(src.slice(i, i + 200)).not.toMatch(/>\s*Ask AI Jyotish\s*</);
  });
});

describe('PAR-22 — the astrology bounce-outs go to THIS build environment', () => {
  it('no production host is hardcoded on the screen', () => {
    // Same defect PAR-15 fixed in resumePaymentUrl: a build pointed at a LAN
    // or staging API sending the devotee to production.
    expect(src).not.toMatch(/https:\/\/darshya\.online/);
  });

  it('resolves the origin through the shared resolver', () => {
    expect(src).toMatch(/webOrigin\(\)/);
  });
});

describe('PAR-22 — the WebView dependency the app already assumes is absent', () => {
  /**
   * A registry, not a rule: react-native-webview is require()d at runtime and
   * is NOT a declared dependency. That is the blocker, recorded so it cannot
   * rot. The second assertion is what keeps it honest — the moment the owner
   * installs the package this test goes RED and forces whoever installs it to
   * come back here, delete the entry, and re-enable the features that were
   * degraded around its absence.
   */
  const pkg = JSON.parse(readFileSync(path.join(MOBILE, 'package.json'), 'utf8')) as {
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  };
  const declared = new Set([
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.devDependencies ?? {}),
  ]);

  // Emptied 2026-09-02: react-native-webview@13.12.5 is now declared in
  // apps/mobile/package.json and the lockfile is regenerated. The registry
  // stays (rather than being deleted) so the two tests below keep guarding
  // against a NEW optional native module being require()d without being
  // declared — the failure mode this file exists to catch.
  const KNOWN_ABSENT: string[] = [];

  it('darshan-player really does require the module at runtime', () => {
    const player = stripComments(
      readFileSync(path.join(MOBILE, 'app/(devotee)/darshan-player.tsx'), 'utf8'),
    );
    expect(player).toMatch(/require\(\s*['"]react-native-webview['"]\s*\)/);
    // …inside a guard, with a nullable component — otherwise the screen would
    // crash rather than degrade.
    expect(player).toMatch(/WebViewComp\s*=\s*null/);
  });

  it('the registry is still accurate — every entry is genuinely undeclared', () => {
    const stale = KNOWN_ABSENT.filter((m) => declared.has(m));
    expect(
      stale,
      `now declared in package.json — delete from KNOWN_ABSENT and re-enable the features gated on it: ${stale.join(', ')}`,
    ).toEqual([]);
  });

  it('no OTHER optional native module has been added without declaring it', () => {
    const undeclared = new Set<string>();
    for (const rel of [
      'app/(devotee)/darshan-player.tsx',
      'app/(devotee)/astrology.tsx',
      'app/(devotee)/puja-book.tsx',
      // PAR-22 (C) added a second consumer of the optional module and the one
      // place it is now resolved. Both are scanned so the registry above stays
      // exhaustive rather than merely historical.
      'app/(devotee)/web-view.tsx',
      'lib/webview-module.ts',
    ]) {
      const s = stripComments(readFileSync(path.join(MOBILE, rel), 'utf8'));
      for (const m of s.matchAll(/require\(\s*['"]([^.'"][^'"]*)['"]\s*\)/g)) {
        const name = m[1]!;
        if (!declared.has(name) && !KNOWN_ABSENT.includes(name)) undeclared.add(name);
      }
    }
    expect([...undeclared]).toEqual([]);
  });
});
