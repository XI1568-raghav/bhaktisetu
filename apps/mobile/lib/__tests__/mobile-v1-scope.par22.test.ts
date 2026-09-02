import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

/**
 * PAR-22 (A) — the scope document, and the checks that keep it true.
 *
 * The finding's literal "expected" was not a screen count. It was:
 *
 *   "a documented, deliberate scope for v1 mobile"
 *
 * The remediation wave built screens and never wrote that document, so the
 * finding stayed open no matter how many screens landed: without a stated
 * scope, "parity" is measured against all 389 page.tsx files under
 * apps/web/app, and mobile loses that comparison permanently.
 *
 * docs/mobile-v1-scope.md is that decision. A document, though, rots faster
 * than code — so this file does not merely assert it exists. It asserts the
 * document still AGREES WITH THE TREE:
 *
 *   · every role group in apps/mobile/app is accounted for in it;
 *   · every surface it calls web-only really has no mobile screen;
 *   · the knowledge-hub exclusion matches the actual flag default.
 *
 * Any of those drifting means the scope decision has silently changed and the
 * document is now describing a product that does not exist. That is worse than
 * having no document, which is why the drift is a test failure.
 */

const APP_ROOT = path.resolve(__dirname, '../..');
const REPO_ROOT = path.resolve(APP_ROOT, '../..');
const DOC = path.join(REPO_ROOT, 'docs/mobile-v1-scope.md');

function doc(): string {
  return readFileSync(DOC, 'utf8');
}

describe('PAR-22 — the v1 mobile scope document exists', () => {
  it('is present at docs/mobile-v1-scope.md', () => {
    expect(existsSync(DOC)).toBe(true);
  });

  it('is a decision, not a stub', () => {
    // A one-line placeholder would satisfy existsSync and satisfy nobody else.
    expect(doc().length).toBeGreaterThan(4000);
  });

  it('states the rule it uses to include or exclude a surface', () => {
    expect(doc()).toMatch(/rule this document applies/i);
  });
});

describe('PAR-22 — the document still agrees with the app', () => {
  it('accounts for every role group that exists in apps/mobile/app', () => {
    // Derived from the filesystem on purpose: adding a role group to the app
    // without deciding its v1 scope should fail here rather than pass quietly.
    const groups = readdirSync(path.join(APP_ROOT, 'app'), { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^\(.+\)$/.test(e.name))
      .map((e) => e.name.slice(1, -1));

    expect(groups.length).toBeGreaterThan(0);
    const text = doc().toLowerCase();
    const missing = groups.filter((g) => !text.includes(g.toLowerCase()));
    expect(missing, `role groups absent from the scope doc: ${missing.join(', ')}`).toEqual([]);
  });

  it('does not call a surface web-only after a mobile screen for it appears', () => {
    // Each entry: the name the document uses, and the mobile screen whose
    // existence would contradict it. `search` is deliberately NOT here — it
    // was on this list and is now built, which is exactly the drift this
    // assertion is meant to catch.
    const claimedWebOnly = [
      // 'checkout' was removed 2026-09-02 for the same reason 'search' is
      // absent: (devotee)/checkout.tsx now exists, so claiming it web-only
      // would be the very drift this assertion catches.
      'refer',
      'gift',
      'antim-sanskar',
      'matchmaking',
      'csr-match',
    ];

    const devoteeScreens = readdirSync(path.join(APP_ROOT, 'app/(devotee)'))
      .filter((f) => f.endsWith('.tsx'))
      .map((f) => f.replace(/\.tsx$/, ''));

    const contradicted = claimedWebOnly.filter((s) => devoteeScreens.includes(s));
    expect(
      contradicted,
      `built on mobile but still listed web-only in docs/mobile-v1-scope.md: ${contradicted.join(', ')}`,
    ).toEqual([]);
  });

  it('no longer lists search as web-only, because it is built', () => {
    // The document must not carry the stale claim it was written to correct.
    const devoteeScreens = readdirSync(path.join(APP_ROOT, 'app/(devotee)'));
    expect(devoteeScreens).toContain('search.tsx');
    expect(doc()).toMatch(/no longer\*{0,2} on the web-only list|is therefore \*\*no longer\*\*/i);
  });
});

describe('PAR-22 — the knowledge-hub exclusion matches the actual config', () => {
  const KNOWLEDGE = path.join(APP_ROOT, 'app/(devotee)/knowledge.tsx');
  const ENV_EXAMPLE = path.join(APP_ROOT, '.env.example');

  it('records the knowledge hub as an explicit v1 exclusion', () => {
    expect(doc()).toMatch(/EXPO_PUBLIC_KNOWLEDGE_ENABLED/);
  });

  it('gives a mechanical reason, not a shrug', () => {
    // The reason on record is that the API image does not carry the content
    // directory, so the endpoint cannot serve the 120 articles that exist.
    expect(doc()).toMatch(/KNOWLEDGE_CONTENT_DIR/);
    expect(doc()).toMatch(/Dockerfile/);
  });

  it('and the screen is still actually gated, so the document is not lying', () => {
    expect(readFileSync(KNOWLEDGE, 'utf8')).toMatch(
      /EXPO_PUBLIC_KNOWLEDGE_ENABLED\s*===\s*['"]true['"]/,
    );
    expect(readFileSync(ENV_EXAMPLE, 'utf8')).toMatch(/EXPO_PUBLIC_KNOWLEDGE_ENABLED\s*=\s*false/);
  });
});

describe('PAR-22 — the open defects are named rather than scoped away', () => {
  it('records that payment still leaves the app', () => {
    const text = doc();
    expect(text).toMatch(/puja-book\.tsx/);
    expect(text).toMatch(/react-native-webview/);
    expect(text).toMatch(/frozen-lockfile/);
  });

  it('still matches reality: the payment hand-off is present in the screen', () => {
    // If someone closes PAR-15's payment leg, this fails and the document
    // must be updated to stop describing a defect that no longer exists.
    const screen = readFileSync(path.join(APP_ROOT, 'app/(devotee)/puja-book.tsx'), 'utf8');
    expect(screen).toMatch(/Linking\.openURL\(resumePaymentUrl/);
  });

  it('still matches reality: react-native-webview is now a declared dependency', () => {
    // Inverted 2026-09-02. This previously asserted the module was ABSENT, and
    // the scope doc named that as the specific blocker on in-app darshan. The
    // install has since happened, so the assertion flips rather than being
    // deleted: if the dependency is ever dropped again, darshan silently
    // degrades to a browser bounce and this test is what catches it.
    const pkg = JSON.parse(readFileSync(path.join(APP_ROOT, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies?.['react-native-webview']).toBeDefined();
  });

  it('names the session-dropping call sites by file', () => {
    const text = doc();
    for (const f of ['astrology.tsx', 'temples.tsx', 'donations.tsx', 'upgrade.tsx']) {
      expect(text, `scope doc should name ${f} among the bounce-outs`).toContain(f);
    }
  });
});
