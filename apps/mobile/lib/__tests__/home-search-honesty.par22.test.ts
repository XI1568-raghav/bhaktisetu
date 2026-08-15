import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * PAR-22, the one control on this list that is a lie rather than a gap.
 *
 * The rest of the finding is scope — earnings screens that do not exist,
 * ~150 web content routes with no mobile equivalent — and those are builds,
 * not fixes. The home "search bar" is different: it is a rendered search
 * affordance (magnifying glass, "Search pujas, temples, content…") whose
 * onPress is `router.push('/(devotee)/pujas')`. It does not search. A user
 * taps it expecting a query field and silently lands on the Pujas tab.
 *
 * There is no search endpoint behind it to wire up — apps/web/app/search is
 * web-only — so the honest fix is the same one PAR-15 took for the Book
 * button: make the control say what it does. A disguised tab link is a
 * constant credibility tax; a labelled tab link is just navigation.
 *
 * Guard note: this file reads the screen with COMMENTS STRIPPED. An earlier
 * round of these source guards matched the comment explaining the ban rather
 * than the code, which passes while the defect is live.
 */

const SCREEN = path.resolve(__dirname, '../../app/(devotee)/index.tsx');

/** Source with block and line comments removed — a guard must match code. */
function code(): string {
  return readFileSync(SCREEN, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('PAR-22 — the home search bar does not pretend to search', () => {
  it('no longer renders a search placeholder over a tab link', () => {
    // The placeholder is the whole promise: it names three things it will
    // search across and then searches none of them.
    expect(code()).not.toMatch(/Search pujas, temples, content/);
  });

  it('does not render a search icon on the control', () => {
    expect(code()).not.toMatch(/name=["']search-outline["']/);
  });

  it('announces itself to assistive tech as a link with a destination', () => {
    const src = code();
    // Same treatment PAR-15 gave the Book button: a control that navigates
    // elsewhere must say so, and must say so to a screen reader too.
    expect(src).toMatch(/accessibilityRole=["']link["']/);
    expect(src).toMatch(/accessibilityHint=/);
  });

  it('still routes to the pujas tab it always routed to', () => {
    // Removing the lie must not remove the navigation the user relies on.
    expect(code()).toMatch(/\/\(devotee\)\/pujas/);
  });
});
