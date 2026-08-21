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

  it('every openURL on this screen sits on a control announced as a link', () => {
    // A TouchableOpacity that ejects the devotee into the browser and reports
    // itself to VoiceOver as nothing is the defect; the count is derived so a
    // third bounce-out added later cannot slip past.
    const bounceOuts = (src.match(/Linking\.openURL\(/g) ?? []).length;
    expect(bounceOuts).toBeGreaterThan(0);
    // Both spellings count: a literal role, and a ternary that picks `link`
    // when the control leaves the app and `button` when it does not — the
    // service list needs the second, because its Kundli entry routes in-app.
    const linkRoles = (
      src.match(/accessibilityRole=(?:["']link["']|\{[^}]*['"]link['"][^}]*\})/g) ?? []
    ).length;
    expect(linkRoles).toBeGreaterThanOrEqual(bounceOuts);
  });

  it('each one carries a hint naming the browser hand-off', () => {
    const hints = (src.match(/accessibilityHint=/g) ?? []).length;
    const bounceOuts = (src.match(/Linking\.openURL\(/g) ?? []).length;
    expect(hints).toBeGreaterThanOrEqual(bounceOuts);
    expect(src).toMatch(/in your browser/);
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

  const KNOWN_ABSENT = ['react-native-webview'];

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
